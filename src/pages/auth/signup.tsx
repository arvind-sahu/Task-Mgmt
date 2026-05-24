import { signIn } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import { AuthShell } from "~/components/auth/AuthShell";
import { OAuthButtons } from "~/components/auth/OAuthButtons";
import { getServerAuthSession } from "~/server/auth";
import {
  getOAuthProvidersForAuthPage,
  type OAuthProviderOption,
} from "~/server/oauth";
import { api } from "~/utils/api";
import { getTrpcMutationErrorMessage } from "~/utils/trpcError";

type SignUpPageProps = {
  oauthProviders: OAuthProviderOption[];
};

export default function SignUpPage({ oauthProviders }: SignUpPageProps) {
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
        getTrpcMutationErrorMessage(
          err,
          "Could not send the verification code. Please try again.",
        ),
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
      setError(getTrpcMutationErrorMessage(err, "Could not create account"));
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
      <AuthShell
        title="Create your account"
        subtitle="Start free with email OTP or a connected account. Upgrade only when your team needs more power."
      >
          <form
            onSubmit={(e) =>
              void (otpStep ? handleVerifyAndCreate(e) : handleSendOtp(e))
            }
            className="space-y-5 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-blue-200/60 backdrop-blur-xl"
          >
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                className="brand-input mt-2"
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
                className="brand-input mt-2"
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
                  className="brand-input pr-12"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
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
                  className="brand-input mt-2 tracking-[0.25em]"
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
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                {info}
              </p>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sendSignupOtp.isPending || verifySignupOtpAndRegister.isPending}
              className="brand-button-primary w-full"
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
                className="brand-button-secondary w-full"
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

          <OAuthButtons providers={oauthProviders} callbackUrl="/dashboard" />

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="font-bold text-purple-600 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
      </AuthShell>
    </>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerAuthSession(ctx);
  if (session) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return {
    props: {
      oauthProviders: getOAuthProvidersForAuthPage(),
    },
  };
}
