"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, FileText, Plus } from "lucide-react";

import { activeLinkQuery, completeLink, normaliseTitle } from "@/lib/notes/links";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 6;

export interface LinkAutocompleteState {
  open: boolean;
  query: string;
  start: number;
}

/**
 * Drives the `[[` autocomplete for a plain <textarea>.
 *
 * Kept on a textarea rather than a rich editor on purpose: the note body is
 * also the exact text sent to the model, and a rich editor would put markup
 * between the student's words and the flashcards generated from them.
 */
export function useLinkAutocomplete({
  setContent,
  textareaRef,
  notes,
  currentNoteId,
}: {
  setContent: (next: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  notes: Note[];
  currentNoteId: string | null;
}) {
  const [state, setState] = useState<LinkAutocompleteState>({
    open: false,
    query: "",
    start: 0,
  });
  const [highlightedRaw, setHighlighted] = useState(0);
  const caretRef = useRef(0);

  const suggestions = useMemo(() => {
    if (!state.open) return [];
    const q = normaliseTitle(state.query);
    return notes
      .filter((note) => note.id !== currentNoteId && note.title.trim())
      .filter((note) => (q ? normaliseTitle(note.title).includes(q) : true))
      .slice(0, MAX_SUGGESTIONS);
  }, [state.open, state.query, notes, currentNoteId]);

  // An exact-title match means "link the existing note", so only offer to
  // create when nothing matches exactly.
  const canCreate =
    state.open &&
    state.query.trim().length > 0 &&
    !notes.some((n) => normaliseTitle(n.title) === normaliseTitle(state.query));

  const optionCount = suggestions.length + (canCreate ? 1 : 0);
  // Clamp during render rather than correcting it in an effect: the list
  // shrinks as the student types, and an effect would render one frame with an
  // out-of-range highlight before fixing it.
  const highlighted = highlightedRaw >= optionCount ? 0 : highlightedRaw;

  function syncFromCaret() {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? 0;
    caretRef.current = caret;
    const active = activeLinkQuery(el.value, caret);
    if (active) {
      setState({ open: true, query: active.query, start: active.start });
    } else if (state.open) {
      setState((s) => ({ ...s, open: false }));
    }
  }

  function insert(title: string) {
    const el = textareaRef.current;
    if (!el) return;
    const { content: next, caret } = completeLink(
      el.value,
      state.start,
      caretRef.current,
      title.trim(),
    );
    setContent(next);
    setState((s) => ({ ...s, open: false }));
    // Restore the caret after React re-renders the controlled textarea.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  /** Returns true when the key was consumed by the popover. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!state.open || optionCount === 0) return false;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => (i + 1) % optionCount);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => (i - 1 + optionCount) % optionCount);
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const picked = suggestions[highlighted];
      insert(picked ? picked.title : state.query);
      return true;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setState((s) => ({ ...s, open: false }));
      return true;
    }
    return false;
  }

  const popover = (
    <AnimatePresence>
      {state.open && optionCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
          className="bg-popover absolute top-2 left-2 z-30 w-72 overflow-hidden rounded-xl border shadow-lg"
        >
          <div className="text-muted-foreground border-b px-3 py-2 text-[11px] tracking-wide uppercase">
            Link a note
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {suggestions.map((note, index) => (
              <li key={note.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insert(note.title);
                  }}
                  onMouseEnter={() => setHighlighted(index)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    index === highlighted && "bg-accent",
                  )}
                >
                  <FileText className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate">{note.title}</span>
                </button>
              </li>
            ))}

            {canCreate ? (
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insert(state.query);
                  }}
                  onMouseEnter={() => setHighlighted(suggestions.length)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    suggestions.length === highlighted && "bg-accent",
                  )}
                >
                  <Plus className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate">
                    Link to “{state.query.trim()}”
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
          <div className="text-muted-foreground flex items-center gap-1.5 border-t px-3 py-1.5 text-[11px]">
            <CornerDownLeft className="size-3" />
            to insert · Esc to dismiss
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return { popover, handleKeyDown, syncFromCaret, open: state.open };
}
