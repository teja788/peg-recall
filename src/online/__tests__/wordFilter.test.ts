import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isBadName } from '../wordFilter';

test('D11: profanity, sexual words and slurs are caught, however they are typed', () => {
  for (const name of [
    'Fuck', 'f.u.c.k', 'FUUUCK', 'xXfuckXx', 'motherfucker', 'f​uck', 'ＦＵＣＫ', 'Big💩Ass',
    'sh1t', '5h1t', 'sh!t', 'shiiit', 'a$$', 'Ass', 'B!tch', 'c0ck', 'p0rn', 'D I C K', 'Dick', 'n1gger',
    // the app's languages
    'Scheiße', 'putain', 'Puta', 'Cazzo', 'Fanculo', 'Kurwa', 'Pizda', 'Kokot', 'vittu', 'orospu',
    'Сука', 'хуй', 'Μαλάκας', 'ngentot', 'địt mẹ', 'Bhenchod', 'चूतिया', '씨발', '傻逼', 'ちんこ',
    'เหี้ย', 'شرموطة', 'זונה',
  ]) {
    assert.equal(isBadName(name), true, name);
  }
});

test('D11: ordinary names pass, in many languages (no Scunthorpe problem)', () => {
  for (const name of [
    'Ashley', 'Scunthorpe', 'Hancock', 'Sophie', 'Mohammed', 'Aditi', 'Kumar', 'Fanny', 'Richard',
    'Dickens', 'Dickinson', 'Benedict', 'Arsenal', 'Arsène', 'Cumming', 'Hitchcock', 'Agnes Hitchcock',
    'Cockburn', 'Peacock', 'Sussex', 'Sexton', 'Cassandra', 'Assunta', 'Hassan', 'Therapist', 'Analia',
    'Janus', 'Nicola', 'Niger', 'Pedro', 'Titus', 'Coons', 'Pissarro', 'Butt', 'Lund', 'Randi',
    // Japanese, Thai, Indian, Arabic and Turkish names that hold a short English word
    'Matsushita', 'Yoshitaka', 'Hiroshi Tanaka', 'Shitara', 'Fukuda', 'Pornchai', 'Anusha', 'Nazia',
    'Nazir', 'Amina', 'Amina Koyuncu', 'Sikander', 'Wankhede', 'Kunal', 'Chaudhary', 'Kutti', 'Merdeka',
    // doubled letters in real names are not a stretched word (pula, buzi, kuk)
    'Pulla', 'Buzzi', 'Kukk', 'Monique', 'Peder', 'Concha', 'Marica', 'Malaka', 'Kurczewski', 'Fick',
    'Huy', 'Hui', 'Phúc', 'Đức', 'Lon', 'Du', 'İbrahim', 'Ayşe', 'Søren', 'Łukasz', 'Jürgen', 'Zoë',
    'Сергей', 'Хуан', 'Страхов', 'Алёна', 'Νίκος', 'محمد', 'زبيدة', 'نيكولا', 'יוסי', 'अदिति',
    'मोहम्मद', 'अमित', 'ગીતા', 'ਹਰਪ੍ਰੀਤ', 'রাহুল', 'ଅମିତ', 'అర్జున్', 'முருகன்', 'ರಾಜು', 'ലക്ഷ്മി',
    'عمران', '김민준', 'さくら', 'ようこ', '曹操', '王小明', 'สมชาย',
  ]) {
    assert.equal(isBadName(name), false, name);
  }
});
