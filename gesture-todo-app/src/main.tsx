/** @format */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Providers } from "./contexts";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>
);
