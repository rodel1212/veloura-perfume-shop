
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expectedToken = process.env.MESSENGER_VERIFY_TOKEN;

  if (
    mode === "subscribe" &&
    expectedToken &&
    token === expectedToken &&
    challenge
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { error: "Verification failed" },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object !== "page" || !Array.isArray(body.entry)) {
      return NextResponse.json({ received: false }, { status: 404 });
    }

    for (const entry of body.entry) {
      if (!Array.isArray(entry.messaging)) continue;

      for (const event of entry.messaging) {
        const senderId = event.sender?.id;

        if (senderId && (event.message || event.postback)) {
          // Temporary test logging. Do not log message content or tokens.
          console.log("Messenger test sender ID:", senderId);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }
}
