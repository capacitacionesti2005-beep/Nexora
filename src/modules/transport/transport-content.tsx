/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bot,
  Boxes,
  CalendarClock,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  Download,
  FileSignature,
  Filter,
  Fuel,
  Gauge,
  MapPin,
  MapPinned,
  Navigation,
  PackageCheck,
  Plus,
  RadioTower,
  RefreshCcw,
  Route,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Truck,
  UserRoundCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { registerVehicleComponentEvent, runVehicleComponentQuickAction } from "@/modules/transport/application/transport-integration-actions";

type Severity = "critical" | "warning" | "success" | "info";
type OrderStatus = "Planificada" | "Asignada" | "En ruta" | "En riesgo" | "Entregada" | "Incidencia";
type VehicleStatus = "En patio" | "En ruta" | "Mantenimiento" | "Detenido";
type DriverStatus = "Disponible" | "En turno" | "Descanso" | "Bloqueado";
type ViewId = "dashboard" | "control" | "orders" | "fleet" | "drivers" | "routes" | "maintenance" | "costs" | "finance" | "analytics" | "integrations" | "driver";
type PeriodId = "day" | "week" | "month";

export type TransportModule = {
  id: ViewId;
  slug: string;
  label: string;
  icon: LucideIcon;
};

type Kpi = {
  label: string;
  value: string;
  delta: string;
  target: string;
  severity: Severity;
};

type Alert = {
  id?: string;
  title: string;
  detail: string;
  time: string;
  severity: Severity;
  resolved?: boolean;
};

type Order = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  status: OrderStatus;
  priority: "Alta" | "Media" | "Baja";
  eta: string;
  vehicle: string;
  driver: string;
  progress: number;
  value: string;
  pod?: boolean;
};

type Vehicle = {
  plate: string;
  type: string;
  status: VehicleStatus;
  capacity: string;
  utilization: number;
  health: number;
  nextService: string;
  zone: string;
  speed: number;
};

type ComponentCondition = "green" | "yellow" | "red";
type VehicleVisualView = "diagonal" | "left" | "right" | "rear" | "top";

type VehicleComponent = {
  id: string;
  label: string;
  area: string;
  condition: ComponentCondition;
  message: string;
  nextAction: string;
  position: { left: string; top: string };
  view: VehicleVisualView;
  side?: string;
  currentValue?: string;
  threshold?: string;
  nextDueKm?: number | null;
  lastCheckedAt?: string | null;
  events?: Array<{
    id: string;
    eventType: "INSPECTION" | "COMMENT" | "ADJUSTMENT" | "MAINTENANCE" | "REPLACEMENT";
    title: string;
    previousCondition?: ComponentCondition | null;
    newCondition?: ComponentCondition | null;
    currentValue?: string | null;
    nextDueKm?: number | null;
    odometer?: number | null;
    notes?: string | null;
    evidenceUrl?: string | null;
    createdByName?: string | null;
    createdAt: string;
  }>;
};

export type VehicleVisualSnapshot = {
  vehicleId?: string;
  plate: string;
  type: string;
  status: string;
  capacity?: string | null;
  odometer: number;
  currentZone?: string | null;
  vehicleClass: string;
  bodyType: string;
  trailerType?: string | null;
  wheelCount: number;
  refrigerated: boolean;
  hasLiftGate: boolean;
  maintenances: Array<{
    id: string;
    code: string;
    type: string;
    status: string;
    odometer?: number | null;
    notes?: string | null;
    createdAt: string;
  }>;
  components: Array<{
    id: string;
    componentKey: string;
    label: string;
    category: string;
    side?: string | null;
    condition: ComponentCondition;
    currentValue?: string | null;
    threshold?: string | null;
    nextAction?: string | null;
    x: number;
    y: number;
    view: string;
    nextDueKm?: number | null;
    notes?: string | null;
    lastCheckedAt?: string | null;
    events: Array<{
      id: string;
      eventType: "INSPECTION" | "COMMENT" | "ADJUSTMENT" | "MAINTENANCE" | "REPLACEMENT";
      title: string;
      previousCondition?: "green" | "yellow" | "red" | null;
      newCondition?: "green" | "yellow" | "red" | null;
      currentValue?: string | null;
      nextDueKm?: number | null;
      odometer?: number | null;
      notes?: string | null;
      evidenceUrl?: string | null;
      createdByName?: string | null;
      createdAt: string;
    }>;
  }>;
};

type Driver = {
  name: string;
  status: DriverStatus;
  license: string;
  score: number;
  deliveries: number;
  incidents: number;
  shift: string;
};

type Decision = {
  id: string;
  title: string;
  detail: string;
  impact: string;
  status: "Pendiente" | "Aceptada" | "Rechazada";
};

type ActivityEvent = {
  id: string;
  message: string;
  time: string;
};

type FuelLog = {
  id: string;
  vehiclePlate: string;
  driverName: string;
  gallons: number;
  unitPrice: number;
  total: number;
  odometer: number;
  station: string;
  recordedAt: string;
};

type TireAsset = {
  id: string;
  vehiclePlate?: string;
  code: string;
  brand: string;
  position: string;
  status: string;
  treadMm: number;
  pressurePsi: number;
  cost: number;
  updatedAt: string;
};

type TripExpense = {
  id: string;
  orderId?: string;
  vehiclePlate?: string;
  driverName?: string;
  category: string;
  amount: number;
  notes?: string;
  createdAt: string;
};

type TripAdvance = {
  id: string;
  orderId?: string;
  driverName: string;
  amount: number;
  status: string;
  settledAmount: number;
  createdAt: string;
};

type ChecklistRecord = {
  id: string;
  vehiclePlate: string;
  driverName?: string;
  type: string;
  result: string;
  createdAt: string;
};

type AppData = {
  alerts: Alert[];
  orders: Order[];
  fleet: Vehicle[];
  drivers: Driver[];
  decisions: Decision[];
  activity: ActivityEvent[];
  kpis: Kpi[];
  fuelLogs: FuelLog[];
  tires: TireAsset[];
  expenses: TripExpense[];
  advances: TripAdvance[];
  checklists: ChecklistRecord[];
  integration: {
    mode: string;
    inventoryBaseUrl: string;
    sharedLogin: boolean;
  };
};

const pieColors = ["#0f766e", "#f59e0b", "#2563eb", "#dc2626", "#64748b"];
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export const transportModules: TransportModule[] = [
  { id: "dashboard", slug: "dashboard", label: "Ejecutivo", icon: Gauge },
  { id: "control", slug: "control", label: "Torre de control", icon: RadioTower },
  { id: "orders", slug: "orders", label: "Ordenes", icon: ClipboardCheck },
  { id: "fleet", slug: "fleet", label: "Flota", icon: Truck },
  { id: "drivers", slug: "drivers", label: "Conductores", icon: UserRoundCheck },
  { id: "routes", slug: "routes", label: "Rutas", icon: Route },
  { id: "maintenance", slug: "maintenance", label: "Mantenimiento", icon: Wrench },
  { id: "costs", slug: "costs", label: "Costos de flota", icon: CircleDollarSign },
  { id: "finance", slug: "finance", label: "Finanzas", icon: CreditCard },
  { id: "analytics", slug: "analytics", label: "Analitica IA", icon: Bot },
  { id: "integrations", slug: "integrations", label: "Integraciones", icon: Settings2 },
  { id: "driver", slug: "driver", label: "Conductor", icon: Smartphone },
];

const executiveKpis: Kpi[] = [
  { label: "OTIF", value: "96.8%", delta: "+2.1%", target: "Meta > 95%", severity: "success" },
  { label: "Entregas hoy", value: "1,284", delta: "87 en riesgo", target: "1,420 programadas", severity: "warning" },
  { label: "Utilizacion de flota", value: "84%", delta: "+6%", target: "Rango 80%-90%", severity: "success" },
  { label: "Costo por km", value: "$4,180", delta: "-8.4%", target: "COP promedio", severity: "success" },
  { label: "Alertas criticas", value: "12", delta: "4 vencen < 1h", target: "Gestion inmediata", severity: "critical" },
  { label: "Km vacios", value: "9.7%", delta: "-3.2%", target: "Objetivo < 12%", severity: "success" },
];

const initialData: AppData = {
  alerts: [
    { id: "AL-001", title: "Desvio de ruta", detail: "TRK-482 salio de geocerca en corredor Bogota - Mosquera.", time: "Hace 4 min", severity: "critical" },
    { id: "AL-002", title: "ETA en riesgo", detail: "Orden OT-1048 llegaria 32 min tarde por congestion en Calle 80.", time: "Hace 9 min", severity: "warning" },
    { id: "AL-003", title: "POD recibido", detail: "Cliente Alimentos Norte confirmo firma, foto y coordenadas.", time: "Hace 12 min", severity: "success" },
    { id: "AL-004", title: "Mantenimiento predictivo", detail: "Sensor OBD reporta vibracion alta en VAN-221.", time: "Hace 19 min", severity: "info" },
  ],
  orders: [
    { id: "OT-1048", customer: "Alimentos Norte", origin: "Cedi Siberia", destination: "Exito Suba", status: "En riesgo", priority: "Alta", eta: "15:42", vehicle: "TRK-482", driver: "Laura Pardo", progress: 62, value: "$2.8M" },
    { id: "OT-1051", customer: "Farmalog", origin: "Zona Franca", destination: "Clinica Central", status: "En ruta", priority: "Alta", eta: "14:20", vehicle: "VAN-221", driver: "Diego Ruiz", progress: 78, value: "$1.1M" },
    { id: "OT-1057", customer: "Retail Max", origin: "Cedi Funza", destination: "Centro Mayor", status: "Asignada", priority: "Media", eta: "17:10", vehicle: "TRK-615", driver: "Mariana Leon", progress: 21, value: "$3.4M" },
    { id: "OT-1062", customer: "AgroAndes", origin: "Tocancipa", destination: "Corabastos", status: "Entregada", priority: "Baja", eta: "12:05", vehicle: "FUR-009", driver: "Samuel Rojas", progress: 100, value: "$940K", pod: true },
    { id: "OT-1069", customer: "TecnoPartes", origin: "Montevideo", destination: "Parque Industrial Cota", status: "Incidencia", priority: "Media", eta: "16:35", vehicle: "TRK-308", driver: "Camilo Buitrago", progress: 44, value: "$1.7M" },
  ],
  fleet: [
    { plate: "TRK-482", type: "Turbo 4.5T", status: "En ruta", capacity: "4.5 ton", utilization: 91, health: 72, nextService: "620 km", zone: "Occidente", speed: 48 },
    { plate: "VAN-221", type: "Van refrigerada", status: "En ruta", capacity: "1.2 ton", utilization: 64, health: 58, nextService: "120 km", zone: "Norte", speed: 36 },
    { plate: "TRK-615", type: "Sencillo 8T", status: "En patio", capacity: "8 ton", utilization: 12, health: 94, nextService: "2,400 km", zone: "Cedi Funza", speed: 0 },
    { plate: "FUR-009", type: "Furgon", status: "En patio", capacity: "2 ton", utilization: 18, health: 88, nextService: "1,980 km", zone: "Sur", speed: 0 },
    { plate: "TRK-308", type: "Patineta 32T", status: "Detenido", capacity: "32 ton", utilization: 74, health: 67, nextService: "840 km", zone: "Cota", speed: 0 },
  ],
  drivers: [
    { name: "Laura Pardo", status: "En turno", license: "C3 vigente", score: 93, deliveries: 27, incidents: 1, shift: "06:00 - 16:00" },
    { name: "Diego Ruiz", status: "En turno", license: "C2 vigente", score: 88, deliveries: 22, incidents: 0, shift: "05:30 - 15:30" },
    { name: "Mariana Leon", status: "Disponible", license: "C3 vigente", score: 96, deliveries: 18, incidents: 0, shift: "12:00 - 22:00" },
    { name: "Samuel Rojas", status: "Descanso", license: "C2 vence en 42 dias", score: 82, deliveries: 16, incidents: 2, shift: "Finalizado" },
    { name: "Camilo Buitrago", status: "En turno", license: "C3 vigente", score: 79, deliveries: 19, incidents: 3, shift: "07:00 - 17:00" },
  ],
  decisions: [
    { id: "AI-001", title: "Reasignar OT-1048", detail: "Vehiculo alterno TRK-615 reduce ETA en 24 min y evita multa SLA.", impact: "$420K protegidos", status: "Pendiente" },
    { id: "AI-002", title: "Consolidar retorno", detail: "Ruta R-31 tiene 19 km vacios. Hay carga compatible en Cota.", impact: "-7.8% costo/km", status: "Pendiente" },
    { id: "AI-003", title: "Bloquear despacho", detail: "VAN-221 requiere inspeccion por alerta de temperatura.", impact: "Riesgo frio alto", status: "Pendiente" },
  ],
  activity: [{ id: "EV-001", message: "Sistema iniciado con datos de demostracion", time: new Date().toISOString() }],
  kpis: executiveKpis,
  fuelLogs: [
    { id: "FUEL-001", vehiclePlate: "TRK-482", driverName: "Laura Pardo", gallons: 48.5, unitPrice: 10250, total: 497125, odometer: 184220, station: "EDS Siberia", recordedAt: new Date().toISOString() },
    { id: "FUEL-002", vehiclePlate: "VAN-221", driverName: "Diego Ruiz", gallons: 21.8, unitPrice: 10400, total: 226720, odometer: 92310, station: "Terpel Calle 80", recordedAt: new Date().toISOString() },
    { id: "FUEL-003", vehiclePlate: "TRK-308", driverName: "Camilo Buitrago", gallons: 76.2, unitPrice: 10180, total: 775716, odometer: 310884, station: "Primax Cota", recordedAt: new Date().toISOString() },
  ],
  tires: [
    { id: "TIR-001", vehiclePlate: "TRK-482", code: "CTN47", brand: "Continental PowerContact", position: "Direccional izquierda", status: "Montada", treadMm: 8.2, pressurePsi: 110, cost: 1380000, updatedAt: new Date().toISOString() },
    { id: "TIR-002", vehiclePlate: "TRK-482", code: "MCH153", brand: "Michelin Pilote", position: "Direccional derecha", status: "Montada", treadMm: 7.9, pressurePsi: 112, cost: 1510000, updatedAt: new Date().toISOString() },
    { id: "TIR-003", vehiclePlate: "VAN-221", code: "GY51", brand: "Goodyear Cargo", position: "Trasera izquierda", status: "Revision", treadMm: 4.1, pressurePsi: 96, cost: 690000, updatedAt: new Date().toISOString() },
    { id: "TIR-004", code: "CTN07", brand: "Continental PowerContact", position: "Bodega Medellin", status: "Disponible", treadMm: 10.5, pressurePsi: 0, cost: 1290000, updatedAt: new Date().toISOString() },
  ],
  expenses: [
    { id: "EXP-001", orderId: "OT-1048", vehiclePlate: "TRK-482", driverName: "Laura Pardo", category: "Peajes", amount: 126000, notes: "Peajes ruta occidente", createdAt: new Date().toISOString() },
    { id: "EXP-002", orderId: "OT-1051", vehiclePlate: "VAN-221", driverName: "Diego Ruiz", category: "Parqueadero", amount: 18000, notes: "Cliente cadena de frio", createdAt: new Date().toISOString() },
    { id: "EXP-003", orderId: "OT-1069", vehiclePlate: "TRK-308", driverName: "Camilo Buitrago", category: "Viaticos", amount: 90000, notes: "Alimentacion conductor", createdAt: new Date().toISOString() },
  ],
  advances: [
    { id: "ADV-001", orderId: "OT-1048", driverName: "Laura Pardo", amount: 350000, status: "Abierto", settledAmount: 126000, createdAt: new Date().toISOString() },
    { id: "ADV-002", orderId: "OT-1051", driverName: "Diego Ruiz", amount: 180000, status: "Legalizado", settledAmount: 180000, createdAt: new Date().toISOString() },
  ],
  checklists: [{ id: "CHK-001", vehiclePlate: "TRK-482", driverName: "Laura Pardo", type: "Preoperacional", result: "Aprobado", createdAt: new Date().toISOString() }],
  integration: { mode: "suite", inventoryBaseUrl: "http://127.0.0.1:3000/api", sharedLogin: true },
};

