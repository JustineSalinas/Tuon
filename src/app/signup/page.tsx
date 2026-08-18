import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthAside } from "@/components/auth/auth-aside";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <AuthForm mode="signup" />
      </div>
      <AuthAside />
    </main>
  );
}
