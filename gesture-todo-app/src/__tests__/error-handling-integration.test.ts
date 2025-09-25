/** @format */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DatabaseFactory,
  DatabaseError,
  DatabaseQuotaError,
  DatabaseConnectionError,
} from "../services/database";
import {
  GestureRecognizer,
  MediaPipeInitializationError,
  FrameProcessingError,
} from "../services/gestureRecognizer";

describe("Error Handling Integration", () => {
  beforeEach(() => {
    DatabaseFactory.reset();
    vi.clearAllMocks();
  });

  describe("Database Error Handling", () => {
    it("should handle database initialization failure and fallback to in-memory", async () => {
      // Mock IndexedDB to fail
      const originalIndexedDB = global.indexedDB;
      global.indexedDB = undefined as any;

      const database = await DatabaseFactory.createDatabase();

      // Should fallback to in-memory database
      expect(DatabaseFactory.isUsingFallbackDatabase()).toBe(true);

      // Should still be able to perform operations
      const taskId = await database.addTask({
        text: "Test task",
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(taskId).toBeDefined();

      const tasks = await database.getAllTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].text).toBe("Test task");

      // Restore IndexedDB
      global.indexedDB = originalIndexedDB;
    });

    it("should handle quota exceeded error", async () => {
      const database = await DatabaseFactory.createDatabase();

      // Mock a quota error
      const originalAddTask = database.addTask;
      database.addTask = vi
        .fn()
        .mockRejectedValue(new DatabaseQuotaError("Storage quota exceeded"));

      await expect(
        database.addTask({
          text: "Test task",
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ).rejects.toThrow("Storage quota exceeded");
    });

    it("should backup and restore data during fallback switch", async () => {
      const database = await DatabaseFactory.createDatabase();

      // Add some test data
      await database.addTask({
        text: "Test task 1",
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await database.addTask({
        text: "Test task 2",
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Backup data
      await DatabaseFactory.backupData();

      // Switch to fallback
      const fallbackDB = await DatabaseFactory.switchToFallback();

      // Verify data is preserved
      const tasks = await fallbackDB.getAllTasks();
      expect(tasks).toHaveLength(2);
      expect(tasks.find((t) => t.text === "Test task 1")).toBeDefined();
      expect(tasks.find((t) => t.text === "Test task 2")).toBeDefined();
    });
  });

  describe("Gesture Recognition Error Handling", () => {
    it("should handle MediaPipe initialization failure", () => {
      const onGestureDetected = vi.fn();
      const onError = vi.fn();

      // Mock MediaPipe to be unavailable
      const originalHands = global.Hands;
      global.Hands = undefined as any;

      const recognizer = new GestureRecognizer(onGestureDetected, onError);

      // Create a mock video element
      const mockVideo = {
        readyState: 4, // HAVE_ENOUGH_DATA
      } as HTMLVideoElement;

      // Attempt initialization should fail
      expect(recognizer.initialize(mockVideo)).rejects.toThrow();

      // Restore
      global.Hands = originalHands;
    });

    it("should track error statistics", () => {
      const onGestureDetected = vi.fn();
      const onError = vi.fn();

      const recognizer = new GestureRecognizer(onGestureDetected, onError, {
        maxRetries: 3,
      });

      const stats = recognizer.getErrorStats();
      expect(stats.maxRetries).toBe(3);
      expect(stats.consecutiveErrors).toBe(0);
      expect(stats.retryCount).toBe(0);
    });

    it("should report health status", () => {
      const onGestureDetected = vi.fn();
      const onError = vi.fn();

      const recognizer = new GestureRecognizer(onGestureDetected, onError);

      // Initially not healthy (not initialized)
      expect(recognizer.isHealthy()).toBe(false);
    });
  });

  describe("Error Recovery", () => {
    it("should attempt database recovery from fallback to IndexedDB", async () => {
      // Start with fallback
      const originalIndexedDB = global.indexedDB;
      global.indexedDB = undefined as any;

      const fallbackDB = await DatabaseFactory.createDatabase();
      expect(DatabaseFactory.isUsingFallbackDatabase()).toBe(true);

      // Add some data to fallback
      await fallbackDB.addTask({
        text: "Fallback task",
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Restore IndexedDB
      global.indexedDB = originalIndexedDB;

      // Attempt recovery
      const recovered = await DatabaseFactory.attemptRecovery();

      if (recovered) {
        expect(DatabaseFactory.isUsingFallbackDatabase()).toBe(false);

        // Verify data was migrated
        const recoveredDB = await DatabaseFactory.createDatabase();
        const tasks = await recoveredDB.getAllTasks();
        expect(tasks.find((t) => t.text === "Fallback task")).toBeDefined();
      }
    });
  });

  describe("Data Loss Prevention", () => {
    it("should export data for backup", async () => {
      const database = await DatabaseFactory.createDatabase();

      // Add test data
      await database.addTask({
        text: "Important task",
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await database.setSetting("theme", "dark");

      // Export data
      const exportedData = await database.exportData();

      expect(exportedData.tasks).toHaveLength(1);
      expect(exportedData.tasks[0].text).toBe("Important task");
      expect(exportedData.settings.theme).toBe("dark");
    });

    it("should import data for recovery", async () => {
      const database = await DatabaseFactory.createDatabase();

      const importData = {
        tasks: [
          {
            id: "test-id",
            text: "Imported task",
            completed: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        settings: {
          theme: "light",
          gestureEnabled: false,
        },
      };

      // Import data
      await database.importData(importData);

      // Verify import
      const tasks = await database.getAllTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].text).toBe("Imported task");
      expect(tasks[0].completed).toBe(true);

      const theme = await database.getSetting("theme");
      expect(theme).toBe("light");
    });
  });
});
