import { Toaster as HotToaster } from "react-hot-toast";

export function ToastViewport() {
  return (
    <HotToaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 16, right: 16 }}
      toastOptions={{
        style: {
          fontSize: "14px",
          padding: "12px 16px",
          borderRadius: "4px",
          boxShadow: "0 8px 12px rgba(0, 0, 0, 0.4)",
          maxWidth: "420px",
        },
      }}
    />
  );
}
