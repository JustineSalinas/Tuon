"use client";

/**
 * Talking to Tala.
 *
 * The design question this screen answers is "how do you make a chat box feel
 * like a companion", and the answer is not more chrome — it is that the
 * character is present and her state is honest.
 *
 * She is at the top, large, and her state is driven by what is actually
 * happening rather than by a timer: `thinking` while the request is in flight,
 * `talking` for exactly as long as words are arriving, `listening` while the
 * student is typing, `idle` otherwise. A mascot whose mouth moves when nothing
 * is being said is the precise tell that makes one feel fake, and the fix
 * costs nothing because the stream already tells us.
 *
 * The reply STREAMS, and that is the whole reason this reads as conversation
 * rather than lookup. It is a plain text stream, not SSE: there is one kind of
 * event, and a frame format for it would be ceremony.
 *
 * The conversation lives on the device — see lib/companion/session for why
 * that is a privacy decision rather than a shortcut.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, RotateCcw, Square, Trash2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { PaperCreature, type CreatureState } from "@/components/brand/paper-creature";
import { CREATURE_NAME } from "@/lib/brand";
import { MAX_MESSAGE_CHARS } from "@/lib/companion/prompt";
import {
  clearCompanion,
  getCompanionServerSnapshot,
  getCompanionSnapshot,
  saveCompanion,
  subscribeCompanion,
  type CompanionMessage,
} from "@/lib/companion/session";
import { useStudySnapshot } from "@/lib/companion/use-snapshot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TalaChat() {
  const { t, locale } = useI18n();
  const { authedFetch } = useAuth();
  const snapshot = useStudySnapshot();
  const reduce = useReducedMotion();

  const turns = useSyncExternalStore(
    subscribeCompanion,
    getCompanionSnapshot,
    getCompanionServerSnapshot,
  );

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  /** The reply as it arrives. Kept out of the store so a half-answer is never persisted. */
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const started = turns.length > 0;

  /**
   * Her state, from what is actually happening.
   *
   * Order matters: streaming beats pending, because the first token arrives
   * while the request is still open and she should stop thinking the moment
   * she starts speaking.
   */
  const creatureState: CreatureState = streaming
    ? "talking"
    : pending
      ? "thinking"
      : draft.trim()
        ? "listening"
        : "idle";

  // Follow the conversation down. `block: "end"` rather than scrollIntoView's
  // default, which would drag the whole page when only the thread grew.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [turns, streaming, reduce]);

  /**
   * Openers derived from the student's own state.
   *
   * A generic "ask me anything" wastes the one advantage this has over a
   * search engine. If a subject is weak, name it; if there is a plan, ask
   * about tonight. Rebuilt whenever the snapshot changes, and capped at three
   * so the empty state stays an invitation rather than a menu.
   */
  const suggestions = useMemo(() => {
    const out: string[] = [];
    const weakest = snapshot.subjects[0];
    if (snapshot.totalCards === 0) return t.tala.emptySuggestions.slice();
    if (snapshot.due + snapshot.fresh > 0) out.push(t.tala.askTonight);
    if (weakest) out.push(t.tala.askWeakest(weakest.subject));
    if (snapshot.shaky > 0) out.push(t.tala.askShaky);
    if (out.length < 3) out.push(t.tala.askHowItWorks);
    return out.slice(0, 3);
  }, [snapshot, t]);

  async function send(text: string) {
    const question = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!question || pending) return;

    const history: CompanionMessage[] = [...turns, { role: "user", content: question }];
    saveCompanion(history);
    setDraft("");
    setError(null);
    setStreaming("");
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Accumulated outside state as well as in it: the state setter is
    // asynchronous, and the `finally` below needs the final text to persist.
    let answer = "";

    try {
      const response = await authedFetch("/api/companion", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({ messages: history, snapshot, locale }),
      });

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        if (body.code === "CHAT_NOT_CONFIGURED") {
          setUnavailable(true);
          return;
        }
        setError(t.tala.failed);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setStreaming(answer);
      }

      if (!answer.trim()) setError(t.tala.failed);
    } catch (err) {
      // Aborting is the student pressing stop, not a failure. Anything they
      // already saw is kept.
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(t.tala.offline);
      }
    } finally {
      abortRef.current = null;
      setPending(false);
      setStreaming("");
      // A partial answer is still an answer — persist whatever arrived rather
      // than throwing it away because the stream ended early.
      if (answer.trim()) {
        saveCompanion([...history, { role: "assistant", content: answer.trim() }]);
      }
      inputRef.current?.focus();
    }
  }

  function startOver() {
    abortRef.current?.abort();
    clearCompanion();
    setStreaming("");
    setError(null);
  }

  if (unavailable) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center md:px-8">
        <PaperCreature state="asleep" className="mx-auto size-28" />
        <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">
          {t.tala.unavailable}
        </h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm leading-relaxed">
          {t.tala.unavailableHint}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl flex-col px-4 md:px-8">
      {/* Her, and the one line that says what she can see. */}
      <header className="pt-6 text-center md:pt-10">
        <PaperCreature
          state={creatureState}
          className="mx-auto size-28 sm:size-32"
          title={t.tala.companionOf(CREATURE_NAME)}
        />
        <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">
          {t.tala.title(CREATURE_NAME)}
        </h1>
        <p className="text-muted-foreground mx-auto mt-1.5 max-w-md text-sm leading-relaxed">
          {t.tala.subtitle}
        </p>
      </header>

      {/* The conversation. Grows with the page rather than scrolling in its own
          box — a bounded box captures the wheel and traps anyone whose cursor
          happens to be over it. */}
      <div className="flex-1 py-8" aria-live="polite">
        {started ? (
          <div className="space-y-4">
            {turns.map((turn, i) => (
              <Bubble key={i} role={turn.role} content={turn.content} />
            ))}

            {streaming ? <Bubble role="assistant" content={streaming} /> : null}

            {pending && !streaming ? (
              <div className="bg-muted flex w-fit items-center gap-1.5 rounded-2xl px-3.5 py-3">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="bg-muted-foreground/60 size-1.5 rounded-full"
                    animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
                <span className="sr-only">{t.tala.thinking}</span>
              </div>
            ) : null}

            {error ? (
              <p className="border-destructive/30 text-muted-foreground w-fit max-w-[85%] rounded-2xl border px-4 py-3 text-sm">
                {error}
              </p>
            ) : null}

            {!pending ? (
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={startOver}
                  className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Trash2 className="size-3" />
                  {t.tala.startOver}
                </button>
                {error ? (
                  <button
                    type="button"
                    onClick={() => {
                      const last = [...turns].reverse().find((x) => x.role === "user");
                      if (last) {
                        saveCompanion(turns.slice(0, turns.lastIndexOf(last)));
                        void send(last.content);
                      }
                    }}
                    className="text-muted-foreground hover:text-primary flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    {t.tala.tryAgain}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div ref={endRef} aria-hidden="true" />
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="border-border hover:border-primary/40 hover:bg-accent/30 rounded-full border px-4 py-2.5 text-sm transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sticky, because the thread grows down and the composer must not walk
          off the bottom of a long conversation. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="bg-background/85 border-border sticky bottom-0 -mx-4 flex items-end gap-2 border-t px-4 py-3 backdrop-blur-md md:-mx-8 md:px-8 md:py-4"
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value.slice(0, MAX_MESSAGE_CHARS));
            // Grow with the question rather than becoming a second scroll
            // region. Reset first, or the box can only ever get taller.
            const box = e.currentTarget;
            box.style.height = "auto";
            box.style.height = `${box.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          rows={1}
          placeholder={started ? t.tala.followUp : t.tala.placeholder}
          aria-label={t.tala.yourMessage}
          className="placeholder:text-muted-foreground max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none"
        />
        {pending ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => abortRef.current?.abort()}
            aria-label={t.tala.stop}
            className="size-11 shrink-0"
          >
            <Square className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!draft.trim()}
            aria-label={t.tala.send}
            className="size-11 shrink-0"
          >
            <ArrowUp className="size-4" />
          </Button>
        )}
      </form>

      <p className="text-muted-foreground pb-4 text-center text-xs leading-relaxed">
        {t.tala.disclaimer(CREATURE_NAME)}
      </p>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          // `w-fit` matters: without it a bubble is a block filling 85% of the
          // column, so a four-word question stretches across the page and
          // reads as a banner rather than something someone said.
          "w-fit max-w-[85%] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed whitespace-pre-wrap",
          role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted",
        )}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}
