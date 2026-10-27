/**
 * Words a name for online play may not contain (PLAN-web-online.md §B9, D11).
 * A moderation list: rude, sexual and hateful words in the app's 28 languages
 * and in the Latin spellings people type Hindi, Marathi, Bengali, Tamil,
 * Telugu and Kannada in. Short on purpose: the most common words, not every
 * spelling. The host can still remove a player, and anyone can report a room.
 *
 * Two lists, because real names hide rude words:
 *
 *  - ANYWHERE: never part of a name, wherever it appears ("fuck" in "Fuckface").
 *  - WHOLE: only a whole word of the name, or the whole name, is refused.
 *    "ass" is in Cassandra, "shit" in Kshitij, "cock" in Hancock, "nazi" in
 *    Nazia, "porn" in the Thai name Pornthip, "लंड" in लंडन (London).
 *
 * Spelling does not matter: nameFilter.ts folds case, accents, look-alike
 * digits (5h1t), spaces and dots between letters, and stretched letters
 * (fuuuck) before comparing. Write each word plainly, once.
 *
 * Left out on purpose, as real names or everyday words somewhere: randi,
 * sule, sunni, magi, babi, suka, pik, kuk, tit, hoe, du, lon, huy, hui,
 * gudda, concha, bite, chatte, isis, jap.
 */

export const ANYWHERE: readonly string[] = [
  // English
  'fuck', 'phuck', 'cunt', 'nigger', 'nigga', 'faggot', 'bitch', 'whore', 'slut', 'penis',
  'vagina', 'dildo', 'pussy', 'asshole', 'arsehole', 'bastard', 'titties', 'jizz', 'milf',
  'retard', 'wanker', 'twat', 'butthole', 'hitler', 'bullshit', 'shithead', 'dickhead',
  'cocksucker', 'blowjob', 'handjob', 'scrotum', 'testicle', 'orgasm', 'pedophile', 'incest',
  'skank', 'bollocks', 'bellend', 'wetback', 'raghead', 'towelhead', 'golliwog',
  // Spanish
  'mierda', 'cabron', 'pendejo', 'follar', 'maricon', 'chingada', 'gilipollas', 'hijueputa',
  'hijoputa',
  // Portuguese
  'caralho', 'fodase', 'buceta', 'viado', 'piroca', 'arrombado', 'punheta',
  // French
  'putain', 'salope', 'connard', 'connasse', 'encule', 'branleur', 'batard',
  // German
  'scheisse', 'scheiss', 'fotze', 'ficken', 'arschloch', 'wichser', 'hurensohn', 'schlampe',
  'missgeburt',
  // Italian
  'cazzo', 'vaffanculo', 'fanculo', 'stronzo', 'puttana', 'minchia', 'coglione', 'frocio',
  'zoccola', 'porcodio',
  // Dutch
  'klootzak', 'neuken', 'godverdomme', 'kutwijf',
  // Danish, Norwegian, Swedish
  'knulla', 'kuksugare',
  // Polish
  'kurw', 'pierdol', 'pierdal', 'jebac', 'jebany', 'pizda',
  // Czech
  'kurva', 'mrdat', 'zmrd',
  // Russian, Ukrainian (and in Latin letters)
  'хуй', 'хуе', 'пизд', 'ебан', 'ебат', 'ебал', 'блять', 'бляд', 'мудак', 'мудил', 'пидор',
  'пидар', 'підор', 'залуп', 'шлюх', 'гандон', 'курва', 'долбоеб', 'blyat', 'blyad', 'mudak',
  'pidor', 'pidar',
  // Turkish
  'siktir', 'orospu', 'yarrak', 'sikis', 'sikerim', 'pezevenk', 'amcik', 'gotveren',
  // Indonesian, Malay
  'bangsat', 'kontol', 'memek', 'ngentot', 'jancok', 'jancuk', 'pepek', 'lonte', 'bajingan',
  'pukimak',
  // Vietnamese (accents are folded away)
  'ditme', 'cailon',
  // Thai
  'เหี้ย', 'ควย', 'เย็ด', 'ไอ้สัตว์', 'อีสัตว์', 'อีดอก', 'แตด', 'จัญไร', 'ระยำ', 'ส้นตีน', 'ชิบหาย',
  // Japanese
  'ちんこ', 'チンコ', 'まんこ', 'マンコ', 'ちんぽ', 'チンポ', 'やりまん', 'ヤリマン', 'セックス',
  'ファック', '死ね', 'きちがい', 'キチガイ', '気違い',
  // Korean
  '씨발', '씨팔', '병신', '좆', '개새끼', '지랄', '섹스', '엿먹어', '썅', '느금마',
  // Chinese (traditional and simplified)
  '操你', '肏', '幹你', '干你', '他媽的', '他妈的', '屄', '雞巴', '鸡巴', '傻逼', '傻屄', '煞笔',
  '婊子', '賤人', '贱人', '王八蛋', '狗屎', '屌', '妓女', '去死', '色情', '做愛', '做爱', '支那',
  // Arabic
  'شرموط', 'قحبة', 'منيوك', 'عاهرة', 'كسمك', 'كسامك', 'متناك', 'ابنالكلب',
  // Hindi, Marathi (Devanagari)
  'चूतिया', 'चुतिया', 'चोद', 'भोसड़', 'रंडी', 'गांडू', 'लौड़ा', 'लवडा', 'हरामी', 'हरामज़ादा',
  'भड़वा', 'छिनाल', 'झवाड', 'आयघाल्या', 'भिकारचोट',
  // Hindi, Marathi, Bengali, Tamil, Telugu, Kannada as typed in Latin letters
  'chutiya', 'chutiye', 'chutia', 'chootiya', 'madarchod', 'maderchod', 'madarchot', 'behenchod',
  'behnchod', 'bhenchod', 'benchod', 'bhosd', 'haramzada', 'haramzade', 'bhadwa', 'bhadva',
  'bhadwe', 'zavadya', 'zhavadya', 'aighalya', 'bhikarchot', 'khanki', 'bokachoda', 'chudir',
  'thevidiya', 'thevdiya', 'thevudiya', 'koothi', 'ommala', 'lanjakodaka', 'neeyamma',
  'bolimaga', 'bevarsi',
  // Bengali
  'খানকি', 'বোকাচোদা', 'চোদা', 'চুদি', 'হারামজাদা', 'হারামি', 'চুতমারানি', 'মাদারচোদ',
  // Tamil
  'புண்டை', 'ஓத்தா', 'தேவடியா', 'தேவிடியா', 'கூதி', 'ஓம்மால',
  // Telugu
  'దెంగు', 'లంజ', 'పూకు', 'మొడ్డ', 'నీయమ్మ',
  // Kannada
  'ಸೂಳೆ', 'ತುಲ್ಲು', 'ಬೋಳಿಮಗ', 'ಬೇವರ್ಸಿ',
];

