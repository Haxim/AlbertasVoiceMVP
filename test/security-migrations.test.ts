import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = join(process.cwd(), "supabase", "migrations");

function migration(name: string) {
  return readFileSync(join(migrationsDir, name), "utf8").toLowerCase();
}

function allMigrations() {
  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationsDir, file), "utf8").toLowerCase())
    .join("\n");
}

describe("security migrations", () => {
  it("replaces the unsafe profile update policy that allowed self role escalation", () => {
    const sql = migration("202606040001_lock_profile_roles.sql");

    expect(sql).toContain('drop policy if exists "profiles_update_own_name_or_admin"');
    expect(sql).toContain('create policy "profiles_update_own_identity"');
    expect(sql).toContain('create policy "profiles_update_admin"');
    expect(sql).toContain("prevent_non_admin_profile_role_change");
  });

  it("limits non-admin profile updates to non-privileged fields", () => {
    const sql = [
      migration("202606040002_lock_profile_privileged_fields.sql"),
      migration("202606070004_lock_captain_email_alias.sql")
    ].join("\n");

    expect(sql).toContain("prevent_non_admin_profile_privileged_change");
    expect(sql).toContain("only admins can change profile roles");
    expect(sql).toContain("only admins can change profile emails");
    expect(sql).toContain("only admins can change profile creation timestamps");
    expect(sql).toContain("only admins can change captain email aliases");
  });

  it("keeps admin-only tables behind admin RLS policies", () => {
    const sql = allMigrations();

    expect(sql).toContain('create policy "broadcasts_admin_all" on public.broadcasts');
    expect(sql).toContain('create policy "broadcast_deliveries_admin_all" on public.broadcast_deliveries');
    expect(sql).toContain("for all using (public.is_admin()) with check (public.is_admin())");
  });
});
