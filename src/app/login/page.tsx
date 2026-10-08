import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthAside } from "@/components/auth/auth-aside";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    // Locked to dark + forest, same as the landing page and for the same
    // reason: a signed-out visitor's stored app preference (or none at all,
    // for someone who has never had an account) has no business deciding
    // what the page that gets them an account looks like. See page.tsx's
    // Hero wrapper for the original version of this reasoning.
    <main
      className="dark bg-background text-foreground grid min-h-dvh lg:grid-cols-2"
      data-palette="forest"
    >
      <AuthAside />
      <div className="flex items-center justify-center px-6 py-12">
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
