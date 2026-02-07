import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { marketId } = await req.json();

  if (!marketId) {
    return NextResponse.json(
      { error: "marketId is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc(
    "get_market_options",
    { p_market: marketId },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ options: data });
}
