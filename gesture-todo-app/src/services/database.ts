/** @format */

import { Task, AppSettings } from "../types";
import { generateId } from "../utils";

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

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create tasks object store
        if (!db.objectStoreNames.contains("tasks")) {
          const tasksStore = db.createObjectStore("tasks", { keyPath: "id" });
          tasksStore.createIndex("completed", "completed", { unique: false });
          tasksStore.createIndex("createdAt", "createdAt", { unique: false });
        }

        // Create settings object store
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
    });
  }

  private ensureDatabase(): IDBDatabase {
    if (!this.db) {
      throw new Error("Database not initialized. Call initialize() first.");
    }
    return this.db;
  }

  async addTask(task: Omit<Task, "id">): Promise<string> {
    const db = this.ensureDatabase();
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

      request.onerror = () => {
        reject(new Error(`Failed to add task: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(id);
      };
    });
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const db = this.ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["tasks"], "readwrite");
      const store = transaction.objectStore("tasks");
      const getRequest = store.get(id);

      getRequest.onerror = () => {
        reject(new Error(`Failed to get task: ${getRequest.error?.message}`));
      };

      getRequest.onsuccess = () => {
        const existingTask = getRequest.result;
        if (!existingTask) {
          reject(new Error(`Task with id ${id} not found`));
          return;
        }

        const updatedTask: TaskRecord = {
          ...existingTask,
          ...updates,
          updatedAt: new Date(),
        };

        const putRequest = store.put(updatedTask);

        putRequest.onerror = () => {
          reject(
            new Error(`Failed to update task: ${putRequest.error?.message}`)
          );
        };

        putRequest.onsuccess = () => {
          resolve();
        };
      };
    });
  }

  async deleteTask(id: string): Promise<void> {
    const db = this.ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["tasks"], "readwrite");
      const store = transaction.objectStore("tasks");
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to delete task: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getAllTasks(): Promise<Task[]> {
    const db = this.ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["tasks"], "readonly");
      const store = transaction.objectStore("tasks");
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get tasks: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const tasks: Task[] = request.result.map((record: TaskRecord) => ({
          id: record.id,
          text: record.text,
          completed: record.completed,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        }));
        resolve(tasks);
      };
    });
  }

  async getSetting<K extends keyof AppSettings>(
    key: K
  ): Promise<AppSettings[K] | undefined> {
    const db = this.ensureDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["settings"], "readonly");
      const store = transaction.objectStore("settings");
      const request = store.get(key);

      request.onerror = () => {
        reject(new Error(`Failed to get setting: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : undefined);
      };
    });
  }

  async setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    const db = this.ensureDatabase();

    const settingsRecord: SettingsRecord = {
      key: key as string,
      value,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["settings"], "readwrite");
      const store = transaction.objectStore("settings");
      const request = store.put(settingsRecord);

      request.onerror = () => {
        reject(new Error(`Failed to set setting: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}

// Export the concrete implementation
export { IndexedDBTodoDatabase as TodoDatabase };
