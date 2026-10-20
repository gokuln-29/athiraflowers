import "server-only"
import PDFDocument from "pdfkit"
import path from "node:path"

import { site } from "@/config/site"
import { formatDate, formatMoney } from "@/lib/format"

export type InvoiceOrder = {
  invoiceNumber: string
  invoiceIssuedAt: Date | null
  orderNumber: string
  createdAt: Date
  deliveryDate: string
  currency: string
  vatBps: number
  subtotalMinor: number
  discountMinor: number
  deliveryFeeMinor: number
  depositMinor: number
  vatMinor: number
  totalMinor: number
  paymentMethod: string
  paymentStatus: string
  companyName: string | null
  companyTrn: string | null
  poNumber: string | null
  billingAddress: string | null
  contactName: string
  contactEmail: string
  building: string
  area: string
  zoneName: string
  items: { titleEn: string; titleAr: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number }[]
}

export type InvoiceSeller = { legalName: string; trn: string; licenceNo: string; address: string; email: string; phone: string }

const FONT_DIR = path.resolve(process.cwd(), "assets/fonts")
const INK = "#1e1a18"
const MUTED = "#5a524c"
const ACCENT = "#8a2b3f"

/**
 * Bilingual (English + Arabic) tax invoice, A4. Prices are VAT-inclusive; VAT is extracted from the taxable total.
 * The refundable deposit is shown outside the VAT base.
 */
