// Best-effort, like sendEmail() -- a failed or unconfigured Daily account
// must never block appointment creation, so this never throws.
//
// Rooms are private with "knocking" enabled: the client's link only lets
// them request entry and wait in a lobby screen until the practitioner
// (who joins with an owner token) is in the call to admit them. The room
// also force-ends for everyone (eject_at_room_exp) a grace period after the
// appointment's scheduled end, regardless of whether anyone remembers to
// hang up.
const GRACE_PERIOD_MINUTES = 15;

export async function createDailyRoomWithAccessLinks({
  apiKey,
  name,
  endsAt,
}: {
  apiKey: string | null;
  name: string;
  endsAt: Date;
}): Promise<{ roomUrl: string; practitionerUrl: string; clientUrl: string } | null> {
  if (!apiKey) return null;

  const exp = Math.floor((endsAt.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000) / 1000);
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const roomRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        privacy: "private",
        properties: { exp, eject_at_room_exp: true, enable_knocking: true },
      }),
    });

    if (!roomRes.ok) {
      console.error("Daily room creation failed:", roomRes.status, await roomRes.text());
      return null;
    }

    const room = await roomRes.json();
    const roomUrl: string | undefined = room.url;
    if (!roomUrl) return null;

    const [practitionerToken, clientToken] = await Promise.all([
      createMeetingToken(headers, name, true, exp),
      createMeetingToken(headers, name, false, exp),
    ]);

    if (!practitionerToken || !clientToken) return null;

    return {
      roomUrl,
      practitionerUrl: `${roomUrl}?t=${practitionerToken}`,
      clientUrl: `${roomUrl}?t=${clientToken}`,
    };
  } catch (err) {
    console.error("Daily room creation threw:", err);
    return null;
  }
}

async function createMeetingToken(
  headers: Record<string, string>,
  roomName: string,
  isOwner: boolean,
  exp: number
): Promise<string | null> {
  try {
    const res = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers,
      body: JSON.stringify({ properties: { room_name: roomName, is_owner: isOwner, exp } }),
    });

    if (!res.ok) {
      console.error("Daily meeting-token creation failed:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.token ?? null;
  } catch (err) {
    console.error("Daily meeting-token creation threw:", err);
    return null;
  }
}
