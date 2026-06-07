import { runtimeEnv } from "@/lib/runtime-env";

export async function getRuntimeAppUrl() {
  const appUrl = await runtimeEnv("NEXT_PUBLIC_APP_URL");
  if (appUrl) return appUrl.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required to generate public links.");
  }

  return "http://localhost:3000";
}
