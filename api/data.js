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
      return json(response, 500, { error: "Shared data service is not configured." });
    }

    const body = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
    const loginId = String(body.loginId || "").trim();
    const passwordHash = String(body.passwordHash || "");
    const year = String(body.year || "");
    const type = String(body.type || "");
    const accountResult = await redis(["GET", `ganpati:account:${loginId.toLowerCase()}`]);
    const account = accountResult.result ? JSON.parse(accountResult.result) : null;

    if (!account || account.passwordHash !== passwordHash || !/^\d{4}$/.test(year) || !/^(boys|main|family|visarjan|expenses)$/.test(type)) {
      return json(response, 401, { error: "Not authorized." });
    }

    const key = `ganpati:data:${loginId.toLowerCase()}:${year}:${type}`;

    if (body.action === "get") {
      const result = await redis(["GET", key]);
      return json(response, 200, { data: result.result ? JSON.parse(result.result) : [] });
    }

    if (body.action === "save" && Array.isArray(body.data)) {
      await redis(["SET", key, JSON.stringify(body.data)]);
      return json(response, 200, { message: "Data saved." });
    }

    return json(response, 400, { error: "Invalid data request." });
  } catch {
    return json(response, 500, { error: "Shared data service is unavailable." });
  }
}