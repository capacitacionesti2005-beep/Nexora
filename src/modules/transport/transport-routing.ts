export const transportModuleSlugs = [
  "control",
  "orders",
  "fleet",
  "drivers",
  "routes",
  "maintenance",
  "costs",
  "finance",
  "analytics",
  "integrations",
  "driver",
] as const;

export type TransportModuleSlug = (typeof transportModuleSlugs)[number];

export function isTransportModuleSlug(value: string): value is TransportModuleSlug {
  return transportModuleSlugs.includes(value as TransportModuleSlug);
}
