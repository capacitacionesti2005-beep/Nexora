import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const location = await prisma.location.findFirst({
    where: { id, companyId: user.companyId },
    select: { id: true },
  });

  if (!location) return new Response("Not found", { status: 404 });

  const origin = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const scanUrl = `${origin}/locations/${location.id}/scan`;
  const svg = await QRCode.toString(scanUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 360,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  return new Response(svg, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
