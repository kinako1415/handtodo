/** @format */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TodoDatabase } from "../database";

describe("TodoDatabase", () => {
  let database: TodoDatabase;
  let testDbName: string;

  beforeEach(async () => {
    testDbName = `GestureTodoApp_test_${Date.now()}_${Math.random()}`;

    class TestTodoDatabase extends TodoDatabase {
      protected readonly dbName = testDbName;
    }

    database = new (TestTodoDatabase as any)();
    await database.initialize();
  });

  afterEach(async () => {
    if (database && (database as any).db) {
      (database as any).db.close();
    }

    return new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
      deleteRequest.onblocked = () => resolve();
    });
  });

  describe("initialization", () => {
    it("should initialize database successfully", async () => {
      const newDatabase = new TodoDatabase();
      await expect(newDatabase.initialize()).resolves.not.toThrow();
    });

    it("should throw error when accessing database before initialization", async () => {
      const uninitializedDatabase = new TodoDatabase();
      await expect(uninitializedDatabase.getAllTasks()).rejects.toThrow(
        "Database not initialized"
      );
    });
  });

  describe("task operations", () => {
    it("should add a new task and return an ID", async () => {
      const taskData = {
        text: "Test task",
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const taskId = await database.addTask(taskData);

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe("string");
      expect(taskId.length).toBeGreaterThan(0);
    });

    it("should return empty array when no tasks exist", async () => {
      const tasks = await database.getAllTasks();
      expect(tasks).toEqual([]);
    });

    it("should add and retrieve tasks", async () => {
      const task1 = { text: "Task 1", completed: false };
      const task2 = { text: "Task 2", completed: true };

      await database.addTask(task1);
      await database.addTask(task2);

      const tasks = await database.getAllTasks();
      expect(tasks).toHaveLength(2);

      const taskTexts = tasks.map((t) => t.text).sort();
      expect(taskTexts).toEqual(["Task 1", "Task 2"]);
    });

    it("should update existing task", async () => {
      const taskData = { text: "Original task", completed: false };
      const taskId = await database.addTask(taskData);

      await database.updateTask(taskId, {
        text: "Updated task",
        completed: true,
      });

      const tasks = await database.getAllTasks();
      const updatedTask = tasks.find((task) => task.id === taskId);

      expect(updatedTask).toBeDefined();
      expect(updatedTask!.text).toBe("Updated task");
      expect(updatedTask!.completed).toBe(true);
    });

    it("should delete existing task", async () => {
      const taskData = { text: "Task to delete", completed: false };
      const taskId = await database.addTask(taskData);

      await database.deleteTask(taskId);

      const tasks = await database.getAllTasks();
      expect(tasks).toHaveLength(0);
    });

    it("should throw error when updating non-existent task", async () => {
      await expect(
        database.updateTask("non-existent-id", { text: "Updated" })
      ).rejects.toThrow("Task with id non-existent-id not found");
    });
  });

  describe("settings operations", () => {
    it("should store and retrieve settings", async () => {
      await database.setSetting("gestureEnabled", true);
      await database.setSetting("sensitivity", 0.8);
      await database.setSetting("theme", "dark");

      expect(await database.getSetting("gestureEnabled")).toBe(true);
      expect(await database.getSetting("sensitivity")).toBe(0.8);
      expect(await database.getSetting("theme")).toBe("dark");
    });

    it("should return undefined for non-existent setting", async () => {
      const freshDbName = `GestureTodoApp_fresh_${Date.now()}_${Math.random()}`;
      class FreshTodoDatabase extends TodoDatabase {
        protected readonly dbName = freshDbName;
      }

      const freshDatabase = new (FreshTodoDatabase as any)();
      await freshDatabase.initialize();

      const value = await freshDatabase.getSetting("gestureEnabled");
      expect(value).toBeUndefined();

      (freshDatabase as any).db?.close();
      indexedDB.deleteDatabase(freshDbName);
    });
  });
});
