"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Loader2, MessageCircle, X } from "lucide-react";

import { PaperCreature } from "@/components/brand/paper-creature";
import { getAppCheckToken } from "@/lib/firebase/client";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/prompt";
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

  // Keep the newest message in view as the conversation grows.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, pending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes, because a fixed panel over the page needs a keyboard exit.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const question = text.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!question || pending) return;

    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setDraft("");
    setPending(true);

    try {
      const appCheckToken = await getAppCheckToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
        },
        body: JSON.stringify({ messages: next }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        reply?: string;
        code?: string;
        error?: string;
      };

      if (body.code === "CHAT_NOT_CONFIGURED") {
        // Take the whole feature away rather than leave a widget that fails.
        setUnavailable(true);
        setOpen(false);
        return;
      }

      setTurns([
        ...next,
        {
          role: "assistant",
          content:
            response.ok && body.reply
              ? body.reply
              : (body.error ??
                "Could not answer that one. The FAQ below covers the usual questions."),
        },
      ]);
    } catch {
      setTurns([
        ...next,
        {
          role: "assistant",
          content:
            "Could not reach the server. Check your connection, or read the FAQ below.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  if (unavailable) return null;

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
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="hover:bg-muted rounded-lg p-1.5 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    turn.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted",
                  )}
                >
                  {turn.content}
                </div>
              ))}

              {pending ? (
                <div className="bg-muted text-muted-foreground flex w-fit items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm">
                  <Loader2 className="size-3.5 animate-spin" />
                  Thinking
                </div>
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
                  // Enter sends; Shift+Enter is a newline. Standard for chat.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                rows={1}
                placeholder="Ask about Tuón…"
                aria-label="Your question"
                className="placeholder:text-muted-foreground max-h-24 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!draft.trim() || pending}
                aria-label="Send"
                className="size-9 shrink-0"
              >
                <ArrowUp className="size-4" />
              </Button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
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
