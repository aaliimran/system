// System intensity — CLAUDE.md "Resolved Design Decisions #8". Single
// source of truth for quest count and EXP multiplier by intensity level.

export type Intensity = "soft" | "balanced" | "hard";

export type IntensityOption = {
  value: Intensity;
  label: string;
  questCount: number;
  expMultiplier: number;
  hint: string;
};

export const INTENSITY_OPTIONS: IntensityOption[] = [
  {
    value: "soft",
    label: "Soft",
    questCount: 2,
    expMultiplier: 0.8,
    hint: "2 quests/day · ×0.8 EXP",
  },
  {
    value: "balanced",
    label: "Balanced",
    questCount: 3,
    expMultiplier: 1.0,
    hint: "3 quests/day · ×1.0 EXP",
  },
  {
    value: "hard",
    label: "Hard",
    questCount: 4,
    expMultiplier: 1.2,
    hint: "4 quests/day · ×1.2 EXP, more Challenges offered",
  },
];

export function getIntensityOption(intensity: string): IntensityOption {
  return (
    INTENSITY_OPTIONS.find((o) => o.value === intensity) ?? INTENSITY_OPTIONS[1]
  );
}
