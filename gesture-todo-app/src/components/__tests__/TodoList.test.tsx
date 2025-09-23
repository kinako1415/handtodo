/** @format */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TodoList } from "../TodoList";
import { Task } from "../../types";

// Mock tasks for testing
const mockTasks: Task[] = [
  {
    id: "1",
    text: "Test task 1",
    completed: false,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  },
  {
    id: "2",
    text: "Test task 2",
    completed: true,
    createdAt: new Date("2023-01-02"),
    updatedAt: new Date("2023-01-02"),
  },
];

describe("TodoList", () => {
  const defaultProps = {
    tasks: mockTasks,
    selectedTaskIndex: 0,
    onTaskSelect: vi.fn(),
    onTaskToggle: vi.fn(),
    onTaskDelete: vi.fn(),
    onTaskEdit: vi.fn(),
    onTaskAdd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render tasks correctly", () => {
    render(<TodoList {...defaultProps} />);

    expect(screen.getByText("Test task 1")).toBeInTheDocument();
    expect(screen.getByText("Test task 2")).toBeInTheDocument();
  });

  it("should show empty state when no tasks", () => {
    render(<TodoList {...defaultProps} tasks={[]} />);

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first task to get started!")
    ).toBeInTheDocument();
  });

  it("should separate completed and incomplete tasks", () => {
    render(<TodoList {...defaultProps} />);

    expect(screen.getByText("Active Tasks (1)")).toBeInTheDocument();
    expect(screen.getByText("Completed Tasks (1)")).toBeInTheDocument();
  });

  it("should show add task button", () => {
    render(<TodoList {...defaultProps} />);

    expect(screen.getByText("Add New Task")).toBeInTheDocument();
  });

  it("should handle adding new task", async () => {
    render(<TodoList {...defaultProps} />);

    // Click add task button
    fireEvent.click(screen.getByText("Add New Task"));

    // Input should appear
    const input = screen.getByPlaceholderText("Enter a new task...");
    expect(input).toBeInTheDocument();

    // Type task text
    fireEvent.change(input, { target: { value: "New task" } });

    // Click add button
    fireEvent.click(screen.getByText("Add"));

    await waitFor(() => {
      expect(defaultProps.onTaskAdd).toHaveBeenCalledWith("New task");
    });
  });

  it("should show task summary", () => {
    render(<TodoList {...defaultProps} />);

    expect(screen.getByText("Total: 2 tasks")).toBeInTheDocument();
    expect(screen.getByText("Active: 1")).toBeInTheDocument();
    expect(screen.getByText("Completed: 1")).toBeInTheDocument();
    expect(screen.getByText("50% completed")).toBeInTheDocument();
  });

  it("should handle keyboard shortcuts for adding task", async () => {
    render(<TodoList {...defaultProps} />);

    // Click add task button
    fireEvent.click(screen.getByText("Add New Task"));

    const input = screen.getByPlaceholderText("Enter a new task...");
    fireEvent.change(input, { target: { value: "New task" } });

    // Press Enter
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(defaultProps.onTaskAdd).toHaveBeenCalledWith("New task");
    });
  });

  it("should handle escape key to cancel adding task", () => {
    render(<TodoList {...defaultProps} />);

    // Click add task button
    fireEvent.click(screen.getByText("Add New Task"));

    const input = screen.getByPlaceholderText("Enter a new task...");
    fireEvent.change(input, { target: { value: "New task" } });

    // Press Escape
    fireEvent.keyDown(input, { key: "Escape" });

    // Input should be gone
    expect(
      screen.queryByPlaceholderText("Enter a new task...")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Add New Task")).toBeInTheDocument();
  });
});
