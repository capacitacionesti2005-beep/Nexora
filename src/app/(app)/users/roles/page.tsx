import { Field, TextArea, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createRole } from "@/modules/users/application/user-actions";

export default async function RolesPage({ searchParams }: { searchParams?: Promise<{ created?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const user = await requireUser();
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: { OR: [{ companyId: user.companyId }, { companyId: null }] },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Roles y permisos" description="Crea roles por empresa y asigna permisos funcionales." />
      {params.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Rol creado correctamente.</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nuevo rol</h2>
        <form action={createRole} className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Nombre">
              <TextInput name="name" required />
            </Field>
            <Field label="Descripcion">
              <TextArea name="description" />
            </Field>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {permissions.map((permission) => (
              <label key={permission.id} className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <input name="permissionIds" type="checkbox" value={permission.id} className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700" />
                <span>
                  <span className="block font-medium text-slate-950">{permission.name}</span>
                  <span className="block text-xs text-slate-500">{permission.code}</span>
                </span>
              </label>
            ))}
          </div>
          <Button type="submit">Crear rol</Button>
        </form>
      </section>

      <DataTable columns={["Rol", "Descripcion", "Sistema", "Usuarios", "Permisos"]}>
        {roles.map((role) => (
          <tr key={role.id}>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{role.name}</td>
            <td className="min-w-64 px-4 py-3 text-slate-600">{role.description ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{role.isSystem ? "Si" : "No"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{role._count.users}</td>
            <td className="min-w-96 px-4 py-3 text-slate-600">{role.permissions.map((item) => item.permission.code).join(", ") || "-"}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
