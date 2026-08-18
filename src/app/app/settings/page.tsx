"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Check, Loader2, LogOut, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { BillingCard } from "@/components/settings/billing-card";
import { DataAndAccount } from "@/components/settings/danger-zone";
import { AccountSecurity } from "@/components/settings/account-security";
import { StudyPreferences } from "@/components/settings/study-preferences";
import {
  COLLEGE_PROGRAMS,
  EDUCATION_LEVELS,
  STRANDS,
  educationLevelLabel,
  getSubjectGroups,
  isSeniorHigh,
  strandLabel,
} from "@/lib/curriculum";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user, profile } = useAuth();

  // Wait for the profile before mounting the form, so the fields can seed
  // themselves from real data in a useState initialiser rather than an effect.
  if (!user || !profile) return null;

  return <SettingsForm key={user.uid} profile={profile} email={user.email} />;
}

function SettingsForm({
  profile,
  email,
}: {
  profile: UserProfile;
  email: string | null;
}) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [courses, setCourses] = useState<string[]>(profile.courses ?? []);
  const [customCourse, setCustomCourse] = useState("");
  const [saving, setSaving] = useState(false);

  // Students change strand and they graduate; onboarding is not the last word.
  const [editingLevel, setEditingLevel] = useState(false);
  const [level, setLevel] = useState(profile.educationLevel);
  const [strand, setStrand] = useState(profile.strand);
  const levelValid = level !== null && (!isSeniorHigh(level) || strand !== null);

  const seniorHigh = isSeniorHigh(profile.educationLevel);
  const dirty =
    displayName.trim() !== (profile.displayName ?? "") ||
    JSON.stringify(courses) !== JSON.stringify(profile.courses ?? []);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        courses,
        updatedAt: serverTimestamp(),
      });
      toast.success("Settings saved.");
    } catch {
      toast.error("Could not save your settings.");
    }
    setSaving(false);
  }

  async function saveLevel() {
    if (!user || !levelValid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        educationLevel: level,
        strand: isSeniorHigh(level) ? strand : null,
        updatedAt: serverTimestamp(),
      });
      setEditingLevel(false);
      toast.success("Education level updated.");
    } catch {
      toast.error("Could not save that change.");
    }
    setSaving(false);
  }

  function toggleCourse(course: string) {
    setCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course],
    );
  }

  function addCustom() {
    const value = customCourse.trim();
    if (!value || courses.some((c) => c.toLowerCase() === value.toLowerCase())) {
      setCustomCourse("");
      return;
    }
    setCourses((prev) => (seniorHigh ? [...prev, value] : [value]));
    setCustomCourse("");
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>

      {/* Plan */}
      <BillingCard profile={profile} />

      {/* Profile */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold tracking-tight">Profile</h2>

        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label>Education level</Label>
            {editingLevel ? (
              <div className="space-y-3 rounded-xl border p-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  {EDUCATION_LEVELS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      selected={level === option.value}
                      onClick={() => {
                        setLevel(option.value);
                        // Strand only means anything in Senior High, and the
                        // subject list depends on it — so both reset together.
                        if (!isSeniorHigh(option.value)) setStrand(null);
                      }}
                    />
                  ))}
                </div>

                {isSeniorHigh(level) ? (
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {STRANDS.map((option) => (
                      <Chip
                        key={option.value}
                        label={option.label}
                        selected={strand === option.value}
                        onClick={() => setStrand(option.value)}
                      />
                    ))}
                  </div>
                ) : null}

                <p className="text-muted-foreground text-xs leading-relaxed">
                  Changing your strand changes which subjects are offered. Your
                  notes and study sets keep whatever tag they already have —
                  nothing is retagged or deleted.
                </p>

                <div className="flex gap-2">
                  <Button size="sm" onClick={saveLevel} disabled={!levelValid || saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Check />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingLevel(false);
                      setLevel(profile.educationLevel);
                      setStrand(profile.strand);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">
                  {educationLevelLabel(profile.educationLevel)}
                </Badge>
                {strandLabel(profile.strand) ? (
                  <Badge variant="secondary">{strandLabel(profile.strand)}</Badge>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setEditingLevel(true)}
                >
                  Change
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>{seniorHigh ? "Subjects" : "Course"}</Label>

            {seniorHigh && profile.strand ? (
              <div className="space-y-4">
                {getSubjectGroups(profile.strand).map((group) => (
                  <div key={group.label}>
                    <p className="text-muted-foreground mb-2 text-xs">{group.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.subjects.map((subject) => (
                        <Chip
                          key={subject}
                          label={subject}
                          selected={courses.includes(subject)}
                          onClick={() => toggleCourse(subject)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {COLLEGE_PROGRAMS.map((program) => (
                  <Chip
                    key={program}
                    label={program}
                    selected={courses[0] === program}
                    onClick={() => setCourses([program])}
                  />
                ))}
              </div>
            )}

            {/* Anything the student typed themselves */}
            {courses.filter((c) => !isPreset(c, profile.strand, seniorHigh)).length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {courses
                  .filter((c) => !isPreset(c, profile.strand, seniorHigh))
                  .map((course) => (
                    <Badge key={course} variant="secondary" className="gap-1.5 py-1.5 pr-1.5 pl-3">
                      {course}
                      <button
                        type="button"
                        onClick={() => toggleCourse(course)}
                        className="hover:bg-foreground/10 rounded-full p-0.5"
                        aria-label={`Remove ${course}`}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Input
                value={customCourse}
                onChange={(e) => setCustomCourse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder={seniorHigh ? "Add another subject" : "Add your own course"}
                maxLength={80}
              />
              <Button variant="outline" onClick={addCustom} disabled={!customCourse.trim()}>
                <Plus />
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            Save changes
          </Button>
        </div>
      </section>

      <Separator className="my-8" />

      <StudyPreferences />

      <Separator className="my-8" />

      <AccountSecurity />

      <Separator className="my-8" />

      <DataAndAccount />

      <Separator className="my-8" />

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{email}</p>
          <p className="text-muted-foreground text-xs">Signed in</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut />
          Sign out
        </Button>
      </div>
    </main>
  );
}

function isPreset(
  course: string,
  strand: string | null,
  seniorHigh: boolean,
): boolean {
  if (!seniorHigh) return COLLEGE_PROGRAMS.includes(course as never);
  if (!strand) return false;
  return getSubjectGroups(strand as never).some((group) =>
    group.subjects.some((s) => s === course),
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-all",
        "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent/40",
      )}
    >
      {label}
    </button>
  );
}
