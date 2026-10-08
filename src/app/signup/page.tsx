import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthAside } from "@/components/auth/auth-aside";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    // Locked to dark + forest — see login/page.tsx for why.
    <main
      className="dark bg-background text-foreground grid min-h-dvh lg:grid-cols-2"
      data-palette="forest"
    >
      <AuthAside />
      <div className="flex items-center justify-center px-6 py-12">
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
