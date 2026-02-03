import { NextRequest, NextResponse } from "next/server";

const YELLOW_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";

export async function POST(req: NextRequest) {
  const { address, sessionKey } = await req.json();

  return new Promise<NextResponse>((resolve) => {
    const ws = new WebSocket(YELLOW_WS_URL);

    const payload = {
      req: [
        1,
        "auth_request",
        {
          address,
          session_key: sessionKey,
          application: "YellowApp",
          allowances: [],
          scope: "",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
        Date.now(),
      ],
    };

    ws.onopen = () => ws.send(JSON.stringify(payload));

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      ws.close();

      // ClearNode sends challenge here
      if (msg.res?.[1] === "auth_challenge") {
        resolve(NextResponse.json(msg.res[2]));
        return;
      }

      resolve(
        NextResponse.json(
          { error: "Unexpected response", msg },
          { status: 400 },
        ),
      );
    };
  });
}
