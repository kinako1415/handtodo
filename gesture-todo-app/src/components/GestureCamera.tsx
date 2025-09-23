/** @format */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Hands, Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { GestureType } from "../types";

interface GestureCameraProps {
  onGestureDetected: (gesture: GestureType) => void;
  isEnabled: boolean;
}

type CameraStatus =
  | "initializing"
  | "active"
  | "error"
  | "disabled"
  | "permission_denied";

export const GestureCamera: React.FC<GestureCameraProps> = ({
  onGestureDetected,
  isEnabled,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("disabled");
  const [error, setError] = useState<string | null>(null);
  const [handsDetected, setHandsDetected] = useState(false);

  // Handle MediaPipe results
  const onResults = useCallback(
    (results: Results) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the video frame
      if (results.image) {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      }

      // Check if hands are detected
      const hasHands =
        results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
      setHandsDetected(hasHands);

      // Draw hand landmarks and connections
      if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 2,
          });
          drawLandmarks(ctx, landmarks, {
            color: "#FF0000",
            lineWidth: 1,
            radius: 3,
          });
        }

        // For now, just detect basic hand presence
        // Actual gesture recognition will be implemented in task 6
        if (hasHands) {
          onGestureDetected("none"); // Placeholder - actual gesture detection in task 6
        }
      }
    },
    [onGestureDetected]
  );

  // Initialize MediaPipe Hands
  const initializeMediaPipe = useCallback(async () => {
    try {
      setCameraStatus("initializing");
      setError(null);

      // Initialize MediaPipe Hands
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      // Request camera access
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setCameraStatus("active");
    } catch (err) {
      console.error("Failed to initialize MediaPipe:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      if (
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("NotAllowedError")
      ) {
        setCameraStatus("permission_denied");
        setError(
          "カメラアクセスが拒否されました。ブラウザの設定でカメラアクセスを許可してください。"
        );
      } else {
        setCameraStatus("error");
        setError(`カメラの初期化に失敗しました: ${errorMessage}`);
      }
    }
  }, [onResults]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    setCameraStatus("disabled");
    setHandsDetected(false);
  }, []);

  // Effect to handle enable/disable
  useEffect(() => {
    if (isEnabled && cameraStatus === "disabled") {
      initializeMediaPipe();
    } else if (!isEnabled && cameraStatus !== "disabled") {
      cleanup();
    }

    return cleanup;
  }, [isEnabled, cameraStatus, initializeMediaPipe, cleanup]);

  // Retry function for error states
  const handleRetry = () => {
    cleanup();
    setTimeout(() => {
      if (isEnabled) {
        initializeMediaPipe();
      }
    }, 100);
  };

  if (!isEnabled) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-3"
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
          </svg>
          <p>ジェスチャー機能は無効です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          ジェスチャーカメラ
        </h3>
        <div className="flex items-center space-x-2">
          {/* Camera status indicator */}
          <div
            className={`w-3 h-3 rounded-full ${
              cameraStatus === "active"
                ? "bg-green-500"
                : cameraStatus === "initializing"
                ? "bg-yellow-500"
                : cameraStatus === "error" ||
                  cameraStatus === "permission_denied"
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {cameraStatus === "active"
              ? "アクティブ"
              : cameraStatus === "initializing"
              ? "初期化中..."
              : cameraStatus === "error"
              ? "エラー"
              : cameraStatus === "permission_denied"
              ? "権限拒否"
              : "無効"}
          </span>

          {/* Hand detection indicator */}
          {cameraStatus === "active" && (
            <div
              className={`w-3 h-3 rounded-full ${
                handsDetected ? "bg-blue-500" : "bg-gray-400"
              }`}
            />
          )}
          {cameraStatus === "active" && (
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {handsDetected ? "手を検出" : "手なし"}
            </span>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            再試行
          </button>
        </div>
      )}

      {/* Camera feed container */}
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ aspectRatio: "4/3" }}
      >
        {/* Video element (hidden) */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-0"
          autoPlay
          muted
          playsInline
        />

        {/* Canvas for MediaPipe visualization */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full object-cover"
        />

        {/* Loading overlay */}
        {cameraStatus === "initializing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>カメラを初期化中...</p>
            </div>
          </div>
        )}

        {/* Permission denied overlay */}
        {cameraStatus === "permission_denied" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-white text-center p-4">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-400"
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
              <p className="mb-2">カメラアクセスが必要です</p>
              <p className="text-sm text-gray-300 mb-4">
                ジェスチャー機能を使用するには、ブラウザでカメラアクセスを許可してください。
              </p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {cameraStatus === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-white text-center p-4">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mb-4">カメラエラーが発生しました</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                再試行
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {cameraStatus === "active" && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 text-center">
          <p>カメラに手をかざしてジェスチャーを行ってください</p>
          {!handsDetected && (
            <p className="text-yellow-600 dark:text-yellow-400 mt-1">
              手が検出されていません
            </p>
          )}
        </div>
      )}
    </div>
  );
};
