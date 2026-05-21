"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  if (error) redirect(`/signup?message=${encodeURIComponent(error.message)}`);
  if (data.user) {
    const service = createServiceClient();
    await service.from("profiles").upsert({ id: data.user.id, name, email, role: "CAPTAIN" });
  }
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function logout() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
