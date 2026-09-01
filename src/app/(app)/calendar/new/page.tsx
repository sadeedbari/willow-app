import { redirect } from "next/navigation";

function mondayOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export default async function NewAppointmentRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clientId?: string; date?: string; time?: string; staffId?: string }>;
}) {
  const { error, clientId, date, time, staffId } = await searchParams;

  const targetDate = date ?? new Date().toISOString().slice(0, 10);
  const week = mondayOf(new Date(`${targetDate}T00:00:00`)).toISOString().slice(0, 10);

  const params = new URLSearchParams({ week, new: "1", date: targetDate, time: time ?? "14:00" });
  if (clientId) params.set("clientId", clientId);
  if (staffId) params.set("staffId", staffId);
  if (error) params.set("error", error);

  redirect(`/calendar?${params.toString()}`);
}
