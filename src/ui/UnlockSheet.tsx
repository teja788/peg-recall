/**
 * "Unlock everything" — the one purchase in the app. Opens from any locked
 * option (Big / Huge board, Owl, 3 Players) and from Settings.
 *
 * Same scrim + slide-up as the pause and "Who's playing?" sheets. Buying and
 * restoring both go through the math question first (ParentalGate), shown in
 * place of the buttons, so the sheet never stacks a second sheet.
 */
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buy, loadPrices, restore } from '../store/purchases';
import { UNLOCK_ID, type BuyResult, type ProductId } from '../store/purchasesModel';
import { useSettings } from '../store/settings';
import { useTheme } from '../theme';
import { useReduceMotion } from './feedback';
import { ParentalGate } from './ParentalGate';

/** Store prices by product, once they arrive. Missing = show no price. */
export function usePrices(): Partial<Record<ProductId, string>> {
  const [prices, setPrices] = useState<Partial<Record<ProductId, string>>>({});
  useEffect(() => {
    let live = true;
    void loadPrices().then((p) => live && setPrices(p));
    return () => {
      live = false;
    };
  }, []);
  return prices;
}

/** What to say when a purchase did not end in a delivery. */
export const BUY_NOTE: Record<Exclude<BuyResult, 'done'>, string> = {
  cancelled: 'Purchase cancelled. Nothing was charged.',
  pending: 'Waiting for approval. It will arrive once approved.',
  failed: 'That did not go through. Please try again later.',
};

const PERKS = [
  'Big (36 pegs) and Huge (40 pegs) boards',
  'Owl, the computer that remembers nearly everything',
  '3 Players, pass and play',
];

export function UnlockSheet({
  onClose,
  restoring = false,
}: {
  onClose: () => void;
  /** open straight on the math question for "Restore purchase" */
  restoring?: boolean;
}) {
  const t = useTheme();
  const reduced = useReduceMotion();
  const insets = useSafeAreaInsets();
  const unlocked = useSettings((s) => s.unlocked);
  const price = usePrices()[UNLOCK_ID];
  const [gate, setGate] = useState<'buy' | 'restore' | null>(restoring ? 'restore' : null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withTiming(1, {
      duration: reduced ? 140 : 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter, reduced]);
  const scrimStyle = useAnimatedStyle(() => ({ opacity: enter.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduced ? enter.value : 1,
    transform: [{ translateY: reduced ? 0 : (1 - enter.value) * 320 }],
  }));

  const run = async (what: 'buy' | 'restore') => {
    setGate(null);
    setNote(null);
    setBusy(true);
    if (what === 'buy') {
      const r = await buy(UNLOCK_ID);
      if (r !== 'done') setNote(BUY_NOTE[r]);
    } else if (!(await restore())) {
      setNote('Nothing to restore for this Apple Account.');
    }
    setBusy(false);
  };

  const body = unlocked ? (
    <>
      <Text style={{ ...t.type.body, color: t.c.text, textAlign: 'center' }}>
        Everything is unlocked. Thank you, and have fun!
      </Text>
      <SheetButton text="Done" filled onPress={onClose} />
    </>
  ) : gate ? (
    <ParentalGate onPass={() => void run(gate)} onCancel={() => setGate(null)} />
  ) : (
    <>
      <View style={{ gap: t.spacing.sm }}>
        {PERKS.map((p) => (
          <View key={p} accessible style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            <Text style={{ ...t.type.body, color: t.c.accent }}>✓</Text>
            <Text style={{ ...t.type.body, color: t.c.text, flex: 1 }}>{p}</Text>
          </View>
        ))}
      </View>
      <Text style={{ ...t.type.caption, color: t.c.textDim }}>
        One purchase, yours to keep. No ads, ever.
      </Text>
      {note ? (
        <Text accessibilityLiveRegion="polite" style={{ ...t.type.label, color: t.c.text }}>
          {note}
        </Text>
      ) : null}
      <SheetButton
        text={busy ? 'One moment…' : price ? `Unlock for ${price}` : 'Unlock'}
        filled
        disabled={busy}
        onPress={() => setGate('buy')}
      />
      <SheetButton text="Restore purchase" disabled={busy} onPress={() => setGate('restore')} />
    </>
  );

  return (
    <Animated.View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { zIndex: 10 }, scrimStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        importantForAccessibility="no"
        accessibilityElementsHidden
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: t.c.scrim }]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
        style={{ flex: 1, justifyContent: 'flex-end', paddingTop: insets.top + 8 }}
      >
        <Animated.View
          style={[
            {
              backgroundColor: t.c.card,
              borderTopLeftRadius: t.radii.xl,
              borderTopRightRadius: t.radii.xl,
              flexShrink: 1,
              overflow: 'hidden',
            },
            sheetStyle,
          ]}
        >
          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{
              width: '100%',
              maxWidth: 600,
              alignSelf: 'center',
              padding: t.spacing.xl,
              paddingBottom: Math.max(insets.bottom, t.spacing.lg) + t.spacing.lg,
              gap: t.spacing.lg,
            }}
            keyboardShouldPersistTaps="handled"
            alwaysBounceVertical={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
              <Text
                accessibilityRole="header"
                style={{ ...t.type.title, color: t.c.text, flex: 1 }}
              >
                Unlock everything
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.c.page,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text allowFontScaling={false} style={{ fontSize: 20, color: t.c.textDim }}>
                  ✕
                </Text>
              </Pressable>
            </View>
            {body}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

/** Full-width sheet button, as on the pause menu. */
function SheetButton({
  text,
  filled,
  disabled,
  onPress,
}: {
  text: string;
  filled?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        borderRadius: t.radii.lg,
        backgroundColor: filled ? t.c.accent : 'transparent',
        borderWidth: filled ? 0 : 2,
        borderColor: t.c.line,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ ...t.type.heading, color: filled ? t.c.accentInk : t.c.text }}>{text}</Text>
    </Pressable>
  );
}
