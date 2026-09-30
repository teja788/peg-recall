import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setLang } from '../../i18n';
import { hasRtl, isolate, joinNames, playerLabel } from '../names';

const FSI = '⁨';
const PDI = '⁩';

test('playerLabel: the typed name, else the animal', () => {
  assert.equal(playerLabel({ name: 'Maya', avatar: 'fox' }), 'Maya');
  assert.equal(playerLabel({ name: '  Maya ', avatar: 'fox' }), 'Maya');
  assert.equal(playerLabel({ avatar: 'fox' }), 'Fox');
  assert.equal(playerLabel({ name: '', avatar: 'owl' }), 'Owl');
  assert.equal(playerLabel({ name: '   ', avatar: 'bunny' }), 'Bunny');
  for (const [id, word] of [
    ['bear', 'Bear'],
    ['frog', 'Frog'],
    ['cat', 'Cat'],
  ] as const) {
    assert.equal(playerLabel({ avatar: id }), word);
  }
});

test('joinNames: one, two, three', () => {
  assert.equal(joinNames([]), '');
  assert.equal(joinNames(['Maya']), 'Maya');
  assert.equal(joinNames(['Maya', 'Leo']), 'Maya and Leo');
  assert.equal(joinNames(['Maya', 'Leo', 'Sam']), 'Maya, Leo and Sam');
  assert.equal(joinNames(['A', 'B', 'C', 'D']), 'A, B, C and D');
});

test('plain names are never wrapped in isolates', () => {
  for (const s of [isolate('Maya'), joinNames(['Maya', 'Zoë', 'José']), isolate('Grandpa 👴')]) {
    assert.ok(!s.includes(FSI) && !s.includes(PDI), JSON.stringify(s));
  }
});

test('RTL names are isolated so the punctuation stays put', () => {
  assert.equal(hasRtl('שרה'), true);
  assert.equal(hasRtl('مريم'), true);
  assert.equal(hasRtl('Maya'), false);
  assert.equal(hasRtl('Zoë'), false);
  assert.equal(isolate('שרה'), `${FSI}שרה${PDI}`);
  assert.equal(joinNames(['Maya', 'مريم']), `Maya and ${FSI}مريم${PDI}`);
  assert.equal(
    joinNames(['שרה', 'Leo', 'مريم']),
    `${FSI}שרה${PDI}, Leo and ${FSI}مريم${PDI}`,
    'only the RTL names are wrapped',
  );
});

test('in another language: the animal and the "and" are translated', () => {
  try {
    setLang('de');
    assert.equal(playerLabel({ avatar: 'owl' }), 'Eule');
    assert.equal(playerLabel({ name: '', avatar: 'bunny' }), 'Hase', "a saved '' is still the animal");
    assert.equal(playerLabel({ name: 'Mia', avatar: 'owl' }), 'Mia');
    assert.equal(joinNames(['Mia', 'Leon', 'Oma']), 'Mia, Leon und Oma');
    setLang('ja');
    assert.equal(joinNames(['ゆい', 'はると']), 'ゆいとはると');
  } finally {
    setLang('en');
  }
});
