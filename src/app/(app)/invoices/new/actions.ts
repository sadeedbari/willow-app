"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

export async function createInvoice(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin" && staff.role !== "billing_admin") {
    redirect("/invoices");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      practice_id: staff.practiceId,
      client_id: formData.get("clientId") as string,
      issued_by_staff_id: staff.id,
      due_date: (formData.get("dueDate") as string) || null,
      notes: (formData.get("notes") as string) || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/invoices/new?error=${encodeURIComponent(error?.message ?? "Could not create invoice")}`);
  }

  redirect(`/invoices/${data.id}`);
}
