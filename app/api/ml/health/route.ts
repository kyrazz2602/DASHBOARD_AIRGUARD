import { NextResponse } from "next/server";

export async function GET() {
  // Read Python ML service URL from environment — never expose this value in responses
  const mlServiceUrl = process.env.PYTHON_ML_SERVICE_URL;
  if (!mlServiceUrl) {
    return NextResponse.json(
      { status: "unavailable", reason: "ML service not configured" },
      { status: 503 },
    );
  }

  // Forward health check to Python service with 3-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const pythonResponse = await fetch(`${mlServiceUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!pythonResponse.ok) {
      return NextResponse.json({ status: "unavailable" }, { status: 503 });
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  } finally {
    clearTimeout(timeoutId);
  }
}
