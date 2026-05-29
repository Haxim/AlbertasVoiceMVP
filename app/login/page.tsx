import { login, requestPasswordReset } from "@/lib/actions/auth";

export default function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  // Search params are unwrapped with React.use in client components; this page stays server-side.
  return <LoginContent searchParams={searchParams} />;
}

async function LoginContent({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Captain login</h1>
      {params?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{params.message}</p> : null}
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
      <details className="mt-4 rounded-lg border border-line bg-white p-5">
        <summary className="cursor-pointer font-semibold text-spruce">Forgot password?</summary>
        <form action={requestPasswordReset} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
          </label>
          <button className="focus-ring w-full rounded-md border border-line px-4 py-3 font-semibold">Send reset link</button>
        </form>
      </details>
    </main>
  );
}
