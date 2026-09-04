import { createHash, randomInt } from "node:crypto";

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
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return json(response, 500, { error: "OTP service is not configured. Add the Redis and Resend environment variables." });
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const { loginId, email } = body;
    const normalizedLoginId = String(loginId || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedLoginId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return json(response, 400, { error: "Valid login ID and email are required." });
    }

    const code = String(randomInt(100000, 1000000));
    const challenge = JSON.stringify({
      email: normalizedEmail,
      codeHash: createHash("sha256").update(code).digest("hex")
    });

    await redis(["SET", `ganpati:otp:${normalizedLoginId}`, challenge, "EX", "600"]);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [normalizedEmail],
        subject: "Ganpati Accounts password reset code",
        text: `Your password reset code is ${code}. It expires in 10 minutes.`
      })
    });

    if (!emailResponse.ok) return json(response, 502, { error: "Unable to send OTP email." });
    return json(response, 200, { message: "OTP sent." });
  } catch {
    return json(response, 500, { error: "OTP service is not configured." });
  }
}
