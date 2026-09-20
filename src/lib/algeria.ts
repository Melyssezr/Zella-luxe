export type DeliveryOffice = {
  id: string;
  nameFr: string;
  nameAr: string;
};

export type Wilaya = {
  code: string;
  nameFr: string;
  nameAr: string;
  offices: DeliveryOffice[];
};

/** 58 wilayas algériennes — codes et noms officiels */
export const WILAYA_NAMES: { code: string; nameFr: string; nameAr: string }[] = [
  { code: "01", nameFr: "Adrar", nameAr: "أدرار" },
  { code: "02", nameFr: "Chlef", nameAr: "الشلف" },
  { code: "03", nameFr: "Laghouat", nameAr: "الأغواط" },
  { code: "04", nameFr: "Oum El Bouaghi", nameAr: "أم البواقي" },
  { code: "05", nameFr: "Batna", nameAr: "باتنة" },
  { code: "06", nameFr: "Béjaïa", nameAr: "بجاية" },
  { code: "07", nameFr: "Biskra", nameAr: "بسكرة" },
  { code: "08", nameFr: "Béchar", nameAr: "بشار" },
  { code: "09", nameFr: "Blida", nameAr: "البليدة" },
  { code: "10", nameFr: "Bouira", nameAr: "البويرة" },
  { code: "11", nameFr: "Tamanrasset", nameAr: "تمنراست" },
  { code: "12", nameFr: "Tébessa", nameAr: "تبسة" },
  { code: "13", nameFr: "Tlemcen", nameAr: "تلمسان" },
  { code: "14", nameFr: "Tiaret", nameAr: "تيارت" },
  { code: "15", nameFr: "Tizi Ouzou", nameAr: "تيزي وزو" },
  { code: "16", nameFr: "Alger", nameAr: "الجزائر" },
  { code: "17", nameFr: "Djelfa", nameAr: "الجلفة" },
  { code: "18", nameFr: "Jijel", nameAr: "جيجل" },
  { code: "19", nameFr: "Sétif", nameAr: "سطيف" },
  { code: "20", nameFr: "Saïda", nameAr: "سعيدة" },
  { code: "21", nameFr: "Skikda", nameAr: "سكيكدة" },
  { code: "22", nameFr: "Sidi Bel Abbès", nameAr: "سيدي بلعباس" },
  { code: "23", nameFr: "Annaba", nameAr: "عنابة" },
  { code: "24", nameFr: "Guelma", nameAr: "قالمة" },
  { code: "25", nameFr: "Constantine", nameAr: "قسنطينة" },
  { code: "26", nameFr: "Médéa", nameAr: "المدية" },
  { code: "27", nameFr: "Mostaganem", nameAr: "مستغانم" },
  { code: "28", nameFr: "M'Sila", nameAr: "المسيلة" },
  { code: "29", nameFr: "Mascara", nameAr: "معسكر" },
  { code: "30", nameFr: "Ouargla", nameAr: "ورقلة" },
  { code: "31", nameFr: "Oran", nameAr: "وهران" },
  { code: "32", nameFr: "El Bayadh", nameAr: "البيض" },
  { code: "33", nameFr: "Illizi", nameAr: "إيليزي" },
  { code: "34", nameFr: "Bordj Bou Arréridj", nameAr: "برج بوعريريج" },
  { code: "35", nameFr: "Boumerdès", nameAr: "بومرداس" },
  { code: "36", nameFr: "El Tarf", nameAr: "الطارف" },
  { code: "37", nameFr: "Tindouf", nameAr: "تندوف" },
  { code: "38", nameFr: "Tissemsilt", nameAr: "تيسمسيلت" },
  { code: "39", nameFr: "El Oued", nameAr: "الوادي" },
  { code: "40", nameFr: "Khenchela", nameAr: "خنشلة" },
  { code: "41", nameFr: "Souk Ahras", nameAr: "سوق أهراس" },
  { code: "42", nameFr: "Tipaza", nameAr: "تيبازة" },
  { code: "43", nameFr: "Mila", nameAr: "ميلة" },
  { code: "44", nameFr: "Aïn Defla", nameAr: "عين الدفلى" },
  { code: "45", nameFr: "Naâma", nameAr: "النعامة" },
  { code: "46", nameFr: "Aïn Témouchent", nameAr: "عين تموشنت" },
  { code: "47", nameFr: "Ghardaïa", nameAr: "غرداية" },
  { code: "48", nameFr: "Relizane", nameAr: "غليزان" },
  { code: "49", nameFr: "Timimoun", nameAr: "تيميمون" },
  { code: "50", nameFr: "Bordj Badji Mokhtar", nameAr: "برج باجي مختار" },
  { code: "51", nameFr: "Ouled Djellal", nameAr: "أولاد جلال" },
  { code: "52", nameFr: "Béni Abbès", nameAr: "بني عباس" },
  { code: "53", nameFr: "In Salah", nameAr: "عين صالح" },
  { code: "54", nameFr: "In Guezzam", nameAr: "عين قزام" },
  { code: "55", nameFr: "Touggourt", nameAr: "تقرت" },
  { code: "56", nameFr: "Djanet", nameAr: "جانت" },
  { code: "57", nameFr: "El M'Ghair", nameAr: "المغير" },
  { code: "58", nameFr: "El Meniaa", nameAr: "المنيعة" },
];

