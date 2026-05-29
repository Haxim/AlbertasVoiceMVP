"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import { getRequestIp, verifyTurnstileToken } from "@/lib/turnstile";

export async function signup(formData: FormData) {
  const h = await headers();
  try {
    await verifyTurnstileToken(formData.get("cf-turnstile-response"), getRequestIp(h));
  } catch (error) {
    redirect(`/signup?message=${encodeURIComponent(error instanceof Error ? error.message : "Human verification failed.")}`);
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  if (error) redirect(`/signup?message=${encodeURIComponent(error.message)}`);
  if (data.user) {
    await ensureAuthProfile(data.user.id, name, email);
  }
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  if (data.user) {
    await ensureAuthProfile(data.user.id, (data.user.user_metadata?.name as string | undefined) || null, data.user.email || email);
  }
  redirect("/dashboard");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect(`/login?message=${encodeURIComponent("Enter your email address.")}`);

  const supabase = await createSupabaseServerClient();
  const redirectTo = `${getAppUrl()}/auth/callback?next=/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);

  redirect(`/login?message=${encodeURIComponent("If an account exists for that email, a reset link has been sent.")}`);
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (password.length < 8) redirect(`/reset-password?message=${encodeURIComponent("Password must be at least 8 characters.")}`);
  if (password !== confirmPassword) redirect(`/reset-password?message=${encodeURIComponent("Passwords do not match.")}`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?message=${encodeURIComponent(error.message)}`);

  redirect(`/login?message=${encodeURIComponent("Password updated. You can log in now.")}`);
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function ensureAuthProfile(id: string, name: string | null, email: string | null) {
  const service = createServiceClient();
  const { data: existing } = await service.from("profiles").select("role,name").eq("id", id).maybeSingle();

  await service.from("profiles").upsert(
    {
      id,
      name: existing?.name || name,
      email,
      role: existing?.role || "CAPTAIN"
    },
    { onConflict: "id" }
  );
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