const routePlans = [
  { id: "R-18", name: "Bogota Occidente", stops: 42, distance: 188, emptyKm: 14, otif: 96, cost: "$18.2M", restriction: "Pico y placa carga" },
  { id: "R-24", name: "Norte cadena de frio", stops: 31, distance: 126, emptyKm: 8, otif: 98, cost: "$9.7M", restriction: "Cadena de frio" },
  { id: "R-31", name: "Sabana industrial", stops: 56, distance: 244, emptyKm: 19, otif: 94, cost: "$24.8M", restriction: "Ventanas 2h" },
  { id: "R-45", name: "Sur retail", stops: 37, distance: 171, emptyKm: 11, otif: 95, cost: "$13.6M", restriction: "Muelles saturados" },
];

const todayRoutes = [
  { id: "R-18", window: "06:00 - 14:00", customer: "Alimentos Norte", vehicle: "TRK-482", driver: "Laura Pardo", status: "En ruta", stopsDone: 26, stopsTotal: 42, eta: "15:42", risk: "Congestion Calle 80" },
  { id: "R-24", window: "05:30 - 13:30", customer: "Farmalog", vehicle: "VAN-221", driver: "Diego Ruiz", status: "En ruta", stopsDone: 24, stopsTotal: 31, eta: "14:20", risk: "Temperatura por validar" },
  { id: "R-31", window: "10:00 - 18:00", customer: "Retail Max", vehicle: "TRK-615", driver: "Mariana Leon", status: "En patio", stopsDone: 0, stopsTotal: 56, eta: "17:10", risk: "Esperando cargue" },
  { id: "R-45", window: "07:00 - 15:00", customer: "AgroAndes", vehicle: "FUR-009", driver: "Samuel Rojas", status: "Entregada", stopsDone: 37, stopsTotal: 37, eta: "12:05", risk: "Sin novedad" },
];

const routePerformance = {
  day: [
    { name: "R-18", entregas: 42, otif: 96, costoKm: 4180, kmVacios: 14 },
    { name: "R-24", entregas: 31, otif: 98, costoKm: 3920, kmVacios: 8 },
    { name: "R-31", entregas: 56, otif: 94, costoKm: 4360, kmVacios: 19 },
    { name: "R-45", entregas: 37, otif: 95, costoKm: 4070, kmVacios: 11 },
  ],
  week: [
    { name: "Lun", entregas: 940, otif: 94, costoKm: 4310, kmVacios: 15 },
    { name: "Mar", entregas: 1120, otif: 95, costoKm: 4240, kmVacios: 13 },
    { name: "Mie", entregas: 1088, otif: 96, costoKm: 4190, kmVacios: 12 },
    { name: "Jue", entregas: 1236, otif: 97, costoKm: 4110, kmVacios: 10 },
    { name: "Vie", entregas: 1284, otif: 97, costoKm: 4090, kmVacios: 10 },
    { name: "Sab", entregas: 860, otif: 95, costoKm: 4210, kmVacios: 12 },
  ],
  month: [
    { name: "Sem 1", entregas: 5840, otif: 94, costoKm: 4310, kmVacios: 15 },
    { name: "Sem 2", entregas: 6210, otif: 95, costoKm: 4240, kmVacios: 13 },
    { name: "Sem 3", entregas: 6488, otif: 97, costoKm: 4110, kmVacios: 10 },
    { name: "Sem 4", entregas: 6024, otif: 96, costoKm: 4180, kmVacios: 11 },
  ],
} satisfies Record<PeriodId, Array<{ name: string; entregas: number; otif: number; costoKm: number; kmVacios: number }>>;

const customerPerformance = [
  { customer: "Alkosto", assignedVehicles: 10, inUseVehicles: 6, availableVehicles: 4, compliance: 80, utilization: 60, orders: 248, revenue: "$286M", incidents: 7, costPerKm: "$4,920", margin: "18%", trend: "-3%" },
  { customer: "Alimentos Norte", assignedVehicles: 8, inUseVehicles: 7, availableVehicles: 1, compliance: 96, utilization: 88, orders: 284, revenue: "$318M", incidents: 4, costPerKm: "$4,180", margin: "24%", trend: "+6%" },
  { customer: "Farmalog", assignedVehicles: 6, inUseVehicles: 5, availableVehicles: 1, compliance: 98, utilization: 83, orders: 198, revenue: "$221M", incidents: 2, costPerKm: "$3,920", margin: "27%", trend: "+11%" },
  { customer: "Retail Max", assignedVehicles: 12, inUseVehicles: 9, availableVehicles: 3, compliance: 94, utilization: 75, orders: 342, revenue: "$402M", incidents: 9, costPerKm: "$4,360", margin: "21%", trend: "+3%" },
  { customer: "AgroAndes", assignedVehicles: 5, inUseVehicles: 3, availableVehicles: 2, compliance: 95, utilization: 60, orders: 156, revenue: "$144M", incidents: 3, costPerKm: "$4,070", margin: "20%", trend: "-1%" },
  { customer: "TecnoPartes", assignedVehicles: 4, inUseVehicles: 3, availableVehicles: 1, compliance: 91, utilization: 75, orders: 124, revenue: "$119M", incidents: 8, costPerKm: "$4,640", margin: "16%", trend: "-4%" },
];

type CustomerPerformance = (typeof customerPerformance)[number] & { valueAtRisk?: number };

function buildCustomerPerformance(data: AppData): CustomerPerformance[] {
  const byCustomer = new Map<string, CustomerPerformance>();

  data.orders.forEach((order) => {
    if (!byCustomer.has(order.customer)) {
      byCustomer.set(order.customer, {
        customer: order.customer,
        assignedVehicles: 0,
        inUseVehicles: 0,
        availableVehicles: 0,
        compliance: 0,
        utilization: 0,
        orders: 0,
        revenue: "$0",
        incidents: 0,
        costPerKm: "$0",
        margin: "0%",
        trend: "Nuevo",
      });
    }
  });

  return [...byCustomer.values()]
    .map((base) => {
      const orders = data.orders.filter((order) => order.customer === base.customer);
      if (orders.length === 0) return base;

      const assignedPlates = new Set(orders.map((order) => order.vehicle).filter((plate) => plate && plate !== "Sin asignar"));
      const assignedVehicles = assignedPlates.size;
      const inUseVehicles = [...assignedPlates].filter((plate) => {
        const vehicle = data.fleet.find((item) => item.plate === plate);
        const activeOrder = orders.some((order) => order.vehicle === plate && ["En ruta", "En riesgo", "Incidencia"].includes(order.status));
        return vehicle?.status === "En ruta" || activeOrder;
      }).length;
      const availableVehicles = Math.max(0, assignedVehicles - inUseVehicles);
      const compliance = Math.round(orders.reduce((sum, order) => sum + orderComplianceScore(order), 0) / orders.length);
      const utilization = assignedVehicles > 0 ? Math.round((inUseVehicles / assignedVehicles) * 100) : Math.round(orders.reduce((sum, order) => sum + order.progress, 0) / orders.length);
      const revenueValue = orders.reduce((sum, order) => sum + parseTransportMoney(order.value), 0);
      const expenseValue = data.expenses.filter((expense) => orders.some((order) => order.id === expense.orderId)).reduce((sum, expense) => sum + expense.amount, 0);
      const margin = revenueValue > 0 ? Math.round(((revenueValue - expenseValue) / revenueValue) * 100) : Number.parseInt(base.margin, 10) || 0;
      const incidents = orders.filter((order) => ["En riesgo", "Incidencia"].includes(order.status)).length;
      const valueAtRisk = orders.filter((order) => ["En riesgo", "Incidencia"].includes(order.status) || compliance < 95).reduce((sum, order) => sum + parseTransportMoney(order.value), 0);

      return {
        ...base,
        assignedVehicles,
        inUseVehicles,
        availableVehicles,
        compliance,
        utilization,
        orders: orders.length,
        revenue: formatCompactMoney(revenueValue || parseTransportMoney(base.revenue)),
        incidents,
        costPerKm: formatCompactMoney(orders.length > 0 ? Math.round(expenseValue / orders.length) : parseTransportMoney(base.costPerKm)),
        margin: `${margin}%`,
        trend: compliance >= 95 ? "En meta" : `${95 - compliance} pts bajo SLA`,
        valueAtRisk,
      };
    })
    .sort((a, b) => b.orders - a.orders || b.compliance - a.compliance);
}

const mapVehicles = [
  { plate: "TRK-482", position: [4.735, -74.104] as [number, number], status: "En ruta" as VehicleStatus, route: "R-18", eta: "15:42" },
  { plate: "VAN-221", position: [4.639, -74.084] as [number, number], status: "En ruta" as VehicleStatus, route: "R-24", eta: "14:20" },
  { plate: "TRK-615", position: [4.711, -74.214] as [number, number], status: "En patio" as VehicleStatus, route: "R-31", eta: "17:10" },
  { plate: "TRK-308", position: [4.815, -74.098] as [number, number], status: "Detenido" as VehicleStatus, route: "R-31", eta: "16:35" },
];

const mapRoutes = [
  {
    id: "R-18",
    color: "#0f766e",
    label: "Bogota Occidente",
    points: [
      [4.741, -74.166],
      [4.735, -74.136],
      [4.728, -74.112],
      [4.741, -74.084],
    ] as Array<[number, number]>,
  },
  {
    id: "R-24",
    color: "#2563eb",
    label: "Norte cadena de frio",
    points: [
      [4.660, -74.142],
      [4.646, -74.118],
      [4.632, -74.091],
      [4.624, -74.064],
    ] as Array<[number, number]>,
  },
  {
    id: "R-31",
    color: "#dc2626",
    label: "Sabana industrial",
    points: [
      [4.711, -74.214],
      [4.704, -74.176],
      [4.690, -74.145],
      [4.675, -74.120],
      [4.620, -74.124],
    ] as Array<[number, number]>,
  },
];

const costBreakdown = [
  { name: "Combustible", value: 42 },
  { name: "Conductor", value: 24 },
  { name: "Peajes", value: 14 },
  { name: "Mantenimiento", value: 12 },
  { name: "Otros", value: 8 },
];

const integrations = [
  { name: "ERP / contabilidad", status: "Listo", detail: "Facturacion, costos, centros de costo y cartera.", icon: Boxes },
  { name: "GPS y telemetria", status: "Listo", detail: "Posicion, velocidad, odometro, sensores y diagnostico.", icon: Activity },
  { name: "WMS / inventario", status: "Diseno", detail: "Ordenes, picking, muelles, citas y disponibilidad.", icon: BarChart3 },
  { name: "Seguridad vial", status: "Listo", detail: "Score de conduccion, excesos de velocidad e incidentes.", icon: ShieldCheck },
  { name: "POD movil", status: "Listo", detail: "Firma, foto, novedad, QR, modo offline y sincronizacion.", icon: MapPinned },
];

export function getTransportModule(slug: string) {
  if (slug === "dashboard") {
    return transportModules[0];
  }

  return transportModules.find((item) => item.slug === slug);
}

export function TransportDisabled() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Transporte"
        description="El modulo Atlas TMS esta disponible para esta empresa, pero actualmente esta desactivado."
        actions={
          <Button asChild>
            <Link href="/settings">Activar en configuracion</Link>
          </Button>
        }
      />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <EmptyState icon={Route} title="Modulo desactivado" description="Activalo para mostrar operaciones de transporte, flota, costos, POD y app conductor." />
      </section>
    </div>
  );
}

export function TransportDashboard({ suiteEnabled }: { suiteEnabled: boolean }) {
  return <AtlasTransportClient suiteEnabled={suiteEnabled} viewId="dashboard" />;
}

export function TransportModuleDetail({ moduleSlug, suiteEnabled = true }: { moduleSlug: string; suiteEnabled?: boolean }) {
  const transportModule = getTransportModule(moduleSlug);
  return <AtlasTransportClient viewId={transportModule?.id ?? "dashboard"} suiteEnabled={suiteEnabled} />;
}

