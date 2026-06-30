"use client";

import { useRouter } from "next/navigation";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ThemePreference = "light" | "dark" | "system";

const themes: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

function applyThemeClass(theme: ThemePreference) {
  const root = document.getElementById("nexora-app-shell");
  if (!root) return;

  root.classList.remove("app-theme-light", "app-theme-dark", "app-theme-system");
  root.classList.add(`app-theme-${theme}`);
}

export function ThemeSwitcher({ currentTheme }: { currentTheme: string }) {
  const router = useRouter();
  const activeTheme: ThemePreference = currentTheme === "light" || currentTheme === "dark" || currentTheme === "system" ? currentTheme : "system";

  function changeTheme(theme: ThemePreference) {
    document.cookie = `nexora-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    applyThemeClass(theme);
    router.refresh();
  }

  return (
    <div className="hidden items-center rounded-md border border-slate-200 bg-slate-50 p-1 md:flex" aria-label="Tema de la plataforma">
      {themes.map((theme) => {
        const Icon = theme.icon;
        const isActive = activeTheme === theme.value;

        return (
          <button
            key={theme.value}
            type="button"
            onClick={() => changeTheme(theme.value)}
            title={`Tema ${theme.label}`}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-white hover:text-slate-900",
              isActive ? "bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200" : "",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Tema {theme.label}</span>
          </button>
        );
      })}
    </div>
  );
}
