/**
 * One-shot import of World Express stop-desks from client dashboard screenshots.
 * Run: npx tsx prisma/import-we-offices.ts
 */
import { PrismaClient } from "@prisma/client";

type OfficeIn = {
  code: string;
  nameFr: string;
  nameAr?: string;
  address?: string;
  phone?: string;
};

const OFFICES: OfficeIn[] = [
  // 01 Adrar
  { code: "01", nameFr: "Adrar", nameAr: "أدرار", address: "حي عيسات إيدير (الغربية) أمام مركز الشرطة", phone: "0660639399" },
  // 02 Chlef
  { code: "02", nameFr: "Chlef (P)", address: "Cité Arroudj derrière le musée Abd El Madjid Meziane", phone: "0660639689" },
  { code: "02", nameFr: "Chlef 04 Boukadir", nameAr: "بوقادير", address: "وسط المدينة مقابل مقر الدائرة", phone: "0675270478" },
  { code: "02", nameFr: "Chlef 03 Chettia", address: "Rue I annexe à côté de la pharmacie Ibrahimi", phone: "0779067912" },
  { code: "02", nameFr: "Chlef 02 Ténès", nameAr: "تنس", address: "شارع الشهداء مقابل اتصالات الجزائر", phone: "0561868816" },
  // 03 Laghouat
  { code: "03", nameFr: "Laghouat", address: "Cité Mamourah en face la maison de la culture Benkerriou", phone: "0660639776" },
  // 04 Oum El Bouaghi
  { code: "04", nameFr: "Oum El Bouaghi 02 Aïn Fakroun", nameAr: "عين فكرون", address: "بجانب ابتدائية 20 أوت وراء فندق توكاي", phone: "0660364703" },
  { code: "04", nameFr: "Oum El Bouaghi 04 Aïn El Beïda", nameAr: "عين البيضاء", address: "مقابل مقر الضمان الاجتماعي وبجانب كلينيك طاهير", phone: "0770135074" },
  { code: "04", nameFr: "Oum El Bouaghi (P)", address: "المدينة الجديدة تحت مفتشية الجمارك", phone: "0660639912" },
  { code: "04", nameFr: "Oum El Bouaghi 03 Aïn M'lila", nameAr: "عين مليلة", address: "حي الهناء طريق ثانوية مساس", phone: "0770448816" },
  // 05 Batna
  { code: "05", nameFr: "Batna 02 Barika", nameAr: "بريكة", address: "بجانب مكتب البريد بريكة", phone: "0662490755" },
  { code: "05", nameFr: "Batna (P)", address: "حي 1020 مسكن طريق la casnos (البطمة) بجانب محور الدوران", phone: "0676680995" },
  // 06 Béjaïa
  { code: "06", nameFr: "Béjaïa (P)", address: "Cité Somacob Edimco", phone: "0660639387" },
  { code: "06", nameFr: "Béjaïa 03 Tamokra", nameAr: "تامقرة" },
  { code: "06", nameFr: "Béjaïa 02 Akbou", address: "Route nationale 26 faubourg de la gare, à côté Axa assurance", phone: "0770372143" },
  // 07 Biskra
  { code: "07", nameFr: "Biskra", address: "ممرات محمد الصديق بن يحي بجانب سوق الرحمة", phone: "0660639283" },
  { code: "07", nameFr: "Biskra 02 Zeribet El Oued", nameAr: "زريبة الوادي", address: "سوق النساء بجانب صيدلية عاشوري", phone: "0655668247" },
  // 08 Béchar
  { code: "08", nameFr: "Béchar", address: "حي السلام بجانب مركز عبور الجيش الوطني (transit) بجانب السكة الحديدية", phone: "0660639123" },
  // 09 Blida
  { code: "09", nameFr: "Blida (P)", address: "470 Rue des Frères Zedri, Route de Beni Tamou", phone: "0660639818" },
  { code: "09", nameFr: "Blida 03 Mouzaïa", address: "Rue Mohamed Yesaad n°15 (rue Edalya)", phone: "0770074214" },
  { code: "09", nameFr: "Blida 02 Boufarik", address: "Résidence Bousakin local 1, boulevard Sidi Ben Youcef (route Chabli)", phone: "0770074677" },
  // 10 Bouira
  { code: "10", nameFr: "Bouira", address: "Amar Khodja à côté de la nouvelle gare routière", phone: "0660638228" },
  // 11 Tamanrasset
  { code: "11", nameFr: "Tamanrasset", address: "شارع المثقفة بجانب متوسطة عبد الوهاب عباس", phone: "0660637873" },
  // 12 Tébessa
  { code: "12", nameFr: "Tébessa", address: "حي 414 سكن بجانب مركز البريد النهضة", phone: "0660638960" },
  // 13 Tlemcen
  { code: "13", nameFr: "Tlemcen (P)", address: "El Kiffen à côté de Djezzy", phone: "0660634909" },
  { code: "13", nameFr: "Tlemcen 02 Maghnia", address: "Centre ville en face de l'ancienne prison", phone: "0770189109" },
  { code: "13", nameFr: "Tlemcen 03 Ghazaouet", address: "Remla - Hawt Amer - en allant vers le nouveau hôpital", phone: "0670862950" },
  // 14 Tiaret
  { code: "14", nameFr: "Tiaret", address: "En face le stade Kaïd Ahmed, à côté du groupement des gendarmes", phone: "0672203266 / 0671776356" },
  // 15 Tizi Ouzou
  { code: "15", nameFr: "Tizi Ouzou", address: "À 100 m du portail université Mouloud Mammeri, Bastos Nouvelle ville", phone: "0660636254" },
  { code: "15", nameFr: "Tizi Ouzou 02 Azazga", address: "Cité ADL derrière Mobilis", phone: "0784518940" },
  // 16 Alger
  { code: "16", nameFr: "Alger 06 Café Chergui (Bordj El Bahri)", address: "Café Chergui", phone: "0770057980 / 0770057981" },
  { code: "16", nameFr: "Alger 05 Birtouta", address: "Rue Mohamed Mehdi", phone: "0654834934" },
  { code: "16", nameFr: "Alger 02 El Hamiz (Dar El Beïda)", address: "Avenue El Hamiz, 1er arrêt El Hamiz", phone: "0671997011" },
  { code: "16", nameFr: "Alger 03 Raïs Hamidou", nameAr: "الرايس حميدو", address: "حي ميرمار جانب مسجد أبو ذر الغفاري", phone: "0550955165" },
  { code: "16", nameFr: "Alger 04 Chéraga", address: "Entre l'institut Pasteur et la cité militaire", phone: "0670695252 / 0660641892" },
  { code: "16", nameFr: "Alger 01 Bab Ezzouar (P)", nameAr: "باب الزوار", address: "حي الدوزي 01 مقابل المسجد أبو بكر الصديق", phone: "0660630633" },
  // 17 Djelfa
  { code: "17", nameFr: "Djelfa (P)", address: "عند مفترق الطرق حي الوئام", phone: "0660637354" },
  { code: "17", nameFr: "Djelfa 03 Aïn Oussera", address: "En face de la Banque Al Salam et du bureau d'Algérie Poste, Route de Chellala", phone: "0661717869" },
  { code: "17", nameFr: "Djelfa 02 Messaad", nameAr: "مسعد", address: "وسط مدينة مسعد بالقرب من صيدلية الشاوي", phone: "0660689839" },
  // 18 Jijel
  { code: "18", nameFr: "Jijel", address: "حي أيوف الغربي محل 63", phone: "0660636005" },
  // 19 Sétif
  { code: "19", nameFr: "Sétif (P)", address: "Cité Ouled Brahem en face mosquée 1014", phone: "0660631783" },
  { code: "19", nameFr: "Sétif 02 El Eulma", nameAr: "العلمة", address: "التساهمي الجديد بالقرب من المستشفى الجديد وراء العمارات المقابلة لمحلات حنظلة", phone: "0660638621" },
  { code: "19", nameFr: "Sétif 03 Aïn Oulmene", nameAr: "عين ولمان", address: "شارع رشيدي بعتوش (المعروف بصالح زورة) مقابل مسجد مالك بن نبي", phone: "0562658068" },
  // 20 Saïda
  { code: "20", nameFr: "Saïda", address: "شارع قروج الشيخ حي الدرب", phone: "0660638828" },
  // 21 Skikda
  { code: "21", nameFr: "Skikda", address: "عمارات فرزة طريق بويعلي بمحاذاة سوبيرات ديبون سكيكدة وسط", phone: "0660303360" },
  // 22 Sidi Bel Abbès
  { code: "22", nameFr: "Sidi Bel Abbès 02 Telagh", nameAr: "تلاغ", address: "بجانب الحديقة مقابل مدرسة عدة خيرة", phone: "0784514027" },
  { code: "22", nameFr: "Sidi Bel Abbès", address: "بن حمودة مقابل فيلات حسناوي (الطريق المؤدي إلى مسجد معاذ بن جبل)", phone: "0770732855" },
  // 24 Guelma (23 Annaba manquant dans les captures)
  { code: "24", nameFr: "Guelma", address: "Cité La Gar sous la salle des fêtes Maaoui", phone: "0660757479" },
  // 25 Constantine
  { code: "25", nameFr: "Constantine El Khroub", nameAr: "الخروب", address: "حي بوهالي مقابل حديقة صنوبر لاند أسفل محطة المسافرين خطابي", phone: "0556027082" },
  { code: "25", nameFr: "Constantine 02 Ali Mendjeli (P)", nameAr: "علي منجلي", address: "مقابل السوبيرات عالم الدار UV10 — حي 700 مسكن", phone: "0773863343 / 0771906265" },
  // 26 Médéa
  { code: "26", nameFr: "Médéa", address: "Bazar Farhat en face commissariat Bouziane", phone: "0660636279" },
  // 27 Mostaganem
  { code: "27", nameFr: "Mostaganem", address: "Salamandre à côté de la mosquée El Kods et la maison VMS", phone: "0660636694" },
  // 28 M'Sila
  { code: "28", nameFr: "M'Sila", address: "حي 500 مسكن خلف وكالة أنوار الصباح بجانب جمعية وافعلوا الخير والجمارك القديمة", phone: "0660634974" },
  { code: "28", nameFr: "M'Sila 03 Sidi Aïssa", address: "Cité 01 avril 1946 (L'Asiti)", phone: "0660843454" },
  { code: "28", nameFr: "M'Sila 02 Bou Saâda", nameAr: "بوسعادة" },
  // 29 Mascara
  { code: "29", nameFr: "Mascara", address: "طريق فوبور من جهة ليفيلا مقابل مطعم Silvano", phone: "0770041301" },
  { code: "29", nameFr: "Mascara 02 Sig", nameAr: "سيق", address: "مقابل محور دوران الشريط وراء قاعة الحفلات", phone: "0770397367" },
  // 30 Ouargla
  { code: "30", nameFr: "Ouargla", address: "جنب بيت الشباب وردة الرمال والوزيز للأفرشة", phone: "0660638327" },
  // 31 Oran
  { code: "31", nameFr: "Oran (P)", address: "16 Bd Benarbia Lahouari, Maraval", phone: "0770963996" },
  { code: "31", nameFr: "Oran 02 Bir El Djir", address: "Canastel, Hai Khmisti", phone: "0660636657" },
  // 32 El Bayadh
  { code: "32", nameFr: "El Bayadh", address: "طريق مستشفى رحماني مقابل عمارات النصر", phone: "0660593504" },
  // 33 Illizi
  { code: "33", nameFr: "Illizi", address: "حي الحدب الغربي الوفاق", phone: "0670454744" },
  { code: "33", nameFr: "Illizi 02 In Amenas", address: "Cité police proche le tribunal", phone: "0654778299" },
  // 34 Bordj Bou Arreridj
  { code: "34", nameFr: "Bordj Bou Arreridj 02 Ras El Oued", nameAr: "رأس الوادي", address: "Casnos شارع أحمد طيار بجانب", phone: "0551494597" },
  { code: "34", nameFr: "Bordj Bou Arreridj", address: "حي لاقراف بجانب محلات الحاج عمر طبي ومخبر نياش للتحاليل الطبية", phone: "0660630733" },
  // 35 Boumerdès
  { code: "35", nameFr: "Boumerdès", address: "Cité 11 décembre 1960", phone: "0660638564" },
  // 36 El Tarf
  { code: "36", nameFr: "El Tarf", address: "حي قلالي حسن بجانب ثانوية مرزوق الشريف", phone: "0660630692" },
  // 37 Tindouf
  { code: "37", nameFr: "Tindouf", address: "حي النصر جنب المدرسة الابتدائية بليلة محمد", phone: "0670936658" },
  // 38 Tissemsilt
  { code: "38", nameFr: "Tissemsilt", address: "حي علي باي بجانب مسجد بلال", phone: "0671358984" },
  // 39 El Oued
  { code: "39", nameFr: "El Oued", address: "حي 400 مسكن بجانب بنك البركة ومقابل الصندوق الوطني للتوفير والاحتياط", phone: "0660636724" },
  // 40 Khenchela
  { code: "40", nameFr: "Khenchela", address: "طريق الوزن الثقيل مقابل مدرسة الصم والبكم بجانب بوزيدي لبيع العتاد الفلاحي", phone: "0660639375" },
  // 41 Souk Ahras
  { code: "41", nameFr: "Souk Ahras", address: "Centre ville, rue de Zama derrière la résidence Walli", phone: "0660635833" },
  // 42 Tipaza
  { code: "42", nameFr: "Tipaza 02 Koléa (P)", address: "Rue d'Alger en face clinique dentaire El Siwak", phone: "0660635113" },
  { code: "42", nameFr: "Tipaza", address: "Cité 158/84 bâtiment n°3", phone: "0657872252" },
  // 43 Mila
  { code: "43", nameFr: "Mila 02 Chelghoum Laïd", nameAr: "شلغوم العيد", address: "شارع أول ماي حي العربي بن مهيدي بجانب بنك البدر", phone: "0660704363" },
  { code: "43", nameFr: "Mila", address: "طريق زغاية رقم 04 بجانب محور الدوران محطة المسافرين القديمة بمحاذاة إدارة بلدي", phone: "0660632927" },
  { code: "43", nameFr: "Mila 03 Ferdjioua", nameAr: "فرجيوة", address: "حي 200 مسكن رقم 21 بالقرب من المحكمة", phone: "0698257582" },
  // 44 Aïn Defla
  { code: "44", nameFr: "Aïn Defla 02", address: "بالقرب من محطة الحافلات طريق CNR أمام طبيب الحساسية بن يحي", phone: "0660645192" },
  { code: "44", nameFr: "Aïn Defla 03 El Attaf", nameAr: "العطاف", address: "أمام الدائرة مقابل الطبيبة زريقة و BNPG", phone: "0770649476" },
  { code: "44", nameFr: "Aïn Defla 01 Khemis Miliana (P)", nameAr: "خميس مليانة", address: "أمام محطة الحافلات طريق القايد صخت الكوندور", phone: "0660637749" },
  // 45 Naâma
  { code: "45", nameFr: "Naâma (Mécheria)", address: "مكتب المشرية محور الغزالات بجانب مكتب دجيري", phone: "0660899674" },
  { code: "45", nameFr: "Naâma 02 Aïn Sefra", nameAr: "عين الصفراء", address: "حي الصومام بجانب مقهى الشروق", phone: "0661301177" },
  // 46 Aïn Témouchent
  { code: "46", nameFr: "Aïn Témouchent (P)", address: "حي 44 مسكن جوهرة خلف مركز الشرطة 7", phone: "0660635361" },
  { code: "46", nameFr: "Aïn Témouchent 02 Béni Saf", nameAr: "بني صاف" },
  // 47 Ghardaïa
  { code: "47", nameFr: "Ghardaïa 02 Metlili", nameAr: "متليلي", address: "الحي الإداري في محلات دقة عبد الكريم", phone: "0667956614" },
  { code: "47", nameFr: "Ghardaïa (P)", address: "حاج مسعود أمام مقهى قوسطو مقابل المتوسطة", phone: "0660633874" },
  // 48 Relizane
  { code: "48", nameFr: "Relizane 02 Oued Rhiou", nameAr: "وادي رهيو", address: "حي الشهيد خليفة موساوي", phone: "0662542589" },
  { code: "48", nameFr: "Relizane (P)", address: "À côté de la grande poste", phone: "0662958284" },
  // 50 Bordj Badji Mokhtar
  { code: "50", nameFr: "Bordj Badji Mokhtar", address: "Bordj Badji Mokhtar", phone: "0660639399" },
  // 51 Ouled Djellal
  { code: "51", nameFr: "Ouled Djellal", nameAr: "أولاد جلال", address: "حي 80 مسكن رقم 21 مكرر", phone: "0552419623" },
  // 53 In Salah
  { code: "53", nameFr: "In Salah", address: "وسط المدينة بجانب صيدلية شريفي", phone: "0660631385" },
  // 55 Touggourt
  { code: "55", nameFr: "Touggourt", address: "Touggourt", phone: "0672504089" },
  // 56 Djanet
  { code: "56", nameFr: "Djanet", address: "إفري حي الشموع، الشارع قبل مديرية التجارة", phone: "0698066016" },
  // 58 El Meniaa
  { code: "58", nameFr: "El Meniaa", address: "قريب رومبوا حمزة طريق حفرة العباس", phone: "0654480215" },
];