function AtlasTransportClient({ viewId, suiteEnabled = true }: { viewId: ViewId; suiteEnabled?: boolean }) {
  const [data, setData] = useState<AppData>(() => ({
    ...initialData,
    integration: { ...initialData.integration, mode: suiteEnabled ? "suite" : "api", sharedLogin: suiteEnabled },
  }));
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const activeNav = transportModules.find((item) => item.id === viewId) ?? transportModules[0];
  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data.orders;
    return data.orders.filter((order) => Object.values(order).join(" ").toLowerCase().includes(needle));
  }, [data.orders, query]);

  const pushActivity = (message: string) => {
    setNotice(message);
    setData((current) => ({
      ...current,
      activity: [{ id: `EV-${Date.now()}`, message, time: new Date().toISOString() }, ...current.activity],
    }));
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const payload = event as CustomEvent<{ message?: string }>;
      setNotice(payload.detail?.message ?? "Accion ejecutada.");
    };

    window.addEventListener("atlas-action", handler);
    return () => window.removeEventListener("atlas-action", handler);
  }, []);

  const resetData = () => {
    setData({ ...initialData, integration: { ...initialData.integration, mode: suiteEnabled ? "suite" : "api", sharedLogin: suiteEnabled } });
    pushActivity("Demo reiniciada con datos de Atlas TMS");
  };
  const exportOrders = () => pushActivity("Ordenes exportadas desde Atlas TMS");
  const resolveAlert = (alert: Alert) => {
    setData((current) => ({ ...current, alerts: current.alerts.map((item) => (item.id === alert.id ? { ...item, resolved: true } : item)) }));
    pushActivity(`Alerta resuelta: ${alert.title}`);
  };
  const applyDecision = (decision: Decision) => {
    setData((current) => ({ ...current, decisions: current.decisions.map((item) => (item.id === decision.id ? { ...item, status: "Aceptada" } : item)) }));
    pushActivity(`Decision aplicada: ${decision.title}`);
  };
  const confirmPod = (order: Order) => {
    setData((current) => ({ ...current, orders: current.orders.map((item) => (item.id === order.id ? { ...item, status: "Entregada", progress: 100, pod: true } : item)) }));
    pushActivity(`POD confirmado para ${order.id}`);
  };
  const updateOrderStatus = (order: Order, status: OrderStatus) => {
    setData((current) => ({ ...current, orders: current.orders.map((item) => (item.id === order.id ? { ...item, status, progress: status === "En ruta" ? Math.max(item.progress, 55) : item.progress } : item)) }));
    pushActivity(`${order.id} actualizado a ${status}`);
  };
  const registerVehicle = () => {
    const plate = `TRK-${Math.floor(700 + Math.random() * 200)}`;
    setData((current) => ({
      ...current,
      fleet: [{ plate, type: "Turbo urbano", status: "En patio", capacity: "3.5 ton", utilization: 0, health: 100, nextService: "2,500 km", zone: "Base principal", speed: 0 }, ...current.fleet],
    }));
    pushActivity(`Vehiculo ${plate} registrado`);
  };
  const updateVehicleStatus = (vehicle: Vehicle, status: VehicleStatus) => {
    setData((current) => ({ ...current, fleet: current.fleet.map((item) => (item.plate === vehicle.plate ? { ...item, status, speed: status === "En ruta" ? 42 : 0 } : item)) }));
    pushActivity(`${vehicle.plate} actualizado a ${status}`);
  };
  const createOrder = () => {
    const id = `OT-${Date.now().toString().slice(-4)}`;
    setData((current) => ({
      ...current,
      orders: [{ id, customer: "Cliente premium", origin: "Cedi principal", destination: "Cliente final", status: "Planificada", priority: "Alta", eta: "18:30", vehicle: "Sin asignar", driver: "Sin asignar", progress: 0, value: "$1.5M" }, ...current.orders],
    }));
    pushActivity(`Orden ${id} creada`);
  };
  const registerFuel = () => {
    setData((current) => ({
      ...current,
      fuelLogs: [{ id: `FUEL-${Date.now().toString().slice(-4)}`, vehiclePlate: current.fleet[0]?.plate ?? "TRK-000", driverName: current.drivers[0]?.name ?? "Conductor demo", gallons: 42, unitPrice: 10300, total: 432600, odometer: 185000, station: "EDS Demo Nexora", recordedAt: new Date().toISOString() }, ...current.fuelLogs],
    }));
    pushActivity("Tanqueo registrado");
  };
  const registerTire = () => {
    setData((current) => ({
      ...current,
      tires: [{ id: `TIR-${Date.now().toString().slice(-4)}`, vehiclePlate: current.fleet[1]?.plate, code: `NXR-${Date.now().toString().slice(-4)}`, brand: "Michelin Pilote", position: "Trasera externa", status: "Montada", treadMm: 9.4, pressurePsi: 105, cost: 1420000, updatedAt: new Date().toISOString() }, ...current.tires],
    }));
    pushActivity("Llanta registrada");
  };
  const registerExpense = () => {
    setData((current) => ({
      ...current,
      expenses: [{ id: `EXP-${Date.now().toString().slice(-4)}`, orderId: current.orders[0]?.id, vehiclePlate: current.orders[0]?.vehicle, driverName: current.orders[0]?.driver, category: "Peajes", amount: 86000, notes: "Gasto registrado desde demo", createdAt: new Date().toISOString() }, ...current.expenses],
    }));
    pushActivity("Gasto de viaje registrado");
  };
  const registerAdvance = () => {
    setData((current) => ({
      ...current,
      advances: [{ id: `ADV-${Date.now().toString().slice(-4)}`, orderId: current.orders[0]?.id, driverName: current.orders[0]?.driver ?? "Conductor demo", amount: 250000, status: "Abierto", settledAmount: 0, createdAt: new Date().toISOString() }, ...current.advances],
    }));
    pushActivity("Anticipo creado");
  };
  const registerChecklist = () => {
    setData((current) => ({
      ...current,
      checklists: [{ id: `CHK-${Date.now().toString().slice(-4)}`, vehiclePlate: current.fleet[0]?.plate ?? "TRK-000", driverName: current.drivers[0]?.name ?? "Conductor demo", type: "Preoperacional", result: "Aprobado", createdAt: new Date().toISOString() }, ...current.checklists],
    }));
    pushActivity("Checklist movil registrado");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={activeNav.label}
        description="Plataforma profesional para empresas de transporte."
        actions={
          <label className="flex h-10 w-full max-w-sm items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-500">
            <span className="sr-only">Buscar orden, placa, conductor o cliente</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar orden, placa, conductor o cliente"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </label>
        }
      />

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {notice}
        </div>
      ) : null}

      {viewId === "dashboard" ? <DashboardView data={data} onExport={exportOrders} onResolveAlert={resolveAlert} onReset={resetData} /> : null}
      {viewId === "control" ? <ControlTowerView data={data} orders={filteredOrders} onApplyDecision={applyDecision} onConfirmPod={confirmPod} onUpdateOrderStatus={updateOrderStatus} /> : null}
      {viewId === "orders" ? <OrdersView orders={filteredOrders} onCreateOrder={createOrder} onConfirmPod={confirmPod} onExport={exportOrders} onUpdateOrderStatus={updateOrderStatus} /> : null}
      {viewId === "fleet" ? <FleetView fleet={data.fleet} onRegisterVehicle={registerVehicle} onUpdateVehicleStatus={updateVehicleStatus} /> : null}
      {viewId === "drivers" ? <DriversView drivers={data.drivers} activity={data.activity} /> : null}
      {viewId === "routes" ? <RoutesView /> : null}
      {viewId === "maintenance" ? <MaintenanceView fleet={data.fleet} onUpdateVehicleStatus={updateVehicleStatus} /> : null}
      {viewId === "costs" ? <FleetCostsView data={data} onRegisterAdvance={registerAdvance} onRegisterChecklist={registerChecklist} onRegisterExpense={registerExpense} onRegisterFuel={registerFuel} onRegisterTire={registerTire} /> : null}
      {viewId === "finance" ? <FinanceView kpis={data.kpis} /> : null}
      {viewId === "analytics" ? <AnalyticsView /> : null}
      {viewId === "integrations" ? <IntegrationsView data={data} /> : null}
      {viewId === "driver" ? <DriverAppView orders={filteredOrders} onConfirmPod={confirmPod} /> : null}
    </div>
  );
}

function DashboardView({ data, onExport, onResolveAlert, onReset }: { data: AppData; onExport: () => void; onResolveAlert: (alert: Alert) => void; onReset: () => void }) {
  const customerMetrics = useMemo(() => buildCustomerPerformance(data), [data]);
  const clientsBelowTarget = customerMetrics.filter((client) => client.compliance < 95);
  const sortedByCompliance = [...customerMetrics].sort((a, b) => b.compliance - a.compliance);
  const priorityClient = [...customerMetrics].sort((a, b) => a.compliance - b.compliance || b.orders - a.orders)[0] ?? customerMetrics[0];
  const riskValue = clientsBelowTarget.reduce((sum, client) => sum + (client.valueAtRisk ?? 0), 0);
  const totals = customerMetrics.reduce(
    (summary, client) => ({
      assignedVehicles: summary.assignedVehicles + client.assignedVehicles,
      inUseVehicles: summary.inUseVehicles + client.inUseVehicles,
      availableVehicles: summary.availableVehicles + client.availableVehicles,
      orders: summary.orders + client.orders,
      compliance: summary.compliance + client.compliance,
    }),
    { assignedVehicles: 0, inUseVehicles: 0, availableVehicles: 0, orders: 0, compliance: 0 },
  );
  const averageCompliance = customerMetrics.length ? Math.round(totals.compliance / customerMetrics.length) : 0;
  const availability = totals.assignedVehicles ? Math.round((totals.availableVehicles / totals.assignedVehicles) * 100) : 0;

  if (!priorityClient) {
    return <EmptyState icon={Gauge} title="Sin datos ejecutivos" description="Crea ordenes y asigna vehiculos para generar indicadores por cliente." />;
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Transportes Gran Bretana</div>
          <h2 className="mt-2 text-xl font-black text-slate-950">Ejecutivo por cliente</h2>
          <p className="mt-1 text-sm text-slate-500">Cumplimiento, disponibilidad y uso de la flota subcontratada que gestionamos para cada cliente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={RefreshCcw} label="Reiniciar demo" variant="secondary" onClick={onReset} />
          <ActionButton icon={Download} label="Exportar ordenes" onClick={onExport} />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard kpi={{ label: "Cumplimiento promedio", value: `${averageCompliance}%`, delta: `${clientsBelowTarget.length} clientes con SLA bajo`, target: "Meta > 95%", severity: averageCompliance >= 95 ? "success" : "warning" }} />
        <KpiCard kpi={{ label: "Flota asignada", value: totals.assignedVehicles.toString(), delta: `${totals.inUseVehicles} en uso`, target: `${totals.availableVehicles} disponibles`, severity: "success" }} />
        <KpiCard kpi={{ label: "Disponibilidad", value: `${availability}%`, delta: "Vehiculos listos", target: "Patio / reserva", severity: availability >= 20 ? "success" : "warning" }} />
        <KpiCard kpi={{ label: "Valor en riesgo", value: formatCompactMoney(riskValue), delta: "Ordenes con SLA bajo", target: "Gestion comercial", severity: riskValue > 0 ? "warning" : "success" }} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-l-4 border-rose-500 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">Cliente prioritario</span>
                <h3 className="mt-2 text-2xl font-black text-slate-950">{priorityClient.customer}</h3>
                <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">{priorityClientSummary(priorityClient)}</p>
              </div>
              <StatusBadge value={priorityClient.compliance < 90 ? "En riesgo" : "Cumplido"} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <CompactMetric label="SLA" value={`${priorityClient.compliance}%`} tone="danger" />
              <CompactMetric label="Vehiculos" value={priorityClient.assignedVehicles.toString()} />
              <CompactMetric label="En ruta" value={priorityClient.inUseVehicles.toString()} />
              <CompactMetric label="Reserva" value={priorityClient.availableVehicles.toString()} />
            </div>
            <div className="mt-5 space-y-4">
              <PriorityMeter label="Cumplimiento SLA" value={priorityClient.compliance} target={95} tone="danger" />
              <PriorityMeter label="Uso de flota" value={priorityClient.utilization} target={75} tone="info" />
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <strong className="block text-sm font-black text-slate-950">Plan inmediato</strong>
              <p className="mt-1 text-sm leading-5 text-slate-600">{priorityClientAction(priorityClient)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SmallLinkButton href="/transport/orders">Gestionar ordenes</SmallLinkButton>
                <SmallLinkButton href="/transport/control">Ver torre de control</SmallLinkButton>
              </div>
            </div>
          </div>
        </article>
        <Panel title="Ranking ejecutivo de clientes" action="Ver ordenes" actionHref="/transport/orders">
          <CustomerRankingBoard clients={sortedByCompliance} />
        </Panel>
      </section>
      <Panel title="Como vamos con cada cliente" action="Ver ordenes" actionHref="/transport/orders">
        <CustomerPerformanceTable clients={customerMetrics} />
      </Panel>
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel title="Flota por cliente" action="Ver flota" actionHref="/transport/fleet">
          <FleetAllocationBoard clients={customerMetrics} />
        </Panel>
        <Panel title="Clientes con SLA en riesgo" action="Gestionar" actionHref="/transport/control">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <ExecutiveSummary label="Clientes" value={clientsBelowTarget.length.toString()} />
            <ExecutiveSummary label="Valor en riesgo" value={formatCompactMoney(riskValue)} />
            <ExecutiveSummary label="Ordenes afectadas" value={clientsBelowTarget.reduce((sum, client) => sum + client.orders, 0).toString()} />
          </div>
          <div className="space-y-3">
            {clientsBelowTarget.map((client) => (
              <article key={client.customer} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-sm text-slate-950">{client.customer}</strong>
                    <p className="mt-1 text-sm text-slate-500">{formatCompactMoney(client.valueAtRisk ?? 0)} en riesgo / {client.assignedVehicles} vehiculos / {client.incidents} novedades.</p>
                  </div>
                  <StatusBadge value={`${client.compliance}%`} />
                </div>
                <div className="mt-3"><ProgressBar value={client.compliance} /></div>
                <div className="mt-3"><SmallLinkButton href="/transport/orders">Gestionar ordenes</SmallLinkButton></div>
              </article>
            ))}
            <AlertList items={data.alerts.slice(0, 2)} onResolve={onResolveAlert} />
          </div>
        </Panel>
      </section>
    </div>
  );
}

function ControlTowerView({ data, orders, onApplyDecision, onConfirmPod, onUpdateOrderStatus }: { data: AppData; orders: Order[]; onApplyDecision: (decision: Decision) => void; onConfirmPod: (order: Order) => void; onUpdateOrderStatus: (order: Order, status: OrderStatus) => void }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Mapa operacional en vivo" action="Actualizar"><OperationalMap /></Panel>
        <Panel title="Cola de decisiones" action="Automatizar">
          <div className="space-y-3">
            {data.decisions.map((decision, index) => <DecisionItem key={decision.id} icon={index === 0 ? <AlertTriangle className="h-5 w-5" /> : index === 1 ? <Fuel className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />} decision={decision} onApply={onApplyDecision} />)}
          </div>
        </Panel>
      </section>
      <OrdersTable compact orders={orders} onConfirmPod={onConfirmPod} onUpdateOrderStatus={onUpdateOrderStatus} />
    </div>
  );
}

