"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUp, RotateCcw, Square, Trash2 } from "lucide-react";

import { PaperCreature } from "@/components/brand/paper-creature";
import { getAppCheckToken } from "@/lib/firebase/client";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/prompt";
import {
  clearSession,
  getServerSessionSnapshot,
  getSessionSnapshot,
  saveSession,
  subscribeSession,
  type StoredTurn,
} from "@/lib/chat/session";
import { CREATURE_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Ask Tala" — the landing-page assistant, as a section rather than a bubble.
 *
 * It exists for the one question the FAQ structurally cannot answer: "does it
 * cover MY subject / MY board exam?" The eight questions people actually ask
 * are already on the page; the long tail of coverage questions is not
 * enumerable, and Tuón has good answers for it.
 *
 * WHY NOT the bottom-right bubble it started as. That position is a
 * convention, and the convention means "support widget for existing
 * customers" — people have learned to skip it. This is not support. It is the
 * answer to "does this fit me", which is the last objection before signing up,
 * so it belongs in the reading order at the moment the FAQ runs out of
 * answers. The bubble also fought the sticky CTA for the same corner of a
 * phone screen, and covered the page it was trying to sell.
 *
 * The section REMOVES ITSELF if the server has no key configured. A chat box
 * that answers "chat is unavailable" is worse than no chat box, and the same
 * fallback-rather-than-break rule already governs verification email.
 */

const SUGGESTIONS = [
  "Does it cover my strand?",
  "Can I use it for the CPALE?",
  "Is it really free?",
  "Who can see my notes?",
];

export function AskTuon() {
  // sessionStorage is the store, read the way OfflineIndicator reads
  // `navigator` — no effect, no hydration mismatch, no empty flash.
  const turns = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const reduce = useReducedMotion();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  /** Lets an in-flight answer be stopped rather than waited out. */
  const abortRef = useRef<AbortController | null>(null);

  // Abandoning an in-flight request on unmount stops a setState after teardown.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Follow the newest message, but only once there is a thread to follow —
  // otherwise this would yank the page on first paint.
  useEffect(() => {
    if (turns.length === 0) return;
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [turns, pending]);

  /**
   * Sends `history` (which must end on a user turn) and stores the answer.
   *
   * Takes the history rather than reading the store, so retry can re-send an
   * earlier point in the conversation without first mutating what is on screen.
   */
  const ask = useCallback(async (history: StoredTurn[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    saveSession(history);
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
        body: JSON.stringify({ messages: history }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        reply?: string;
        code?: string;
        error?: string;
      };

      if (body.code === "CHAT_NOT_CONFIGURED") {
        setUnavailable(true);
        return;
      }

      if (response.ok && body.reply) {
        saveSession([...history, { role: "assistant", content: body.reply }]);
      } else {
        // An error is a status, not a message. Keeping it out of the transcript
        // means it is never replayed to the model and never persisted.
        setError(
          body.error ??
            "Could not answer that one. The FAQ above covers the usual questions.",
        );
      }
    } catch (err) {
      // A stop is not a failure; leave the conversation exactly as it was.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        "Could not reach the server. Check your connection, or read the FAQ above.",
      );
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
    setError(null);
    setDraft("");
    clearSession();
    inputRef.current?.focus();
  }

  if (unavailable) return null;

  const started = turns.length > 0;
  const canRetry = !pending && turns.some((t) => t.role === "assistant");

  return (
    <section id="ask" className="scroll-mt-16 border-t">
      <div className="mx-auto max-w-2xl px-4 py-20 md:px-8 md:py-24">
        <div className="text-center">
          <PaperCreature
            state={pending ? "thinking" : "idle"}
            className="mx-auto size-20"
          />
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-balance">
            Still have a question?
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md leading-relaxed text-balance">
            Ask {CREATURE_NAME} whether Tuón covers your subject or your board
            exam, what it costs, or who can see your notes.
          </p>
        </div>

        <div className="border-border bg-card mt-8 overflow-hidden rounded-2xl border">
          {started ? (
            <div
              ref={threadRef}
              aria-live="polite"
              className="max-h-96 space-y-3 overflow-y-auto p-4"
            >
              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    turn.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted",
                  )}
                >
                  {turn.content}
                </div>
              ))}

              {pending ? (
                <div className="bg-muted flex w-fit items-center gap-1.5 rounded-2xl px-3.5 py-3">
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
                  <span className="sr-only">Thinking</span>
                </div>
              ) : null}

              {error ? (
                <p className="border-destructive/30 text-muted-foreground max-w-[85%] rounded-2xl border px-3.5 py-2.5 text-sm">
                  {error}
                </p>
              ) : null}

              {canRetry ? (
                <div className="flex items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={retry}
                    className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    Ask that again
                  </button>
                  <button
                    type="button"
                    onClick={startOver}
                    className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <Trash2 className="size-3" />
                    Start over
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-2 p-4">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="border-border hover:border-primary/40 hover:bg-accent/30 rounded-full border px-3.5 py-2 text-xs transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

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
              placeholder={started ? "Ask a follow-up…" : "Ask about Tuón…"}
              aria-label="Your question"
              className="placeholder:text-muted-foreground max-h-28 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            {pending ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  abortRef.current?.abort();
                  setPending(false);
                }}
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
        </div>

        <p className="text-muted-foreground mt-3 text-center text-xs">
          {CREATURE_NAME} only answers questions about Tuón, and can be wrong.
          Nothing you type here is saved to an account.
        </p>
      </div>
    </section>
  );
}
