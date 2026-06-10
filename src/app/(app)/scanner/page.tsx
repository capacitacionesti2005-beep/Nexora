import { Barcode } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ScannerConsole } from "@/app/(app)/scanner/scanner-console";

export default function ScannerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Escaneo rapido"
        description="Consola multi-codigo para lectores Bluetooth/USB y camara del celular desde navegador."
        actions={
          <div className="hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm md:flex">
            <Barcode className="mr-2 h-4 w-4" aria-hidden="true" />
            Multi-lectura
          </div>
        }
      />
      <ScannerConsole />
    </div>
  );
}
