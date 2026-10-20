/** Seed content. Everything here is editable in the admin. Legal text is a DRAFT pending review by a UAE advisor. */

export const seedSettings = {
  contact: {
    // PLACEHOLDER numbers: owner must replace before launch (see docs/LAUNCH_CHECKLIST.md).
    whatsapp: "+971500000000",
    phone: "+971 4 000 0000",
    email: "hello@athiraflowers.ae",
    addressEn: "Dubai, United Arab Emirates (studio address to be confirmed)",
    addressAr: "دبي، الإمارات العربية المتحدة (عنوان الاستوديو سيُحدَّد)",
    hoursEn: "Sunday to Friday, 8:00 to 19:00. Saturday by arrangement.",
    hoursAr: "من الأحد إلى الجمعة، 8:00 إلى 19:00. السبت بالاتفاق.",
    whatsappMessageEn: "Hello Athira flowers, I would like to ask about",
    whatsappMessageAr: "مرحباً، أود الاستفسار عن",
  },
  business: {
    legalName: "",
    trn: "",
    licenceNo: "",
    invoiceAddress: "",
    bankDetails: "",
  },
  social: {
    instagram: "",
    facebook: "",
    linkedin: "",
    tiktok: "",
  },
  checkout: {
    minOrderMinor: 15000,
    codEnabled: true,
    codMaxMinor: 150000,
    stripeEnabled: true,
    substitutionPolicyEn:
      "If a flower is unavailable we substitute a stem of equal or higher value in the same colour family and let you know before dispatch.",
    substitutionPolicyAr:
      "إذا تعذّر توفر زهرة نستبدلها بأخرى بنفس القيمة أو أعلى وبنفس العائلة اللونية، ونخبركم قبل الإرسال.",
    depositNoteEn: "The vase or glass deposit is refundable, is not subject to VAT, and is returned when the vessel is collected.",
    depositNoteAr: "مبلغ تأمين المزهرية أو الزجاج مستردّ ولا تُحتسب عليه ضريبة القيمة المضافة، ويُرد عند استلام الوعاء.",
  },
}

export const seedZones = [
  { emirate: "dubai", nameEn: "Dubai: Downtown, Business Bay, DIFC, Marina", nameAr: "دبي: داون تاون، الخليج التجاري، مركز دبي المالي، المرسى", feeMinor: 2500, freeOverMinor: 40000, minOrderMinor: 15000, sameDay: true },
  { emirate: "dubai", nameEn: "Dubai: other areas", nameAr: "دبي: مناطق أخرى", feeMinor: 3500, freeOverMinor: 50000, minOrderMinor: 15000, sameDay: true },
  { emirate: "abu_dhabi", nameEn: "Abu Dhabi: city, Al Maryah, Yas", nameAr: "أبوظبي: المدينة، المارية، ياس", feeMinor: 5500, freeOverMinor: 80000, minOrderMinor: 25000, sameDay: false },
  { emirate: "sharjah", nameEn: "Sharjah: city and Al Majaz", nameAr: "الشارقة: المدينة والمجاز", feeMinor: 4000, freeOverMinor: 60000, minOrderMinor: 20000, sameDay: true },
] as const

export const seedSlots = [
  { labelEn: "Early morning, 7:00 to 9:00", labelAr: "الصباح الباكر، 7:00 إلى 9:00", start: "07:00", end: "09:00", cutoff: null, fee: 2000, capacity: 12 },
  { labelEn: "Morning, 9:00 to 12:00", labelAr: "الصباح، 9:00 إلى 12:00", start: "09:00", end: "12:00", cutoff: "08:00", fee: 0, capacity: 25 },
  { labelEn: "Afternoon, 12:00 to 16:00", labelAr: "بعد الظهر، 12:00 إلى 16:00", start: "12:00", end: "16:00", cutoff: "11:00", fee: 0, capacity: 25 },
  { labelEn: "Evening, 16:00 to 20:00", labelAr: "المساء، 16:00 إلى 20:00", start: "16:00", end: "20:00", cutoff: "14:00", fee: 0, capacity: 25 },
] as const

