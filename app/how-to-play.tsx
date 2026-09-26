import { PEG_HEX } from '@art';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '../src/store/settings';
import { useTheme } from '../src/theme';
import { Backdrop } from '../src/ui/Backdrop';
import { IconButton } from '../src/ui/controls';
import { RowArt, StepArt, type ArtColors } from '../src/ui/HowToPlayArt';
import {
  TIPS_FOOTNOTE,
  howToPlaySteps,
  tips,
  waysToPlay,
  type Tip,
} from '../src/ui/HowToPlayCopy';

/** Dynamic Type cap: the same ceiling the "Who's playing?" sheet uses. */
const MAX_SCALE = 1.4;
/** On a tablet the column stops growing and sits in the middle. */
const MAX_COLUMN = 640;

/** Pictures are decoration: every word they carry is in the row's label. */
const HIDDEN_FROM_A11Y = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
  'aria-hidden': true,
};

/** "Look" -> "Look.", "Oops!" stays: so a screen reader pauses after a title. */
const sentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

/**
 * "How to play": the rules as four illustrated steps, then the ways to play and
 * a few tips. Opened from the ? button on Home; never shown on its own.
 *
 * The step wording follows the switches in Settings (bonus turn, kid mode), so
 * what is read out is what the next game will do.
 */
export default function HowToPlayScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bonusTurnOnMatch = useSettings((s) => s.bonusTurnOnMatch);
  const kidMode = useSettings((s) => s.kidMode);

  const steps = howToPlaySteps({ bonusTurnOnMatch, kidMode });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const artColors: ArtColors = {
    theme: t.scheme,
    good: PEG_HEX.green,
    badgeInk: t.c.card,
  };
  const column = { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' } as const;
  const cardBox = {
    backgroundColor: t.c.card,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.c.line,
  };
  const sectionLabel = {
    ...t.type.label,
    color: t.c.onBackdropMuted,
    marginTop: t.spacing.md,
  };

  return (
    <Backdrop>
      <View style={{ paddingTop: insets.top }} />
      <View
        style={{
          ...column,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.md,
          paddingVertical: t.spacing.sm,
        }}
      >
        <IconButton glyph="‹" label="Close how to play" onPress={close} tone="filled" />
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_SCALE}
          style={{ ...t.type.title, color: t.c.onBackdrop, marginLeft: t.spacing.sm }}
        >
          How to play
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          ...column,
          padding: t.spacing.lg,
          paddingBottom: insets.bottom + t.spacing.xxl,
          gap: t.spacing.md,
        }}
      >
        <Text
          maxFontSizeMultiplier={MAX_SCALE}
          style={{ ...t.type.body, color: t.c.onBackdrop }}
        >
          Remember where the colors are. Catch the most pegs!
        </Text>

        {steps.map((s, i) => (
          <View
            key={s.id}
            accessible
            accessibilityLabel={`Step ${i + 1} of ${steps.length}. ${sentence(s.title)} ${s.body}`}
            style={{
              ...cardBox,
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: t.spacing.md,
              paddingLeft: t.spacing.sm,
              paddingRight: t.spacing.lg,
              gap: t.spacing.sm,
            }}
          >
            <View {...HIDDEN_FROM_A11Y}>
              <StepArt id={s.id} colors={artColors} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                <View
                  style={{
                    minWidth: 26,
                    height: 26,
                    borderRadius: 13,
                    paddingHorizontal: 4,
                    backgroundColor: t.c.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    style={{ fontSize: 15, fontWeight: '800', color: t.c.accentInk }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  maxFontSizeMultiplier={MAX_SCALE}
                  style={{ ...t.type.heading, color: t.c.text, flexShrink: 1 }}
                >
                  {s.title}
                </Text>
              </View>
              <Text
                maxFontSizeMultiplier={MAX_SCALE}
                style={{
                  fontSize: 16,
                  lineHeight: 22,
                  fontWeight: '500',
                  color: t.c.text,
                  marginTop: t.spacing.xs,
                }}
              >
                {s.body}
              </Text>
            </View>
          </View>
        ))}

        <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE} style={sectionLabel}>
          Ways to play
        </Text>
        <RowCard rows={waysToPlay()} />

        <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_SCALE} style={sectionLabel}>
          Tips
        </Text>
        <RowCard rows={tips()} />
        <Text maxFontSizeMultiplier={MAX_SCALE} style={{ ...t.type.caption, color: t.c.onBackdropMuted }}>
          {TIPS_FOOTNOTE}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Got it"
          accessibilityHint="Goes back to the home screen"
          onPress={close}
          style={({ pressed }) => ({
            marginTop: t.spacing.md,
            minHeight: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: t.radii.lg,
            backgroundColor: t.c.accent,
            borderWidth: 2,
            // same cream ring as a selected chip, so the blue button does not
            // melt into the teal table
            borderColor: t.c.card,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text maxFontSizeMultiplier={MAX_SCALE} style={{ ...t.type.heading, color: t.c.accentInk }}>
            Got it!
          </Text>
        </Pressable>
      </ScrollView>
    </Backdrop>
  );
}

/** One card, several rows split by hairlines: picture, bold title, a line. */
function RowCard({ rows }: { rows: Tip[] }) {
  const t = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.c.card,
        borderRadius: t.radii.md,
        borderWidth: 1,
        borderColor: t.c.line,
        overflow: 'hidden',
      }}
    >
      {rows.map((r, i) => (
        <View
          key={r.id}
          accessible
          accessibilityLabel={`${sentence(r.title)} ${r.body}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.sm,
            paddingVertical: t.spacing.md,
            paddingLeft: t.spacing.sm,
            paddingRight: t.spacing.lg,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: t.c.line,
          }}
        >
          <View {...HIDDEN_FROM_A11Y}>
            <RowArt id={r.id} theme={t.scheme} ink={t.c.textDim} rim={t.c.line} />
          </View>
          <View style={{ flex: 1 }}>
            <Text maxFontSizeMultiplier={MAX_SCALE} style={{ ...t.type.label, color: t.c.text }}>
              {r.title}
            </Text>
            <Text
              maxFontSizeMultiplier={MAX_SCALE}
              style={{ ...t.type.caption, fontWeight: '500', color: t.c.textDim, marginTop: 2 }}
            >
              {r.body}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
