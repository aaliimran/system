"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CATEGORY_LABELS,
  SKILLS_CATALOG,
  type SkillCategory,
} from "@/lib/skills-catalog";
import { CEFR_TIERS, type CefrTier } from "@/lib/onboarding";
import { INTENSITY_OPTIONS, type Intensity } from "@/lib/intensity";
import { isRedirectError } from "@/lib/is-redirect-error";
import { submitOnboarding, type OnboardingSkillAnswer } from "./actions";

const CATEGORY_ORDER: SkillCategory[] = [
  "PHYSICAL",
  "KNOWLEDGE_CRAFT",
  "PERSONAL_DEVELOPMENT",
];

export function OnboardingForm() {
  const [intensity, setIntensity] = useState<Intensity>("balanced");
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(SKILLS_CATALOG.map((s) => [s.key, 3])),
  );
  const [cefrs, setCefrs] = useState<Record<string, CefrTier>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const skillsByCategory = useMemo(() => {
    const map = new Map<SkillCategory, typeof SKILLS_CATALOG>();
    for (const category of CATEGORY_ORDER) map.set(category, []);
    for (const skill of SKILLS_CATALOG) {
      map.get(skill.category)!.push(skill);
    }
    return map;
  }, []);

  function handleSubmit() {
    setError(null);
    const skills: OnboardingSkillAnswer[] = SKILLS_CATALOG.map((s) => ({
      key: s.key,
      selfRating: ratings[s.key] ?? 3,
      cefr: s.cefr ? cefrs[s.key] : undefined,
    }));

    startTransition(async () => {
      try {
        await submitOnboarding({ intensity, skills });
      } catch (e) {
        if (isRedirectError(e)) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <h2 className="text-sm font-medium text-foreground">
          System intensity
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {INTENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setIntensity(opt.value)}
              className={`rounded-md border px-3 py-3 text-left transition-colors ${
                intensity === opt.value
                  ? "border-foreground bg-foreground/10"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              <div className="text-sm font-medium text-foreground">
                {opt.label}
              </div>
              <div className="mt-1 font-mono text-xs text-muted">
                {opt.hint}
              </div>
            </button>
          ))}
        </div>
      </section>

      {CATEGORY_ORDER.map((category) => (
        <section key={category}>
          <h2 className="text-sm font-medium text-foreground">
            {CATEGORY_LABELS[category]}
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {skillsByCategory.get(category)!.map((skill) => (
              <div
                key={skill.key}
                className="rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
                  <span className="text-sm text-foreground">
                    {skill.name}
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`Rate ${skill.name} ${n} of 5`}
                        onClick={() =>
                          setRatings((r) => ({ ...r, [skill.key]: n }))
                        }
                        className={`h-7 w-7 rounded font-mono text-xs transition-colors ${
                          ratings[skill.key] === n
                            ? "bg-foreground text-background"
                            : "bg-background text-muted hover:text-foreground"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {skill.cefr && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted">CEFR level</span>
                    <select
                      value={cefrs[skill.key] ?? ""}
                      onChange={(e) =>
                        setCefrs((c) => ({
                          ...c,
                          [skill.key]: e.target.value as CefrTier,
                        }))
                      }
                      className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                    >
                      <option value="">—</option>
                      {CEFR_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating character…" : "Begin"}
      </button>
    </div>
  );
}
