/** @format */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { GestureRecognizer } from "../services/gestureRecognizer";
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
    if (!isEnabled || !videoElement) {
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
        const recognizer = new GestureRecognizer(handleGestureDetected, {
          confidenceThreshold: appState.gestureSettings.confidenceThreshold,
          debounceFrames: Math.floor(
            appState.gestureSettings.debounceTime / 33
          ), // Convert ms to frames (assuming 30fps)
          sensitivity: appState.gestureSettings.sensitivity,
        });

        await recognizer.initialize(videoElement);
        gestureRecognizerRef.current = recognizer;
        setIsInitialized(true);
        setGestureMode(true);

        // Start processing frames
        const processFrames = async () => {
          if (gestureRecognizerRef.current && isEnabled) {
            try {
              await gestureRecognizerRef.current.processFrame(videoElement);
            } catch (error) {
              console.error("Frame processing error:", error);
            }
            requestAnimationFrame(processFrames);
          }
        };
        processFrames();
      } catch (error) {
        console.error("Failed to initialize gesture recognizer:", error);
        setFeedbackMessage("ジェスチャー認識の初期化に失敗しました");
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
    handleGestureDetected,
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
              isInitialized ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
          <span className="text-sm font-medium text-gray-800 dark:text-white">
            {isInitialized ? "ジェスチャー認識中" : "初期化中..."}
          </span>
        </div>

        {currentAction && (
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-lg">{currentAction.icon}</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {currentAction.description}
            </span>
          </div>
        )}
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 shadow-lg animate-fade-in">
          <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
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