function displayName(o: OfficeIn): { nameFr: string; nameAr: string; address: string | null } {
  const nameFr = o.address ? `${o.nameFr} — ${o.address}` : o.nameFr;
  const nameAr = o.nameAr
    ? o.address
      ? `${o.nameAr} — ${o.address}`
      : o.nameAr
    : nameFr;
  return {
    nameFr: nameFr.slice(0, 500),
    nameAr: nameAr.slice(0, 500),
    address: o.address?.slice(0, 500) ?? null,
  };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const wilayas = await prisma.wilaya.findMany({ select: { id: true, code: true } });
    const byCode = new Map(wilayas.map((w) => [w.code, w.id]));

    const missingCodes = [...new Set(OFFICES.map((o) => o.code))].filter((c) => !byCode.has(c));
    if (missingCodes.length) {
      console.error("Wilayas manquantes en DB:", missingCodes.join(", "));
      process.exit(1);
    }

    await prisma.deliveryOffice.deleteMany();

    let created = 0;
    for (const o of OFFICES) {
      const wilayaId = byCode.get(o.code)!;
      const names = displayName(o);
      await prisma.deliveryOffice.create({
        data: {
          wilayaId,
          nameFr: names.nameFr,
          nameAr: names.nameAr,
          address: names.address,
          active: true,
        },
      });
      created += 1;
    }

    console.log(`OK: ${created} bureaux World Express importés.`);
    console.log(
      "Manquants dans les captures (à ajouter plus tard): 23 Annaba, 49 Timimoun, 52 Béni Abbès, 54 In Guezzam, 57 El M'Ghair — et détails incomplets Tamokra / Béni Saf / Bou Saâda."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
