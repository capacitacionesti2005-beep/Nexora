"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
      callbackUrl: searchParams.get("callbackUrl") ?? "/dashboard",
    });

    setIsSubmitting(false);

    if (!result || result.error) {
      setError("Credenciales invalidas o usuario inactivo.");
      return;
    }

    router.push(result.url ?? "/dashboard");
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Correo</span>
        <span className="mt-1 flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100">
          <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input name="email" type="email" autoComplete="email" required className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="admin@nexora.local" />
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Contrasena</span>
        <span className="mt-1 flex h-11 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100">
          <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input name="password" type="password" autoComplete="current-password" required className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Admin12345!" />
        </span>
      </label>

      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Ingresando..." : "Ingresar"}</Button>
    </form>
  );
}
