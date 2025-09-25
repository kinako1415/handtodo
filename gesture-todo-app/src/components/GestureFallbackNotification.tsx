/** @format */

import React, { useState, useEffect } from "react";
import { useApp } from "../contexts";

interface GestureFallbackNotificationProps {
  cameraStatus:
    | "initializing"
    | "active"
    | "error"
    | "disabled"
    | "permission_denied";
  gestureError: string | null;
  fallbackMode: boolean;
  onRetryCamera?: () => void;
  onEnableTraditionalMode?: () => void;
}

export const GestureFallbackNotification: React.FC<
  GestureFallbackNotificationProps
> = ({
  cameraStatus,
  gestureError,
  fallbackMode,
  onRetryCamera,
  onEnableTraditionalMode,
}) => {
  const { setGestureEnabled } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  // Reset dismissed state when status changes
  useEffect(() => {
    if (cameraStatus === "active") {
      setIsDismissed(false);
    }
  }, [cameraStatus]);

  // Don't show if dismissed or camera is active
  if (isDismissed || cameraStatus === "active" || cameraStatus === "disabled") {
    return null;
  }

  const handleDisableGestures = async () => {
    await setGestureEnabled(false);
    if (onEnableTraditionalMode) {
      onEnableTraditionalMode();
    }
    setIsDismissed(true);
  };

  const handleRetry = () => {
    if (onRetryCamera) {
      onRetryCamera();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const getNotificationContent = () => {
    switch (cameraStatus) {
      case "permission_denied":
        return {
          title: "カメラアクセスが拒否されました",
          message:
            "ジェスチャー機能を使用するには、カメラアクセスの許可が必要です。",
          icon: (
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3l18 18"
              />
            </svg>
          ),
          showPermissionGuide: true,
        };
      case "error":
        return {
          title: fallbackMode
            ? "従来操作モードに切り替えました"
            : "ジェスチャー機能でエラーが発生",
          message: gestureError || "ジェスチャー認識でエラーが発生しました。",
          icon: (
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ),
          showPermissionGuide: false,
        };
      case "initializing":
        return {
          title: "ジェスチャー機能を初期化中",
          message: "カメラとジェスチャー認識を準備しています...",
          icon: (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          ),
          showPermissionGuide: false,
        };
      default:
        return null;
    }
  };

  const content = getNotificationContent();
  if (!content) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-40 max-w-lg mx-auto">
      <div className="bg-white dark:bg-gray-800 border-l-4 border-orange-500 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{content.icon}</div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-800 dark:text-white">
              {content.title}
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {content.message}
            </p>

            {content.showPermissionGuide && (
              <div className="mt-3">
                <button
                  onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showPermissionGuide ? "ガイドを閉じる" : "許可方法を見る"}
                </button>

                {showPermissionGuide && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                    <p className="font-medium mb-2">
                      カメラアクセスを許可する方法:
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        ブラウザのアドレスバー左側のカメラアイコンをクリック
                      </li>
                      <li>「許可」または「Allow」を選択</li>
                      <li>ページを再読み込み</li>
                    </ol>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      または、ブラウザの設定からこのサイトのカメラアクセスを許可してください。
                    </p>
                  </div>
                )}
              </div>
            )}

            {fallbackMode && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium">従来操作モード</p>
                <p>マウスとキーボードですべての機能をご利用いただけます。</p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {cameraStatus === "permission_denied" && (
                <button
                  onClick={handleRetry}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  再試行
                </button>
              )}

              {(cameraStatus === "error" || fallbackMode) && !fallbackMode && (
                <button
                  onClick={handleRetry}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  再試行
                </button>
              )}

              <button
                onClick={handleDisableGestures}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                従来操作を使用
              </button>

              <button
                onClick={handleDismiss}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
