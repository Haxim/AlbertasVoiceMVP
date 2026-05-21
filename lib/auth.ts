import { redirect } from "next/navigation";
import { createServiceClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", auth.user.id).single();
  if (!error && data) return data as Profile;

  const service = createServiceClient();
  const fallbackProfile = {
    id: auth.user.id,
    name: (auth.user.user_metadata?.name as string | undefined) || null,
    email: auth.user.email || null,
    role: "CAPTAIN"
  };
  const { data: createdProfile, error: createError } = await service
    .from("profiles")
    .upsert(fallbackProfile, { onConflict: "id" })
    .select("*")
    .single();
  if (createError || !createdProfile) return null;
  return createdProfile as Profile;
}

export async function requireCaptain() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireAdmin(profile?: Profile | null) {
  const activeProfile = profile ?? (await getCurrentProfile());
  if (!activeProfile) redirect("/login");
  if (activeProfile.role !== "ADMIN") redirect("/dashboard");
  return activeProfile;
}
