import { getCloudflareContext } from "@opennextjs/cloudflare";

export function runtimeEnvSync(name: string) {
  try {
    const { env } = getCloudflareContext();
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Non-Cloudflare contexts, like local tests and static builds, fall back to process.env below.
  }

  const processValue = process.env[name]?.trim();
  return processValue || undefined;
}

export async function runtimeEnv(name: string) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Non-Cloudflare contexts, like local tests, fall back to process.env below.
  }

  const processValue = process.env[name]?.trim();
  return processValue || undefined;
}
