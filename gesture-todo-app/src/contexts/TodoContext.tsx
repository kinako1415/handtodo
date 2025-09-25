/** @format */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useState,
} from "react";
import { Task, TodoState, GestureType, CameraPermission } from "../types";
import {
  DatabaseFactory,
  TodoDatabase,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseOperationError,
  DatabaseQuotaError,
} from "../services/database";

// Action types for the reducer
export type TodoAction =
  | { type: "SET_TASKS"; payload: Task[] }
  | { type: "ADD_TASK"; payload: Omit<Task, "id"> }
  | { type: "UPDATE_TASK"; payload: { id: string; updates: Partial<Task> } }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "SET_SELECTED_TASK"; payload: number }
  | { type: "MOVE_SELECTION"; payload: "up" | "down" }
  | { type: "SET_GESTURE_MODE"; payload: boolean }
  | { type: "SET_CAMERA_STATUS"; payload: TodoState["cameraStatus"] }
  | { type: "SET_CURRENT_GESTURE"; payload: GestureType | null }
  | { type: "TOGGLE_TASK_COMPLETION"; payload: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "INITIALIZE_STATE"; payload: Partial<TodoState> };

// Initial state
const initialState: TodoState = {
  tasks: [],
  selectedTaskIndex: -1,
  isGestureMode: false,
  cameraStatus: "disabled",
  currentGesture: null,
};

// Reducer function
function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case "SET_TASKS":
      return {
        ...state,
        tasks: action.payload,
        selectedTaskIndex: action.payload.length > 0 ? 0 : -1,
      };

    case "ADD_TASK": {
      const newTask: Task = {
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return {
        ...state,
        tasks: [...state.tasks, newTask],
        selectedTaskIndex: state.tasks.length, // Select the new task
      };
    }

    case "UPDATE_TASK": {
      const updatedTasks = state.tasks.map((task) =>
        task.id === action.payload.id
          ? { ...task, ...action.payload.updates, updatedAt: new Date() }
          : task
      );
      return {
        ...state,
        tasks: updatedTasks,
      };
    }

    case "DELETE_TASK": {
      const filteredTasks = state.tasks.filter(
        (task) => task.id !== action.payload
      );
      let newSelectedIndex = state.selectedTaskIndex;

      // Adjust selected index after deletion
      if (filteredTasks.length === 0) {
        newSelectedIndex = -1;
      } else if (state.selectedTaskIndex >= filteredTasks.length) {
        newSelectedIndex = filteredTasks.length - 1;
      }

      return {
        ...state,
        tasks: filteredTasks,
        selectedTaskIndex: newSelectedIndex,
      };
    }

    case "SET_SELECTED_TASK":
      return {
        ...state,
        selectedTaskIndex: Math.max(
          -1,
          Math.min(action.payload, state.tasks.length - 1)
        ),
      };

    case "MOVE_SELECTION": {
      if (state.tasks.length === 0) return state;

      let newIndex = state.selectedTaskIndex;
      if (action.payload === "up") {
        newIndex = newIndex <= 0 ? state.tasks.length - 1 : newIndex - 1;
      } else {
        newIndex = newIndex >= state.tasks.length - 1 ? 0 : newIndex + 1;
      }

      return {
        ...state,
        selectedTaskIndex: newIndex,
      };
    }

    case "SET_GESTURE_MODE":
      return {
        ...state,
        isGestureMode: action.payload,
      };

    case "SET_CAMERA_STATUS":
      return {
        ...state,
        cameraStatus: action.payload,
      };

    case "SET_CURRENT_GESTURE":
      return {
        ...state,
        currentGesture: action.payload,
      };

    case "TOGGLE_TASK_COMPLETION": {
      const updatedTasks = state.tasks.map((task) =>
        task.id === action.payload
          ? { ...task, completed: !task.completed, updatedAt: new Date() }
          : task
      );
      return {
        ...state,
        tasks: updatedTasks,
      };
    }

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedTaskIndex: -1,
      };

    case "INITIALIZE_STATE":
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
}

// Error state type
interface ErrorState {
  hasError: boolean;
  errorMessage: string | null;
  errorType: "database" | "operation" | "quota" | null;
  canRetry: boolean;
}

