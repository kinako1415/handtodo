/** @format */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateId, debounce, formatDate } from "../index";

describe("Utility Functions", () => {
  describe("generateId", () => {
    it("should generate a valid UUID", () => {
      const id = generateId();
      expect(id).toBeDefined();
      expect(typeof id).toBe("string");
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });

    it("should generate multiple unique IDs", () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should delay function execution", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it("should cancel previous calls when called multiple times", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it("should pass arguments to the debounced function", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn("arg1", "arg2");
      vi.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should use the latest arguments when called multiple times", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn("first");
      debouncedFn("second");
      debouncedFn("third");

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith("third");
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it("should work with different wait times", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 200);

      debouncedFn();
      vi.advanceTimersByTime(100);
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledOnce();
    });
  });

  describe("formatDate", () => {
    it("should format date in Japanese locale", () => {
      const date = new Date("2023-12-25T15:30:00");
      const formatted = formatDate(date);

      // The exact format may vary by environment, but should contain the date components
      expect(formatted).toMatch(/2023/);
      expect(formatted).toMatch(/12/);
      expect(formatted).toMatch(/25/);
      expect(formatted).toMatch(/15/);
      expect(formatted).toMatch(/30/);
    });

    it("should handle different dates consistently", () => {
      const date1 = new Date("2023-01-01T00:00:00");
      const date2 = new Date("2023-12-31T23:59:59");

      const formatted1 = formatDate(date1);
      const formatted2 = formatDate(date2);

      expect(formatted1).toBeDefined();
      expect(formatted2).toBeDefined();
      expect(formatted1).not.toBe(formatted2);
    });

    it("should format current date without errors", () => {
      const now = new Date();
      expect(() => formatDate(now)).not.toThrow();

      const formatted = formatDate(now);
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
