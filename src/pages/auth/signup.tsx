import { signIn } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import { getServerAuthSession } from "~/server/auth";
import { api } from "~/utils/api";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const register = api.user.register.useMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      await register.mutateAsync({ name, email, password });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create account",
      );
      return;
    }

    // Auto sign-in after a successful registration so the user lands on the
    // dashboard with no extra step.
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (!res || res.error) {
      setError("Account created. Please sign in.");
      void router.push("/auth/signin");
      return;
    }
    void router.push("/dashboard");
  }

  return (
    <>
      <Head>
        <title>Sign up · Tasker</title>
      </Head>
      <div className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              T
            </div>
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Start collaborating on tasks in minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4">
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="input mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password (min 8 characters)
              </label>
              <input
                id="password"
                type="password"
                className="input mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={register.isPending}
              className="btn-primary w-full"
            >
              {register.isPending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-indigo-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerAuthSession(ctx);
  if (session) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return { props: {} };
}
