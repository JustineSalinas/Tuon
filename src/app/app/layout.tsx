"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, LogOut, RotateCcw } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";

/**
 * Gate for everything under /app.
 *
 * This is a convenience redirect, not the security boundary — Firestore rules
 * are what actually stop one student reading another's notes.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, authLoading, profileLoading, profileError, retryProfile, signOut } =
    useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!profileLoading && profile && !profile.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [authLoading, profileLoading, user, profile, router]);

  // A signed-in user whose profile could not be created must be told why.
  // Previously this fell through to the spinner below and hung forever.
  if (user && !profileLoading && !profile && profileError) {
    return <ProfileErrorScreen message={profileError} onRetry={retryProfile} onSignOut={signOut} />;
  }

  const settling =
    authLoading || !user || profileLoading || !profile || !profile.onboardingCompleted;

  if (settling) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

function ProfileErrorScreen({
  message,
  onRetry,
  onSignOut,
}: {
  message: string;
  onRetry: () => void;
  onSignOut: () => Promise<void>;
}) {
  const router = useRouter();

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="bg-destructive/10 mx-auto grid size-12 place-items-center rounded-full">
          <AlertTriangle className="text-destructive size-5" />
        </div>

        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
          We could not finish setting up your account
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{message}</p>

        <div className="mt-7 flex flex-col gap-2">
          <Button onClick={onRetry}>
            <RotateCcw />
            Try again
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await onSignOut();
              router.replace("/");
            }}
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </div>
    </main>
  );
}
