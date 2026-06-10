"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/modules/audit/log-audit";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function optionalValue(formData: FormData, key: string) {
  const raw = value(formData, key);
  return raw.length > 0 ? raw : undefined;
}

export async function createUser(formData: FormData) {
  const currentUser = await requireUser();
  const schema = z.object({
    firstName: z.string().min(2).max(80),
    lastName: z.string().min(2).max(80),
    email: z.string().email().max(160),
    password: z.string().min(8).max(100),
    phone: z.string().max(40).optional(),
    position: z.string().max(80).optional(),
    roleId: z.string().min(1),
    warehouseId: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  });

  const parsed = schema.safeParse({
    firstName: value(formData, "firstName"),
    lastName: value(formData, "lastName"),
    email: value(formData, "email").toLowerCase(),
    password: value(formData, "password"),
    phone: optionalValue(formData, "phone"),
    position: optionalValue(formData, "position"),
    roleId: value(formData, "roleId"),
    warehouseId: optionalValue(formData, "warehouseId"),
    status: value(formData, "status") || "ACTIVE",
  });

  if (!parsed.success) {
    redirect("/users?error=invalid-user-data");
  }

  const data = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });

  if (existingUser) {
    redirect("/users?error=duplicate-email");
  }

  const [role, warehouse] = await Promise.all([
    prisma.role.findFirst({
      where: {
        id: data.roleId,
        OR: [{ companyId: currentUser.companyId }, { companyId: null }],
      },
    }),
    data.warehouseId
      ? prisma.warehouse.findFirst({ where: { id: data.warehouseId, companyId: currentUser.companyId } })
      : Promise.resolve(null),
  ]);

  if (!role) {
    redirect("/users?error=invalid-role");
  }

  if (data.warehouseId && !warehouse) {
    redirect("/users?error=invalid-warehouse");
  }

  const user = await prisma.user.create({
    data: {
      companyId: currentUser.companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12),
      phone: data.phone,
      position: data.position,
      roleId: role.id,
      warehouseId: warehouse?.id,
      status: data.status,
    },
  });

  await logAudit({
    companyId: currentUser.companyId,
    userId: currentUser.id,
    action: "user.create",
    entity: "User",
    entityId: user.id,
    newValue: { ...user, passwordHash: "[redacted]" },
  });

  revalidatePath("/users");
  redirect("/users?created=1");
}

export async function createRole(formData: FormData) {
  const user = await requireUser();
  const schema = z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(240).optional(),
    permissionIds: z.array(z.string()).default([]),
  });

  const data = schema.parse({
    name: value(formData, "name"),
    description: optionalValue(formData, "description"),
    permissionIds: formData.getAll("permissionIds").map(String),
  });

  const role = await prisma.role.create({
    data: {
      companyId: user.companyId,
      name: data.name,
      description: data.description,
      isSystem: false,
      permissions: {
        create: data.permissionIds.map((permissionId) => ({ permissionId })),
      },
    },
    include: { permissions: true },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "role.create",
    entity: "Role",
    entityId: role.id,
    newValue: role,
  });

  revalidatePath("/users/roles");
  redirect("/users/roles?created=1");
}
