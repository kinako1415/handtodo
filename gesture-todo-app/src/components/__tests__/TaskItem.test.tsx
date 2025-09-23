/** @format */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskItem } from "../TaskItem";
import { Task } from "../../types";

const mockTask: Task = {
  id: "1",
  text: "Test task",
  completed: false,
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

describe("TaskItem", () => {
  const defaultProps = {
    task: mockTask,
    isSelected: false,
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onSelect: vi.fn(),
    onEdit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render task text", () => {
    render(<TaskItem {...defaultProps} />);
    expect(screen.getByText("Test task")).toBeInTheDocument();
  });

  it("should show selected state", () => {
    render(<TaskItem {...defaultProps} isSelected={true} />);
    // Find the outermost div which should have the border-blue-500 class
    const container = screen
      .getByText("Test task")
      .closest('[class*="border-blue-500"]');
    expect(container).toBeInTheDocument();
    expect(container).toHaveClass("border-blue-500");
  });

  it("should show completed state", () => {
    const completedTask = { ...mockTask, completed: true };
    render(<TaskItem {...defaultProps} task={completedTask} />);

    const taskText = screen.getByText("Test task");
    expect(taskText).toHaveClass("line-through");
  });

  it("should handle task selection", () => {
    render(<TaskItem {...defaultProps} />);

    const taskElement = screen.getByText("Test task").closest("div");
    fireEvent.click(taskElement!);

    expect(defaultProps.onSelect).toHaveBeenCalled();
  });

  it("should handle task toggle", () => {
    render(<TaskItem {...defaultProps} />);

    // Find the checkbox button (it has no accessible name, so we'll find it by class)
    const checkboxes = screen.getAllByRole("button");
    const checkbox = checkboxes.find((btn) =>
      btn.className.includes("w-5 h-5")
    );

    fireEvent.click(checkbox!);

    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it("should handle task deletion", async () => {
    render(<TaskItem {...defaultProps} />);

    // Hover to show action buttons
    const taskElement = screen.getByText("Test task").closest("div");
    fireEvent.mouseEnter(taskElement!);

    await waitFor(() => {
      const deleteButton = screen.getByTitle("Delete");
      fireEvent.click(deleteButton);
      expect(defaultProps.onDelete).toHaveBeenCalled();
    });
  });

  it("should handle task editing", async () => {
    render(<TaskItem {...defaultProps} />);

    // Hover to show action buttons
    const taskElement = screen.getByText("Test task").closest("div");
    fireEvent.mouseEnter(taskElement!);

    await waitFor(() => {
      const editButton = screen.getByTitle("Edit");
      fireEvent.click(editButton);
    });

    // Should show input field
    const input = screen.getByDisplayValue("Test task");
    expect(input).toBeInTheDocument();

    // Edit the text
    fireEvent.change(input, { target: { value: "Updated task" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onEdit).toHaveBeenCalledWith("1", "Updated task");
  });

  it("should handle escape key to cancel editing", async () => {
    render(<TaskItem {...defaultProps} />);

    // Start editing
    const taskElement = screen.getByText("Test task").closest("div");
    fireEvent.mouseEnter(taskElement!);

    await waitFor(() => {
      const editButton = screen.getByTitle("Edit");
      fireEvent.click(editButton);
    });

    const input = screen.getByDisplayValue("Test task");
    fireEvent.change(input, { target: { value: "Updated task" } });
    fireEvent.keyDown(input, { key: "Escape" });

    // Should revert to original text
    expect(screen.getByText("Test task")).toBeInTheDocument();
    expect(defaultProps.onEdit).not.toHaveBeenCalled();
  });

  it("should show creation and update dates", () => {
    const taskWithDifferentDates = {
      ...mockTask,
      updatedAt: new Date("2023-01-02"),
    };

    render(<TaskItem {...defaultProps} task={taskWithDifferentDates} />);

    expect(screen.getByText(/Created: 1\/1\/2023/)).toBeInTheDocument();
    expect(screen.getByText(/Updated: 1\/2\/2023/)).toBeInTheDocument();
  });
});
