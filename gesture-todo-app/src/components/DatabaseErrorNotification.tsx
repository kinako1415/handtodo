/** @format */

import React from "react";
import { useTodo } from "../contexts";

export const DatabaseErrorNotification: React.FC = () => {
  const {
    errorState,
    clearError,
    retryLastOperation,
    attemptDatabaseRecovery,
    exportData,
  } = useTodo();
  const [isRecovering, setIsRecovering] = React.useState(false);

  if (!errorState.hasError) {
    return null;
  }

  const handleExportData = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gesture-todo-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
    }
  };

  const getErrorIcon = () => {
    switch (errorState.errorType) {
      case "quota":
        return (
          <svg
            className="w-6 h-6 text-orange-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        );
      case "database":
        return (
          <svg
            className="w-6 h-6 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-6 h-6 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        );
    }
  };

  const getErrorTitle = () => {
    switch (errorState.errorType) {
      case "quota":
        return "ストレージ容量不足";
      case "database":
        return "データベースエラー";
      case "operation":
        return "操作エラー";
      default:
        return "エラー";
    }
  };

  const handleDatabaseRecovery = async () => {
    setIsRecovering(true);
    try {
      const success = await attemptDatabaseRecovery();
      if (success) {
        // Success message will be handled by context
      } else {
        console.warn("Database recovery was not successful");
      }
    } catch (error) {
      console.error("Database recovery failed:", error);
    } finally {
      setIsRecovering(false);
    }
  };

  const getErrorActions = () => {
    const actions = [];

    if (errorState.canRetry) {
      actions.push(
        <button
          key="retry"
          onClick={retryLastOperation}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      );
    }

    // Add recovery option for database errors
    if (
      errorState.errorType === "database" ||
      errorState.errorType === "operation"
    ) {
      actions.push(
        <button
          key="recover"
          onClick={handleDatabaseRecovery}
          disabled={isRecovering}
          className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isRecovering ? "復旧中..." : "データベース復旧"}
        </button>
      );
    }

    if (errorState.errorType === "quota") {
      actions.push(
        <button
          key="export"
          onClick={handleExportData}
          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
        >
          データをエクスポート
        </button>
      );
    }

    // Always provide export option for data safety
    if (errorState.errorType !== "quota") {
      actions.push(
        <button
          key="backup"
          onClick={handleExportData}
          className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
        >
          バックアップ作成
        </button>
      );
    }

    actions.push(
      <button
        key="dismiss"
        onClick={clearError}
        className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
      >
        閉じる
      </button>
    );

    return actions;
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 border-l-4 border-red-500 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{getErrorIcon()}</div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-800 dark:text-white">
              {getErrorTitle()}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {errorState.errorMessage}
            </p>

            {errorState.errorType === "quota" && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <p>推奨される対処法:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>不要なタスクを削除する</li>
                  <li>データをエクスポートしてバックアップを作成する</li>
                  <li>ブラウザのストレージをクリアする</li>
                  <li>一時的にメモリ内でデータを管理します</li>
                </ul>
              </div>
            )}

            {errorState.errorType === "database" && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <p>データ保護機能:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>データは一時的にメモリ内で保護されています</li>
                  <li>定期的な自動バックアップが実行されています</li>
                  <li>データベース復旧を試行できます</li>
                  <li>手動でデータをエクスポートできます</li>
                </ul>
              </div>
            )}

            {errorState.errorType === "operation" && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <p>対処法:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>操作を再試行してください</li>
                  <li>データベース復旧を試行してください</li>
                  <li>問題が続く場合はデータをバックアップしてください</li>
                </ul>
              </div>
            )}

            <div className="mt-3 flex space-x-2">{getErrorActions()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
