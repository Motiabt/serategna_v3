import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'en' | 'am' | 'om';

type Entry = { en: string; am: string; om: string };
type Dict = Record<string, Entry>;

// ─────────────────────────────────────────────────────────────────────────────
// Trilingual UI dictionary — English · አማርኛ (Amharic) · Afaan Oromoo (Oromo).
// Keys are grouped by surface. Every string the user can see should resolve here
// so the language switcher localizes the *entire* UI, not just fragments.
// ─────────────────────────────────────────────────────────────────────────────
const T: Dict = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  appName: { en: 'Serategna', am: 'ሰራተኛ', om: 'Serategna' },
  tagline: {
    en: 'Work · Build credit · Thrive',
    am: 'ሥራ · ብድር ይገንቡ · ይበልጽጉ',
    om: 'Hojii · Liqii ijaaru · Guddadhu',
  },
  hello: { en: 'Hello', am: 'ሰላም', om: 'Akkam' },

  // ── Bottom navigation ────────────────────────────────────────────────────────
  home: { en: 'Home', am: 'መነሻ', om: 'Mana' },
  jobs: { en: 'Jobs', am: 'ሥራዎች', om: 'Hojiiwwan' },
  score: { en: 'Score', am: 'ነጥብ', om: 'Qabxii' },
  wallet: { en: 'Wallet', am: 'ቦርሳ', om: 'Boorsaa' },
  profile: { en: 'Profile', am: 'መገለጫ', om: 'Profaayilii' },
  browse: { en: 'Browse', am: 'ይፈልጉ', om: 'Barbaadi' },
  post: { en: 'Post a job', am: 'ሥራ ይለጥፉ', om: 'Hojii maxxansi' },
  myJobs: { en: 'My Jobs', am: 'የእኔ ሥራዎች', om: 'Hojiiwwan koo' },

  // ── Common actions / words ───────────────────────────────────────────────────
  cancel: { en: 'Cancel', am: 'ይቅር', om: 'Dhiisi' },
  close: { en: 'Close', am: 'ዝጋ', om: 'Cufi' },
  save: { en: 'Save', am: 'አስቀምጥ', om: "Olkaa'i" },
  confirm: { en: 'Confirm', am: 'አረጋግጥ', om: 'Mirkaneessi' },
  continueWord: { en: 'Continue', am: 'ቀጥል', om: 'Itti fufi' },
  back: { en: 'Back', am: 'ተመለስ', om: "Deebi'i" },
  next: { en: 'Next', am: 'ቀጣይ', om: 'Itti aanu' },
  submit: { en: 'Submit', am: 'አስገባ', om: 'Galchi' },
  loading: { en: 'Loading…', am: 'በመጫን ላይ…', om: "Fe'aa jira…" },
  logout: { en: 'Log out', am: 'ውጣ', om: "Ba'i" },
  language: { en: 'Language', am: 'ቋንቋ', om: 'Afaan' },
  search: { en: 'Search', am: 'ፈልግ', om: 'Barbaadi' },
  allWord: { en: 'All', am: 'ሁሉም', om: 'Hunda' },
  optional: { en: 'optional', am: 'አማራጭ', om: 'filannoo' },
  remove: { en: 'Remove', am: 'አስወግድ', om: 'Balleessi' },
  edit: { en: 'Edit', am: 'አስተካክል', om: 'Gulaali' },
  retry: { en: 'Try again', am: 'እንደገና ሞክር', om: "Irra deebi'ii yaali" },
  viewAll: { en: 'View all', am: 'ሁሉንም ይመልከቱ', om: 'Hunda ilaali' },
  call: { en: 'Call', am: 'ደውል', om: 'Bilbili' },
  messageOptional: { en: 'Message (optional)', am: 'መልዕክት (አማራጭ)', om: 'Ergaa (filannoo)' },

  // ── Auth ─────────────────────────────────────────────────────────────────────
  signIn: { en: 'Sign in', am: 'ግባ', om: 'Seeni' },
  signUp: { en: 'Create account', am: 'መለያ ይፍጠሩ', om: 'Herrega uumi' },

  // ── Worker home / earnings ───────────────────────────────────────────────────
  todaysSummary: { en: "Today's Summary", am: 'የዛሬ ማጠቃለያ', om: 'Cuunfaa Har’aa' },
  earnings: { en: 'Earnings', am: 'ገቢ', om: 'Galii' },
  withdrawable: { en: 'Available to withdraw', am: 'ለማውጣት የሚገኝ', om: 'Baasuuf jiru' },
  inEscrow: { en: 'Held in escrow', am: 'በዋስትና ተይዟል', om: 'Eegumsa keessa' },
  withdraw: { en: 'Withdraw', am: 'አውጣ', om: 'Baasi' },
  startSession: { en: "Start Today's Session", am: 'የዛሬ ክፍለ ጊዜ ጀምር', om: 'Sagantaa har’aa jalqabi' },
  nearbyJobs: { en: 'Jobs near you', am: 'በአቅራቢያ ያሉ ሥራዎች', om: 'Hojiiwwan naannoo kee' },
  creditEligible: { en: 'Credit-Eligible', am: 'ለብድር ብቁ', om: 'Liqiif gahaa' },
  verified: { en: 'Verified', am: 'የተረጋገጠ', om: 'Mirkanaa’e' },

  // ── Engagement / habit loop (behavioural economics) ──────────────────────────
  dayStreak: { en: 'day streak', am: 'ተከታታይ ቀን', om: 'guyyaa walitti aanaa' },
  streakKeepGoing: { en: 'Keep it going', am: 'ቀጥልበት', om: 'Itti fufi' },
  streakAtRisk: { en: 'Your streak ends tonight — check in to keep it', am: 'ተከታታይነትህ ዛሬ ማታ ያበቃል — ለመጠበቅ ግባ', om: "Walitti aansaan kee har'a galgala dhaabata — eeguuf seeni" },
  weeklyGoal: { en: 'Weekly goal', am: 'ሳምንታዊ ግብ', om: 'Galma torbanaa' },
  setWeeklyGoal: { en: 'Set a weekly goal', am: 'ሳምንታዊ ግብ አስቀምጥ', om: "Galma torbanaa kaa'i" },
  goalThisWeek: { en: 'this week', am: 'በዚህ ሳምንት', om: 'torban kana' },
  daysLeft: { en: 'days left', am: 'ቀናት ቀርተዋል', om: 'guyyaa hafe' },
  almostThere: { en: 'Almost there!', am: 'ልታደርሰው ተቃርበሃል!', om: 'Dhiyaatteerta!' },
  goalReached: { en: 'Goal reached 🎉', am: 'ግብ ተሳክቷል 🎉', om: 'Galmni gahe 🎉' },
  newJobsForYou: { en: 'new jobs matched for you', am: 'ለአንተ የተዛመዱ አዲስ ሥራዎች', om: 'hojiiwwan haaraa siif wal simatan' },
  peopleHiringNow: { en: 'employers hiring near you right now', am: 'አሁን በአቅራቢያህ የሚቀጥሩ', om: 'amma naannoo kee kan qacaran' },
  youAreClose: { en: "You're one job away from the next badge", am: 'ለቀጣዩ ባጅ አንድ ሥራ ብቻ ቀርቶሃል', om: 'Badhaasa itti aanuuf hojii tokko qofa sitti hafe' },
  ptsToCreditEligible: { en: 'pts to Credit-Eligible', am: 'ነጥብ ለብድር ብቁ ይቀራል', om: 'qabxii Liqiif gahaa hafe' },
  checkInToday: { en: 'Check in today', am: 'ዛሬ ግባ', om: "Har'a seeni" },
  ofGoal: { en: 'of goal', am: 'ከግቡ', om: 'galma irraa' },
  yourWeek: { en: 'Your week', am: 'የሳምንትህ', om: 'Torban kee' },
  enterWeekGoal: { en: 'Set your weekly earnings goal (ETB)', am: 'ሳምንታዊ የገቢ ግብህን አስገባ (ብር)', om: 'Galma galii torbanaa kee galchi (ETB)' },

  // ── Enterprise console ───────────────────────────────────────────────────────
  enterprise: { en: 'Enterprise', am: 'ድርጅት', om: 'Dhaabbata' },
  enterpriseConsole: { en: 'Enterprise console', am: 'የድርጅት ኮንሶል', om: 'Konsoolii dhaabbataa' },
  noEnterpriseAccount: { en: 'No enterprise account', am: 'የድርጅት መለያ የለም', om: 'Herrega dhaabbataa hin jiru' },
  enterpriseProvisioned: {
    en: 'Enterprise consoles are provisioned on a signed agreement — talent pools, manager seats and bulk hiring.',
    am: 'የድርጅት ኮንሶሎች በተፈረመ ስምምነት ይዘጋጃሉ — የሰው ኃይል ክምችት፣ የአስተዳዳሪ መቀመጫዎች እና በብዛት መቅጠር።',
    om: "Konsoolonni dhaabbataa waliigaltee mallattaa'een qophaa'u — kuusaa ogeessaa, teessoo bulchaa fi qacarrii baay'inaan.",
  },
  seeEnterprisePackages: { en: 'See enterprise packages', am: 'የድርጅት ጥቅሎችን ይመልከቱ', om: 'Paakeejii dhaabbataa ilaali' },
  teamAndRoles: { en: 'Team & roles', am: 'ቡድን እና ሚናዎች', om: 'Garee fi gahee' },
  addSeat: { en: 'Add seat', am: 'መቀመጫ ጨምር', om: 'Teessoo dabali' },
  postedRoles: { en: 'Posted roles', am: 'የተለጠፉ ሥራዎች', om: 'Hojiiwwan maxxanfaman' },
  postRole: { en: 'Post role', am: 'ሥራ ለጥፍ', om: 'Hojii maxxansi' },
  noRolesYet: { en: 'No roles posted yet.', am: 'እስካሁን የተለጠፈ ሥራ የለም።', om: 'Hanga ammaa hojiin maxxanfame hin jiru.' },
  privateTalentPool: { en: 'Private talent pool', am: 'የግል የሰው ኃይል ክምችት', om: 'Kuusaa ogeessa dhuunfaa' },
  talentPoolEmpty: { en: 'Save vetted workers here to re-hire fast.', am: 'በፍጥነት ለመቅጠር የተረጋገጡ ሠራተኞችን እዚህ ያስቀምጡ።', om: 'Hojjettoota mirkanaa’an saffisaan deebisanii qacaruuf asitti olkaa’i.' },
  seatsLabel: { en: 'Seats', am: 'መቀመጫዎች', om: 'Teessoowwan' },
  talentPoolLabel: { en: 'Talent pool', am: 'የሰው ኃይል', om: 'Kuusaa ogeessaa' },
  postedLabel: { en: 'Posted', am: 'ተለጠፈ', om: 'Maxxanfame' },
  planLabel: { en: 'plan', am: 'ጥቅል', om: 'paakeejii' },
  accountAdmin: { en: 'Account admin', am: 'የመለያ አስተዳዳሪ', om: 'Bulchaa herregaa' },
  managerRole: { en: 'Manager', am: 'አስተዳዳሪ', om: 'Bulchaa' },
  agreementProvisioned: { en: 'role access provisioned', am: 'የሚና መዳረሻ ተዘጋጅቷል', om: 'gahee seensaa qophaa’eera' },
  applicantsCount: { en: 'applicants', am: 'አመልካቾች', om: 'iyyattoota' },
  provisionSeat: { en: 'Provision a manager seat', am: 'የአስተዳዳሪ መቀመጫ አዘጋጅ', om: 'Teessoo bulchaa qopheessi' },
  provisionSeatHelp: {
    en: 'Grant a Serategna user manager access. They must already have an account.',
    am: 'ለሰራተኛ ተጠቃሚ የአስተዳዳሪ መዳረሻ ይስጡ። አስቀድሞ መለያ ሊኖራቸው ይገባል።',
    om: 'Fayyadamaa Serategna tokkoof seensa bulchaa kenni. Duraan herrega qabaachuu qabu.',
  },
  theirPhone: { en: 'Their phone', am: 'ስልካቸው', om: 'Bilbila isaanii' },
  titleOptional: { en: 'Title (optional)', am: 'ማዕረግ (አማራጭ)', om: 'Mata-duree (filannoo)' },
  grantRoleAccess: { en: 'Grant role access', am: 'የሚና መዳረሻ ስጥ', om: 'Seensa gahee kenni' },
  category: { en: 'Category', am: 'ምድብ', om: 'Ramaddii' },
  roleTitle: { en: 'Role title', am: 'የሥራ ርዕስ', om: 'Mata-duree hojii' },
  positions: { en: 'Positions', am: 'ቦታዎች', om: 'Iddoowwan' },
  payRate: { en: 'Pay rate', am: 'የክፍያ መጠን', om: 'Sa’aatii kaffaltii' },
  minWageNote: {
    en: 'Minimum wage is enforced; posts go live immediately to matched workers.',
    am: 'ዝቅተኛ ደመወዝ ይተገበራል፤ ልጥፎች ወዲያውኑ ለተዛመዱ ሠራተኞች ይታያሉ።',
    om: 'Mindaan gadi aanaan ni hojjeta; maxxansi battalumatti hojjettoota wal-simataniif mul’ata.',
  },
  removeSeatConfirm: { en: 'Remove this manager seat?', am: 'ይህን የአስተዳዳሪ መቀመጫ ላስወግድ?', om: 'Teessoo bulchaa kana nan balleessaa?' },
  closePostingConfirm: { en: 'Close this posting?', am: 'ይህን ልጥፍ ልዝጋ?', om: 'Maxxansa kana nan cufaa?' },

  // ── ATS pipeline (applicants modal) ──────────────────────────────────────────
  applicantsTitle: { en: 'Applicants', am: 'አመልካቾች', om: 'Iyyattoota' },
  atsAll: { en: 'All', am: 'ሁሉም', om: 'Hunda' },
  atsApplied: { en: 'Applied', am: 'አመለከተ', om: 'Iyyate' },
  atsShortlisted: { en: 'Shortlisted', am: 'ተመረጠ', om: 'Filatame' },
  atsInterview: { en: 'Interview', am: 'ቃለ መጠይቅ', om: 'Af-gaaffii' },
  atsOffer: { en: 'Offer', am: 'ማቅረቢያ', om: 'Dhiyeessii' },
  atsHired: { en: 'Hired', am: 'ተቀጠረ', om: 'Qacarame' },
  atsDeclined: { en: 'Declined', am: 'ውድቅ', om: 'Didame' },
  atsNotified: { en: 'Applicant notified', am: 'አመልካች ተነግሮታል', om: 'Iyyataaf beeksifame' },
  noApplicantsYet: { en: 'No applicants yet.', am: 'እስካሁን አመልካች የለም።', om: 'Hanga ammaa iyyataan hin jiru.' },
  seedDemoApplicants: { en: 'Add demo applicants', am: 'የሙከራ አመልካቾች ጨምር', om: 'Iyyattoota agarsiisaa dabali' },
  filledWord: { en: 'filled', am: 'ተሞልቷል', om: 'guutame' },
  shortlistBtn: { en: 'Shortlist', am: 'ምረጥ', om: 'Filadhu' },
  scheduleInterviewBtn: { en: 'Schedule interview', am: 'ቃለ መጠይቅ ያዘጋጁ', om: 'Af-gaaffii beellami' },
  sendOfferBtn: { en: 'Send offer', am: 'ማቅረቢያ ላክ', om: 'Dhiyeessii ergi' },
  markHiredBtn: { en: 'Mark hired', am: 'እንደተቀጠረ መዝግብ', om: 'Qacarame jedhii galmeessi' },
  declineBtn: { en: 'Decline', am: 'ውድቅ አድርግ', om: 'Didi' },
  declineReason: { en: 'Reason for declining (optional)', am: 'የመከልከያ ምክንያት (አማራጭ)', om: 'Sababa diiguu (filannoo)' },
  offerMessage: { en: 'Offer message (optional)', am: 'የማቅረቢያ መልዕክት (አማራጭ)', om: 'Ergaa dhiyeessii (filannoo)' },
  interviewWhen: { en: 'Interview date & time', am: 'የቃለ መጠይቅ ቀን እና ሰዓት', om: 'Guyyaa fi sa’aa af-gaaffii' },
  modeInPerson: { en: 'In person', am: 'በአካል', om: 'Qaamaan' },
  modePhone: { en: 'Phone', am: 'በስልክ', om: 'Bilbilaan' },
  modeVideo: { en: 'Video', am: 'በቪዲዮ', om: 'Viidiyoon' },
  emailInvite: { en: 'Send invite', am: 'ግብዣ ላክ', om: 'Affeerraa ergi' },
  callApplicant: { en: 'Call applicant', am: 'ለአመልካች ደውል', om: 'Iyyataaf bilbili' },
  onboardingTitle: { en: 'Onboarding checklist', am: 'የማስጀመሪያ ዝርዝር', om: 'Galmee jalqabaa' },
  interviewScheduled: { en: 'Interview scheduled', am: 'ቃለ መጠይቅ ተይዟል', om: 'Af-gaaffiin beellame' },
  onbId: { en: 'ID & Fayda verified', am: 'መታወቂያ እና ፋይዳ ተረጋግጧል', om: 'ID fi Fayda mirkanaa’e' },
  onbContract: { en: 'Contract signed', am: 'ውል ተፈርሟል', om: 'Waliigalteen mallattaa’e' },
  onbStart: { en: 'Start date confirmed', am: 'የመጀመሪያ ቀን ተረጋግጧል', om: 'Guyyaan jalqabaa mirkanaa’e' },
  onbOrientation: { en: 'Orientation completed', am: 'ኦሬንቴሽን ተጠናቋል', om: 'Qajeelfamni xumurame' },

  // ── Score / income verification / certificate ────────────────────────────────
  scoreTitle: { en: 'Serategna Score', am: 'የሰራተኛ ነጥብ', om: 'Qabxii Serategna' },
  verifyIncomeTitle: { en: 'Verify income', am: 'ገቢ አረጋግጥ', om: 'Galii mirkaneessi' },
  verifiedTotalIncome: { en: 'Verified total income', am: 'የተረጋገጠ ጠቅላላ ገቢ', om: "Galii waliigalaa mirkanaa’e" },
  monthlyEstimate: { en: 'Monthly estimate', am: 'ወርሃዊ ግምት', om: "Tilmaama ji’aa" },
  completionRateLabel: { en: 'Completion rate', am: 'የማጠናቀቅ መጠን', om: 'Sadarkaa xumuraa' },
  disputeRateLabel: { en: 'Dispute rate', am: 'የክርክር መጠን', om: 'Sadarkaa falmii' },
  jobsCompletedLabel: { en: 'Jobs completed', am: 'የተጠናቀቁ ሥራዎች', om: 'Hojiiwwan xumuraman' },
  memberSince: { en: 'Member since', am: 'አባል ከ', om: 'Miseensa erga' },
  forLenders: { en: 'For lenders', am: 'ለአበዳሪዎች', om: 'Liqeessitootaaf' },
  signedTamperEvident: { en: 'Signed · tamper-evident', am: 'የተፈረመ · ማጭበርበር የሚያጋልጥ', om: "Mallattaa’e · sobni ifa ta’a" },
  checkAuthenticity: { en: 'Check authenticity', am: 'ትክክለኛነት አረጋግጥ', om: 'Dhugaa mirkaneessi' },
  reportAuthentic: { en: 'Authentic', am: 'ትክክለኛ', om: 'Dhugaa' },
  reportNotAuthentic: { en: 'Not authentic', am: 'ትክክለኛ አይደለም', om: 'Dhugaa miti' },
  reportNotFound: { en: 'Not found', am: 'አልተገኘም', om: 'Hin argamne' },
  finalize: { en: 'Finalize', am: 'አጠናቅ', om: 'Xumuri' },
  preset: { en: 'Preset', am: 'ቅድመ-ቅንብር', om: "Qophaa’aa" },
  doc: { en: 'Document', am: 'ሰነድ', om: 'Sanada' },
  script: { en: 'Script', am: 'ስክሪፕት', om: 'Skiriptii' },
};

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof T) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    (localStorage.getItem('srt_lang') as Lang) || 'en',
  );
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('srt_lang', l);
    // Reflect language on <html> for font-stack / accessibility tooling.
    document.documentElement.lang = l;
  };
  const t = (key: keyof typeof T) => T[key]?.[lang] ?? T[key]?.en ?? String(key);
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n outside provider');
  return ctx;
}

/** Pick the localized field from a trilingual object (taxonomy categories/roles). */
export function loc(obj: { en?: string; am?: string; om?: string } | undefined | null, lang: Lang): string {
  if (!obj) return '';
  return (lang === 'am' ? obj.am : lang === 'om' ? obj.om : obj.en) || obj.en || '';
}

export const LANGS: { key: Lang; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'am', label: 'አማርኛ' },
  { key: 'om', label: 'Afaan Oromoo' },
];
