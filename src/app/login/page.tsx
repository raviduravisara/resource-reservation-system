import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const demoAccounts = [
  { role: "Admin", email: "admin@primewave.test", password: "Admin@123" },
  { role: "Member", email: "kavindi@primewave.test", password: "Member@123" },
];

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-zinc-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-zinc-500">
            Reserve rooms, equipment and vehicles in one place.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white/60 p-4 text-xs text-zinc-600">
            <p className="mb-2 font-medium text-zinc-800">Demo accounts (seeded)</p>
            <ul className="grid gap-1">
              {demoAccounts.map((account) => (
                <li key={account.email} className="flex justify-between gap-2">
                  <span>{account.role}</span>
                  <span className="font-mono">
                    {account.email} / {account.password}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
