import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only contexts with no user session
 * (the cron-triggered Daily Composer). Bypasses RLS — never expose to the
 * client, never use inside a request handler that has a real user session
 * (use the cookie-scoped client from lib/supabase/server.ts there instead).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
