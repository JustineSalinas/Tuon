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

import { useI18n } from "@/components/providers/i18n-provider";
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

export function AskTuon() {
  const { t, locale } = useI18n();

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
  /** Marks the end of the thread, so the newest answer can be kept in view. */
  const endRef = useRef<HTMLDivElement>(null);
  /** Lets an in-flight answer be stopped rather than waited out. */
  const abortRef = useRef<AbortController | null>(null);

  // Abandoning an in-flight request on unmount stops a setState after teardown.
  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * Follow the newest message.
   *
   * `block: "nearest"` so the page moves the least it can get away with: the
   * thread is part of the page now, and scrolling it to the top on every
   * answer would drag the reader away from whatever else they were looking at.
   *
   * Skipped on the first paint. A restored conversation must not yank someone
   * who just opened the landing page down to the chat section — `answered`
   * only becomes true after a send in this session.
   */
  const answered = useRef(false);
  useEffect(() => {
    if (turns.length === 0 || !answered.current) return;
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
        body: JSON.stringify({ messages: history, locale }),
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
            t.ask.failed,
        );
      }
    } catch (err) {
      // A stop is not a failure; leave the conversation exactly as it was.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        t.ask.offline,
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setPending(false);
    }
  }, [locale, t.ask.failed, t.ask.offline]);

  function send(text: string) {
    const question = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!question || pending) return;
    setDraft("");
    // From here on the thread may follow itself. Before the first send it must
    // not, or a restored conversation would drag someone who just opened the
    // page down to this section.
    answered.current = true;
    void ask([...turns, { role: "user", content: question }]);
  }

  /** Re-asks the last question, discarding the answer that came back. */
  function retry() {
    if (pending) return;
    answered.current = true;
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
      <div className="mx-auto max-w-3xl px-4 py-20 md:px-8 md:py-28">
        <div className="text-center">
          <PaperCreature
            state={pending ? "thinking" : "idle"}
            className="mx-auto size-24 sm:size-28"
          />
          <h2 className="font-display mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t.ask.title}
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-lg leading-relaxed text-balance">
            {t.ask.body(CREATURE_NAME)}
          </p>
        </div>

        <div className="border-border bg-card mt-10 overflow-hidden rounded-2xl border shadow-sm">
          {started ? (
            <div
              ref={threadRef}
              aria-live="polite"
              // Deliberately NOT its own scroll region. A 28rem box with a
              // long thread in it captured the wheel, so anyone who put their
              // cursor over the card could not scroll past this section at
              // all — they had to move the mouse off it first. This is an
              // inline section rather than a floating widget, so it can just
              // grow and let the page scroll, and the thread is bounded
              // anyway: MAX_TURNS caps the conversation and MAX_MESSAGE_CHARS
              // caps each message.
              className="min-h-40 space-y-4 p-5 sm:p-6"
            >
              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={cn(
                    // `w-fit` matters: without it a bubble is a block that fills 85% of the
                    // column, so a four-word question stretches across 650px and reads as
                    // a banner rather than something someone said.
                    "w-fit max-w-[85%] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed whitespace-pre-wrap",
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
                  <span className="sr-only">{t.ask.thinking}</span>
                </div>
              ) : null}

              {error ? (
                <p className="border-destructive/30 text-muted-foreground w-fit max-w-[85%] rounded-2xl border px-4 py-3 text-sm">
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
                    {t.ask.askAgain}
                  </button>
                  <button
                    type="button"
                    onClick={startOver}
                    className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <Trash2 className="size-3" />
                    {t.ask.startOver}
                  </button>
                </div>
              ) : null}

              <div ref={endRef} aria-hidden="true" />
            </div>
          ) : (
            <div className="flex min-h-40 flex-wrap content-center justify-center gap-2.5 p-5 sm:p-6">
              {t.ask.suggestions.map((s: string) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="border-border hover:border-primary/40 hover:bg-accent/30 rounded-full border px-4 py-2.5 text-sm transition-colors"
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
            className="flex items-end gap-2 border-t p-3 sm:p-4"
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value.slice(0, MAX_MESSAGE_CHARS));
                // Grow with the question rather than turning into a second
                // little scroll region the wheel gets caught in. Reset first,
                // or the box can only ever get taller.
                const box = e.currentTarget;
                box.style.height = "auto";
                box.style.height = `${box.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={1}
              placeholder={started ? t.ask.followUp : t.ask.placeholder}
              aria-label={t.ask.yourQuestion}
              className="placeholder:text-muted-foreground max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none"
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
                aria-label={t.ask.stop}
                className="size-11 shrink-0"
              >
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!draft.trim()}
                aria-label={t.ask.send}
                className="size-11 shrink-0"
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </form>
        </div>

        <p className="text-muted-foreground mt-3 text-center text-xs">
          {t.ask.disclaimer(CREATURE_NAME)}
        </p>
      </div>
    </section>
  );
}
