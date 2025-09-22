/** @format */

// Simple test to verify project setup
import { generateId } from "./utils";
import { TodoDatabase } from "./services/database";
import { GestureRecognizer } from "./services/gestureRecognizer";

async function testSetup() {
  // Test utility functions
  console.log("Testing utility functions...");
  const id = generateId();
  console.log("Generated ID:", id);

  // Test database class instantiation and basic operations
  console.log("Testing database class...");
  const db = new TodoDatabase();
  console.log("Database instance created:", !!db);

  try {
    await db.initialize();
    console.log("Database initialized successfully");

    // Test basic CRUD operations
    const taskId = await db.addTask({
      text: "Test task",
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Task added with ID:", taskId);

    const tasks = await db.getAllTasks();
    console.log("Retrieved tasks:", tasks.length);

    await db.updateTask(taskId, { completed: true });
    console.log("Task updated successfully");

    await db.deleteTask(taskId);
    console.log("Task deleted successfully");

    // Test settings
    await db.setSetting("gestureEnabled", true);
    const setting = await db.getSetting("gestureEnabled");
    console.log("Setting stored and retrieved:", setting);
  } catch (error) {
    console.error("Database test failed:", error);
  }

  // Test gesture recognizer class instantiation
  console.log("Testing gesture recognizer class...");
  const recognizer = new GestureRecognizer(() => {});
  console.log("Gesture recognizer instance created:", !!recognizer);

  console.log("✅ Project setup verification complete!");
}

// Run the test
testSetup().catch(console.error);
