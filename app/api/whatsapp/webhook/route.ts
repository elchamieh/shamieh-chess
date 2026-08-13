import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAcademyAutoReply } from "@/lib/whatsapp";

export const runtime = "nodejs";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "shamieh-chess-meta-verify-2026";
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v25.0";

function verifyMetaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function sendReply(phoneNumberId: string, to: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) {
    console.warn("WhatsApp access token is not configured; reply skipped.");
    return;
  }

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("WhatsApp reply failed", response.status, detail);
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      const phoneNumberId = value?.metadata?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!phoneNumberId) continue;

      for (const message of value?.messages || []) {
        if (message?.type !== "text" || !message?.from || !message?.text?.body) continue;

        const reply = getAcademyAutoReply(message.text.body);
        if (!reply) continue;

        try {
          await sendReply(phoneNumberId, message.from, reply.text);
        } catch (error) {
          console.error("WhatsApp reply error", error);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
