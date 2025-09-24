/** @format */

import React, { useState } from "react";
import { GestureType } from "../types";

interface GestureIndicatorProps {
  currentGesture: GestureType | null;
  isHandDetected: boolean;
  showGuide?: boolean;
}

// Gesture information mapping
const GESTURE_INFO: Record<
  GestureType,
  {
    name: string;
    description: string;
    action: string;
    icon: string;
    color: string;
  }
> = {
  thumbs_up: {
    name: "親指立て",
    description: "Thumbs Up",
    action: "新しいタスクを追加",
    icon: "👍",
    color: "text-green-500",
  },
  peace_sign: {
    name: "ピースサイン",
    description: "Peace Sign",
    action: "タスクを完了にする",
    icon: "✌️",
    color: "text-blue-500",
  },
  fist: {
    name: "握りこぶし",
    description: "Fist",
    action: "タスクを削除",
    icon: "✊",
    color: "text-red-500",
  },
  point_up: {
    name: "人差し指立て",
    description: "Point Up",
    action: "上のタスクを選択",
    icon: "☝️",
    color: "text-purple-500",
  },
  two_fingers: {
    name: "2本指立て",
    description: "Two Fingers",
    action: "下のタスクを選択",
    icon: "✌️",
    color: "text-purple-500",
  },
  open_palm: {
    name: "開いた手のひら",
    description: "Open Palm",
    action: "操作をキャンセル",
    icon: "🖐️",
    color: "text-gray-500",
  },
  none: {
    name: "なし",
    description: "None",
    action: "ジェスチャーなし",
    icon: "🤚",
    color: "text-gray-400",
  },
};

export const GestureIndicator: React.FC<GestureIndicatorProps> = ({
  currentGesture,
  isHandDetected,
  showGuide = false,
}) => {
  const [isGuideExpanded, setIsGuideExpanded] = useState(showGuide);

  const currentGestureInfo = currentGesture
    ? GESTURE_INFO[currentGesture]
    : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          ジェスチャー状態
        </h3>
        <button
          onClick={() => setIsGuideExpanded(!isGuideExpanded)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          {isGuideExpanded ? "ガイドを隠す" : "ガイドを表示"}
        </button>
      </div>

      {/* Hand Detection Status */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isHandDetected ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          ></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            手の検出状況
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isHandDetected
            ? "✅ 手が検出されています"
            : "❌ 手が検出されていません"}
        </p>
      </div>

      {/* Current Gesture Display */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            現在のジェスチャー
          </span>
        </div>

        {currentGestureInfo && currentGesture !== "none" ? (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{currentGestureInfo.icon}</span>
              <div>
                <p className={`font-medium ${currentGestureInfo.color}`}>
                  {currentGestureInfo.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentGestureInfo.action}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🤚</span>
              <div>
                <p className="font-medium text-gray-500">ジェスチャーなし</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  手のジェスチャーを行ってください
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gesture Guide */}
      {isGuideExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">
            ジェスチャーガイド
          </h4>
          <div className="space-y-2">
            {Object.entries(GESTURE_INFO)
              .filter(([key]) => key !== "none")
              .map(([key, info]) => (
                <div
                  key={key}
                  className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                    currentGesture === key
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="text-lg">{info.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${info.color}`}>
                        {info.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({info.description})
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {info.action}
                    </p>
                  </div>
                  {currentGesture === key && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {!isHandDetected
            ? "カメラに手をかざしてジェスチャーを行ってください"
            : currentGesture === "none"
            ? "ジェスチャーを行うとタスクを操作できます"
            : "ジェスチャーが認識されました！"}
        </p>
      </div>
    </div>
  );
};
