/**
 * "Play online" (PLAN-web-online.md §B1): who you are, then start a room
 * (board, how many players, turn time) or join one with its code. Once the
 * server gives this device a seat, the waiting room takes over.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { BOARD_SPECS, type BoardSize } from '../src/engine/types';
import { tr } from '../src/i18n';
import { HOST_LIMITS, onlineEnabled } from '../src/online/config';
import { needsUnlock } from '../src/online/limits';
import { normalizeCode, type TimerMode } from '../src/online/protocol';
import { useRoom } from '../src/store/room';
import { BOARD_CYCLE, useSettings } from '../src/store/settings';
import { useTheme } from '../src/theme';
import { Chip } from '../src/ui/controls';
import { Card, Note, OnlineFrame, StatusLine, WideButton, YouRow, errorText } from '../src/ui/online';
import { UnlockSheet } from '../src/ui/UnlockSheet';

const SEAT_COUNTS = [2, 3, 4] as const;

export default function OnlineScreen() {
  const t = useTheme();
  const router = useRouter();
  const status = useRoom((s) => s.status);
  const error = useRoom((s) => s.error);
  const code = useRoom((s) => s.code);
  const seat = useRoom((s) => s.seat);
  const unlocked = useSettings((s) => s.unlocked);

  const [board, setBoard] = useState<BoardSize>('classic');
  const [seats, setSeats] = useState<2 | 3 | 4>(4);
  const [timer, setTimer] = useState<TimerMode>('relaxed');
  const [codeText, setCodeText] = useState('');
  /** a create or join is on its way: the next seat we get is that room's */
  const [asked, setAsked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (asked && seat && code) router.replace({ pathname: '/room/[code]', params: { code } });
  }, [asked, seat, code, router]);
  useEffect(() => {
    if (error) setAsked(false);
  }, [error]);

  const locked = (ask: Parameters<typeof needsUnlock>[2]) => needsUnlock(HOST_LIMITS, unlocked, ask);

  /** a fresh request: any room this device still sits in is given up first */
  const fresh = () => {
    if (useRoom.getState().code) useRoom.getState().leave();
    useRoom.getState().clear();
    setAsked(true);
  };
  const me = () => {
    const s = useSettings.getState();
    return { name: s.names[0] || undefined, avatar: s.avatars[0] };
  };

  const create = () => {
    if (locked({ board, maxSeats: seats })) return setUnlocking(true);
    const s = useSettings.getState();
    const { name, avatar } = me();
    fresh();
    useRoom
      .getState()
      .create({ board, bonusTurnOnMatch: s.bonusTurnOnMatch, kidMode: s.kidMode, maxSeats: seats, timer }, name, avatar, unlocked);
  };

  const join = () => {
    const c = normalizeCode(codeText);
    if (!c) return;
    const { name, avatar } = me();
    fresh();
    useRoom.getState().join(c, name, avatar);
  };

  const label = { ...t.type.label, color: t.c.onBackdropMuted, marginTop: t.spacing.sm };
  const row = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: t.spacing.sm };

  if (!onlineEnabled) {
    return (
      <OnlineFrame title={tr('online.title')}>
        <Note text={tr('online.err.rules')} />
      </OnlineFrame>
    );
  }

  return (
    <OnlineFrame
      title={tr('online.title')}
      overlay={unlocking ? <UnlockSheet onClose={() => setUnlocking(false)} /> : null}
    >
      <StatusLine status={asked ? status : 'open'} />
      {error ? <Note text={errorText(error)} /> : null}

      <Card>
        <YouRow />
      </Card>

      <View>
        <Text accessibilityRole="header" style={{ ...t.type.heading, color: t.c.onBackdrop }}>
          {tr('online.newRoom')}
        </Text>
        <Text style={{ ...t.type.caption, color: t.c.onBackdropMuted }}>{tr('online.newRoomSub')}</Text>
      </View>

      <Text style={label}>{tr('home.board')}</Text>
      <View style={row}>
        {BOARD_CYCLE.map((b) => (
          <Chip
            key={b}
            text={tr('board.withPegs', { name: tr(`board.${b}`), n: BOARD_SPECS[b].pegs })}
            selected={board === b}
            locked={locked({ board: b })}
            onPress={() => (locked({ board: b }) ? setUnlocking(true) : setBoard(b))}
          />
        ))}
      </View>

      <Text style={label}>{tr('online.players')}</Text>
      <View style={row}>
        {SEAT_COUNTS.map((n) => (
          <Chip
            key={n}
            text={String(n)}
            selected={seats === n}
            locked={locked({ maxSeats: n })}
            onPress={() => (locked({ maxSeats: n }) ? setUnlocking(true) : setSeats(n))}
          />
        ))}
      </View>

      <Text style={label}>{tr('online.turnTime')}</Text>
      <View style={row}>
        {(['relaxed', 'quick'] as const).map((m) => (
          <Chip
            key={m}
            text={tr(`online.${m}`)}
            hint={tr(m === 'relaxed' ? 'online.relaxedHint' : 'online.quickHint')}
            selected={timer === m}
            onPress={() => setTimer(m)}
          />
        ))}
      </View>
      <Text style={{ ...t.type.caption, color: t.c.onBackdropMuted }}>
        {tr(timer === 'relaxed' ? 'online.relaxedHint' : 'online.quickHint')}
      </Text>

      <WideButton text={tr('online.create')} filled disabled={asked} onPress={create} />

      <Text accessibilityRole="header" style={{ ...t.type.heading, color: t.c.onBackdrop, marginTop: t.spacing.lg }}>
        {tr('online.haveCode')}
      </Text>
      <Card>
        <Text style={{ ...t.type.caption, color: t.c.textDim }}>{tr('online.codeHint')}</Text>
        <TextInput
          value={codeText}
          onChangeText={(v) => setCodeText(v.replace(/[^\d ]/g, '').slice(0, 7))}
          onSubmitEditing={join}
          placeholder="482 913"
          placeholderTextColor={t.c.line}
          accessibilityLabel={tr('online.codeLabel')}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={7}
          style={{
            minHeight: 56,
            paddingHorizontal: t.spacing.md,
            borderRadius: t.radii.md,
            borderWidth: 2,
            borderColor: t.c.line,
            color: t.c.text,
            ...t.type.title,
            letterSpacing: 4,
            textAlign: 'center',
            minWidth: 0,
          }}
        />
        <WideButton text={tr('online.join')} disabled={asked || !normalizeCode(codeText)} onPress={join} />
      </Card>
    </OnlineFrame>
  );
}
