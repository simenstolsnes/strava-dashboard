import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/** Server-only Supabase client using the service role key. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Throw on Supabase errors so failures never pass silently. */
export function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Database error: ${res.error.message}`);
  return res.data;
}

/**
 * Supabase caps a select at 1000 rows. Page through with range() to get all.
 * `build` must return a fresh query each call.
 */
export async function selectAll<T>(
  build: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> },
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const res = await build().range(from, from + pageSize - 1);
    if (res.error) throw new Error(`Database error: ${res.error.message}`);
    const page = res.data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
