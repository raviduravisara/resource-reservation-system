import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-sm text-zinc-500">It may have been removed, or the link is wrong.</p>
      <Link href="/" className={buttonStyles({ className: "mt-6" })}>
        Back to dashboard
      </Link>
    </main>
  );
}
