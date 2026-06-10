import { redirect } from "next/navigation";
import { NexoraMark } from "@/components/brand/nexora-logo";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/login-background.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-slate-950/35" aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.88)_0%,rgba(2,6,23,0.52)_48%,rgba(2,6,23,0.22)_100%)]" aria-hidden="true" />

      <section className="relative z-10 flex min-h-screen flex-col justify-between px-4 py-5 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <NexoraMark className="h-10 w-10 shadow-lg shadow-cyan-500/30" />
          <div>
            <span className="block text-lg font-semibold">Nexora</span>
            <span className="block text-xs text-cyan-100">por NJ Ingenieria Empresarial</span>
          </div>
        </div>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_440px]">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-cyan-200">Plataforma empresarial inteligente</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
              Inventario, trazabilidad y operacion empresarial en una sola plataforma.
            </h1>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm text-slate-100">
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">Multiempresa</div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">Roles base</div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">Audit-ready</div>
            </div>
          </div>

          <div className="w-full rounded-lg border border-white/20 bg-white/95 p-6 text-slate-950 shadow-2xl shadow-slate-950/40 backdrop-blur-md">
            <div className="mb-6">
              <p className="text-sm font-medium text-cyan-700">Nexora</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">Ingresar</h2>
            </div>
            <LoginForm />
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <span>Nexora MVP</span>
          <span className="rounded-md border border-lime-300/30 bg-lime-300/10 px-3 py-2 font-semibold text-lime-200 shadow-sm shadow-lime-950/30">
            Desarrollado por NJ Ingenieria Empresarial
          </span>
        </div>
      </section>
    </main>
  );
}
