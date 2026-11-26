/** @format */

import { NextResponse } from "next/server";
import { getAudioInfo } from "@/lib/audio";

// GET /api/audio-info?reciter=humaid&surah=2
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reciter = searchParams.get("reciter") ?? "";
  const surah = Number(searchParams.get("surah"));

  if (!Number.isInteger(surah) || surah < 1 || surah > 114) {
    return NextResponse.json({ error: "Invalid surah" }, { status: 400 });
  }

  try {
    const info = await getAudioInfo(reciter, surah);
    if (!info)
      return NextResponse.json({ error: "Unknown reciter" }, { status: 404 });
    return NextResponse.json(info);
  } catch {
    return NextResponse.json({ available: false }, { status: 502 });
  }
}
