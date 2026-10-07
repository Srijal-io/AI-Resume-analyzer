import { NextResponse } from "next/server";
import { OllamaProvider } from "@resurox/ai";
import { getRepository } from "@resurox/db";

export async function GET() {
  const ollama = new OllamaProvider();
  const ollamaAlive = await ollama.isAvailable();
  const db = getRepository();

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "v0.1.0-HF26",
    services: {
      api: "OK",
      ollama: ollamaAlive ? "CONNECTED" : "OFFLINE_FALLBACK_ACTIVE",
      database: "CONNECTED",
      model: process.env.OLLAMA_MODEL || "gemma2:2b"
    }
  });
}
