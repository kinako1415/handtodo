/** @format */

import React from "react";
import { Task } from "../types";

interface TodoListProps {
  tasks: Task[];
  selectedTaskIndex: number;
  onTaskSelect: (index: number) => void;
  onTaskToggle: (id: string) => void;
  onTaskDelete: (id: string) => void;
}

export const TodoList: React.FC<TodoListProps> = ({
  tasks: _tasks,
  selectedTaskIndex: _selectedTaskIndex,
  onTaskSelect: _onTaskSelect,
  onTaskToggle: _onTaskToggle,
  onTaskDelete: _onTaskDelete,
}) => {
  return (
    <div className="space-y-2">
      {/* TodoList component - to be implemented in task 4 */}
      <p className="text-gray-500 text-center">
        TodoList component placeholder
      </p>
    </div>
  );
};
