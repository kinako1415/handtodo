/** @format */

import React, { useEffect } from "react";
import "./App.css";
import { useTodo, useApp } from "./contexts";

function AppContent() {
  const { state: todoState, loadTasks } = useTodo();
  const { state: appState } = useApp();

  useEffect(() => {
    // Load tasks when app initializes
    if (appState.isInitialized) {
      loadTasks();
    }
  }, [appState.isInitialized, loadTasks]);

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
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Gesture Todo App
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Control your todos with hand gestures
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                State Management System Active
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                    Todo State
                  </h3>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                    <li>Tasks: {todoState.tasks.length}</li>
                    <li>
                      Selected:{" "}
                      {todoState.selectedTaskIndex >= 0
                        ? todoState.selectedTaskIndex
                        : "None"}
                    </li>
                    <li>
                      Gesture Mode:{" "}
                      {todoState.isGestureMode ? "Enabled" : "Disabled"}
                    </li>
                    <li>Camera: {todoState.cameraStatus}</li>
                    <li>
                      Current Gesture: {todoState.currentGesture || "None"}
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                    App State
                  </h3>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-300">
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
            </div>

            <div className="text-center">
              <p className="text-green-600 dark:text-green-400 font-medium">
                ✅ React State Management System Implemented
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Context API + useReducer + IndexedDB synchronization ready
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
