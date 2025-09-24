/** @format */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GestureIndicator } from "../GestureIndicator";
import { GestureType } from "../../types";

describe("GestureIndicator", () => {
  it("renders without crashing", () => {
    render(<GestureIndicator currentGesture={null} isHandDetected={false} />);
    expect(screen.getByText("ジェスチャー状態")).toBeInTheDocument();
  });

  it("shows hand detection status correctly", () => {
    const { rerender } = render(
      <GestureIndicator currentGesture={null} isHandDetected={false} />
    );

    // When hand is not detected
    expect(screen.getByText("❌ 手が検出されていません")).toBeInTheDocument();

    // When hand is detected
    rerender(<GestureIndicator currentGesture={null} isHandDetected={true} />);
    expect(screen.getByText("✅ 手が検出されています")).toBeInTheDocument();
  });

  it("displays current gesture information", () => {
    render(
      <GestureIndicator currentGesture="thumbs_up" isHandDetected={true} />
    );

    expect(screen.getByText("親指立て")).toBeInTheDocument();
    expect(screen.getByText("新しいタスクを追加")).toBeInTheDocument();
    expect(screen.getByText("👍")).toBeInTheDocument();
  });

  it("shows 'no gesture' state when gesture is none", () => {
    render(<GestureIndicator currentGesture="none" isHandDetected={true} />);

    expect(screen.getByText("ジェスチャーなし")).toBeInTheDocument();
    expect(
      screen.getByText("手のジェスチャーを行ってください")
    ).toBeInTheDocument();
  });

  it("shows 'no gesture' state when gesture is null", () => {
    render(<GestureIndicator currentGesture={null} isHandDetected={true} />);

    expect(screen.getByText("ジェスチャーなし")).toBeInTheDocument();
    expect(
      screen.getByText("手のジェスチャーを行ってください")
    ).toBeInTheDocument();
  });

  it("toggles gesture guide visibility", () => {
    render(<GestureIndicator currentGesture={null} isHandDetected={false} />);

    // Guide should be hidden initially
    expect(screen.queryByText("ジェスチャーガイド")).not.toBeInTheDocument();

    // Click to show guide
    fireEvent.click(screen.getByText("ガイドを表示"));
    expect(screen.getByText("ジェスチャーガイド")).toBeInTheDocument();

    // Click to hide guide
    fireEvent.click(screen.getByText("ガイドを隠す"));
    expect(screen.queryByText("ジェスチャーガイド")).not.toBeInTheDocument();
  });

  it("shows guide by default when showGuide prop is true", () => {
    render(
      <GestureIndicator
        currentGesture={null}
        isHandDetected={false}
        showGuide={true}
      />
    );

    expect(screen.getByText("ジェスチャーガイド")).toBeInTheDocument();
  });

  it("displays all gesture types in the guide", () => {
    render(
      <GestureIndicator
        currentGesture={null}
        isHandDetected={false}
        showGuide={true}
      />
    );

    // Check that all gesture types are displayed
    expect(screen.getByText("親指立て")).toBeInTheDocument();
    expect(screen.getByText("ピースサイン")).toBeInTheDocument();
    expect(screen.getByText("握りこぶし")).toBeInTheDocument();
    expect(screen.getByText("人差し指立て")).toBeInTheDocument();
    expect(screen.getByText("2本指立て")).toBeInTheDocument();
    expect(screen.getByText("開いた手のひら")).toBeInTheDocument();
  });

  it("highlights current gesture in the guide", () => {
    const { container } = render(
      <GestureIndicator
        currentGesture="peace_sign"
        isHandDetected={true}
        showGuide={true}
      />
    );

    // Check if there's an element with the highlighting classes
    const highlightedElement = container.querySelector(".bg-blue-50");
    expect(highlightedElement).toBeInTheDocument();

    // Verify it contains the peace sign gesture
    expect(highlightedElement).toHaveTextContent("ピースサイン");
  });

  it("shows appropriate help text based on state", () => {
    const { rerender } = render(
      <GestureIndicator currentGesture={null} isHandDetected={false} />
    );

    // When hand is not detected
    expect(
      screen.getByText("カメラに手をかざしてジェスチャーを行ってください")
    ).toBeInTheDocument();

    // When hand is detected but no gesture
    rerender(<GestureIndicator currentGesture="none" isHandDetected={true} />);
    expect(
      screen.getByText("ジェスチャーを行うとタスクを操作できます")
    ).toBeInTheDocument();

    // When gesture is recognized
    rerender(
      <GestureIndicator currentGesture="thumbs_up" isHandDetected={true} />
    );
    expect(
      screen.getByText("ジェスチャーが認識されました！")
    ).toBeInTheDocument();
  });

  it("displays correct gesture information for each gesture type", () => {
    const gestureTests: Array<{
      gesture: GestureType;
      name: string;
      action: string;
      icon: string;
    }> = [
      {
        gesture: "thumbs_up",
        name: "親指立て",
        action: "新しいタスクを追加",
        icon: "👍",
      },
      {
        gesture: "peace_sign",
        name: "ピースサイン",
        action: "タスクを完了にする",
        icon: "✌️",
      },
      {
        gesture: "fist",
        name: "握りこぶし",
        action: "タスクを削除",
        icon: "✊",
      },
      {
        gesture: "point_up",
        name: "人差し指立て",
        action: "上のタスクを選択",
        icon: "☝️",
      },
      {
        gesture: "two_fingers",
        name: "2本指立て",
        action: "下のタスクを選択",
        icon: "✌️",
      },
      {
        gesture: "open_palm",
        name: "開いた手のひら",
        action: "操作をキャンセル",
        icon: "🖐️",
      },
    ];

    gestureTests.forEach(({ gesture, name, action, icon }) => {
      const { rerender } = render(
        <GestureIndicator currentGesture={gesture} isHandDetected={true} />
      );

      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText(action)).toBeInTheDocument();
      expect(screen.getByText(icon)).toBeInTheDocument();

      rerender(
        <GestureIndicator currentGesture={null} isHandDetected={false} />
      );
    });
  });
});
