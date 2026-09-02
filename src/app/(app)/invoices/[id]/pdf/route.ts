import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { buildInvoicePdf } from "./build";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const built = await buildInvoicePdf(supabase, id);
  if (!built) notFound();

  return new Response(new Uint8Array(built.pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="INV-${String(built.invoiceNumber).padStart(4, "0")}.pdf"`,
    },
  });
}
