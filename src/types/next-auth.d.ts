import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    companyId: string;
    companyName: string;
    roleId: string;
    roleName: string;
    warehouseId?: string | null;
    permissions: string[];
  }

  interface Session {
    user: {
      id: string;
      companyId: string;
      companyName: string;
      roleId: string;
      roleName: string;
      warehouseId?: string | null;
      permissions: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    companyId: string;
    companyName: string;
    roleId: string;
    roleName: string;
    warehouseId?: string | null;
    permissions?: string[];
  }
}
