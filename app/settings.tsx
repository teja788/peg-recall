import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BOARD_CYCLE,
  BOARD_LABEL,
  DIFFICULTY_HINT,
  DIFFICULTY_LABEL,
  isLocked,
  playable,
  useSettings,
} from '../src/store/settings';
import { buy } from '../src/store/purchases';
import { TIP_IDS, type ProductId } from '../src/store/purchasesModel';
import { useTheme } from '../src/theme';
import { Backdrop } from '../src/ui/Backdrop';
import { Chip, IconButton, ToggleRow } from '../src/ui/controls';
import { ParentalGate } from '../src/ui/ParentalGate';
import { PillButton, RateRow, StatsCard } from '../src/ui/StatsCard';
import { BUY_NOTE, UnlockSheet, usePrices } from '../src/ui/UnlockSheet';
import type { Difficulty } from '../src/engine/types';

const DIFFICULTIES: Difficulty[] = ['bunny', 'fox', 'owl'];
const DIFFICULTY_GLYPH: Record<Difficulty, string> = { bunny: '🐰', fox: '🦊', owl: '🦉' };

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // per-slice selectors: subscribing to the whole store re-renders this screen
  // on any unrelated settings write
  const soundOn = useSettings((s) => s.soundOn);
  const showShapes = useSettings((s) => s.showShapes);
  const bonusTurnOnMatch = useSettings((s) => s.bonusTurnOnMatch);
  const kidMode = useSettings((s) => s.kidMode);
  const boardSize = useSettings((s) => playable(s).boardSize);
  const difficulty = useSettings((s) => playable(s).difficulty);
  const unlocked = useSettings((s) => s.unlocked);
  const toggle = useSettings((s) => s.toggle);
  const setSetting = useSettings((s) => s.set);
  /** the Unlock sheet is up; 'restore' opens it on the restore question */
  const [sheet, setSheet] = useState<'unlock' | 'restore' | null>(null);

  return (
    <Backdrop>
      <View style={{ paddingTop: insets.top }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: t.spacing.md,
          paddingVertical: t.spacing.sm,
        }}
      >
        <IconButton
          glyph="‹"
          label="Close settings"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          tone="filled"
        />
        <Text
          accessibilityRole="header"
          style={{ ...t.type.title, color: t.c.onBackdrop, marginLeft: t.spacing.sm }}
        >
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: t.spacing.lg,
          paddingBottom: insets.bottom + t.spacing.xxl,
          gap: t.spacing.md,
        }}
      >
        <ToggleRow
          title="Sound"
          subtitle="Soft clicks and a chime on a match"
          value={soundOn}
          onToggle={() => toggle('soundOn')}
        />
        <ToggleRow
          title="Shapes on pegs"
          subtitle="Color-blind help: every color gets its own shape"
          value={showShapes}
          onToggle={() => toggle('showShapes')}
        />
        <ToggleRow
          title="Bonus turn on a match"
          subtitle="Keep rolling while you keep matching"
          value={bonusTurnOnMatch}
          onToggle={() => toggle('bonusTurnOnMatch')}
        />
        <ToggleRow
          title="Kid mode"
          subtitle="Longer look at the board, ties are shared wins"
          value={kidMode}
          onToggle={() => toggle('kidMode')}
        />

        <Text style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}>
          Board size
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {BOARD_CYCLE.map((b) => (
            <Chip
              key={b}
              text={BOARD_LABEL[b]}
              selected={boardSize === b}
              locked={isLocked(unlocked, b)}
              onPress={() => (isLocked(unlocked, b) ? setSheet('unlock') : setSetting('boardSize', b))}
            />
          ))}
        </View>

        <Text style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}>
          Computer opponent
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
          {DIFFICULTIES.map((d) => (
            <Chip
              key={d}
              text={`${DIFFICULTY_GLYPH[d]}  ${DIFFICULTY_LABEL[d]}`}
              label={DIFFICULTY_LABEL[d]}
              hint={DIFFICULTY_HINT[d]}
              selected={difficulty === d}
              locked={isLocked(unlocked, d)}
              onPress={() => (isLocked(unlocked, d) ? setSheet('unlock') : setSetting('difficulty', d))}
            />
          ))}
        </View>
        <Text style={{ ...t.type.caption, color: t.c.onBackdropMuted }}>
          {DIFFICULTY_HINT[difficulty]}
        </Text>

        <Text
          accessibilityRole="header"
          style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}
        >
          Stats
        </Text>
        <StatsCard />
        <ForgetNamesRow />

        <UnlockRow unlocked={unlocked} onOpen={setSheet} />
        <Text
          accessibilityRole="header"
          style={{ ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.md }}
        >
          Support Color Catch
        </Text>
        <TipJar />
        <RateRow />
      </ScrollView>
      {sheet ? (
        <UnlockSheet restoring={sheet === 'restore'} onClose={() => setSheet(null)} />
      ) : null}
    </Backdrop>
  );
}

