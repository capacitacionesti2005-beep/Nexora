import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  tone,
  icon: Icon,
  href,
  description,
}: {
  title: string;
  value: string;
  tone: "green" | "blue" | "amber" | "red" | "slate";
  icon: LucideIcon;
  href?: string;
  description?: string;
}) {
  const tones = {
    green: {
      card: "from-emerald-500/10",
      icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      bar: "bg-gradient-to-r from-emerald-500 to-cyan-400",
    },
    blue: {
      card: "from-sky-500/10",
      icon: "bg-sky-50 text-sky-700 ring-sky-100",
      bar: "bg-gradient-to-r from-sky-500 to-cyan-400",
    },
    amber: {
      card: "from-amber-500/10",
      icon: "bg-amber-50 text-amber-700 ring-amber-100",
      bar: "bg-gradient-to-r from-amber-500 to-orange-400",
    },
    red: {
      card: "from-rose-500/10",
      icon: "bg-rose-50 text-rose-700 ring-rose-100",
      bar: "bg-gradient-to-r from-rose-500 to-pink-400",
    },
    slate: {
      card: "from-slate-500/10",
      icon: "bg-slate-100 text-slate-700 ring-slate-200",
      bar: "bg-gradient-to-r from-slate-500 to-slate-300",
    },
  };
  const palette = tones[tone];

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700">{title}</p>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${palette.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-5 text-4xl font-black tracking-normal text-slate-950">{value}</p>
      {description ? <p className="mt-1 min-h-4 text-xs text-slate-500">{description}</p> : null}
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <span className={`block h-full w-2/3 rounded-full ${palette.bar}`} />
        </span>
        {href ? <span className="text-xs font-bold text-emerald-700">Abrir</span> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`group block rounded-2xl border border-slate-200 bg-gradient-to-br ${palette.card} to-white p-5 shadow-sm shadow-slate-200/70 ring-1 ring-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/80`}>
        {content}
      </Link>
    );
  }

  return <section className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${palette.card} to-white p-5 shadow-sm shadow-slate-200/70 ring-1 ring-white`}>{content}</section>;
}
