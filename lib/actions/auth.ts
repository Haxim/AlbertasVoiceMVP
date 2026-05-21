"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
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
    const service = createServiceClient();
    await service.from("profiles").upsert({ id: data.user.id, name, email, role: "CAPTAIN" });
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
    const service = createServiceClient();
    await service.from("profiles").upsert(
      {
        id: data.user.id,
        name: (data.user.user_metadata?.name as string | undefined) || null,
        email: data.user.email || email,
        role: "CAPTAIN"
      },
      { onConflict: "id" }
    );
  }
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
