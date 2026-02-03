import { NextRequest, NextResponse } from "next/server";

const YELLOW_WS_URL = "wss://clearnet-sandbox.yellow.com/ws";

export async function POST(req: NextRequest) {
  const { signature, challengeId } = await req.json();

  return new Promise<NextResponse>((resolve) => {
    const ws = new WebSocket(YELLOW_WS_URL);

    const payload = {
      req: [2, "auth_verify", { challenge_id: challengeId }, Date.now()],
      sig: [signature],
    };

    ws.onopen = () => ws.send(JSON.stringify(payload));

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      ws.close();

      if (msg.res?.[1] === "auth_verify") {
        const res = NextResponse.json({ success: true });

        res.cookies.set({
          name: "yellow_session",
          value: msg.res[2].jwt,
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        });

        resolve(res);
        return;
      }

      resolve(
        NextResponse.json(
          { error: "Verification failed", msg },
          { status: 401 },
        ),
      );
    };
  });
}
