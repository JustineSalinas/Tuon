import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthAside } from "@/components/auth/auth-aside";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <AuthForm mode="login" />
      </div>
      <AuthAside />
    </main>
  );
}
