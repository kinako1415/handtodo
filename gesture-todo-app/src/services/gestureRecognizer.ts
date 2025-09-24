/** @format */

import { Hands, Results, NormalizedLandmark } from "@mediapipe/hands";
import { GestureType } from "../types";

// Gesture recognition service with MediaPipe Hands integration
interface GestureRecognizerConfig {
  confidenceThreshold?: number;
  debounceFrames?: number;
  historySize?: number;
  sensitivity?: number;
}

export class GestureRecognizer {
  private readonly onGestureDetected: (gesture: GestureType) => void;
  private hands: Hands | null = null;
  private isInitialized = false;
  private lastGesture: GestureType = "none";
  private gestureConfidence = 0;
  private readonly confidenceThreshold: number;
  private readonly debounceFrames: number;
  private frameCount = 0;
  private gestureHistory: GestureType[] = [];
  private readonly historySize: number;
  private readonly sensitivity: number;

  constructor(
    onGestureDetected: (gesture: GestureType) => void,
    config: GestureRecognizerConfig = {}
  ) {
    this.onGestureDetected = onGestureDetected;
    this.confidenceThreshold = config.confidenceThreshold ?? 0.8;
    this.debounceFrames = config.debounceFrames ?? 8;
    this.historySize = config.historySize ?? 10;
    this.sensitivity = config.sensitivity ?? 1.0;
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

    // Add to gesture history
    this.gestureHistory.push(gesture);
    if (this.gestureHistory.length > this.historySize) {
      this.gestureHistory.shift();
    }

    // Calculate confidence based on consistency in recent history
    const recentGestures = this.gestureHistory.slice(-this.debounceFrames);
    const gestureCount = recentGestures.filter((g) => g === gesture).length;
    const currentConfidence = gestureCount / recentGestures.length;

    if (gesture === this.lastGesture) {
      this.gestureConfidence = Math.min(
        this.gestureConfidence + 0.1,
        currentConfidence
      );
    } else {
      this.gestureConfidence = currentConfidence;
      this.lastGesture = gesture;
    }

    // Only trigger callback if gesture is stable and confident
    if (
      this.gestureConfidence >= this.confidenceThreshold &&
      this.frameCount % this.debounceFrames === 0 &&
      gesture !== "none"
    ) {
      this.onGestureDetected(gesture);
      // Reset confidence after successful detection to prevent rapid firing
      this.gestureConfidence = 0;
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
    if (!landmarks || landmarks.length < 21) {
      return "none";
    }

    // Get finger positions
    const fingerTips = this.getFingerTipPositions(landmarks);
    const fingerMcps = this.getFingerMcpPositions(landmarks);
    const wrist = landmarks[0];

    // Check which fingers are extended
    const isThumbExtended = this.isThumbExtended(landmarks);
    const isIndexExtended = this.isFingerExtended(
      fingerTips.index,
      fingerMcps.index
    );
    const isMiddleExtended = this.isFingerExtended(
      fingerTips.middle,
      fingerMcps.middle
    );
    const isRingExtended = this.isFingerExtended(
      fingerTips.ring,
      fingerMcps.ring
    );
    const isPinkyExtended = this.isFingerExtended(
      fingerTips.pinky,
      fingerMcps.pinky
    );

    // Count extended fingers
    const extendedFingers = [
      isThumbExtended,
      isIndexExtended,
      isMiddleExtended,
      isRingExtended,
      isPinkyExtended,
    ].filter(Boolean).length;

    // Gesture classification logic

    // Thumbs up: Only thumb extended, pointing up
    if (
      isThumbExtended &&
      !isIndexExtended &&
      !isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended
    ) {
      if (this.isThumbPointingUp(landmarks)) {
        return "thumbs_up";
      }
    }

    // Peace sign: Index and middle fingers extended, others folded
    if (
      !isThumbExtended &&
      isIndexExtended &&
      isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended
    ) {
      if (this.areFingersSpread(fingerTips.index, fingerTips.middle)) {
        return "peace_sign";
      }
    }

    // Point up: Only index finger extended, pointing up
    if (
      !isThumbExtended &&
      isIndexExtended &&
      !isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended
    ) {
      if (this.isFingerPointingUp(fingerTips.index, wrist)) {
        return "point_up";
      }
    }

    // Two fingers (index + middle): Index and middle extended, close together
    if (
      !isThumbExtended &&
      isIndexExtended &&
      isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended
    ) {
      if (!this.areFingersSpread(fingerTips.index, fingerTips.middle)) {
        return "two_fingers";
      }
    }

    // Fist: No fingers extended (or very few)
    if (extendedFingers <= 1) {
      return "fist";
    }

    // Open palm: All or most fingers extended
    if (extendedFingers >= 4) {
      if (this.isPalmOpen(landmarks)) {
        return "open_palm";
      }
    }

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
    this.gestureHistory = [];
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

  protected isThumbExtended(landmarks: NormalizedLandmark[]): boolean {
    // Thumb extension is different - check horizontal distance from wrist
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const wrist = landmarks[0];

    // Thumb is extended if tip is further from wrist than MCP joint
    const tipDistance = Math.sqrt(
      Math.pow(thumbTip.x - wrist.x, 2) + Math.pow(thumbTip.y - wrist.y, 2)
    );
    const mcpDistance = Math.sqrt(
      Math.pow(thumbMcp.x - wrist.x, 2) + Math.pow(thumbMcp.y - wrist.y, 2)
    );

    return tipDistance > mcpDistance * 1.2;
  }

  protected isThumbPointingUp(landmarks: NormalizedLandmark[]): boolean {
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];

    // Thumb is pointing up if tip is significantly higher than MCP
    return thumbTip.y < thumbMcp.y - 0.05;
  }

  protected isFingerPointingUp(
    tipLandmark: NormalizedLandmark,
    wrist: NormalizedLandmark
  ): boolean {
    // Finger is pointing up if tip is significantly higher than wrist
    return tipLandmark.y < wrist.y - 0.1;
  }

  protected areFingersSpread(
    finger1: NormalizedLandmark,
    finger2: NormalizedLandmark
  ): boolean {
    // Calculate distance between finger tips
    const distance = Math.sqrt(
      Math.pow(finger1.x - finger2.x, 2) + Math.pow(finger1.y - finger2.y, 2)
    );

    // Fingers are spread if distance is greater than threshold
    return distance > 0.05;
  }

  protected isPalmOpen(landmarks: NormalizedLandmark[]): boolean {
    // Check if palm is open by analyzing finger spread and positions
    const fingerTips = this.getFingerTipPositions(landmarks);
    const wrist = landmarks[0];

    // Calculate average distance of fingertips from wrist
    const distances = [
      Math.sqrt(
        Math.pow(fingerTips.index.x - wrist.x, 2) +
          Math.pow(fingerTips.index.y - wrist.y, 2)
      ),
      Math.sqrt(
        Math.pow(fingerTips.middle.x - wrist.x, 2) +
          Math.pow(fingerTips.middle.y - wrist.y, 2)
      ),
      Math.sqrt(
        Math.pow(fingerTips.ring.x - wrist.x, 2) +
          Math.pow(fingerTips.ring.y - wrist.y, 2)
      ),
      Math.sqrt(
        Math.pow(fingerTips.pinky.x - wrist.x, 2) +
          Math.pow(fingerTips.pinky.y - wrist.y, 2)
      ),
    ];

    const avgDistance =
      distances.reduce((sum, d) => sum + d, 0) / distances.length;

    // Palm is open if average distance is above threshold
    return avgDistance > 0.15 * this.sensitivity;
  }

  // Public method to update configuration
  updateConfig(config: Partial<GestureRecognizerConfig>): void {
    // Note: Some properties are readonly and set in constructor
    // This method can be extended to update mutable configuration
    console.log("Configuration update requested:", config);
  }

  // Get current gesture recognition statistics
  getStats(): {
    lastGesture: GestureType;
    confidence: number;
    frameCount: number;
    historyLength: number;
  } {
    return {
      lastGesture: this.lastGesture,
      confidence: this.gestureConfidence,
      frameCount: this.frameCount,
      historyLength: this.gestureHistory.length,
    };
  }
}
