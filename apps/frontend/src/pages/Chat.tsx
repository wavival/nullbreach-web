import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bot,
  Check,
  Loader2,
  Edit,
  Menu,
  Plus,
  Send,
  Sparkles,
  Trash,
  User,
  X,
} from "lucide-react";
import { request } from "@/services/api";
import { cn } from "@/lib/utils";
import { formatApiError, parseApiError } from "@/lib/errors";
import { formatTimestamp } from "@/lib/date";
import { useError } from "@/hooks/useError";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { Markdown } from "@/components/ui/markdown";
import { InlineError } from "@/components/ui/InlineError";
import type {
  ChatMessage,
  ChatSession,
  CreateMessageResponse,
} from "@/types/chat";

/* ------------------------------------------------------------------ */
/*  Utils                                                             */
/* ------------------------------------------------------------------ */

function deriveTitle(session: ChatSession, messages: ChatMessage[]): string {
  if (session.title && session.title.trim().length > 0) return session.title;
  const firstUser = messages.find((m) => m.role === "user");
  if (firstUser) {
    const snippet = firstUser.content.replace(/\s+/g, " ").trim();
    return snippet.length > 40 ? `${snippet.slice(0, 40)}…` : snippet;
  }
  return "";
}

function genTempId(): string {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const GRID_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(51,65,85,0.6) 0.5px, transparent 0.5px), linear-gradient(to bottom, rgba(51,65,85,0.6) 0.5px, transparent 0.5px)",
  backgroundSize: "40px 40px",
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export function Chat() {
  usePageTitle("Chat");
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>();
  const { showError, showSuccess } = useError();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [pendingAssistant, setPendingAssistant] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const isNarrow = useMediaQuery("(max-width: 1023px)");
  const effectiveSessionsExpanded = isNarrow ? false : sessionsExpanded;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const drawerRef = useFocusTrap<HTMLDivElement>(drawerOpen);

  // Make the off-screen drawer inert (removes it from tab order + a11y tree).
  // Set imperatively because `inert` isn't in React 18's JSX prop types.
  useEffect(() => {
    const el = drawerRef.current;
    if (el) el.inert = !drawerOpen;
  }, [drawerOpen, drawerRef]);

  // Escape closes the mobile drawer (focus restoration handled by useFocusTrap).
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /* -------- Load sessions (callable for retry) -------- */
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
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
      setSessionsError(formatApiError(err));
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  /* -------- Load messages (callable for retry) -------- */
  const loadMessages = useCallback(
    async (id: string) => {
      setMessagesLoading(true);
      setMessagesError(null);
      setMessages([]);
      try {
        const data = await request<
          | ChatMessage[]
          | { items?: ChatMessage[]; results?: ChatMessage[] }
        >({
          url: `/chat/sessions/${id}/messages/`,
          method: "GET",
          silent: true,
        });
        const list = Array.isArray(data)
          ? data
          : data.items ?? data.results ?? [];
        setMessages(list);
      } catch (err) {
        const parsed = parseApiError(err);
        const friendly =
          parsed.status === 404 ? "Session not found" : parsed.message;
        setMessagesError(friendly);
        showError(friendly);
      } finally {
        setMessagesLoading(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    if (!routeSessionId) {
      setMessages([]);
      setMessagesError(null);
      return;
    }
    void loadMessages(routeSessionId);
  }, [routeSessionId, loadMessages]);

  /* -------- Auto-scroll to bottom on new messages --------
     Initial mount + session change jump instantly; subsequent appends animate. */
  const lastScrolledSessionRef = useRef<string | null>(null);
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const isNewSession = lastScrolledSessionRef.current !== routeSessionId;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: isNewSession ? "auto" : "smooth",
    });
    lastScrolledSessionRef.current = routeSessionId ?? null;
  }, [messages.length, pendingAssistant, routeSessionId]);

  /* -------- Focus input on session change -------- */
  useEffect(() => {
    inputRef.current?.focus();
  }, [routeSessionId]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === routeSessionId) ?? null,
    [sessions, routeSessionId],
  );

  const displayedTitle = useMemo(() => {
    if (!activeSession) return null;
    return deriveTitle(activeSession, messages);
  }, [activeSession, messages]);

  /* -------- Actions -------- */

  const handleNewSession = useCallback(async () => {
    setSendError(null);
    try {
      const created = await request<ChatSession>({
        url: "/chat/sessions/",
        method: "POST",
        data: { title: "" },
      });
      setSessions((prev) => [created, ...prev]);
      setDrawerOpen(false);
      navigate(`/chat/${created.id}`);
    } catch (err) {
      setSendError(formatApiError(err));
    }
  }, [navigate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    try {
      await request<void>({
        url: `/chat/sessions/${id}/`,
        method: "DELETE",
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (routeSessionId === id) {
        navigate("/chat");
      }
    } catch (err) {
      setSessionsError(formatApiError(err));
    }
  }, [deleteTarget, navigate, routeSessionId]);

  const handleRename = useCallback(
    async (id: string, nextTitle: string) => {
      const trimmed = nextTitle.trim();
      setRenamingId(null);
      if (trimmed.length === 0) return;
      let prevTitle = "";
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          prevTitle = s.title ?? "";
          return { ...s, title: trimmed };
        }),
      );
      try {
        const updated = await request<ChatSession>({
          url: `/chat/sessions/${id}/`,
          method: "PATCH",
          data: { title: trimmed },
          silent: true,
        });
        setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
        showSuccess("Title updated");
      } catch (err) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, title: prevTitle } : s)),
        );
        const parsed = parseApiError(err);
        const friendly =
          parsed.status === 404
            ? "Session not found"
            : "Error updating title";
        setSessionsError(friendly);
        showError(friendly);
      }
    },
    [showError, showSuccess],
  );

  // Refs allow handleSend to read fresh values without re-creating the callback
  // on every message append.
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const activeSessionRef = useRef<ChatSession | null>(activeSession);
  activeSessionRef.current = activeSession;
  const sendingRef = useRef(false);
  sendingRef.current = sending;

  const handleSend = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || sendingRef.current) return;

      const isFirstUserMessage = !messagesRef.current.some(
        (m) => m.role === "user",
      );
      const sessionTitleBefore =
        activeSessionRef.current?.title?.trim() ?? "";

      let targetId = routeSessionId;
      if (!targetId) {
        try {
          const created = await request<ChatSession>({
            url: "/chat/sessions/",
            method: "POST",
            data: { title: "" },
          });
          setSessions((prev) => [created, ...prev]);
          targetId = created.id;
          navigate(`/chat/${created.id}`, { replace: true });
        } catch (err) {
          setSendError(formatApiError(err));
          return;
        }
      }

      setSendError(null);
      setSending(true);
      setPendingAssistant(true);

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const optimistic: ChatMessage = {
        id: genTempId(),
        session: targetId,
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const res = await request<CreateMessageResponse | ChatMessage>({
          url: `/chat/sessions/${targetId}/messages/`,
          method: "POST",
          data: { content: trimmed },
          silent: true,
          signal: abortControllerRef.current.signal,
        });

        if ("user_message" in res && "assistant_message" in res) {
          setMessages((prev) =>
            prev
              .filter((m) => m.id !== optimistic.id)
              .concat([res.user_message, res.assistant_message]),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimistic.id ? res : m)),
          );
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetId
              ? { ...s, updated_at: new Date().toISOString() }
              : s,
          ),
        );

        if (isFirstUserMessage && !sessionTitleBefore) {
          const derived =
            trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
          try {
            const updated = await request<ChatSession>({
              url: `/chat/sessions/${targetId}/`,
              method: "PATCH",
              data: { title: derived },
              silent: true,
            });
            setSessions((prev) =>
              prev.map((s) => (s.id === targetId ? updated : s)),
            );
          } catch {
            /* non-fatal — title stays derived client-side */
          }
        }
      } catch (err) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        const parsed = parseApiError(err);
        const friendly =
          parsed.status === 404
            ? "Session not found"
            : "Error sending message";
        setSendError(friendly);
        showError(friendly);
      } finally {
        setSending(false);
        setPendingAssistant(false);
      }
    },
    [navigate, routeSessionId, showError],
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */

  return (
    <div className="h-full">
      <h1 className="sr-only">Chat</h1>
      <div className="relative h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)] w-full overflow-hidden bg-gradient-to-br from-surface via-surface to-surface-alt">
        {/* Backgrounds */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={GRID_BG}
        />
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 size-[420px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-40 size-[460px] rounded-full bg-secondary/10 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 flex h-full">
          {/* Sessions sidebar (desktop) */}
          <SessionsSidebar
            className="hidden lg:flex"
            sessions={sessions}
            loading={sessionsLoading}
            error={sessionsError}
            onRetry={() => void loadSessions()}
            activeId={routeSessionId ?? null}
            onSelect={(id) => navigate(`/chat/${id}`)}
            onNew={handleNewSession}
            onRequestDelete={(s) => setDeleteTarget(s)}
            renamingId={renamingId}
            onStartRename={(id) => setRenamingId(id)}
            onCancelRename={() => setRenamingId(null)}
            onCommitRename={handleRename}
            expanded={effectiveSessionsExpanded}
            onToggle={isNarrow ? undefined : () => setSessionsExpanded((v) => !v)}
          />

          {/* Sessions sidebar drawer (mobile). Overlay is decorative; the
              drawer's own close button is the canonical close affordance. */}
          {drawerOpen && (
            <div
              role="presentation"
              aria-hidden="true"
              className="fixed inset-0 z-30 bg-black/60 lg:hidden animate-fade-in"
              onClick={() => setDrawerOpen(false)}
            />
          )}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Sessions"
            aria-hidden={!drawerOpen}
            className={cn(
              "fixed inset-y-0 left-0 z-40 lg:hidden",
              "transition-transform duration-modal ease-modal",
              drawerOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <SessionsSidebar
              className="flex h-full"
              sessions={sessions}
              loading={sessionsLoading}
              error={sessionsError}
              onRetry={() => void loadSessions()}
              activeId={routeSessionId ?? null}
              onSelect={(id) => {
                setDrawerOpen(false);
                navigate(`/chat/${id}`);
              }}
              onNew={async () => {
                setDrawerOpen(false);
                await handleNewSession();
              }}
              onRequestDelete={(s) => setDeleteTarget(s)}
              renamingId={renamingId}
              onStartRename={(id) => setRenamingId(id)}
              onCancelRename={() => setRenamingId(null)}
              onCommitRename={handleRename}
              onCloseDrawer={() => setDrawerOpen(false)}
              expanded
            />
          </div>

          {/* Chat column */}
          <section className="flex min-w-0 md:min-w-[500px] lg:min-w-[600px] flex-1 flex-col">
            <ChatHeader
              title={displayedTitle}
              hasSession={!!activeSession}
              sessionId={activeSession?.id ?? null}
              onOpenDrawer={() => setDrawerOpen(true)}
              onNewSession={handleNewSession}
              onCommitRename={handleRename}
              onDeleteSession={() =>
                activeSession && setDeleteTarget(activeSession)
              }
            />

            <div
              ref={messagesScrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Conversation messages"
              className="flex-1 overflow-y-auto overflow-x-hidden px-md md:px-lg lg:px-xl py-md md:py-lg"
            >
              <div className="mx-auto flex w-full max-w-[860px] flex-col gap-lg">
                {!activeSession && !routeSessionId && <EmptyState />}

                {messagesError && routeSessionId && (
                  <InlineError
                    message={messagesError}
                    onRetry={() => void loadMessages(routeSessionId)}
                  />
                )}

                {messagesLoading && (
                  <>
                    <MessageSkeleton role="user" />
                    <MessageSkeleton role="assistant" />
                  </>
                )}

                {!messagesLoading &&
                  messages.map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}

                {pendingAssistant && <MessageSkeleton role="assistant" />}

                <p aria-live="polite" className="sr-only">
                  {pendingAssistant ? "Assistant is responding…" : ""}
                </p>

                <div ref={messagesEndRef} />
              </div>
            </div>

            {sendError && (
              <div className="px-md md:px-xl pb-sm">
                <div className="mx-auto max-w-[860px]">
                  <InlineError message={sendError} />
                </div>
              </div>
            )}

            <ChatInput
              inputRef={inputRef}
              disabled={sending}
              onSend={handleSend}
            />
          </section>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete conversation"
          description={`"${
            deriveTitle(deleteTarget, []) || "this conversation"
          }" and all its messages will be deleted. This action cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sessions sidebar                                                  */
/* ------------------------------------------------------------------ */

interface SessionsSidebarProps {
  className?: string;
  sessions: ChatSession[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRequestDelete: (session: ChatSession) => void;
  renamingId: string | null;
  onStartRename: (id: string) => void;
  onCancelRename: () => void;
  onCommitRename: (id: string, nextTitle: string) => void;
  onCloseDrawer?: () => void;
  expanded: boolean;
  onToggle?: () => void;
}

function SessionsSidebar({
  className,
  sessions,
  loading,
  error,
  onRetry,
  activeId,
  onSelect,
  onNew,
  onRequestDelete,
  renamingId,
  onStartRename,
  onCancelRename,
  onCommitRename,
  onCloseDrawer,
  expanded,
  onToggle,
}: SessionsSidebarProps) {
  return (
    <aside
      className={cn(
        "shrink-0 flex-col",
        "border-r border-border/70",
        "bg-surface-alt/40 backdrop-blur-xl",
        "transition-[width] duration-300 ease-out",
        expanded ? "w-[250px]" : "w-[60px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-sm border-b border-border/70 py-md",
          expanded ? "px-lg justify-between" : "px-sm justify-center flex-col",
        )}
      >
        {expanded && (
          <div className="flex items-center gap-sm min-w-0">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span className="font-headline text-h4 text-foreground truncate">
              Sessions
            </span>
          </div>
        )}
        <div
          className={cn(
            "flex items-center gap-xs",
            expanded ? "" : "flex-col",
          )}
        >
          <button
            type="button"
            onClick={onNew}
            aria-label="New conversation"
            title={expanded ? undefined : "New conversation"}
            className={cn(
              "size-9 inline-flex items-center justify-center rounded",
              "bg-primary text-primary-foreground",
              "transition-all duration-hover ease-hover",
              "hover:brightness-110 hover:shadow-[0_8px_24px_-6px_rgba(34,197,94,0.55)]",
              "active:brightness-90 active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            )}
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={expanded ? "Collapse sessions" : "Expand sessions"}
              aria-expanded={expanded}
              title={expanded ? "Collapse" : "Expand"}
              className={cn(
                "size-10 inline-flex items-center justify-center rounded",
                "text-foreground-muted hover:text-foreground",
                "hover:bg-surface/60 transition-colors duration-hover",
              )}
            >
              <Menu aria-hidden="true" className="size-6" />
            </button>
          )}
          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="Close"
              className={cn(
                "size-9 inline-flex items-center justify-center rounded",
                "text-foreground-muted hover:text-foreground",
                "hover:bg-surface/60 transition-colors duration-hover",
              )}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-sm">
        {loading && (
          <div className="flex flex-col gap-sm p-sm">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 rounded bg-surface/40 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-sm">
            <InlineError message={error} onRetry={onRetry} />
          </div>
        )}

        {!loading && !error && sessions.length === 0 && expanded && (
          <div className="p-md text-body-sm text-foreground-muted">
            No conversations. Create one with the + button.
          </div>
        )}

        <ul className="flex flex-col gap-xs">
          {sessions.map((s, idx) => (
            <li
              key={s.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(idx * 30, 240)}ms` }}
            >
              <SessionItem
                session={s}
                active={activeId === s.id}
                renaming={renamingId === s.id && expanded}
                collapsed={!expanded}
                onSelect={() => onSelect(s.id)}
                onRequestDelete={() => onRequestDelete(s)}
                onStartRename={() => onStartRename(s.id)}
                onCancelRename={onCancelRename}
                onCommitRename={(t) => onCommitRename(s.id, t)}
              />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Session item                                                      */
/* ------------------------------------------------------------------ */

interface SessionItemProps {
  session: ChatSession;
  active: boolean;
  renaming: boolean;
  collapsed?: boolean;
  onSelect: () => void;
  onRequestDelete: () => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onCommitRename: (nextTitle: string) => void;
}

function SessionItem({
  session,
  active,
  renaming,
  collapsed,
  onSelect,
  onRequestDelete,
  onStartRename,
  onCancelRename,
  onCommitRename,
}: SessionItemProps) {
  const [draft, setDraft] = useState(session.title ?? "");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const display = session.title?.trim() || "New conversation";

  useEffect(() => {
    if (renaming) {
      setDraft(session.title ?? "");
      const t = setTimeout(() => renameInputRef.current?.select(), 0);
      return () => clearTimeout(t);
    }
  }, [renaming, session.title]);

  if (collapsed) {
    const initial = display.trim().charAt(0).toUpperCase() || "•";
    return (
      <button
        type="button"
        onClick={onSelect}
        title={display}
        aria-label={display}
        className={cn(
          "w-full h-10 inline-flex items-center justify-center rounded border",
          "transition-all duration-hover ease-hover",
          active
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-transparent text-foreground hover:border-border hover:bg-surface/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
        )}
      >
        <span className="font-medium text-body-sm">{initial}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded border",
        "transition-all duration-hover ease-hover",
        active
          ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
          : "border-transparent hover:border-border hover:bg-surface/60 hover:shadow-base",
      )}
    >
      {renaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCommitRename(draft);
          }}
          className="flex items-center gap-xs px-md py-sm"
        >
          <input
            ref={renameInputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onCancelRename();
              }
            }}
            autoFocus
            className={cn(
              "flex-1 h-8 rounded px-sm",
              "bg-surface/60 border border-primary/60",
              "text-body text-foreground",
              "focus:outline-none focus:shadow-[0_0_0_3px_rgba(34,197,94,0.18)]",
            )}
          />
          <button
            type="submit"
            aria-label="Save"
            className="size-7 inline-flex items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
          >
            <Check aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCancelRename}
            aria-label="Cancel"
            className="size-7 inline-flex items-center justify-center rounded text-foreground-muted hover:bg-surface/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "w-full text-left px-md py-sm pr-[68px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 rounded",
          )}
        >
          <div
            className={cn(
              "truncate text-body font-medium",
              active ? "text-primary" : "text-foreground",
            )}
          >
            {display}
          </div>
          <div className="truncate text-body-sm text-foreground-muted">
            {formatTimestamp(session.updated_at || session.created_at)}
          </div>
        </button>
      )}

      {!renaming && (
        <div
          className={cn(
            "absolute right-sm top-1/2 -translate-y-1/2 flex items-center gap-xs",
            "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            "transition-opacity duration-hover ease-hover",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename();
            }}
            aria-label="Rename"
            className={cn(
              "size-7 inline-flex items-center justify-center rounded",
              "text-foreground-muted hover:text-secondary",
              "hover:bg-secondary/15 transition-colors duration-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
            )}
          >
            <Edit aria-hidden="true" className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            aria-label="Delete"
            className={cn(
              "size-7 inline-flex items-center justify-center rounded",
              "text-foreground-muted hover:text-error",
              "hover:bg-error/15 hover:shadow-[0_0_12px_-2px_rgba(255,139,124,0.5)]",
              "transition-all duration-hover ease-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
            )}
          >
            <Trash aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat header                                                       */
/* ------------------------------------------------------------------ */

interface ChatHeaderProps {
  title: string | null;
  hasSession: boolean;
  sessionId: string | null;
  onOpenDrawer: () => void;
  onNewSession: () => void;
  onCommitRename: (id: string, nextTitle: string) => void;
  onDeleteSession: () => void;
}

function ChatHeader({
  title,
  hasSession,
  sessionId,
  onOpenDrawer,
  onNewSession,
  onCommitRename,
  onDeleteSession,
}: ChatHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function startEdit() {
    if (!sessionId) return;
    setDraft(title ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    if (!sessionId || !editing) return;
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === (title ?? "").trim()) return;
    onCommitRename(sessionId, trimmed);
  }

  function cancel() {
    setEditing(false);
    setDraft("");
  }

  return (
    <header
      className={cn(
        "shrink-0",
        "flex items-center justify-between gap-sm",
        "px-md md:px-lg lg:px-xl py-sm md:py-md",
        "border-b border-border/70",
        "bg-surface-alt/30 backdrop-blur-xl",
      )}
    >
      <div className="flex min-w-0 items-center gap-sm flex-1">
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open sessions list"
          className={cn(
            "lg:hidden size-10 inline-flex items-center justify-center shrink-0",
            "text-foreground hover:bg-surface-alt transition-colors duration-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
          )}
        >
          <Menu aria-hidden="true" className="size-6" />
        </button>
        <button
          type="button"
          onClick={onNewSession}
          aria-label="New conversation"
          title="New conversation"
          className={cn(
            "lg:hidden size-10 inline-flex items-center justify-center shrink-0",
            "text-foreground hover:bg-surface-alt transition-colors duration-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
          )}
        >
          <Plus aria-hidden="true" className="size-6" />
        </button>
        {editing && hasSession ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            autoFocus
            className={cn(
              "flex-1 min-w-0 h-9 rounded px-sm",
              "bg-surface/60 border border-primary/60",
              "font-headline text-body-sm text-foreground",
              "focus:outline-none focus:shadow-[0_0_0_3px_rgba(34,197,94,0.18)]",
            )}
          />
        ) : (
          <button
            type="button"
            onClick={hasSession ? startEdit : undefined}
            disabled={!hasSession}
            title={hasSession ? "Edit title" : undefined}
            className={cn(
              "min-w-0 text-left rounded",
              hasSession &&
                "hover:bg-surface/40 transition-colors duration-hover px-xs -mx-xs cursor-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
            )}
          >
            <h2
              className={cn(
                "truncate font-headline text-body-sm text-foreground",
                !title && "text-foreground-muted",
              )}
            >
              {title}
            </h2>
          </button>
        )}
      </div>

      {hasSession && (
        <div className="flex items-center gap-xs">
          <button
            type="button"
            onClick={editing ? commit : startEdit}
            aria-label={editing ? "Save title" : "Rename session"}
            className={cn(
              "size-9 inline-flex items-center justify-center rounded",
              editing
                ? "text-primary hover:bg-primary/15"
                : "text-foreground-muted hover:text-secondary hover:bg-secondary/15",
              "transition-colors duration-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
            )}
          >
            {editing ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Edit aria-hidden="true" className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onDeleteSession}
            aria-label="Delete session"
            className={cn(
              "size-9 inline-flex items-center justify-center rounded",
              "text-foreground-muted hover:text-error",
              "hover:bg-error/15 transition-colors duration-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50",
            )}
          >
            <Trash aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center py-2xl animate-fade-in-up">
      <div
        className={cn(
          "size-16 rounded-full flex items-center justify-center",
          "bg-primary/10 border border-primary/30 mb-lg",
          "shadow-[0_0_24px_-4px_rgba(34,197,94,0.35)]",
        )}
      >
        <Sparkles className="size-7 text-primary" />
      </div>
      <h3 className="font-headline text-h3 text-foreground mb-sm">
        Ask about cybersecurity
      </h3>
      <p className="max-w-[440px] text-body text-foreground-muted">
        Vulnerabilities, OWASP, hardening, threat modeling, code analysis.
        Start typing below. I'll create a session automatically.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message bubble                                                    */
/* ------------------------------------------------------------------ */

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex items-end gap-sm animate-fade-in-up",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div
          className={cn(
            "size-8 shrink-0 rounded-full flex items-center justify-center",
            "bg-primary/10 border border-primary/30",
          )}
        >
          <Bot className="size-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "min-w-0 max-w-[85%] flex flex-col gap-xs",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "min-w-0 max-w-full overflow-hidden break-words rounded px-md py-sm text-body",
            isUser
              ? "bg-secondary text-secondary-foreground shadow-subtle"
              : "bg-surface-alt/80 border border-border text-foreground shadow-base backdrop-blur-sm",
          )}
        >
          <MessageContent content={message.content} role={message.role} />
        </div>
        <span className="text-body-sm text-foreground-muted px-xs">
          {formatTimestamp(message.created_at)}
        </span>
      </div>

      {isUser && (
        <div
          className={cn(
            "size-8 shrink-0 rounded-full flex items-center justify-center",
            "bg-secondary/15 border border-secondary/40",
          )}
        >
          <User className="size-4 text-secondary" />
        </div>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/*  Message content — assistant uses Markdown, user stays plain text. */
/* ------------------------------------------------------------------ */

function MessageContent({
  content,
  role,
}: {
  content: string;
  role: "user" | "assistant";
}) {
  if (role === "assistant") {
    return <Markdown>{content}</Markdown>;
  }
  return (
    <div className="whitespace-pre-wrap break-words">{content}</div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message skeleton                                                  */
/* ------------------------------------------------------------------ */

function MessageSkeleton({ role }: { role: "user" | "assistant" }) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex items-end gap-sm animate-fade-in",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="size-8 shrink-0 rounded-full bg-primary/10 border border-primary/30 animate-pulse" />
      )}
      <div
        className={cn(
          "flex flex-col gap-xs",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "rounded px-md py-sm",
            isUser
              ? "bg-secondary/60"
              : "bg-surface-alt/80 border border-border",
            "animate-pulse",
          )}
        >
          <div className="h-3 w-[180px] rounded bg-foreground/15 mb-xs" />
          <div className="h-3 w-[120px] rounded bg-foreground/15" />
        </div>
      </div>
      {isUser && (
        <div className="size-8 shrink-0 rounded-full bg-secondary/15 border border-secondary/40 animate-pulse" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chat input                                                        */
/* ------------------------------------------------------------------ */

interface ChatInputProps {
  inputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  disabled: boolean;
  onSend: (content: string) => void;
}

function ChatInput({ inputRef, disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const hintId = useId();

  const adjustHeight = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    const next = Math.min(120, Math.max(48, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    if (inputRef.current) adjustHeight(inputRef.current);
  }, [value, inputRef, adjustHeight]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const empty = value.trim().length === 0;

  return (
    <div className="px-md md:px-lg lg:px-xl pb-md md:pb-lg pt-sm">
      <div className="mx-auto flex max-w-[860px] flex-col gap-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-md"
        >
          <div
            className={cn(
              "group relative flex-1",
              disabled && "opacity-80",
            )}
          >
            <Sparkles
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-md top-1/2 -translate-y-1/2 size-6",
                "text-primary opacity-70",
                "transition-opacity duration-hover",
                "group-focus-within:opacity-100",
              )}
            />
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKey}
              disabled={disabled}
              rows={1}
              aria-label="Message"
              aria-describedby={hintId}
              placeholder="Ask about cybersecurity..."
              className={cn(
                "block w-full rounded resize-y",
                "min-h-[48px] max-h-[120px]",
                "py-md pr-md pl-9 text-body text-foreground placeholder:text-foreground-muted",
                "bg-surface-alt/60 backdrop-blur-xl",
                "border border-border",
                "transition-all duration-hover ease-hover",
                "focus:outline-none focus:bg-surface focus:border-primary focus:shadow-[0_0_0_4px_rgba(34,197,94,0.18)]",
                "disabled:cursor-not-allowed",
              )}
              style={{ height: 48 }}
            />
          </div>
          <SendButton disabled={disabled || empty} loading={disabled} />
        </form>
        <p id={hintId} className="text-body-sm text-foreground-muted px-xs">
          <kbd className="font-mono">Enter</kbd> send ·{" "}
          <kbd className="font-mono">Shift+Enter</kbd> new line
        </p>
      </div>
    </div>
  );
}

function SendButton({
  disabled,
  loading,
}: {
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Send message"
      className={cn(
        "size-12 shrink-0 inline-flex items-center justify-center rounded",
        "bg-primary text-primary-foreground",
        "transition-all duration-hover ease-hover",
        "hover:brightness-110 hover:shadow-[0_8px_24px_-6px_rgba(34,197,94,0.55)]",
        "active:brightness-90 active:scale-[0.97]",
        "disabled:bg-disabled disabled:opacity-50 disabled:cursor-not-allowed",
        "disabled:hover:shadow-none disabled:hover:brightness-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt",
      )}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="size-5 animate-spin" />
      ) : (
        <Send aria-hidden="true" className="size-5" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm modal                                                     */
/* ------------------------------------------------------------------ */

interface ConfirmModalProps {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-lg">
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "relative z-10 w-full max-w-[420px]",
          "rounded border border-border/70",
          "bg-surface-alt/90 backdrop-blur-xl shadow-large",
          "p-xl animate-card-in",
        )}
      >
        <div className="flex items-start gap-sm mb-md">
          <div className="size-9 rounded-full bg-error/15 border border-error/40 flex items-center justify-center shrink-0">
            <Trash aria-hidden="true" className="size-4 text-error" />
          </div>
          <div>
            <h4 id={titleId} className="font-headline text-h4 mb-xs">
              {title}
            </h4>
            <p id={descId} className="text-body-sm text-foreground-muted">
              {description}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-sm">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "h-10 px-lg rounded text-body font-medium",
              "bg-transparent border border-border text-foreground",
              "hover:bg-surface/60 hover:border-neutral",
              "transition-colors duration-hover ease-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "h-10 px-lg rounded text-body font-medium",
              "bg-error text-tertiary-foreground",
              "transition-all duration-hover ease-hover",
              "hover:brightness-110 hover:shadow-[0_8px_24px_-6px_rgba(255,139,124,0.55)]",
              "active:brightness-90 active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/50",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
