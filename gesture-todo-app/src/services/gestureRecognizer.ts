/** @format */

import { GestureType } from "../types";

// Gesture recognition service - to be implemented in task 6
export class GestureRecognizer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly onGestureDetected: (gesture: GestureType) => void;

  constructor(onGestureDetected: (gesture: GestureType) => void) {
    this.onGestureDetected = onGestureDetected;
  }

  async initialize(_videoElement: HTMLVideoElement): Promise<void> {
    // MediaPipe Hands initialization - to be implemented
    console.log("GestureRecognizer initialization placeholder");
  }

  processFrame(): void {
    // Frame processing - to be implemented
    console.log("Frame processing placeholder");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private classifyGesture(_landmarks: any[]): GestureType {
    // Gesture classification logic - to be implemented
    return "none";
  }

  dispose(): void {
    // Cleanup - to be implemented
    console.log("GestureRecognizer disposal placeholder");
  }
}
