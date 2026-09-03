"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import sharp from "sharp";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const IMAGE_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Photographed/scanned documents (e.g. an insurance card) get re-compressed
// like the practice logo, but far less aggressively -- 2000px keeps small
// print legible, and quality 85 avoids the text-ringing artifacts a lower
// JPEG quality would introduce around fine print. PDFs and Word docs pass
// through untouched: sharp is an image library and can't compress them,
// and real PDF compression needs a system binary (Ghostscript) or a paid
// API, which isn't part of this app -- see the willow-app-scope memory
// note from 2026-09-03 for why that was deliberately deferred.
async function compressIfImage(file: File): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  const original = Buffer.from(await file.arrayBuffer());
  if (!IMAGE_DOCUMENT_TYPES.includes(file.type)) {
    return { buffer: original, contentType: file.type, fileName: file.name };
  }

  try {
    const compressed = await sharp(original)
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    if (compressed.length < original.length) {
      const fileName = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
      return { buffer: compressed, contentType: "image/jpeg", fileName };
    }
  } catch {
    // Fall through to storing the original -- an unreadable/corrupt image
    // shouldn't block the upload when compression is just an optimization.
  }
  return { buffer: original, contentType: file.type, fileName: file.name };
}

function canManageDocuments(role: string) {
  return role === "practice_admin" || role === "front_desk" || role === "clinician";
}

export async function uploadClientDocument(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (!canManageDocuments(staff.role)) {
    redirect(`/clients/${clientId}?tab=documents`);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/clients/${clientId}?tab=documents&error=${encodeURIComponent("Choose a file to upload.")}`);
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    redirect(`/clients/${clientId}?tab=documents&error=${encodeURIComponent("File must be 10 MB or smaller.")}`);
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    redirect(`/clients/${clientId}?tab=documents&error=${encodeURIComponent("File must be a PDF, Word document, or image (JPEG/PNG/WEBP).")}`);
  }

  const { buffer, contentType, fileName } = await compressIfImage(file);

  const supabase = await createClient();
  const storagePath = `${staff.practiceId}/${clientId}/${crypto.randomUUID()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("client-documents")
    .upload(storagePath, buffer, { contentType });

  if (uploadError) {
    redirect(`/clients/${clientId}?tab=documents&error=${encodeURIComponent(friendlyErrorMessage(uploadError, "Could not upload file"))}`);
  }

  const { error } = await supabase.from("client_documents").insert({
    practice_id: staff.practiceId,
    client_id: clientId,
    uploaded_by_staff_id: staff.id,
    file_name: fileName,
    storage_path: storagePath,
    file_size_bytes: buffer.length,
    content_type: contentType,
  });

  if (error) {
    await supabase.storage.from("client-documents").remove([storagePath]);
    redirect(`/clients/${clientId}?tab=documents&error=${encodeURIComponent(friendlyErrorMessage(error, "Could not save file"))}`);
  }

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=documents`);
}

export async function deleteClientDocument(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;
  const documentId = formData.get("documentId") as string;

  if (staff.role !== "practice_admin") {
    redirect(`/clients/${clientId}?tab=documents`);
  }

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("client_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (doc) {
    await supabase.storage.from("client-documents").remove([doc.storage_path]);
    await supabase.from("client_documents").delete().eq("id", documentId);
  }

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?tab=documents`);
}
