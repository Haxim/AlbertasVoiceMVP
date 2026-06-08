import { runtimeEnv } from "@/lib/runtime-env";

export function normalizeAppUrl(appUrl: string) {
  return appUrl.trim().replace(/\/$/, "");
}

export async function getRuntimeAppUrl() {
  const appUrl = await runtimeEnv("NEXT_PUBLIC_APP_URL");
  if (appUrl) return normalizeAppUrl(appUrl);

  throw new Error("NEXT_PUBLIC_APP_URL is required to generate public links.");
}
