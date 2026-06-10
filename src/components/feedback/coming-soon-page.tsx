import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export function ComingSoonPage({
  title,
  description,
  icon,
  phase,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{phase}</div>
        <EmptyState icon={icon} title="Modulo preparado" description="La ruta, layout y proteccion ya estan listos. La logica operativa se construira en la fase correspondiente." />
      </section>
    </div>
  );
}