function OrdersView({ orders, onCreateOrder, onConfirmPod, onExport, onUpdateOrderStatus }: { orders: Order[]; onCreateOrder: () => void; onConfirmPod: (order: Order) => void; onExport: () => void; onUpdateOrderStatus: (order: Order, status: OrderStatus) => void }) {
  return (
    <div className="space-y-5">
      <Toolbar title="Ordenes de transporte" primary="Nueva orden" onPrimary={onCreateOrder} onRefresh={onExport} />
      <OrdersTable orders={orders} onConfirmPod={onConfirmPod} onUpdateOrderStatus={onUpdateOrderStatus} />
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Prueba de entrega digital" action="Ver POD">
          <div className="grid gap-3 sm:grid-cols-2">
            <Pill icon={<FileSignature className="h-4 w-4" />} label="Firma capturada" value="92%" />
            <Pill icon={<Camera className="h-4 w-4" />} label="Evidencia fotografica" value="1,076" />
            <Pill icon={<MapPin className="h-4 w-4" />} label="GPS validado" value="99.1%" />
            <Pill icon={<PackageCheck className="h-4 w-4" />} label="Entregas completas" value="96.8%" />
          </div>
        </Panel>
        <Panel title="Estados del dia" action="Filtrar">
          <div className="space-y-4">
            {["Planificada", "Asignada", "En ruta", "En riesgo", "Entregada"].map((status, index) => <div key={status} className="space-y-2"><span className="text-sm font-bold text-slate-700">{status}</span><ProgressBar value={[18, 32, 64, 21, 86][index]} /></div>)}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function FleetView({ fleet, onRegisterVehicle, onUpdateVehicleStatus }: { fleet: Vehicle[]; onRegisterVehicle: () => void; onUpdateVehicleStatus: (vehicle: Vehicle, status: VehicleStatus) => void }) {
  const fleetStats = [
    { label: "En ruta", value: fleet.filter((vehicle) => vehicle.status === "En ruta").length.toString(), detail: "Vehiculos despachados", severity: "info" as const },
    { label: "En patio", value: fleet.filter((vehicle) => vehicle.status === "En patio").length.toString(), detail: "Disponibles para despacho", severity: "success" as const },
    { label: "Mantenimiento", value: fleet.filter((vehicle) => vehicle.status === "Mantenimiento").length.toString(), detail: "En taller o preventivo", severity: "warning" as const },
    { label: "Detenidos", value: fleet.filter((vehicle) => vehicle.status === "Detenido").length.toString(), detail: "Bloqueados por novedad", severity: "critical" as const },
  ];

  return (
    <div className="space-y-5">
      <Toolbar title="Flota y activos" primary="Registrar vehiculo" onPrimary={onRegisterVehicle} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {fleetStats.map((stat) => (
          <KpiCard key={stat.label} kpi={{ label: stat.label, value: stat.value, delta: stat.detail, target: "Estado actual", severity: stat.severity }} />
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fleet.map((vehicle) => (
          <VehicleCard
            key={vehicle.plate}
            vehicle={vehicle}
            onUpdateStatus={onUpdateVehicleStatus}
          />
        ))}
      </section>
    </div>
  );
}

export function VehicleVisualStatusDetail({ plate, snapshot }: { plate: string; snapshot?: VehicleVisualSnapshot | null }) {
  const vehicle = snapshot ? vehicleFromSnapshot(snapshot) : initialData.fleet.find((item) => item.plate.toLowerCase() === decodeURIComponent(plate).toLowerCase()) ?? initialData.fleet[0];

  return <VehicleVisualStatus vehicle={vehicle} snapshot={snapshot} standalone />;
}

function DriversView({ drivers, activity }: { drivers: Driver[]; activity: ActivityEvent[] }) {
  return (
    <div className="space-y-5">
      <Toolbar title="Conductores y seguridad vial" primary="Nuevo conductor" />
      <DataPanel columns={["Conductor", "Estado", "Licencia", "Score", "Entregas", "Incidentes", "Turno"]}>
        {drivers.map((driver) => <tr key={driver.name}><td className="px-4 py-3 font-bold text-slate-950">{driver.name}</td><td className="px-4 py-3"><StatusBadge value={driver.status} /></td><td className="px-4 py-3">{driver.license}</td><td className="px-4 py-3">{driver.score}</td><td className="px-4 py-3">{driver.deliveries}</td><td className="px-4 py-3">{driver.incidents}</td><td className="px-4 py-3">{driver.shift}</td></tr>)}
      </DataPanel>
      <ActivityFeed activity={activity} />
    </div>
  );
}

function RoutesView() {
  const [period, setPeriod] = useState<PeriodId>("day");
  const performance = routePerformance[period];
  const totals = {
    routesToday: todayRoutes.length,
    inRoute: todayRoutes.filter((route) => route.status === "En ruta").length,
    inYard: todayRoutes.filter((route) => route.status === "En patio").length,
    delivered: todayRoutes.filter((route) => route.status === "Entregada").length,
  };

  return (
    <div className="space-y-5">
      <Toolbar title="Planeacion y optimizacion de rutas" primary="Optimizar rutas" />
      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard kpi={{ label: "Rutas de hoy", value: totals.routesToday.toString(), delta: `${totals.inRoute} en ruta`, target: `${totals.delivered} cerradas`, severity: "info" }} />
        <KpiCard kpi={{ label: "Vehiculos en ruta", value: totals.inRoute.toString(), delta: "Operando ahora", target: "GPS activo", severity: "success" }} />
        <KpiCard kpi={{ label: "Vehiculos en patio", value: totals.inYard.toString(), delta: "Listos o esperando cargue", target: "Patio / base", severity: "warning" }} />
        <KpiCard kpi={{ label: "OTIF promedio", value: `${Math.round(performance.reduce((sum, item) => sum + item.otif, 0) / performance.length)}%`, delta: periodLabel(period), target: "Meta > 95%", severity: "success" }} />
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Rutas de hoy</h2>
            <p className="mt-1 text-sm text-slate-500">Despacho operativo por ventana, cliente, conductor y avance.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value="En ruta" />
            <StatusBadge value="En patio" />
            <StatusBadge value="Entregada" />
          </div>
        </header>
        <DataPanel columns={["Ruta", "Ventana", "Cliente", "Vehiculo", "Conductor", "Estado", "Avance", "ETA", "Novedad"]}>
          {todayRoutes.map((route) => (
            <tr key={route.id}>
              <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">{route.id}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{route.window}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{route.customer}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{route.vehicle}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{route.driver}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={route.status} /></td>
              <td className="min-w-36 px-4 py-3"><ProgressBar value={Math.round((route.stopsDone / route.stopsTotal) * 100)} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{route.eta}</td>
              <td className="min-w-48 px-4 py-3 text-sm text-slate-600">{route.risk}</td>
            </tr>
          ))}
        </DataPanel>
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Panel title={`Comportamiento de rutas - ${periodLabel(period)}`} action="Exportar">
          <div className="mb-4 flex flex-wrap gap-2">
            <SegmentChip active={period === "day"} onClick={() => setPeriod("day")}>Dia</SegmentChip>
            <SegmentChip active={period === "week"} onClick={() => setPeriod("week")}>Semana</SegmentChip>
            <SegmentChip active={period === "month"} onClick={() => setPeriod("month")}>Mensual</SegmentChip>
          </div>
          <ChartBox>
            <LineChart data={performance}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="entregas" stroke="#0f766e" strokeWidth={3} />
              <Line type="monotone" dataKey="otif" stroke="#2563eb" strokeWidth={3} />
              <Line type="monotone" dataKey="kmVacios" stroke="#f59e0b" strokeWidth={3} />
            </LineChart>
          </ChartBox>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          {routePlans.map((route) => (
            <article key={route.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{route.id}</span>
              <h3 className="mt-1 text-sm font-black text-slate-950">{route.name}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Metric label="Paradas" value={route.stops.toString()} />
                <Metric label="Km" value={route.distance.toString()} />
                <Metric label="Vacios" value={`${route.emptyKm}%`} />
                <Metric label="OTIF" value={`${route.otif}%`} />
              </dl>
              <p className="mt-4 text-xs text-slate-500">{route.restriction}</p>
            </article>
          ))}
        </div>
      </section>
      <Panel title="Como vamos con cada cliente" action="Descargar">
        <CustomerPerformanceTable />
      </Panel>
    </div>
  );
}

function MaintenanceView({ fleet, onUpdateVehicleStatus }: { fleet: Vehicle[]; onUpdateVehicleStatus: (vehicle: Vehicle, status: VehicleStatus) => void }) {
  return (
    <div className="space-y-5">
      <Toolbar title="Mantenimiento conectado" primary="Nueva orden de taller" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fleet.map((vehicle) => (
          <article key={vehicle.plate} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-slate-950"><Wrench className="h-4 w-4 text-cyan-700" /> {vehicle.plate}</div>
            <p className="mt-3 text-sm text-slate-500">{vehicle.type} - proximo servicio en {vehicle.nextService}</p>
            <div className="mt-4"><ProgressBar value={vehicle.health} /></div>
            <footer className="mt-4 flex items-center justify-between gap-3"><span className="text-sm font-bold text-slate-700">Estado {vehicle.health}%</span><SmallButton onClick={() => onUpdateVehicleStatus(vehicle, "Mantenimiento")}>Enviar a taller</SmallButton></footer>
          </article>
        ))}
      </section>
    </div>
  );
}

function FleetCostsView({ data, onRegisterAdvance, onRegisterChecklist, onRegisterExpense, onRegisterFuel, onRegisterTire }: { data: AppData; onRegisterAdvance: () => void; onRegisterChecklist: () => void; onRegisterExpense: () => void; onRegisterFuel: () => void; onRegisterTire: () => void }) {
  const totalFuel = data.fuelLogs.reduce((sum, item) => sum + item.total, 0);
  const totalTires = data.tires.reduce((sum, item) => sum + item.cost, 0);
  const totalExpenses = data.expenses.reduce((sum, item) => sum + item.amount, 0);
  const openAdvances = data.advances.filter((item) => item.status !== "Legalizado").reduce((sum, item) => sum + item.amount - item.settledAmount, 0);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Costos de flota</div>
          <h2 className="mt-2 text-xl font-black text-slate-950">Combustible, llantas, viajes, anticipos y checklist</h2>
          <p className="mt-1 text-sm text-slate-500">Controla cada peso asociado a la flota y cada inspeccion operativa antes de que se vuelva un sobrecosto.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={CheckCircle2} label="Checklist" variant="secondary" onClick={onRegisterChecklist} />
          <ActionButton icon={Fuel} label="Tanqueo" onClick={onRegisterFuel} />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard kpi={{ label: "Combustible", value: money.format(totalFuel), delta: `${data.fuelLogs.length} registros`, target: "Control por odometro", severity: "success" }} />
        <KpiCard kpi={{ label: "Llantas", value: money.format(totalTires), delta: `${data.tires.length} activos`, target: "Vida util y posicion", severity: "info" }} />
        <KpiCard kpi={{ label: "Gastos viaje", value: money.format(totalExpenses), delta: money.format(openAdvances), target: "Anticipos abiertos", severity: openAdvances ? "warning" : "success" }} />
      </section>
      <section className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <SmallButton onClick={onRegisterTire}>Registrar llanta</SmallButton>
        <SmallButton onClick={onRegisterExpense}>Registrar gasto</SmallButton>
        <SmallButton onClick={onRegisterAdvance}>Crear anticipo</SmallButton>
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Combustible por vehiculo" action="Exportar"><MiniTable columns={["Vehiculo", "Galones", "Total", "Odometro", "EDS"]} rows={data.fuelLogs.map((item) => [item.vehiclePlate, item.gallons.toString(), money.format(item.total), item.odometer.toLocaleString("es-CO"), item.station])} /></Panel>
        <Panel title="Llantas y posiciones" action="Inspeccionar"><MiniTable columns={["Codigo", "Vehiculo", "Posicion", "Estado", "Labranza"]} rows={data.tires.map((item) => [item.code, item.vehiclePlate || "Bodega", item.position, item.status, `${item.treadMm} mm`])} /></Panel>
        <Panel title="Viajes, gastos y anticipos" action="Legalizar"><MiniTable columns={["Tipo", "Orden", "Conductor", "Valor", "Estado"]} rows={[...data.expenses.map((item) => ["Gasto", item.orderId || "-", item.driverName || "-", money.format(item.amount), item.category]), ...data.advances.map((item) => ["Anticipo", item.orderId || "-", item.driverName, money.format(item.amount), item.status])]} /></Panel>
        <Panel title="Checklist movil" action="Ver novedades"><MiniTable columns={["Vehiculo", "Conductor", "Tipo", "Resultado", "Fecha"]} rows={data.checklists.map((item) => [item.vehiclePlate, item.driverName || "-", item.type, item.result, new Date(item.createdAt).toLocaleDateString("es-CO")])} /></Panel>
      </section>
    </div>
  );
}

function FinanceView({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Composicion de costos" action="Auditar">
          <ChartBox>
            <PieChart><Pie data={costBreakdown} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3}>{costBreakdown.map((entry, index) => <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip /></PieChart>
          </ChartBox>
        </Panel>
        <Panel title="Rentabilidad por ruta" action="Descargar">
          <ChartBox>
            <BarChart data={routePlans}><CartesianGrid strokeDasharray="4 4" vertical={false} /><XAxis dataKey="id" tickLine={false} axisLine={false} /><YAxis tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="otif" fill="#0f766e" radius={[6, 6, 0, 0]} /><Bar dataKey="emptyKm" fill="#f59e0b" radius={[6, 6, 0, 0]} /></BarChart>
          </ChartBox>
        </Panel>
      </section>
      <section className="grid gap-4 md:grid-cols-3">{kpis.slice(0, 3).map((kpi) => <KpiCard key={kpi.label} kpi={kpi} />)}</section>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-lg border border-cyan-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">IA operativa</span>
          <h2 className="mt-2 text-xl font-black text-slate-950">Predicciones accionables para despacho, costos y servicio</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">El sistema prioriza excepciones, recomienda asignaciones y anticipa retrasos, demanda y fallas mecanicas con datos operativos, GPS y telemetria.</p>
        </div>
        <ActionButton icon={Bot} label="Ejecutar simulacion" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Insight title="Retrasos probables" value="87 ordenes" detail="Mayor riesgo entre 15:00 y 18:00 en zona occidente." />
        <Insight title="Ahorro recomendado" value="$7.2M" detail="Consolidando retornos y cambiando 3 ventanas horarias." />
        <Insight title="Mantenimiento predictivo" value="5 activos" detail="Sensores sugieren inspeccion antes de 72 horas." />
        <Insight title="Demanda incremental" value="+18%" detail="Pico esperado por cliente Retail Max manana en la tarde." />
      </section>
    </div>
  );
}

function IntegrationsView({ data }: { data: AppData }) {
  const mode = data.integration.mode;
  return (
    <div className="space-y-5">
      <Toolbar title="Arquitectura e integraciones" primary="Nueva integracion" />
      <section className="grid gap-4 xl:grid-cols-3">
        <IntegrationMode selected={mode === "suite"} title="Suite Nexora unificada" text="Un solo login, empresa compartida, permisos comunes, inventario y transporte dentro de la misma experiencia." status={mode === "suite" ? "Activo" : "Disponible"} />
        <IntegrationMode selected={mode === "api"} title="Sistemas separados por API" text="Atlas TMS e Inventarios se venden separados y sincronizan productos, repuestos, llantas, salidas y kardex por API." status={mode === "api" ? "Activo" : "Disponible"} />
        <IntegrationMode title="Estado actual" text={`Login compartido: ${data.integration.sharedLogin ? "si" : "configurable"} - Inventarios: ${data.integration.inventoryBaseUrl}`} status={mode} />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return <article key={integration.name} className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"><Icon className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-slate-950">{integration.name}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{integration.detail}</p></div><StatusBadge value={integration.status} /></article>;
        })}
      </section>
    </div>
  );
}

function DriverAppView({ orders, onConfirmPod }: { orders: Order[]; onConfirmPod: (order: Order) => void }) {
  const activeOrders = orders.filter((order) => order.status !== "Entregada");
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> App conductor</div>
        <h2 className="mt-2 text-xl font-black text-slate-950">Ruta diaria, novedades y POD movil</h2>
        <p className="mt-1 text-sm text-slate-500">Vista responsive para operar desde celular con entregas, ETA, evidencia y confirmacion offline-ready.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeOrders.map((order) => <article key={order.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><header className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{order.id}</span><h3 className="mt-1 text-base font-black text-slate-950">{order.customer}</h3></div><StatusBadge value={order.priority} /></header><p className="mt-3 text-sm text-slate-500">{order.origin} a {order.destination}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Pill icon={<CalendarClock className="h-4 w-4" />} label="ETA" value={order.eta} /><Pill icon={<Navigation className="h-4 w-4" />} label="Avance" value={`${order.progress}%`} /></div><div className="mt-4"><ActionButton icon={FileSignature} label="Confirmar POD" onClick={() => onConfirmPod(order)} /></div></article>)}
      </section>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-black text-slate-700">{kpi.label}</span><SeverityDot severity={kpi.severity} /></div>
      <strong className="mt-5 block text-3xl font-black tracking-tight text-slate-950">{kpi.value}</strong>
      <footer className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="font-bold text-slate-600">{kpi.delta}</span><small className="text-slate-500">{kpi.target}</small></footer>
      <div className="mt-4"><ProgressBar value={severityProgress(kpi.severity)} /></div>
    </article>
  );
}

