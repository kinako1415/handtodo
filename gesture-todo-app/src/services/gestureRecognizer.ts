/** @format */

import { Hands, Results, NormalizedLandmark } from "@mediapipe/hands";
import { GestureType } from "../types";

// Gesture recognition service with MediaPipe Hands integration
export class GestureRecognizer {
  private readonly onGestureDetected: (gesture: GestureType) => void;
  private hands: Hands | null = null;
  private isInitialized = false;
  private lastGesture: GestureType = "none";
  private gestureConfidence = 0;
  private readonly confidenceThreshold = 0.7;
  private readonly debounceFrames = 5;
  private frameCount = 0;

  constructor(onGestureDetected: (gesture: GestureType) => void) {
    this.onGestureDetected = onGestureDetected;
  }

  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    try {
      // Initialize MediaPipe Hands
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      // Configure MediaPipe Hands options
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // Set up results callback
      this.hands.onResults(this.onResults.bind(this));

      this.isInitialized = true;
      console.log("GestureRecognizer initialized successfully");
    } catch (error) {
      console.error("Failed to initialize GestureRecognizer:", error);
      throw error;
    }
  }

  private onResults(results: Results): void {
    if (
      !results.multiHandLandmarks ||
      results.multiHandLandmarks.length === 0
    ) {
      // No hands detected
      this.handleGestureDetection("none");
      return;
    }

    // Get the first hand's landmarks
    const landmarks = results.multiHandLandmarks[0];

    // Classify the gesture (basic implementation for task 5)
    // Full gesture classification will be implemented in task 6
    const gesture = this.classifyGesture(landmarks);
    this.handleGestureDetection(gesture);
  }

  private handleGestureDetection(gesture: GestureType): void {
    this.frameCount++;

    if (gesture === this.lastGesture) {
      this.gestureConfidence = Math.min(this.gestureConfidence + 0.1, 1.0);
    } else {
      this.gestureConfidence = 0.1;
      this.lastGesture = gesture;
    }

    // Only trigger callback if gesture is stable and confident
    if (
      this.gestureConfidence >= this.confidenceThreshold &&
      this.frameCount % this.debounceFrames === 0
    ) {
      this.onGestureDetected(gesture);
    }
  }

  async processFrame(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.hands || !this.isInitialized) {
      throw new Error("GestureRecognizer not initialized");
    }

    try {
      await this.hands.send({ image: videoElement });
    } catch (error) {
      console.error("Error processing frame:", error);
      throw error;
    }
  }

  private classifyGesture(landmarks: NormalizedLandmark[]): GestureType {
    // Basic gesture classification - placeholder implementation for task 5
    // Full implementation will be done in task 6

    if (!landmarks || landmarks.length < 21) {
      return "none";
    }

    // For now, just return "none" - actual gesture recognition logic
    // will be implemented in task 6
    return "none";
  }

  dispose(): void {
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    this.isInitialized = false;
    this.lastGesture = "none";
    this.gestureConfidence = 0;
    this.frameCount = 0;
    console.log("GestureRecognizer disposed");
  }

  // Utility methods for gesture classification (to be used in task 6)
  protected getFingerTipPositions(landmarks: NormalizedLandmark[]) {
    return {
      thumb: landmarks[4],
      index: landmarks[8],
      middle: landmarks[12],
      ring: landmarks[16],
      pinky: landmarks[20],
    };
  }

  protected getFingerMcpPositions(landmarks: NormalizedLandmark[]) {
    return {
      thumb: landmarks[2],
      index: landmarks[5],
      middle: landmarks[9],
      ring: landmarks[13],
      pinky: landmarks[17],
    };
  }

  protected isFingerExtended(
    tipLandmark: NormalizedLandmark,
    mcpLandmark: NormalizedLandmark
  ): boolean {
    // Simple check: finger is extended if tip is higher than MCP joint
    return tipLandmark.y < mcpLandmark.y;
  }
}