export const seedCoupons = [
  {
    code: "WELCOME10",
    kind: "percent" as const,
    value: 10,
    minOrderMinor: 20000,
    maxDiscountMinor: 10000,
    perCustomerLimit: 1,
    isPublic: true,
    titleEn: "10% off your first order",
    titleAr: "خصم 10% على طلبكم الأول",
    descriptionEn: "Up to AED 100 off orders over AED 200. One use per customer.",
    descriptionAr: "حتى 100 درهم خصماً على الطلبات فوق 200 درهم. استخدام واحد لكل عميل.",
  },
]

export const seedFaqs: { group: "general" | "delivery" | "corporate" | "events" | "payment"; qEn: string; qAr: string; aEn: string; aAr: string }[] = [
  {
    group: "delivery",
    qEn: "What is the same-day delivery cut-off in Dubai?",
    qAr: "ما هو موعد الإغلاق للتوصيل في اليوم نفسه في دبي؟",
    aEn: "Order before the cut-off shown for each delivery window at checkout: 8:00 for the morning slot, 11:00 for the afternoon and 14:00 for the evening. Items that need preparation time, such as event decor, are not available same day.",
    aAr: "اطلبوا قبل موعد الإغلاق المعروض لكل فترة توصيل عند الدفع: 8:00 للفترة الصباحية و11:00 لما بعد الظهر و14:00 للمساء. المنتجات التي تحتاج وقت تحضير مثل تنسيق الفعاليات غير متاحة في اليوم نفسه.",
  },
  {
    group: "delivery",
    qEn: "Which emirates do you deliver to?",
    qAr: "إلى أي الإمارات تقدمون التوصيل؟",
    aEn: "We deliver in Dubai, Abu Dhabi and Sharjah. Fees, free-delivery thresholds and minimum order values for each zone are shown at checkout before you pay.",
    aAr: "نوصل في دبي وأبوظبي والشارقة. تظهر الرسوم وحدود التوصيل المجاني والحد الأدنى للطلب لكل منطقة عند الدفع قبل إتمام الطلب.",
  },
  {
    group: "delivery",
    qEn: "What happens if nobody is available to receive the flowers?",
    qAr: "ماذا يحدث إذا لم يتوفر أحد لاستلام الزهور؟",
    aEn: "Our driver calls the recipient and waits ten minutes. If we cannot hand over the order we can leave it with reception or security if you have allowed this in the delivery notes; otherwise we contact you to arrange a new time.",
    aAr: "يتصل سائقنا بالمستلم وينتظر عشر دقائق. إن تعذّر التسليم يمكننا تركها لدى الاستقبال أو الأمن إذا سمحتم بذلك في ملاحظات التوصيل، وإلا نتواصل معكم لترتيب موعد جديد.",
  },
  {
    group: "corporate",
    qEn: "How does a weekly flower program for an office work?",
    qAr: "كيف يعمل برنامج الزهور الأسبوعي للمكاتب؟",
    aEn: "You choose an arrangement, a delivery weekday and a minimum term of four deliveries. We deliver before opening, remove the previous week's flowers and swap the vase. You receive one monthly tax invoice quoting your TRN and purchase-order number.",
    aAr: "تختارون التنسيق ويوم التوصيل ومدة دنيا من أربع توصيلات. نوصل قبل بدء الدوام ونزيل زهور الأسبوع السابق ونبدّل المزهرية. وتصلكم فاتورة ضريبية شهرية بالرقم الضريبي ورقم أمر الشراء.",
  },
  {
    group: "corporate",
    qEn: "Can you issue a tax invoice with our TRN and a purchase-order number?",
    qAr: "هل يمكنكم إصدار فاتورة ضريبية بالرقم الضريبي ورقم أمر الشراء؟",
    aEn: "Yes. At checkout tick 'I need a tax invoice' and enter your company name, TRN and purchase-order number. The invoice shows VAT at 5% separately and is available as a PDF in your confirmation email and order page.",
    aAr: "نعم. عند الدفع فعّلوا خيار طلب فاتورة ضريبية وأدخلوا اسم الشركة والرقم الضريبي ورقم أمر الشراء. تُظهر الفاتورة ضريبة القيمة المضافة 5% بشكل منفصل وتتوفر بصيغة PDF.",
  },
  {
    group: "corporate",
    qEn: "Do you offer bulk pricing for corporate gifts?",
    qAr: "هل تقدمون أسعاراً خاصة لهدايا الشركات بالجملة؟",
    aEn: "For orders of ten or more, or gifts going to several addresses, send us a request and we will reply with a quote, usually within one working day.",
    aAr: "للطلبات من عشر قطع فأكثر أو الهدايا الموزعة على عدة عناوين، أرسلوا لنا طلباً وسنرد بعرض سعر عادةً خلال يوم عمل.",
  },
  {
    group: "events",
    qEn: "How far ahead should I book event flowers?",
    qAr: "قبل كم من الوقت يجب حجز زهور الفعاليات؟",
    aEn: "Two to four weeks for weddings and large events, and at least five days for smaller dinners and launches. In peak season (November to March) earlier is better.",
    aAr: "من أسبوعين إلى أربعة أسابيع لحفلات الزفاف والفعاليات الكبيرة، وخمسة أيام على الأقل للعشاءات والإطلاقات الصغيرة. في الموسم المزدحم (نوفمبر إلى مارس) كلما كان أبكر كان أفضل.",
  },
  {
    group: "events",
    qEn: "Do you set up and remove event florals?",
    qAr: "هل تقومون بتركيب وإزالة زهور الفعاليات؟",
    aEn: "Yes. Our team installs the florals before your event and removes them and any rented vessels afterwards. We confirm venue access, timings and loading routes with you in advance.",
    aAr: "نعم. يركّب فريقنا الزهور قبل فعاليتكم ويزيلها مع أي أوعية مستأجرة بعدها. نؤكد معكم مسبقاً الدخول إلى الموقع والتوقيت ومسارات التحميل.",
  },
  {
    group: "payment",
    qEn: "Which payment methods do you accept?",
    qAr: "ما طرق الدفع المتاحة؟",
    aEn: "Card payments through Stripe, and cash on delivery for eligible orders. Corporate customers can also request an invoice with agreed terms.",
    aAr: "الدفع بالبطاقة عبر Stripe، والدفع عند الاستلام للطلبات المؤهلة. ويمكن للشركات طلب فاتورة بشروط متفق عليها.",
  },
  {
    group: "payment",
    qEn: "What is the vase deposit and when do I get it back?",
    qAr: "ما هو تأمين المزهرية ومتى يُسترد؟",
    aEn: "Some arrangements and rentals use a vessel that stays ours. The deposit is shown separately at checkout, is not subject to VAT, and is refunded when we collect the vessel in good condition.",
    aAr: "بعض التنسيقات والإيجارات تستخدم وعاءً يبقى ملكاً لنا. يظهر التأمين منفصلاً عند الدفع ولا تُحتسب عليه ضريبة، ويُرد عند استلام الوعاء بحالة جيدة.",
  },
  {
    group: "general",
    qEn: "How long do the flowers last?",
    qAr: "كم تدوم الزهور؟",
    aEn: "Most bouquets last five to seven days indoors with fresh water every two days and the stems trimmed. In summer, keep them in the coolest room and away from direct sun.",
    aAr: "تدوم معظم الباقات من خمسة إلى سبعة أيام داخل المنزل مع تبديل الماء كل يومين وقص السيقان. في الصيف ضعوها في أبرد غرفة بعيداً عن الشمس المباشرة.",
  },
  {
    group: "general",
    qEn: "Can I add a gift message?",
    qAr: "هل يمكنني إضافة رسالة إهداء؟",
    aEn: "Yes. At checkout choose 'This is a gift', write your message (up to 400 characters) and decide whether to show your name. We print it on a card and the recipient's phone number is used only to coordinate delivery.",
    aAr: "نعم. عند الدفع اختاروا «هذه هدية» واكتبوا رسالتكم (حتى 400 حرف) وقرروا إظهار اسمكم أو إخفاءه. نطبعها على بطاقة، ويُستخدم رقم المستلم لتنسيق التوصيل فقط.",
  },
  {
    group: "general",
    qEn: "What if a flower I ordered is unavailable?",
    qAr: "ماذا لو لم تتوفر زهرة طلبتها؟",
    aEn: "We substitute a stem of equal or higher value in the same colour family and tell you before dispatch. If the substitution does not suit you, we will refund the item.",
    aAr: "نستبدلها بزهرة بنفس القيمة أو أعلى وبنفس العائلة اللونية ونخبركم قبل الإرسال. وإن لم يناسبكم الاستبدال نردّ قيمة المنتج.",
  },
]

