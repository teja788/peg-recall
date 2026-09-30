/**
 * The grown-ups-only step in front of every purchase and restore: one quick
 * sum (see `mathQuestion`). A wrong answer gets a fresh question, so guessing
 * the same one over and over does not work.
 */
import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { isRightAnswer, mathQuestion } from '../store/purchasesModel';
import { useTheme } from '../theme';
import { PillButton } from './StatsCard';

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

  return (
    <View style={{ gap: t.spacing.md }}>
      <Text style={{ ...t.type.label, color: t.c.textDim }}>
        For grown-ups: answer to continue
      </Text>
      <Text
        accessibilityRole="header"
        accessibilityLabel={q.label}
        style={{ ...t.type.title, color: t.c.text }}
      >
        {q.text}
      </Text>
      <TextInput
        value={typed}
        onChangeText={(v) => setTyped(v.replace(/[^\d]/g, ''))}
        onSubmitEditing={check}
        keyboardType="number-pad"
        inputMode="numeric"
        returnKeyType="done"
        maxLength={4}
        autoFocus
        autoComplete="off"
        autoCorrect={false}
        accessibilityLabel={`Answer. ${q.label}`}
        placeholder="Answer"
        placeholderTextColor={t.c.textDim}
        selectionColor={t.c.accent}
        maxFontSizeMultiplier={1.6}
        style={{
          ...t.type.heading,
          minHeight: 52,
          paddingHorizontal: t.spacing.md,
          color: t.c.text,
          backgroundColor: t.c.page,
          borderRadius: t.radii.sm,
          borderWidth: 2,
          borderColor: wrong ? t.c.textDim : t.c.line,
        }}
      />
      {wrong ? (
        <Text accessibilityLiveRegion="polite" style={{ ...t.type.caption, color: t.c.textDim }}>
          Not quite. Here is a new one.
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
        <PillButton text="Cancel" onPress={onCancel} />
        <PillButton text="Continue" filled onPress={check} />
      </View>
    </View>
  );
}