function Panel({ title, action, children, onAction, actionHref }: { title: string; action: string; children: ReactNode; onAction?: () => void; actionHref?: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-slate-950">{title}</h2>
        {actionHref ? (
          <SmallLinkButton href={actionHref}><ArrowUpRight className="h-4 w-4" />{action}</SmallLinkButton>
        ) : (
          <SmallButton onClick={onAction}>{action === "Exportar" || action === "Descargar" ? <Download className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}{action}</SmallButton>
        )}
      </header>
      {children}
    </section>
  );
}

function Toolbar({ title, primary, onPrimary, onRefresh }: { title: string; primary: string; onPrimary?: () => void; onRefresh?: () => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      <div className="flex flex-wrap gap-2">
        <ActionButton icon={Filter} label="Filtros" variant="secondary" />
        <ActionButton icon={RefreshCcw} label="Actualizar" variant="secondary" onClick={onRefresh} />
        <ActionButton icon={Plus} label={primary} onClick={onPrimary} />
      </div>
    </section>
  );
}

function AlertList({ items, onResolve }: { items: Alert[]; onResolve?: (alert: Alert) => void }) {
  const visible = items.filter((alert) => !alert.resolved);
  return <div className="space-y-3">{visible.map((alert) => <article key={alert.id ?? alert.title} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><SeverityDot severity={alert.severity} /><div className="min-w-0 flex-1"><strong className="text-sm text-slate-950">{alert.title}</strong><p className="mt-1 text-sm leading-5 text-slate-500">{alert.detail}</p></div><time className="text-xs font-bold text-slate-400">{alert.time}</time>{onResolve ? <SmallButton onClick={() => onResolve(alert)}>Resolver</SmallButton> : null}</article>)}</div>;
}

function OperationalMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let isDisposed = false;

    async function mountMap() {
      const L = await import("leaflet");
      if (isDisposed || !mapContainerRef.current) return;

      mapContainerRef.current.innerHTML = "";
      map = L.map(mapContainerRef.current, {
        attributionControl: true,
        scrollWheelZoom: true,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      for (const route of mapRoutes) {
        L.polyline(route.points, {
          color: route.color,
          opacity: 0.92,
          weight: 5,
        })
          .bindTooltip(`${route.id} - ${route.label}`)
          .addTo(map);
      }

      for (const vehicle of mapVehicles) {
        const color = vehicle.status === "En ruta" ? "#0e7490" : vehicle.status === "En patio" ? "#047857" : "#be123c";
        L.marker(vehicle.position, {
          icon: L.divIcon({
            className: "",
            html: `<span style="display:inline-flex;align-items:center;gap:4px;border:2px solid #fff;border-radius:999px;background:${color};color:#fff;padding:4px 8px;font-size:11px;font-weight:900;box-shadow:0 8px 20px rgba(15,23,42,.28);white-space:nowrap;">${vehicle.plate}</span>`,
            iconAnchor: [30, 12],
          }),
        })
          .bindPopup(`<strong>${vehicle.plate}</strong><br/>${vehicle.route}<br/>${vehicle.status}<br/>ETA ${vehicle.eta}`)
          .addTo(map);
      }

      const allPoints = [...mapRoutes.flatMap((route) => route.points), ...mapVehicles.map((vehicle) => vehicle.position)];
      map.fitBounds(L.latLngBounds(allPoints), { padding: [28, 28] });
      window.setTimeout(() => map?.invalidateSize(), 80);
    }

    void mountMap();

    return () => {
      isDisposed = true;
      map?.remove();
    };
  }, []);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white/95 p-2 text-xs font-bold text-slate-600 shadow-sm">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-cyan-700" /> En ruta</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-700" /> En patio</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-700" /> Novedad</span>
      </div>
    </div>
  );
}

function OrdersTable({ compact = false, orders, onConfirmPod, onUpdateOrderStatus }: { compact?: boolean; orders: Order[]; onConfirmPod: (order: Order) => void; onUpdateOrderStatus: (order: Order, status: OrderStatus) => void }) {
  return (
    <DataPanel columns={["Orden", "Cliente", "Origen", "Destino", "Estado", "ETA", ...(compact ? [] : ["Vehiculo", "Conductor"]), "Avance", "Acciones"]}>
      {orders.map((order) => <tr key={order.id}><td className="px-4 py-3 font-bold text-slate-950">{order.id}</td><td className="px-4 py-3">{order.customer}</td><td className="px-4 py-3">{order.origin}</td><td className="px-4 py-3">{order.destination}</td><td className="px-4 py-3"><StatusBadge value={order.status} /></td><td className="px-4 py-3">{order.eta}</td>{!compact ? <td className="px-4 py-3">{order.vehicle}</td> : null}{!compact ? <td className="px-4 py-3">{order.driver}</td> : null}<td className="min-w-32 px-4 py-3"><ProgressBar value={order.progress} /></td><td className="px-4 py-3"><div className="flex gap-2">{order.status !== "En ruta" && order.status !== "Entregada" ? <SmallButton onClick={() => onUpdateOrderStatus(order, "En ruta")}>Despachar</SmallButton> : null}{order.status !== "Entregada" ? <SmallButton onClick={() => onConfirmPod(order)}>POD</SmallButton> : <StatusBadge value="POD" />}</div></td></tr>)}
    </DataPanel>
  );
}

