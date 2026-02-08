import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";

const YELLOW_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";

export async function POST(req: NextRequest) {
  try {
    const { req: requestPayload } = await req.json();

    if (!requestPayload || !Array.isArray(requestPayload)) {
      return NextResponse.json(
        { error: "Invalid payload format" },
        { status: 400 },
      );
    }

    return await new Promise<NextResponse>((resolve) => {
      const ws = new WebSocket(YELLOW_WS_URL);
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) ws.terminate();
        resolve(
          NextResponse.json({ error: "Yellow Node timeout" }, { status: 504 }),
        );
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeout);
        if (ws.readyState !== WebSocket.CLOSED) ws.close();
      };

      ws.onopen = () => {
        console.log("🟡 Sending auth_request to Yellow...");
        ws.send(JSON.stringify({ req: requestPayload }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data.toString());
          const inner = msg.res || msg.req;
          if (!Array.isArray(inner)) return;

          const [id, method, result] = inner;

          if (method === "auth_challenge") {
            console.log("✅ Received challenge from Yellow");
            cleanup();
            resolve(
              NextResponse.json({
                status: "challenge_required",
                challenge: result.challenge_message,
                requestId: id,
                timestamp: Date.now(),
              }),
            );
          }

          if (method === "error") {
            console.error("❌ Yellow error:", result.error);
            cleanup();
            resolve(
              NextResponse.json(
                { error: `Yellow: ${result.error}` },
                { status: 401 },
              ),
            );
          }
        } catch (err) {
          console.error("❌ Failed to parse Yellow response:", err);
          cleanup();
          resolve(
            NextResponse.json({ error: "Malformed response" }, { status: 502 }),
          );
        }
      };

      ws.onerror = (err) => {
        console.error("❌ WebSocket error:", err);
        cleanup();
        resolve(
          NextResponse.json(
            { error: "WebSocket connection failed" },
            { status: 502 },
          ),
        );
      };
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
