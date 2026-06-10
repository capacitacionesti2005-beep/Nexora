import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credenciales",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: {
            company: true,
            role: { include: { permissions: { include: { permission: true } } } },
          },
        });

        if (!user || user.status !== "ACTIVE") return null;

        const isValidPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValidPassword) return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          companyId: user.companyId,
          companyName: user.company.name,
          roleId: user.roleId,
          roleName: user.role.name,
          warehouseId: user.warehouseId,
          permissions: user.role.permissions.map((item: { permission: { code: string } }) => item.permission.code),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.roleId = user.roleId;
        token.roleName = user.roleName;
        token.warehouseId = user.warehouseId;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.companyId = token.companyId;
        session.user.companyName = token.companyName;
        session.user.roleId = token.roleId;
        session.user.roleName = token.roleName;
        session.user.warehouseId = token.warehouseId;
        session.user.permissions = token.permissions ?? [];
      }
      return session;
    },
  },
};
