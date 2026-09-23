"use client";

import { ErrorPage } from "@/components/ErrorPage";

export default function ServerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void error;
  return <ErrorPage code="500" onRetry={reset} />;
}
