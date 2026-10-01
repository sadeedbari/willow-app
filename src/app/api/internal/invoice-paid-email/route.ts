import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { buildInvoicePdf } from "@/app/(app)/invoices/[id]/pdf/build";
import { sendInvoiceEmail } from "@/utils/invoice-email";

// Triggered by the stripe-webhook Supabase Edge Function right after it marks
// an invoice paid -- PDF rendering (@react-pdf/renderer) needs a Node runtime,
// which the Deno edge function doesn't have, so it calls back into the
// Next.js app to build the PDF and send the "paid" receipt instead of doing
// either itself. Auth is the service-role key rather than a separate secret --
// the edge function already has it (auto-injected by the platform), so this
// needs no extra manual setup, and it's already trusted at this level
// elsewhere in the app.
export async function POST(request: Request) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { invoiceId } = await request.json();
  if (!invoiceId) {
    return new Response("Missing invoiceId", { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const built = await buildInvoicePdf(supabase, invoiceId);

  if (built?.clientEmail) {
    await sendInvoiceEmail({
      clientEmail: built.clientEmail,
      clientName: built.clientFullName,
      practiceName: built.practiceName,
      practiceLogoUrl: built.practiceLogoUrl,
      invoiceNumber: built.invoiceNumber,
      invoiceLabel: built.invoiceLabel,
      status: built.status,
      totalCents: built.totalCents,
      balanceCents: built.totalCents - built.amountPaidCents,
      pdfBuffer: built.pdfBuffer,
      paymentToken: built.paymentToken,
    });
  }

  return Response.json({ ok: true });
}
