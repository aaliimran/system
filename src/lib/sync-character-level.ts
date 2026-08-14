import type { SupabaseClient } from "@supabase/supabase-js";
import { characterLevelFromExp } from "./leveling";
import { rankForLevel } from "./rank";

/**
 * Character Level is fed by total EXP across all skills (decision #1).
 * Recomputed from scratch each call rather than incremented, same pattern
 * as syncComputedStats — always self-corrects regardless of entry point.
 */
export async function syncCharacterLevel(supabase: SupabaseClient, userId: string) {
  const [{ data: skills }, { data: existing }] = await Promise.all([
    supabase.from("skills").select("current_exp").eq("user_id", userId),
    supabase
      .from("users")
      .select("character_level, character_exp")
      .eq("id", userId)
      .single(),
  ]);

  const totalExp = (skills ?? []).reduce(
    (sum, s) => sum + (s.current_exp as number),
    0,
  );
  const newLevel = characterLevelFromExp(totalExp);
  const newRank = rankForLevel(newLevel);

  // character_exp is safe to overwrite unconditionally — it's always
  // recomputed from the source of truth (skills.current_exp).
  await supabase.from("users").update({ character_exp: totalExp }).eq("id", userId);

  if (!existing || existing.character_exp !== totalExp) {
    await supabase
      .from("character_exp_history")
      .insert({ user_id: userId, value: totalExp });
  }

  let leveledUp = false;
  let rankedUp = false;

  if (existing && newLevel !== existing.character_level) {
    if (newLevel > existing.character_level) {
      // This runs on every page load, so concurrent calls (two tabs, route
      // prefetch, etc.) can race here. The `.lt()` condition makes the write
      // atomic at the DB level — only the call that actually wins the bump
      // gets a row back and logs the Level Up / Rank Up moment, so the same
      // transition can't be logged twice.
      const { data: claimed } = await supabase
        .from("users")
        .update({ character_level: newLevel })
        .eq("id", userId)
        .lt("character_level", newLevel)
        .select("character_level")
        .maybeSingle();

      if (claimed) {
        leveledUp = true;
        rankedUp = newRank !== rankForLevel(existing.character_level);

        await supabase.from("codex_entries").insert({
          user_id: userId,
          entry_type: "character_level_up",
          title: `Reached Level ${newLevel}`,
          metadata: { level: newLevel },
        });

        if (rankedUp) {
          await supabase.from("codex_entries").insert({
            user_id: userId,
            entry_type: "rank_up",
            title: `Reached Rank ${newRank}`,
            metadata: { rank: newRank, level: newLevel },
          });
        }
      }
    } else {
      // EXP can't normally decrease, but keep character_level in sync with
      // its source of truth if it ever does — no moment to log for that.
      await supabase.from("users").update({ character_level: newLevel }).eq("id", userId);
    }
  }

  return { totalExp, newLevel, leveledUp, newRank, rankedUp };
}
