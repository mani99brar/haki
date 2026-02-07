import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { wallet, question, description } = await req.json();

  if (!wallet || !question) {
    return NextResponse.json(
      { error: "wallet and question required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("markets")
    .insert({
      creator_wallet: wallet,
      question,
      description,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ market: data });
}
