"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUp,
  BookOpen,
  Check,
  Pin,
  PinOff,
  RotateCcw,
  Plus,
  LoaderCircle,
  ArrowUpRight,
} from "lucide-react";
import { api, authHeaders } from "@/lib/api";
import type { Session, Constraints, AgentEvent } from "@/lib/types";
import { AgentActivity } from "@/components/agent-activity";
import { BookCard } from "@/components/book-card";
import { Loading, Empty } from "@/components/ui";
import { useApp } from "@/components/provider";
export default function LibrarianPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LibrarianInner />
    </Suspense>
  );
}
function LibrarianInner() {
  const search = useSearchParams();
  const { config, notify } = useApp();
  const [session, setSession] = useState<Session | null>(null),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [initialLoading, setInitialLoading] = useState(true),
    [pinDraft, setPinDraft] = useState(""),
    [mobileTab, setMobileTab] = useState("conversation"),
    [liveEvents, setLiveEvents] = useState<AgentEvent[]>([]),
    [pendingText, setPendingText] = useState("");
  const autoSubmitted = useRef(false);
  const once = useRef(false),
    abort = useRef<AbortController | null>(null),
    end = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const begin = async () => {
      try {
        const saved = localStorage.getItem("shelfsense-session");
        let s: Session;
        if (saved && !search.get("q")) {
          try {
            s = await api<Session>(`sessions/${saved}`);
          } catch {
            s = await api<Session>("sessions", { method: "POST" });
          }
        } else s = await api<Session>("sessions", { method: "POST" });
        setSession(s);
        localStorage.setItem("shelfsense-session", s.id);
        setText(search.get("q") || "");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setInitialLoading(false);
      }
    };
    begin();
    return () => abort.current?.abort();
  }, [search]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [session?.messages.length]);
  const send = async (
    message = text,
    exclude: string[] = [],
    pins = session?.pins,
    constraints?: Constraints,
  ) => {
    if (!session || busy || !message.trim()) return;
    setBusy(true);
    setError("");
    setText("");
    setLiveEvents([]);
    setPendingText(message);
    abort.current = new AbortController();
    try {
      const response = await fetch(`/api/sessions/${session.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeaders()),
        },
        body: JSON.stringify({
          text: message,
          exclude,
          pins,
          constraints,
          expected_version: session.version,
        }),
        signal: abort.current.signal,
      });
      if (!response.ok) {
        const r = await response.json();
        throw new Error(r.detail || "Could not complete your request.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response stream is unavailable.");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";
        for (const block of blocks) {
          const event = block.match(/^event: (.+)$/m)?.[1],
            data = block.match(/^data: (.+)$/m)?.[1];
          if (event === "done" && data) setSession(JSON.parse(data));
          if ((event === "agent" || event === "tool") && data)
            setLiveEvents((previous) => [
              ...previous,
              { event, ...JSON.parse(data) },
            ]);
          if (event === "error" && data)
            throw new Error(JSON.parse(data).message);
        }
      }
      setMobileTab("books");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        const latest = await api<Session>(`sessions/${session.id}`).catch(
          () => null,
        );
        if (latest) setSession(latest);
        notify("Stopped waiting. Your last completed request is preserved.");
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
      setPendingText("");
    }
  };
  useEffect(() => {
    const initialQuery = search.get("q");
    if (session && !initialLoading && initialQuery && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void send(initialQuery);
    }
  }, [session, initialLoading, search]);
  const newSession = async () => {
    try {
      const s = await api<Session>("sessions", { method: "POST" });
      setSession(s);
      setLiveEvents([]);
      localStorage.setItem("shelfsense-session", s.id);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const undo = async () => {
    if (!session) return;
    try {
      setSession(
        await api<Session>(`sessions/${session.id}/undo`, { method: "POST" }),
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const pin = (value: string) => {
    if (!session) return;
    setSession({
      ...session,
      pins: session.pins.includes(value)
        ? session.pins.filter((p) => p !== value)
        : [...session.pins, value].slice(0, 10),
    });
  };
  const stateLabels = session
    ? Object.entries(session.constraints)
        .filter(([, v]) => v !== false && v !== "" && v !== null)
        .map(([k, v]) => `${k.replaceAll("_", " ")}: ${v === true ? "yes" : v}`)
    : [];
  return (
    <div className="wrap page librarian-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL READING COMPANION</span>
          <h1>
            A little <em>guidance.</em>
          </h1>
          <p>A conversation that leads somewhere worth reading.</p>
        </div>
        <button
          className="button secondary"
          disabled={busy}
          onClick={newSession}
        >
          <Plus size={16} /> New conversation
        </button>
      </div>
      <div className="mobile-tabs">
        <button
          className={mobileTab === "conversation" ? "selected" : ""}
          onClick={() => setMobileTab("conversation")}
        >
          Conversation
        </button>
        <button
          className={mobileTab === "books" ? "selected" : ""}
          onClick={() => setMobileTab("books")}
        >
          Your books
        </button>
      </div>
      <div className="librarian-layout">
        <section
          className={
            "conversation-panel " +
            (mobileTab === "conversation" ? "mobile-active" : "")
          }
        >
          <div className="librarian-identity">
            <span className="brand-icon">
              <BookOpen size={22} />
            </span>
            <div>
              <strong>The ShelfSense librarian</strong>
              <small>
                {config?.openai
                  ? "OpenAI specialists · catalog-backed results"
                  : "Local catalog mode · OpenAI agents ready to connect"}
              </small>
            </div>
            <span className="status-dot" />
          </div>
          <div className="conversation-messages">
            {initialLoading ? (
              <Loading />
            ) : (
              <>
                <div className="message assistant">
                  <p>Hello, curious reader. What would you like to find?</p>
                  <p>
                    Tell me a favorite book, a feeling, or something you want to
                    learn. We’ll find a few good places to start.
                  </p>
                </div>
                {!session?.messages.length && (
                  <div className="suggested-requests">
                    {[
                      "A short, hopeful read under 300 pages",
                      "A clever mystery with a surprising ending",
                      "Beginner-friendly books about artificial intelligence",
                    ].map((t) => (
                      <button key={t} disabled={busy} onClick={() => send(t)}>
                        {t}
                        <ArrowUpRight size={13} />
                      </button>
                    ))}
                  </div>
                )}
                {session?.messages.map((m, i) => (
                  <div key={i} className={"message " + m.role}>
                    {m.role === "user" && <small>YOU</small>}
                    <p>{m.text}</p>
                  </div>
                ))}
                {busy && (
                  <div className="message user">
                    <small>YOU</small>
                    <p>{pendingText}</p>
                  </div>
                )}
                {busy && (
                  <div className="working" role="status">
                    <LoaderCircle size={16} className="spin" /> Finding your
                    next chapter…
                  </div>
                )}
                <div ref={end} />
              </>
            )}
          </div>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              aria-label="Message your librarian"
              placeholder="Tell me what you feel like reading…"
              maxLength={1500}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            {busy ? (
              <button
                type="button"
                onClick={() => abort.current?.abort()}
                className="stop-button"
              >
                Stop
              </button>
            ) : (
              <button
                disabled={!session || !text.trim()}
                aria-label="Send request"
              >
                <ArrowUp size={20} />
              </button>
            )}
          </form>
          <p className="fineprint composer-note">
            Real catalog books. Clear reasons. Find where to get them from each
            book page.
          </p>
          <details className="reader-advanced">
            <summary>How recommendations work</summary>
            <AgentActivity
              events={busy ? liveEvents : session?.agent_trace || liveEvents}
              busy={busy}
              configured={!!config?.openai}
            />
          </details>
        </section>
        <section
          className={
            "shortlist-panel " + (mobileTab === "books" ? "mobile-active" : "")
          }
        >
          <div className="shortlist-heading">
            <div>
              <span className="eyebrow">A FEW GOOD POSSIBILITIES</span>
              <h2>Your next chapter</h2>
            </div>
            <button
              className="text-button"
              onClick={undo}
              disabled={busy || !session?.version}
            >
              <RotateCcw size={14} /> Undo
            </button>
          </div>
          <details className="reader-advanced">
            <summary>Refine your preferences</summary>
            <div className="preference-tray">
              <span className="fineprint">KEEP WHAT YOU LIKE</span>
              <div className="chips">
                {session?.pins.map((p) => (
                  <button className="selected" key={p} onClick={() => pin(p)}>
                    <Pin size={12} />
                    {p}
                    <PinOff size={12} />
                  </button>
                ))}
                {["friendship", "problem-solving", "hope"]
                  .filter((p) => !session?.pins.includes(p))
                  .map((p) => (
                    <button key={p} onClick={() => pin(p)}>
                      <Plus size={12} />
                      {p}
                    </button>
                  ))}
              </div>
              <form
                className="pin-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (pinDraft.trim()) pin(pinDraft.trim().slice(0, 60));
                  setPinDraft("");
                }}
              >
                <input
                  aria-label="Add a preferred attribute"
                  value={pinDraft}
                  onChange={(e) => setPinDraft(e.target.value)}
                  placeholder="Add your own attribute"
                  maxLength={60}
                />
                <button aria-label="Pin attribute">
                  <Plus size={15} />
                </button>
              </form>
              {stateLabels.length > 0 && (
                <div className="active-rules">
                  {stateLabels.map((l) => (
                    <span key={l}>
                      <Check size={11} />
                      {l}
                    </span>
                  ))}
                </div>
              )}
              <div className="remix-buttons">
                <button
                  disabled={busy || !session?.books.length}
                  onClick={() => send("Make it shorter")}
                >
                  Make it shorter
                </button>
                <button
                  disabled={busy || !session?.books.length}
                  onClick={() => send("Beginner friendly please")}
                >
                  A gentler start
                </button>
                <button
                  disabled={busy || !session?.books.length}
                  onClick={() => send("No romance please")}
                >
                  Less romance
                </button>
              </div>
            </div>
          </details>
          {session?.books.length ? (
            <div className={"shortlist-grid " + (busy ? "updating" : "")}>
              {session.books.map((b) => (
                <BookCard
                  recommendation
                  key={b.id}
                  book={b}
                  onRefine={(t, id) => send(t, id ? [id] : [])}
                />
              ))}
            </div>
          ) : (
            <Empty
              title={
                session?.version
                  ? "No verified matches yet"
                  : "A shelf with your name on it"
              }
              text={
                session?.version
                  ? "Try removing a constraint or asking for a different kind of book."
                  : "Start a conversation. Your recommendations and the reasons behind them will appear here."
              }
            >
              <Link href="/discover" className="text-link">
                Or explore the catalog <ArrowRightIcon />
              </Link>
            </Empty>
          )}
          <p className="web-search-entry">
            <Link
              className="text-link"
              href={
                "/search?source=web&q=" +
                encodeURIComponent(session?.query || "")
              }
            >
              Find more books on the web <ArrowUpRight size={14} />
            </Link>
          </p>
          {!!session?.learning_steps?.length && (
            <section className="generated-path">
              <span className="eyebrow">YOUR LEARNING SEQUENCE</span>
              <h3>A starting point, then a next step.</h3>
              {session.learning_steps.map((step, i) => (
                <Link href={"/books/" + step.work_id} key={step.work_id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.prerequisite}</p>
                  </div>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </section>
          )}
          {session?.provider === "fallback" && (
            <div className="callout">
              The model service was unavailable. These results use local catalog
              search.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={15} />;
}
