import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hasRtl, joinNames, playerLabel, possessive } from '../names';

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

test('possessive: "Maya\'s", "James\'"', () => {
  assert.equal(possessive('Maya'), "Maya's");
  assert.equal(possessive('James'), "James'");
  assert.equal(possessive('JAMES'), "JAMES'");
  assert.equal(possessive('Fox'), "Fox's");
  assert.equal(possessive('Bunny'), "Bunny's");
  assert.equal(possessive(' Leo '), "Leo's");
  assert.equal(possessive('🦊'), "🦊's");
});

test('joinNames: one, two, three', () => {
  assert.equal(joinNames([]), '');
  assert.equal(joinNames(['Maya']), 'Maya');
  assert.equal(joinNames(['Maya', 'Leo']), 'Maya and Leo');
  assert.equal(joinNames(['Maya', 'Leo', 'Sam']), 'Maya, Leo and Sam');
  assert.equal(joinNames(['A', 'B', 'C', 'D']), 'A, B, C and D');
});

test('plain names are never wrapped in isolates', () => {
  for (const s of [possessive('Maya'), joinNames(['Maya', 'Zoë', 'José']), possessive('Grandpa 👴')]) {
    assert.ok(!s.includes(FSI) && !s.includes(PDI), JSON.stringify(s));
  }
});

test('RTL names are isolated so the punctuation stays put', () => {
  assert.equal(hasRtl('שרה'), true);
  assert.equal(hasRtl('مريم'), true);
  assert.equal(hasRtl('Maya'), false);
  assert.equal(hasRtl('Zoë'), false);
  assert.equal(possessive('שרה'), `${FSI}שרה${PDI}'s`);
  assert.equal(joinNames(['Maya', 'مريم']), `Maya and ${FSI}مريم${PDI}`);
  assert.equal(
    joinNames(['שרה', 'Leo', 'مريم']),
    `${FSI}שרה${PDI}, Leo and ${FSI}مريم${PDI}`,
    'only the RTL names are wrapped',
  );
});
