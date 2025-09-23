/** @format */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import { CameraPermission } from "../types";
import { IndexedDBTodoDatabase } from "../services/database";

// Camera status type
export type CameraStatus =
  | "initializing"
  | "active"
  | "error"
  | "disabled"
  | "permission_denied";

// App-level state interface
export interface AppState {
  cameraPermission: CameraPermission;
  cameraStatus: CameraStatus;
  gestureSettings: {
    sensitivity: number;
    debounceTime: number;
    confidenceThreshold: number;
  };
  theme: "light" | "dark";
  gestureEnabled: boolean;
  isInitialized: boolean;
}

// Action types for app reducer
export type AppAction =
  | { type: "SET_CAMERA_PERMISSION"; payload: CameraPermission }
  | { type: "SET_CAMERA_STATUS"; payload: CameraStatus }
  | {
      type: "SET_GESTURE_SETTINGS";
      payload: Partial<AppState["gestureSettings"]>;
    }
  | { type: "SET_THEME"; payload: "light" | "dark" }
  | { type: "SET_GESTURE_ENABLED"; payload: boolean }
  | { type: "SET_INITIALIZED"; payload: boolean }
  | { type: "INITIALIZE_SETTINGS"; payload: Partial<AppState> };

// Initial app state
const initialAppState: AppState = {
  cameraPermission: "prompt",
  cameraStatus: "disabled",
  gestureSettings: {
    sensitivity: 0.7,
    debounceTime: 300,
    confidenceThreshold: 0.8,
  },
  theme: "light",
  gestureEnabled: true,
  isInitialized: false,
};

// App reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CAMERA_PERMISSION":
      return {
        ...state,
        cameraPermission: action.payload,
      };

    case "SET_CAMERA_STATUS":
      return {
        ...state,
        cameraStatus: action.payload,
      };

    case "SET_GESTURE_SETTINGS":
      return {
        ...state,
        gestureSettings: {
          ...state.gestureSettings,
          ...action.payload,
        },
      };

    case "SET_THEME":
      return {
        ...state,
        theme: action.payload,
      };

    case "SET_GESTURE_ENABLED":
      return {
        ...state,
        gestureEnabled: action.payload,
      };

    case "SET_INITIALIZED":
      return {
        ...state,
        isInitialized: action.payload,
      };

    case "INITIALIZE_SETTINGS":
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
}

// Context type
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience methods
  setCameraPermission: (permission: CameraPermission) => Promise<void>;
  setCameraStatus: (status: CameraStatus) => void;
  updateGestureSettings: (
    settings: Partial<AppState["gestureSettings"]>
  ) => Promise<void>;
  setTheme: (theme: "light" | "dark") => Promise<void>;
  setGestureEnabled: (enabled: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const database = new IndexedDBTodoDatabase();

  // Initialize settings on mount
  useEffect(() => {
    initializeSettings();
  }, []);

  // Apply theme changes to document
  useEffect(() => {
    if (state.theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [state.theme]);

  // Initialize settings from database
  const initializeSettings = async () => {
    try {
      await database.initialize();
      await loadSettings();
      dispatch({ type: "SET_INITIALIZED", payload: true });
    } catch (error) {
      console.error("Failed to initialize app settings:", error);
      // Still mark as initialized to prevent infinite loading
      dispatch({ type: "SET_INITIALIZED", payload: true });
    }
  };

  // Load settings from database
  const loadSettings = async () => {
    try {
      const [
        gestureEnabled,
        sensitivity,
        theme,
        confidenceThreshold,
        debounceTime,
      ] = await Promise.all([
        database.getSetting("gestureEnabled"),
        database.getSetting("sensitivity"),
        database.getSetting("theme"),
        database.getSetting("confidenceThreshold"),
        database.getSetting("debounceTime"),
      ]);

      const loadedSettings: Partial<AppState> = {};

      if (gestureEnabled !== undefined) {
        loadedSettings.gestureEnabled = gestureEnabled;
      }

      if (theme !== undefined) {
        loadedSettings.theme = theme;
      }

      if (
        sensitivity !== undefined ||
        confidenceThreshold !== undefined ||
        debounceTime !== undefined
      ) {
        loadedSettings.gestureSettings = {
          ...state.gestureSettings,
          ...(sensitivity !== undefined && { sensitivity }),
          ...(confidenceThreshold !== undefined && { confidenceThreshold }),
          ...(debounceTime !== undefined && { debounceTime }),
        };
      }

      if (Object.keys(loadedSettings).length > 0) {
        dispatch({ type: "INITIALIZE_SETTINGS", payload: loadedSettings });
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  // Convenience methods
  const setCameraPermission = async (permission: CameraPermission) => {
    dispatch({ type: "SET_CAMERA_PERMISSION", payload: permission });
    // Camera permission is not persisted to database as it's runtime state
  };

  const setCameraStatus = (status: CameraStatus) => {
    dispatch({ type: "SET_CAMERA_STATUS", payload: status });
  };

  const updateGestureSettings = async (
    settings: Partial<AppState["gestureSettings"]>
  ) => {
    try {
      // Save to database
      const promises = [];
      if (settings.sensitivity !== undefined) {
        promises.push(database.setSetting("sensitivity", settings.sensitivity));
      }
      if (settings.confidenceThreshold !== undefined) {
        promises.push(
          database.setSetting(
            "confidenceThreshold",
            settings.confidenceThreshold
          )
        );
      }
      if (settings.debounceTime !== undefined) {
        promises.push(
          database.setSetting("debounceTime", settings.debounceTime)
        );
      }

      await Promise.all(promises);

      // Update local state
      dispatch({ type: "SET_GESTURE_SETTINGS", payload: settings });
    } catch (error) {
      console.error("Failed to update gesture settings:", error);
      throw error;
    }
  };

  const setTheme = async (theme: "light" | "dark") => {
    try {
      await database.setSetting("theme", theme);
      dispatch({ type: "SET_THEME", payload: theme });
    } catch (error) {
      console.error("Failed to save theme setting:", error);
      // Still update local state even if save fails
      dispatch({ type: "SET_THEME", payload: theme });
    }
  };

  const setGestureEnabled = async (enabled: boolean) => {
    try {
      await database.setSetting("gestureEnabled", enabled);
      dispatch({ type: "SET_GESTURE_ENABLED", payload: enabled });
    } catch (error) {
      console.error("Failed to save gesture enabled setting:", error);
      // Still update local state even if save fails
      dispatch({ type: "SET_GESTURE_ENABLED", payload: enabled });
    }
  };

  const resetSettings = async () => {
    try {
      // Reset to default values
      await Promise.all([
        database.setSetting("gestureEnabled", true),
        database.setSetting("sensitivity", 0.7),
        database.setSetting("theme", "light"),
        database.setSetting("confidenceThreshold", 0.8),
        database.setSetting("debounceTime", 300),
      ]);

      // Reset local state
      dispatch({ type: "INITIALIZE_SETTINGS", payload: initialAppState });
    } catch (error) {
      console.error("Failed to reset settings:", error);
      throw error;
    }
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    setCameraPermission,
    setCameraStatus,
    updateGestureSettings,
    setTheme,
    setGestureEnabled,
    loadSettings,
    resetSettings,
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

// Export the context for testing purposes
export { AppContext };
