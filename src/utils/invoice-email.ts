import { sendEmail } from "@/utils/resend/send";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)} CAD`;
}

export type InvoiceEmailDetails = {
  clientEmail: string | null;
  clientName: string;
  practiceName: string;
  invoiceNumber: number;
  status: string;
  totalCents: number;
  balanceCents: number;
  pdfBuffer: Buffer;
  paymentToken: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Returns false (rather than throwing) on any failure -- missing email,
// send failure -- so the caller can show the practitioner a real result
// instead of assuming an explicit "Resend" click worked.
export async function sendInvoiceEmail(details: InvoiceEmailDetails): Promise<boolean> {
  if (!details.clientEmail) return false;

  const invoiceLabel = `INV-${String(details.invoiceNumber).padStart(4, "0")}`;
  const owesBalance = details.status !== "paid" && details.status !== "void" && details.balanceCents > 0;
  const paymentUrl = `${SITE_URL}/pay/${details.paymentToken}`;
  const balanceLine = details.status === "paid"
    ? `<p>This invoice has been paid in full. This copy is for your records.</p>`
    : details.status === "void"
      ? `<p>This invoice has been voided and does not require payment.</p>`
      : `<p><strong>Balance due:</strong> ${formatMoney(details.balanceCents)}</p>`;
  const payButton = owesBalance
    ? `<p><a href="${paymentUrl}" style="display:inline-block;background:#1a7f5a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Pay online</a></p>`
    : "";

  return sendEmail({
    to: details.clientEmail,
    subject: `Invoice ${invoiceLabel} from ${details.practiceName}`,
    html: `
      <p>Hi ${details.clientName},</p>
      <p>Please find attached your invoice ${invoiceLabel} from ${details.practiceName}.</p>
      <p><strong>Total:</strong> ${formatMoney(details.totalCents)}</p>
      ${balanceLine}
      ${payButton}
      <p>This invoice may be submitted to your insurance provider for reimbursement of eligible expenses.</p>
    `,
    attachments: [{ filename: `${invoiceLabel}.pdf`, content: details.pdfBuffer }],
  });
}
