import type { HomeSectionType } from "../schema/content"

type Seed = { type: HomeSectionType; data: Record<string, unknown>; active?: boolean }

/** Home page blocks. Edit them in the admin (Pages and homepage). */
export function seedHomeSections(media: Map<string, number>): Seed[] {
  const m = (key: string) => media.get(key) ?? null
  return [
    {
      type: "banner",
      data: {
        text: {
          en: "Same-day delivery in Dubai: order before the cut-off shown at checkout.",
          ar: "توصيل في اليوم نفسه في دبي: اطلبوا قبل موعد الإغلاق المعروض عند الدفع.",
        },
        cta: { label: { en: "Delivery details", ar: "تفاصيل التوصيل" }, href: "/delivery" },
      },
    },
    {
      type: "hero",
      data: {
        headline: { en: "Flowers that arrive before the guests", ar: "زهورٌ تصل قبل الضيوف" },
        sub: {
          en: "Weekly flower programs for offices, event decor and corporate gifting in Dubai, Abu Dhabi and Sharjah, with a tax invoice and a delivery window you choose.",
          ar: "برامج زهور أسبوعية للمكاتب، وتنسيق الفعاليات، وهدايا الشركات في دبي وأبوظبي والشارقة، مع فاتورة ضريبية وفترة توصيل تختارونها.",
        },
        primary: { label: { en: "Request a quote", ar: "اطلب عرض سعر" }, href: "/corporate#quote" },
        secondary: { label: { en: "Shop flowers", ar: "تسوّق الزهور" }, href: "/shop" },
        imageMediaId: m("program-lobby"),
        note: null,
      },
    },
    {
      type: "pathways",
      data: {
        title: { en: "Three ways we work with you", ar: "ثلاث طرق نعمل بها معكم" },
        items: [
          {
            title: { en: "Weekly office flowers", ar: "زهور المكتب الأسبوعية" },
            body: {
              en: "A fresh arrangement on the same day each week, with the vase swapped and one monthly tax invoice.",
              ar: "تنسيق طازج في اليوم نفسه كل أسبوع مع استبدال المزهرية وفاتورة ضريبية شهرية واحدة.",
            },
            href: "/corporate",
            imageMediaId: m("blog-office"),
          },
          {
            title: { en: "Event decor", ar: "تنسيق الفعاليات" },
            body: {
              en: "Centrepieces, entrances and stage florals for dinners, launches, conferences and weddings.",
              ar: "قطع مركزية ومداخل وزهور منصات للعشاءات والإطلاقات والمؤتمرات وحفلات الزفاف.",
            },
            href: "/events",
            imageMediaId: m("event-table"),
          },
          {
            title: { en: "Gifts and plants", ar: "الهدايا والنباتات" },
            body: {
              en: "Bouquets, orchids and desk plants for clients, colleagues and the people who matter to you.",
              ar: "باقات وأوركيد ونباتات مكتبية للعملاء والزملاء ولمن يهمّكم.",
            },
            href: "/shop/corporate-gifting",
            imageMediaId: m("gift-orchid"),
          },
        ],
      },
    },
    {
      type: "featured",
      data: { title: { en: "Chosen this week", ar: "اخترنا لكم هذا الأسبوع" }, body: null, limit: 8 },
    },
    {
      type: "program",
      data: {
        title: { en: "A fresh arrangement at reception, every week", ar: "تنسيق طازج في الاستقبال كل أسبوع" },
        body: {
          en: "Choose the arrangement, the weekday and the delivery window. We do the rest, and you see exactly what it costs before you start.",
          ar: "اختاروا التنسيق ويوم الأسبوع وفترة التوصيل. ونحن نتولى الباقي، وترون التكلفة بالتفصيل قبل أن تبدؤوا.",
        },
        bullets: [
          { en: "The same day each week, before you open", ar: "في اليوم نفسه كل أسبوع قبل بدء الدوام" },
          { en: "We remove last week's flowers and swap the vase", ar: "نزيل زهور الأسبوع الماضي ونبدّل المزهرية" },
          { en: "One monthly tax invoice with your TRN and PO number", ar: "فاتورة ضريبية شهرية واحدة بالرقم الضريبي وأمر الشراء" },
          { en: "Pause or change with seven days' notice", ar: "إيقاف أو تغيير بإشعار قبل سبعة أيام" },
        ],
        cta: { label: { en: "See weekly programs", ar: "اطلعوا على البرامج الأسبوعية" }, href: "/shop/weekly-programs" },
        imageMediaId: m("program-boardroom"),
      },
    },
    { type: "categories", data: { title: { en: "Shop by category", ar: "تسوّقوا حسب الفئة" } } },
    {
      type: "steps",
      data: {
        title: { en: "How an order works", ar: "كيف يتم الطلب" },
        items: [
          { title: { en: "Choose", ar: "اختاروا" }, body: { en: "Pick your flowers, plants or program.", ar: "اختاروا الزهور أو النباتات أو البرنامج." } },
          { title: { en: "Set the delivery", ar: "حدّدوا التوصيل" }, body: { en: "Choose the emirate, date and delivery window. Cut-offs are shown before you pay.", ar: "اختاروا الإمارة والتاريخ وفترة التوصيل. أوقات الإغلاق تظهر قبل الدفع." } },
          { title: { en: "Pay by card or cash", ar: "ادفعوا بالبطاقة أو نقداً" }, body: { en: "Card payments are confirmed instantly. Cash on delivery is available for eligible orders.", ar: "تُؤكَّد المدفوعات بالبطاقة فوراً. والدفع عند الاستلام متاح للطلبات المؤهلة." } },
          { title: { en: "We deliver", ar: "نوصل" }, body: { en: "You get order updates by email and a tax invoice if you asked for one.", ar: "تصلكم تحديثات الطلب بالبريد وفاتورة ضريبية إن طلبتموها." } },
        ],
      },
    },
    { type: "testimonials", data: { title: { en: "What clients say", ar: "ماذا يقول عملاؤنا" } } },
    { type: "logos", data: { title: { en: "Trusted by teams across the UAE", ar: "يثق بنا فرق عمل في أنحاء الإمارات" } } },
    { type: "faq", data: { title: { en: "Questions we are asked most", ar: "الأسئلة الأكثر شيوعاً" }, group: "all", limit: 6 } },
    {
      type: "cta",
      data: {
        title: { en: "Planning an event or a weekly program?", ar: "تخططون لفعالية أو لبرنامج أسبوعي؟" },
        body: {
          en: "Tell us the date, the place and roughly what you have in mind. We reply with a quote, usually within one working day.",
          ar: "أخبرونا بالتاريخ والمكان وما يدور في أذهانكم تقريباً. نرد بعرض سعر عادةً خلال يوم عمل.",
        },
        primary: { label: { en: "Request a quote", ar: "اطلب عرض سعر" }, href: "/corporate#quote" },
        secondary: { label: { en: "Plan an event", ar: "خططوا لفعالية" }, href: "/events#enquiry" },
      },
    },
  ]
}
