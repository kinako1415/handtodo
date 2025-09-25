/** @format */

import { Task, AppSettings } from "../types";
import { generateId } from "../utils";

// Database error types
export class DatabaseError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "DatabaseConnectionError";
  }
}

export class DatabaseOperationError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "DatabaseOperationError";
  }
}

export class DatabaseQuotaError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "DatabaseQuotaError";
  }
}

// IndexedDB database interface
export interface TodoDatabase {
  initialize(): Promise<void>;
  addTask(task: Omit<Task, "id">): Promise<string>;
  updateTask(id: string, updates: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  getAllTasks(): Promise<Task[]>;
  getSetting<K extends keyof AppSettings>(
    key: K
  ): Promise<AppSettings[K] | undefined>;
  setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void>;
  // Error recovery methods
  isAvailable(): boolean;
  getStorageInfo(): Promise<{ usage: number; quota: number } | null>;
  clearDatabase(): Promise<void>;
  exportData(): Promise<{ tasks: Task[]; settings: Record<string, any> }>;
  importData(data: {
    tasks: Task[];
    settings: Record<string, any>;
  }): Promise<void>;
}

// IndexedDB record types
interface TaskRecord {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SettingsRecord {
  key: string;
  value: any;
}

// IndexedDB implementation
export class IndexedDBTodoDatabase implements TodoDatabase {
  protected readonly dbName = "GestureTodoApp";
  private readonly version = 1;
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      // Check if IndexedDB is available
      if (!this.isAvailable()) {
        throw new DatabaseConnectionError(
          "IndexedDB is not available in this environment"
        );
      }

      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = () => {
          const error = request.error;
          let dbError: DatabaseError;

          if (error?.name === "QuotaExceededError") {
            dbError = new DatabaseQuotaError(
              "Database storage quota exceeded",
              error
            );
          } else if (error?.name === "VersionError") {
            dbError = new DatabaseConnectionError(
              "Database version conflict",
              error
            );
          } else {
            dbError = new DatabaseConnectionError(
              `Failed to open database: ${error?.message || "Unknown error"}`,
              error || undefined
            );
          }

          reject(dbError);
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.isInitialized = true;

          // Handle database errors during operation
          this.db.onerror = (event) => {
            console.error("Database error:", event);
          };

          // Handle unexpected database closure
          this.db.onclose = () => {
            console.warn("Database connection closed unexpectedly");
            this.isInitialized = false;
            this.db = null;
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          try {
            // Create tasks object store
            if (!db.objectStoreNames.contains("tasks")) {
              const tasksStore = db.createObjectStore("tasks", {
                keyPath: "id",
              });
              tasksStore.createIndex("completed", "completed", {
                unique: false,
              });
              tasksStore.createIndex("createdAt", "createdAt", {
                unique: false,
              });
            }

            // Create settings object store
            if (!db.objectStoreNames.contains("settings")) {
              db.createObjectStore("settings", { keyPath: "key" });
            }
          } catch (error) {
            console.error("Error during database upgrade:", error);
            reject(
              new DatabaseConnectionError(
                "Failed to upgrade database schema",
                error instanceof Error ? error : undefined
              )
            );
          }
        };

        request.onblocked = () => {
          console.warn("Database upgrade blocked by another connection");
          reject(
            new DatabaseConnectionError(
              "Database upgrade blocked. Please close other tabs and try again."
            )
          );
        };
      });
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  isAvailable(): boolean {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  }

