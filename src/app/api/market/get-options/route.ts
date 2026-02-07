import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { marketLabel } = await req.json();

  if (!marketLabel) {
    return NextResponse.json(
      { error: "marketLabel is required" },
      { status: 400 },
    );
  }
  console.log(marketLabel);
  // 1. Resolve the label to the UUID marketId
  const { data: market, error: labelError } = await supabase
    .from("markets")
    .select("id")
    .eq("question", marketLabel) // Adjust this column name if your label is stored elsewhere
    .single();
  console.log(labelError);
  const { data, error } = await supabase.rpc("get_market_options", {
    p_market: market?.id,
  });

  const { data: volumeData, error: volumeError } = await supabase.rpc(
    "get_market_total_volume",
    {
      p_market_id: market?.id,
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    marketId: market?.id,
    options: data,
    volume: volumeData,
  });
}
