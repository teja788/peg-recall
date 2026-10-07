/**
 * The grown-ups-only step in front of every purchase and restore: one quick
 * sum (see `mathQuestion`). A wrong answer gets a fresh question, so guessing
 * the same one over and over does not work.
 *
 * The answer is typed on our own number pad, not the system keyboard: on iPad
 * the keyboard covered the sheet, and once dismissed it did not come back.
 */
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { tr } from '../i18n';
import { isRightAnswer, mathQuestion } from '../store/purchasesModel';
import { useTheme } from '../theme';
import { PillButton } from './StatsCard';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'];

export function ParentalGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const t = useTheme();
  const [q, setQ] = useState(() => mathQuestion());
  const [typed, setTyped] = useState('');
  const [wrong, setWrong] = useState(false);

  const check = () => {
    if (isRightAnswer(q, typed)) {
      onPass();
      return;
    }
    setQ(mathQuestion());
    setTyped('');
    setWrong(true);
  };

  const press = (k: string) =>
    setTyped((s) => (k === '⌫' ? s.slice(0, -1) : s.length < 2 ? s + k : s));

  return (
    <View style={{ gap: t.spacing.md }}>
      <Text style={{ ...t.type.label, color: t.c.textDim }}>
        {tr('gate.intro')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
        <Text
          accessibilityRole="header"
          accessibilityLabel={q.label}
          style={{ ...t.type.title, color: t.c.text }}
        >
          {q.text}
        </Text>
        <Text
          accessibilityLabel={tr('gate.answerLabel', { question: q.label })}
          accessibilityValue={{ text: typed }}
          accessibilityLiveRegion="polite"
          maxFontSizeMultiplier={1.6}
          style={{
            ...t.type.heading,
            minWidth: 88,
            minHeight: 52,
            lineHeight: 48,
            paddingHorizontal: t.spacing.md,
            textAlign: 'center',
            color: typed ? t.c.text : t.c.textDim,
            backgroundColor: t.c.page,
            borderRadius: t.radii.sm,
            borderWidth: 2,
            borderColor: wrong ? t.c.textDim : t.c.line,
            overflow: 'hidden',
          }}
        >
          {typed || tr('gate.answer')}
        </Text>
      </View>
      {wrong ? (
        <Text accessibilityLiveRegion="polite" style={{ ...t.type.caption, color: t.c.textDim }}>
          {tr('gate.wrong')}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, maxWidth: 3 * 72 + 2 * 8 }}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={k === '⌫' ? tr('gate.delete') : k}
            onPress={() => press(k)}
            style={({ pressed }) => ({
              width: 72,
              height: 52,
              borderRadius: t.radii.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.c.page,
              borderWidth: 2,
              borderColor: t.c.line,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text maxFontSizeMultiplier={1.4} style={{ ...t.type.heading, color: t.c.text }}>
              {k}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
        <PillButton text={tr('common.cancel')} onPress={onCancel} />
        <PillButton text={tr('common.continue')} filled onPress={check} />
      </View>
    </View>
  );
}
