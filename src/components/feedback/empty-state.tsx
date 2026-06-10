import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div>
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-sm font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
