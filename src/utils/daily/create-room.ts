// Best-effort, like sendEmail() -- a failed or unconfigured Daily account
// must never block appointment creation, so this never throws. Returns the
// room URL on success, null if the practice hasn't configured Daily yet or
// the request failed.
export async function createDailyRoom({
  apiKey,
  name,
  expiresAt,
}: {
  apiKey: string | null;
  name: string;
  expiresAt: Date;
}): Promise<string | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        properties: {
          exp: Math.floor(expiresAt.getTime() / 1000),
        },
      }),
    });

    if (!res.ok) {
      console.error("Daily room creation failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.url ?? null;
  } catch (err) {
    console.error("Daily room creation threw:", err);
    return null;
  }
}
