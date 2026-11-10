/**
 * The word filter for names typed for online rooms (PLAN-web-online.md §B9,
 * D11): profanity, sexual words and slurs in English and the app's languages.
 * The room server runs it on every name that comes in (it is the trust
 * boundary: the web game can be changed): a name it refuses is dropped, so
 * the seat shows its animal. The app runs it first, to say so before sending.
 * Pass-and-play names never come here: they never leave the device.
 *
 * A name is folded first: NFKD, lower case, accents and Arabic / Hebrew vowel
 * points off (Indic and Thai vowel signs stay: there they are letters), a few
 * letters that NFKD keeps (ß, ı, đ, ł, ø, æ, Persian / Urdu forms of Arabic
 * letters), leetspeak (0 o, 1 i or l, 3 e, 4 a, 5 s, 7 t, @ a, $ s, ! i), and
 * zero-width, bidi and other invisible characters removed. Spaces, punctuation
 * and emoji then split it into words. Two lists:
 *
 *   WORDS  match a whole word, or the whole name with its words run together
 *          ("D I C K", "a.s.s"). Short words, and words that are also inside
 *          real names: "Scunthorpe", "Hancock", "Arsenal", "Cumming",
 *          "Pornchai", "Yoshitaka" and "Matsushita" pass.
 *   ROOTS  match anywhere in the name run together: long, unmistakable roots
 *          ("fuck" in "motherfucker", "f u c k", "xXfuckXx").
 *
 * A letter may repeat: a ROOT letter any number of times ("fuuuck"); a WORD
 * letter once or three times and more ("shiiit"), so a doubled letter in a
 * real name ("Buzzi", "Kukk", "Pulla") is not read as a stretched word.
 *
 * A name that is also a word here is passed when it is a real family name
 * somewhere (Lund, Randi, Butt, Fanny, Peder, Concha, Marica, Amina, Kutti):
 * the host's removal covers the rest. Lists written by hand for this app.
 *
 * Pure TypeScript, no \p{...} and no `u` flag (Hermes); every entry is in the BMP.
 */

const WORDS = `
  ass asses arse arses shit shits shitty shitter crap piss pissed pisser cunt cunts cunty
  cock cocks dick dicks pussy pussies twat twats wank wanks tit tits titty titties boob
  boobs boobies nipple nipples penis penises cum clit anal anus orgy porn porno xxx milf
  horny sexy sex slut sluts slutty skank pimp rape raped rapist pedo paedo nazi nazis kkk
  coon chink gook spic spick kike kyke paki fag fags fagot tranny spaz prick pricks fuk fuq
  fck fcuk mofo wtf stfu gtfo kys sperm beaner dildo dildos

  puta putas puto putos hdp ctm porra foda foder viado bosta cacete krl vsf pqp fdp vtnc
  polla zorra perra pichula
  merde merdes pute bite chatte foutre chier pede tapette negre nique salaud petasse teub
  zob ntm
  cazzo cazzi cazzone culo figa fica troia
  arsch hure neger schwanz kacke spast fickt
  kut lul tering tyfus hoer slet teef flikker mongool
  kuk knull pikk fitte fittor fisse kaelling kneppe kneppet
  vittu vittua vitun paska pillu
  amk aq sik yarak ibne pic
  dupa cipa cipka szmata ciota pedal huj
  pica picus kokot kokoti curak sukat negr picka picku kurca kurcu kurcina jebi drek kurba
  geci szar buzi basz anyad segg
  pula muie futu futut fut curva cacat
  μαλακας μαλακες malakas γαμω gamw μουνι mouni αρχιδι αρχιδια σκατα skata πουτσα poutsa
  бля блядь сука суки сучка манда чмо хер ебу секс жид жиды чурка педик срака дупа
  memek ngewe entot pepek puki pantat kimak perek bencong pundek tetek toket titit sange
  dit ditme dmm dcm dkm vcl vkl clgt cac buoi
  chutiya chutiye bsdk gandu gaand lodu lavda lawda raand harami chinal jhaat jhant kutiya
  chod chodu choot chut mkc bkl lavde jhatu khanki choda lanja dengu oombu oombi myre myru
  gashti
  chinko chinpo manko sibal ssibal shibal byungsin byeongsin nmsl cnm kosom zebbi kahba
  khawal

  くそ クソ しね ころす ガイジ チョン ヘンタイ
  보지 자지 걸레 애미 니미 ㅅㅂ ㅆㅂ ㅂㅅ
  หี สัส แตด
  كس زب نيك خول لوطي عرص
  כוס כוסית זין חרא מניאק כושי ערבוש
  گانڈ لنڈ کتی
  गांड लंड झाट कुतिया रांड चुत चूत लौड़ा लौडा लौड़े झवाड्या
  ગાંડ લોડો લોડા
  ਗਾਂਡ ਕੁੱਤੀ ਲੁੱਲ ਲੌੜਾ ਗਸ਼ਤੀ
  মাগি মাগী গুদ ধোন বাল
  ବିଆ ବାଣ୍ଡ ମାଗି ହାରାମୀ
  మడ్డ గుద్ద ముండ
  பூல்
`;

