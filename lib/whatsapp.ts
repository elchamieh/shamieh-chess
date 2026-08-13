const PUBLIC_SITE = "https://shamiehchess.com";
const STUDENT_SITE = "https://app.shamiehchess.com";

export type AcademyReply = {
  intent: "tournaments" | "registration" | "schedule" | "location" | "fees" | "login" | "human" | "greeting";
  text: string;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, terms: readonly string[]) {
  return terms.some((term) => text.includes(term));
}

function isArabic(text: string) {
  return /[\u0600-\u06ff]/.test(text);
}

const TERMS = {
  human: ["admin", "human", "person", "someone", "coach", "speak to", "talk to", "مشرف", "مدرب", "شخص", "احكي", "حكي"],
  tournaments: ["tournament", "tournaments", "competition", "championship", "tournoi", "بطولة", "بطولات", "مسابقة", "دورة"],
  registration: ["register", "registration", "sign up", "signup", "join", "enroll", "enrol", "sajjel", "سجل", "تسجيل", "انتساب"],
  schedule: ["schedule", "class time", "class times", "training time", "training times", "when are classes", "مواعيد", "موعد", "دوام", "حصص", "حصة"],
  location: ["location", "locations", "address", "where are you", "where is", "saida", "beirut", "وين", "العنوان", "صيدا", "بيروت", "wen", "mahal"],
  fees: ["fees", "fee", "price", "prices", "cost", "tuition", "how much", "ade", "adde", "2adde", "رسوم", "سعر", "اسعار", "كلفة", "قديش"],
  login: ["student login", "student portal", "portal", "login", "log in", "sign in", "تسجيل الدخول", "دخول الطالب"],
  greeting: ["hello", "hi", "hey", "good morning", "good evening", "marhaba", "bonjour", "مرحبا", "السلام عليكم"],
} as const;

export function getAcademyAutoReply(input: string): AcademyReply | null {
  const text = normalize(input);
  if (!text) return null;

  let intent: AcademyReply["intent"] | null = null;
  if (hasAny(text, TERMS.human)) intent = "human";
  else if (hasAny(text, TERMS.tournaments)) intent = "tournaments";
  else if (hasAny(text, TERMS.registration)) intent = "registration";
  else if (hasAny(text, TERMS.schedule)) intent = "schedule";
  else if (hasAny(text, TERMS.location)) intent = "location";
  else if (hasAny(text, TERMS.fees)) intent = "fees";
  else if (hasAny(text, TERMS.login)) intent = "login";
  else if (hasAny(text, TERMS.greeting)) intent = "greeting";

  if (!intent) return null;

  const english: Record<AcademyReply["intent"], string> = {
    tournaments: `You can see upcoming Shamieh Chess tournaments and register here:\n${PUBLIC_SITE}/tournaments`,
    registration: `You can register a student for Shamieh Chess Academy here:\n${PUBLIC_SITE}/register\n\nTraining is available in Saida and Beirut.`,
    schedule: `The current training schedule is published here:\n${PUBLIC_SITE}/#schedule`,
    location: `Shamieh Chess Academy has locations in Saida and Beirut.\n\nDetails and registration options:\n${PUBLIC_SITE}/#locations`,
    fees: "Academy fees depend on the student's level and training program. Please send the player's age and preferred branch (Saida or Beirut), and our team will confirm the correct fee.",
    login: `Students can sign in to the Shamieh Chess portal here:\n${STUDENT_SITE}/login`,
    human: "A member of the Shamieh Chess Academy team will continue with you here. Please leave your name and question.",
    greeting: `Welcome to Shamieh Chess Academy ♟️\n\nYou can ask about registration, locations, class schedule, fees, tournaments, or student login.\n\n${PUBLIC_SITE}`,
  };

  const arabic: Record<AcademyReply["intent"], string> = {
    tournaments: `يمكنك الاطلاع على البطولات المقبلة والتسجيل عبر الرابط:\n${PUBLIC_SITE}/tournaments`,
    registration: `يمكنك تسجيل الطالب في أكاديمية شامية للشطرنج عبر الرابط:\n${PUBLIC_SITE}/register\n\nالتدريب متوفر في صيدا وبيروت.`,
    schedule: `جدول التدريبات الحالي منشور هنا:\n${PUBLIC_SITE}/#schedule`,
    location: `لأكاديمية شامية للشطرنج مواقع تدريب في صيدا وبيروت.\n\nالتفاصيل وخيارات التسجيل:\n${PUBLIC_SITE}/#locations`,
    fees: "تختلف الرسوم بحسب مستوى الطالب وبرنامج التدريب. أرسل عمر اللاعب والفرع المطلوب (صيدا أو بيروت)، وسيؤكد لك فريق الأكاديمية الرسوم المناسبة.",
    login: `يمكن للطلاب تسجيل الدخول إلى بوابة Shamieh Chess عبر الرابط:\n${STUDENT_SITE}/login`,
    human: "سيتابع معك أحد أفراد فريق أكاديمية شامية للشطرنج هنا. أرسل اسمك وسؤالك من فضلك.",
    greeting: `أهلاً بك في أكاديمية شامية للشطرنج ♟️\n\nيمكنك السؤال عن التسجيل، الفروع، مواعيد الحصص، الرسوم، البطولات أو دخول الطلاب.\n\n${PUBLIC_SITE}`,
  };

  return { intent, text: isArabic(input) ? arabic[intent] : english[intent] };
}
