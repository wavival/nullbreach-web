import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { AuthProvider } from "@/context/AuthContext";
import { Login } from "./Login";
import { server } from "@/test/server";
import { tokenStore } from "@/services/tokenStore";

function renderLogin() {
  const result = render(
    <AuthProvider>
      <MemoryRouter
        initialEntries={["/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
  return result;
}

// Both tabpanels stay mounted (inactive one `hidden`) so aria-controls
// always resolves; scope field queries to the visible login panel.
function loginPanel() {
  return within(screen.getByRole("tabpanel", { name: /login/i }));
}

describe("<Login />", () => {
  it("renders both tabs and panels", () => {
    renderLogin();
    expect(screen.getByRole("tab", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /register/i })).toBeInTheDocument();
  });

  it("shows validation errors when login submitted empty", async () => {
    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: /^login$/i }));
    expect(await screen.findByText(/email required/i)).toBeInTheDocument();
    expect(screen.getByText(/minimum 8/i)).toBeInTheDocument();
  });

  it("validates email format", async () => {
    renderLogin();
    await userEvent.type(loginPanel().getByLabelText(/^email$/i), "not-an-email");
    await userEvent.type(loginPanel().getByLabelText(/^password$/i), "longenough");
    await userEvent.click(screen.getByRole("button", { name: /^login$/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  it("surfaces friendly message on 401", async () => {
    renderLogin();
    await userEvent.type(
      loginPanel().getByLabelText(/^email$/i),
      "wrong@example.com",
    );
    await userEvent.type(loginPanel().getByLabelText(/^password$/i), "badpassword");
    await userEvent.click(screen.getByRole("button", { name: /^login$/i }));
    expect(
      await screen.findByText(/invalid credentials/i),
    ).toBeInTheDocument();
    expect(tokenStore.getAccess()).toBeNull();
  });

  it("stores tokens and redirects on successful login", async () => {
    renderLogin();
    await userEvent.type(
      loginPanel().getByLabelText(/^email$/i),
      "valid@example.com",
    );
    await userEvent.type(loginPanel().getByLabelText(/^password$/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /^login$/i }));
    await waitFor(() =>
      expect(screen.getByText("home page")).toBeInTheDocument(),
    );
    expect(tokenStore.getAccess()).toBe("access-token");
    expect(tokenStore.getRefresh()).toBe("refresh-token");
  });

  it("shows generic server error on 5xx", async () => {
    server.use(
      http.post("http://localhost:8000/auth/login/", () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderLogin();
    await userEvent.type(
      loginPanel().getByLabelText(/^email$/i),
      "valid@example.com",
    );
    await userEvent.type(loginPanel().getByLabelText(/^password$/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /^login$/i }));
    expect(
      await screen.findByText(/server error/i),
    ).toBeInTheDocument();
  });

  it("switches to register panel via tab", async () => {
    renderLogin();
    await userEvent.click(screen.getByRole("tab", { name: /register/i }));
    expect(
      await screen.findByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });
});