function defaultOffices(nameFr: string, nameAr: string): DeliveryOffice[] {
  const slug = nameFr.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return [
    {
      id: `${slug}-centre`,
      nameFr: `Bureau ${nameFr} — Centre-ville`,
      nameAr: `مكتب ${nameAr} — وسط المدينة`,
    },
    {
      id: `${slug}-gare`,
      nameFr: `Bureau ${nameFr} — Gare routière`,
      nameAr: `مكتب ${nameAr} — المحطة`,
    },
    {
      id: `${slug}-commercial`,
      nameFr: `Bureau ${nameFr} — Zone commerciale`,
      nameAr: `مكتب ${nameAr} — المنطقة التجارية`,
    },
  ];
}

const EXTRA_OFFICES: Record<string, DeliveryOffice[]> = {
  "16": [
    { id: "alger-hydra", nameFr: "Bureau Alger — Hydra", nameAr: "مكتب الجزائر — حيدرة" },
    { id: "alger-bab-el-oued", nameFr: "Bureau Alger — Bab El Oued", nameAr: "مكتب الجزائر — باب الوادي" },
    { id: "alger-kouba", nameFr: "Bureau Alger — Kouba", nameAr: "مكتب الجزائر — القبة" },
    { id: "alger-dar-el-beida", nameFr: "Bureau Alger — Dar El Beïda", nameAr: "مكتب الجزائر — دار البيضاء" },
  ],
  "23": [
    { id: "annaba-centre", nameFr: "Bureau Annaba — Centre-ville", nameAr: "مكتب عنابة — وسط المدينة" },
    { id: "annaba-gare", nameFr: "Bureau Annaba — Gare routière", nameAr: "مكتب عنابة — المحطة" },
    { id: "annaba-sidi-amar", nameFr: "Bureau Annaba — Sidi Amar", nameAr: "مكتب عنابة — سيدي عmar" },
  ],
  "25": [
    { id: "constantine-centre", nameFr: "Bureau Constantine — Centre-ville", nameAr: "مكتب قسنطينة — وسط المدينة" },
    { id: "constantine-el-khroub", nameFr: "Bureau Constantine — El Khroub", nameAr: "مكتب قسنطينة — الخروب" },
    { id: "constantine-gare", nameFr: "Bureau Constantine — Gare routière", nameAr: "مكتب قسنطينة — المحطة" },
  ],
  "31": [
    { id: "oran-centre", nameFr: "Bureau Oran — Centre-ville", nameAr: "مكتب وهران — وسط المدينة" },
    { id: "oran-es-senia", nameFr: "Bureau Oran — Es Sénia", nameAr: "مكتب وهران — السانية" },
    { id: "oran-arzew", nameFr: "Bureau Oran — Arzew", nameAr: "مكتب وهران — أرzew" },
  ],
};

export const ALGERIAN_WILAYAS: Wilaya[] = WILAYA_NAMES.map(({ code, nameFr, nameAr }) => ({
  code,
  nameFr,
  nameAr,
  offices: EXTRA_OFFICES[code] ?? defaultOffices(nameFr, nameAr),
}));

export function getWilayaByCode(code: string): Wilaya | undefined {
  return ALGERIAN_WILAYAS.find((w) => w.code === code);
}

export function getWilayaLabel(wilaya: Wilaya, lang: "fr" | "ar"): string {
  const name = lang === "fr" ? wilaya.nameFr : wilaya.nameAr;
  return `${wilaya.code} — ${name}`;
}

export function getOfficeLabel(office: DeliveryOffice, lang: "fr" | "ar"): string {
  return lang === "fr" ? office.nameFr : office.nameAr;
}
