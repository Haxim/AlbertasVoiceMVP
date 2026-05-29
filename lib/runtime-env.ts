import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function runtimeEnv(name: string) {
  const processValue = process.env[name]?.trim();
  if (processValue) return processValue;

  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = (env as Record<string, unknown>)[name];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}
