import "./_use-migrate-user"
import { writeFileSync } from "node:fs"
import { renderInvoicePdf } from "@/server/invoices/render"

const pdf = await renderInvoicePdf(
  {
    invoiceNumber: "INV-2026-000001", invoiceIssuedAt: new Date(), orderNumber: "AF-100001", createdAt: new Date(), deliveryDate: "2026-10-22", currency: "AED", vatBps: 500,
    subtotalMinor: 118000, discountMinor: 0, deliveryFeeMinor: 0, depositMinor: 60000, vatMinor: 5619, totalMinor: 178000, paymentMethod: "stripe", paymentStatus: "paid",
    companyName: "Al Noor Trading LLC", companyTrn: "100123456700003", poNumber: "PO-7781", billingAddress: "Office 1203, Tower 5, Business Bay, Dubai", contactName: "Layla Hassan", contactEmail: "ap@alnoor.example",
    building: "Tower 5", area: "Business Bay", zoneName: "Dubai",
    items: [{ titleEn: "Reception arrangement, weekly", titleAr: "تنسيق الاستقبال الأسبوعي", quantity: 4, unitPriceMinor: 28500, lineTotalMinor: 114000 }, { titleEn: "Round glass vase", titleAr: "مزهرية زجاجية مستديرة", quantity: 1, unitPriceMinor: 4000, lineTotalMinor: 4000 }],
  },
  { legalName: "Athira Flowers FZ-LLC (sample)", trn: "100999888800003", licenceNo: "DED-000000", address: "Dubai, UAE", email: "hello@athiraflowers.ae", phone: "+971 4 000 0000" }
)
writeFileSync(process.argv[2] ?? "/tmp/sample-invoice.pdf", pdf)
console.log("wrote", pdf.length, "bytes")
