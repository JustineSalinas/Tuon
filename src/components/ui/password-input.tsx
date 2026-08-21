"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Password field with a reveal toggle.
 *
 * Worth having rather than trusting people to type blind: this audience is
 * mostly on phones, where a mistyped character is invisible and the usual
 * recovery is "give up and reset the password" — and until now there was no
 * reset flow to give up into.
 *
 * The toggle is a `button` with a real accessible name that changes with
 * state, not an icon a screen reader has to guess at. It is deliberately
 * `tabIndex={-1}`: tabbing from the password field should reach the submit
 * button, not a decorative control.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={revealed ? "text" : "password"}
        // Room for the toggle, so a long password never runs under it.
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        className={cn(
          "text-muted-foreground hover:text-foreground absolute top-1/2 right-1 grid size-8 -translate-y-1/2",
          "place-items-center rounded-md transition-colors",
          "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
        )}
      >
        {revealed ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