export function renderInvoicePdf(order: InvoiceOrder, seller: InvoiceSeller): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Tax invoice ${order.invoiceNumber}`, Author: seller.legalName || site.name } })
    const chunks: Buffer[] = []
    doc.on("data", (c: Buffer) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    doc.registerFont("ar", path.join(FONT_DIR, "Amiri-Regular.ttf"))
    doc.registerFont("ar-bold", path.join(FONT_DIR, "Amiri-Bold.ttf"))
    const left = doc.page.margins.left
    const right = doc.page.width - doc.page.margins.right
    const width = right - left
    const m = (n: number) => formatMoney(n, "en")

    const bi = (en: string, ar: string, y: number, opts: { size?: number; bold?: boolean; color?: string } = {}) => {
      doc.fillColor(opts.color ?? INK).font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size ?? 10).text(en, left, y, { width: width / 2, align: "left" })
      doc.font(opts.bold ? "ar-bold" : "ar").fontSize((opts.size ?? 10) + 2).text(ar, left + width / 2, y - 1, { width: width / 2, align: "right", features: ["rtla"] })
    }

    // Header
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(20).text(site.name, left, 48)
    doc.font("ar-bold").fontSize(20).text(site.nameAr, left, 46, { width, align: "right", features: ["rtla"] })
    doc.moveTo(left, 82).lineTo(right, 82).lineWidth(0.6).strokeColor("#d9d2c8").stroke()
    bi("TAX INVOICE", "فاتورة ضريبية", 94, { size: 15, bold: true, color: ACCENT })

    if (!seller.trn) {
      doc.fillColor("#b3261e").font("Helvetica-Bold").fontSize(9).text("Supplier TRN is not set. Add it in Store settings before issuing invoices to customers.", left, 122, { width })
    }

    // Invoice meta + parties
    let y = 142
    const metaRow = (labelEn: string, labelAr: string, value: string) => {
      doc.fillColor(MUTED).font("Helvetica").fontSize(8.5).text(labelEn, left, y, { continued: false })
      doc.fillColor(MUTED).font("ar").fontSize(10).text(labelAr, left, y - 1, { width: 190, align: "right", features: ["rtla"] })
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5).text(value, left + 200, y, { width: 110 })
      y += 18
    }
    metaRow("Invoice no.", "رقم الفاتورة", order.invoiceNumber)
    metaRow("Date of issue", "تاريخ الإصدار", formatDate(order.invoiceIssuedAt ?? new Date(), "en", { dateStyle: "medium" }))
    metaRow("Order", "الطلب", order.orderNumber)
    metaRow("Delivery date", "تاريخ التوصيل", formatDate(order.deliveryDate, "en", { dateStyle: "medium" }))
    if (order.poNumber) metaRow("PO number", "رقم أمر الشراء", order.poNumber)

    const col2 = left + 330
    let py = 142
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5).text("SUPPLIER", col2, py)
    doc.font("ar").fontSize(10).text("المورّد", col2, py - 1, { width: right - col2, align: "right", features: ["rtla"] })
    py += 14
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(seller.legalName || site.name, col2, py, { width: right - col2 })
    py = doc.y + 1
    doc.font("Helvetica").fontSize(9).fillColor(INK).text(`TRN: ${seller.trn || "-"}`, col2, py, { width: right - col2 })
    if (seller.licenceNo) doc.text(`Licence: ${seller.licenceNo}`, col2, doc.y, { width: right - col2 })
    if (seller.address) doc.fillColor(MUTED).text(seller.address, col2, doc.y, { width: right - col2 })
    doc.fillColor(MUTED).text([seller.email, seller.phone].filter(Boolean).join("  |  "), col2, doc.y, { width: right - col2 })

    y = Math.max(y, doc.y) + 14
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5).text("BILL TO", left, y)
    doc.font("ar").fontSize(10).text("الفاتورة إلى", left, y - 1, { width: 300, align: "right", features: ["rtla"] })
    y += 14
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(order.companyName || order.contactName, left, y, { width: 300 })
    y = doc.y
    doc.font("Helvetica").fontSize(9)
    if (order.companyTrn) doc.text(`TRN: ${order.companyTrn}`, left, y, { width: 300 })
    doc.fillColor(MUTED).text(order.billingAddress || `${order.building}, ${order.area}, ${order.zoneName}`, left, doc.y, { width: 300 })
    doc.text(order.contactEmail, left, doc.y, { width: 300 })

    // Items
    y = doc.y + 18
    const cols = { desc: left, qty: left + 280, unit: left + 320, total: left + 420 }
    doc.rect(left, y, width, 22).fill("#f1ede7")
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8.5)
    doc.text("Description", cols.desc + 6, y + 7)
    doc.text("Qty", cols.qty, y + 7, { width: 40, align: "right" })
    doc.text("Unit (incl. VAT)", cols.unit, y + 7, { width: 80, align: "right" })
    doc.text("Amount (incl. VAT)", cols.total - 20, y + 7, { width: right - cols.total + 14, align: "right" })
    y += 28
    for (const it of order.items) {
      if (y > 700) {
        doc.addPage()
        y = 60
      }
      doc.fillColor(INK).font("Helvetica").fontSize(9.5).text(it.titleEn, cols.desc + 6, y, { width: 270 })
      let rowEnd = doc.y
      if (it.titleAr) {
        doc.fillColor(MUTED).font("ar").fontSize(10.5).text(it.titleAr, cols.desc + 6, rowEnd, { width: 270, align: "right", features: ["rtla"] })
        rowEnd = doc.y
      }
      doc.fillColor(INK).font("Helvetica").fontSize(9.5)
      doc.text(String(it.quantity), cols.qty, y, { width: 40, align: "right" })
      doc.text(m(it.unitPriceMinor), cols.unit, y, { width: 80, align: "right" })
      doc.text(m(it.lineTotalMinor), cols.total, y, { width: right - cols.total - 6, align: "right" })
      y = rowEnd + 8
      doc.moveTo(left, y - 3).lineTo(right, y - 3).lineWidth(0.4).strokeColor("#e6e0d8").stroke()
    }

    // Totals
    const taxable = order.subtotalMinor - order.discountMinor + order.deliveryFeeMinor
    const net = taxable - order.vatMinor
    y += 6
    const line = (labelEn: string, labelAr: string, value: string, strong = false) => {
      const x = left + 200
      doc.fillColor(strong ? INK : MUTED).font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 10.5 : 9.5).text(labelEn, x, y, { width: 190 })
      doc.fillColor(MUTED).font("ar").fontSize(9.5).text(labelAr, x, y + (strong ? 13 : 12), { width: 190, align: "left", features: ["rtla"] })
      doc.fillColor(INK).font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 11 : 9.5).text(value, left + 390, y, { width: right - left - 390, align: "right" })
      y += 30
    }
    line("Items", "المنتجات", m(order.subtotalMinor))
    if (order.discountMinor) line("Discount", "الخصم", `-${m(order.discountMinor)}`)
    line("Delivery", "التوصيل", m(order.deliveryFeeMinor))
    line("Total excluding VAT", "الإجمالي بدون الضريبة", m(net))
    line(`VAT ${order.vatBps / 100}%`, `ضريبة القيمة المضافة ${order.vatBps / 100}%`, m(order.vatMinor))
    line("Total including VAT", "الإجمالي شامل الضريبة", m(taxable), true)
    if (order.depositMinor) {
      line("Refundable deposit (outside VAT)", "تأمين مستردّ (خارج الضريبة)", m(order.depositMinor))
      line("Total due", "المبلغ المستحق", m(order.totalMinor), true)
    }

    y += 10
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5).text(
      `Payment: ${order.paymentMethod === "cod" ? "Cash on delivery" : "Card"} (${order.paymentStatus.replace("_", " ")}). Amounts in ${order.currency}. This invoice was generated by computer.`,
      left, y, { width }
    )
    doc.fillColor(MUTED).font("ar").fontSize(9.5).text("الدفع بالدرهم الإماراتي. تم إنشاء هذه الفاتورة إلكترونياً.", left, doc.y + 2, { width, align: "right", features: ["rtla"] })
    doc.end()
  })
}
