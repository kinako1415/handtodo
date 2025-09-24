/** @format */

import React from "react";
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { GestureManager } from "../GestureManager";
import { TodoProvider } from "../../contexts/TodoContext";
import { AppProvider } from "../../contexts/AppContext";
import { GestureRecognizer } from "../../services/gestureRecognizer";

// Mock the GestureRecognizer
vi.mock("../../services/gestureRecognizer", () => ({
  GestureRecognizer: vi.fn(),
}));

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: vi.fn().mockImplementation(() => ({
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue("test-id"),
          get: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
          getAll: vi.fn().mockReturnValue({ result: [] }),
        }),
      }),
    },
    onsuccess: null,
    onerror: null,
  })),
};

Object.defineProperty(window, "indexedDB", {
  value: mockIndexedDB,
  writable: true,
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>
    <TodoProvider>{children}</TodoProvider>
  </AppProvider>
);

describe("Gesture Integration", () => {
  let mockVideoElement: HTMLVideoElement;
  let mockGestureRecognizer: any;
  let gestureCallback: ((gesture: any) => void) | null = null;

  beforeEach(() => {
    // Create a mock video element
    mockVideoElement = document.createElement("video") as HTMLVideoElement;

    // Reset the mock
    mockGestureRecognizer = {
      initialize: vi.fn().mockImplementation(() => {
        // Capture the callback passed to GestureRecognizer
        const recognizerInstance = (GestureRecognizer as any).mock.calls[0];
        if (recognizerInstance) {
          gestureCallback = recognizerInstance[0];
        }
        return Promise.resolve();
      }),
      processFrame: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
      getStats: vi.fn().mockReturnValue({
        lastGesture: "none",
        confidence: 0,
        frameCount: 0,
        historyLength: 0,
      }),
    };

    (GestureRecognizer as any).mockImplementation(() => mockGestureRecognizer);
  });

  afterEach(() => {
    vi.clearAllMocks();
    gestureCallback = null;
  });

  it("integrates gesture detection with todo operations", async () => {
    render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(mockGestureRecognizer.initialize).toHaveBeenCalled();
    });

    // Simulate thumbs up gesture to add task
    if (gestureCallback) {
      act(() => {
        gestureCallback("thumbs_up");
      });

      await waitFor(() => {
        expect(
          screen.getByText("新しいタスクを追加します")
        ).toBeInTheDocument();
        expect(
          screen.getByPlaceholderText("タスクの内容を入力...")
        ).toBeInTheDocument();
      });

      // Add a task through the dialog
      const input = screen.getByPlaceholderText("タスクの内容を入力...");
      fireEvent.change(input, { target: { value: "Test Task" } });

      const addButton = screen.getByText("追加");
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(
          screen.getByText("新しいタスク「Test Task」を追加しました")
        ).toBeInTheDocument();
      });
    }
  });

  it("handles gesture cancellation", async () => {
    render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(mockGestureRecognizer.initialize).toHaveBeenCalled();
    });

    // Simulate thumbs up gesture to open add dialog
    if (gestureCallback) {
      act(() => {
        gestureCallback("thumbs_up");
      });

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("タスクの内容を入力...")
        ).toBeInTheDocument();
      });

      // Simulate open palm gesture to cancel
      act(() => {
        gestureCallback("open_palm");
      });

      await waitFor(() => {
        expect(
          screen.getByText("操作をキャンセルしました")
        ).toBeInTheDocument();
        expect(
          screen.queryByPlaceholderText("タスクの内容を入力...")
        ).not.toBeInTheDocument();
      });
    }
  });

  it("shows appropriate feedback for gestures without tasks", async () => {
    render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(mockGestureRecognizer.initialize).toHaveBeenCalled();
    });

    // Simulate navigation gesture when no tasks exist
    if (gestureCallback) {
      act(() => {
        gestureCallback("point_up");
      });

      await waitFor(() => {
        expect(
          screen.getByText("移動できるタスクがありません")
        ).toBeInTheDocument();
      });
    }
  });

  it("shows gesture guide", async () => {
    render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("ジェスチャーガイド")).toBeInTheDocument();
    });

    // Check that all gesture actions are listed in the guide
    expect(screen.getByText("新しいタスクを追加")).toBeInTheDocument();
    expect(screen.getByText("タスクを完了")).toBeInTheDocument();
    expect(screen.getByText("タスクを削除")).toBeInTheDocument();
    expect(screen.getByText("上に移動")).toBeInTheDocument();
    expect(screen.getByText("下に移動")).toBeInTheDocument();
    expect(screen.getByText("操作をキャンセル")).toBeInTheDocument();
  });
});
