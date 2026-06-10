import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function AuditPage() {
  const user = await requireUser();
  const logs = await prisma.auditLog.findMany({
    where: { companyId: user.companyId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Ultimas acciones criticas registradas para la empresa activa." />
      <DataTable columns={["Fecha", "Usuario", "Accion", "Entidad", "Id entidad"]}>
        {logs.map((log) => (
          <tr key={log.id}>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.createdAt.toLocaleString("es-CO")}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.user ? `${log.user.firstName} ${log.user.lastName}` : "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{log.action}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.entity}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{log.entityId ?? "-"}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
