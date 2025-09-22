/** @format */

import React from "react";
import { GestureType } from "../types";

interface GestureCameraProps {
  onGestureDetected: (gesture: GestureType) => void;
  isEnabled: boolean;
}

export const GestureCamera: React.FC<GestureCameraProps> = ({
  onGestureDetected: _onGestureDetected,
  isEnabled: _isEnabled,
}) => {
  return (
    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4">
      {/* GestureCamera component - to be implemented in task 5 */}
      <p className="text-gray-500 text-center">
        GestureCamera component placeholder
      </p>
    </div>
  );
};
