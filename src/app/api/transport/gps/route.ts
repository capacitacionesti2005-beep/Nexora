import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const fallbackToken = "nexora-demo-gps-2026";

type GpsPayload = {
  plate?: string;
  driver?: string;
  orderId?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  speed?: number;
  bearing?: number;
  battery?: number;
  recordedAt?: string;
};

function assertGpsToken(request: NextRequest) {
  const expected = process.env.TRANSPORT_GPS_TOKEN ?? fallbackToken;
  const token = request.headers.get("x-nexora-gps-token") ?? request.nextUrl.searchParams.get("token");
  return token === expected;
}

async function ensureGpsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS transport_gps_ping (
      id TEXT PRIMARY KEY,
      plate TEXT NOT NULL,
      driver TEXT,
      order_id TEXT,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION,
      speed DOUBLE PRECISION,
      bearing DOUBLE PRECISION,
      battery INTEGER,
      recorded_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS transport_gps_ping_plate_recorded_idx ON transport_gps_ping (plate, recorded_at DESC);");
}

export async function POST(request: NextRequest) {
  if (!assertGpsToken(request)) return NextResponse.json({ error: "Token GPS invalido" }, { status: 401 });

  const payload = (await request.json()) as GpsPayload;
  const plate = payload.plate?.trim().toUpperCase();
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);

  if (!plate || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "plate, latitude y longitude son requeridos" }, { status: 400 });
  }

  await ensureGpsTable();

  const recordedAt = payload.recordedAt ? new Date(payload.recordedAt) : new Date();
  await prisma.$executeRaw`
    INSERT INTO transport_gps_ping (
      id, plate, driver, order_id, latitude, longitude, accuracy, speed, bearing, battery, recorded_at
    ) VALUES (
      ${crypto.randomUUID()},
      ${plate},
      ${payload.driver ?? null},
      ${payload.orderId ?? null},
      ${latitude},
      ${longitude},
      ${payload.accuracy ?? null},
      ${payload.speed ?? null},
      ${payload.bearing ?? null},
      ${payload.battery ?? null},
      ${recordedAt}
    );
  `;

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  if (!assertGpsToken(request)) return NextResponse.json({ error: "Token GPS invalido" }, { status: 401 });

  await ensureGpsTable();

  const rows = await prisma.$queryRaw<Array<{
    plate: string;
    driver: string | null;
    order_id: string | null;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    bearing: number | null;
    battery: number | null;
    recorded_at: Date;
  }>>`
    SELECT DISTINCT ON (plate)
      plate, driver, order_id, latitude, longitude, accuracy, speed, bearing, battery, recorded_at
    FROM transport_gps_ping
    ORDER BY plate, recorded_at DESC
    LIMIT 100;
  `;

  return NextResponse.json({
    vehicles: rows.map((row) => ({
      plate: row.plate,
      driver: row.driver,
      orderId: row.order_id,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy,
      speed: row.speed,
      bearing: row.bearing,
      battery: row.battery,
      recordedAt: row.recorded_at.toISOString(),
    })),
  });
}
