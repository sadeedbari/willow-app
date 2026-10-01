import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { buildInvoicePdf } from "./build";
import { formatInvoiceLabel } from "@/utils/invoice-label";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const built = await buildInvoicePdf(supabase, id);
  if (!built) notFound();

  // Sanitized separately from formatInvoiceLabel's display value -- a
  // custom label is free text (e.g. "SG-2026-1"), and this becomes a
  // Content-Disposition filename, which can't safely carry quotes/slashes.
  const safeFilename = formatInvoiceLabel(built.invoiceNumber, built.invoiceLabel).replace(/[^A-Za-z0-9_-]/g, "_");

  return new Response(new Uint8Array(built.pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
    },
  });
}
