/** @format */

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  GestureRecognizer,
  GestureRecognitionError,
  MediaPipeInitializationError,
  FrameProcessingError,
} from "../services/gestureRecognizer";
import { useTodo, useApp } from "../contexts";
import { GestureType } from "../types";

interface GestureManagerProps {
  videoElement: HTMLVideoElement | null;
  isEnabled: boolean;
}

interface GestureAction {
  type: "add" | "complete" | "delete" | "navigate" | "cancel";
  description: string;
  icon: string;
}

const GESTURE_ACTIONS: Record<GestureType, GestureAction | null> = {
  thumbs_up: {
    type: "add",
    description: "新しいタスクを追加",
    icon: "👍",
  },
  peace_sign: {
    type: "complete",
    description: "タスクを完了",
    icon: "✌️",
  },
  fist: {
    type: "delete",
    description: "タスクを削除",
    icon: "✊",
  },
  point_up: {
    type: "navigate",
    description: "上に移動",
    icon: "☝️",
  },
  two_fingers: {
    type: "navigate",
    description: "下に移動",
    icon: "✌️",
  },
  open_palm: {
    type: "cancel",
    description: "操作をキャンセル",
    icon: "✋",
  },
  none: null,
};

export const GestureManager: React.FC<GestureManagerProps> = ({
  videoElement,
  isEnabled,
}) => {
  const gestureRecognizerRef = useRef<GestureRecognizer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentAction, setCurrentAction] = useState<GestureAction | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [gestureError, setGestureError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const {
    state: todoState,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    moveSelection,
    setCurrentGesture,
    setGestureMode,
  } = useTodo();

  const { state: appState } = useApp();

  // Handle gesture recognition errors
  const handleGestureError = useCallback(
    (error: GestureRecognitionError) => {
      console.error("Gesture recognition error:", error);

      let errorMessage: string;
      let shouldFallback = false;
      let isTemporary = false;

      if (error instanceof MediaPipeInitializationError) {
        errorMessage =
          "ジェスチャー認識の初期化に失敗しました。従来のマウス・キーボード操作をご利用ください。";
        shouldFallback = true;
        isTemporary = false;
      } else if (error instanceof FrameProcessingError) {
        if (retryCount >= maxRetries) {
          errorMessage =
            "ジェスチャー処理で繰り返しエラーが発生しました。従来の操作に切り替えます。";
          shouldFallback = true;
          isTemporary = false;
        } else {
          errorMessage = `ジェスチャー処理でエラーが発生しました。再試行中... (${
            retryCount + 1
          }/${maxRetries})`;
          shouldFallback = false;
          isTemporary = true;
        }
      } else {
        if (retryCount >= maxRetries) {
          errorMessage =
            "ジェスチャー認識で繰り返しエラーが発生しました。従来の操作に切り替えます。";
          shouldFallback = true;
          isTemporary = false;
        } else {
          errorMessage = `ジェスチャー認識でエラーが発生しました。再試行中... (${
            retryCount + 1
          }/${maxRetries})`;
          shouldFallback = false;
          isTemporary = true;
        }
      }

      setGestureError(errorMessage);
      setFeedbackMessage(errorMessage);

      if (shouldFallback) {
        setFallbackMode(true);
        setGestureMode(false);
        console.log(
          "Switching to fallback mode due to gesture recognition errors"
        );

        // Show persistent fallback message
        setFeedbackMessage(
          "ジェスチャー機能を無効にしました。マウス・キーボードで操作してください。"
        );
      } else if (isTemporary) {
        // For temporary errors, clear message after shorter time
        setTimeout(() => {
          if (gestureError === errorMessage) {
            setGestureError(null);
          }
          if (feedbackMessage === errorMessage) {
            setFeedbackMessage(null);
          }
        }, 3000);
        return;
      }

      // Clear error message after 8 seconds for permanent errors
      setTimeout(() => {
        setGestureError(null);
        if (feedbackMessage === errorMessage) {
          setFeedbackMessage(null);
        }
      }, 8000);
    },
    [retryCount, maxRetries, setGestureMode, gestureError, feedbackMessage]
  );

  // Retry gesture recognition
  const retryGestureRecognition = useCallback(() => {
    if (retryCount < maxRetries && videoElement) {
      setRetryCount((prev) => prev + 1);
      setGestureError(null);
      setFallbackMode(false);

      // Reinitialize gesture recognizer
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.dispose();
        gestureRecognizerRef.current = null;
      }

      setIsInitialized(false);
    }
  }, [retryCount, maxRetries, videoElement]);

  // Handle gesture detection
  const handleGestureDetected = useCallback(
    async (gesture: GestureType) => {
      if (!isEnabled || isProcessing) return;

      setCurrentGesture(gesture);
      const action = GESTURE_ACTIONS[gesture];
      setCurrentAction(action);

      if (!action) return;

      setIsProcessing(true);

      try {
        switch (action.type) {
          case "add":
            setShowAddTaskDialog(true);
            setFeedbackMessage("新しいタスクを追加します");
            break;

          case "complete":
            if (todoState.selectedTaskIndex >= 0) {
              const selectedTask = todoState.tasks[todoState.selectedTaskIndex];
              if (selectedTask) {
                await toggleTaskCompletion(selectedTask.id);
                setFeedbackMessage(
                  `タスク「${selectedTask.text}」を${
                    selectedTask.completed ? "未完了" : "完了"
                  }にしました`
                );
              }
            } else {
              setFeedbackMessage("完了するタスクを選択してください");
            }
            break;

          case "delete":
            if (todoState.selectedTaskIndex >= 0) {
              const selectedTask = todoState.tasks[todoState.selectedTaskIndex];
              if (selectedTask) {
                await deleteTask(selectedTask.id);
                setFeedbackMessage(
                  `タスク「${selectedTask.text}」を削除しました`
                );
              }
            } else {
              setFeedbackMessage("削除するタスクを選択してください");
            }
            break;

          case "navigate":
            if (todoState.tasks.length > 0) {
              const direction = gesture === "point_up" ? "up" : "down";
              moveSelection(direction);
              setFeedbackMessage(
                `選択を${direction === "up" ? "上" : "下"}に移動しました`
              );
            } else {
              setFeedbackMessage("移動できるタスクがありません");
            }
            break;

          case "cancel":
            setShowAddTaskDialog(false);
            setNewTaskText("");
            setFeedbackMessage("操作をキャンセルしました");
            break;
        }
      } catch (error) {
        console.error("Gesture action failed:", error);
        setFeedbackMessage("操作に失敗しました");
      } finally {
        setIsProcessing(false);
        // Clear feedback after 3 seconds
        setTimeout(() => {
          setFeedbackMessage(null);
          setCurrentAction(null);
        }, 3000);
      }
    },
    [
      isEnabled,
      isProcessing,
      todoState.selectedTaskIndex,
      todoState.tasks,
      toggleTaskCompletion,
      deleteTask,
      moveSelection,
      setCurrentGesture,
      addTask,
    ]
  );

  // Initialize gesture recognizer
  useEffect(() => {
    if (!isEnabled || !videoElement || fallbackMode) {
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.dispose();
        gestureRecognizerRef.current = null;
        setIsInitialized(false);
        setGestureMode(false);
      }
      return;
    }

    const initializeGestureRecognizer = async () => {
      try {
        const recognizer = new GestureRecognizer(
          handleGestureDetected,
          handleGestureError,
          {
            confidenceThreshold: appState.gestureSettings.confidenceThreshold,
            debounceFrames: Math.floor(
              appState.gestureSettings.debounceTime / 33
            ), // Convert ms to frames (assuming 30fps)
            sensitivity: appState.gestureSettings.sensitivity,
            maxRetries: 3,
            retryDelay: 1000,
          }
        );

        await recognizer.initialize(videoElement);
        gestureRecognizerRef.current = recognizer;
        setIsInitialized(true);
        setGestureMode(true);
        setGestureError(null);

        // Start processing frames with error handling
        const processFrames = async () => {
          if (gestureRecognizerRef.current && isEnabled && !fallbackMode) {
            try {
              // Check if recognizer is still healthy
              if (!gestureRecognizerRef.current.isHealthy()) {
                console.warn(
                  "Gesture recognizer is unhealthy, stopping frame processing"
                );
                return;
              }

              await gestureRecognizerRef.current.processFrame(videoElement);
              requestAnimationFrame(processFrames);
            } catch (error) {
              console.error("Frame processing error:", error);
              // Error is handled by the recognizer's error callback
              // Continue processing frames unless in fallback mode
              if (!fallbackMode) {
                requestAnimationFrame(processFrames);
              }
            }
          }
        };
        processFrames();
      } catch (error) {
        console.error("Failed to initialize gesture recognizer:", error);
        handleGestureError(
          error instanceof GestureRecognitionError
            ? error
            : new MediaPipeInitializationError(
                "Initialization failed",
                error instanceof Error ? error : undefined
              )
        );
      }
    };

    initializeGestureRecognizer();

    return () => {
      if (gestureRecognizerRef.current) {
        gestureRecognizerRef.current.dispose();
        gestureRecognizerRef.current = null;
        setIsInitialized(false);
        setGestureMode(false);
      }
    };
  }, [
    isEnabled,
    videoElement,
    fallbackMode,
    handleGestureDetected,
    handleGestureError,
    appState.gestureSettings.confidenceThreshold,
    appState.gestureSettings.debounceTime,
    appState.gestureSettings.sensitivity,
    setGestureMode,
  ]);

  // Handle add task dialog
  const handleAddTask = async () => {
    if (newTaskText.trim()) {
      try {
        await addTask(newTaskText.trim());
        setFeedbackMessage(
          `新しいタスク「${newTaskText.trim()}」を追加しました`
        );
        setNewTaskText("");
        setShowAddTaskDialog(false);
      } catch (error) {
        console.error("Failed to add task:", error);
        setFeedbackMessage("タスクの追加に失敗しました");
      }
    }
  };

  const handleCancelAddTask = () => {
    setShowAddTaskDialog(false);
    setNewTaskText("");
    setFeedbackMessage("タスクの追加をキャンセルしました");
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {/* Gesture Status Indicator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              fallbackMode
                ? "bg-orange-500"
                : gestureError
                ? "bg-red-500"
                : isInitialized
                ? "bg-green-500"
                : "bg-yellow-500"
            }`}
          />
          <span className="text-sm font-medium text-gray-800 dark:text-white">
            {fallbackMode
              ? "従来操作モード"
              : gestureError
              ? "エラー"
              : isInitialized
              ? "ジェスチャー認識中"
              : "初期化中..."}
          </span>
        </div>

        {currentAction && !fallbackMode && (
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-lg">{currentAction.icon}</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {currentAction.description}
            </span>
          </div>
        )}

        {fallbackMode && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-orange-600 dark:text-orange-400">
              マウス/キーボードをご利用ください
            </span>
            {retryCount < maxRetries && (
              <button
                onClick={retryGestureRecognition}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                再試行
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div
          className={`border rounded-lg p-3 shadow-lg animate-fade-in ${
            gestureError
              ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
              : "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              gestureError
                ? "text-red-800 dark:text-red-200"
                : "text-blue-800 dark:text-blue-200"
            }`}
          >
            {feedbackMessage}
          </p>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
            <span className="text-yellow-800 dark:text-yellow-200 text-sm">
              処理中...
            </span>
          </div>
        </div>
      )}

      {/* Add Task Dialog */}
      {showAddTaskDialog && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border border-gray-200 dark:border-gray-600 min-w-[300px]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            新しいタスクを追加
          </h3>
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="タスクの内容を入力..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAddTask();
              } else if (e.key === "Escape") {
                handleCancelAddTask();
              }
            }}
          />
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleAddTask}
              disabled={!newTaskText.trim()}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              追加
            </button>
            <button
              onClick={handleCancelAddTask}
              className="flex-1 px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors text-sm font-medium"
            >
              キャンセル
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            ヒント: 開いた手のひら（✋）でキャンセルできます
          </p>
        </div>
      )}

      {/* Gesture Guide */}
      <details className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
        <summary className="p-3 cursor-pointer text-sm font-medium text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
          ジェスチャーガイド
        </summary>
        <div className="p-3 pt-0 space-y-2">
          {Object.entries(GESTURE_ACTIONS).map(([gesture, action]) => {
            if (!action) return null;
            return (
              <div
                key={gesture}
                className="flex items-center space-x-2 text-sm"
              >
                <span className="text-lg">{action.icon}</span>
                <span className="text-gray-600 dark:text-gray-300">
                  {action.description}
                </span>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
};