function VehicleVisualStatus({ vehicle, snapshot, standalone = false }: { vehicle: Vehicle; snapshot?: VehicleVisualSnapshot | null; standalone?: boolean }) {
  const [selectedView, setSelectedView] = useState<VehicleVisualView>("diagonal");
  const components = snapshot?.components.length ? snapshotComponents(snapshot) : getVehicleComponents(vehicle);
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"attention" | "all">("attention");
  const visibleComponents = useMemo(() => components.filter((component) => component.view === selectedView), [components, selectedView]);
  const visibleAreas = useMemo(() => Array.from(new Set(visibleComponents.map((component) => component.area))).sort(), [visibleComponents]);
  const filteredComponents = useMemo(
    () =>
      visibleComponents.filter((component) => {
        const matchesArea = selectedArea === "all" || component.area === selectedArea;
        const matchesVisibility = visibilityFilter === "all" || component.condition !== "green";
        return matchesArea && matchesVisibility;
      }),
    [selectedArea, visibilityFilter, visibleComponents],
  );
  const [selectedComponentId, setSelectedComponentId] = useState(filteredComponents[0]?.id ?? visibleComponents[0]?.id ?? components[0]?.id ?? "");
  const selectedComponent = filteredComponents.find((component) => component.id === selectedComponentId) ?? filteredComponents[0] ?? null;
  const timeline = useMemo(() => (snapshot ? buildVehicleTimeline(snapshot) : []), [snapshot]);
  const counts = {
    red: components.filter((component) => component.condition === "red").length,
    yellow: components.filter((component) => component.condition === "yellow").length,
    green: components.filter((component) => component.condition === "green").length,
  };

  useEffect(() => {
    if (selectedArea !== "all" && !visibleAreas.includes(selectedArea)) {
      setSelectedArea("all");
    }
  }, [selectedArea, visibleAreas]);

  useEffect(() => {
    if (!filteredComponents.length) {
      if (visibleComponents[0] && selectedComponentId !== visibleComponents[0].id) {
        setSelectedComponentId(visibleComponents[0].id);
      }
      return;
    }

    if (!filteredComponents.some((component) => component.id === selectedComponentId)) {
      setSelectedComponentId(filteredComponents[0].id);
    }
  }, [filteredComponents, selectedComponentId, visibleComponents]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">Estado visual del vehiculo</div>
          <h2 className={standalone ? "mt-2 text-2xl font-black text-slate-950" : "mt-2 text-xl font-black text-slate-950"}>
            {vehicle.plate} - {vehicle.type}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Vista tecnica para identificar componentes criticos antes de aprobar despacho, mantenimiento o consumo de repuestos.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <ConditionSummary label="Critico" value={counts.red} condition="red" />
          <ConditionSummary label="Proximo" value={counts.yellow} condition="yellow" />
          <ConditionSummary label="Vigente" value={counts.green} condition="green" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[ 
          ["diagonal", "Vista 3/4"],
          ["left", "Lado izquierdo"],
          ["right", "Lado derecho"],
          ["rear", "Parte trasera"],
          ["top", "Vista superior"],
        ].map(([view, label]) => (
          <button
            key={view}
            type="button"
            onClick={() => setSelectedView(view as VehicleVisualView)}
            className={selectedView === view ? "rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white" : "rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SegmentChip active={visibilityFilter === "attention"} onClick={() => setVisibilityFilter("attention")}>Solo alertas</SegmentChip>
        <SegmentChip active={visibilityFilter === "all"} onClick={() => setVisibilityFilter("all")}>Todos</SegmentChip>
        <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
        <SegmentChip active={selectedArea === "all"} onClick={() => setSelectedArea("all")}>Todos los sistemas</SegmentChip>
        {visibleAreas.map((area) => (
          <SegmentChip key={area} active={selectedArea === area} onClick={() => setSelectedArea(area)}>
            {area}
          </SegmentChip>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="relative mx-auto aspect-video w-full max-w-[820px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
            {selectedView === "diagonal" ? (
              <>
                <img
                  src={vehicleImagePath(vehicle)}
                  alt={`Imagen tecnica realista del vehiculo ${vehicle.plate}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10" />
              </>
            ) : (
              <>
                <img
                  src={vehicleViewImagePath(vehicle, selectedView)}
                  alt={`Vista ${viewLabel(selectedView).toLowerCase()} del vehiculo ${vehicle.plate}`}
                  className={`h-full w-full object-contain p-2 ${selectedView === "right" ? "scale-x-[-1]" : ""}`}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10" />
              </>
            )}
            {filteredComponents.map((component) => (
              <button
                key={component.id}
                type="button"
                onClick={() => {
                  setSelectedComponentId(component.id);
                  document.getElementById("component-inspector")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                title={`${component.label}: ${component.message}`}
                className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow-lg ring-4 transition ${selectedComponentId === component.id ? "scale-125" : "hover:scale-110"} ${component.condition === "green" ? "h-8 w-8" : "h-10 w-10"} ${conditionClass(component.condition).ring} ${conditionClass(component.condition).bg}`}
                style={component.position}
              >
                !
              </button>
            ))}
            <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-700 backdrop-blur">
              {viewLabel(selectedView)}
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
            <LegendDot condition="red" label="Requiere cambio" />
            <LegendDot condition="yellow" label="Proximo a cambio" />
            <LegendDot condition="green" label="Vigente" />
          </div>
        </div>

        <div className="grid gap-3">
          {selectedComponent ? (
            <article id="component-inspector" className="rounded-lg border border-cyan-200 bg-cyan-50/40 p-4 shadow-sm ring-1 ring-cyan-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-cyan-700">Componente activo</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">{selectedComponent.label}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{selectedComponent.area}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${conditionClass(selectedComponent.condition).badge}`}>
                  {conditionLabel(selectedComponent.condition)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{selectedComponent.message}</p>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                {selectedComponent.currentValue ? <Metric label="Valor actual" value={selectedComponent.currentValue} /> : null}
                {selectedComponent.threshold ? <Metric label="Umbral" value={selectedComponent.threshold} /> : null}
                {selectedComponent.nextDueKm ? <Metric label="Proximo km" value={selectedComponent.nextDueKm.toLocaleString("es-CO")} /> : null}
              </div>
              <p className="mt-3 text-sm font-bold text-slate-800">{selectedComponent.nextAction}</p>
              {snapshot?.vehicleId ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <form action={runVehicleComponentQuickAction}>
                    <input type="hidden" name="componentId" value={selectedComponent.id} />
                    <input type="hidden" name="plate" value={vehicle.plate} />
                    <button name="actionType" value="OPEN_WORK_ORDER" type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">Crear OT</button>
                  </form>
                  <form action={runVehicleComponentQuickAction}>
                    <input type="hidden" name="componentId" value={selectedComponent.id} />
                    <input type="hidden" name="plate" value={vehicle.plate} />
                    <button name="actionType" value="SEND_TO_SHOP" type="submit" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">Enviar a taller</button>
                  </form>
                  <form action={runVehicleComponentQuickAction}>
                    <input type="hidden" name="componentId" value={selectedComponent.id} />
                    <input type="hidden" name="plate" value={vehicle.plate} />
                    <button name="actionType" value="SCHEDULE_REVIEW" type="submit" className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800">Programar revision</button>
                  </form>
                  <form action={runVehicleComponentQuickAction}>
                    <input type="hidden" name="componentId" value={selectedComponent.id} />
                    <input type="hidden" name="plate" value={vehicle.plate} />
                    <button name="actionType" value="BLOCK_DISPATCH" type="submit" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">Bloquear despacho</button>
                  </form>
                  <SmallLinkButton href={`/transport/integrations?prefillVehicleId=${encodeURIComponent(snapshot.vehicleId)}&prefillPlate=${encodeURIComponent(vehicle.plate)}&prefillComponentLabel=${encodeURIComponent(selectedComponent.label)}&intent=reserve`}>Ir a repuestos</SmallLinkButton>
                </div>
              ) : null}
              {snapshot ? (
                <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Administracion del componente</p>
                      <p className="mt-1 text-sm text-slate-600">Aqui registras inspecciones, cambios, mantenimientos, ajustes y comentarios. Cada registro actualiza el estado visual y queda en bitacora.</p>
                    </div>
                    {selectedComponent.lastCheckedAt ? <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">Ultima revision {formatDateTime(selectedComponent.lastCheckedAt)}</span> : null}
                  </div>
                  <form action={registerVehicleComponentEvent} className="grid gap-3">
                    <input type="hidden" name="componentId" value={selectedComponent.id} />
                    <input type="hidden" name="plate" value={vehicle.plate} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        Tipo de registro
                        <select name="eventType" defaultValue="INSPECTION" className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-700">
                          <option value="INSPECTION">Inspeccion</option>
                          <option value="COMMENT">Comentario</option>
                          <option value="ADJUSTMENT">Ajuste</option>
                          <option value="MAINTENANCE">Mantenimiento</option>
                          <option value="REPLACEMENT">Cambio de componente</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        Titulo del registro
                        <input name="eventTitle" defaultValue={`Inspeccion de ${selectedComponent.label}`} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-700" />
                      </label>
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        Valor actual
                        <input name="currentValue" className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-700" placeholder="Labranza, temperatura, PSI, voltaje..." defaultValue={selectedComponent.currentValue ?? ""} />
                      </label>
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        Odometro
                        <input name="odometer" type="number" min="0" className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-700" placeholder="Ej. 125000" />
                      </label>
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        Proximo km
                        <input name="nextDueKm" type="number" min="0" className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-emerald-700" placeholder="Ej. 130000" defaultValue={selectedComponent.nextDueKm ?? undefined} />
                      </label>
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        Evidencia fotografica
                        <input name="evidence" type="file" accept="image/*" className="h-9 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-700 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-bold" />
                      </label>
                    </div>
                    <label className="grid gap-1 text-xs font-bold text-slate-600">
                      Comentario / novedad
                      <textarea name="notes" rows={3} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-700" placeholder="Describe el hallazgo, cambio realizado, repuesto usado o comentario operativo." />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button name="condition" value="GOOD" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700" type="submit">Guardar en verde</button>
                      <button name="condition" value="WARNING" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700" type="submit">Guardar en amarillo</button>
                      <button name="condition" value="CRITICAL" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700" type="submit">Guardar en rojo</button>
                    </div>
                  </form>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-black text-slate-950">Bitacora del componente</h4>
                      <span className="text-xs font-bold text-slate-500">{selectedComponent.events?.length ?? 0} registros</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {selectedComponent.events?.length ? selectedComponent.events.map((event) => (
                        <article key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h5 className="text-sm font-black text-slate-900">{event.title}</h5>
                              <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{eventTypeLabel(event.eventType)}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {event.newCondition ? <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${conditionClass(event.newCondition).badge}`}>{conditionLabel(event.newCondition)}</span> : null}
                              <span className="text-xs font-bold text-slate-500">{formatDateTime(event.createdAt)}</span>
                            </div>
                          </div>
                          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                            {event.currentValue ? <Metric label="Valor" value={event.currentValue} /> : null}
                            {event.odometer ? <Metric label="Odometro" value={event.odometer.toLocaleString("es-CO")} /> : null}
                            {event.nextDueKm ? <Metric label="Proximo km" value={event.nextDueKm.toLocaleString("es-CO")} /> : null}
                          </div>
                          {event.evidenceUrl ? (
                            <a href={event.evidenceUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-lg border border-slate-200 bg-white">
                              <img src={event.evidenceUrl} alt={`Evidencia de ${event.title}`} className="h-40 w-full object-cover" />
                            </a>
                          ) : null}
                          {event.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{event.notes}</p> : null}
                          <p className="mt-2 text-xs font-bold text-slate-500">Registrado por {event.createdByName ?? "usuario"}.</p>
                        </article>
                      )) : <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">Aun no hay registros para este componente.</div>}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500">
              No hay componentes configurados para este filtro.
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-black text-slate-950">Componentes en esta vista</h4>
              <span className="text-xs font-bold text-slate-500">{filteredComponents.length} visibles</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {filteredComponents.length ? filteredComponents.map((component) => (
                <button
                  key={component.id}
                  type="button"
                  id={`component-${selectedView}-${component.id}`}
                  onClick={() => {
                    setSelectedComponentId(component.id);
                    document.getElementById("component-inspector")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  }}
                  className={`rounded-lg border px-3 py-3 text-left transition ${selectedComponent?.id === component.id ? "border-cyan-300 bg-cyan-50 ring-1 ring-cyan-100" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-black text-slate-900">{component.label}</h5>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{component.area}</p>
                    </div>
                    <span className={`mt-0.5 h-3 w-3 rounded-full ${conditionClass(component.condition).bg}`} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{component.message}</p>
                </button>
              )) : <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500 sm:col-span-2">Ajusta el filtro para ver componentes.</div>}
            </div>
          </div>
        </div>
      </div>
      {snapshot ? (
        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-950">Linea de tiempo del activo</h3>
              <p className="mt-1 text-sm text-slate-500">Inspecciones, comentarios, mantenimientos, bloqueos y cambios del vehiculo en una sola cronologia.</p>
            </div>
            <div className="text-xs font-bold text-slate-500">{timeline.length} eventos</div>
          </div>
          <div className="mt-4 space-y-3">
            {timeline.length ? timeline.map((item) => (
              <article key={`${item.kind}-${item.id}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{item.kind === "maintenance" ? "Mantenimiento" : eventTypeLabel(item.eventType)}</span>
                      {item.condition ? <span className={`rounded-full px-2 py-1 text-[11px] font-black ${conditionClass(item.condition).badge}`}>{conditionLabel(item.condition)}</span> : null}
                    </div>
                    <h4 className="mt-2 text-sm font-black text-slate-900">{item.title}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                  <div className="text-right text-xs font-bold text-slate-500">
                    <div>{formatDateTime(item.createdAt)}</div>
                    {item.odometer ? <div className="mt-1">{item.odometer.toLocaleString("es-CO")} km</div> : null}
                  </div>
                </div>
                {item.evidenceUrl ? (
                  <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src={item.evidenceUrl} alt={`Evidencia de ${item.title}`} className="h-44 w-full object-cover" />
                  </a>
                ) : null}
              </article>
            )) : <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">No hay eventos registrados todavia.</div>}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function vehicleFromSnapshot(snapshot: VehicleVisualSnapshot): Vehicle {
  return {
    plate: snapshot.plate,
    type: `${snapshot.type} / ${snapshot.bodyType}${snapshot.refrigerated ? " refrigerado" : ""}${snapshot.trailerType ? ` / ${snapshot.trailerType}` : ""}`,
    status: snapshot.status === "MAINTENANCE" ? "Mantenimiento" : snapshot.status === "IN_ROUTE" ? "En ruta" : snapshot.status === "BLOCKED" ? "Detenido" : "En patio",
    capacity: snapshot.capacity ?? `${snapshot.wheelCount} llantas`,
    utilization: 0,
    health: snapshot.components.some((component) => component.condition === "red") ? 55 : snapshot.components.some((component) => component.condition === "yellow") ? 76 : 94,
    nextService: `${snapshot.odometer.toLocaleString("es-CO")} km`,
    zone: snapshot.currentZone ?? snapshot.vehicleClass,
    speed: 0,
  };
}

function snapshotComponents(snapshot: VehicleVisualSnapshot): VehicleComponent[] {
  return snapshot.components.map((component) => ({
    id: component.id,
    label: component.label,
    area: component.category,
    condition: component.condition,
    message: component.currentValue ? `${component.currentValue}. ${component.notes ?? ""}`.trim() : component.notes ?? "Sin novedad registrada.",
    nextAction: component.nextAction ?? "Continuar monitoreo.",
    position: { left: `${component.x}%`, top: `${component.y}%` },
    view: normalizeComponentView(component),
    side: component.side ?? undefined,
    currentValue: component.currentValue ?? undefined,
    threshold: component.threshold ?? undefined,
    nextDueKm: component.nextDueKm,
    lastCheckedAt: component.lastCheckedAt ?? null,
    events: component.events,
  }));
}

function getVehicleComponents(vehicle: Vehicle): VehicleComponent[] {
  const descriptor = `${vehicle.type} ${vehicle.capacity} ${vehicle.zone}`.toLowerCase();
  const isCritical = vehicle.health < 65 || vehicle.status === "Detenido";
  const isMaintenance = vehicle.status === "Mantenimiento";
  const isWarning = vehicle.health < 82 || vehicle.nextService.includes("120") || vehicle.nextService.includes("620") || isMaintenance;
  const hasTrailer = descriptor.includes("patineta") || descriptor.includes("tract") || descriptor.includes("trailer") || descriptor.includes("semirremolque");
  const refrigerated = descriptor.includes("refriger") || descriptor.includes("frio");

  const components: VehicleComponent[] = [
    demoComponent("overview-tire", "Llanta delantera critica", "Llantas", isCritical ? "red" : isWarning ? "yellow" : "green", "22%", "68%", "diagonal", isCritical ? "Labranza baja y presion inestable." : isWarning ? "Proxima a rotacion." : "Vigente para operacion normal.", isCritical ? "Bloquear despacho y programar cambio." : "Continuar monitoreo."),
    demoComponent("overview-engine", "Motor y enfriamiento", "Motor", isCritical ? "red" : "green", "34%", "39%", "diagonal", isCritical ? "Cambio de fluidos y validacion general pendiente." : "Temperatura y lubricacion en rango.", isCritical ? "Ejecutar preventivo antes de salida." : "Continuar monitoreo."),
    demoComponent("overview-brakes", "Frenos y aire", "Seguridad", vehicle.status === "Detenido" ? "red" : isWarning ? "yellow" : "green", "48%", "63%", "diagonal", vehicle.status === "Detenido" ? "Inspeccion obligatoria antes de despacho." : isWarning ? "Presion o desgaste por validar." : "Sistema aprobado.", vehicle.status === "Detenido" ? "Bloquear salida." : "Registrar medicion preoperacional."),
    demoComponent("overview-body", hasTrailer ? "Trailer y acople" : "Carroceria y puertas", "Carroceria", isWarning ? "yellow" : "green", "71%", "39%", "diagonal", isWarning ? "Requiere inspeccion visual de estructura y cierres." : "Sin novedad critica.", "Mantener checklist diario."),
    demoComponent("overview-electrical", "Electrico y alumbrado", "Electrico", isWarning ? "yellow" : "green", "25%", "25%", "diagonal", isWarning ? "Pendiente revision de voltaje o luces." : "Sistema estable.", "Validar en patio."),

    demoComponent("engine-oil", "Aceite de motor", "Motor", vehicle.nextService.includes("120") || isCritical ? "red" : isWarning ? "yellow" : "green", "25%", "43%", "left", vehicle.nextService.includes("120") || isCritical ? "Cambio muy proximo por kilometraje." : isWarning ? "Queda poco tiempo para cambio preventivo." : "Vigente.", vehicle.nextService.includes("120") || isCritical ? "Consumir aceite y filtro desde inventario." : "Programar revision."),
    demoComponent("oil-filter", "Filtro de aceite", "Motor", isWarning ? "yellow" : "green", "30%", "47%", "left", isWarning ? "Debe cambiarse junto con el aceite." : "Sin restriccion.", "Reservar filtro si corresponde."),
    demoComponent("air-filter", "Filtro de aire", "Motor", "green", "21%", "34%", "left", "Flujo dentro del rango esperado.", "Revisar en mantenimiento preventivo."),
    demoComponent("fuel-filter", "Filtro de combustible", "Motor", "green", "33%", "54%", "left", "Sin agua ni obstruccion reportada.", "Cambiar por kilometraje o contaminacion."),
    demoComponent("coolant-radiator", "Radiador y refrigerante", "Motor", isCritical ? "red" : "green", "18%", "28%", "left", isCritical ? "Temperatura fuera de rango o nivel bajo." : "Nivel y temperatura normales.", isCritical ? "Detener y revisar fugas." : "Continuar monitoreo."),
    demoComponent("belts", "Correas y poleas", "Motor", "green", "28%", "31%", "left", "Sin ruido ni grietas visibles.", "Inspeccion visual semanal."),
    demoComponent("turbo", "Turbo y admision", "Motor", "green", "36%", "36%", "left", "Presion y respuesta normal.", "Validar mangueras y abrazaderas."),
    demoComponent("steering", "Direccion y terminales", "Seguridad", isWarning ? "yellow" : "green", "29%", "59%", "left", isWarning ? "Ligero juego reportado en inspeccion." : "Sin juego reportado.", isWarning ? "Programar alineacion." : "Continuar monitoreo."),
    demoComponent("suspension-front", "Suspension delantera", "Chasis", "green", "20%", "72%", "left", "Sin fuga ni ruido critico.", "Inspeccion visual de bujes y amortiguadores."),
    demoComponent("brakes-drive", "Frenos eje tractor", "Seguridad", vehicle.status === "Detenido" ? "red" : isWarning ? "yellow" : "green", "48%", "70%", "left", vehicle.status === "Detenido" ? "El activo no debe salir sin medir frenos." : isWarning ? "Ajuste o desgaste medio." : "Sistema operativo.", vehicle.status === "Detenido" ? "Bloquear despacho." : "Medir bandas y revisar aire."),
    demoComponent("landing-gear", "Patas de apoyo", "Acople", hasTrailer ? "green" : "green", "61%", "70%", "left", hasTrailer ? "Mecanismo operativo y lubricado." : "No aplica al tipo de vehiculo.", hasTrailer ? "Probar en cargue y descargue." : "Continuar monitoreo."),
    demoComponent("body-side-left", hasTrailer ? "Lateral del trailer" : "Carroceria lateral", "Carroceria", isWarning ? "yellow" : "green", "75%", "36%", "left", isWarning ? "Pendiente validar golpes, sellos o filtraciones." : "Estructura sin novedad critica.", "Inspeccion visual diaria."),
    demoComponent("mirrors", "Espejos y puntos ciegos", "Cabina", "green", "20%", "23%", "left", "Cobertura visual completa.", "Validar en checklist de salida."),
    demoComponent("windshield", "Parabrisas y plumillas", "Cabina", "green", "16%", "18%", "left", "Barrido y visibilidad correctos.", "Cambiar plumillas si dejan rastro."),
    demoComponent("front-lights", "Luces delanteras", "Seguridad vial", "green", "11%", "39%", "left", "Farolas y direccionales operativas.", "Validar en patio antes de ruta nocturna."),
    demoComponent("air-lines", "Lineas de aire y cables", "Acople", hasTrailer ? "yellow" : "green", "53%", "33%", "left", hasTrailer ? "Revisar acoples, espirales y conectores." : "Sin novedad.", hasTrailer ? "Prueba de fugas y conexion." : "Continuar monitoreo."),

    demoComponent("fuel-tank", "Tanque de combustible", "Combustible", "green", "52%", "50%", "right", "Sin fuga ni golpe visible.", "Cruzar con tanqueos y consumo."),
    demoComponent("def-system", "Sistema DEF", "Emisiones", "green", "43%", "55%", "right", "Nivel y suministro dentro del rango.", "Revisar calidad y consumo."),
    demoComponent("battery", "Bateria y alternador", "Electrico", vehicle.health < 70 ? "yellow" : "green", "38%", "43%", "right", vehicle.health < 70 ? "Voltaje con tendencia baja." : "Voltaje estable.", vehicle.health < 70 ? "Medir y revisar bornes." : "Continuar monitoreo."),
    demoComponent("starter", "Arranque y cableado", "Electrico", "green", "31%", "47%", "right", "Sin caida de voltaje reportada.", "Revisar tierra y conectores."),
    demoComponent("transmission", "Transmision", "Tren motriz", "green", "45%", "58%", "right", "Sin golpe ni ruido critico.", "Inspeccion por kilometraje."),
    demoComponent("differential", "Diferencial y ejes", "Tren motriz", "green", "58%", "63%", "right", "Sin fuga visible.", "Revisar retenedores y nivel."),
    demoComponent("exhaust-dpf", "Escape y DPF", "Emisiones", "green", "46%", "70%", "right", "Regeneracion dentro del rango.", "Escanear si aparecen alertas."),
    demoComponent("suspension-right", "Suspension lateral", "Chasis", "green", "69%", "73%", "right", "Altura y apoyo sin novedad.", "Validar bolsas y amortiguadores."),
    demoComponent("body-side-right", hasTrailer ? "Lateral derecho del trailer" : "Puertas laterales", "Carroceria", "green", "75%", "36%", "right", "Sin apertura accidental ni deformacion.", "Inspeccion visual diaria."),

    demoComponent("rear-doors", "Puertas traseras y chapas", "Carroceria", isWarning ? "yellow" : "green", "50%", "33%", "rear", isWarning ? "Cierres o sellos proximos a ajuste." : "Cierre completo y seguro.", isWarning ? "Ajustar herrajes y sello." : "Mantener inspeccion."),
    demoComponent("rear-lights", "Luces traseras y stop", "Seguridad vial", "green", "50%", "57%", "rear", "Senalizacion completa.", "Prueba de luces antes de ruta."),
    demoComponent("reverse-alarm", "Alarma de reversa y camara", "Seguridad vial", "green", "50%", "45%", "rear", "Audio y video operativos.", "Probar en patio."),
    demoComponent("mudflaps", "Guardabarros y salpicaderas", "Carroceria", "green", "50%", "76%", "rear", "Sin desprendimiento ni piezas sueltas.", "Reparar si presenta rotura."),
    demoComponent("rear-axle", "Rodado trasero visible", "Llantas", isWarning ? "yellow" : "green", "50%", "70%", "rear", isWarning ? "Una llanta requiere validacion de presion." : "Rodado trasero operativo.", isWarning ? "Revisar labranza y presion." : "Continuar monitoreo."),

    demoComponent("roof-seals", refrigerated ? "Techo, sellos y frio" : "Techo y sellos", "Carroceria", isWarning ? "yellow" : "green", "61%", "28%", "top", isWarning ? "Posible punto de filtracion o sello por revisar." : "Sin filtracion visible.", "Inspeccion en lavado o lluvia."),
    demoComponent("cargo-floor", "Piso de carga", "Carroceria", "green", "66%", "55%", "top", "Superficie util sin fisuras criticas.", "Inspeccionar en cada descargue."),
    demoComponent("coupling-top", hasTrailer ? "Quinta rueda y acople" : "Cabina y chasis", hasTrailer ? "Acople" : "Chasis", hasTrailer && isWarning ? "yellow" : "green", "47%", "46%", "top", hasTrailer ? "Bloqueo y plato requieren inspeccion visual." : "Distribucion del chasis sin novedad.", hasTrailer ? "Prueba de acople antes de despacho." : "Continuar monitoreo."),
    demoComponent("kingpin", hasTrailer ? "King pin y plato" : "Cubierta superior", hasTrailer ? "Acople" : "Carroceria", "green", "55%", "46%", "top", hasTrailer ? "Sin holgura visible." : "Sin novedad.", hasTrailer ? "Lubricar y validar seguro." : "Continuar monitoreo."),
    demoComponent("load-distribution", "Distribucion de carga", "Operacion", isWarning ? "yellow" : "green", "71%", "50%", "top", isWarning ? "Requiere validar balance o amarre." : "Centro de carga dentro del rango.", isWarning ? "Revisar estiba o sujecion." : "Mantener monitoreo."),
  ];

  if (refrigerated) {
    components.push(
      demoComponent("reefer-unit", "Unidad de refrigeracion", "Cadena de frio", "yellow", "57%", "18%", "top", "Preenfriado o temperatura por validar.", "Validar sensor, equipo y sellos."),
      demoComponent("evaporator", "Evaporador y ventiladores", "Cadena de frio", "green", "74%", "30%", "top", "Flujo de aire dentro del rango.", "Limpieza preventiva."),
      demoComponent("temp-probe", "Sonda de temperatura", "Cadena de frio", "green", "77%", "44%", "top", "Lectura consistente con setpoint.", "Comparar contra termometro patron."),
    );
  }

  return components;
}

function normalizeComponentView(component: VehicleVisualSnapshot["components"][number]): VehicleVisualView {
  const explicitView = component.view?.toLowerCase();
  if (explicitView === "left" || explicitView === "right" || explicitView === "rear" || explicitView === "top") {
    return explicitView;
  }

  const fingerprint = `${component.label} ${component.category} ${component.side ?? ""} ${component.componentKey}`.toLowerCase();
  if (fingerprint.includes("puertas traseras") || fingerprint.includes("rear") || fingerprint.includes("stop") || fingerprint.includes("reversa")) return "rear";
  if (fingerprint.includes("techo") || fingerprint.includes("roof") || fingerprint.includes("carga") || fingerprint.includes("quinta rueda") || fingerprint.includes("king pin")) return "top";
  if (component.side === "Izquierda") return "left";
  if (component.side === "Derecha") return "right";
  if (fingerprint.includes("tanque") || fingerprint.includes("bateria") || fingerprint.includes("def") || fingerprint.includes("arranque")) return "right";
  if (fingerprint.includes("aceite") || fingerprint.includes("radiador") || fingerprint.includes("direccion") || fingerprint.includes("filtro")) return "left";
  return "diagonal";
}

function demoComponent(
  id: string,
  label: string,
  area: string,
  condition: ComponentCondition,
  left: string,
  top: string,
  view: VehicleVisualView,
  message: string,
  nextAction: string,
): VehicleComponent {
  return {
    id,
    label,
    area,
    condition,
    message,
    nextAction,
    position: { left, top },
    view,
  };
}

function viewLabel(view: VehicleVisualView) {
  if (view === "left") return "Plano lateral izquierdo";
  if (view === "right") return "Plano lateral derecho";
  if (view === "rear") return "Plano posterior";
  if (view === "top") return "Plano superior";
  return "Vista 3/4";
}

function vehicleImagePath(vehicle: Vehicle) {
  const images: Record<string, string> = {
    "TRK-482": "/transport/vehicles/trk-482-turbo-cutaway.png",
    "VAN-221": "/transport/vehicles/van-221-refrigerated-cutaway.png",
    "TRK-615": "/transport/vehicles/trk-615-single-cutaway.png",
    "FUR-009": "/transport/vehicles/fur-009-panel-van-cutaway.png",
    "TRK-308": "/transport/vehicles/trk-308-heavy-cutaway.png",
  };

  if (images[vehicle.plate]) return images[vehicle.plate];

  const descriptor = `${vehicle.type} ${vehicle.capacity} ${vehicle.zone}`.toLowerCase();
  if (descriptor.includes("refriger")) return "/transport/vehicles/van-221-refrigerated-cutaway.png";
  if (descriptor.includes("tract") || descriptor.includes("patineta") || descriptor.includes("trailer") || descriptor.includes("22 llantas") || descriptor.includes("18 llantas")) return "/transport/vehicles/trk-308-heavy-cutaway.png";
  if (descriptor.includes("van") || descriptor.includes("furgon")) return "/transport/vehicles/fur-009-panel-van-cutaway.png";
  if (descriptor.includes("sencillo") || descriptor.includes("8t") || descriptor.includes("8 ton")) return "/transport/vehicles/trk-615-single-cutaway.png";

  return "/transport/vehicles/trk-482-turbo-cutaway.png";
}

function vehicleViewImagePath(vehicle: Vehicle, view: Exclude<VehicleVisualView, "diagonal">) {
  const descriptor = `${vehicle.type} ${vehicle.capacity} ${vehicle.zone}`.toLowerCase();
  const family = descriptor.includes("refriger") || descriptor.includes("van") || descriptor.includes("furgon")
    ? "van"
    : descriptor.includes("tract") || descriptor.includes("patineta") || descriptor.includes("trailer") || descriptor.includes("22 llantas") || descriptor.includes("18 llantas")
      ? "heavy"
      : "box";

  const images = {
    heavy: {
      left: "/transport/vehicles/views/heavy-side-cutaway.png",
      right: "/transport/vehicles/views/heavy-side-cutaway.png",
      rear: "/transport/vehicles/views/heavy-rear-cutaway.png",
      top: "/transport/vehicles/views/heavy-top-cutaway.png",
    },
    box: {
      left: "/transport/vehicles/views/box-side-cutaway.png",
      right: "/transport/vehicles/views/box-side-cutaway.png",
      rear: "/transport/vehicles/views/box-rear-cutaway.png",
      top: "/transport/vehicles/views/box-top-cutaway.png",
    },
    van: {
      left: "/transport/vehicles/views/van-side-cutaway.png",
      right: "/transport/vehicles/views/van-side-cutaway.png",
      rear: "/transport/vehicles/views/van-rear-cutaway.png",
      top: "/transport/vehicles/views/van-top-cutaway.png",
    },
  } as const;

  return images[family][view];
}

function conditionClass(condition: ComponentCondition) {
  if (condition === "red") {
    return { bg: "bg-rose-600", ring: "ring-rose-100", badge: "border border-rose-200 bg-rose-50 text-rose-700" };
  }

  if (condition === "yellow") {
    return { bg: "bg-amber-500", ring: "ring-amber-100", badge: "border border-amber-200 bg-amber-50 text-amber-700" };
  }

  return { bg: "bg-emerald-600", ring: "ring-emerald-100", badge: "border border-emerald-200 bg-emerald-50 text-emerald-700" };
}

function conditionLabel(condition: ComponentCondition) {
  if (condition === "red") return "Requiere cambio";
  if (condition === "yellow") return "Proximo";
  return "Vigente";
}

function eventTypeLabel(eventType: "INSPECTION" | "COMMENT" | "ADJUSTMENT" | "MAINTENANCE" | "REPLACEMENT") {
  if (eventType === "COMMENT") return "Comentario";
  if (eventType === "ADJUSTMENT") return "Ajuste";
  if (eventType === "MAINTENANCE") return "Mantenimiento";
  if (eventType === "REPLACEMENT") return "Cambio";
  return "Inspeccion";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildVehicleTimeline(snapshot: VehicleVisualSnapshot) {
  const componentEvents = snapshot.components.flatMap((component) =>
    component.events.map((event) => ({
      kind: "event" as const,
      id: event.id,
      title: `${component.label}: ${event.title}`,
      detail: event.notes ?? event.currentValue ?? "Sin detalle adicional.",
      eventType: event.eventType,
      condition: event.newCondition ?? null,
      odometer: event.odometer ?? null,
      evidenceUrl: event.evidenceUrl ?? null,
      createdAt: event.createdAt,
    })),
  );

  const maintenances = snapshot.maintenances.map((maintenance) => ({
    kind: "maintenance" as const,
    id: maintenance.id,
    title: `${maintenance.code} - ${maintenance.type}`,
    detail: maintenance.notes ?? "Orden de mantenimiento registrada para el vehiculo.",
    eventType: "MAINTENANCE" as const,
    condition: null,
    odometer: maintenance.odometer ?? null,
    evidenceUrl: null,
    createdAt: maintenance.createdAt,
  }));

  return [...componentEvents, ...maintenances].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 24);
}

function ConditionSummary({ label, value, condition }: { label: string; value: number; condition: ComponentCondition }) {
  return (
    <div className={`rounded-lg px-4 py-3 ${conditionClass(condition).badge}`}>
      <span className="block text-[10px] font-black uppercase tracking-[0.08em]">{label}</span>
      <strong className="mt-1 block text-xl font-black">{value}</strong>
    </div>
  );
}

function SegmentChip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "rounded-full border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-black text-white" : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50"}
    >
      {children}
    </button>
  );
}

function LegendDot({ condition, label }: { condition: ComponentCondition; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 font-bold text-slate-600">
      <span className={`h-3 w-3 rounded-full ${conditionClass(condition).bg}`} />
      {label}
    </div>
  );
}

function VehicleCard({
  vehicle,
  onUpdateStatus,
}: {
  vehicle: Vehicle;
  onUpdateStatus: (vehicle: Vehicle, status: VehicleStatus) => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold text-slate-500">{vehicle.type}</span><h3 className="mt-1 text-lg font-black text-slate-950">{vehicle.plate}</h3></div><StatusBadge value={vehicle.status} /></header>
      <dl className="mt-4 grid grid-cols-3 gap-3"><Metric label="Capacidad" value={vehicle.capacity} /><Metric label="Zona" value={vehicle.zone} /><Metric label="Velocidad" value={`${vehicle.speed} km/h`} /></dl>
      <div className="mt-4 space-y-3"><span className="text-xs font-bold text-slate-500">Utilizacion</span><ProgressBar value={vehicle.utilization} /><span className="text-xs font-bold text-slate-500">Estado mecanico</span><ProgressBar value={vehicle.health} /></div>
      <footer className="mt-4 flex items-center gap-2 text-sm text-slate-500"><CalendarClock className="h-4 w-4" /> Proximo servicio: {vehicle.nextService}</footer>
      <div className="mt-4 flex flex-wrap gap-2"><SmallLinkButton href={`/transport/fleet/${encodeURIComponent(vehicle.plate)}`}>Ver estado visual</SmallLinkButton><SmallButton onClick={() => onUpdateStatus(vehicle, "En ruta")}>En ruta</SmallButton><SmallButton onClick={() => onUpdateStatus(vehicle, "En patio")}>En patio</SmallButton><SmallButton onClick={() => onUpdateStatus(vehicle, "Mantenimiento")}>Taller</SmallButton></div>
    </article>
  );
}

function DecisionItem({ icon, decision, onApply }: { icon: ReactNode; decision: Decision; onApply: (decision: Decision) => void }) {
  return <article className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">{icon}</div><div><h3 className="text-sm font-black text-slate-950">{decision.title}</h3><p className="mt-1 text-sm text-slate-500">{decision.detail}</p></div><span className="text-sm font-black text-slate-700">{decision.impact}</span>{decision.status === "Pendiente" ? <SmallButton onClick={() => onApply(decision)}>Aplicar</SmallButton> : <StatusBadge value={decision.status} />}</article>;
}

function ActivityFeed({ activity }: { activity: ActivityEvent[] }) {
  return <Panel title="Bitacora auditada" action="Tiempo real"><div className="space-y-3">{activity.slice(0, 6).map((event) => <article key={event.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><CheckCircle2 className="h-4 w-4 text-emerald-700" /><span className="min-w-0 flex-1 text-sm text-slate-600">{event.message}</span><time className="text-xs font-bold text-slate-400">{new Date(event.time).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</time></article>)}</div></Panel>;
}

function MiniTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return <DataPanel columns={columns}>{rows.length ? rows.map((row, index) => <tr key={`${row.join("-")}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{cell}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">Sin registros todavia</td></tr>}</DataPanel>;
}

function DataPanel({ columns, children }: { columns: string[]; children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full border-collapse text-left text-sm"><thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-slate-200 px-4 py-3">{column}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 text-slate-600">{children}</tbody></table></div></div>;
}

function CustomerRankingBoard({ clients }: { clients: CustomerPerformance[] }) {
  const target = 95;
  if (clients.length === 0) return <p className="py-8 text-center text-sm text-slate-500">Sin clientes para ranking.</p>;

  const leader = clients[0]!;
  const atRisk = clients.filter((client) => client.compliance < target);
  const focusClient = [...clients].sort((a, b) => a.compliance - b.compliance)[0]!;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ExecutiveSummary label="Lider" value={`${leader.customer} ${leader.compliance}%`} />
        <ExecutiveSummary label="SLA en riesgo" value={`${atRisk.length} clientes`} />
        <ExecutiveSummary label="Foco" value={`${focusClient.customer} ${focusClient.compliance}%`} />
      </div>
      <div className="space-y-2">
        {clients.map((client, index) => {
          const status = rankingStatus(client.compliance);
          return (
            <article key={client.customer} className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-[36px_minmax(0,1fr)_72px_auto] sm:items-center">
              <span className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-black ${index === 0 ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-700"}`}>{index + 1}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-slate-950">{client.customer}</h3>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">{client.inUseVehicles}/{client.assignedVehicles} vehiculos en uso / {client.availableVehicles} reserva / {client.incidents} nov.</p>
                  </div>
                  <span className={`inline-flex min-h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-black ${status.className}`}>{status.label}</span>
                </div>
                <div className="mt-3 grid gap-2">
                  <MeterBar value={client.compliance} tone={status.tone} marker={target} />
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>SLA meta {target}%</span>
                    <span>Uso {client.utilization}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-end justify-between gap-3 sm:block sm:text-right">
                <span className="text-2xl font-black text-slate-950">{client.compliance}%</span>
                <p className="text-xs font-black text-slate-500">{client.compliance < target ? "Priorizar" : "Ok"}</p>
              </div>
              <SmallLinkButton href="/transport/orders">Gestionar</SmallLinkButton>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FleetAllocationBoard({ clients }: { clients: CustomerPerformance[] }) {
  const totals = clients.reduce(
    (summary, client) => ({
      assigned: summary.assigned + client.assignedVehicles,
      inUse: summary.inUse + client.inUseVehicles,
      available: summary.available + client.availableVehicles,
    }),
    { assigned: 0, inUse: 0, available: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <ExecutiveSummary label="Total" value={totals.assigned.toString()} />
        <ExecutiveSummary label="En ruta" value={totals.inUse.toString()} />
        <ExecutiveSummary label="Reserva" value={totals.available.toString()} />
      </div>
      <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-900" /> En uso</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Reserva</span>
      </div>
      <div className="space-y-3">
        {clients.map((client) => {
          const useWidth = client.assignedVehicles > 0 ? Math.round((client.inUseVehicles / client.assignedVehicles) * 100) : 0;
          const availableWidth = client.assignedVehicles > 0 ? 100 - useWidth : 0;
          return (
            <article key={client.customer} className="grid gap-2 md:grid-cols-[130px_minmax(0,1fr)_72px_auto] md:items-center">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-slate-950">{client.customer}</h3>
                <p className="text-xs font-bold text-slate-500">{client.utilization}% uso</p>
              </div>
              <div className="h-8 overflow-hidden rounded-md bg-slate-100">
                <div className="flex h-full">
                  <span className="bg-slate-900" style={{ width: `${useWidth}%` }} aria-label={`${client.inUseVehicles} vehiculos en uso`} />
                  <span className="bg-slate-300" style={{ width: `${availableWidth}%` }} aria-label={`${client.availableVehicles} vehiculos en reserva`} />
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 md:block md:text-right">
                <strong className="text-sm font-black text-slate-950">{client.assignedVehicles}</strong>
                <p className="text-xs font-bold text-slate-500">{client.inUseVehicles} / {client.availableVehicles}</p>
              </div>
              <SmallLinkButton href="/transport/fleet">Revisar</SmallLinkButton>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ExecutiveSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <span className="block text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <strong className="mt-1 block truncate text-sm font-black text-slate-950">{value}</strong>
    </div>
  );
}

function CompactMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "danger" }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-3">
      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</span>
      <strong className={`mt-1 block text-xl font-black ${tone === "danger" ? "text-rose-700" : "text-slate-950"}`}>{value}</strong>
    </div>
  );
}

function PriorityMeter({ label, value, target, tone }: { label: string; value: number; target: number; tone: "danger" | "info" }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
        <span>{label}</span>
        <span>{value}% / meta {target}%</span>
      </div>
      <MeterBar value={value} marker={target} tone={tone} />
    </div>
  );
}

function CustomerPerformanceTable({ clients = customerPerformance }: { clients?: CustomerPerformance[] }) {
  return (
    <DataPanel columns={["Cliente", "Cumplimiento", "Vehiculos", "En uso", "Disponibles", "Uso flota", "Ordenes", "Facturacion", "Valor riesgo", "Novedades", "Accion"]}>
      {clients.map((customer) => (
        <tr key={customer.customer}>
          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-950">{customer.customer}</td>
          <td className="min-w-36 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="w-10 text-sm font-black text-slate-700">{customer.compliance}%</span>
              <ProgressBar value={customer.compliance} />
            </div>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{customer.assignedVehicles}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{customer.inUseVehicles}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{customer.availableVehicles}</td>
          <td className="min-w-32 px-4 py-3"><ProgressBar value={customer.utilization} /></td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{customer.orders}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{customer.revenue}</td>
          <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-700">{formatCompactMoney(customer.valueAtRisk ?? 0)}</td>
          <td className="whitespace-nowrap px-4 py-3"><StatusBadge value={customer.incidents > 0 || customer.compliance < 95 ? `${customer.incidents} nov.` : "Controlado"} /></td>
          <td className="whitespace-nowrap px-4 py-3"><SmallLinkButton href="/transport/orders">Gestionar</SmallLinkButton></td>
        </tr>
      ))}
    </DataPanel>
  );
}

function Pill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs font-bold text-slate-500">{icon}{label}</div><strong className="mt-2 block text-lg font-black text-slate-950">{value}</strong></div>;
}

function Insight({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><CalendarClock className="h-5 w-5 text-cyan-700" /><span className="mt-4 block text-sm font-bold text-slate-500">{title}</span><strong className="mt-2 block text-2xl font-black text-slate-950">{value}</strong><p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p></article>;
}

function IntegrationMode({ selected = false, title, text, status }: { selected?: boolean; title: string; text: string; status: string }) {
  return <article className={`rounded-lg border p-5 shadow-sm ${selected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}><h3 className="text-base font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p><div className="mt-4"><StatusBadge value={status} /></div></article>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-black text-slate-950">{value}</dd></div>;
}

function ChartBox({ children }: { children: ReactNode }) {
  return <div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}

function ActionButton({ icon: Icon, label, variant = "primary", onClick }: { icon: LucideIcon; label: string; variant?: "primary" | "secondary"; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        notifyAtlasAction(`${label}: accion ejecutada.`);
      }}
      className={variant === "primary" ? "inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-black text-white shadow-sm hover:bg-emerald-800" : "inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50"}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SmallButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const label = labelFromChildren(children);

  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        notifyAtlasAction(`${label}: accion ejecutada.`);
      }}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function SmallLinkButton({ children, href, target }: { children: ReactNode; href: string; target?: string }) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noreferrer" : undefined}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
    >
      {children}
    </Link>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-black ${badgeClass(value)}`}>{value}</span>;
}

function SeverityDot({ severity }: { severity: Severity }) {
  return <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${severity === "critical" ? "bg-rose-600" : severity === "warning" ? "bg-amber-500" : severity === "success" ? "bg-emerald-600" : "bg-cyan-600"}`} aria-hidden="true" />;
}

function ProgressBar({ value }: { value: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${value}%`}><span className="block h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

function orderComplianceScore(order: Order) {
  if (order.status === "Entregada") return 100;
  if (order.status === "En ruta") return Math.max(92, order.progress);
  if (order.status === "Asignada") return Math.max(86, Math.min(94, order.progress + 60));
  if (order.status === "Planificada") return Math.max(78, Math.min(90, order.progress + 70));
  if (order.status === "En riesgo") return Math.max(70, Math.min(84, order.progress));
  if (order.status === "Incidencia") return Math.max(45, Math.min(72, order.progress));
  return order.progress;
}

function parseTransportMoney(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\$/g, "").replace(/\s/g, "").replace(/,/g, ".");
  const amount = Number.parseFloat(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  if (normalized.includes("M")) return amount * 1_000_000;
  if (normalized.includes("K")) return amount * 1_000;
  return amount;
}

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000).toLocaleString("es-CO")}K`;
  return money.format(value);
}

function priorityClientSummary(client: CustomerPerformance) {
  return `${client.orders} ordenes activas, ${client.assignedVehicles} vehiculos asignados, ${client.availableVehicles} en reserva y ${formatCompactMoney(client.valueAtRisk ?? 0)} en riesgo por SLA.`;
}

function priorityClientAction(client: CustomerPerformance) {
  if (client.incidents > 0) return `Gestionar ${client.incidents} novedades y revisar las ordenes del cliente en torre de control.`;
  if (client.availableVehicles > 0 && client.compliance < 95) return `Reasignar reserva disponible y priorizar las ordenes pendientes del cliente.`;
  if (client.assignedVehicles === 0) return "Asignar vehiculo a las ordenes sin placa antes de confirmar despacho.";
  return "Monitorear cumplimiento y mantener seguimiento operativo hasta cierre de entrega.";
}

function MeterBar({ value, tone, marker }: { value: number; tone: "success" | "warning" | "danger" | "info"; marker?: number }) {
  const width = Math.min(100, Math.max(0, value));
  const markerPosition = typeof marker === "number" ? Math.min(100, Math.max(0, marker)) : undefined;
  const toneClass = tone === "success" ? "bg-emerald-600" : tone === "warning" ? "bg-amber-500" : tone === "danger" ? "bg-rose-600" : "bg-cyan-600";

  return (
    <div className="relative h-2.5 rounded-full bg-slate-100" aria-label={`${value}%`}>
      <span className={`block h-full rounded-full ${toneClass}`} style={{ width: `${width}%` }} />
      {typeof markerPosition === "number" ? <span className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-slate-500" style={{ left: `${markerPosition}%` }} aria-hidden="true" /> : null}
    </div>
  );
}

function rankingStatus(compliance: number) {
  if (compliance >= 95) return { label: "Sobre meta", tone: "success" as const, className: "border border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (compliance >= 90) return { label: "Revisar", tone: "warning" as const, className: "border border-amber-200 bg-amber-50 text-amber-700" };
  return { label: "Critico", tone: "danger" as const, className: "border border-rose-200 bg-rose-50 text-rose-700" };
}

function severityProgress(severity: Severity) {
  if (severity === "critical") return 88;
  if (severity === "warning") return 66;
  if (severity === "info") return 52;
  return 74;
}

function periodLabel(period: PeriodId) {
  if (period === "day") return "Dia";
  if (period === "week") return "Semana";
  return "Mensual";
}

function badgeClass(value: string) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (["entregada", "disponible", "en patio", "activo", "listo", "aprobado", "pod", "aceptada", "legalizado"].includes(normalized)) return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["en riesgo", "incidencia", "critica", "alta", "mantenimiento", "detenido"].includes(normalized)) return "border border-rose-200 bg-rose-50 text-rose-700";
  if (["asignada", "planificada", "media", "revision", "abierto", "diseno"].includes(normalized)) return "border border-amber-200 bg-amber-50 text-amber-700";
  if (normalized.includes("nov")) return "border border-amber-200 bg-amber-50 text-amber-700";
  if (["en ruta", "en turno", "suite", "api"].includes(normalized)) return "border border-cyan-200 bg-cyan-50 text-cyan-700";
  return "border border-slate-200 bg-slate-50 text-slate-700";
}

function notifyAtlasAction(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("atlas-action", { detail: { message } }));
}

function labelFromChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return children.toString();
  if (Array.isArray(children)) {
    const label = children
      .map((child) => (typeof child === "string" || typeof child === "number" ? child.toString() : ""))
      .join(" ")
      .trim();
    return label || "Accion";
  }
  return "Accion";
}