/**
 * Names now live on the "Who's playing?" sheet; all Settings keeps is the way
 * to wipe them (every seat back to its animal, no recent-name chips). Confirmed
 * inline, like Reset stats: no system dialog.
 */
function ForgetNamesRow() {
  const t = useTheme();
  const names = useSettings((s) => s.names);
  const recentNames = useSettings((s) => s.recentNames);
  const forgetNames = useSettings((s) => s.forgetNames);
  const [confirming, setConfirming] = useState(false);
  const saved = new Set(
    [...names, ...recentNames].filter(Boolean).map((n) => n.toLowerCase()),
  ).size;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        minHeight: 56,
        paddingVertical: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        borderRadius: t.radii.md,
        backgroundColor: t.c.card,
        borderWidth: 1,
        borderColor: t.c.line,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: t.spacing.sm,
      }}
    >
      {confirming ? (
        <>
          <Text style={{ ...t.type.body, color: t.c.text, flexGrow: 1 }}>Forget all names?</Text>
          <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
            <PillButton text="Cancel" label="Cancel, keep names" onPress={() => setConfirming(false)} />
            <PillButton
              text="Forget"
              label="Forget all player names"
              filled
              onPress={() => {
                forgetNames();
                setConfirming(false);
              }}
            />
          </View>
        </>
      ) : (
        <>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={{ ...t.type.body, color: t.c.text }}>Player names</Text>
            <Text style={{ ...t.type.caption, color: t.c.textDim, marginTop: 2 }}>
              {saved === 0
                ? 'None saved. Everyone plays as their animal.'
                : `${saved} ${saved === 1 ? 'name' : 'names'} saved on this device`}
            </Text>
          </View>
          {saved > 0 ? (
            <PillButton
              text="Forget player names"
              onPress={() => setConfirming(true)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

/** "Unlock everything": opens the sheet, or says it is owned. Restore lives
 *  here too (Apple asks for it wherever the purchase is offered). */
function UnlockRow({
  unlocked,
  onOpen,
}: {
  unlocked: boolean;
  onOpen: (what: 'unlock' | 'restore') => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        minHeight: 56,
        paddingVertical: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        borderRadius: t.radii.md,
        backgroundColor: t.c.card,
        borderWidth: 1,
        borderColor: t.c.line,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: t.spacing.sm,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unlocked ? 'Unlock everything: unlocked' : 'Unlock everything'}
        accessibilityHint="Big and Huge boards, Owl and 3 players"
        onPress={() => onOpen('unlock')}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 160,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flex: 1, paddingRight: t.spacing.md }}>
          <Text style={{ ...t.type.body, color: t.c.text }}>Unlock everything</Text>
          <Text style={{ ...t.type.caption, color: t.c.textDim, marginTop: 2 }}>
            {unlocked ? 'Unlocked. Thank you!' : 'Big and Huge boards, Owl, 3 players'}
          </Text>
        </View>
        <Text allowFontScaling={false} style={{ fontSize: 22, color: t.c.textDim }}>
          ›
        </Text>
      </Pressable>
      {unlocked ? null : <PillButton text="Restore purchase" onPress={() => onOpen('restore')} />}
    </View>
  );
}

const TIP_NAME: Record<(typeof TIP_IDS)[number], string> = {
  'com.raviteja.pegrecall.tip.small': 'Small tip',
  'com.raviteja.pegrecall.tip.medium': 'Medium tip',
  'com.raviteja.pegrecall.tip.large': 'Large tip',
};

/** The tip jar: three consumables that unlock nothing, behind the math question. */
function TipJar() {
  const t = useTheme();
  const prices = usePrices();
  const [asking, setAsking] = useState<ProductId | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const tip = async (id: ProductId) => {
    setAsking(null);
    setNote(null);
    setBusy(true);
    const r = await buy(id);
    setNote(r === 'done' ? 'Thank you! Your tip keeps Color Catch ad-free. 💛' : BUY_NOTE[r]);
    setBusy(false);
  };

  return (
    <View
      style={{
        paddingVertical: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        borderRadius: t.radii.md,
        backgroundColor: t.c.card,
        borderWidth: 1,
        borderColor: t.c.line,
        gap: t.spacing.md,
      }}
    >
      {asking ? (
        <ParentalGate onPass={() => void tip(asking)} onCancel={() => setAsking(null)} />
      ) : (
        <>
          <Text style={{ ...t.type.caption, color: t.c.textDim }}>
            Tips help keep Color Catch ad-free. They don&apos;t unlock anything.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {TIP_IDS.map((id) => (
              <PillButton
                key={id}
                text={prices[id] ? `${TIP_NAME[id]} · ${prices[id]}` : TIP_NAME[id]}
                label={prices[id] ? `${TIP_NAME[id]}, ${prices[id]}` : TIP_NAME[id]}
                onPress={() => (busy ? undefined : setAsking(id))}
              />
            ))}
          </View>
          {busy || note ? (
            <Text accessibilityLiveRegion="polite" style={{ ...t.type.label, color: t.c.text }}>
              {busy ? 'One moment…' : note}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
