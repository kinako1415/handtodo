/** @format */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { TodoProvider, useTodo } from "../TodoContext";
import { Task } from "../../types";
import { vi } from "vitest";

// Mock the database
vi.mock("../../services/database", () => ({
  IndexedDBTodoDatabase: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getAllTasks: vi.fn().mockResolvedValue([]),
    addTask: vi
      .fn()
      .mockImplementation((task) => Promise.resolve(`task-${Date.now()}`)),
    updateTask: vi.fn().mockResolvedValue(undefined),
    deleteTask: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Test component that uses the context
function TestComponent() {
  const {
    state,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    moveSelection,
    setSelectedTask,
    setGestureMode,
    setCameraStatus,
    setCurrentGesture,
  } = useTodo();

  return (
    <div>
      <div data-testid="task-count">{state.tasks.length}</div>
      <div data-testid="selected-index">{state.selectedTaskIndex}</div>
      <div data-testid="gesture-mode">{state.isGestureMode.toString()}</div>
      <div data-testid="camera-status">{state.cameraStatus}</div>
      <div data-testid="current-gesture">{state.currentGesture || "none"}</div>

      <button onClick={() => addTask("Test Task")}>Add Task</button>
      <button onClick={() => setGestureMode(true)}>Enable Gesture</button>
      <button onClick={() => setCameraStatus("active")}>
        Set Camera Active
      </button>
      <button onClick={() => setCurrentGesture("thumbs_up")}>
        Set Gesture
      </button>
      <button onClick={() => moveSelection("down")}>Move Down</button>
      <button onClick={() => setSelectedTask(0)}>Select First</button>

      {state.tasks.map((task, index) => (
        <div key={task.id} data-testid={`task-${index}`}>
          <span>{task.text}</span>
          <span data-testid={`task-${index}-completed`}>
            {task.completed.toString()}
          </span>
          <button onClick={() => toggleTaskCompletion(task.id)}>Toggle</button>
          <button onClick={() => updateTask(task.id, { text: "Updated" })}>
            Update
          </button>
          <button onClick={() => deleteTask(task.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

function renderWithProvider() {
  return render(
    <TodoProvider>
      <TestComponent />
    </TodoProvider>
  );
}

describe("TodoContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should provide initial state", () => {
    renderWithProvider();

    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
    expect(screen.getByTestId("selected-index")).toHaveTextContent("-1");
    expect(screen.getByTestId("gesture-mode")).toHaveTextContent("false");
    expect(screen.getByTestId("camera-status")).toHaveTextContent("disabled");
    expect(screen.getByTestId("current-gesture")).toHaveTextContent("none");
  });

  it("should add a task", async () => {
    renderWithProvider();

    const addButton = screen.getByText("Add Task");

    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-count")).toHaveTextContent("1");
    });

    expect(screen.getByTestId("task-0")).toBeInTheDocument();
    expect(screen.getByText("Test Task")).toBeInTheDocument();
  });

  it("should update gesture mode", async () => {
    renderWithProvider();

    const enableButton = screen.getByText("Enable Gesture");

    await act(async () => {
      enableButton.click();
    });

    expect(screen.getByTestId("gesture-mode")).toHaveTextContent("true");
  });

  it("should update camera status", async () => {
    renderWithProvider();

    const cameraButton = screen.getByText("Set Camera Active");

    await act(async () => {
      cameraButton.click();
    });

    expect(screen.getByTestId("camera-status")).toHaveTextContent("active");
  });

  it("should update current gesture", async () => {
    renderWithProvider();

    const gestureButton = screen.getByText("Set Gesture");

    await act(async () => {
      gestureButton.click();
    });

    expect(screen.getByTestId("current-gesture")).toHaveTextContent(
      "thumbs_up"
    );
  });

  it("should handle task selection", async () => {
    renderWithProvider();

    // Add a task first
    const addButton = screen.getByText("Add Task");
    await act(async () => {
      addButton.click();
    });

    // Select the task
    const selectButton = screen.getByText("Select First");
    await act(async () => {
      selectButton.click();
    });

    expect(screen.getByTestId("selected-index")).toHaveTextContent("0");
  });

  it("should handle task completion toggle", async () => {
    renderWithProvider();

    // Add a task first
    const addButton = screen.getByText("Add Task");
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-0-completed")).toHaveTextContent("false");
    });

    // Toggle completion
    const toggleButton = screen.getByText("Toggle");
    await act(async () => {
      toggleButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-0-completed")).toHaveTextContent("true");
    });
  });

  it("should handle task deletion", async () => {
    renderWithProvider();

    // Add a task first
    const addButton = screen.getByText("Add Task");
    await act(async () => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-count")).toHaveTextContent("1");
    });

    // Delete the task
    const deleteButton = screen.getByText("Delete");
    await act(async () => {
      deleteButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-count")).toHaveTextContent("0");
    });
  });

  it("should handle selection movement", async () => {
    renderWithProvider();

    // Add multiple tasks
    const addButton = screen.getByText("Add Task");
    await act(async () => {
      addButton.click();
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("task-count")).toHaveTextContent("2");
    });

    // Select first task
    const selectButton = screen.getByText("Select First");
    await act(async () => {
      selectButton.click();
    });

    expect(screen.getByTestId("selected-index")).toHaveTextContent("0");

    // Move selection down
    const moveButton = screen.getByText("Move Down");
    await act(async () => {
      moveButton.click();
    });

    expect(screen.getByTestId("selected-index")).toHaveTextContent("1");
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useTodo must be used within a TodoProvider");

    consoleSpy.mockRestore();
  });
});
