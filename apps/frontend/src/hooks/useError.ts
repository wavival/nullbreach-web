import { useCallback } from "react";
import { toast } from "@/lib/toast";
import { parseApiError } from "@/lib/errors";

export interface UseErrorReturn {
  showError: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showApiError: (err: unknown, override?: Partial<Record<number, string>>) => void;
}

export function useError(): UseErrorReturn {
  const showError = useCallback((message: string, duration?: number) => {
    toast.error(message, duration !== undefined ? { duration } : undefined);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    toast.success(message, duration !== undefined ? { duration } : undefined);
  }, []);

  const showWarning = useCallback((message: string, duration?: number) => {
    toast.warning(message, duration !== undefined ? { duration } : undefined);
  }, []);

  const showApiError = useCallback(
    (err: unknown, override?: Partial<Record<number, string>>) => {
      const parsed = parseApiError(err);
      const custom = override?.[parsed.status];
      toast.error(custom ?? parsed.message);
    },
    [],
  );

  return { showError, showSuccess, showWarning, showApiError };
}
