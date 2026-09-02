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
};

// Returns false (rather than throwing) on any failure -- missing email,
// send failure -- so the caller can show the practitioner a real result
// instead of assuming an explicit "Resend" click worked.
export async function sendInvoiceEmail(details: InvoiceEmailDetails): Promise<boolean> {
  if (!details.clientEmail) return false;

  const invoiceLabel = `INV-${String(details.invoiceNumber).padStart(4, "0")}`;
  const balanceLine =
    details.status === "paid"
      ? `<p>This invoice has been paid in full. This copy is for your records.</p>`
      : details.status === "void"
        ? `<p>This invoice has been voided and does not require payment.</p>`
        : `<p><strong>Balance due:</strong> ${formatMoney(details.balanceCents)}</p>`;

  return sendEmail({
    to: details.clientEmail,
    subject: `Invoice ${invoiceLabel} from ${details.practiceName}`,
    html: `
      <p>Hi ${details.clientName},</p>
      <p>Please find attached your invoice ${invoiceLabel} from ${details.practiceName}.</p>
      <p><strong>Total:</strong> ${formatMoney(details.totalCents)}</p>
      ${balanceLine}
      <p>This invoice may be submitted to your insurance provider for reimbursement of eligible expenses.</p>
    `,
    attachments: [{ filename: `${invoiceLabel}.pdf`, content: details.pdfBuffer }],
  });
}
