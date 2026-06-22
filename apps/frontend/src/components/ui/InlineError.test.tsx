import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineError } from "./InlineError";

describe("<InlineError />", () => {
  it("renders message with role=alert", () => {
    render(<InlineError message="Boom" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Boom");
  });

  it("omits retry button when onRetry not provided", () => {
    render(<InlineError message="Boom" />);
    expect(
      screen.queryByRole("button", { name: /retry/i }),
    ).not.toBeInTheDocument();
  });

  it("fires onRetry when button clicked", async () => {
    const onRetry = vi.fn();
    render(<InlineError message="Boom" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
