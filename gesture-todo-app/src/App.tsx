/** @format */

import React, { useEffect } from "react";
import "./App.css";
import { useTodo, useApp } from "./contexts";
import { TodoList, GestureCamera } from "./components";
import { GestureType } from "./types";

function AppContent() {
  const {
    state: todoState,
    loadTasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    setSelectedTask,
    setCurrentGesture,
  } = useTodo();
  const { state: appState } = useApp();

  useEffect(() => {
    // Load tasks when app initializes
    if (appState.isInitialized) {
      loadTasks();
    }
  }, [appState.isInitialized, loadTasks]);

  const handleTaskAdd = async (text: string) => {
    try {
      await addTask(text);
    } catch (error) {
      console.error("Failed to add task:", error);
      // TODO: Show user-friendly error message
    }
  };

  const handleTaskEdit = async (id: string, newText: string) => {
    try {
      await updateTask(id, { text: newText });
    } catch (error) {
      console.error("Failed to update task:", error);
      // TODO: Show user-friendly error message
    }
  };

  const handleTaskToggle = async (id: string) => {
    try {
      await toggleTaskCompletion(id);
    } catch (error) {
      console.error("Failed to toggle task:", error);
      // TODO: Show user-friendly error message
    }
  };

  const handleTaskDelete = async (id: string) => {
    try {
      await deleteTask(id);
    } catch (error) {
      console.error("Failed to delete task:", error);
      // TODO: Show user-friendly error message
    }
  };

  const handleGestureDetected = (gesture: GestureType) => {
    setCurrentGesture(gesture);

    // Basic gesture handling - full implementation will be in task 7
    if (gesture !== "none") {
      console.log("Gesture detected:", gesture);
      // TODO: Implement gesture actions in task 7
    }
  };

  if (!appState.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Initializing app...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Gesture Todo App
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Control your todos with hand gestures
          </p>

          {/* Status indicators */}
          <div className="flex items-center justify-center space-x-4 mt-4 text-sm">
            <div className="flex items-center space-x-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  todoState.cameraStatus === "active"
                    ? "bg-green-500"
                    : todoState.cameraStatus === "error"
                    ? "bg-red-500"
                    : "bg-gray-400"
                }`}
              ></div>
              <span className="text-gray-600 dark:text-gray-300">
                Camera: {todoState.cameraStatus}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  todoState.isGestureMode ? "bg-blue-500" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-gray-600 dark:text-gray-300">
                Gesture Mode: {todoState.isGestureMode ? "On" : "Off"}
              </span>
            </div>

            {todoState.currentGesture &&
              todoState.currentGesture !== "none" && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-gray-600 dark:text-gray-300">
                    Gesture: {todoState.currentGesture}
                  </span>
                </div>
              )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Todo List */}
          <div>
            <TodoList
              tasks={todoState.tasks}
              selectedTaskIndex={todoState.selectedTaskIndex}
              onTaskSelect={setSelectedTask}
              onTaskToggle={handleTaskToggle}
              onTaskDelete={handleTaskDelete}
              onTaskEdit={handleTaskEdit}
              onTaskAdd={handleTaskAdd}
            />
          </div>

          {/* Gesture Camera */}
          <div>
            <GestureCamera
              onGestureDetected={handleGestureDetected}
              isEnabled={appState.gestureEnabled}
            />
          </div>
        </main>

        {/* Debug info - can be removed in production */}
        {import.meta.env.DEV && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-4">
            <details className="text-sm">
              <summary className="font-medium text-gray-800 dark:text-white cursor-pointer">
                Debug Information
              </summary>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                    Todo State
                  </h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-300 text-xs">
                    <li>Tasks: {todoState.tasks.length}</li>
                    <li>Selected Index: {todoState.selectedTaskIndex}</li>
                    <li>
                      Gesture Mode: {todoState.isGestureMode ? "Yes" : "No"}
                    </li>
                    <li>Camera: {todoState.cameraStatus}</li>
                    <li>
                      Current Gesture: {todoState.currentGesture || "None"}
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <h4 className="font-medium text-gray-800 dark:text-white mb-2">
                    App State
                  </h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-300 text-xs">
                    <li>Theme: {appState.theme}</li>
                    <li>
                      Gesture Enabled: {appState.gestureEnabled ? "Yes" : "No"}
                    </li>
                    <li>Camera Permission: {appState.cameraPermission}</li>
                    <li>Sensitivity: {appState.gestureSettings.sensitivity}</li>
                    <li>
                      Confidence: {appState.gestureSettings.confidenceThreshold}
                    </li>
                  </ul>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
