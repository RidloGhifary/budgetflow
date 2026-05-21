"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleDollarSign, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { PublicAuthRedirect } from "@/components/auth/public-auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFriendlyApiError } from "@/lib/api/http";
import { registerSchema, type RegisterFormValues } from "@/lib/validation/auth";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: ""
    }
  });

  const onSubmit: SubmitHandler<RegisterFormValues> = async (values) => {
    setServerError(null);

    try {
      await registerUser(values);
      showToast({ title: "Account created", variant: "success" });
      router.replace("/dashboard");
    } catch (error) {
      setServerError(getFriendlyApiError(error, "register"));
    }
  };

  return (
    <PublicAuthRedirect>
      <main className="min-h-screen bg-[#F8FAF9] px-4 py-8">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CircleDollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">BudgetFlow</p>
                  <p className="text-sm text-muted-foreground">Manual personal finance dashboard</p>
                </div>
              </div>
              <h1 className="mt-10 max-w-lg text-4xl font-bold leading-tight tracking-normal text-foreground">
                Start with wallets, categories, and a clean view of your money.
              </h1>
              <div className="mt-8 rounded-lg border border-border bg-card p-5 shadow-soft">
                <p className="text-sm font-semibold text-foreground">Your workspace begins with structure</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  BudgetFlow will create your account and load default categories when registration succeeds.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-6 shadow-soft sm:p-8">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">BudgetFlow</p>
                  <p className="text-xs text-muted-foreground">Finance dashboard</p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground">Create account</h2>
              <p className="mt-2 text-sm text-muted-foreground">Set up your BudgetFlow workspace.</p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {serverError ? (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">Name</span>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-invalid={Boolean(errors.name)}
                    autoComplete="name"
                    className="pl-9"
                    placeholder="Ari Rahman"
                    {...register("name")}
                  />
                </div>
                {errors.name ? <p className="text-xs text-red-600">{errors.name.message}</p> : null}
              </label>
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
                    autoComplete="new-password"
                    className="pl-9"
                    placeholder="********"
                    type="password"
                    {...register("password")}
                  />
                </div>
                {errors.password ? <p className="text-xs text-red-600">{errors.password.message}</p> : null}
              </label>
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating account..." : "Register"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-semibold text-primary hover:text-[#005F4F]" href="/login">
                Login
              </Link>
            </p>
          </section>
        </div>
      </main>
    </PublicAuthRedirect>
  );
}
