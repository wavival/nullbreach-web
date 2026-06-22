import { toast as hotToast } from "react-hot-toast";

export type ToastVariant = "error" | "success" | "info" | "warning";

export interface ToastOptions {
  title?: string;
  duration?: number;
}

const SUCCESS_DURATION = 3000;
const ERROR_DURATION = 4000;
const WARNING_DURATION = 3000;
const INFO_DURATION = 3000;

const BASE_STYLE = {
  background: "#1E293B",
  color: "#F1F5F9",
} as const;

const SUCCESS_STYLE = { ...BASE_STYLE, border: "1px solid #22C55E" } as const;
const ERROR_STYLE = { ...BASE_STYLE, border: "1px solid #FF8B7C" } as const;
const WARNING_STYLE = { ...BASE_STYLE, border: "1px solid #FBBF24" } as const;
const INFO_STYLE = { ...BASE_STYLE, border: "1px solid #3B82F6" } as const;

function withTitle(message: string, title?: string): string {
  return title ? `${title}\n${message}` : message;
}

export function showSuccess(message: string, duration?: number): string {
  return hotToast.success(message, {
    duration: duration ?? SUCCESS_DURATION,
    style: SUCCESS_STYLE,
    iconTheme: { primary: "#22C55E", secondary: "#0F172A" },
  });
}

export function showError(message: string, duration?: number): string {
  return hotToast.error(message, {
    duration: duration ?? ERROR_DURATION,
    style: ERROR_STYLE,
    iconTheme: { primary: "#FF8B7C", secondary: "#0F172A" },
  });
}

export function showWarning(message: string, duration?: number): string {
  return hotToast(message, {
    duration: duration ?? WARNING_DURATION,
    icon: "⚠️",
    style: WARNING_STYLE,
  });
}

export const toast = {
  error: (message: string, opts?: ToastOptions): string =>
    showError(withTitle(message, opts?.title), opts?.duration),
  success: (message: string, opts?: ToastOptions): string =>
    showSuccess(withTitle(message, opts?.title), opts?.duration),
  warning: (message: string, opts?: ToastOptions): string =>
    showWarning(withTitle(message, opts?.title), opts?.duration),
  info: (message: string, opts?: ToastOptions): string =>
    hotToast(withTitle(message, opts?.title), {
      duration: opts?.duration ?? INFO_DURATION,
      style: INFO_STYLE,
    }),
  dismiss: (id?: string): void => hotToast.dismiss(id),
};
