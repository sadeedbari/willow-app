import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

function mondayOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export default async function AppointmentRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: appt } = await supabase.from("appointments").select("starts_at").eq("id", id).single();

  if (!appt) notFound();

  const week = mondayOf(new Date(appt.starts_at)).toISOString().slice(0, 10);
  redirect(`/calendar?week=${week}&event=${id}`);
}
