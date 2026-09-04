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
      return json(response, 500, { error: "Shared account service is not configured." });
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const action = String(body.action || "");
    const loginId = String(body.loginId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const passwordHash = String(body.passwordHash || "");

    if (!loginId || !passwordHash || (action === "create" && !email)) {
      return json(response, 400, { error: "Login ID, email, and password are required." });
    }

    const key = `ganpati:account:${loginId.toLowerCase()}`;
    const existingResult = await redis(["GET", key]);
    const existing = existingResult.result ? JSON.parse(existingResult.result) : null;

    if (action === "create") {
      if (existing) return json(response, 409, { error: "This login ID already exists." });
      const account = { loginId, email, passwordHash };
      await redis(["SET", key, JSON.stringify(account)]);
      return json(response, 200, { account });
    }

    if (!existing || existing.passwordHash !== passwordHash || (existing.email && existing.email !== email)) {
      return json(response, 401, { error: "Incorrect login ID, email, or password." });
    }

    return json(response, 200, { account: existing });
  } catch {
    return json(response, 500, { error: "Shared account service is unavailable." });
  }
}