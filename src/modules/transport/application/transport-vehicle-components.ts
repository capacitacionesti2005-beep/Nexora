import { prisma } from "@/lib/db/prisma";

type ComponentSeed = {
  key: string;
  label: string;
  category: string;
  side?: string;
  condition?: "GOOD" | "WARNING" | "CRITICAL";
  currentValue?: string;
  threshold?: string;
  nextAction?: string;
  x: number;
  y: number;
  view?: string;
  nextDueKm?: number;
};

export function buildVehicleComponentSeeds({
  wheelCount,
  refrigerated,
  vehicleClass,
  trailerType,
}: {
  wheelCount: number;
  refrigerated: boolean;
  vehicleClass: string;
  trailerType?: string;
}): ComponentSeed[] {
  const addAxlePair = (
    positions: Array<[string, string, string, number, number, string]>,
    axle: string,
    label: string,
    x: number,
    dual = false,
  ) => {
    if (dual) {
      positions.push([`tire-${axle}-left-outer`, `Llanta ${label} izquierda externa`, "Izquierda", x, 78, "left"]);
      positions.push([`tire-${axle}-left-inner`, `Llanta ${label} izquierda interna`, "Izquierda", x + 3, 84, "left"]);
      positions.push([`tire-${axle}-right-outer`, `Llanta ${label} derecha externa`, "Derecha", x, 78, "right"]);
      positions.push([`tire-${axle}-right-inner`, `Llanta ${label} derecha interna`, "Derecha", x + 3, 84, "right"]);
      return;
    }

    positions.push([`tire-${axle}-left`, `Llanta ${label} izquierda`, "Izquierda", x, 78, "left"]);
    positions.push([`tire-${axle}-right`, `Llanta ${label} derecha`, "Derecha", x, 78, "right"]);
  };

  const wheelPositions: Array<[string, string, string, number, number, string]> = [];
  addAxlePair(wheelPositions, "front", "delantera", 18);

  if (wheelCount <= 4) {
    addAxlePair(wheelPositions, "rear", "trasera", 76);
  } else if (wheelCount <= 8) {
    addAxlePair(wheelPositions, "drive", "de traccion", 72, wheelCount >= 6);
  } else if (wheelCount <= 12) {
    addAxlePair(wheelPositions, "drive-1", "de traccion eje 1", 43, true);
    addAxlePair(wheelPositions, "trailer-1", "del trailer eje 1", 76, wheelCount >= 10);
  } else if (wheelCount <= 18) {
    addAxlePair(wheelPositions, "drive-1", "de traccion eje 1", 38, true);
    addAxlePair(wheelPositions, "drive-2", "de traccion eje 2", 48, true);
    addAxlePair(wheelPositions, "trailer-1", "del trailer eje 1", 70, true);
    addAxlePair(wheelPositions, "trailer-2", "del trailer eje 2", 82, true);
  } else {
    addAxlePair(wheelPositions, "lift", "eje auxiliar", 31);
    addAxlePair(wheelPositions, "drive-1", "de traccion eje 1", 41, true);
    addAxlePair(wheelPositions, "drive-2", "de traccion eje 2", 51, true);
    addAxlePair(wheelPositions, "trailer-1", "del trailer eje 1", 68, true);
    addAxlePair(wheelPositions, "trailer-2", "del trailer eje 2", 79, true);
    addAxlePair(wheelPositions, "trailer-3", "del trailer eje 3", 90);
  }

  const wheelSeeds: ComponentSeed[] = wheelPositions.slice(0, wheelCount).map(([key, label, side, x, y, view], index) => ({
    key: String(key),
    label: String(label),
    category: "Llantas",
    side: String(side),
    condition: index === 1 || index === 8 ? "WARNING" : "GOOD",
    currentValue: index === 1 || index === 8 ? "Labranza 5 mm / presion por validar" : "Labranza 9 mm / presion OK",
    threshold: "Cambio <= 3 mm / alerta <= 6 mm",
    nextAction: index === 1 || index === 8 ? "Programar rotacion y validar llanta disponible." : "Continuar monitoreo.",
    x: Number(x),
    y: Number(y),
    view: String(view),
  }));

  const seeds: ComponentSeed[] = [
    ...wheelSeeds,
    { key: "engine-oil", label: "Aceite de motor", category: "Motor", condition: "WARNING", currentValue: "620 km para cambio", threshold: "Alerta < 1.000 km", nextAction: "Programar cambio de aceite y filtro.", x: 25, y: 42, view: "left", nextDueKm: 620 },
    { key: "oil-filter", label: "Filtro de aceite", category: "Motor", condition: "WARNING", currentValue: "Mismo ciclo del aceite", threshold: "Cambio con aceite", nextAction: "Reservar filtro en inventario.", x: 30, y: 46, view: "left", nextDueKm: 620 },
    { key: "air-filter", label: "Filtro de aire", category: "Motor", condition: "GOOD", currentValue: "Vigente", threshold: "Inspeccion cada 10.000 km", nextAction: "Revisar en preventivo.", x: 22, y: 34, view: "left" },
    { key: "fuel-filter", label: "Filtro de combustible", category: "Motor", condition: "GOOD", currentValue: "Sin restriccion", threshold: "Alerta por perdida de potencia o agua", nextAction: "Cambiar por kilometraje o contaminacion.", x: 33, y: 54, view: "left" },
    { key: "coolant", label: "Refrigerante y radiador", category: "Motor", condition: "GOOD", currentValue: "Nivel normal", threshold: "Alerta por temperatura o nivel bajo", nextAction: "Validar fugas y concentracion.", x: 19, y: 28, view: "left" },
    { key: "belts", label: "Correas y poleas", category: "Motor", condition: "GOOD", currentValue: "Sin ruido", threshold: "Alerta por grieta, ruido o tension baja", nextAction: "Inspeccion visual de correas.", x: 27, y: 30, view: "left" },
    { key: "turbo-intake", label: "Turbo / admision", category: "Motor", condition: "GOOD", currentValue: "Presion normal", threshold: "Alerta por humo, silbido o fuga", nextAction: "Validar abrazaderas y mangueras.", x: 36, y: 36, view: "left" },
    { key: "exhaust-dpf", label: "Escape / DPF", category: "Emisiones", condition: "GOOD", currentValue: "Regeneracion normal", threshold: "Alerta por restriccion o temperatura", nextAction: "Revisar sensores y codigos.", x: 45, y: 67, view: "left" },
    { key: "brakes-front", label: "Frenos delanteros", category: "Seguridad", condition: "GOOD", currentValue: "Operativo", threshold: "Bloquear por fuga, baja presion o desgaste", nextAction: "Medir bandas/pastillas.", x: 19, y: 66, view: "left" },
    { key: "brakes-drive", label: "Frenos eje de traccion", category: "Seguridad", condition: vehicleClass === "TRACTOR" ? "WARNING" : "GOOD", currentValue: vehicleClass === "TRACTOR" ? "Presion por validar" : "Operativo", threshold: "Bloquear por fuga, baja presion o ABS", nextAction: "Validar en preoperacional.", x: 47, y: 66, view: "left" },
    { key: "brakes-trailer", label: "Frenos del trailer", category: "Seguridad", condition: trailerType ? "WARNING" : "GOOD", currentValue: trailerType ? "Acople de aire por validar" : "No aplica trailer", threshold: "Bloquear por fuga o freno desajustado", nextAction: "Prueba de aire y frenado.", x: 78, y: 66, view: "left" },
    { key: "air-compressor", label: "Compresor y lineas de aire", category: "Seguridad", condition: "GOOD", currentValue: "Carga normal", threshold: "Alerta por baja presion o fuga", nextAction: "Revisar secador, lineas y racores.", x: 39, y: 58, view: "left" },
    { key: "abs-sensors", label: "Sensores ABS/EBS", category: "Seguridad", condition: "GOOD", currentValue: "Sin testigo", threshold: "Bloquear si ABS queda activo", nextAction: "Escanear codigos si aparece alerta.", x: 63, y: 73, view: "left" },
    { key: "suspension-front", label: "Suspension delantera", category: "Chasis", condition: "GOOD", currentValue: "Sin fuga", threshold: "Alerta por fuga, hoja partida o ruido", nextAction: "Inspeccion visual.", x: 22, y: 71, view: "left" },
    { key: "suspension-rear", label: "Suspension trasera / bolsas", category: "Chasis", condition: "GOOD", currentValue: "Altura normal", threshold: "Alerta por fuga, desgaste o desnivel", nextAction: "Validar bolsas, bujes y amortiguadores.", x: 63, y: 72, view: "left" },
    { key: "steering", label: "Direccion / terminales", category: "Seguridad", condition: "GOOD", currentValue: "Sin juego reportado", threshold: "Alerta por juego o vibracion", nextAction: "Prueba en ruta.", x: 29, y: 59, view: "left" },
    { key: "transmission", label: "Transmision", category: "Tren motriz", condition: "GOOD", currentValue: "Operativo", threshold: "Alerta por fuga, golpe o ruido", nextAction: "Inspeccion por kilometraje.", x: 44, y: 55, view: "left" },
    { key: "differential", label: "Diferencial / ejes", category: "Tren motriz", condition: "GOOD", currentValue: "Sin fuga", threshold: "Alerta por temperatura o fuga", nextAction: "Revisar nivel y retenedores.", x: 57, y: 60, view: "left" },
    { key: "fuel-tank", label: "Tanque de combustible", category: "Combustible", condition: "GOOD", currentValue: "Sin fuga", threshold: "Alerta por consumo anormal o fuga", nextAction: "Cruzar con tanqueos.", x: 51, y: 49, view: "right" },
    { key: "def-system", label: "Sistema DEF / AdBlue", category: "Emisiones", condition: "GOOD", currentValue: "Nivel OK", threshold: "Alerta por cristalizacion o bajo nivel", nextAction: "Revisar calidad y consumo.", x: 43, y: 54, view: "right" },
    { key: "battery", label: "Bateria y alternador", category: "Electrico", condition: "GOOD", currentValue: "Voltaje en rango", threshold: "Alerta < 12.2V", nextAction: "Medir voltaje semanal.", x: 38, y: 43, view: "right" },
    { key: "starter", label: "Arranque y cableado principal", category: "Electrico", condition: "GOOD", currentValue: "Sin novedad", threshold: "Alerta por caida de voltaje", nextAction: "Revisar bornes y tierra.", x: 31, y: 47, view: "right" },
    { key: "front-lights", label: "Luces frontales y direccionales", category: "Seguridad vial", condition: "GOOD", currentValue: "Aprobado", threshold: "Bloquear si luces criticas fallan", nextAction: "Validar en checklist.", x: 11, y: 39, view: "left" },
    { key: "rear-lights", label: "Luces traseras y stop", category: "Seguridad vial", condition: "GOOD", currentValue: "Aprobado", threshold: "Bloquear si stop/direccional falla", nextAction: "Validar antes de despacho nocturno.", x: 50, y: 63, view: "rear" },
    { key: "reverse-alarm", label: "Alarma de reversa / camara", category: "Seguridad vial", condition: "GOOD", currentValue: "Operativo", threshold: "Alerta si no emite senal", nextAction: "Probar en patio.", x: 50, y: 48, view: "rear" },
    { key: "mirrors", label: "Espejos y puntos ciegos", category: "Cabina", condition: "GOOD", currentValue: "Alineados", threshold: "Alerta por espejo roto o sensor fallando", nextAction: "Validar antes de salida.", x: 22, y: 24, view: "left" },
    { key: "windshield-wipers", label: "Parabrisas y plumillas", category: "Cabina", condition: "GOOD", currentValue: "Sin novedad", threshold: "Alerta por fisura o barrido deficiente", nextAction: "Cambiar plumillas si deja rastro.", x: 18, y: 18, view: "left" },
    { key: "body-side", label: trailerType ? `Lateral de ${trailerType}` : "Carroceria lateral", category: "Carroceria", condition: "GOOD", currentValue: "Estructura vigente", threshold: "Alerta por fisura, golpe o filtracion", nextAction: "Inspeccion visual.", x: 70, y: 36, view: "left" },
    { key: "rear-doors", label: "Puertas traseras / chapas", category: "Carroceria", condition: "GOOD", currentValue: "Cierre vigente", threshold: "Alerta por chapa, bisagra o sello", nextAction: "Validar cierre y precinto.", x: 50, y: 33, view: "rear" },
    { key: "bumper-mudflaps", label: "Defensa, guardabarros y salpicaderas", category: "Carroceria", condition: "GOOD", currentValue: "Sin desprendimiento", threshold: "Alerta por pieza suelta o cortante", nextAction: "Reparar antes de ruta larga.", x: 50, y: 76, view: "rear" },
    { key: "roof-seals", label: "Techo, sellos y filtraciones", category: "Carroceria", condition: "GOOD", currentValue: "Sin filtracion", threshold: "Alerta por humedad o sello vencido", nextAction: "Inspeccion en lavado o lluvia.", x: 61, y: 34, view: "top" },
    { key: "cargo-floor", label: "Piso de carga", category: "Carroceria", condition: "GOOD", currentValue: "Sin fisura", threshold: "Alerta por tabla rota, corrosion o desnivel", nextAction: "Inspeccion al descargar.", x: 66, y: 55, view: "top" },
  ];

  if (refrigerated) {
    seeds.push(
      { key: "reefer-unit", label: "Unidad de refrigeracion", category: "Cadena de frio", condition: "WARNING", currentValue: "Temperatura por validar", threshold: "Alerta por desviacion de temperatura", nextAction: "Validar preenfriado, sellos y sensor.", x: 58, y: 18, view: "top" },
      { key: "reefer-evaporator", label: "Evaporador / ventiladores", category: "Cadena de frio", condition: "GOOD", currentValue: "Flujo OK", threshold: "Alerta por bloqueo o ruido", nextAction: "Limpiar y revisar ventiladores.", x: 74, y: 29, view: "top" },
      { key: "temperature-probe", label: "Sonda de temperatura", category: "Cadena de frio", condition: "GOOD", currentValue: "Sensor activo", threshold: "Alerta por desviacion o desconexion", nextAction: "Comparar contra termometro patron.", x: 77, y: 45, view: "top" },
    );
  }

  if (vehicleClass === "TRACTOR" || trailerType) {
    seeds.push(
      { key: "coupling", label: "Quinta rueda / acople", category: "Acople", condition: "GOOD", currentValue: "Bloqueo vigente", threshold: "Bloquear si hay holgura o seguro incompleto", nextAction: "Prueba de acople antes de despacho.", x: 48, y: 45, view: "top" },
      { key: "kingpin", label: "King pin y plato", category: "Acople", condition: "GOOD", currentValue: "Sin holgura", threshold: "Bloquear por desgaste o fisura", nextAction: "Engrasar y validar seguro.", x: 55, y: 45, view: "top" },
      { key: "landing-gear", label: "Patas de apoyo del trailer", category: "Acople", condition: "GOOD", currentValue: "Operativas", threshold: "Alerta por manivela o zapata danada", nextAction: "Lubricar y probar carga.", x: 61, y: 68, view: "left" },
      { key: "air-electrical-lines", label: "Mangueras de aire y linea electrica", category: "Acople", condition: "GOOD", currentValue: "Conectadas", threshold: "Bloquear por fuga, roce o cable cortado", nextAction: "Validar espirales y conectores.", x: 53, y: 33, view: "left" },
    );
  }

  if (String(trailerType ?? "").toLowerCase().includes("carpa")) {
    seeds.push(
      { key: "tarp", label: "Carpa / lona", category: "Carroceria", condition: "GOOD", currentValue: "Sin rotura", threshold: "Alerta por rasgadura o filtracion", nextAction: "Reparar antes de cargar.", x: 73, y: 25, view: "left" },
      { key: "tarp-tensioners", label: "Tensores y amarres", category: "Carroceria", condition: "GOOD", currentValue: "Completos", threshold: "Alerta por tensor faltante", nextAction: "Validar en cargue.", x: 77, y: 50, view: "left" },
    );
  }

  return seeds;
}