export const WHOLE: readonly string[] = [
  // English
  'shit', 'shitty', 'ass', 'arse', 'dick', 'cock', 'cocks', 'boob', 'boobs', 'tits', 'cum',
  'sex', 'sexy', 'rape', 'nazi', 'kkk', 'fuk', 'fck', 'fcuk', 'fuq', 'wtf', 'stfu', 'kys',
  'porn', 'porno', 'boner', 'horny', 'nude', 'nudes', 'naked', 'piss', 'wank', 'spaz',
  'spastic', 'chink', 'paki', 'kike', 'spic', 'gook', 'dyke', 'tranny', 'homo', 'lesbo',
  'fag', 'fags', 'anal', 'anus', 'clit', 'semen', 'sperm', 'pedo', 'pimp', 'thot', 'prick',
  'tosser', 'minge', 'nonce', 'coon', 'beaner', 'darkie',
  // Spanish
  'puta', 'puto', 'putita', 'cono', 'verga', 'polla', 'joder', 'zorra', 'culo', 'chinga',
  'pinche', 'mamada',
  // Portuguese
  'porra', 'foda', 'foder', 'boceta', 'merda', 'cacete', 'cuzao',
  // French
  'merde', 'nique', 'niquer', 'pute', 'couille', 'couilles', 'cul',
  // German
  'fick', 'arsch', 'schwanz', 'nutte', 'hure', 'spast',
  // Italian
  'troia', 'figa', 'fica',
  // Dutch
  'kut', 'lul', 'kanker', 'hoer', 'tering', 'flikker', 'mongool',
  // Danish, Norwegian, Swedish
  'fisse', 'kneppe', 'luder', 'fitte', 'faen', 'hore', 'fitta', 'javla',
  // Polish
  'chuj', 'cipa', 'dupa', 'cwel', 'kutas', 'szmata',
  // Czech
  'pica', 'prdel', 'kokot', 'sukat', 'curak', 'hovno', 'debil',
  // Russian, Ukrainian
  'сука', 'хер', 'жопа', 'дерьмо', 'срака', 'говно', 'бля', 'nahui',
  // Turkish
  'sik', 'amk', 'pic', 'yarak', 'ibne', 'gavat', 'kahpe',
  // Indonesian, Malay
  'anjing', 'goblok', 'tolol', 'kampret', 'entot', 'puki', 'pantek',
  // Vietnamese
  'dit', 'cac', 'dmm', 'dcm', 'vcl', 'vkl', 'clm',
  // Thai
  'หี', 'สัส',
  // Japanese
  'くそ', 'クソ', 'しね', 'シネ', 'おっぱい',
  // Korean
  '시발', 'ㅅㅂ', 'ㅆㅂ', 'ㅂㅅ', '새끼', '닥쳐', '보지', '자지', '니미', '개년',
  // Chinese
  '你妈', '你媽',
  // Arabic
  'كس', 'زب', 'زبي', 'نيك', 'خول', 'يلعن', 'طيز', 'عرص', 'لوطي',
  // Hindi, Marathi (Devanagari)
  'गांड', 'लंड', 'झाट', 'रांड',
  // Indian languages in Latin letters
  'lauda', 'lavda', 'lawda', 'lund', 'gaand', 'gand', 'gandu', 'chod', 'chodu', 'harami',
  'bsdk', 'jhaat', 'jhant', 'chinal', 'punda', 'pundai', 'otha', 'oththa', 'soothu', 'oombu',
  'dengu', 'dengey', 'lanja', 'puku', 'modda', 'soole', 'tullu',
  // Bengali
  'মাগি', 'মাগী', 'বাঁড়া', 'গুদ',
  // Tamil
  'சூத்து', 'பூல்', 'ஓழ்',
  // Telugu
  'గుద్ద',
  // Kannada
  'ಶಾಟ', 'ತಿಕ',
];

/** Single characters refused anywhere in a name (they are not letters, so
 *  the word lists never see them). */
export const SYMBOLS: readonly string[] = ['🖕'];
