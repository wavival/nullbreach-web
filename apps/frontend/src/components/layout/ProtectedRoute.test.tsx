import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { tokenStore } from "@/services/tokenStore";
import { ProtectedRoute } from "./ProtectedRoute";

async function renderAt(path: string) {
  let result!: ReturnType<typeof render>;
  // AuthProvider bootstraps via useEffect on mount — wrap in act to let the
  // mount-time state updates flush before assertions.
  await act(async () => {
    result = render(
      <AuthProvider>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <div>secret content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
    );
  });
  return result;
}

describe("<ProtectedRoute />", () => {
  it("redirects to /login when no token", async () => {
    tokenStore.clear();
    await renderAt("/secret");
    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("renders children when token present", async () => {
    tokenStore.set("access", "refresh");
    await renderAt("/secret");
    expect(screen.getByText("secret content")).toBeInTheDocument();
  });
});
