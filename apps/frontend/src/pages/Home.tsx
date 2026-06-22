import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  MessageSquarePlus,
  Sparkles,
} from "lucide-react";
import { request } from "@/services/api";
import { cn } from "@/lib/utils";
import { formatApiError } from "@/lib/errors";
import { formatTimestampWithToday } from "@/lib/date";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";
import { InlineError } from "@/components/ui/InlineError";
import type { ChatSession } from "@/types/chat";

export function Home() {
  usePageTitle("Home");
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await request<
        | ChatSession[]
        | { items?: ChatSession[]; results?: ChatSession[] }
      >({
        url: "/chat/sessions/",
        method: "GET",
      });
      const list = Array.isArray(data)
        ? data
        : data.items ?? data.results ?? [];
      setSessions(list);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function handleNewSession() {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await request<ChatSession>({
        url: "/chat/sessions/",
        method: "POST",
        data: { title: "" },
      });
      navigate(`/chat/${created.id}`);
    } catch (err) {
      setCreateError(formatApiError(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-xl animate-fade-in-up">
      <header className="flex flex-col gap-sm">
        <div className="flex items-center gap-sm text-foreground-muted">
          <Sparkles className="size-4 text-primary" />
          <span className="text-body-sm">
            {user?.email ? `Hi, ${user.email}` : "Welcome"}
          </span>
        </div>
        <h1 className="font-headline text-h1 text-foreground">
          Your conversations
        </h1>
        <p className="text-body text-foreground-muted max-w-[640px]">
          Pick up where you left off or start a new conversation about
          cybersecurity.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-md sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleNewSession}
          disabled={creating}
          className={cn(
            "inline-flex items-center justify-center gap-sm h-11 px-lg rounded",
            "bg-primary text-primary-foreground font-medium",
            "transition-all duration-hover ease-hover",
            "hover:brightness-110 hover:shadow-[0_8px_24px_-6px_rgba(34,197,94,0.55)]",
            "active:brightness-90 active:scale-[0.99]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          )}
        >
          <MessageSquarePlus className="size-4" />
          {creating ? "Creating…" : "New conversation"}
        </button>

        {!loading && !error && sessions.length > 0 && (
          <span className="text-body-sm text-foreground-muted">
            {sessions.length}{" "}
            {sessions.length === 1 ? "conversation" : "conversations"}
          </span>
        )}
      </div>

      {createError && <InlineError message={createError} />}

      {loading && <SessionsGridSkeleton />}

      {!loading && error && (
        <InlineError message={error} onRetry={() => void loadSessions()} />
      )}

      {!loading && !error && sessions.length === 0 && <EmptyState />}

      {!loading && !error && sessions.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
          {sessions.map((s, idx) => (
            <li
              key={s.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
            >
              <SessionCard
                session={s}
                onClick={() => navigate(`/chat/${s.id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SessionCard({
  session,
  onClick,
}: {
  session: ChatSession;
  onClick: () => void;
}) {
  const title = session.title?.trim() || "New conversation";
  const ts = session.updated_at || session.created_at;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left p-lg rounded",
        "border border-border/70 bg-surface-alt/60 backdrop-blur-sm",
        "transition-all duration-hover ease-hover",
        "hover:border-primary/60 hover:shadow-[0_8px_24px_-8px_rgba(34,197,94,0.35)]",
        "hover:-translate-y-[2px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      <div className="flex items-start gap-sm">
        <div
          className={cn(
            "size-9 shrink-0 rounded-full flex items-center justify-center",
            "bg-primary/10 border border-primary/30",
            "transition-colors duration-hover",
            "group-hover:bg-primary/15",
          )}
        >
          <MessageSquare className="size-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-body text-foreground">
            {title}
          </p>
          <p className="mt-xs text-body-sm text-foreground-muted">
            {formatTimestampWithToday(ts)}
          </p>
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-3xl px-lg rounded",
        "border border-dashed border-border/70 bg-surface-alt/30",
        "animate-fade-in-up",
      )}
    >
      <div
        className={cn(
          "size-14 rounded-full flex items-center justify-center mb-md",
          "bg-primary/10 border border-primary/30",
          "shadow-[0_0_24px_-4px_rgba(34,197,94,0.35)]",
        )}
      >
        <MessageSquarePlus className="size-6 text-primary" />
      </div>
      <h3 className="font-headline text-h4 text-foreground mb-xs">
        Start a new conversation
      </h3>
      <p className="max-w-[420px] text-body-sm text-foreground-muted">
        You don't have any conversations yet. Create one to start chatting
        about cybersecurity.
      </p>
    </div>
  );
}

function SessionsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-20 rounded border border-border/70 bg-surface-alt/40 animate-pulse"
        />
      ))}
    </div>
  );
}

