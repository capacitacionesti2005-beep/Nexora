"use client";

import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Barcode, Camera, CheckCircle2, MapPin, Package, Search, Square, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScanResult =
  | {
      id: string;
      status: "found";
      type: "product";
      code: string;
      product: {
        id: string;
        internalCode: string;
        sku?: string | null;
        barcode?: string | null;
        name: string;
        imageUrl?: string | null;
        category?: string | null;
        unit: string;
        stocks: Array<{ warehouse: string; location?: string | null; quantity: string; availableQuantity: string }>;
      };
    }
  | {
      id: string;
      status: "found";
      type: "location";
      code: string;
      location: {
        id: string;
        locationCode: string;
        warehouse: string;
        zone?: string | null;
        aisle?: string | null;
        shelf?: string | null;
        level?: string | null;
        position?: string | null;
        stocks: number;
      };
    }
  | { id: string; status: "not-found"; code: string };

export function ScannerConsole() {
  const [code, setCode] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "active" | "error">("idle");
  const [cameraError, setCameraError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastCameraScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  async function scan(rawCode: string) {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/scanner/lookup?code=${encodeURIComponent(cleanCode)}`);
      const payload = await response.json();
      const id = `${cleanCode}-${Date.now()}`;

      if (response.ok && payload.type === "product") {
        const result: ScanResult = { id, status: "found", type: "product", code: cleanCode, product: payload.product };
        setResults((current) => [result, ...current].slice(0, 30));
      } else if (response.ok && payload.type === "location") {
        const result: ScanResult = { id, status: "found", type: "location", code: cleanCode, location: payload.location };
        setResults((current) => [result, ...current].slice(0, 30));
      } else {
        const result: ScanResult = { id, status: "not-found", code: cleanCode };
        setResults((current) => [result, ...current].slice(0, 30));
      }
    } finally {
      setIsLoading(false);
      setCode("");
      inputRef.current?.focus();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void scan(code);
  }

  async function startCameraScanner() {
    if (!videoRef.current) return;
    setCameraStatus("starting");
    setCameraError("");

    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        const text = result?.getText().trim();
        if (!text) return;

        const now = Date.now();
        const lastScan = lastCameraScanRef.current;
        if (lastScan.code === text && now - lastScan.at < 1800) return;
        lastCameraScanRef.current = { code: text, at: now };
        void scan(text);
      });
      setCameraStatus("active");
    } catch {
      setCameraStatus("error");
      setCameraError("No se pudo iniciar la camara. Revisa permisos del navegador o usa HTTPS/red local confiable.");
    }
  }

  function stopCameraScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraStatus("idle");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Codigo / SKU / ubicacion</span>
            <span className="mt-1 flex h-12 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-100">
              <Barcode className="h-5 w-5 text-slate-400" aria-hidden="true" />
              <input
                ref={inputRef}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoFocus
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Escanea o escribe el codigo"
              />
            </span>
          </label>
          <div className="flex items-end">
            <Button type="submit" className="h-12 w-full md:w-auto" disabled={isLoading}>
              <Search className="h-4 w-4" aria-hidden="true" />
              Buscar
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Camara del celular</h2>
            <p className="text-sm text-slate-500">Lee QR y codigos de barras comunes desde navegador: EAN, UPC, Code 128, Code 39, ITF, Codabar, Data Matrix, PDF417 y otros soportados por ZXing.</p>
          </div>
          <div className="flex gap-2">
            {cameraStatus === "active" ? (
              <Button type="button" variant="secondary" onClick={stopCameraScanner}>
                <Square className="h-4 w-4" aria-hidden="true" />
                Detener
              </Button>
            ) : (
              <Button type="button" onClick={startCameraScanner} disabled={cameraStatus === "starting"}>
                <Camera className="h-4 w-4" aria-hidden="true" />
                {cameraStatus === "starting" ? "Iniciando" : "Usar camara"}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
        </div>
        {cameraError ? <p className="mt-3 text-sm font-medium text-rose-700">{cameraError}</p> : null}
        <p className="mt-3 text-xs text-slate-500">
          Ningun lector garantiza todos los codigos existentes. La lectura depende del formato, impresion, iluminacion, enfoque y camara.
        </p>
      </section>

      <section className="space-y-3">
        {results.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Sin lecturas registradas en esta sesion.
          </div>
        ) : null}

        {results.map((result) => {
          if (result.status === "not-found") {
            return (
              <article key={result.id} className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  No encontrado: {result.code}
                </div>
              </article>
            );
          }

          if (result.type === "location") {
            return (
              <article key={result.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Ubicacion
                      </div>
                      <h2 className="mt-1 font-semibold text-slate-950">{result.location.locationCode}</h2>
                      <p className="text-sm text-slate-500">
                        {result.location.warehouse} / {result.location.zone ?? "-"} / {result.location.aisle ?? "-"} / {result.location.shelf ?? "-"}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="secondary">
                    <Link href={`/locations/${result.location.id}/scan`}>Abrir</Link>
                  </Button>
                </div>
              </article>
            );
          }

          return (
            <article key={result.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 gap-3">
                  {result.product.imageUrl ? (
                    <Image src={result.product.imageUrl} alt={result.product.name} width={56} height={56} className="h-14 w-14 rounded-md border border-slate-200 object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-md bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                      <Package className="h-6 w-6" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Producto
                    </div>
                    <h2 className="mt-1 truncate font-semibold text-slate-950">{result.product.name}</h2>
                    <p className="text-sm text-slate-500">
                      {result.product.internalCode} / {result.product.sku ?? "Sin SKU"} / {result.product.barcode ?? "Sin codigo"}
                    </p>
                  </div>
                </div>
                <Button asChild variant="secondary">
                  <Link href={`/products/${result.product.id}`}>Abrir</Link>
                </Button>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {result.product.stocks.length === 0 ? <p className="text-sm text-slate-500">Sin stock actual.</p> : null}
                {result.product.stocks.map((stock, index) => (
                  <div key={`${result.id}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-950">{stock.warehouse} / {stock.location ?? "Sin ubicacion"}</p>
                    <p className="mt-1 text-slate-600">Disponible: {stock.availableQuantity} {result.product.unit}</p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
