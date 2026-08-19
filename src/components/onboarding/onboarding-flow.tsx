"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ArrowLeft, Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { db } from "@/lib/firebase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedMark } from "@/components/brand/animated-mark";
import {
  PaperCreature,
  type CreatureState,
} from "@/components/brand/paper-creature";
import { CREATURE_NAME, CREATURE_ROLE } from "@/lib/brand";
import {
  COLLEGE_PROGRAMS,
  EDUCATION_LEVELS,
  STRANDS,
  STRAND_TRACKS,
  getSubjectGroups,
  isSeniorHigh,
} from "@/lib/curriculum";
import { CONSENT_VERSION } from "@/lib/legal/consent";
import { MAX_SCHOOL_LENGTH, normaliseSchool, suggestSchools } from "@/lib/schools";
import type { EducationLevel, Strand } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type StepKey =
  | "name"
  | "level"
  | "school"
  | "strand"
  | "subjects"
  | "program"
  | "consent";

const TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const;

function OnboardingWizard({ initialName }: { initialName: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState(initialName);
  const [educationLevel, setEducationLevel] = useState<EducationLevel | null>(null);
  const [strand, setStrand] = useState<Strand | null>(null);
  const [courses, setCourses] = useState<string[]>([]);
  const [customCourse, setCustomCourse] = useState("");
  const [school, setSchool] = useState("");

  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [guardianConsent, setGuardianConsent] = useState(false);

  // --- Step sequence depends on the education level ------------------------
  const steps = useMemo<StepKey[]>(() => {
    if (educationLevel === null) return ["name", "level"];
    return isSeniorHigh(educationLevel)
      ? ["name", "level", "school", "strand", "subjects", "consent"]
      : ["name", "level", "school", "program", "consent"];
  }, [educationLevel]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const isLastStep = stepIndex === steps.length - 1;

  const canAdvance = (() => {
    switch (currentStep) {
      case "name":
        return displayName.trim().length >= 2;
      case "level":
        return educationLevel !== null;
      case "school":
        return true;
      case "strand":
        return strand !== null;
      case "subjects":
        return courses.length > 0;
      case "program":
        return courses.length === 1;
      case "consent":
        // A minor may not continue on their own say-so alone.
        if (!agreedToPolicies || isAdult === null) return false;
        return isAdult || guardianConsent;
      default:
        return false;
    }
  })();

  function goNext() {
    if (!canAdvance) return;
    setDirection(1);
    if (isLastStep) {
      void handleFinish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    setDirection(-1);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function toggleCourse(subject: string) {
    setCourses((prev) =>
      prev.includes(subject) ? prev.filter((c) => c !== subject) : [...prev, subject],
    );
  }

  /** College is single-select: picking a program replaces the previous one. */
  function selectProgram(program: string) {
    setCourses([program]);
  }

  function addCustomCourse() {
    const value = customCourse.trim();
    if (!value) return;
    if (courses.some((c) => c.toLowerCase() === value.toLowerCase())) {
      setCustomCourse("");
      return;
    }
    if (currentStep === "program") {
      setCourses([value]);
    } else {
      setCourses((prev) => [...prev, value]);
    }
    setCustomCourse("");
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        educationLevel,
        strand: isSeniorHigh(educationLevel) ? strand : null,
        school: normaliseSchool(school) || null,
        courses,
        onboardingCompleted: true,
        termsAcceptedVersion: CONSENT_VERSION,
        termsAcceptedAt: serverTimestamp(),
        isAdult: isAdult === true,
        guardianConsent: isAdult === false && guardianConsent,
        updatedAt: serverTimestamp(),
      });
      router.replace("/app");
    } catch {
      toast.error("Could not save your setup. Please try again.");
      setSaving(false);
    }
  }

  // Changing the education level invalidates anything picked downstream.
  function handleLevelChange(level: EducationLevel) {
    if (level !== educationLevel) {
      setStrand(null);
      setCourses([]);
    }
    setEducationLevel(level);
  }

  function handleStrandChange(next: Strand) {
    if (next !== strand) setCourses([]);
    setStrand(next);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 py-8">
      {/* Progress */}
      <header className="flex items-center justify-between">
        <AnimatedMark className="text-primary size-6" />
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {steps.map((step, index) => (
            <span
              key={step}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index < stepIndex && "bg-primary w-5",
                index === stepIndex && "bg-primary w-8",
                index > stepIndex && "bg-border w-5",
              )}
            />
          ))}
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {stepIndex + 1} / {steps.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col justify-center py-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={TRANSITION}
          >
            {currentStep === "name" ? (
              <StepShell
                creature="idle"
                title="What should we call you?"
                subtitle={`This is how ${CREATURE_NAME} will greet you.`}
              >
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="sr-only">
                    Display name
                  </Label>
                  <Input
                    id="displayName"
                    autoFocus
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goNext();
                    }}
                    placeholder="Juan"
                    maxLength={60}
                    className="h-14 text-lg"
                  />
                </div>
              </StepShell>
            ) : null}

            {currentStep === "level" ? (
              <StepShell
                title="Where are you studying?"
                subtitle="This changes how we tag your notes and pitch your flashcards."
              >
                <div className="grid gap-3">
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectCard
                      key={level.value}
                      selected={educationLevel === level.value}
                      onClick={() => handleLevelChange(level.value)}
                      title={level.label}
                      description={level.hint}
                    />
                  ))}
                </div>
              </StepShell>
            ) : null}

            {currentStep === "school" ? (
              <StepShell
                creature="idle"
                title="Where do you study?"
                subtitle="So your sets are grouped the way your school year is."
              >
                <div className="space-y-2">
                  <Label htmlFor="school" className="sr-only">
                    School
                  </Label>
                  <Input
                    id="school"
                    autoFocus
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goNext();
                    }}
                    placeholder="Start typing your school's name"
                    maxLength={MAX_SCHOOL_LENGTH}
                    autoComplete="organization"
                    className="h-14 text-lg"
                  />

                  {/* Suggestions only — the typed value is always what saves.
                      A fixed dropdown would tell most students their school
                      does not count; there are thousands of them. */}
                  {suggestSchools(school).length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {suggestSchools(school).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setSchool(suggestion)}
                          className="border-border bg-card hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-ring rounded-full border px-3.5 py-2 text-sm transition-all focus-visible:ring-[3px] focus-visible:outline-none"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <p className="text-muted-foreground pt-2 text-xs">
                    Optional — you can leave this blank, and change it any time
                    in Settings.
                  </p>
                </div>
              </StepShell>
            ) : null}

            {currentStep === "strand" ? (
              <StepShell
                title="Which track are you in?"
                subtitle="We will show the subjects that go with it."
              >
                {/* Ten options is a wall unless it is grouped the way DepEd
                    groups them, so the picker mirrors the four tracks. */}
                <div className="max-h-[46vh] space-y-6 overflow-y-auto pr-1">
                  {STRAND_TRACKS.map((group) => (
                    <div key={group.track}>
                      <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
                        {group.track}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {group.strands.map((value) => {
                          const option = STRANDS.find((s) => s.value === value);
                          if (!option) return null;
                          return (
                            <SelectCard
                              key={option.value}
                              selected={strand === option.value}
                              onClick={() => handleStrandChange(option.value)}
                              title={option.label}
                              description={option.full}
                              footnote={option.hint}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </StepShell>
            ) : null}

            {currentStep === "subjects" && strand ? (
              <StepShell
                title="Which subjects are you taking?"
                subtitle="Pick as many as you like. You can change these later."
              >
                <div className="max-h-[46vh] space-y-6 overflow-y-auto pr-1">
                  {getSubjectGroups(strand).map((group) => (
                    <div key={group.label}>
                      <div className="mb-2 flex items-baseline gap-2">
                        <h3 className="text-sm font-medium">{group.label}</h3>
                        {group.description ? (
                          <span className="text-muted-foreground text-xs">
                            {group.description}
                          </span>
                        ) : null}
                      </div>
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

                  <CustomCourses
                    label="Not listed? Add it"
                    placeholder="e.g. Research in Daily Life 1"
                    value={customCourse}
                    onChange={setCustomCourse}
                    onAdd={addCustomCourse}
                    custom={courses.filter((c) => !isKnownSubject(c, strand))}
                    onRemove={(c) => toggleCourse(c)}
                  />
                </div>

                <p className="text-muted-foreground mt-4 text-xs">
                  {courses.length} selected
                </p>
              </StepShell>
            ) : null}

            {currentStep === "program" ? (
              <StepShell
                title="What course are you taking?"
                subtitle="Your degree program. You will tag individual subjects on each note."
              >
                <div className="max-h-[46vh] overflow-y-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                    {COLLEGE_PROGRAMS.map((program) => (
                      <Chip
                        key={program}
                        label={program}
                        selected={courses[0] === program}
                        onClick={() => selectProgram(program)}
                      />
                    ))}
                  </div>

                  <CustomCourses
                    label="Not listed? Add it"
                    placeholder="e.g. BS Marine Biology"
                    value={customCourse}
                    onChange={setCustomCourse}
                    onAdd={addCustomCourse}
                    custom={
                      courses[0] && !COLLEGE_PROGRAMS.includes(courses[0] as never)
                        ? [courses[0]]
                        : []
                    }
                    onRemove={() => setCourses([])}
                  />
                </div>
              </StepShell>
            ) : null}

            {currentStep === "consent" ? (
              <StepShell
                creature={canAdvance ? "celebrating" : "thinking"}
                title="Before we start"
                subtitle="Two quick things, and then your first study set."
              >
                <div className="space-y-5">
                  <CheckRow
                    checked={agreedToPolicies}
                    onChange={setAgreedToPolicies}
                    label={
                      <>
                        I have read and agree to the{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="text-primary underline underline-offset-4"
                        >
                          Terms of Use
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="/privacy"
                          target="_blank"
                          className="text-primary underline underline-offset-4"
                        >
                          Privacy Notice
                        </Link>
                        .
                      </>
                    }
                    hint="They open in a new tab — you won't lose your setup."
                  />

                  <div>
                    <p className="text-sm font-medium">Are you 18 or older?</p>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                      <SelectCard
                        selected={isAdult === true}
                        onClick={() => {
                          setIsAdult(true);
                          setGuardianConsent(false);
                        }}
                        title="Yes, I'm 18 or older"
                      />
                      <SelectCard
                        selected={isAdult === false}
                        onClick={() => setIsAdult(false)}
                        title="No, I'm under 18"
                      />
                    </div>
                  </div>

                  {isAdult === false ? (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={TRANSITION}
                      className="border-primary/30 bg-accent/30 rounded-xl border p-4"
                    >
                      <CheckRow
                        checked={guardianConsent}
                        onChange={setGuardianConsent}
                        label="A parent or guardian has gone through this with me and agrees to Tuón holding my notes and study history."
                        hint="They can email hello@tuon.app any time to see or delete your data."
                      />
                    </motion.div>
                  ) : null}
                </div>
              </StepShell>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <footer className="flex items-center gap-3 pb-2">
        {stepIndex > 0 ? (
          <Button variant="ghost" size="lg" onClick={goBack} disabled={saving}>
            <ArrowLeft />
            Back
          </Button>
        ) : null}
        <Button
          size="lg"
          className="ml-auto min-w-36"
          onClick={goNext}
          disabled={!canAdvance || saving}
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" />
              Saving…
            </>
          ) : isLastStep ? (
            "Finish setup"
          ) : (
            "Continue"
          )}
        </Button>
      </footer>
    </main>
  );
}

/**
 * Gate for the wizard: handles redirects and waits for the profile before
 * mounting the form, so the form can seed its fields from real data in a
 * useState initialiser instead of an effect.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const { user, profile, authLoading, profileLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile?.onboardingCompleted) router.replace("/app");
  }, [profile?.onboardingCompleted, router]);

  if (authLoading || profileLoading || !user || !profile || profile.onboardingCompleted) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
        <span className="sr-only">Loading</span>
      </main>
    );
  }

  return (
    <OnboardingWizard
      key={user.uid}
      initialName={profile.displayName || user.displayName || ""}
    />
  );
}

function isKnownSubject(subject: string, strand: Strand): boolean {
  return getSubjectGroups(strand).some((group) =>
    group.subjects.some((s) => s === subject),
  );
}

function StepShell({
  title,
  subtitle,
  children,
  creature,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Shown beside the heading, where the creature has something to say. */
  creature?: CreatureState;
}) {
  return (
    <div>
      <div className="flex items-start gap-4">
        {creature ? (
          <PaperCreature
            state={creature}
            className="hidden size-20 shrink-0 sm:block"
            title={CREATURE_ROLE}
          />
        ) : null}
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {title}
          </h1>
          <p className="text-muted-foreground mt-3">{subtitle}</p>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function SelectCard({
  selected,
  onClick,
  title,
  description,
  footnote,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  footnote?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative rounded-xl border p-4 text-left transition-all",
        "hover:border-primary/50 hover:bg-accent/40",
        "focus-visible:ring-ring focus-visible:ring-[3px] focus-visible:outline-none",
        selected ? "border-primary bg-accent/60" : "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{title}</div>
          {description ? (
            <div className="text-muted-foreground mt-0.5 text-sm">{description}</div>
          ) : null}
          {footnote ? (
            <div className="text-muted-foreground/80 mt-1.5 text-xs">{footnote}</div>
          ) : null}
        </div>
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-all",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border group-hover:border-primary/50",
          )}
        >
          {selected ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>
      </div>
    </button>
  );
}

/** Checkbox with a wrapping label, for consent statements that run long. */
function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
        className="mt-0.5 shrink-0"
      />
      <span className="text-sm leading-relaxed">
        {label}
        {hint ? (
          <span className="text-muted-foreground mt-1 block text-xs">{hint}</span>
        ) : null}
      </span>
    </label>
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
        "rounded-full border px-3.5 py-2 text-sm transition-all",
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

function CustomCourses({
  label,
  placeholder,
  value,
  onChange,
  onAdd,
  custom,
  onRemove,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  custom: string[];
  onRemove: (course: string) => void;
}) {
  return (
    <div className="mt-6 border-t pt-5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="mt-2 flex gap-2">
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          maxLength={80}
        />
        <Button type="button" variant="outline" onClick={onAdd} disabled={!value.trim()}>
          <Plus />
          <span className="sr-only sm:not-sr-only">Add</span>
        </Button>
      </div>

      {custom.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {custom.map((course) => (
            <Badge key={course} variant="secondary" className="gap-1.5 py-1.5 pr-1.5 pl-3">
              {course}
              <button
                type="button"
                onClick={() => onRemove(course)}
                className="hover:bg-foreground/10 rounded-full p-0.5"
                aria-label={`Remove ${course}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
