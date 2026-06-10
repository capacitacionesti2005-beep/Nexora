"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Layers3,
  Loader2,
  MapPin,
  Package,
  Repeat2,
  Search,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type SearchResult = {
  id: string;
  type: "Producto" | "Bodega" | "Ubicacion" | "Proveedor" | "Movimiento" | "Categoria";
  title: string;
  subtitle: string;
  href: string;
};

const resultIcons = {
  Producto: Package,
  Bodega: Warehouse,
  Ubicacion: MapPin,
  Proveedor: Truck,
  Movimiento: Repeat2,
  Categoria: Layers3,
} satisfies Record<SearchResult["type"], typeof Package>;

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setResults([]);
          return;
        }

        const payload = (await response.json()) as { results?: SearchResult[] };
        setResults(payload.results ?? []);
        setIsOpen(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function openResult(href: string) {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstResult = results[0];
    if (firstResult) openResult(firstResult.href);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  const showEmpty = query.trim().length >= 2 && !isLoading && results.length === 0;

  return (
    <form ref={containerRef} onSubmit={handleSubmit} className="relative hidden min-w-0 md:block">
      <div className="flex h-10 w-[min(28rem,42vw)] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
          placeholder="Buscar productos, bodegas o movimientos"
          className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-500"
          aria-label="Buscar en Nexora"
        />
        {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : null}
        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Limpiar busqueda</span>
          </button>
        ) : null}
      </div>

      {isOpen && (results.length > 0 || showEmpty) ? (
        <div className="absolute left-0 top-12 z-50 w-[min(34rem,70vw)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-normal text-slate-500">
            Busqueda global
          </div>
          {results.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto p-2">
              {results.map((result) => {
                const Icon = resultIcons[result.type];

                return (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => openResult(result.href)}
                      className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-slate-600",
                          result.type === "Producto" && "border-sky-100 bg-sky-50 text-sky-700",
                          result.type === "Bodega" && "border-slate-200 bg-slate-50 text-slate-700",
                          result.type === "Ubicacion" && "border-emerald-100 bg-emerald-50 text-emerald-700",
                          result.type === "Proveedor" && "border-amber-100 bg-amber-50 text-amber-700",
                          result.type === "Movimiento" && "border-indigo-100 bg-indigo-50 text-indigo-700",
                          result.type === "Categoria" && "border-violet-100 bg-violet-50 text-violet-700",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-950">{result.title}</span>
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            {result.type}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{result.subtitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-5 text-sm text-slate-500">No se encontraron resultados.</div>
          )}
        </div>
      ) : null}
    </form>
  );
}
