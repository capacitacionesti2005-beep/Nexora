import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";
import type { PermissionCode } from "@/lib/permissions/permissions";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function userHasPermission(user: { permissions?: string[] }, permission: PermissionCode) {
  return user.permissions?.includes(permission) ?? false;
}