const ROOTS = `
  fuck fvck phuck motherf bitch biatch bastard asshole arsehole dumbass jackass bullshit
  shithead shitface shithole dipshit horseshit cocksuck dickhead dickface whore wanker
  wanking nigger nigga niggah faggot vagina jizz cumshot cumslut blowjob handjob rimjob
  butthole buttplug orgasm masturbat pornhub clitoris pedophil paedophil incest
  bestiality hitler retard wetback raghead towelhead douchebag jerkoff bollocks bollox
  bellend

  pendej cabron chingad chingar joder mierda culero maricon gilipolla hijodeputa follar
  mamaguevo malparid conchetuma culiao collons malparit filldeputa
  caralh buceta boceta xoxota piroca punheta arrombad fodase fodasse fodid cuzao paunocu
  filhodaputa
  putain salope connard connasse encule niquetamere filsdepute couille batard bougnoul
  branleur branlette pouffiass nichon enfoire
  fanculo stronz minchia coglion puttan zoccol mignott frocio ricchion porcodio
  porcamadonna diocane pompino merda
  scheiss fotze ficken ficker gefickt fickdich arschloch wichser wixer hurensohn schlampe
  schwuchtel kanake missgeburt pimmel titten votze siegheil bumsen
  klootzak kanker neuken godverdom kutwijf
  fitta kukjavel knulla knulle javla horunge rovhul
  kyrpa huora mulkku neekeri runkkari kusipaa
  orospu siktir sikeyim sikerim sikis sikik yarrak amcik kahpe pezevenk gotveren yavsak
  aminakoyim aminakoyayim
  kurw chuj pierdol jebac jebany jebana zajeb pizd dziwk
  kurv picov prdel hovno zmrd mrdat mrdka jebat buzerant
  kurac jebem jebote jebiga govno sranje seronj
  fasz picsa baszd baszo baszn seggfej kocsog ribanc
  bulangiu poponar labagiu sugipula
  γαμησου γαμιεσαι γαμημεν πουτανα πουστη καριολη gamiese poutana poustis
  хуй хуя хуев хуесос хуил пизд ебан ебат ебал ебло уеб заеб бляд блят мудак мудил пидор
  пидар пидр залуп шлюх гондон дерьм говн жопа сучар дрочи трахат трахну трахал ниггер
  курва йобан ібати шльондр підар підор
  bangsat kontol ngentot jembut pukima lancau sundal pelacur bajingan lonte jancok jancuk
  dancok cibai bokep
  ditmemay concac vailon dumemay
  madarchod maderchod madarchot behenchod bhenchod benchod bhenchot bhosd bhosad haramzad
  haramkhor bhadwa bhadwe bhadve bhadva bakchod zavady zhavady aighalya phuddi fuddi
  bokachod thevdiy thevidiy thevudiy pundai koothi lanjakod bolimaga sulemag thayoli
  poorimon maakichut makichut
  caonima sharmout sharmut kosomak metnak kusemek kusemak benzona

  ちんこ チンコ ちんぽ チンポ まんこ マンコ セックス せっくす おっぱい オッパイ ファック ビッチ レイプ
  れいぷ 死ね 殺す きちがい キチガイ 気違い 売春 淫乱 強姦 ヤリマン 肉便器
  操你 肏 屌 屄 傻逼 傻屄 煞笔 鸡巴 雞巴 婊子 妓女 他妈的 他媽的 你妈的 你媽的 妈逼 媽逼 王八蛋
  贱人 賤人 骚货 騷貨 淫 色情 做爱 做愛 强奸 強姦 强暴 強暴 草泥马 草泥馬 狗日 日你 干你 幹你
  机掰 機掰 屁眼 支那 黑鬼 阴道 陰道 阴茎 陰莖 死全家 去死 日本鬼子
  씨발 시발 씨바 씨팔 시팔 병신 좆 존나 개새끼 개새기 새끼 미친놈 미친년 썅 섹스 창녀 느금마 엠창
  개년 쌍년
  เหี้ย ควย เย็ด ไอ้สัตว์ อีดอก ระยำ กะหรี่ ชิบหาย ส้นตีน จัญไร อีตัว เงี่ยน
  شرموط عاهر منيوك متناك قحب كسمك كسامك انيكك نيكمك طيز يلعن ابنالكلب معرص داعر سكس
  نياكه
  זונה מזדיין תזדיין שרמוטה זיון סקס
  چود حرامی گانڈو چوتیا رنڈی گشتی بھڑوا پھدی
  चूतिया चुतिया चूतिये चोद भोसड गांडू रंडी रण्डी हरामी हरामजाद छिनाल भड़व भडव आयघाल लवडा
  ચોદ ભોસડ ભોસ્ડ લૌડા રંડી ચુતિયા હરામી ભડવ
  ਚੋਦ ਫੁੱਦੀ ਫੁਦੀ ਰੰਡੀ ਹਰਾਮੀ ਭੜੂਆ
  চোদ চুদ খানকি বাঁড়া হারামি শুয়োরেরবাচ্চা বেশ্যা
  ଚୋଦ ଗାଣ୍ଡି ରଣ୍ଡି ବେଶ୍ୟା
  దెంగ లంజ పూకు
  ஓத்த ஓம்மால ஒம்மால தேவடியா தேவிடியா புண்டை சுன்னி கூதி
  ಸೂಳೆ ತುಣ್ಣೆ ಬೋಳಿಮಗ ತುಲ್ಲು ಬೇವರ್ಸಿ
  പൂറ കുണ്ണ മൈര മയിര തായോളി കഴുവേറി ഊമ്പ കൂതി
`;

