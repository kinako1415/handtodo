/** @format */

import React from "react";
import { GestureType } from "../types";

interface GestureIndicatorProps {
  currentGesture: GestureType | null;
  isHandDetected: boolean;
}

export const GestureIndicator: React.FC<GestureIndicatorProps> = ({
  currentGesture: _currentGesture,
  isHandDetected: _isHandDetected,
}) => {
  return (
    <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4">
      {/* GestureIndicator component - to be implemented in task 8 */}
      <p className="text-gray-500 text-center">
        GestureIndicator component placeholder
      </p>
    </div>
  );
};
