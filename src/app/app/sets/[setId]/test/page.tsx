"use client";

import { useParams } from "next/navigation";

import { TestRunner } from "@/components/study/test-runner";

export default function TestPage() {
  const params = useParams<{ setId: string }>();
  return <TestRunner studySetId={params.setId} />;
}
