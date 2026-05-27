"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { PublicAuthRedirect } from "@/components/auth/public-auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TwoFactorChallenge } from "@/lib/api/auth.api";
import { ApiError, getFriendlyApiError } from "@/lib/api/http";
import { getSafeNextPath } from "@/lib/navigation";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, useRecoveryCode, verifyTwoFactor } = useAuth();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [challengeMode, setChallengeMode] = useState<"totp" | "recovery">("totp");
  const [challengeCode, setChallengeCode] = useState("");
  const [isVerifyingChallenge, setIsVerifyingChallenge] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setServerError(null);

    try {
      const result = await login(values);

      if ("twoFactorRequired" in result) {
        setChallenge(result);
        setChallengeMode("totp");
        setChallengeCode("");
        return;
      }

      showToast({ title: "Logged in", variant: "success" });
      router.replace(getSafeNextPath());
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 401 ? "Email or password is incorrect." : getFriendlyApiError(error, "login");
      setServerError(message);
    }
  };

  const handleChallengeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!challenge) {
      return;
    }

    setServerError(null);
    setIsVerifyingChallenge(true);

    try {
      if (challengeMode === "totp") {
        await verifyTwoFactor({
          challengeId: challenge.challengeId,
          challengeToken: challenge.challengeToken,
          code: challengeCode
        });
      } else {
        await useRecoveryCode({
          challengeId: challenge.challengeId,
          challengeToken: challenge.challengeToken,
          recoveryCode: challengeCode
        });
      }

      showToast({ title: "Logged in", variant: "success" });
      router.replace(getSafeNextPath());
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 401
          ? "The verification code could not be confirmed."
          : getFriendlyApiError(error, "verifyTwoFactor");
      setServerError(message);
    } finally {
      setIsVerifyingChallenge(false);
    }
  };

  return (
    <PublicAuthRedirect>
      <main className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <Image
                  alt="BudgetFlow"
                  className="h-12 w-12 rounded-lg border border-border bg-card object-cover shadow-sm"
                  height={48}
                  src="/icon.png"
                  width={48}
                />
                <div>
                  <p className="text-2xl font-bold text-foreground">BudgetFlow</p>
                  <p className="text-sm text-muted-foreground">Manual personal finance dashboard</p>
                </div>
              </div>
              <h1 className="mt-10 max-w-lg text-4xl font-bold leading-tight tracking-normal text-foreground">
                Keep monthly money movement clear, calm, and visible.
              </h1>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {["Wallet balances", "Budget usage", "Debt tracking", "Saving goals"].map((item) => (
                  <div key={item} className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground shadow-soft">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <Image
                  alt="BudgetFlow"
                  className="h-11 w-11 rounded-lg border border-border bg-card object-cover shadow-sm"
                  height={44}
                  src="/icon.png"
                  width={44}
                />
                <div>
                  <p className="text-xl font-bold text-foreground">BudgetFlow</p>
                  <p className="text-xs text-muted-foreground">Finance dashboard</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">{challenge ? "Verify your sign-in" : "Welcome back"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {challenge
                  ? `Enter the authenticator code for ${challenge.email}.`
                  : "Sign in to view your finance dashboard."}
              </p>
            </div>

            {!challenge ? (
            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {serverError ? (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-invalid={Boolean(errors.email)}
                    autoComplete="email"
                    className="pl-9"
                    placeholder="ari.rahman@example.com"
                    type="email"
                    {...register("email")}
                  />
                </div>
                {errors.email ? <p className="text-xs text-red-600">{errors.email.message}</p> : null}
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Password</span>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-invalid={Boolean(errors.password)}
                    autoComplete="current-password"
                    className="pl-9"
                    placeholder="********"
                    type="password"
                    {...register("password")}
                  />
                </div>
                {errors.password ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}
              </label>
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Logging in..." : "Login"}
              </Button>
            </form>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={handleChallengeSubmit}>
                {serverError ? (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>
                ) : null}

                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">Two-factor authentication required</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Full access is not granted until this verification step succeeds.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-1">
                  <button
                    aria-pressed={challengeMode === "totp"}
                    className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                      challengeMode === "totp" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                      setChallengeMode("totp");
                      setChallengeCode("");
                      setServerError(null);
                    }}
                    type="button"
                  >
                    Authenticator
                  </button>
                  <button
                    aria-pressed={challengeMode === "recovery"}
                    className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                      challengeMode === "recovery" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                      setChallengeMode("recovery");
                      setChallengeCode("");
                      setServerError(null);
                    }}
                    type="button"
                  >
                    Recovery code
                  </button>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {challengeMode === "totp" ? "Authenticator code" : "Recovery code"}
                  </span>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoComplete="one-time-code"
                      className="pl-9"
                      inputMode={challengeMode === "totp" ? "numeric" : "text"}
                      onChange={(event) => setChallengeCode(event.target.value)}
                      placeholder={challengeMode === "totp" ? "123456" : "ABCD-EFGH-IJKL"}
                      required
                      type="text"
                      value={challengeCode}
                    />
                  </div>
                </label>

                <Button className="w-full" disabled={isVerifyingChallenge || challengeCode.trim().length < 6} type="submit">
                  {isVerifyingChallenge ? "Verifying..." : "Verify and login"}
                </Button>
                <Button
                  className="w-full"
                  disabled={isVerifyingChallenge}
                  onClick={() => {
                    setChallenge(null);
                    setChallengeCode("");
                    setServerError(null);
                  }}
                  type="button"
                  variant="outline"
                >
                  Use a different account
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              New to BudgetFlow?{" "}
              <Link className="font-semibold text-primary hover:text-primary/80" href="/register">
                Create an account
              </Link>
            </p>
          </section>
        </div>
      </main>
    </PublicAuthRedirect>
  );
}
