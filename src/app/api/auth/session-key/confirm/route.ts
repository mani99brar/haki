import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";

const YELLOW_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";

export async function POST(req: NextRequest) {
  try {
    const { reqArray, sig } = await req.json();

    if (!reqArray || !sig?.[0]) {
      return NextResponse.json(
        { error: "Missing request array or signature" },
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
        
        const envelope = { req: reqArray, sig: sig };
        console.log("🟡 Sending auth_verify to Yellow...");
        console.log("Envelope:", JSON.stringify(envelope));
        ws.send(JSON.stringify(envelope));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data.toString());
          console.log("📥 Yellow response:", JSON.stringify(msg, null, 2));

          const inner = msg.res;
          if (!Array.isArray(inner)) return;

          const [, method, result] = inner;

          if (method === "auth_verify") {
            console.log("✅ auth_verify SUCCESS!");
            cleanup();
            resolve(
              NextResponse.json({
                success: true,
                jwt: result.jwt_token,
                sessionKey: result.session_key,
                address: result.address,
              }),
            );
          }

          if (method === "error") {
            console.error("❌ Yellow auth_verify error:", result.error);
            cleanup();
            resolve(
              NextResponse.json(
                {
                  error: "Authentication failed",
                  yellowError: result.error,
                },
                { status: 401 },
              ),
            );
          }
        } catch (err) {
          console.error("❌ Failed to parse Yellow response:", err);
          cleanup();
          resolve(
            NextResponse.json(
              { error: "Failed to parse response" },
              { status: 502 },
            ),
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
