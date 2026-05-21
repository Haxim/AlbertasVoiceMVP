import { login } from "@/lib/actions/auth";

export default function LoginPage({
  searchParams
}: {
  searchParams?: { message?: string };
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Captain login</h1>
      <p className="mt-2 text-ink/70">Use Supabase Auth. Passwords are never stored by this app.</p>
      {searchParams?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{searchParams.message}</p> : null}
      <form action={login} className="mt-6 space-y-4 rounded-lg border border-line bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <button className="focus-ring w-full rounded-md bg-spruce px-4 py-3 font-semibold text-white">Log in</button>
      </form>
    </main>
  );
}
