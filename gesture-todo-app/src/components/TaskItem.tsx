/** @format */

import React from "react";
import { Task } from "../types";

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task: _task,
  isSelected: _isSelected,
  onToggle: _onToggle,
  onDelete: _onDelete,
  onSelect: _onSelect,
}) => {
  return (
    <div className="p-2 border rounded">
      {/* TaskItem component - to be implemented in task 4 */}
      <p className="text-gray-500">TaskItem component placeholder</p>
    </div>
  );
};
