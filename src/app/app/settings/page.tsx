"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Check, Loader2, LogOut, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { BillingCard } from "@/components/settings/billing-card";
import { DataAndAccount } from "@/components/settings/danger-zone";
import { ProfilePicture } from "@/components/settings/profile-picture";
import { Semesters } from "@/components/settings/semesters";
import { readSemesters } from "@/lib/profile/semesters";
import { AccountSecurity } from "@/components/settings/account-security";
import { ManageSubjects } from "@/components/settings/manage-subjects";
import { StudyPreferences } from "@/components/settings/study-preferences";
import { ExamDateField } from "@/components/profile/exam-date-field";
import {
  BOARD_EXAMS,
  COLLEGE_PROGRAMS,
  STRANDS,
  educationLevelLabel,
  educationLevelsFor,
  getSubjectGroups,
  isBoardReview,
  isSeniorHigh,
  strandLabel,
  strandsAvailable,
} from "@/lib/curriculum";
import { countryName, suggestCountries } from "@/lib/countries";
import { MAX_SCHOOL_LENGTH, normaliseSchool } from "@/lib/schools";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  const { t } = useI18n();

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [school, setSchool] = useState(profile.school ?? "");
  const [courses, setCourses] = useState<string[]>(profile.courses ?? []);
  // Semesters own the subject list once they exist; see the guard below.
  const hasSemesters = readSemesters(profile.semesters).length > 0;
  const [customCourse, setCustomCourse] = useState("");
  const [examDate, setExamDate] = useState(profile.examDate ?? null);
  const [saving, setSaving] = useState(false);

  // Students change strand and they graduate; onboarding is not the last word.
  // Country lives in the same edit/save pair as level and strand, not the
  // page's main save: changing it can invalidate strand exactly the way
  // changing level does (a Philippine track picked before moving abroad), so
  // the three travel together.
  const [editingLevel, setEditingLevel] = useState(false);
  const [level, setLevel] = useState(profile.educationLevel);
  const [strand, setStrand] = useState(profile.strand);
  const [country, setCountry] = useState(profile.country ?? null);
  const [countryQuery, setCountryQuery] = useState("");
  const countryIsPH = strandsAvailable(country);
  const levelValid =
    level !== null && (!isSeniorHigh(level) || !countryIsPH || strand !== null);

  const seniorHigh = isSeniorHigh(profile.educationLevel);
  const dirty =
    displayName.trim() !== (profile.displayName ?? "") ||
    normaliseSchool(school) !== (profile.school ?? "") ||
    JSON.stringify(courses) !== JSON.stringify(profile.courses ?? []) ||
    (examDate ?? null) !== (profile.examDate ?? null);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        school: normaliseSchool(school) || null,
        courses,
        examDate: examDate ?? null,
        updatedAt: serverTimestamp(),
      });
      toast.success(t.settingsPage.saved);
    } catch {
      toast.error(t.settingsPage.saveFailed);
    }
    setSaving(false);
  }

  async function saveLevel() {
    if (!user || !levelValid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        country,
        educationLevel: level,
        strand: isSeniorHigh(level) && countryIsPH ? strand : null,
        updatedAt: serverTimestamp(),
      });
      setEditingLevel(false);
      toast.success(t.settingsPage.levelUpdated);
    } catch {
      toast.error(t.settingsPage.changeFailed);
    }
    setSaving(false);
  }

  function toggleCourse(course: string) {
    // Unticking used to be the removal path, and it orphaned everything tagged
    // with the subject: the material stayed in the database but stopped
    // matching any subject, so it vanished from every per-subject total with
    // no way for the student to put it back. Removal now goes through
    // "Your subjects" below, which moves the work first.
    if (courses.includes(course)) {
      toast.info(t.settingsPage.removeElsewhere(course), {
        description: t.settingsPage.removeElsewhereWhy,
      });
      return;
    }
    setCourses((prev) => (seniorHigh ? [...prev, course] : [course]));
  }

  function addCustom() {
    const value = customCourse.trim();
    if (
      !value ||
      courses.some((c) => c.toLowerCase() === value.toLowerCase())
    ) {
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
    <main className="w-full max-w-none px-4 py-6 md:px-10 md:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {t.settings.title}
      </h1>

      {/* Plan */}
      <BillingCard profile={profile} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {/* Profile */}
          <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t.settingsPage.profile}
        </h2>

        <div className="mt-4">
          <ProfilePicture />
        </div>

        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName">{t.settingsPage.displayName}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school">{t.settingsPage.school}</Label>
            <Input
              id="school"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder={t.settingsPage.schoolPlaceholder}
              maxLength={MAX_SCHOOL_LENGTH}
              autoComplete="organization"
            />
            <p className="text-muted-foreground text-xs">
              {t.settingsPage.schoolNote}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t.settingsPage.educationLevel}</Label>
            {editingLevel ? (
              <div className="space-y-3 rounded-xl border p-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="settings-country"
                    className="text-muted-foreground text-xs"
                  >
                    {t.onboarding.country}
                  </Label>
                  <Input
                    id="settings-country"
                    value={
                      country ? (countryName(country) ?? "") : countryQuery
                    }
                    onChange={(e) => {
                      setCountry(null);
                      setCountryQuery(e.target.value);
                    }}
                    placeholder={t.onboarding.countryPlaceholder}
                    autoComplete="country-name"
                  />
                  {!country && countryQuery.trim() ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {suggestCountries(countryQuery).map((candidate) => (
                        <button
                          key={candidate.code}
                          type="button"
                          onClick={() => {
                            setCountry(candidate.code);
                            setCountryQuery("");
                            // Moving away from the Philippines invalidates a
                            // Philippine strand the same way changing level
                            // does — see the state comment above.
                            if (!strandsAvailable(candidate.code))
                              setStrand(null);
                          }}
                          className="border-border bg-card hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-ring rounded-full border px-3 py-1.5 text-sm transition-all focus-visible:ring-[3px] focus-visible:outline-none"
                        >
                          {candidate.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2 border-t pt-3 sm:grid-cols-3">
                  {educationLevelsFor(country).map((option) => (
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

                {isSeniorHigh(level) && countryIsPH ? (
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

                {countryIsPH ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t.settingsPage.strandNote}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveLevel}
                    disabled={!levelValid || saving}
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Check />}
                    {t.common.save}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingLevel(false);
                      setLevel(profile.educationLevel);
                      setStrand(profile.strand);
                      setCountry(profile.country ?? null);
                      setCountryQuery("");
                    }}
                  >
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {countryName(profile.country) ? (
                  <Badge variant="secondary">
                    {countryName(profile.country)}
                  </Badge>
                ) : null}
                <Badge variant="secondary">
                  {educationLevelLabel(profile.educationLevel, profile.country)}
                </Badge>
                {strandLabel(profile.strand) ? (
                  <Badge variant="secondary">
                    {strandLabel(profile.strand)}
                  </Badge>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => setEditingLevel(true)}
                >
                  {t.settingsPage.change}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>
              {seniorHigh ? t.settingsPage.subjects : t.settingsPage.course}
            </Label>

            {/* Once semesters exist they own this list, and two editors on one
                field is a data-loss path: this form holds its own copy from
                page load, so saving it after switching terms would write the
                previous term's subjects back and silently undo the switch. */}
            {hasSemesters ? (
              <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-3 text-sm leading-relaxed">
                {t.settingsPage.fromCurrentTerm}{" "}
                <a
                  href="#semesters"
                  className="text-primary underline underline-offset-4"
                >
                  {t.settingsPage.editUnderSemesters}
                </a>
                .
              </p>
            ) : (
              <>
                {seniorHigh && profile.strand ? (
                  <div className="space-y-4">
                    {getSubjectGroups(profile.strand).map((group) => (
                      <div key={group.label}>
                        <p className="text-muted-foreground mb-2 text-xs">
                          {group.label}
                        </p>
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
                ) : seniorHigh ? // Senior High outside the Philippines: no strand, so no preset
                // list means anything — the add field below is the whole
                // picker, same as onboarding's equivalent step. Rendering the
                // college/board-exam single-select here instead, which used to
                // happen, replaced a multi-subject student's list with one
                // program the moment they added their second subject.
                null : (
                  <div className="flex flex-wrap gap-2">
                    {(isBoardReview(profile.educationLevel)
                      ? BOARD_EXAMS
                      : COLLEGE_PROGRAMS
                    ).map((program) => (
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
                {courses.filter((c) => !isPreset(c, profile.strand, seniorHigh))
                  .length > 0 ? (
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {courses
                      .filter((c) => !isPreset(c, profile.strand, seniorHigh))
                      .map((course) => (
                        <Badge
                          key={course}
                          variant="secondary"
                          className="gap-1.5 py-1.5 pr-1.5 pl-3"
                        >
                          {course}
                          <button
                            type="button"
                            onClick={() => toggleCourse(course)}
                            className="hover:bg-foreground/10 rounded-full p-0.5"
                            aria-label={t.settingsPage.removeChip(course)}
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
                    placeholder={
                      seniorHigh
                        ? t.settingsPage.addAnotherSubject
                        : t.settingsPage.addYourOwnCourse
                    }
                    maxLength={80}
                  />
                  <Button
                    variant="outline"
                    onClick={addCustom}
                    disabled={!customCourse.trim()}
                  >
                    <Plus />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Only board and licensure reviewers sit on a fixed date; for
              everyone else the field would be noise. */}
          {isBoardReview(profile.educationLevel) ? (
            <ExamDateField
              value={examDate}
              onChange={setExamDate}
              examName={courses[0]}
            />
          ) : null}

          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {t.settingsPage.saveChanges}
          </Button>
        </div>
          </section>

          {/* Above "Manage subjects" on purpose: this decides which subjects
              are on offer, and that one deals with the material already
              tagged. */}
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <Semesters />
          </section>

          {/* After the profile form, because it operates on what that form
              saved and is the only safe way to take a subject away again. */}
          <ManageSubjects courses={profile.courses ?? []} />

          <StudyPreferences />
        </div>

        <div className="space-y-6">
          <AccountSecurity />

          <DataAndAccount />

          <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{email}</p>
              <p className="text-muted-foreground text-xs">
                {t.settingsPage.signedIn}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut />
              {t.nav.signOut}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function isPreset(
  course: string,
  strand: string | null,
  seniorHigh: boolean,
): boolean {
  if (!seniorHigh) {
    return (
      COLLEGE_PROGRAMS.includes(course as never) ||
      BOARD_EXAMS.includes(course as never)
    );
  }
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
