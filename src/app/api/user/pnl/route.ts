import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { wallet, marketId } = await req.json();

  if (!wallet || !marketId) {
    return NextResponse.json(
      { error: "wallet and marketId are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "get_user_market_pnl",
    {
      p_wallet: wallet,
      p_market: marketId,
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    pnl: data?.[0] ?? null,
  });
}