// Context type
interface TodoContextType {
  state: TodoState;
  dispatch: React.Dispatch<TodoAction>;
  errorState: ErrorState;
  // Convenience methods
  addTask: (text: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompletion: (id: string) => Promise<void>;
  moveSelection: (direction: "up" | "down") => void;
  setSelectedTask: (index: number) => void;
  clearSelection: () => void;
  setGestureMode: (enabled: boolean) => void;
  setCameraStatus: (status: TodoState["cameraStatus"]) => void;
  setCurrentGesture: (gesture: GestureType | null) => void;
  // Database operations
  loadTasks: () => Promise<void>;
  initializeDatabase: () => Promise<void>;
  // Error handling
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
  attemptDatabaseRecovery: () => Promise<boolean>;
  // Data backup/recovery
  exportData: () => Promise<{ tasks: Task[]; settings: Record<string, any> }>;
  importData: (data: {
    tasks: Task[];
    settings: Record<string, any>;
  }) => Promise<void>;
}

// Create context
const TodoContext = createContext<TodoContextType | undefined>(undefined);

// Provider component
interface TodoProviderProps {
  children: ReactNode;
}

export function TodoProvider({ children }: TodoProviderProps) {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  const [database, setDatabase] = useState<TodoDatabase | null>(null);
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    errorMessage: null,
    errorType: null,
    canRetry: false,
  });
  const [lastFailedOperation, setLastFailedOperation] = useState<
    (() => Promise<void>) | null
  >(null);

  // Initialize database on mount
  useEffect(() => {
    initializeDatabase();
  }, []);

  // Handle database errors with enhanced recovery
  const handleDatabaseError = async (
    error: unknown,
    operation: string,
    retryFn?: () => Promise<void>
  ) => {
    console.error(`Database error during ${operation}:`, error);

    let errorMessage: string;
    let errorType: ErrorState["errorType"];
    let canRetry = false;
    let shouldSwitchToFallback = false;

    if (error instanceof DatabaseQuotaError) {
      errorMessage =
        "ストレージ容量が不足しています。データをエクスポートして不要なデータを削除してください。";
      errorType = "quota";
      canRetry = false;
      shouldSwitchToFallback = true;
    } else if (error instanceof DatabaseConnectionError) {
      errorMessage =
        "データベースに接続できません。一時的にメモリ内でデータを管理します。";
      errorType = "database";
      canRetry = true;
      shouldSwitchToFallback = true;
    } else if (error instanceof DatabaseOperationError) {
      errorMessage = `操作に失敗しました: ${operation}。データの整合性を確認しています。`;
      errorType = "operation";
      canRetry = true;
    } else {
      errorMessage = `予期しないエラーが発生しました: ${
        error instanceof Error ? error.message : "不明なエラー"
      }。データ保護のため一時的にメモリ内で動作します。`;
      errorType = "database";
      canRetry = true;
      shouldSwitchToFallback = true;
    }

    // Attempt to switch to fallback database if needed
    if (shouldSwitchToFallback && !DatabaseFactory.isUsingFallbackDatabase()) {
      try {
        console.log("Switching to fallback database due to error");
        const fallbackDB = await DatabaseFactory.switchToFallback();
        setDatabase(fallbackDB);

        errorMessage += " フォールバックデータベースに切り替えました。";

        // Try to reload tasks from fallback
        try {
          const tasks = await fallbackDB.getAllTasks();
          dispatch({ type: "SET_TASKS", payload: tasks });
        } catch (fallbackError) {
          console.warn("Failed to load tasks from fallback:", fallbackError);
        }
      } catch (fallbackError) {
        console.error("Failed to switch to fallback database:", fallbackError);
        errorMessage += " フォールバックデータベースの初期化にも失敗しました。";
      }
    }

    setErrorState({
      hasError: true,
      errorMessage,
      errorType,
      canRetry,
    });

    if (retryFn) {
      setLastFailedOperation(() => retryFn);
    }
  };

  const clearError = () => {
    setErrorState({
      hasError: false,
      errorMessage: null,
      errorType: null,
      canRetry: false,
    });
    setLastFailedOperation(null);
  };

  const retryLastOperation = async () => {
    if (lastFailedOperation) {
      try {
        clearError();
        await lastFailedOperation();
      } catch (error) {
        await handleDatabaseError(
          error,
          "retry operation",
          lastFailedOperation
        );
      }
    }
  };

  // Periodic backup to prevent data loss
  useEffect(() => {
    const backupInterval = setInterval(async () => {
      try {
        await DatabaseFactory.backupData();
      } catch (error) {
        console.warn("Periodic backup failed:", error);
      }
    }, 30000); // Backup every 30 seconds

    return () => clearInterval(backupInterval);
  }, []);

  // Attempt database recovery
  const attemptDatabaseRecovery = async (): Promise<boolean> => {
    try {
      const success = await DatabaseFactory.attemptRecovery();
      if (success) {
        const recoveredDB = await DatabaseFactory.createDatabase();
        setDatabase(recoveredDB);
        await loadTasks();
        clearError();
        console.log("Database recovery successful");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Database recovery failed:", error);
      return false;
    }
  };

  // Sync state changes to database
  useEffect(() => {
    // Don't sync if tasks are empty (initial state)
    if (state.tasks.length === 0) return;

    // Save tasks to database when tasks change
    // This is a simple approach - in production, you might want more granular control
    const syncTasks = async () => {
      try {
        // For now, we'll rely on individual operations to handle persistence
        // This effect is mainly for future enhancements
      } catch (error) {
        console.error("Failed to sync tasks to database:", error);
      }
    };

    syncTasks();
  }, [state.tasks]);

  // Database operations
  const initializeDatabase = async () => {
    try {
      const db = await DatabaseFactory.createDatabase();
      setDatabase(db);
      await loadTasks();
      clearError(); // Clear any previous errors
    } catch (error) {
      console.error("Failed to initialize database:", error);
      handleDatabaseError(error, "initialize database", initializeDatabase);
      // Set camera status to error if database fails
      dispatch({ type: "SET_CAMERA_STATUS", payload: "error" });
    }
  };

  const loadTasks = async () => {
    if (!database) {
      console.warn("Database not initialized, skipping task load");
      return;
    }

    try {
      const tasks = await database.getAllTasks();
      dispatch({ type: "SET_TASKS", payload: tasks });
    } catch (error) {
      console.error("Failed to load tasks:", error);
      handleDatabaseError(error, "load tasks", loadTasks);
    }
  };

  // Convenience methods
  const addTask = async (text: string) => {
    if (!database) {
      throw new DatabaseConnectionError("Database not available");
    }

    const operation = async () => {
      const taskData = {
        text: text.trim(),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to database first
      const id = await database.addTask(taskData);

      // Then update local state
      const newTask: Task = {
        ...taskData,
        id,
      };

      dispatch({ type: "SET_TASKS", payload: [...state.tasks, newTask] });
    };

    try {
      await operation();
    } catch (error) {
      handleDatabaseError(error, "add task", operation);
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!database) {
      throw new DatabaseConnectionError("Database not available");
    }

    const operation = async () => {
      // Update database first
      await database.updateTask(id, updates);

      // Then update local state
      dispatch({ type: "UPDATE_TASK", payload: { id, updates } });
    };

    try {
      await operation();
    } catch (error) {
      handleDatabaseError(error, "update task", operation);
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    if (!database) {
      throw new DatabaseConnectionError("Database not available");
    }

    const operation = async () => {
      // Delete from database first
      await database.deleteTask(id);

      // Then update local state
      dispatch({ type: "DELETE_TASK", payload: id });
    };

    try {
      await operation();
    } catch (error) {
      handleDatabaseError(error, "delete task", operation);
      throw error;
    }
  };

  const toggleTaskCompletion = async (id: string) => {
    const task = state.tasks.find((t) => t.id === id);
    if (task) {
      await updateTask(id, { completed: !task.completed });
    }
  };

  const moveSelection = (direction: "up" | "down") => {
    dispatch({ type: "MOVE_SELECTION", payload: direction });
  };

  const setSelectedTask = (index: number) => {
    dispatch({ type: "SET_SELECTED_TASK", payload: index });
  };

  const clearSelection = () => {
    dispatch({ type: "CLEAR_SELECTION" });
  };

  const setGestureMode = (enabled: boolean) => {
    dispatch({ type: "SET_GESTURE_MODE", payload: enabled });
  };

  const setCameraStatus = (status: TodoState["cameraStatus"]) => {
    dispatch({ type: "SET_CAMERA_STATUS", payload: status });
  };

  const setCurrentGesture = (gesture: GestureType | null) => {
    dispatch({ type: "SET_CURRENT_GESTURE", payload: gesture });
  };

  // Data backup/recovery methods
  const exportData = async (): Promise<{
    tasks: Task[];
    settings: Record<string, any>;
  }> => {
    if (!database) {
      throw new DatabaseConnectionError("Database not available");
    }

    try {
      return await database.exportData();
    } catch (error) {
      handleDatabaseError(error, "export data");
      throw error;
    }
  };

  const importData = async (data: {
    tasks: Task[];
    settings: Record<string, any>;
  }) => {
    if (!database) {
      throw new DatabaseConnectionError("Database not available");
    }

    const operation = async () => {
      await database.importData(data);
      await loadTasks(); // Reload tasks after import
    };

    try {
      await operation();
    } catch (error) {
      handleDatabaseError(error, "import data", operation);
      throw error;
    }
  };

  const contextValue: TodoContextType = {
    state,
    dispatch,
    errorState,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    moveSelection,
    setSelectedTask,
    clearSelection,
    setGestureMode,
    setCameraStatus,
    setCurrentGesture,
    loadTasks,
    initializeDatabase,
    clearError,
    retryLastOperation,
    attemptDatabaseRecovery,
    exportData,
    importData,
  };

  return (
    <TodoContext.Provider value={contextValue}>{children}</TodoContext.Provider>
  );
}

// Custom hook to use the context
export function useTodo() {
  const context = useContext(TodoContext);
  if (context === undefined) {
    throw new Error("useTodo must be used within a TodoProvider");
  }
  return context;
}

// Export the context for testing purposes
export { TodoContext };
