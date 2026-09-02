"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useNote } from "@/lib/hooks/use-firestore";
import { NoteEditor } from "@/components/notes/note-editor";
import { Button } from "@/components/ui/button";

export default function NotePage() {
  const params = useParams<{ noteId: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: note, loading, notFound } = useNote(user?.uid, params.noteId);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {t.notes.notFound}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t.notes.notFoundHint}
          </p>
          <Button className="mt-6" render={<Link href="/app/notes" />}>
            {t.notes.backToNotes}
          </Button>
        </div>
      </div>
    );
  }

  return <NoteEditor key={note.id} note={note} />;
}
