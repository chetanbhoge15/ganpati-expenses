import { createHash } from "node:crypto";

function json(response, status, body) {
  return response.status(status).json(body);
}

async function redis(command) {
  const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });

  if (!response.ok) throw new Error("Redis request failed");
  return response.json();
}

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed" });

  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return json(response, 500, { error: "OTP service is not configured. Add the Redis environment variables." });
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const { loginId, email, otp } = body;
    const normalizedLoginId = String(loginId || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedOtp = String(otp || "").trim();

    if (!normalizedLoginId || !normalizedEmail || !/^\d{6}$/.test(normalizedOtp)) {
      return json(response, 400, { error: "Login ID, email, and a 6-digit OTP are required." });
    }

    const result = await redis(["GET", `ganpati:otp:${normalizedLoginId}`]);
    const challenge = result.result ? JSON.parse(result.result) : null;

    if (!challenge || challenge.email !== normalizedEmail || challenge.codeHash !== createHash("sha256").update(normalizedOtp).digest("hex")) {
      return json(response, 401, { error: "Invalid or expired OTP." });
    }

    await redis(["DEL", `ganpati:otp:${normalizedLoginId}`]);
    return json(response, 200, { message: "OTP verified." });
  } catch {
    return json(response, 500, { error: "OTP service is not configured." });
  }
}