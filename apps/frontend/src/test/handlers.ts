import { http, HttpResponse } from "msw";

// Tests target the same base as the dev fallback in src/services/api.ts.
// Individual suites can override via server.use(...).
const BASE = "http://localhost:8000";

export const handlers = [
  http.post(`${BASE}/auth/login/`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === "valid@example.com" && body.password === "password123") {
      return HttpResponse.json({
        access: "access-token",
        refresh: "refresh-token",
        user: {
          id: "1",
          email: "valid@example.com",
          date_joined: "2025-01-01T00:00:00Z",
        },
      });
    }
    return HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 });
  }),

  http.post(`${BASE}/auth/register/`, async () => {
    return HttpResponse.json({}, { status: 201 });
  }),

  http.post(`${BASE}/auth/refresh/`, async () => {
    return HttpResponse.json({
      access: "new-access-token",
      refresh: "new-refresh-token",
    });
  }),
];
