import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/context/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ToastViewport } from "@/components/ui/Toast";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

const Login = lazy(() =>
  import("@/pages/Login").then((m) => ({ default: m.Login })),
);
const Home = lazy(() =>
  import("@/pages/Home").then((m) => ({ default: m.Home })),
);
const Chat = lazy(() =>
  import("@/pages/Chat").then((m) => ({ default: m.Chat })),
);
const Analyzer = lazy(() =>
  import("@/pages/Analyzer").then((m) => ({ default: m.Analyzer })),
);
const NotFound = lazy(() =>
  import("@/pages/NotFound").then((m) => ({ default: m.NotFound })),
);

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastViewport />
      <WhatsAppButton />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public, no Layout */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated area, wrapped in Layout */}
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:sessionId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analyzer"
              element={
                <ProtectedRoute>
                  <Analyzer />
                </ProtectedRoute>
              }
            />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
