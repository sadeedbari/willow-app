"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function updateNote(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const noteId = formData.get("noteId") as string;

  const sign = formData.get("intent") === "sign";
  const riskLevel = formData.get("riskLevel") as string;
  const riskNotes = (formData.get("riskNotes") as string) || "";

  if (riskLevel !== "none" && !riskNotes.trim()) {
    redirect(
      `/notes/${noteId}/edit?error=${encodeURIComponent(
        "Describe the risk and safety plan before saving — required whenever risk assessment isn't \"None identified.\""
      )}`
    );
  }

  // RLS also enforces this (update is only permitted while status = 'draft'),
  // but checking here first gives a clear message instead of a silent no-op.
  const { data: existing } = await supabase
    .from("session_notes")
    .select("status")
    .eq("id", noteId)
    .single();

  if (existing?.status !== "draft") {
    redirect(`/notes/${noteId}?error=${encodeURIComponent("This note is signed and locked — add an addendum instead of editing it.")}`);
  }

  const { error } = await supabase
    .from("session_notes")
    .update({
      session_date: formData.get("sessionDate") as string,
      subjective: formData.get("subjective") as string,
      objective: formData.get("objective") as string,
      assessment: formData.get("assessment") as string,
      plan: formData.get("plan") as string,
      risk_level: riskLevel,
      risk_notes: riskNotes || null,
      status: sign ? "signed" : "draft",
      signed_at: sign ? new Date().toISOString() : null,
    })
    .eq("id", noteId)
    .eq("staff_id", staff.id);

  if (error) {
    redirect(`/notes/${noteId}/edit?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect(`/notes/${noteId}`);
}

export async function signNote(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const noteId = formData.get("noteId") as string;

  const { error } = await supabase
    .from("session_notes")
    .update({ status: "signed", signed_at: new Date().toISOString() })
    .eq("id", noteId)
    .eq("staff_id", staff.id);

  if (error) {
    redirect(`/notes/${noteId}?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect(`/notes/${noteId}`);
}

export async function addAddendum(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const noteId = formData.get("noteId") as string;
  const content = (formData.get("content") as string)?.trim();

  if (!content) {
    redirect(`/notes/${noteId}?error=${encodeURIComponent("Addendum can't be empty.")}`);
  }

  const { error } = await supabase.from("session_note_addenda").insert({
    note_id: noteId,
    practice_id: staff.practiceId,
    staff_id: staff.id,
    content,
  });

  if (error) {
    redirect(`/notes/${noteId}?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect(`/notes/${noteId}`);
}
