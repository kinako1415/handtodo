/** @format */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "../AppContext";
import { vi } from "vitest";

// Mock the database
vi.mock("../../services/database", () => ({
  IndexedDBTodoDatabase: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getSetting: vi.fn().mockImplementation((key) => {
      const mockSettings = {
        gestureEnabled: true,
        sensitivity: 0.8,
        theme: "dark",
        confidenceThreshold: 0.9,
        debounceTime: 250,
      };
      return Promise.resolve(mockSettings[key]);
    }),
    setSetting: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Test component that uses the context
function TestComponent() {
  const {
    state,
    setCameraPermission,
    updateGestureSettings,
    setTheme,
    setGestureEnabled,
    resetSettings,
  } = useApp();

  return (
    <div>
      <div data-testid="camera-permission">{state.cameraPermission}</div>
      <div data-testid="theme">{state.theme}</div>
      <div data-testid="gesture-enabled">{state.gestureEnabled.toString()}</div>
      <div data-testid="sensitivity">{state.gestureSettings.sensitivity}</div>
      <div data-testid="confidence">
        {state.gestureSettings.confidenceThreshold}
      </div>
      <div data-testid="debounce">{state.gestureSettings.debounceTime}</div>
      <div data-testid="initialized">{state.isInitialized.toString()}</div>

      <button onClick={() => setCameraPermission("granted")}>
        Grant Camera
      </button>
      <button onClick={() => setTheme("dark")}>Set Dark Theme</button>
      <button onClick={() => setGestureEnabled(false)}>Disable Gesture</button>
      <button onClick={() => updateGestureSettings({ sensitivity: 0.9 })}>
        Update Sensitivity
      </button>
      <button onClick={() => resetSettings()}>Reset Settings</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AppProvider>
      <TestComponent />
    </AppProvider>
  );
}

describe("AppContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset document class list
    document.documentElement.classList.remove("dark");
  });

  it("should provide initial state", () => {
    renderWithProvider();

    expect(screen.getByTestId("camera-permission")).toHaveTextContent("prompt");
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("gesture-enabled")).toHaveTextContent("true");
    expect(screen.getByTestId("sensitivity")).toHaveTextContent("0.7");
    expect(screen.getByTestId("confidence")).toHaveTextContent("0.8");
    expect(screen.getByTestId("debounce")).toHaveTextContent("300");
  });

  it("should load settings from database on initialization", async () => {
    renderWithProvider();

    // Wait for initialization to complete
    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent("true");
    });

    // Check that settings were loaded from mock database
    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("sensitivity")).toHaveTextContent("0.8");
      expect(screen.getByTestId("confidence")).toHaveTextContent("0.9");
      expect(screen.getByTestId("debounce")).toHaveTextContent("250");
    });
  });

  it("should update camera permission", async () => {
    renderWithProvider();

    const grantButton = screen.getByText("Grant Camera");

    await act(async () => {
      grantButton.click();
    });

    expect(screen.getByTestId("camera-permission")).toHaveTextContent(
      "granted"
    );
  });

  it("should update theme and apply to document", async () => {
    renderWithProvider();

    const themeButton = screen.getByText("Set Dark Theme");

    await act(async () => {
      themeButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("should update gesture enabled setting", async () => {
    renderWithProvider();

    const disableButton = screen.getByText("Disable Gesture");

    await act(async () => {
      disableButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("gesture-enabled")).toHaveTextContent("false");
    });
  });

  it("should update gesture settings", async () => {
    renderWithProvider();

    const updateButton = screen.getByText("Update Sensitivity");

    await act(async () => {
      updateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("sensitivity")).toHaveTextContent("0.9");
    });
  });

  it("should reset settings to defaults", async () => {
    renderWithProvider();

    // First change some settings
    const themeButton = screen.getByText("Set Dark Theme");
    const disableButton = screen.getByText("Disable Gesture");

    await act(async () => {
      themeButton.click();
      disableButton.click();
    });

    // Then reset
    const resetButton = screen.getByText("Reset Settings");

    await act(async () => {
      resetButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
      expect(screen.getByTestId("gesture-enabled")).toHaveTextContent("true");
      expect(screen.getByTestId("sensitivity")).toHaveTextContent("0.7");
    });
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useApp must be used within an AppProvider");

    consoleSpy.mockRestore();
  });
});
