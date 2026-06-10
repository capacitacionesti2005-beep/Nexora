"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Building2, PanelLeftClose, PanelLeftOpen, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { NexoraLogo, NexoraMark } from "@/components/brand/nexora-logo";
import { GlobalSearch } from "@/components/layout/global-search";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils/cn";

export function AppShell({
  children,
  user,
  settings,
}: {
  children: ReactNode;
  user: { name?: string | null; companyName: string; roleName: string };
  settings: { theme: string; density: string; accentColor: string };
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setIsSidebarCollapsed(window.localStorage.getItem("inventra360-sidebar") === "collapsed");
  }, []);

  function toggleSidebar() {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("inventra360-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  return (
    <div
      id="inventra360-app-shell"
      className={cn(
        "min-h-screen bg-slate-50 text-slate-950",
        `app-theme-${settings.theme}`,
        `app-density-${settings.density}`,
        `app-accent-${settings.accentColor}`,
      )}
    >
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-30 hidden border-r border-slate-900 bg-[#202b3a] text-white shadow-2xl shadow-slate-950/20 transition-[width] duration-300 lg:flex lg:flex-col",
          isSidebarCollapsed ? "w-20" : "w-80",
        )}
      >
        <div className={cn("border-b border-white/5 py-5", isSidebarCollapsed ? "px-3" : "px-4")}>
          <div className={cn("flex items-center", isSidebarCollapsed ? "justify-center" : "gap-3")}>
            {isSidebarCollapsed ? <NexoraMark className="h-9 w-9" /> : <NexoraLogo />}
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                "ml-auto hidden h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white lg:inline-flex",
                isSidebarCollapsed && "absolute left-1/2 top-[4.6rem] ml-0 -translate-x-1/2",
              )}
              title={isSidebarCollapsed ? "Expandir menu" : "Contraer menu"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
              <span className="sr-only">{isSidebarCollapsed ? "Expandir menu" : "Contraer menu"}</span>
            </button>
          </div>
          <Link
            href="/movements/entries"
            className={cn(
              "mt-5 flex h-10 items-center justify-center gap-2 rounded-md bg-slate-500/70 px-3 text-sm font-bold text-white transition hover:bg-slate-500",
              isSidebarCollapsed && "mx-auto w-11 px-0",
            )}
            title="Nueva entrada"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className={cn(isSidebarCollapsed && "hidden")}>Nueva entrada</span>
          </Link>
        </div>
        <SidebarNav collapsed={isSidebarCollapsed} />
        <div className={cn("border-t border-white/5 bg-[#1c2633] py-4", isSidebarCollapsed ? "px-3" : "px-4")}>
          <div className={cn("rounded-lg bg-cyan-500 px-3 py-3 text-white shadow-sm shadow-cyan-950/20", isSidebarCollapsed && "grid place-items-center px-0")}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <p className={cn("text-[10px] font-black uppercase tracking-[0.14em]", isSidebarCollapsed && "hidden")}>Desarrollado por</p>
            </div>
            <p className={cn("mt-1 truncate text-xs font-bold", isSidebarCollapsed && "hidden")}>NJ Ingenieria Empresarial</p>
          </div>
        </div>
      </aside>

      <div className={cn("transition-[padding] duration-300", isSidebarCollapsed ? "lg:pl-20" : "lg:pl-80")}>
        <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 shadow-sm shadow-slate-200/40 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 lg:hidden">
                <NexoraMark className="h-7 w-7" />
              </div>
              <GlobalSearch />
              <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600 md:hidden">
                <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{user.companyName}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeSwitcher currentTheme={settings.theme} />
              <UserMenu name={user.name} roleName={user.roleName} />
            </div>
          </div>
          <div className="border-t border-slate-200 bg-white lg:hidden">
            <SidebarNav variant="mobile" />
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">{children}</main>
      </div>
    </div>
  );
}
