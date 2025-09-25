/** @format */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseErrorNotification } from "../DatabaseErrorNotification";
import { GestureFallbackNotification } from "../GestureFallbackNotification";
import { ErrorBoundary } from "../ErrorBoundary";
import { TodoProvider } from "../../contexts/TodoContext";
import { AppProvider } from "../../contexts/AppContext";

// Mock the contexts
const mockTodoContext = {
  errorState: {
    hasError: false,
    errorMessage: null,
    errorType: null,
    canRetry: false,
  },
  clearError: vi.fn(),
  retryLastOperation: vi.fn(),
  attemptDatabaseRecovery: vi.fn(),
  exportData: vi.fn(),
};

const mockAppContext = {
  setGestureEnabled: vi.fn(),
};

vi.mock("../../contexts", () => ({
  useTodo: () => mockTodoContext,
  useApp: () => mockAppContext,
}));

// Mock URL.createObjectURL
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "mock-url"),
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

describe("Error Handling Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("DatabaseErrorNotification", () => {
    it("should not render when there is no error", () => {
      render(<DatabaseErrorNotification />);
      expect(screen.queryByText(/エラー/)).not.toBeInTheDocument();
    });

    it("should render database error with retry option", () => {
      mockTodoContext.errorState = {
        hasError: true,
        errorMessage: "データベース接続エラー",
        errorType: "database",
        canRetry: true,
      };

      render(<DatabaseErrorNotification />);

      expect(screen.getByText("データベースエラー")).toBeInTheDocument();
      expect(screen.getByText("データベース接続エラー")).toBeInTheDocument();
      expect(screen.getByText("再試行")).toBeInTheDocument();
      expect(screen.getByText("データベース復旧")).toBeInTheDocument();
      expect(screen.getByText("バックアップ作成")).toBeInTheDocument();
    });

    it("should render quota error with export option", () => {
      mockTodoContext.errorState = {
        hasError: true,
        errorMessage: "ストレージ容量不足",
        errorType: "quota",
        canRetry: false,
      };

      render(<DatabaseErrorNotification />);

      expect(screen.getByText("ストレージ容量不足")).toBeInTheDocument();
      expect(screen.getByText("データをエクスポート")).toBeInTheDocument();
      expect(screen.queryByText("再試行")).not.toBeInTheDocument();
    });

    it("should handle retry operation", async () => {
      mockTodoContext.errorState = {
        hasError: true,
        errorMessage: "操作エラー",
        errorType: "operation",
        canRetry: true,
      };

      render(<DatabaseErrorNotification />);

      const retryButton = screen.getByText("再試行");
      fireEvent.click(retryButton);

      expect(mockTodoContext.retryLastOperation).toHaveBeenCalledOnce();
    });

    it("should handle database recovery", async () => {
      mockTodoContext.errorState = {
        hasError: true,
        errorMessage: "データベースエラー",
        errorType: "database",
        canRetry: true,
      };

      mockTodoContext.attemptDatabaseRecovery.mockResolvedValue(true);

      render(<DatabaseErrorNotification />);

      const recoveryButton = screen.getByText("データベース復旧");
      fireEvent.click(recoveryButton);

      expect(screen.getByText("復旧中...")).toBeInTheDocument();

      await waitFor(() => {
        expect(mockTodoContext.attemptDatabaseRecovery).toHaveBeenCalledOnce();
      });
    });

    it("should handle data export", async () => {
      mockTodoContext.errorState = {
        hasError: true,
        errorMessage: "ストレージ容量不足",
        errorType: "quota",
        canRetry: false,
      };

      mockTodoContext.exportData.mockResolvedValue({
        tasks: [
          {
            id: "1",
            text: "Test task",
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        settings: {},
      });

      // Mock document methods
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      const mockClick = vi.fn();
      const mockCreateElement = vi.fn(() => ({
        href: "",
        download: "",
        click: mockClick,
      }));

      Object.defineProperty(document, "createElement", {
        writable: true,
        value: mockCreateElement,
      });

      Object.defineProperty(document.body, "appendChild", {
        writable: true,
        value: mockAppendChild,
      });

      Object.defineProperty(document.body, "removeChild", {
        writable: true,
        value: mockRemoveChild,
      });

      render(<DatabaseErrorNotification />);

      const exportButton = screen.getByText("データをエクスポート");
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockTodoContext.exportData).toHaveBeenCalledOnce();
      });
    });
  });

  describe("GestureFallbackNotification", () => {
    const defaultProps = {
      cameraStatus: "error" as const,
      gestureError: null,
      fallbackMode: false,
      onRetryCamera: vi.fn(),
      onEnableTraditionalMode: vi.fn(),
    };

    it("should not render when camera is active", () => {
      render(
        <GestureFallbackNotification {...defaultProps} cameraStatus="active" />
      );
      expect(screen.queryByText(/ジェスチャー/)).not.toBeInTheDocument();
    });

    it("should render permission denied notification", () => {
      render(
        <GestureFallbackNotification
          {...defaultProps}
          cameraStatus="permission_denied"
        />
      );

      expect(
        screen.getByText("カメラアクセスが拒否されました")
      ).toBeInTheDocument();
      expect(screen.getByText("許可方法を見る")).toBeInTheDocument();
      expect(screen.getByText("再試行")).toBeInTheDocument();
      expect(screen.getByText("従来操作を使用")).toBeInTheDocument();
    });

    it("should show permission guide when requested", () => {
      render(
        <GestureFallbackNotification
          {...defaultProps}
          cameraStatus="permission_denied"
        />
      );

      const guideButton = screen.getByText("許可方法を見る");
      fireEvent.click(guideButton);

      expect(
        screen.getByText("カメラアクセスを許可する方法:")
      ).toBeInTheDocument();
      expect(screen.getByText(/ブラウザのアドレスバー/)).toBeInTheDocument();
    });

    it("should render error notification", () => {
      render(
        <GestureFallbackNotification
          {...defaultProps}
          cameraStatus="error"
          gestureError="MediaPipe initialization failed"
        />
      );

      expect(
        screen.getByText("ジェスチャー機能でエラーが発生")
      ).toBeInTheDocument();
      expect(
        screen.getByText("MediaPipe initialization failed")
      ).toBeInTheDocument();
    });

    it("should render fallback mode notification", () => {
      render(
        <GestureFallbackNotification
          {...defaultProps}
          cameraStatus="error"
          fallbackMode={true}
        />
      );

      expect(
        screen.getByText("従来操作モードに切り替えました")
      ).toBeInTheDocument();
      expect(screen.getByText("従来操作モード")).toBeInTheDocument();
      expect(screen.getByText(/マウスとキーボード/)).toBeInTheDocument();
    });

    it("should handle retry camera", () => {
      const onRetryCamera = vi.fn();
      render(
        <GestureFallbackNotification
          {...defaultProps}
          cameraStatus="permission_denied"
          onRetryCamera={onRetryCamera}
        />
      );

      const retryButton = screen.getByText("再試行");
      fireEvent.click(retryButton);

      expect(onRetryCamera).toHaveBeenCalledOnce();
    });

    it("should handle enable traditional mode", async () => {
      const onEnableTraditionalMode = vi.fn();
      render(
        <GestureFallbackNotification
          {...defaultProps}
          cameraStatus="error"
          onEnableTraditionalMode={onEnableTraditionalMode}
        />
      );

      const traditionalButton = screen.getByText("従来操作を使用");
      fireEvent.click(traditionalButton);

      expect(mockAppContext.setGestureEnabled).toHaveBeenCalledWith(false);
      expect(onEnableTraditionalMode).toHaveBeenCalledOnce();
    });

    it("should render initializing state", () => {
      render(
        <GestureFallbackNotification
          {...defaultProps}
          cameraStatus="initializing"
        />
      );

      expect(
        screen.getByText("ジェスチャー機能を初期化中")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/カメラとジェスチャー認識を準備/)
      ).toBeInTheDocument();
    });
  });

  describe("ErrorBoundary", () => {
    // Component that throws an error
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div>No error</div>;
    };

    it("should render children when there is no error", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("No error")).toBeInTheDocument();
    });

    it("should render error UI when there is an error", () => {
      // Suppress console.error for this test
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
      expect(
        screen.getByText(/予期しないエラーが発生しました/)
      ).toBeInTheDocument();
      expect(screen.getByText("再試行")).toBeInTheDocument();
      expect(screen.getByText("ページ再読み込み")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("should handle retry", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();

      const retryButton = screen.getByText("再試行");
      fireEvent.click(retryButton);

      // Re-render with no error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText("No error")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("should render custom fallback", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Custom error UI")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});
