import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../app/app";

function renderApp(route = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // We can't easily use MemoryRouter with App since App has its own BrowserRouter.
  // Instead, test individual pages.
  return { queryClient };
}

describe("App", () => {
  it("should be importable", () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");
  });
});
