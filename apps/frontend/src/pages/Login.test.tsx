import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { AuthProvider } from "@/context/AuthContext";
import { Login } from "./Login";
import { server } from "@/test/server";
import { tokenStore } from "@/services/tokenStore";

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter
        initialEntries={["/login"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
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
    await userEvent.type(screen.getByLabelText(/^email$/i), "not-an-email");
    await userEvent.type(screen.getByLabelText(/^password$/i), "longenough");
    await userEvent.click(screen.getByRole("button", { name: /^login$/i }));
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
  });

  it("surfaces friendly message on 401", async () => {
    renderLogin();
    await userEvent.type(
      screen.getByLabelText(/^email$/i),
      "wrong@example.com",
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "badpassword");
    await userEvent.click(screen.getByRole("button", { name: /^login$/i }));
    expect(
      await screen.findByText(/invalid credentials/i),
    ).toBeInTheDocument();
    expect(tokenStore.getAccess()).toBeNull();
  });

  it("stores tokens and redirects on successful login", async () => {
    renderLogin();
    await userEvent.type(
      screen.getByLabelText(/^email$/i),
      "valid@example.com",
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
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
      screen.getByLabelText(/^email$/i),
      "valid@example.com",
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
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
