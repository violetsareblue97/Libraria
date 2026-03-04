// lib/supabase.ts
// Singleton client Supabase — import file ini di mana saja butuh database

import { createBrowserClient } from "@supabase/ssr";

// lib/supabase.ts
// Singleton browser client Supabase —
// digunakan oleh komponen React dan helper-auth di sisi klien.
// menggunakan `createBrowserClient` agar sesi juga disimpan di cookie,
// sehingga middleware/SSR bisa membaca status user.

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset di .env.local"
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
