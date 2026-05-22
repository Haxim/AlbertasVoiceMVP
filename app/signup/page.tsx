import { signup } from "@/lib/actions/auth";
import { Turnstile } from "@/components/turnstile";

export default async function SignupPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">Captain signup</h1>
      {params?.message ? <p className="mt-4 rounded-md bg-white p-3 text-sm">{params.message}</p> : null}
      <form action={signup} className="mt-6 space-y-4 rounded-lg border border-line bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input name="name" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" minLength={8} required className="focus-ring mt-1 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <Turnstile />
        <button className="focus-ring w-full rounded-md bg-spruce px-4 py-3 font-semibold text-white">Create account</button>
      </form>
    </main>
  );
}
