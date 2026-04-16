import { NextResponse } from "next/server";

// Sensor validation ranges (physical limits)
const SENSOR_RANGES = {
  pm25: { min: 0, max: 1000 },
  pm10: { min: 0, max: 2000 },
  co: { min: 0, max: 100 },
  voc: { min: 0, max: 50 },
  suhu: { min: -10, max: 60 },
} as const;

type SensorField = keyof typeof SENSOR_RANGES;

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates a single sensor field value.
 * Returns an error message if invalid, or null if valid.
 */
function validateSensorField(
  field: SensorField,
  value: unknown,
): string | null {
  if (value === null || value === undefined) {
    return `${field} is required`;
  }

  const num = Number(value);

  if (!isFinite(num) || isNaN(num)) {
    return `${field} must be a finite number`;
  }

  const { min, max } = SENSOR_RANGES[field];
  if (num < min || num > max) {
    return `${field} must be between ${min} and ${max}`;
  }

  return null;
}

export async function POST(request: Request) {
  // Parse request body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  // Validate all sensor fields
  const validationErrors: ValidationError[] = [];
  const fields: SensorField[] = ["pm25", "pm10", "co", "voc", "suhu"];

  for (const field of fields) {
    const error = validateSensorField(field, body[field]);
    if (error) {
      validationErrors.push({ field, message: error });
    }
  }

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Invalid sensor values", details: validationErrors },
      { status: 422 },
    );
  }

  // Read Python ML service URL from environment — never expose this value in responses
  const mlServiceUrl = process.env.PYTHON_ML_SERVICE_URL;
  if (!mlServiceUrl) {
    return NextResponse.json(
      { error: "ML service not configured" },
      { status: 503 },
    );
  }

  // Forward validated request to Python service with 5-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const pythonResponse = await fetch(`${mlServiceUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pm25: Number(body.pm25),
        pm10: Number(body.pm10),
        co: Number(body.co),
        voc: Number(body.voc),
        suhu: Number(body.suhu),
      }),
      signal: controller.signal,
    });

    if (!pythonResponse.ok) {
      return NextResponse.json(
        { error: "ML service unavailable" },
        { status: 503 },
      );
    }

    const data = await pythonResponse.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || controller.signal.aborted)
    ) {
      return NextResponse.json(
        { error: "ML service timeout" },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "ML service unavailable" },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
