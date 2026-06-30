"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Barcode,
  Boxes,
  ClipboardCheck,
  Bot,
  CircleDollarSign,
  CreditCard,
  FileDown,
  Gauge,
  History,
  Layers3,
  MapPin,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  Repeat2,
  Ruler,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Route,
  RadioTower,
  Smartphone,
  Truck,
  Upload,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  external?: boolean;
};

function buildSections({
  inventoryModuleEnabled,
  transportModuleEnabled,
}: {
  inventoryModuleEnabled: boolean;
  transportModuleEnabled: boolean;
}): Array<{ title: string; items: NavItem[] }> {
  const sections: Array<{ title: string; items: NavItem[] }> = [];

  if (inventoryModuleEnabled) {
    sections.push(
      {
        title: "Centro de control",
        items: [
          { href: "/dashboard", label: "Dashboard", description: "KPIs y alertas", icon: Gauge },
          { href: "/scanner", label: "Escaneo rapido", description: "Codigos y QR", icon: Barcode },
          { href: "/stock", label: "Stock", description: "Saldos actuales", icon: Boxes },
          { href: "/stock/kardex", label: "Kardex", description: "Trazabilidad", icon: History },
        ],
      },
      {
        title: "Inventario",
        items: [
          { href: "/products", label: "Productos", description: "Referencias y fotos", icon: Package },
          { href: "/warehouses", label: "Bodegas", description: "Centros operativos", icon: Warehouse },
          { href: "/locations", label: "Ubicaciones", description: "QR y mapa fisico", icon: MapPin },
          { href: "/physical-inventory", label: "Inventario fisico", description: "Conteos y diferencias", icon: ClipboardCheck },
        ],
      },
      {
        title: "Movimientos",
        items: [
          { href: "/movements/entries", label: "Entradas", description: "Compras y ajustes +", icon: PackagePlus },
          { href: "/movements/outputs", label: "Salidas", description: "Consumos y despachos", icon: PackageMinus },
          { href: "/movements/transfers", label: "Transferencias", description: "Entre bodegas", icon: Repeat2 },
          { href: "/movements/adjustments", label: "Ajustes", description: "Correcciones auditadas", icon: PackageCheck },
        ],
      },
      {
        title: "Planeacion",
        items: [
          { href: "/suppliers", label: "Proveedores", description: "Abastecimiento", icon: Truck },
          { href: "/replenishment", label: "Pedido sugerido", description: "Maximos y minimos", icon: ShoppingCart },
          { href: "/imports", label: "Carga masiva", description: "Plantillas flexibles", icon: Upload },
          { href: "/reports", label: "Reportes", description: "Inventario y movimientos", icon: FileDown },
        ],
      },
    );
  }

  if (transportModuleEnabled) {
    sections.push({
      title: "Transporte",
      items: [
        { href: "/transport", label: "Ejecutivo", description: "KPIs y control", icon: Gauge },
        { href: "/transport/control", label: "Torre control", description: "Mapa y excepciones", icon: RadioTower },
        { href: "/transport/orders", label: "Ordenes", description: "Despacho y POD", icon: ClipboardCheck },
        { href: "/transport/fleet", label: "Flota", description: "Vehiculos y activos", icon: Truck },
        { href: "/transport/drivers", label: "Conductores", description: "Turnos y seguridad", icon: Users },
        { href: "/transport/routes", label: "Rutas", description: "Planeacion y ETA", icon: Route },
        { href: "/transport/maintenance", label: "Mantenimiento", description: "Taller y checklist", icon: Wrench },
        { href: "/transport/costs", label: "Costos de flota", description: "Combustible y llantas", icon: CircleDollarSign },
        { href: "/transport/finance", label: "Finanzas", description: "Rentabilidad", icon: CreditCard },
        { href: "/transport/analytics", label: "Analitica IA", description: "Predicciones", icon: Bot },
        { href: "/transport/driver", label: "Conductor", description: "POD movil", icon: Smartphone },
        { href: "/transport/integrations", label: "Integraciones", description: "GPS, ERP e inventario", icon: Settings },
      ],
    });
  }

  sections.push({
    title: "Parametrizacion",
    items: [
      ...(inventoryModuleEnabled ? [
        { href: "/categories", label: "Categorias", description: "Familias de producto", icon: Layers3 },
        { href: "/units", label: "Unidades", description: "Medidas y tipos", icon: Ruler },
      ] : []),
      { href: "/users", label: "Usuarios", description: "Accesos operativos", icon: Users },
      { href: "/users/roles", label: "Roles", description: "Permisos base", icon: ShieldCheck },
      { href: "/settings", label: "Configuracion", description: "Empresa y tema", icon: Settings },
      { href: "/audit", label: "Auditoria", description: "Bitacora del sistema", icon: History },
    ],
  });

  return sections;
}

export function SidebarNav({
  variant = "sidebar",
  collapsed = false,
  inventoryModuleEnabled = true,
  transportModuleEnabled = false,
}: {
  variant?: "sidebar" | "mobile";
  collapsed?: boolean;
  inventoryModuleEnabled?: boolean;
  transportModuleEnabled?: boolean;
}) {
  const pathname = usePathname();
  const sections = buildSections({ inventoryModuleEnabled, transportModuleEnabled });

  if (variant === "mobile") {
    const items = sections.flatMap((section) => section.items);

    return (
      <nav className="flex gap-2 overflow-x-auto bg-[#202b3a] px-3 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/transport" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition",
                isActive ? "bg-[#101827] text-cyan-300 shadow-sm" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegacion principal"
      className={cn("premium-scrollbar flex flex-1 flex-col overflow-y-auto bg-[#202b3a] py-4", collapsed ? "gap-3 px-3 pt-12" : "gap-4 px-3")}
    >
      {sections.map((section) => (
        <div key={section.title} className={cn("space-y-2", collapsed && "space-y-1")}>
          {collapsed ? (
            <div className="mx-auto h-px w-8 bg-white/10" aria-hidden="true" />
          ) : (
            <p className="px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{section.title}</p>
          )}
          <div className={cn("space-y-1", collapsed && "space-y-2")}>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/transport" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed ? `${item.label} - ${item.description}` : undefined}
                  className={cn(
                    "group relative flex min-h-11 items-center rounded-xl text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    isActive
                      ? "bg-[#101827] text-cyan-300 shadow-sm shadow-slate-950/20"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {isActive ? <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400" /> : null}
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                      isActive
                        ? "text-cyan-300"
                        : "bg-transparent text-slate-400 group-hover:text-cyan-300",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className={cn("min-w-0 flex-1", collapsed && "hidden")}>
                    <span className="block truncate font-semibold leading-5">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
