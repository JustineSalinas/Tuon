"use client";

import { useParams } from "next/navigation";

import { QuizRunner } from "@/components/study/quiz-runner";

export default function QuizPage() {
  const params = useParams<{ setId: string }>();
  return <QuizRunner studySetId={params.setId} />;
}
