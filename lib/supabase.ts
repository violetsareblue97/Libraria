// supabase.ts
// single supabase client instance - import this wherever you need db access
// using createBrowserClient so session is stored in cookies,
// which lets the middleware/SSR also read the auth state

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// crash early with a clear message if env vars are missing
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset di .env.local"
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);