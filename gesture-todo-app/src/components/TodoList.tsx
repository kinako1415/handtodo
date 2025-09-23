/** @format */

import React, { useState } from "react";
import { Task } from "../types";
import { TaskItem } from "./TaskItem";

interface TodoListProps {
  tasks: Task[];
  selectedTaskIndex: number;
  onTaskSelect: (index: number) => void;
  onTaskToggle: (id: string) => void;
  onTaskDelete: (id: string) => void;
  onTaskEdit?: (id: string, newText: string) => void;
  onTaskAdd?: (text: string) => void;
}

export const TodoList: React.FC<TodoListProps> = ({
  tasks,
  selectedTaskIndex,
  onTaskSelect,
  onTaskToggle,
  onTaskDelete,
  onTaskEdit,
  onTaskAdd,
}) => {
  const [newTaskText, setNewTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleAddTask = () => {
    if (newTaskText.trim() && onTaskAdd) {
      onTaskAdd(newTaskText.trim());
      setNewTaskText("");
      setIsAddingTask(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTask();
    } else if (e.key === "Escape") {
      setNewTaskText("");
      setIsAddingTask(false);
    }
  };

  const completedTasks = tasks.filter((task) => task.completed);
  const incompleteTasks = tasks.filter((task) => !task.completed);

  return (
    <div className="space-y-6">
      {/* Add new task section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-4">
        <div className="flex items-center space-x-3">
          {isAddingTask ? (
            <>
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter a new task..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskText.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskText("");
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAddingTask(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Add New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No tasks yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Add your first task to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Incomplete tasks */}
          {incompleteTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Active Tasks ({incompleteTasks.length})
              </h3>
              <div className="space-y-2">
                {incompleteTasks.map((task, index) => {
                  const originalIndex = tasks.findIndex(
                    (t) => t.id === task.id
                  );
                  return (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isSelected={selectedTaskIndex === originalIndex}
                      onToggle={() => onTaskToggle(task.id)}
                      onDelete={() => onTaskDelete(task.id)}
                      onSelect={() => onTaskSelect(originalIndex)}
                      onEdit={onTaskEdit}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Completed Tasks ({completedTasks.length})
              </h3>
              <div className="space-y-2">
                {completedTasks.map((task, index) => {
                  const originalIndex = tasks.findIndex(
                    (t) => t.id === task.id
                  );
                  return (
                    <TaskItem
                      key={task.id}
                      task={task}
                      isSelected={selectedTaskIndex === originalIndex}
                      onToggle={() => onTaskToggle(task.id)}
                      onDelete={() => onTaskDelete(task.id)}
                      onSelect={() => onTaskSelect(originalIndex)}
                      onEdit={onTaskEdit}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task summary */}
      {tasks.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              Total: {tasks.length} tasks
            </span>
            <div className="flex items-center space-x-4">
              <span className="text-blue-600 dark:text-blue-400">
                Active: {incompleteTasks.length}
              </span>
              <span className="text-green-600 dark:text-green-400">
                Completed: {completedTasks.length}
              </span>
            </div>
          </div>
          {tasks.length > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(completedTasks.length / tasks.length) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                {Math.round((completedTasks.length / tasks.length) * 100)}%
                completed
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
