import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const {
      marketId,
      optionId,
      shares,
      signedPayload,
      signature,
      wallet,
    } = await req.json();

    // --- Basic validation ---
    if (
      !marketId ||
      !optionId ||
      typeof shares !== "number" ||
      !signedPayload ||
      !signature ||
      !wallet
    ) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    if (shares === 0) {
      return NextResponse.json(
        { error: "shares must be non-zero" },
        { status: 400 },
      );
    }

    /**
     * Optional (recommended later):
     * - verify Yellow session cookie
     * - verify wallet matches session
     */

    // --- Execute trade atomically ---
    const { data, error } = await supabase.rpc(
      "execute_trade",
      {
        p_wallet: wallet,
        p_market: marketId,
        p_option: optionId,
        p_shares_delta: shares,
        p_signed_payload: signedPayload,
        p_signature: signature,
      },
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    /**
     * execute_trade returns:
     * { trade_id, cost, price }
     */
    return NextResponse.json({
      success: true,
      trade: data?.[0],
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
