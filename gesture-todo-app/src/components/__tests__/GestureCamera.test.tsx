/** @format */

import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { GestureCamera } from "../GestureCamera";

// Mock MediaPipe modules
vi.mock("@mediapipe/hands", () => ({
  Hands: vi.fn().mockImplementation(() => ({
    setOptions: vi.fn(),
    onResults: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  })),
  HAND_CONNECTIONS: [],
}));

vi.mock("@mediapipe/camera_utils", () => ({
  Camera: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock("@mediapipe/drawing_utils", () => ({
  drawConnectors: vi.fn(),
  drawLandmarks: vi.fn(),
}));

describe("GestureCamera", () => {
  const mockOnGestureDetected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render disabled state when not enabled", () => {
    render(
      <GestureCamera
        onGestureDetected={mockOnGestureDetected}
        isEnabled={false}
      />
    );

    expect(screen.getByText("ジェスチャー機能は無効です")).toBeInTheDocument();
  });

  it("should render camera interface when enabled", () => {
    render(
      <GestureCamera
        onGestureDetected={mockOnGestureDetected}
        isEnabled={true}
      />
    );

    expect(screen.getByText("ジェスチャーカメラ")).toBeInTheDocument();
    expect(screen.getByText("初期化中...")).toBeInTheDocument();
  });

  it("should show camera status indicators", () => {
    render(
      <GestureCamera
        onGestureDetected={mockOnGestureDetected}
        isEnabled={true}
      />
    );

    // Should show initializing status
    expect(screen.getByText("初期化中...")).toBeInTheDocument();
  });

  it("should have video and canvas elements", () => {
    render(
      <GestureCamera
        onGestureDetected={mockOnGestureDetected}
        isEnabled={true}
      />
    );

    const video = document.querySelector("video");
    const canvas = document.querySelector("canvas");

    expect(video).toBeInTheDocument();
    expect(canvas).toBeInTheDocument();
  });
});
