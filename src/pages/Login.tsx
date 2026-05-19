import { useEffect, useState, type CSSProperties } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm, type UseFormRegister, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldHalf,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/lib/errors";
import { useError } from "@/hooks/useError";
import { usePageTitle } from "@/hooks/usePageTitle";

/* ------------------------------------------------------------------ */
/*  Schemas + form types                                              */
/* ------------------------------------------------------------------ */

const loginSchema = z.object({
  email: z.string().min(1, "Email required").email("Invalid email"),
  password: z.string().min(8, "Minimum 8 characters"),
});

const registerSchema = z
  .object({
    email: z.string().min(1, "Email required").email("Invalid email"),
    password: z.string().min(8, "Minimum 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type Tab = "login" | "register";

/* ------------------------------------------------------------------ */
/*  Utils                                                             */
/* ------------------------------------------------------------------ */

const GRID_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(51,65,85,0.6) 0.5px, transparent 0.5px), linear-gradient(to bottom, rgba(51,65,85,0.6) 0.5px, transparent 0.5px)",
  backgroundSize: "40px 40px",
};

/* Pseudo-random but stable: positions for particles. */
const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const left = ((i * 73) % 100) + (i % 2 === 0 ? 0 : 3);
  const top = ((i * 47) % 100) + (i % 3 === 0 ? 2 : 0);
  const size = 2 + (i % 3);
  const delay = (i * 0.7) % 6;
  const duration = 8 + (i % 5) * 2;
  return { left, top, size, delay, duration, idx: i };
});

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export function Login() {
  usePageTitle("Login");
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [tab, setTab] = useState<Tab>("login");
  const [justRegisteredEmail, setJustRegisteredEmail] = useState<string | null>(
    null,
  );

  if (token) return <Navigate to={from} replace />;

  function handleAuthSuccess() {
    navigate(from, { replace: true });
  }

  function handleRegisterSuccess(email: string) {
    setJustRegisteredEmail(email);
  }

  function goToLoginNow() {
    setTab("login");
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-surface via-surface to-surface-alt">
      {/* Grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={GRID_BG}
      />
      {/* Radial glow */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-32 size-[480px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 size-[520px] rounded-full bg-secondary/10 blur-3xl pointer-events-none"
      />

      {/* Floating particles — hidden entirely under prefers-reduced-motion. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none motion-reduce:hidden"
      >
        {PARTICLES.map((p) => (
          <span
            key={p.idx}
            className={cn(
              "absolute rounded-full",
              p.idx % 2 === 0 ? "bg-primary/30" : "bg-secondary/30",
              p.idx % 4 === 0 ? "animate-float-lg" : "animate-float",
              "motion-reduce:animate-none",
            )}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-md py-2xl">
        <div className="w-full max-w-[400px] animate-card-in">
          <div className="flex items-center justify-center gap-sm mb-xl">
            <ShieldHalf className="text-primary size-7 drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
            <span className="font-headline text-h3 text-primary">
              NullBreach
            </span>
          </div>

          <div
            className={cn(
              "relative rounded p-xl",
              "border border-border/70",
              "bg-surface-alt/60 backdrop-blur-xl",
              "shadow-large",
            )}
          >
            {/* Tab bar */}
            <div
              role="tablist"
              aria-label="Authentication"
              className="relative flex border-b border-border mb-xl"
            >
              <TabButton
                active={tab === "login"}
                onClick={() => setTab("login")}
                onPrev={() => setTab("register")}
                onNext={() => setTab("register")}
                id="tab-login"
                controls="panel-login"
              >
                Login
              </TabButton>
              <TabButton
                active={tab === "register"}
                onClick={() => setTab("register")}
                onPrev={() => setTab("login")}
                onNext={() => setTab("login")}
                id="tab-register"
                controls="panel-register"
              >
                Register
              </TabButton>
              {/* Sliding underline indicator */}
              <span
                aria-hidden="true"
                className="absolute bottom-[-1px] h-[2px] w-1/2 bg-primary rounded-full transition-transform duration-slow ease-slow shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                style={{
                  transform: `translateX(${tab === "login" ? "0%" : "100%"})`,
                }}
              />
            </div>

            {/* Cross-fade panels (remount on tab change OR state change) */}
            <div
              key={
                tab === "register" && justRegisteredEmail
                  ? "register-success"
                  : tab
              }
              className="animate-fade-in"
            >
              {tab === "login" ? (
                <LoginForm
                  defaultEmail={justRegisteredEmail}
                  onSuccess={handleAuthSuccess}
                  onSwitchToRegister={() => {
                    setJustRegisteredEmail(null);
                    setTab("register");
                  }}
                />
              ) : justRegisteredEmail ? (
                <RegisterSuccess
                  email={justRegisteredEmail}
                  onGoToLogin={goToLoginNow}
                />
              ) : (
                <RegisterForm
                  onSuccess={handleRegisterSuccess}
                  onSwitchToLogin={() => setTab("login")}
                />
              )}
            </div>
          </div>

          <p className="text-center text-body-sm text-foreground-muted mt-lg">
            Protected by NullBreach · Secure auth
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab button                                                        */
/* ------------------------------------------------------------------ */

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  onPrev: () => void;
  onNext: () => void;
  children: React.ReactNode;
  id: string;
  controls: string;
}

function TabButton({
  active,
  onClick,
  onPrev,
  onNext,
  children,
  id,
  controls,
}: TabButtonProps) {
  function handleKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onPrev();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onNext();
    } else if (e.key === "Home") {
      e.preventDefault();
      // Same callback both ends — parent owns ordering.
      onPrev();
    } else if (e.key === "End") {
      e.preventDefault();
      onNext();
    }
  }
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-controls={controls}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onKeyDown={handleKey}
      className={cn(
        "flex-1 px-md py-md text-body font-medium",
        "transition-colors duration-hover ease-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 rounded-t",
        active
          ? "text-foreground"
          : "text-foreground-muted hover:text-secondary",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating-label field with icon                                    */
/* ------------------------------------------------------------------ */

interface FloatingFieldProps<TForm extends Record<string, unknown>> {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  icon: LucideIcon;
  name: FieldPath<TForm>;
  register: UseFormRegister<TForm>;
  error?: string;
  delay?: number;
}

function FloatingField<TForm extends Record<string, unknown>>({
  id,
  label,
  type = "text",
  autoComplete,
  icon: Icon,
  name,
  register,
  error,
  delay = 0,
}: FloatingFieldProps<TForm>) {
  const errorId = `${id}-error`;
  const isPassword = type === "password";
  const [reveal, setReveal] = useState(false);
  const effectiveType = isPassword ? (reveal ? "text" : "password") : type;
  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative">
        <input
          id={id}
          type={effectiveType}
          autoComplete={autoComplete}
          placeholder=" "
          aria-invalid={!!error || undefined}
          aria-describedby={error ? errorId : undefined}
          {...register(name)}
          className={cn(
            "peer h-14 w-full rounded",
            "bg-surface/40 backdrop-blur-sm",
            "pl-10 pt-5 pb-1 text-body text-foreground",
            isPassword ? "pr-11" : "pr-3",
            "border placeholder-transparent",
            "transition-all duration-hover ease-hover",
            "focus:outline-none focus:bg-surface/70",
            error
              ? "border-error focus:border-error focus:shadow-[0_0_0_4px_rgba(255,139,124,0.15)]"
              : "border-border hover:border-neutral focus:border-primary focus:shadow-[0_0_0_4px_rgba(34,197,94,0.18)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        />
        <label
          htmlFor={id}
          className={cn(
            "absolute left-10 top-1/2 -translate-y-1/2 origin-left",
            "text-body pointer-events-none select-none",
            "transition-all duration-hover ease-hover",
            "peer-focus:top-[10px] peer-focus:translate-y-0 peer-focus:scale-[0.82]",
            "peer-[:not(:placeholder-shown)]:top-[10px]",
            "peer-[:not(:placeholder-shown)]:translate-y-0",
            "peer-[:not(:placeholder-shown)]:scale-[0.82]",
            // Chrome autofill: the value is present but :placeholder-shown
            // still matches until first interaction. Force the float state.
            "peer-[:-webkit-autofill]:top-[10px]",
            "peer-[:-webkit-autofill]:translate-y-0",
            "peer-[:-webkit-autofill]:scale-[0.82]",
            error
              ? "text-error peer-focus:text-error"
              : "text-foreground-muted peer-focus:text-primary",
          )}
        >
          {label}
        </label>
        <Icon
          aria-hidden="true"
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none",
            "transition-colors duration-hover",
            error
              ? "text-error"
              : "text-foreground-muted peer-focus:text-primary",
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            aria-pressed={reveal}
            tabIndex={0}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "inline-flex items-center justify-center",
              "size-8 rounded cursor-pointer",
              "text-secondary hover:text-primary",
              "transition-colors duration-hover ease-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            )}
          >
            {reveal ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-xs ml-xs text-body-sm text-error animate-fade-in"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Primary submit button (page-local; spec differs from DS Button)   */
/* ------------------------------------------------------------------ */

interface SubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
}

function SubmitButton({ loading, children }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        "relative w-full h-12 rounded font-medium text-body",
        "bg-primary text-primary-foreground",
        "flex items-center justify-center gap-sm",
        "transition-all duration-hover ease-hover",
        "hover:brightness-110 hover:shadow-[0_8px_24px_-6px_rgba(34,197,94,0.55)]",
        "active:brightness-90 active:scale-[0.99]",
        "disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:brightness-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt",
        loading && "animate-pulse-glow",
      )}
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin" aria-label="Loading" />
      ) : (
        children
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Error banner                                                      */
/* ------------------------------------------------------------------ */

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-sm rounded px-md py-sm",
        "border border-error text-error",
        "bg-[rgba(255,139,124,0.1)]",
        "animate-slide-down",
      )}
    >
      <AlertCircle className="size-4 shrink-0 mt-[2px]" />
      <span className="text-body-sm">{message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Login form                                                        */
/* ------------------------------------------------------------------ */

interface LoginFormProps {
  defaultEmail?: string | null;
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

function LoginForm({
  defaultEmail,
  onSuccess,
  onSwitchToRegister,
}: LoginFormProps) {
  const { login } = useAuth();
  const { showSuccess } = useError();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: defaultEmail ?? "", password: "" },
  });

  useEffect(() => {
    if (defaultEmail) {
      reset({ email: defaultEmail, password: "" });
    }
  }, [defaultEmail, reset]);

  async function onSubmit(values: LoginFormData) {
    setApiError(null);
    try {
      await login(values.email, values.password);
      showSuccess("Login successful");
      onSuccess();
    } catch (err) {
      const parsed = parseApiError(err);
      const friendly =
        parsed.status === 401
          ? "Invalid credentials."
          : parsed.status >= 500
            ? "Server error."
            : parsed.message;
      setApiError(friendly);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      id="panel-login"
      role="tabpanel"
      aria-labelledby="tab-login"
      className="flex flex-col gap-lg"
      noValidate
    >
      <FormError message={apiError} />

      <FloatingField<LoginFormData>
        id="login-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        icon={Mail}
        register={register}
        error={errors.email?.message}
        delay={0}
      />

      <FloatingField<LoginFormData>
        id="login-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        icon={Lock}
        register={register}
        error={errors.password?.message}
        delay={50}
      />

      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "100ms" }}
      >
        <SubmitButton loading={isSubmitting}>Login</SubmitButton>
      </div>

      <p
        className="text-body-sm text-foreground-muted text-center animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        Don't have an account?{" "}
        <SwitchLink onClick={onSwitchToRegister}>Sign up</SwitchLink>
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Register form                                                     */
/* ------------------------------------------------------------------ */

interface RegisterFormProps {
  onSuccess: (email: string) => void;
  onSwitchToLogin: () => void;
}

function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const { register: registerUser } = useAuth();
  const { showSuccess } = useError();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: RegisterFormData) {
    setApiError(null);
    try {
      await registerUser(values.email, values.password);
      showSuccess("Account created successfully");
      onSuccess(values.email);
    } catch (err) {
      const parsed = parseApiError(err);
      const friendly =
        parsed.status === 409
          ? "Email already exists."
          : parsed.status === 400 || parsed.status === 422
            ? parsed.message || "Weak password."
            : parsed.status >= 500
              ? "Server error."
              : parsed.message;
      setApiError(friendly);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      id="panel-register"
      role="tabpanel"
      aria-labelledby="tab-register"
      className="flex flex-col gap-lg"
      noValidate
    >
      <FormError message={apiError} />

      <FloatingField<RegisterFormData>
        id="register-email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        icon={Mail}
        register={register}
        error={errors.email?.message}
        delay={0}
      />

      <FloatingField<RegisterFormData>
        id="register-password"
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        icon={Lock}
        register={register}
        error={errors.password?.message}
        delay={50}
      />

      <FloatingField<RegisterFormData>
        id="register-confirm"
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        icon={Lock}
        register={register}
        error={errors.confirmPassword?.message}
        delay={100}
      />

      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        <SubmitButton loading={isSubmitting}>Create account</SubmitButton>
      </div>

      <p
        className="text-body-sm text-foreground-muted text-center animate-fade-in-up"
        style={{ animationDelay: "200ms" }}
      >
        Already have an account?{" "}
        <SwitchLink onClick={onSwitchToLogin}>Sign in</SwitchLink>
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Switch-tab link (animated underline)                              */
/* ------------------------------------------------------------------ */

function SwitchLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-block text-primary font-medium",
        "transition-colors duration-hover ease-hover",
        "hover:text-primary-hover",
        "after:content-[''] after:absolute after:left-0 after:-bottom-[2px]",
        "after:h-[1px] after:w-full after:bg-primary",
        "after:origin-left after:scale-x-0 after:transition-transform after:duration-hover after:ease-hover",
        "hover:after:scale-x-100",
        "focus-visible:outline-none focus-visible:after:scale-x-100",
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Register success card                                             */
/* ------------------------------------------------------------------ */

const AUTO_SWITCH_MS = 2000;

interface RegisterSuccessProps {
  email: string;
  onGoToLogin: () => void;
}

function RegisterSuccess({ email, onGoToLogin }: RegisterSuccessProps) {
  useEffect(() => {
    const t = window.setTimeout(onGoToLogin, AUTO_SWITCH_MS);
    return () => window.clearTimeout(t);
  }, [onGoToLogin]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center text-center gap-md animate-fade-in-up"
      style={{ animationDuration: "300ms" }}
    >
      <div
        className={cn(
          "size-14 rounded-full flex items-center justify-center",
          "bg-primary/10 border border-primary/40",
          "shadow-[0_0_24px_-4px_rgba(34,197,94,0.5)]",
          "animate-pulse-glow",
        )}
      >
        <CheckCircle2 className="size-7 text-primary" />
      </div>

      <div>
        <h3 className="font-headline text-h3 text-foreground mb-xs">
          Account created successfully
        </h3>
        <p className="text-body text-foreground-muted">
          Sign in with your credentials to continue.
        </p>
        <p className="mt-sm text-body-sm text-foreground-muted break-all">
          <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={onGoToLogin}
        className={cn(
          "relative w-full h-12 rounded font-medium text-body mt-sm",
          "bg-primary text-primary-foreground",
          "flex items-center justify-center gap-sm",
          "transition-all duration-hover ease-hover",
          "hover:brightness-110 hover:shadow-[0_8px_24px_-6px_rgba(34,197,94,0.55)]",
          "active:brightness-90 active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt",
        )}
      >
        Go to login
      </button>

      <p className="text-body-sm text-foreground-muted">
        Switching automatically in 2 seconds…
      </p>
    </div>
  );
}
