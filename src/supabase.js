import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://tgaezdfeahplbfiuegyd.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_9KZTUtf3SwGdkVkIrSFasw_Eg5ylzHJ";

export const supabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_URL.includes(".supabase.co") &&
  SUPABASE_ANON_KEY.startsWith("sb_publishable_");

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
