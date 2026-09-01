import type { Metadata, Viewport } from "next";
import { Fraunces, Geist_Mono, Inter } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import {
  PaletteProvider,
  paletteScript,
} from "@/components/providers/palette-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteUrl } from "@/lib/site";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tuón — Turn your notes into study sets",
    template: "%s · Tuón",
  },
  description:
    "Paste your class notes. Tuón turns them into flashcards and practice quizzes, then schedules your reviews so things actually stick. Built for Senior High and college students in the Philippines.",
  applicationName: "Tuón",
  // Resolves every relative OG/canonical URL, including the generated
  // opengraph-image. Without it Next emits relative paths, which several
  // chat clients refuse to unfurl.
  metadataBase: new URL(siteUrl()),
  openGraph: {
    type: "website",
    siteName: "Tuón",
    locale: "en_PH",
    title: "Tuón — Turn your notes into study sets",
    description:
      "Paste your class notes. Tuón turns them into flashcards and practice quizzes, then schedules your reviews so things actually stick.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tuón — Turn your notes into study sets",
    description:
      "Flashcards and quizzes from your own class notes, on a schedule that makes things stick.",
  },
  alternates: { canonical: "/" },
  keywords: [
    "flashcards",
    "spaced repetition",
    "Senior High School",
    "Grade 11",
    "Grade 12",
    "UPCAT",
    "study app",
    "Philippines",
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F2" },
    { media: "(prefers-color-scheme: dark)", color: "#14110F" },
  ],
  width: "device-width",
  initialScale: 1,
  // Students zoom in on dense notes; don't take that away.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Paints the chosen palette before first paint. Without it the app
            renders terracotta and then swaps colour once the profile lands,
            which is worse than not offering palettes at all. */}
        <script dangerouslySetInnerHTML={{ __html: paletteScript }} />

        {/* Scroll reveals ship as opacity:0 in the SSR HTML and are only
            revealed by JS. If JS never runs, everything below the hero would
            be invisible — so force it visible when scripting is off. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <PaletteProvider />
            <I18nProvider>{children}</I18nProvider>
          </AuthProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
