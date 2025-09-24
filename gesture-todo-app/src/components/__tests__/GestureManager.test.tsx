/** @format */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { GestureManager } from "../GestureManager";
import { TodoProvider } from "../../contexts/TodoContext";
import { AppProvider } from "../../contexts/AppContext";
import { GestureRecognizer } from "../../services/gestureRecognizer";

// Mock the GestureRecognizer
vi.mock("../../services/gestureRecognizer", () => ({
  GestureRecognizer: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    processFrame: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      lastGesture: "none",
      confidence: 0,
      frameCount: 0,
      historyLength: 0,
    }),
  })),
}));

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: vi.fn().mockImplementation(() => ({
    result: {
      createObjectStore: vi.fn(),
      transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
          add: vi.fn(),
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

describe("GestureManager", () => {
  let mockVideoElement: HTMLVideoElement;
  let mockGestureRecognizer: any;

  beforeEach(() => {
    // Create a mock video element
    mockVideoElement = document.createElement("video") as HTMLVideoElement;

    // Reset the mock
    mockGestureRecognizer = {
      initialize: vi.fn().mockResolvedValue(undefined),
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
  });

  it("renders nothing when disabled", () => {
    const { container } = render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={false} />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders gesture status indicator when enabled", async () => {
    render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("初期化中...")).toBeInTheDocument();
    });
  });

  it("initializes gesture recognizer when enabled with video element", async () => {
    render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(GestureRecognizer).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          confidenceThreshold: expect.any(Number),
          debounceFrames: expect.any(Number),
          sensitivity: expect.any(Number),
        })
      );
    });

    await waitFor(() => {
      expect(mockGestureRecognizer.initialize).toHaveBeenCalledWith(
        mockVideoElement
      );
    });
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
  });

  it("disposes gesture recognizer when disabled", async () => {
    const { rerender } = render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(mockGestureRecognizer.initialize).toHaveBeenCalled();
    });

    // Disable the component
    rerender(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={false} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGestureRecognizer.dispose).toHaveBeenCalled();
    });
  });

  it("handles gesture detection callback", async () => {
    let gestureCallback: ((gesture: any) => void) | null = null;

    mockGestureRecognizer.initialize = vi.fn().mockImplementation(() => {
      // Capture the callback passed to GestureRecognizer
      const recognizerInstance = (GestureRecognizer as any).mock.calls[0];
      gestureCallback = recognizerInstance[0];
      return Promise.resolve();
    });

    render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGestureRecognizer.initialize).toHaveBeenCalled();
    });

    // Simulate gesture detection
    if (gestureCallback) {
      act(() => {
        gestureCallback("thumbs_up");
      });

      await waitFor(() => {
        expect(
          screen.getByText("新しいタスクを追加します")
        ).toBeInTheDocument();
      });
    }
  });

  it("shows add task dialog when thumbs up gesture is detected", async () => {
    let gestureCallback: ((gesture: any) => void) | null = null;

    const mockRecognizer = {
      initialize: vi.fn().mockImplementation(() => {
        const recognizerInstance = (GestureRecognizer as any).mock.calls[0];
        gestureCallback = recognizerInstance[0];
        return Promise.resolve();
      }),
      processFrame: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    };

    (GestureRecognizer as any).mockImplementation(() => mockRecognizer);

    render(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockRecognizer.initialize).toHaveBeenCalled();
    });

    // Simulate thumbs up gesture
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
    }
  });

  it("handles video element changes", async () => {
    const { rerender } = render(
      <TestWrapper>
        <GestureManager videoElement={null} isEnabled={true} />
      </TestWrapper>
    );

    // Should not initialize without video element
    expect(GestureRecognizer).not.toHaveBeenCalled();

    // Provide video element
    rerender(
      <TestWrapper>
        <GestureManager videoElement={mockVideoElement} isEnabled={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(GestureRecognizer).toHaveBeenCalled();
      expect(mockGestureRecognizer.initialize).toHaveBeenCalledWith(
        mockVideoElement
      );
    });
  });
});
