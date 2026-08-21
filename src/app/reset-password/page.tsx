import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthAside } from "@/components/auth/auth-aside";

export const metadata: Metadata = {
  title: "Reset your password",
  // Nothing to gain from indexing it, and a reset form in search results is
  // a phishing lookalike waiting to happen.
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <ResetPasswordForm />
      </div>
      <AuthAside />
    </main>
  );
}