  async getStorageInfo(): Promise<{ usage: number; quota: number } | null> {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      }
    } catch (error) {
      console.warn("Failed to get storage info:", error);
    }
    return null;
  }

  private async ensureDatabase(): Promise<IDBDatabase> {
    if (!this.isInitialized || !this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new DatabaseConnectionError("Database connection is not available");
    }

    return this.db;
  }

  private handleDatabaseError(error: any, operation: string): DatabaseError {
    if (error?.name === "QuotaExceededError") {
      return new DatabaseQuotaError(
        `Storage quota exceeded during ${operation}`,
        error
      );
    } else if (error?.name === "InvalidStateError") {
      return new DatabaseConnectionError(
        `Database connection invalid during ${operation}`,
        error
      );
    } else if (error?.name === "TransactionInactiveError") {
      return new DatabaseOperationError(
        `Transaction inactive during ${operation}`,
        error
      );
    } else {
      return new DatabaseOperationError(
        `Failed to ${operation}: ${error?.message || "Unknown error"}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async addTask(task: Omit<Task, "id">): Promise<string> {
    try {
      const db = await this.ensureDatabase();
      const id = generateId();
      const now = new Date();

      const taskRecord: TaskRecord = {
        id,
        text: task.text,
        completed: task.completed,
        createdAt: task.createdAt || now,
        updatedAt: now,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["tasks"], "readwrite");
        const store = transaction.objectStore("tasks");
        const request = store.add(taskRecord);

        transaction.onerror = () => {
          reject(this.handleDatabaseError(transaction.error, "add task"));
        };

        transaction.onabort = () => {
          reject(
            new DatabaseOperationError("Transaction aborted while adding task")
          );
        };

        request.onerror = () => {
          reject(this.handleDatabaseError(request.error, "add task"));
        };

        request.onsuccess = () => {
          resolve(id);
        };
      });
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "add task");
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    try {
      const db = await this.ensureDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["tasks"], "readwrite");
        const store = transaction.objectStore("tasks");
        const getRequest = store.get(id);

        transaction.onerror = () => {
          reject(this.handleDatabaseError(transaction.error, "update task"));
        };

        transaction.onabort = () => {
          reject(
            new DatabaseOperationError(
              "Transaction aborted while updating task"
            )
          );
        };

        getRequest.onerror = () => {
          reject(
            this.handleDatabaseError(getRequest.error, "get task for update")
          );
        };

        getRequest.onsuccess = () => {
          const existingTask = getRequest.result;
          if (!existingTask) {
            reject(new DatabaseOperationError(`Task with id ${id} not found`));
            return;
          }

          const updatedTask: TaskRecord = {
            ...existingTask,
            ...updates,
            updatedAt: new Date(),
          };

          const putRequest = store.put(updatedTask);

          putRequest.onerror = () => {
            reject(this.handleDatabaseError(putRequest.error, "update task"));
          };

          putRequest.onsuccess = () => {
            resolve();
          };
        };
      });
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "update task");
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const db = await this.ensureDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["tasks"], "readwrite");
        const store = transaction.objectStore("tasks");
        const request = store.delete(id);

        transaction.onerror = () => {
          reject(this.handleDatabaseError(transaction.error, "delete task"));
        };

        transaction.onabort = () => {
          reject(
            new DatabaseOperationError(
              "Transaction aborted while deleting task"
            )
          );
        };

        request.onerror = () => {
          reject(this.handleDatabaseError(request.error, "delete task"));
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "delete task");
    }
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const db = await this.ensureDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["tasks"], "readonly");
        const store = transaction.objectStore("tasks");
        const request = store.getAll();

        transaction.onerror = () => {
          reject(this.handleDatabaseError(transaction.error, "get all tasks"));
        };

        transaction.onabort = () => {
          reject(
            new DatabaseOperationError(
              "Transaction aborted while getting tasks"
            )
          );
        };

        request.onerror = () => {
          reject(this.handleDatabaseError(request.error, "get all tasks"));
        };

        request.onsuccess = () => {
          try {
            const tasks: Task[] = request.result.map((record: TaskRecord) => ({
              id: record.id,
              text: record.text,
              completed: record.completed,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
            }));
            resolve(tasks);
          } catch (error) {
            reject(
              new DatabaseOperationError(
                "Failed to process task data",
                error instanceof Error ? error : undefined
              )
            );
          }
        };
      });
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "get all tasks");
    }
  }

  async getSetting<K extends keyof AppSettings>(
    key: K
  ): Promise<AppSettings[K] | undefined> {
    try {
      const db = await this.ensureDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["settings"], "readonly");
        const store = transaction.objectStore("settings");
        const request = store.get(key);

        transaction.onerror = () => {
          reject(this.handleDatabaseError(transaction.error, "get setting"));
        };

        transaction.onabort = () => {
          reject(
            new DatabaseOperationError(
              "Transaction aborted while getting setting"
            )
          );
        };

        request.onerror = () => {
          reject(this.handleDatabaseError(request.error, "get setting"));
        };

        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : undefined);
        };
      });
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "get setting");
    }
  }

  async setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    try {
      const db = await this.ensureDatabase();

      const settingsRecord: SettingsRecord = {
        key: key as string,
        value,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["settings"], "readwrite");
        const store = transaction.objectStore("settings");
        const request = store.put(settingsRecord);

        transaction.onerror = () => {
          reject(this.handleDatabaseError(transaction.error, "set setting"));
        };

        transaction.onabort = () => {
          reject(
            new DatabaseOperationError(
              "Transaction aborted while setting value"
            )
          );
        };

        request.onerror = () => {
          reject(this.handleDatabaseError(request.error, "set setting"));
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "set setting");
    }
  }

  async clearDatabase(): Promise<void> {
    try {
      const db = await this.ensureDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["tasks", "settings"], "readwrite");

        const clearTasks = transaction.objectStore("tasks").clear();
        const clearSettings = transaction.objectStore("settings").clear();

        transaction.onerror = () => {
          reject(this.handleDatabaseError(transaction.error, "clear database"));
        };

        transaction.onabort = () => {
          reject(
            new DatabaseOperationError(
              "Transaction aborted while clearing database"
            )
          );
        };

        transaction.oncomplete = () => {
          resolve();
        };
      });
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "clear database");
    }
  }

  async exportData(): Promise<{
    tasks: Task[];
    settings: Record<string, any>;
  }> {
    try {
      const tasks = await this.getAllTasks();
      const settings: Record<string, any> = {};

      // Get all settings
      const settingsKeys: (keyof AppSettings)[] = [
        "gestureEnabled",
        "sensitivity",
        "theme",
        "confidenceThreshold",
        "debounceTime",
      ];

      for (const key of settingsKeys) {
        try {
          const value = await this.getSetting(key);
          if (value !== undefined) {
            settings[key] = value;
          }
        } catch (error) {
          console.warn(`Failed to export setting ${key}:`, error);
        }
      }

      return { tasks, settings };
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "export data");
    }
  }

  async importData(data: {
    tasks: Task[];
    settings: Record<string, any>;
  }): Promise<void> {
    try {
      const db = await this.ensureDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["tasks", "settings"], "readwrite");
        const tasksStore = transaction.objectStore("tasks");
        const settingsStore = transaction.objectStore("settings");

        // Clear existing data
        tasksStore.clear();
        settingsStore.clear();

        // Import tasks
        for (const task of data.tasks) {
          tasksStore.add({
            id: task.id,
            text: task.text,
            completed: task.completed,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          });
        }

        // Import settings
        for (const [key, value] of Object.entries(data.settings)) {
          settingsStore.add({ key, value });
        }

        transaction.onerror = () => {
          reject(this.handleDatabaseError(transaction.error, "import data"));
        };

        transaction.onabort = () => {
          reject(
            new DatabaseOperationError(
              "Transaction aborted while importing data"
            )
          );
        };

        transaction.oncomplete = () => {
          resolve();
        };
      });
    } catch (error) {
      throw error instanceof DatabaseError
        ? error
        : this.handleDatabaseError(error, "import data");
    }
  }
}

// In-memory fallback database implementation
export class InMemoryTodoDatabase implements TodoDatabase {
  private tasks: Task[] = [];
  private settings: Record<string, any> = {};
  private isInitialized = false;

  async initialize(): Promise<void> {
    this.isInitialized = true;
    console.warn(
      "Using in-memory database fallback. Data will not persist between sessions."
    );
  }

  isAvailable(): boolean {
    return true; // In-memory is always available
  }

  async getStorageInfo(): Promise<{ usage: number; quota: number } | null> {
    // Estimate memory usage
    const dataSize = JSON.stringify({
      tasks: this.tasks,
      settings: this.settings,
    }).length;
    return {
      usage: dataSize,
      quota: Number.MAX_SAFE_INTEGER, // No real quota for memory
    };
  }

  async addTask(task: Omit<Task, "id">): Promise<string> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    const id = generateId();
    const now = new Date();
    const newTask: Task = {
      ...task,
      id,
      createdAt: task.createdAt || now,
      updatedAt: now,
    };

    this.tasks.push(newTask);
    return id;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    const taskIndex = this.tasks.findIndex((task) => task.id === id);
    if (taskIndex === -1) {
      throw new DatabaseOperationError(`Task with id ${id} not found`);
    }

    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      ...updates,
      updatedAt: new Date(),
    };
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    const taskIndex = this.tasks.findIndex((task) => task.id === id);
    if (taskIndex === -1) {
      throw new DatabaseOperationError(`Task with id ${id} not found`);
    }

    this.tasks.splice(taskIndex, 1);
  }

  async getAllTasks(): Promise<Task[]> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    return [...this.tasks]; // Return a copy
  }

  async getSetting<K extends keyof AppSettings>(
    key: K
  ): Promise<AppSettings[K] | undefined> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    return this.settings[key as string];
  }

  async setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    this.settings[key as string] = value;
  }

  async clearDatabase(): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    this.tasks = [];
    this.settings = {};
  }

  async exportData(): Promise<{
    tasks: Task[];
    settings: Record<string, any>;
  }> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    return {
      tasks: [...this.tasks],
      settings: { ...this.settings },
    };
  }

  async importData(data: {
    tasks: Task[];
    settings: Record<string, any>;
  }): Promise<void> {
    if (!this.isInitialized) {
      throw new DatabaseConnectionError("Database not initialized");
    }

    this.tasks = [...data.tasks];
    this.settings = { ...data.settings };
  }
}

// Database factory with enhanced fallback logic and recovery
export class DatabaseFactory {
  private static instance: TodoDatabase | null = null;
  private static fallbackData: {
    tasks: Task[];
    settings: Record<string, any>;
  } | null = null;
  private static isUsingFallback = false;

  static async createDatabase(): Promise<TodoDatabase> {
    if (this.instance) {
      return this.instance;
    }

    // Try IndexedDB first
    try {
      const indexedDB = new IndexedDBTodoDatabase();
      await indexedDB.initialize();

      // If we were using fallback before, try to restore data
      if (this.fallbackData && this.isUsingFallback) {
        try {
          await indexedDB.importData(this.fallbackData);
          console.log("Successfully restored data from fallback to IndexedDB");
          this.fallbackData = null;
          this.isUsingFallback = false;
        } catch (restoreError) {
          console.warn(
            "Failed to restore fallback data to IndexedDB:",
            restoreError
          );
        }
      }

      this.instance = indexedDB;
      console.log("Using IndexedDB for data persistence");
      return this.instance;
    } catch (error) {
      console.warn(
        "IndexedDB initialization failed, falling back to in-memory storage:",
        error
      );

      // Fall back to in-memory database
      const inMemoryDB = new InMemoryTodoDatabase();
      await inMemoryDB.initialize();

      // If we have previous data, restore it
      if (this.fallbackData) {
        try {
          await inMemoryDB.importData(this.fallbackData);
          console.log("Restored previous data to in-memory database");
        } catch (restoreError) {
          console.warn(
            "Failed to restore data to in-memory database:",
            restoreError
          );
        }
      }

      this.instance = inMemoryDB;
      this.isUsingFallback = true;
      return this.instance;
    }
  }

  // Save data for recovery in case of database failure
  static async backupData(): Promise<void> {
    if (this.instance) {
      try {
        this.fallbackData = await this.instance.exportData();
        console.log("Data backed up for recovery");
      } catch (error) {
        console.warn("Failed to backup data:", error);
      }
    }
  }

  // Check if currently using fallback
  static isUsingFallbackDatabase(): boolean {
    return this.isUsingFallback;
  }

  // Get fallback data for manual recovery
  static getFallbackData(): {
    tasks: Task[];
    settings: Record<string, any>;
  } | null {
    return this.fallbackData;
  }

  // Force switch to fallback database
  static async switchToFallback(): Promise<TodoDatabase> {
    // Backup current data if possible
    await this.backupData();

    // Reset instance to force recreation
    this.instance = null;
    this.isUsingFallback = true;

    // Create new fallback instance
    const inMemoryDB = new InMemoryTodoDatabase();
    await inMemoryDB.initialize();

    // Restore data if available
    if (this.fallbackData) {
      try {
        await inMemoryDB.importData(this.fallbackData);
        console.log("Switched to fallback database with data restored");
      } catch (error) {
        console.warn("Failed to restore data in fallback database:", error);
      }
    }

    this.instance = inMemoryDB;
    return this.instance;
  }

  // Attempt to recover to IndexedDB
  static async attemptRecovery(): Promise<boolean> {
    if (!this.isUsingFallback) {
      return true; // Already using IndexedDB
    }

    try {
      // Backup current fallback data
      await this.backupData();

      // Try to create IndexedDB instance
      const indexedDB = new IndexedDBTodoDatabase();
      await indexedDB.initialize();

      // Restore data
      if (this.fallbackData) {
        await indexedDB.importData(this.fallbackData);
      }

      // Switch to IndexedDB
      this.instance = indexedDB;
      this.isUsingFallback = false;
      console.log("Successfully recovered to IndexedDB");
      return true;
    } catch (error) {
      console.warn("Recovery to IndexedDB failed:", error);
      return false;
    }
  }

  static reset(): void {
    this.instance = null;
    this.fallbackData = null;
    this.isUsingFallback = false;
  }
}

// Export the concrete implementation and factory
export const TodoDatabase = IndexedDBTodoDatabase;
