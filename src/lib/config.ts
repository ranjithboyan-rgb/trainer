// A single switch: if Supabase env is present we run "real" (auth + RLS-backed
// data); otherwise the app boots in DEMO mode with in-memory seed data and no
// sign-in, so `npm run dev` is instantly clickable.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
// Server-only. Powers the public client action page, which has no logged-in
// trainer and so bypasses RLS by token. Never import into client code.
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const isDemo = !isSupabaseConfigured;

export const DEMO_TRAINER_ID = "00000000-0000-0000-0000-000000000001";
