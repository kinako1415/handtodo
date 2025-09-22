/** @format */

// Task model
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Gesture types
export type GestureType =
  | "thumbs_up" // 新規タスク追加
  | "peace_sign" // タスク完了
  | "fist" // タスク削除
  | "point_up" // 上に移動
  | "two_fingers" // 下に移動
  | "open_palm" // キャンセル
  | "none";

// App state
export interface TodoState {
  tasks: Task[];
  selectedTaskIndex: number;
  isGestureMode: boolean;
  cameraStatus: "initializing" | "active" | "error" | "disabled";
  currentGesture: GestureType | null;
}

// App settings
export interface AppSettings {
  gestureEnabled: boolean;
  sensitivity: number;
  theme: "light" | "dark";
  confidenceThreshold: number;
  debounceTime: number;
}

// Camera permission status
export type CameraPermission = "granted" | "denied" | "prompt";

// Complete app state
export interface AppState {
  tasks: Task[];
  selectedTaskIndex: number;
  isGestureMode: boolean;
  cameraPermission: CameraPermission;
  gestureSettings: {
    sensitivity: number;
    debounceTime: number;
    confidenceThreshold: number;
  };
}
