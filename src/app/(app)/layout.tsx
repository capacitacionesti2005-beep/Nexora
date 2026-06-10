import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

function themePreference(value?: string) {
  return value === "light" || value === "dark" || value === "system" ? value : undefined;
}

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const cookieStore = await cookies();
  const userTheme = themePreference(cookieStore.get("inventra360-theme")?.value);
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: user.companyId },
    select: {
      uiTheme: true,
      uiDensity: true,
      accentColor: true,
    },
  });

  return (
    <AppShell
      user={user}
      settings={{
        theme: userTheme ?? company.uiTheme,
        density: company.uiDensity,
        accentColor: company.accentColor,
      }}
    >
      {children}
    </AppShell>
  );
}