const DRAFT_EN = "Draft for review: this text has not yet been reviewed by a UAE legal advisor.\n\n"
const DRAFT_AR = "مسودة للمراجعة: لم يراجع مستشار قانوني في الإمارات هذا النص بعد.\n\n"

export const seedPages = [
  {
    key: "about",
    titleEn: "About us",
    titleAr: "من نحن",
    bodyEn:
      "Athira flowers is a florist for offices, events and gifting across Dubai, Abu Dhabi and Sharjah.\n\nWe set up weekly flower programs for reception desks and boardrooms, dress events from dinners to launches, and send gifts and plants to people who matter to you.\n\n## How we work\n\n- **We state the practical details up front.** Cut-off times, delivery windows, deposits and minimums are shown before you pay.\n- **We invoice properly.** Corporate customers receive a tax invoice with TRN and purchase-order details.\n- **We tell you before we substitute.** Seasonal flowers change; you will always hear from us first.\n\n## Contact\n\nUse the contact page or WhatsApp to talk to the team. Event and corporate quotes are usually answered within one working day.",
    bodyAr:
      "أثيرة للزهور متجر زهور للمكاتب والفعاليات والهدايا في دبي وأبوظبي والشارقة.\n\nننسّق برامج زهور أسبوعية لمكاتب الاستقبال وقاعات الاجتماعات، ونزيّن الفعاليات من العشاءات إلى الإطلاقات، ونرسل الهدايا والنباتات لمن يهمّكم.\n\n## كيف نعمل\n\n- **نذكر التفاصيل العملية مقدماً.** مواعيد الإغلاق وفترات التوصيل والتأمين والحد الأدنى تظهر قبل الدفع.\n- **نصدر الفواتير بشكل سليم.** يحصل العملاء من الشركات على فاتورة ضريبية بالرقم الضريبي وأمر الشراء.\n- **نخبركم قبل الاستبدال.** الزهور الموسمية تتغير ولن نغيّر شيئاً دون إعلامكم.\n\n## التواصل\n\nاستخدموا صفحة التواصل أو واتساب للحديث مع الفريق. نرد عادةً على طلبات الفعاليات والشركات خلال يوم عمل.",
  },
  {
    key: "privacy",
    titleEn: "Privacy policy",
    titleAr: "سياسة الخصوصية",
    bodyEn:
      DRAFT_EN +
      "## What we collect\n\nWe collect only what we need to take and deliver your order: your name, email, phone number, delivery address, gift message and, for corporate invoices, your company name, TRN and purchase-order number. Enquiries (quotes, events, contact) are stored so we can reply.\n\n## Why we use it\n\nTo fulfil orders, send order and delivery messages, issue invoices, prevent fraud and meet legal and tax record-keeping duties. We send marketing email only if you opt in, and you can withdraw consent at any time.\n\n## Who processes it\n\nHosting on our own server in the UAE region, email delivery through Brevo, card payments through Stripe (we never see or store your card number), and image storage through Cloudflare. We do not sell personal data.\n\n## How long we keep it\n\nOrder and invoice records for the period required by UAE tax and commercial law. Enquiries that do not become orders are deleted after 24 months. Sign-in codes and sessions expire automatically.\n\n## Your rights\n\nYou can ask us to access, correct or erase your personal data, subject to legal retention duties. Write to the email address on the contact page.",
    bodyAr:
      DRAFT_AR +
      "## ما الذي نجمعه\n\nنجمع فقط ما يلزم لاستلام طلبكم وتوصيله: الاسم والبريد الإلكتروني ورقم الهاتف وعنوان التوصيل ورسالة الإهداء، وللفواتير التجارية اسم الشركة والرقم الضريبي ورقم أمر الشراء. تُحفظ الاستفسارات (عروض الأسعار والفعاليات والتواصل) لنتمكن من الرد.\n\n## لماذا نستخدمه\n\nلتنفيذ الطلبات وإرسال رسائل الطلب والتوصيل وإصدار الفواتير ومنع الاحتيال والالتزام بسجلات الضرائب والقوانين. لا نرسل رسائل تسويقية إلا بموافقتكم ويمكنكم سحبها في أي وقت.\n\n## من يعالجه\n\nالاستضافة على خادمنا في منطقة الإمارات، وإرسال البريد عبر Brevo، والدفع بالبطاقة عبر Stripe (لا نرى رقم بطاقتكم ولا نخزنه)، وتخزين الصور عبر Cloudflare. لا نبيع البيانات الشخصية.\n\n## مدة الاحتفاظ\n\nنحتفظ بسجلات الطلبات والفواتير للمدة التي تفرضها قوانين الضرائب والتجارة في الإمارات. تُحذف الاستفسارات التي لم تتحول إلى طلبات بعد 24 شهراً. تنتهي رموز الدخول والجلسات تلقائياً.\n\n## حقوقكم\n\nيمكنكم طلب الاطلاع على بياناتكم الشخصية أو تصحيحها أو حذفها مع مراعاة واجبات الاحتفاظ القانونية. راسلونا على البريد المذكور في صفحة التواصل.",
  },
  {
    key: "terms",
    titleEn: "Terms of sale",
    titleAr: "شروط البيع",
    bodyEn:
      DRAFT_EN +
      "## Who we are\n\nThese terms apply to purchases from the Athira flowers website. Our trade name, licence and TRN are shown on the contact page and on every invoice.\n\n## Prices and VAT\n\nPrices are in UAE dirhams (AED) and include 5% VAT. Delivery fees are shown before you pay. A refundable vase or glass deposit, where applicable, is shown separately and is outside the VAT base.\n\n## Orders\n\nYour order is accepted when you receive a confirmation. For card payments the order is confirmed once payment is received. For cash on delivery, payment is collected by the driver.\n\n## Substitutions\n\nFlowers are natural products. If a stem is unavailable we substitute one of equal or higher value in the same colour family and tell you before dispatch.\n\n## Corporate programs and events\n\nWeekly and monthly programs have the minimum term shown on the product page. Event orders are confirmed with a written quote and may require a deposit.\n\n## Contact and complaints\n\nIf something is wrong with your order, contact us within 24 hours of delivery with a photo and your order number so we can put it right.",
    bodyAr:
      DRAFT_AR +
      "## من نحن\n\nتسري هذه الشروط على المشتريات من موقع أثيرة للزهور. يظهر الاسم التجاري والرخصة والرقم الضريبي في صفحة التواصل وعلى كل فاتورة.\n\n## الأسعار وضريبة القيمة المضافة\n\nالأسعار بالدرهم الإماراتي وتشمل ضريبة القيمة المضافة 5%. تظهر رسوم التوصيل قبل الدفع. يظهر تأمين المزهرية أو الزجاج المستردّ، إن وُجد، بشكل منفصل وهو خارج وعاء الضريبة.\n\n## الطلبات\n\nيُقبل طلبكم عند وصول رسالة التأكيد. في الدفع بالبطاقة يُؤكد الطلب عند استلام الدفع. وفي الدفع عند الاستلام يحصّل السائق المبلغ.\n\n## الاستبدال\n\nالزهور منتجات طبيعية. إن لم تتوفر زهرة نستبدلها بأخرى بنفس القيمة أو أعلى وبنفس العائلة اللونية ونخبركم قبل الإرسال.\n\n## البرامج المؤسسية والفعاليات\n\nللبرامج الأسبوعية والشهرية حد أدنى للمدة يظهر في صفحة المنتج. تُؤكد طلبات الفعاليات بعرض سعر مكتوب وقد تتطلب دفعة مقدمة.\n\n## التواصل والشكاوى\n\nإن كان هناك خلل في طلبكم تواصلوا معنا خلال 24 ساعة من التسليم مع صورة ورقم الطلب لنصحّحه.",
  },
  {
    key: "delivery",
    titleEn: "Delivery policy",
    titleAr: "سياسة التوصيل",
    bodyEn:
      DRAFT_EN +
      "## Where we deliver\n\nDubai, Abu Dhabi and Sharjah. Each delivery zone has its own fee, free-delivery threshold and minimum order, all shown at checkout.\n\n## Delivery windows and cut-offs\n\nChoose a date and a delivery window at checkout. Same-day delivery is offered where the window's cut-off has not passed and every item in your basket allows it. Event decor and programs need advance notice and are not available same day.\n\n## Public holidays\n\nDates we cannot deliver are blocked at checkout.\n\n## Receiving your order\n\nPlease make sure someone can receive the flowers. If nobody is available we will call, wait ten minutes and then follow your delivery notes or contact you to arrange a new time.\n\n## Failed or incorrect deliveries\n\nIf we cannot deliver because the address or phone number was wrong, a new delivery fee may apply.",
    bodyAr:
      DRAFT_AR +
      "## أين نوصل\n\nدبي وأبوظبي والشارقة. لكل منطقة توصيل رسومها وحد التوصيل المجاني والحد الأدنى للطلب، وكلها تظهر عند الدفع.\n\n## فترات التوصيل وأوقات الإغلاق\n\nاختاروا التاريخ وفترة التوصيل عند الدفع. يتوفر التوصيل في اليوم نفسه إن لم يحن موعد إغلاق الفترة وكانت جميع المنتجات تسمح بذلك. تحتاج تنسيقات الفعاليات والبرامج إلى إشعار مسبق ولا تتوفر في اليوم نفسه.\n\n## العطل الرسمية\n\nتُحجب عند الدفع التواريخ التي لا نستطيع التوصيل فيها.\n\n## استلام الطلب\n\nيرجى التأكد من وجود من يستلم الزهور. إن لم يتوفر أحد نتصل وننتظر عشر دقائق ثم نتبع ملاحظات التوصيل أو نتواصل معكم لترتيب موعد جديد.\n\n## التوصيل الفاشل أو غير الصحيح\n\nإن تعذّر التوصيل بسبب خطأ في العنوان أو رقم الهاتف فقد تُطبّق رسوم توصيل جديدة.",
  },
  {
    key: "refund",
    titleEn: "Refund and cancellation policy",
    titleAr: "سياسة الاسترجاع والإلغاء",
    bodyEn:
      DRAFT_EN +
      "## Cancelling an order\n\nYou can cancel before we start preparing your order. Contact us with your order number as early as possible. Orders already in preparation or dispatched cannot be cancelled because the flowers are perishable.\n\n## Problems with your order\n\nIf your flowers arrive damaged or do not match your order, contact us within 24 hours of delivery with a photo. We will replace the item or refund it.\n\n## Refunds\n\nRefunds to cards are made to the original card and usually appear within five to ten working days depending on your bank. Cash on delivery refunds are paid by bank transfer.\n\n## Deposits\n\nVase and glass deposits are refunded in full when the vessel is collected in good condition.\n\n## Events and programs\n\nEvent quotes state their own cancellation terms. Weekly and monthly programs can be paused or cancelled after the minimum term with seven days' notice.",
    bodyAr:
      DRAFT_AR +
      "## إلغاء الطلب\n\nيمكنكم الإلغاء قبل أن نبدأ بتحضير طلبكم. تواصلوا معنا برقم الطلب في أقرب وقت. لا يمكن إلغاء الطلبات قيد التحضير أو التي أُرسلت لأن الزهور سريعة التلف.\n\n## مشكلات الطلب\n\nإن وصلت الزهور تالفة أو لا تطابق طلبكم فتواصلوا معنا خلال 24 ساعة من التسليم مع صورة. سنستبدل المنتج أو نردّ قيمته.\n\n## المبالغ المستردة\n\nتُرد المبالغ إلى البطاقة الأصلية وتظهر عادةً خلال خمسة إلى عشرة أيام عمل بحسب البنك. تُرد مبالغ الدفع عند الاستلام بالتحويل البنكي.\n\n## التأمين\n\nيُرد تأمين المزهريات والزجاج كاملاً عند استلام الوعاء بحالة جيدة.\n\n## الفعاليات والبرامج\n\nتتضمن عروض أسعار الفعاليات شروط الإلغاء الخاصة بها. يمكن إيقاف البرامج الأسبوعية والشهرية أو إلغاؤها بعد الحد الأدنى للمدة بإشعار قبل سبعة أيام.",
  },
]

