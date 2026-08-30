import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  practiceName: { fontSize: 16, fontWeight: 700 },
  muted: { color: "#666", marginTop: 2 },
  invoiceTitle: { fontSize: 16, fontWeight: 700, textAlign: "right" },
  metaRight: { textAlign: "right", color: "#666", marginTop: 2 },
  section: { marginBottom: 18 },
  sectionLabel: { fontSize: 9, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 4 },
  row: { flexDirection: "row" },
  col: { flex: 1 },
  table: { marginTop: 4, borderTop: "1px solid #ddd" },
  tableHeadRow: {
    flexDirection: "row",
    borderBottom: "1px solid #ddd",
    paddingVertical: 6,
    fontWeight: 700,
    color: "#666",
  },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #eee", paddingVertical: 6 },
  cDate: { width: "14%" },
  cCode: { width: "12%" },
  cDesc: { width: "42%" },
  cQty: { width: "8%", textAlign: "right" },
  cRate: { width: "12%", textAlign: "right" },
  cAmount: { width: "12%", textAlign: "right" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: 200, paddingVertical: 2 },
  totalsLabel: { color: "#666" },
  totalsValueBold: { fontWeight: 700, fontSize: 12 },
  footer: { marginTop: 32, fontSize: 9, color: "#666", borderTop: "1px solid #ddd", paddingTop: 10 },
});

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)} CAD`;
}

export type InvoicePdfProps = {
  invoiceNumber: number;
  status: string;
  issueDate: string;
  dueDate: string | null;
  totalCents: number;
  amountPaidCents: number;
  paymentMethod: string | null;
  paidAt: string | null;
  notes: string | null;
  practice: {
    name: string;
    businessNumber: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    address: string | null;
  };
  client: { fullName: string; email: string | null };
  issuer: {
    fullName: string;
    credential: string | null;
    licenseNumber: string | null;
    licenseProvince: string | null;
  } | null;
  lineItems: Array<{
    serviceDate: string;
    description: string;
    serviceCode: string | null;
    quantity: number;
    unitAmountCents: number;
    amountCents: number;
  }>;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  e_transfer: "E-transfer",
  cash: "Cash",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

function InvoicePdf({
  invoiceNumber,
  status,
  issueDate,
  dueDate,
  totalCents,
  amountPaidCents,
  paymentMethod,
  paidAt,
  notes,
  practice,
  client,
  issuer,
  lineItems,
}: InvoicePdfProps) {
  const balance = totalCents - amountPaidCents;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.practiceName}>{practice.name}</Text>
            {practice.address && <Text style={styles.muted}>{practice.address}</Text>}
            {(practice.contactPhone || practice.contactEmail) && (
              <Text style={styles.muted}>
                {[practice.contactPhone, practice.contactEmail].filter(Boolean).join(" · ")}
              </Text>
            )}
            {practice.businessNumber && (
              <Text style={styles.muted}>Business #{practice.businessNumber}</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>
              INV-{String(invoiceNumber).padStart(4, "0")}
            </Text>
            <Text style={styles.metaRight}>Issued {issueDate}</Text>
            {dueDate && <Text style={styles.metaRight}>Due {dueDate}</Text>}
            <Text style={styles.metaRight}>Status: {status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={[styles.section, styles.row]}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Bill to</Text>
            <Text>{client.fullName}</Text>
            {client.email && <Text style={styles.muted}>{client.email}</Text>}
          </View>
          {issuer && (
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Provided by</Text>
              <Text>
                {issuer.fullName}
                {issuer.credential ? `, ${issuer.credential}` : ""}
              </Text>
              {issuer.licenseNumber && (
                <Text style={styles.muted}>
                  Reg. #{issuer.licenseNumber}
                  {issuer.licenseProvince ? ` (${issuer.licenseProvince})` : ""}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={styles.cDate}>Date</Text>
            <Text style={styles.cCode}>Code</Text>
            <Text style={styles.cDesc}>Description</Text>
            <Text style={styles.cQty}>Qty</Text>
            <Text style={styles.cRate}>Rate</Text>
            <Text style={styles.cAmount}>Amount</Text>
          </View>
          {lineItems.map((li, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.cDate}>{li.serviceDate}</Text>
              <Text style={styles.cCode}>{li.serviceCode ?? "—"}</Text>
              <Text style={styles.cDesc}>{li.description}</Text>
              <Text style={styles.cQty}>{li.quantity}</Text>
              <Text style={styles.cRate}>{formatMoney(li.unitAmountCents)}</Text>
              <Text style={styles.cAmount}>{formatMoney(li.amountCents)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total</Text>
            <Text>{formatMoney(totalCents)}</Text>
          </View>
          {amountPaidCents > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Paid</Text>
              <Text>
                {formatMoney(amountPaidCents)}
                {paymentMethod ? ` (${PAYMENT_METHOD_LABEL[paymentMethod] ?? paymentMethod})` : ""}
              </Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, styles.totalsValueBold]}>Balance due</Text>
            <Text style={styles.totalsValueBold}>{formatMoney(balance)}</Text>
          </View>
          {paidAt && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Paid on</Text>
              <Text>{new Date(paidAt).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        {notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text>{notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>
            This receipt may be submitted to your insurance provider for reimbursement of eligible
            expenses. Please retain a copy for your records.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(props: InvoicePdfProps) {
  return renderToBuffer(<InvoicePdf {...props} />);
}
