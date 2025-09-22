/** @format */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Providers } from "../Providers";
import { useTodo, useApp } from "../index";
import { vi } from "vitest";

// Mock the database
vi.mock("../../services/database", () => ({
  IndexedDBTodoDatabase: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getAllTasks: vi.fn().mockResolvedValue([]),
    addTask: vi.fn().mockResolvedValue("test-id"),
    updateTask: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn().mockResolvedValue(undefined),
    getSetting: vi.fn().mockResolvedValue(undefined),
    setSetting: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Simple test component
function TestApp() {
  const { state: todoState } = useTodo();
  const { state: appState } = useApp();

  return (
    <div>
      <div data-testid="app-initialized">
        {appState.isInitialized.toString()}
      </div>
      <div data-testid="todo-tasks-count">{todoState.tasks.length}</div>
      <div data-testid="app-theme">{appState.theme}</div>
    </div>
  );
}

describe("State Management Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize both contexts successfully", async () => {
    render(
      <Providers>
        <TestApp />
      </Providers>
    );

    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByTestId("app-initialized")).toHaveTextContent("true");
    });

    // Check initial states
    expect(screen.getByTestId("todo-tasks-count")).toHaveTextContent("0");
    expect(screen.getByTestId("app-theme")).toHaveTextContent("light");
  });

  it("should render without crashing", () => {
    const { container } = render(
      <Providers>
        <div>Test Content</div>
      </Providers>
    );

    expect(container).toBeInTheDocument();
  });
});
