"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, MessageCircle, RotateCcw, Square, Trash2, X } from "lucide-react";

import { PaperCreature } from "@/components/brand/paper-creature";
import { getAppCheckToken } from "@/lib/firebase/client";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/prompt";
import { clearSession, loadSession, saveSession } from "@/lib/chat/session";
import { CREATURE_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Ask Tala" — the landing-page assistant.
 *
 * Exists for the one question the FAQ structurally cannot answer: "does it
 * cover MY subject / MY board exam?" The eight questions people actually ask
 * are already on the page; the long tail of coverage questions is not
 * enumerable, and Tuón has good answers for it.
 *
 * It is a conversation rather than a search box, which means it has to forgive
 * mistakes: a bad answer can be retried, a wandering thread can be started
 * over, a slow one can be stopped, and a reload does not lose the thread. A
 * chat you cannot back out of is a form with extra steps.
 *
 * The panel REMOVES ITSELF if the server has no key configured. A chat widget
 * that opens and then apologises is worse than no widget, and the same
 * fallback-rather-than-break rule already governs verification email.
 */

const SUGGESTIONS = [
  "Does it cover my strand?",
  "Can I use it for the CPALE?",
  "Is it really free?",
  "Who can see my notes?",
];

interface Turn {
  role: "user" | "assistant";
  content: string;
  /** Set when the reply failed, so it can be retried and styled apart. */
  failed?: boolean;
}

export function AskTuon() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const reduce = useReducedMotion();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** Lets an in-flight answer be stopped rather than waited out. */
  const abortRef = useRef<AbortController | null>(null);
  /** Restore runs once, on first open. */
  const restored = useRef(false);

  /**
   * Opening restores any conversation from this tab.
   *
   * Done here rather than in an effect on mount for two reasons: React 19
   * rightly rejects setState-in-effect, and sessionStorage is unavailable
   * during SSR — reading it in render would mismatch hydration. An event
   * handler has neither problem, and nothing is read at all until someone
   * opens the chat.
   */
  function openPanel() {
    if (!restored.current) {
      restored.current = true;
      const saved = loadSession();
      if (saved.length) setTurns(saved);
    }
    setOpen(true);
  }

  useEffect(() => {
    // Guarded on `restored`, and that guard is load-bearing. This effect also
    // runs on mount, when `turns` is still empty — without the guard it wrote
    // an empty conversation over the stored one before anyone had opened the
    // panel, so a reload always came back blank. Persistence that erases what
    // it was meant to keep is worse than none.
    if (!restored.current) return;
    saveSession(turns.filter((t) => !t.failed));
  }, [turns]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Abandoning an in-flight request on unmount stops a setState after teardown.
  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * Sends `history` (which must end on a user turn) and appends the answer.
   *
   * Takes the history rather than reading state so retry can re-send an
   * earlier point in the conversation without first mutating what is on screen.
   */
  const ask = useCallback(async (history: Turn[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setTurns(history);
    setPending(true);

    try {
      const appCheckToken = await getAppCheckToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
        },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        reply?: string;
        code?: string;
        error?: string;
      };

      if (body.code === "CHAT_NOT_CONFIGURED") {
        setUnavailable(true);
        setOpen(false);
        return;
      }

      setTurns([
        ...history,
        response.ok && body.reply
          ? { role: "assistant", content: body.reply }
          : {
              role: "assistant",
              content:
                body.error ??
                "Could not answer that one. The FAQ below covers the usual questions.",
              failed: true,
            },
      ]);
    } catch (error) {
      // A stop is not a failure; leave the conversation exactly as it was.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setTurns([
        ...history,
        {
          role: "assistant",
          content:
            "Could not reach the server. Check your connection, or read the FAQ below.",
          failed: true,
        },
      ]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setPending(false);
    }
  }, []);

  function send(text: string) {
    const question = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!question || pending) return;
    setDraft("");
    void ask([...turns, { role: "user", content: question }]);
  }

  /** Re-asks the last question, discarding the answer that came back. */
  function retry() {
    if (pending) return;
    const lastUser = turns.findLastIndex((t) => t.role === "user");
    if (lastUser === -1) return;
    void ask(turns.slice(0, lastUser + 1));
  }

  function startOver() {
    abortRef.current?.abort();
    setPending(false);
    setTurns([]);
    setDraft("");
    clearSession();
    inputRef.current?.focus();
  }

  function stop() {
    abortRef.current?.abort();
    setPending(false);
  }

  if (unavailable) return null;

  const canRetry = !pending && turns.some((t) => t.role === "assistant");

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label={`Ask ${CREATURE_NAME} about Tuón`}
            className="border-border bg-card fixed right-4 bottom-4 z-50 flex max-h-[min(34rem,calc(100dvh-2rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border shadow-xl sm:right-6 sm:bottom-6 sm:w-96"
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <PaperCreature
                state={pending ? "thinking" : "idle"}
                className="size-9 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Ask {CREATURE_NAME}</p>
                <p className="text-muted-foreground text-xs">
                  Questions about Tuón only
                </p>
              </div>
              {turns.length > 0 ? (
                <button
                  type="button"
                  onClick={startOver}
                  aria-label="Start over"
                  title="Start over"
                  className="hover:bg-muted text-muted-foreground rounded-lg p-1.5 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="hover:bg-muted rounded-lg p-1.5 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              aria-live="polite"
            >
              {turns.length === 0 ? (
                <div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    I can tell you whether Tuón covers your subject or your board
                    exam, what it costs, and who can see your notes.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="border-border hover:border-primary/40 hover:bg-accent/40 rounded-full border px-3 py-1.5 text-xs transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    turn.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : turn.failed
                        ? "border-destructive/30 text-muted-foreground border"
                        : "bg-muted",
                  )}
                >
                  {turn.content}
                </div>
              ))}

              {pending ? (
                <div className="bg-muted text-muted-foreground flex w-fit items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm">
                  <span className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="bg-muted-foreground/60 size-1.5 rounded-full"
                        animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          delay: d * 0.15,
                        }}
                      />
                    ))}
                  </span>
                  <span className="sr-only">Thinking</span>
                </div>
              ) : null}

              {canRetry ? (
                <button
                  type="button"
                  onClick={retry}
                  className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-colors"
                >
                  <RotateCcw className="size-3" />
                  Ask that again
                </button>
              ) : null}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex items-end gap-2 border-t p-3"
            >
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                rows={1}
                placeholder={
                  turns.length ? "Ask a follow-up…" : "Ask about Tuón…"
                }
                aria-label="Your question"
                className="placeholder:text-muted-foreground max-h-24 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none"
              />
              {pending ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={stop}
                  aria-label="Stop"
                  className="size-9 shrink-0"
                >
                  <Square className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!draft.trim()}
                  aria-label="Send"
                  className="size-9 shrink-0"
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <motion.button
          type="button"
          onClick={openPanel}
          initial={reduce ? undefined : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full py-3 pr-5 pl-4 shadow-lg transition-colors sm:right-6 sm:bottom-6"
        >
          <MessageCircle className="size-4" />
          <span className="text-sm font-medium">Ask {CREATURE_NAME}</span>
        </motion.button>
      ) : null}
    </>
  );
}
