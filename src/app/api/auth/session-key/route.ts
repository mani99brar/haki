import { NextRequest, NextResponse } from "next/server";

const YELLOW_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";

export async function POST(req: NextRequest) {
  const { address, sessionKey, signature } = await req.json();

  if (!address || !sessionKey || !signature) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  return new Promise<NextResponse>((resolve) => {
    const ws = new WebSocket(YELLOW_WS_URL);

    const authPayload = {
      req: [
        1,
        "auth_request",
        {
          address,
          session_key: sessionKey,
          application: "YellowApp",
          allowances: [],
          scope: "",
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        },
        Date.now(),
      ],
      sig: [signature],
    };

    const timeout = setTimeout(() => {
      ws.close();
      resolve(
        NextResponse.json({ error: "Yellow WS timeout" }, { status: 504 }),
      );
    }, 7_000);

    ws.onopen = () => {
      ws.send(JSON.stringify(authPayload));
    };

    ws.onmessage = (event) => {
      clearTimeout(timeout);

      try {
        const msg = JSON.parse(event.data);

        // Successful auth_request response
        if (msg.res?.[1] === "auth_request") {
          ws.close();

          const res = NextResponse.json({ success: true });

          res.cookies.set({
            name: "yellow_session",
            value: sessionKey,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60,
          });

          resolve(res);
          return;
        }

        ws.close();
        resolve(
          NextResponse.json(
            { error: "Auth rejected", details: msg },
            { status: 401 },
          ),
        );
      } catch (err) {
        ws.close();
        resolve(
          NextResponse.json(
            { error: "Invalid Yellow response" },
            { status: 500 },
          ),
        );
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      ws.close();
      resolve(NextResponse.json({ error: "Yellow WS error" }, { status: 502 }));
    };
  });
}
