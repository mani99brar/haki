import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { marketId, optionId, shares } = await req.json();
  console.log(marketId, optionId, shares);

  if (!marketId || !optionId || typeof shares !== "number") {
    return NextResponse.json(
      { error: "marketId, optionId, and shares are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "preview_trade_cost",
    {
      p_market: marketId,
      p_option: optionId,
      p_shares_delta: shares,
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    cost: data,
    avgPrice: shares !== 0 ? Number(data) / shares : null,
  });
}
