import type { SupabaseClient } from "@supabase/supabase-js";
import { characterLevelFromExp } from "./leveling";

/**
 * Character Level is fed by total EXP across all skills (decision #1).
 * Recomputed from scratch each call rather than incremented, same pattern
 * as syncComputedStats — always self-corrects regardless of entry point.
 */
export async function syncCharacterLevel(supabase: SupabaseClient, userId: string) {
  const [{ data: skills }, { data: existing }] = await Promise.all([
    supabase.from("skills").select("current_exp").eq("user_id", userId),
    supabase.from("users").select("character_level").eq("id", userId).single(),
  ]);

  const totalExp = (skills ?? []).reduce(
    (sum, s) => sum + (s.current_exp as number),
    0,
  );
  const newLevel = characterLevelFromExp(totalExp);
  const leveledUp = !!existing && newLevel > existing.character_level;

  await supabase
    .from("users")
    .update({ character_exp: totalExp, character_level: newLevel })
    .eq("id", userId);

  if (leveledUp) {
    await supabase.from("codex_entries").insert({
      user_id: userId,
      entry_type: "character_level_up",
      title: `Reached Level ${newLevel}`,
      metadata: { level: newLevel },
    });
  }

  return { totalExp, newLevel, leveledUp };
}
