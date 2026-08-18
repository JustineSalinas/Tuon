import type { Metadata } from "next";

import { getSharedSet, toPlainSharedSet } from "@/lib/firebase/shared-set";
import { SharedSetView } from "./shared-set-view";

/**
 * Public view of a shared study set, rendered on the server.
 *
 * Server-rendered because this page's whole job is to survive being pasted
 * into a group chat: a client-side fetch gives the unfurl nothing to read and
 * the visitor a skeleton.
 */

interface PageProps {
  params: Promise<{ userId: string; setId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId, setId } = await params;
  const data = await getSharedSet(userId, setId);

  if (!data) {
    return {
      title: "Study set not available",
      // An unavailable link should not sit in search results advertising a
      // set that no longer exists.
      robots: { index: false, follow: false },
    };
  }

  const { studySet, flashcards, quizQuestions } = data;
  const description = [
    `${flashcards.length} flashcards`,
    quizQuestions.length ? `a ${quizQuestions.length}-question quiz` : null,
    studySet.courseTag ? `for ${studySet.courseTag}` : null,
  ]
    .filter(Boolean)
    .join(", ")
    .concat(". Study it free on Tuón.");

  return {
    title: studySet.title,
    description,
    openGraph: {
      title: studySet.title,
      description,
      type: "article",
      siteName: "Tuón",
    },
    twitter: { card: "summary", title: studySet.title, description },
  };
}

export default async function SharedSetPage({ params }: PageProps) {
  const { userId, setId } = await params;
  const data = await getSharedSet(userId, setId);

  return (
    <SharedSetView
      data={data ? toPlainSharedSet(data) : null}
      userId={userId}
      setId={setId}
    />
  );
}