export async function syncVehicleComponents({
  vehicleId,
  companyId,
  wheelCount,
  refrigerated,
  vehicleClass,
  trailerType,
}: {
  vehicleId: string;
  companyId: string;
  wheelCount: number;
  refrigerated: boolean;
  vehicleClass: string;
  trailerType?: string;
}) {
  const seeds = buildVehicleComponentSeeds({ wheelCount, refrigerated, vehicleClass, trailerType });
  await prisma.$transaction(
    seeds.map((seed) =>
      prisma.transportVehicleComponent.upsert({
        where: { vehicleId_componentKey: { vehicleId, componentKey: seed.key } },
        update: {
          label: seed.label,
          category: seed.category,
          side: seed.side,
          threshold: seed.threshold,
          nextAction: seed.nextAction,
          x: seed.x,
          y: seed.y,
          view: seed.view ?? "diagonal",
          nextDueKm: seed.nextDueKm,
        },
        create: {
          companyId,
          vehicleId,
          componentKey: seed.key,
          label: seed.label,
          category: seed.category,
          side: seed.side,
          condition: seed.condition ?? "GOOD",
          currentValue: seed.currentValue,
          threshold: seed.threshold,
          nextAction: seed.nextAction,
          x: seed.x,
          y: seed.y,
          view: seed.view ?? "diagonal",
          nextDueKm: seed.nextDueKm,
        },
      }),
    ),
  );
}
