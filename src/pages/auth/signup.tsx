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
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendSignupOtp = api.user.sendSignupOtp.useMutation();
  const verifySignupOtpAndRegister =
    api.user.verifySignupOtpAndRegister.useMutation();

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    setError(null);

    try {
      const res = await sendSignupOtp.mutateAsync({ name, email, password });
      setOtpStep(true);
      setInfo(res.message);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send OTP",
      );
      return;
    }
  }

  async function handleVerifyAndCreate(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    setError(null);
    try {
      await verifySignupOtpAndRegister.mutateAsync({
        name,
        email,
        password,
        otp,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
      return;
    }

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
      <div className="auth-bg grid min-h-screen place-items-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
              T
            </div>
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <p className="mt-1 text-sm text-slate-600">
              Start collaborating on tasks in minutes
            </p>
          </div>

          <form
            onSubmit={(e) =>
              void (otpStep ? handleVerifyAndCreate(e) : handleSendOtp(e))
            }
            className="card glass-card space-y-4"
          >
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
                disabled={otpStep}
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
                disabled={otpStep}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password (min 8 characters)
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  disabled={otpStep}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {otpStep && (
              <div>
                <label className="label" htmlFor="otp">
                  Email OTP
                </label>
                <input
                  id="otp"
                  type="text"
                  className="input mt-1 tracking-[0.25em]"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
            )}

            {info && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
                {info}
              </p>
            )}

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sendSignupOtp.isPending || verifySignupOtpAndRegister.isPending}
              className="btn-primary w-full"
            >
              {!otpStep
                ? sendSignupOtp.isPending
                  ? "Sending OTP..."
                  : "Send OTP"
                : verifySignupOtpAndRegister.isPending
                  ? "Verifying..."
                  : "Verify OTP & create account"}
            </button>
            {otpStep && (
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => {
                  setOtpStep(false);
                  setOtp("");
                  setInfo(null);
                  setError(null);
                }}
              >
                Edit details
              </button>
            )}
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