export const seedBlogCategories = [
  { slug: "care-guides", nameEn: "Care guides", nameAr: "أدلة العناية" },
  { slug: "corporate", nameEn: "For offices", nameAr: "للمكاتب" },
  { slug: "events", nameEn: "Events", nameAr: "الفعاليات" },
]

export const seedPosts = [
  {
    slug: "keeping-cut-flowers-fresh-in-uae-heat",
    category: "care-guides",
    cover: "blog-care",
    titleEn: "Keeping cut flowers fresh in UAE heat",
    titleAr: "كيف تحافظون على طراوة الزهور في حرارة الإمارات",
    excerptEn: "Six habits that add days to a bouquet, from the first minute out of the box.",
    excerptAr: "ست عادات تضيف أياماً إلى عمر الباقة منذ أول دقيقة بعد فتح الصندوق.",
    bodyEn:
      "Cut flowers drink water and lose it through their petals. Heat and dry air speed up both, so a few small habits matter more here than in cooler climates.\n\n## 1. Trim and rehydrate immediately\n\nCut 2 cm from each stem at an angle with clean scissors, then put the flowers into clean, cool water straight away. Remove any leaves that would sit below the waterline.\n\n## 2. Use the flower food\n\nThe small sachet contains sugar and an agent that keeps the water clean. Dissolve it fully before adding the flowers.\n\n## 3. Choose the coolest room\n\nKeep the vase away from direct sun, ovens, windows that face west and air-conditioning vents that blow directly on the flowers. A steady 20 to 24 degrees is ideal.\n\n## 4. Change the water every two days\n\nRinse the vase, refill with cool water and re-trim the stems by a centimetre. Cloudy water means bacteria are blocking the stems.\n\n## 5. Take out fading stems\n\nOne wilting flower releases gas that ages its neighbours. Remove it and the rest will last longer.\n\n## 6. Keep fruit away\n\nRipening fruit also releases the gas that shortens a flower's life.\n\nFollow these habits and most bouquets stay fresh for five to seven days.",
    bodyAr:
      "تشرب الزهور المقطوفة الماء وتفقده عبر بتلاتها. الحرارة والهواء الجاف يسرّعان الأمرين، لذا تهمّ العادات الصغيرة هنا أكثر من المناخات الأبرد.\n\n## 1. قصّوا وروّوا فوراً\n\nاقطعوا سنتيمترين من كل ساق بزاوية بمقص نظيف، ثم ضعوا الزهور في ماء نظيف بارد مباشرة. أزيلوا الأوراق التي ستغمرها المياه.\n\n## 2. استخدموا غذاء الزهور\n\nيحتوي الكيس الصغير على سكر ومادة تحافظ على نظافة الماء. أذيبوه تماماً قبل وضع الزهور.\n\n## 3. اختاروا أبرد غرفة\n\nأبعدوا المزهرية عن الشمس المباشرة والأفران والنوافذ الغربية وفتحات التكييف التي تهب مباشرة على الزهور. حرارة ثابتة بين 20 و24 درجة مثالية.\n\n## 4. بدّلوا الماء كل يومين\n\nاشطفوا المزهرية وأعيدوا ملأها بماء بارد وقصّوا السيقان سنتيمتراً آخر. الماء العكر يعني أن البكتيريا تسدّ السيقان.\n\n## 5. أزيلوا الزهور الذابلة\n\nزهرة واحدة ذابلة تطلق غازاً يُسرّع شيخوخة جاراتها. أزيلوها وستدوم الباقي أطول.\n\n## 6. أبعدوا الفاكهة\n\nالفاكهة الناضجة تطلق الغاز نفسه الذي يقصّر عمر الزهرة.\n\nباتباع هذه العادات تبقى معظم الباقات طازجة من خمسة إلى سبعة أيام.",
  },
  {
    slug: "weekly-office-flowers-what-to-expect",
    category: "corporate",
    cover: "blog-office",
    titleEn: "Weekly office flowers: what to expect",
    titleAr: "زهور المكتب الأسبوعية: ماذا تتوقعون",
    excerptEn: "How a weekly flower program runs, from the first delivery to the monthly invoice.",
    excerptAr: "كيف يعمل برنامج الزهور الأسبوعي من أول توصيل حتى الفاتورة الشهرية.",
    bodyEn:
      "A weekly flower program is a standing order: the same day each week, a fresh arrangement arrives before your office opens and the old one leaves.\n\n## Choosing the arrangement\n\nStart with where the flowers will sit. A reception desk needs a generous front-facing arrangement; a boardroom needs low pieces that do not block eye contact; a lobby with height can take a sculptural piece with branches.\n\n## The delivery day\n\nPick a weekday and a delivery window before your team arrives. Our team swaps the vase, removes last week's flowers and wipes the surface.\n\n## Colours and brand\n\nShare your brand colours and we will build a palette around them, then follow the season for the flowers themselves.\n\n## Minimum term and invoicing\n\nPrograms run for a minimum of four deliveries. You receive one tax invoice per month showing VAT at 5%, your TRN and your purchase-order number, and the refundable vase deposit is shown separately.\n\n## Pausing and changing\n\nGoing on leave? Give seven days' notice and we will pause the program. You can also change the arrangement size at any time.",
    bodyAr:
      "برنامج الزهور الأسبوعي طلب دائم: في اليوم نفسه من كل أسبوع يصل تنسيق طازج قبل افتتاح مكتبكم ويغادر القديم.\n\n## اختيار التنسيق\n\nابدؤوا بمكان وضع الزهور. يحتاج مكتب الاستقبال إلى تنسيق سخي موجّه للأمام، وقاعة الاجتماعات إلى قطع منخفضة لا تحجب النظر، واللوبي ذو الارتفاع يتسع لقطعة نحتية بأغصان.\n\n## يوم التوصيل\n\nاختاروا يوماً وفترة توصيل قبل وصول فريقكم. يبدّل فريقنا المزهرية ويزيل زهور الأسبوع الماضي ويمسح السطح.\n\n## الألوان والهوية\n\nشاركونا ألوان هويتكم وسنبني حولها لوحة، ثم نتبع الموسم في اختيار الزهور نفسها.\n\n## الحد الأدنى والفوترة\n\nتستمر البرامج لأربع توصيلات كحد أدنى. تصلكم فاتورة ضريبية شهرية تُظهر ضريبة 5% ورقمكم الضريبي ورقم أمر الشراء، ويظهر تأمين المزهرية المستردّ بشكل منفصل.\n\n## الإيقاف والتغيير\n\nهل ستكونون في إجازة؟ أخبرونا قبل سبعة أيام وسنوقف البرنامج. ويمكنكم تغيير حجم التنسيق في أي وقت.",
  },
  {
    slug: "planning-event-florals-timeline",
    category: "events",
    cover: "blog-event",
    titleEn: "Planning event florals: a timeline",
    titleAr: "التخطيط لزهور الفعاليات: جدول زمني",
    excerptEn: "What to decide, and when, so the flowers match the room on the day.",
    excerptAr: "ما الذي يجب تحديده ومتى، لتتناسب الزهور مع القاعة في يوم الفعالية.",
    bodyEn:
      "Flowers are the easiest part of an event to get right when the decisions are made in the right order.\n\n## Four weeks out\n\nShare the date, venue, guest count and rough budget. This is when we check seasonal availability and venue access.\n\n## Three weeks out\n\nConfirm the palette and which pieces you need: entrance, tables, stage, bar. Tell us your table count and shape.\n\n## One week out\n\nConfirm the final count, delivery and install times, and the venue contact. We confirm loading routes and any rented vessels.\n\n## The day before\n\nThe most delicate pieces are prepared. We confirm timings with you again.\n\n## On the day\n\nOur team installs before your doors open and removes florals and rented vessels afterwards.\n\n## Peak season\n\nFrom November to March the calendar fills quickly. Book earlier for weddings, National Day and year-end events.",
    bodyAr:
      "الزهور أسهل أجزاء الفعالية إتقاناً عندما تُتخذ القرارات بالترتيب الصحيح.\n\n## قبل أربعة أسابيع\n\nشاركونا التاريخ والمكان وعدد الضيوف والميزانية التقريبية. هنا نتحقق من توفر الزهور الموسمية وسهولة الوصول إلى الموقع.\n\n## قبل ثلاثة أسابيع\n\nأكّدوا لوحة الألوان والقطع المطلوبة: المدخل والطاولات والمنصة والبار. أخبرونا بعدد الطاولات وشكلها.\n\n## قبل أسبوع\n\nأكّدوا العدد النهائي وأوقات التوصيل والتركيب وجهة الاتصال في الموقع. نؤكد مسارات التحميل وأي أوعية مستأجرة.\n\n## قبل يوم\n\nتُحضَّر أدق القطع. نؤكد معكم التوقيت مجدداً.\n\n## يوم الفعالية\n\nيركّب فريقنا قبل فتح الأبواب ويزيل الزهور والأوعية المستأجرة بعدها.\n\n## الموسم المزدحم\n\nمن نوفمبر إلى مارس يمتلئ الجدول بسرعة. احجزوا مبكراً لحفلات الزفاف واليوم الوطني وفعاليات نهاية العام.",
  },
]
