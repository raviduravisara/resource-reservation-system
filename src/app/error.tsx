"use client";

import { buttonStyles } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-500">
        The request couldn&apos;t be completed. If it keeps happening, check that the database is running.
      </p>
      <button type="button" onClick={reset} className={buttonStyles({ className: "mt-6" })}>
        Try again
      </button>
    </main>
  );
}
