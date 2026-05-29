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
