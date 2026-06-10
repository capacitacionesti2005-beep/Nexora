import { Field, SelectInput, TextInput } from "@/components/forms/field";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, StatusBadge } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { createUser } from "@/modules/users/application/user-actions";

function userErrorMessage(error?: string) {
  const messages: Record<string, string> = {
    "invalid-user-data": "Revisa los datos: nombre y apellido deben tener minimo 2 caracteres, el correo debe ser valido y la contrasena minimo 8 caracteres.",
    "duplicate-email": "Ya existe un usuario registrado con ese correo.",
    "invalid-role": "Selecciona un rol valido para el usuario.",
    "invalid-warehouse": "La bodega seleccionada no esta disponible.",
  };

  return error ? messages[error] ?? "No fue posible crear el usuario. Revisa los datos e intenta nuevamente." : null;
}

export default async function UsersPage({ searchParams }: { searchParams?: Promise<{ created?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const currentUser = await requireUser();
  const [users, roles, warehouses] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: currentUser.companyId },
      include: { role: true, warehouse: true },
      orderBy: [{ status: "asc" }, { firstName: "asc" }],
    }),
    prisma.role.findMany({
      where: { OR: [{ companyId: currentUser.companyId }, { companyId: null }] },
      orderBy: { name: "asc" },
    }),
    prisma.warehouse.findMany({
      where: { companyId: currentUser.companyId, status: "ACTIVE" },
      orderBy: { code: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" description="Gestiona usuarios de la empresa, rol, estado y bodega asignada." />
      {params.created ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">Usuario creado correctamente.</div> : null}
      {userErrorMessage(params.error) ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {userErrorMessage(params.error)}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Nuevo usuario</h2>
        <form action={createUser} className="mt-4 grid gap-4 lg:grid-cols-4">
          <Field label="Nombre">
            <TextInput name="firstName" required minLength={2} maxLength={80} />
          </Field>
          <Field label="Apellido">
            <TextInput name="lastName" required minLength={2} maxLength={80} />
          </Field>
          <Field label="Correo">
            <TextInput name="email" type="email" required maxLength={160} />
          </Field>
          <Field label="Contrasena inicial">
            <TextInput name="password" type="password" required minLength={8} maxLength={100} />
          </Field>
          <Field label="Telefono">
            <TextInput name="phone" maxLength={40} />
          </Field>
          <Field label="Cargo">
            <TextInput name="position" maxLength={80} />
          </Field>
          <Field label="Rol">
            <SelectInput name="roleId" required defaultValue="">
              <option value="" disabled>Seleccionar</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Bodega asignada">
            <SelectInput name="warehouseId" defaultValue="">
              <option value="">Sin asignar</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Estado">
            <SelectInput name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </SelectInput>
          </Field>
          <div className="flex items-end lg:col-span-3">
            <Button type="submit">Crear usuario</Button>
          </div>
        </form>
      </section>

      <DataTable columns={["Nombre", "Correo", "Cargo", "Rol", "Bodega", "Ultimo acceso", "Estado"]}>
        {users.map((user) => (
          <tr key={user.id}>
            <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">{user.firstName} {user.lastName}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.email}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.position ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.role.name}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.warehouse?.code ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.lastLoginAt?.toLocaleDateString("es-CO") ?? "-"}</td>
            <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={user.status} /></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
