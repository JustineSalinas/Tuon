"use client";

import { useParams } from "next/navigation";

import { FlashcardReview } from "@/components/study/flashcard-review";

export default function ReviewPage() {
  const params = useParams<{ setId: string }>();
  return <FlashcardReview studySetId={params.setId} />;
}
