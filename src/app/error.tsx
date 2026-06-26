"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] p-4">
      <section className="max-w-lg rounded-lg border border-[#dfe4dc] bg-white p-6">
        <h1 className="text-xl font-bold text-[#17211b]">Dashboard failed to load</h1>
        <p className="mt-2 text-sm text-[#657069]">{error.message}</p>
        <Button className="mt-4" onClick={reset}>
          Retry
        </Button>
      </section>
    </main>
  );
}
