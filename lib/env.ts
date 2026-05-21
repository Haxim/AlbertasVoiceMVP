function requiredEnv(name: string, value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required. Check .env.local.`);
  return trimmed;
}

export function getSupabaseUrl() {
  const raw = requiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const url = new URL(raw);
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL should be the project API URL only, like https://abc.supabase.co.");
  }
  return url.origin;
}

export function getSupabasePublishableKey() {
  return requiredEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseSecretKey() {
  return requiredEnv(
    "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
