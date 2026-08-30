"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Home,
  Layers,
  LogOut,
  Network,
  Users,
  Plus,
  TrendingUp,
  Settings,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Wordmark } from "@/components/brand/logo";
import { QuotaIndicator } from "@/components/app/quota-indicator";
import { PomodoroDock } from "@/components/app/pomodoro-dock";
import { VerifyEmailBanner } from "@/components/app/verify-email-banner";
import { OfflineIndicator } from "@/components/app/offline-indicator";
import { GroupPresence } from "@/components/app/group-presence";
import { ReminderRunner } from "@/components/app/reminder-runner";
import { ServiceWorkerRegistration } from "@/components/app/service-worker";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { educationLevelLabel, strandLabel } from "@/lib/curriculum";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/notes", label: "Notes", icon: FileText, exact: false },
  { href: "/app/sets", label: "Study sets", icon: Layers, exact: false },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays, exact: false },
  { href: "/app/groups", label: "Groups", icon: Users, exact: false },
  { href: "/app/graph", label: "Graph", icon: Network, exact: false },
  { href: "/app/stats", label: "Retention", icon: TrendingUp, exact: false },
] as const;

/** The bottom bar only has room for four; the rest live in the sidebar. */
const MOBILE_NAV = NAV.slice(0, 4);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The review and quiz screens are full-bleed: chrome would compete with the
  // card for attention, and the bottom nav sits exactly where the rating
  // buttons need to be on mobile.
  const isFocusScreen = /\/app\/sets\/[^/]+\/(review|quiz)$/.test(pathname);

  if (isFocusScreen) {
    return <div className="min-h-dvh">{children}</div>;
  }

  return (
    <div className="min-h-dvh md:flex">
      <DesktopSidebar pathname={pathname} />
      <MobileHeader />

      <div className="flex-1 pb-20 md:pb-0">
        <ServiceWorkerRegistration />
        <ReminderRunner />
        {/* Renders nothing. Here rather than inside the timer so presence
            follows the timer's state across navigation, not the screen it
            happens to be drawn on. */}
        <GroupPresence />
        <OfflineIndicator />
        <VerifyEmailBanner />
        {children}
      </div>

      <MobileNav pathname={pathname} />
    </div>
  );
}

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

function DesktopSidebar({ pathname }: { pathname: string }) {
  const { profile } = useAuth();
  const courses = profile?.courses ?? [];

  return (
    <aside className="bg-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r p-4 md:flex">
      <Link href="/app" className="px-2 py-1">
        <Wordmark />
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Button className="mt-4" render={<Link href="/app/notes/new" />}>
          <Plus />
          New note
        </Button>

      <div className="mt-auto space-y-3">
        {/* The timer lives here rather than on the calendar page, because the
            one screen you could see it on there was the one screen you are not
            studying on. Its state was always global; only the UI was stuck. */}
        <PomodoroDock subjects={courses} />
        <QuotaIndicator />
        {/* Settings had no visible entry point at all — it lived only inside
            the avatar menu, which does not look like a menu. A gear beside the
            name is where people look for it, and it keeps the nav above for
            places you go rather than things you configure. */}
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <UserMenu align="start" />
          </div>
          <Link
            href="/app/settings"
            aria-label="Settings"
            title="Settings"
            className={cn(
              "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
              "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
              pathname.startsWith("/app/settings") && "bg-sidebar-accent text-foreground",
            )}
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="bg-background/85 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md md:hidden">
      <Link href="/app">
        <Wordmark markClassName="size-6" />
      </Link>
      <UserMenu align="end" />
    </header>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    <nav className="bg-background/90 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {MOBILE_NAV.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
              active ? "text-primary font-medium" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/app/notes/new"
        className="text-muted-foreground flex flex-col items-center gap-1 py-2.5 text-[11px]"
      >
        <span className="bg-primary text-primary-foreground grid size-5 place-items-center rounded-full">
          <Plus className="size-3.5" strokeWidth={3} />
        </span>
        New
      </Link>
    </nav>
  );
}

function UserMenu({ align }: { align: "start" | "end" }) {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();

  const name = profile?.displayName || user?.displayName || "Student";
  const initial = name.trim().charAt(0).toUpperCase() || "S";

  const context = [
    educationLevelLabel(profile?.educationLevel ?? null),
    strandLabel(profile?.strand ?? null),
  ]
    .filter(Boolean)
    .join(" · ");

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className="hover:bg-sidebar-accent/60 flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors" />}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-1 md:block">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="text-muted-foreground truncate text-xs">{context}</div>
          </div>
        </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="text-muted-foreground truncate text-xs">{user?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/app/settings" />}>
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} variant="destructive">
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