/** accents and vowel points, once NFKD has split them off; Arabic tatweel */
const MARKS = /[̀-֑ͯ-ׇؐ-ؚـً-ٰٟ]/g;
/** soft hyphen, joiners, bidi marks and isolates, variation selectors, BOM, Hangul fillers */
const INVISIBLE = /[­͏؜ᅟᅠ᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]/g;
/** spaces, punctuation and symbols, and anything outside the BMP (emoji) */
const SEP = /(?:[\s!-\/:-@\[-`{-~¡-¿×÷‐-⁞←-⯿　-〿・]|[\ud800-\udbff][\udc00-\udfff])+/;
const FOLD: Record<string, string> = {
  ß: 'ss', ı: 'i', đ: 'd', ł: 'l', ø: 'o', æ: 'ae', ς: 'σ',
  ک: 'ك', ی: 'ي', ى: 'ي', ہ: 'ه', ھ: 'ه', ة: 'ه',
  0: 'o', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i',
};
const FOLDS = new RegExp(`[${Object.keys(FOLD).join('').replace(/[$\]\\^-]/g, '\\$&')}]`, 'g');

/** The name's words, folded, once with 1 read as i and once as l. */
function forms(name: string): string[][] {
  let s = name;
  try {
    s = s.normalize('NFKD');
  } catch {
    /* no normalize: accents stay, the rest still works */
  }
  s = s.toLowerCase().replace(MARKS, '').replace(INVISIBLE, '').replace(FOLDS, (c) => FOLD[c]);
  try {
    s = s.normalize('NFC'); // Hangul syllables and kana back together
  } catch {
    /* as above */
  }
  return ['i', 'l'].map((one) => s.replace(/1/g, one).split(SEP).filter(Boolean));
}

/** A list as one regex alternation; each letter may repeat (see the top). */
function pattern(list: string, stretch: boolean): string {
  return list
    .trim()
    .split(/\s+/)
    .map((w) =>
      forms(w)[0]
        .join('')
        .replace(/(.)\1*/g, (run) => {
          const c = run[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return run.length > 1 ? `${c}{${run.length},}` : stretch ? `${c}+` : `${c}(?:${c}${c}+)?`;
        }),
    )
    .join('|');
}

const WORD = new RegExp(`^(?:${pattern(WORDS, false)})$`);
const ROOT = new RegExp(pattern(ROOTS, true));

/** True for a name that should not be shown to other players online. */
export function isBadName(name: string): boolean {
  return forms(name).some((words) => {
    const all = words.join('');
    return ROOT.test(all) || WORD.test(all) || words.some((w) => WORD.test(w));
  });
}
