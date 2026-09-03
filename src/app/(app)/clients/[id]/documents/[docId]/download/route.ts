import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { docId } = await params;
  const supabase = await createClient();

  // RLS scopes this to the requester's own practice -- a staff member from
  // another practice gets no row back here, same as any other query.
  const { data: doc } = await supabase
    .from("client_documents")
    .select("storage_path, file_name")
    .eq("id", docId)
    .single();

  if (!doc) notFound();

  const { data, error } = await supabase.storage
    .from("client-documents")
    .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });

  if (error || !data) notFound();

  return Response.redirect(data.signedUrl);
}
