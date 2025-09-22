/** @format */

import React, { ReactNode } from "react";
import { AppProvider } from "./AppContext";
import { TodoProvider } from "./TodoContext";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AppProvider>
      <TodoProvider>{children}</TodoProvider>
    </AppProvider>
  );
}
