"use server";

import { createClient } from "@/lib/supabase/server";
import { INTENSITY_OPTIONS, type Intensity } from "@/lib/intensity";

export async function updateIntensity(intensity: Intensity) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in");
  }

  if (!INTENSITY_OPTIONS.some((o) => o.value === intensity)) {
    throw new Error("Invalid intensity value");
  }

  const { error } = await supabase
    .from("users")
    .update({ intensity })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}
