/** @format */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TodoDatabase } from "../database";
import { Task, AppSettings } from "../../types";

describe("TodoDatabase Integration", () => {
  let database: TodoDatabase;
  let testDbName: string;

  beforeEach(async () => {
    testDbName = `GestureTodoApp_integration_${Date.now()}_${Math.random()}`;

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

  it("should handle complete todo workflow", async () => {
    // Add initial tasks
    const task1Id = await database.addTask({
      text: "Learn MediaPipe",
      completed: false,
    });

    const task2Id = await database.addTask({
      text: "Build gesture recognition",
      completed: false,
    });

    // Verify tasks were added
    let tasks = await database.getAllTasks();
    expect(tasks).toHaveLength(2);

    // Complete first task
    await database.updateTask(task1Id, { completed: true });

    // Verify task was updated
    tasks = await database.getAllTasks();
    const completedTask = tasks.find((t) => t.id === task1Id);
    expect(completedTask?.completed).toBe(true);

    // Delete second task
    await database.deleteTask(task2Id);

    // Verify task was deleted
    tasks = await database.getAllTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(task1Id);
  });

  it("should handle app settings workflow", async () => {
    // Set initial settings
    await database.setSetting("gestureEnabled", true);
    await database.setSetting("sensitivity", 0.75);
    await database.setSetting("theme", "dark");
    await database.setSetting("confidenceThreshold", 0.8);
    await database.setSetting("debounceTime", 300);

    // Verify all settings
    expect(await database.getSetting("gestureEnabled")).toBe(true);
    expect(await database.getSetting("sensitivity")).toBe(0.75);
    expect(await database.getSetting("theme")).toBe("dark");
    expect(await database.getSetting("confidenceThreshold")).toBe(0.8);
    expect(await database.getSetting("debounceTime")).toBe(300);

    // Update settings
    await database.setSetting("gestureEnabled", false);
    await database.setSetting("theme", "light");

    // Verify updates
    expect(await database.getSetting("gestureEnabled")).toBe(false);
    expect(await database.getSetting("theme")).toBe("light");
    // Other settings should remain unchanged
    expect(await database.getSetting("sensitivity")).toBe(0.75);
  });

  it("should handle task with all properties", async () => {
    const now = new Date();
    const taskData: Omit<Task, "id"> = {
      text: "Complete gesture todo app",
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    const taskId = await database.addTask(taskData);
    const tasks = await database.getAllTasks();
    const savedTask = tasks.find((t) => t.id === taskId);

    expect(savedTask).toMatchObject({
      id: taskId,
      text: "Complete gesture todo app",
      completed: false,
      createdAt: now,
      updatedAt: expect.any(Date), // Updated during save
    });
  });

  it("should maintain data integrity across operations", async () => {
    // Add multiple tasks
    const taskIds = [];
    for (let i = 1; i <= 5; i++) {
      const id = await database.addTask({
        text: `Task ${i}`,
        completed: i % 2 === 0, // Even tasks are completed
      });
      taskIds.push(id);
    }

    // Verify all tasks exist
    let tasks = await database.getAllTasks();
    expect(tasks).toHaveLength(5);

    // Update some tasks
    await database.updateTask(taskIds[0], { text: "Updated Task 1" });
    await database.updateTask(taskIds[2], { completed: true });

    // Delete one task
    await database.deleteTask(taskIds[4]);

    // Verify final state
    tasks = await database.getAllTasks();
    expect(tasks).toHaveLength(4);

    const updatedTask1 = tasks.find((t) => t.id === taskIds[0]);
    expect(updatedTask1?.text).toBe("Updated Task 1");

    const updatedTask3 = tasks.find((t) => t.id === taskIds[2]);
    expect(updatedTask3?.completed).toBe(true);

    const deletedTask = tasks.find((t) => t.id === taskIds[4]);
    expect(deletedTask).toBeUndefined();
  });
});
