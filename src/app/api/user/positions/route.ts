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
  console.log(wallet, marketId);

  const { data, error } = await supabase.rpc(
    "get_user_positions",
    {
      p_wallet: wallet,
      p_market: marketId,
    },
  );
  console.log("USER POSITIONS", data);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ positions: data });
}
