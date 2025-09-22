/** @format */

// Simple test to verify project setup
import { generateId } from "./utils";
import { TodoDatabase } from "./services/database";
import { GestureRecognizer } from "./services/gestureRecognizer";

// Test utility functions
console.log("Testing utility functions...");
const id = generateId();
console.log("Generated ID:", id);

// Test database class instantiation
console.log("Testing database class...");
const db = new TodoDatabase();
console.log("Database instance created:", !!db);

// Test gesture recognizer class instantiation
console.log("Testing gesture recognizer class...");
const recognizer = new GestureRecognizer(() => {});
console.log("Gesture recognizer instance created:", !!recognizer);

console.log("✅ Project setup verification complete!");
