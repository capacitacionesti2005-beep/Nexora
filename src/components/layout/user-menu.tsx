"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, roleName }: { name?: string | null; roleName: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{roleName}</p>
      </div>
      <Button variant="secondary" className="h-9 px-3" onClick={() => signOut({ callbackUrl: "/login" })}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Salir</span>
      </Button>
    </div>
  );
}
