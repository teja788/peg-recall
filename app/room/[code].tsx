/**
 * The waiting room (PLAN-web-online.md §B1): the code, Invite, the seats as
 * people arrive, and for the host: add the computer, remove a player, start.
 * When the game starts every device moves to the game screen together.
 *
 * Opened straight (a reload, an old tab) it rejoins with the seat saved on
 * this device, or sends you to the join page.
 */
import { Avatar } from '@art';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Linking, Text, View } from 'react-native';

import type { Difficulty } from '../../src/engine/types';
import { tr } from '../../src/i18n';
import { HOST_LIMITS, inviteUrl, reportUrl } from '../../src/online/config';
import { needsUnlock } from '../../src/online/limits';
import { formatCode, normalizeCode, type SeatInfo } from '../../src/online/protocol';
import { useGame } from '../../src/store/game';
import { useRoom } from '../../src/store/room';
import { animalName, useSettings } from '../../src/store/settings';
import { useTheme } from '../../src/theme';
import { Chip } from '../../src/ui/controls';
import { shareMessage } from '../../src/ui/GameOverSheet';
import { Card, Note, OnlineFrame, StatusLine, WideButton, endedText, errorText, seatName } from '../../src/ui/online';
import { PillButton } from '../../src/ui/StatsCard';

const BOTS: Difficulty[] = ['bunny', 'fox', 'owl'];

export default function RoomScreen() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = normalizeCode(params.code);
  const status = useRoom((s) => s.status);
  const room = useRoom((s) => s.room);
  const mySeat = useRoom((s) => s.seat);
  const myCode = useRoom((s) => s.code);
  const error = useRoom((s) => s.error);
  const ended = useRoom((s) => s.ended);
  const unlocked = useSettings((s) => s.unlocked);
  const playing = useGame((s) => s.remote != null && s.state != null);
  /** the game is on, but this device has no board for it (the browser's Back
   *  left the game screen): asking for the seat again brings the board, and
   *  the effect below goes back to the table */
  const away = !!room && room.status === 'playing' && !playing && myCode === code && !!mySeat;
  const askedBoard = useRef(false);

  // opened straight: back into the seat saved on this device, or to the join page
  useEffect(() => {
    if (!code) return void router.replace('/');
    if (ended || (myCode === code && useRoom.getState().seat)) return;
    void useRoom
      .getState()
      .rejoin(code)
      .then((ok) => {
        if (!ok) router.replace({ pathname: '/join/[code]', params: { code } });
      });
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the game is on: everyone to the table
  useEffect(() => {
    if (code && playing && room?.status === 'playing') {
      router.replace({ pathname: '/game', params: { room: code } });
    }
  }, [playing, room?.status, code, router]);

  // once on arrival; the "Back to the game" button is there if it fails
  useEffect(() => {
    if (!away || askedBoard.current) return;
    askedBoard.current = true;
    useRoom.getState().resync();
  }, [away]);

  const home = () => {
    useRoom.getState().leave();
    router.replace('/');
  };

  if (ended) {
    return (
      <OnlineFrame title={tr('online.title')} onBack={() => (useRoom.getState().clear(), router.replace('/'))}>
        <Note text={endedText(ended)} />
        <WideButton text={tr('common.home')} onPress={() => (useRoom.getState().clear(), router.replace('/'))} />
      </OnlineFrame>
    );
  }

  const isHost = !!room && room.host === mySeat;
  const hostSeat = room?.seats.find((s) => s.id === room.host);
  const full = !!room && room.seats.length >= room.settings.maxSeats;
  const shown = code ? formatCode(code) : '';

  const invite = () => {
    if (!code) return;
    const url = inviteUrl(code);
    void shareMessage(url ? tr('online.inviteText', { url, code: shown }) : tr('online.inviteCode', { code: shown }));
  };

  return (
    <OnlineFrame title={tr('online.waiting')} onBack={home}>
      <StatusLine status={status} />
      {error ? <Note text={errorText(error)} /> : null}

      <Card style={{ alignItems: 'center' }}>
        <Text style={{ ...t.type.label, color: t.c.textDim }}>{tr('online.codeLabel')}</Text>
        <Text
          accessibilityLabel={tr('online.room', { code: shown.split('').join(' ') })}
          style={{ ...t.type.display, color: t.c.text, letterSpacing: 6 }}
        >
          {shown}
        </Text>
        <View style={{ alignSelf: 'stretch' }}>
          <WideButton text={tr('online.invite')} filled onPress={invite} />
        </View>
      </Card>

      <Card>
        {room
          ? Array.from({ length: room.settings.maxSeats }, (_, i) => {
              const seat = room.seats[i];
              return seat ? (
                <SeatRow
                  key={seat.id}
                  seat={seat}
                  me={seat.id === mySeat}
                  host={seat.id === room.host}
                  onRemove={isHost && seat.id !== mySeat ? () => useRoom.getState().removeSeat(seat.id) : undefined}
                />
              ) : (
                <EmptySeat key={`free${i}`} />
              );
            })
          : null}
      </Card>

      {isHost && room && !full ? (
        <>
          <Text style={{ ...t.type.label, color: t.c.onBackdropMuted }}>{tr('online.addComputer')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
            {BOTS.filter((d) => !room.seats.some((s) => s.kind === 'ai' && s.difficulty === d)).map((d) => (
              <Chip
                key={d}
                text={animalName(d)}
                hint={tr(`tier.${d}`)}
                locked={needsUnlock(HOST_LIMITS, unlocked, { bot: d })}
                onPress={() => useRoom.getState().addBot(d)}
              />
            ))}
          </View>
        </>
      ) : null}

      {away ? (
        <WideButton text={tr('online.backToGame')} filled onPress={() => useRoom.getState().resync()} />
      ) : room ? (
        isHost ? (
          <>
            <WideButton
              text={tr('online.start')}
              filled
              disabled={room.seats.length < 2}
              onPress={() => useRoom.getState().start()}
            />
            {room.seats.length < 2 ? (
              <Text style={{ ...t.type.caption, color: t.c.onBackdropMuted, textAlign: 'center' }}>
                {tr('online.needMore')}
              </Text>
            ) : null}
          </>
        ) : (
          <Text
            accessibilityLiveRegion="polite"
            style={{ ...t.type.body, color: t.c.onBackdrop, textAlign: 'center' }}
          >
            {tr('online.waitHost', { name: hostSeat ? seatName(hostSeat) : '' })}
          </Text>
        )
      ) : null}

      <WideButton text={tr('online.leave')} onPress={home} />
      {code ? (
        <View style={{ alignItems: 'center' }}>
          <PillButton
            text={tr('online.report')}
            onPress={() => void Linking.openURL(reportUrl(code, mySeat)).catch(() => {})}
          />
        </View>
      ) : null}
    </OnlineFrame>
  );
}

function SeatRow({
  seat,
  me,
  host,
  onRemove,
}: {
  seat: SeatInfo;
  me: boolean;
  host: boolean;
  onRemove?: () => void;
}) {
  const t = useTheme();
  const name = seatName(seat);
  const tags = [
    me ? tr('online.you') : null,
    host ? tr('online.host') : null,
    seat.kind === 'ai' ? tr('common.computer') : null,
    seat.online ? null : tr('online.away'),
  ].filter(Boolean);
  return (
    <View
      accessible
      accessibilityLabel={[name, ...tags].join(', ')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, opacity: seat.online ? 1 : 0.55 }}
    >
      <Avatar id={seat.avatar} size={40} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ ...t.type.body, color: t.c.text }}>
          {name}
        </Text>
        {tags.length ? (
          <Text style={{ ...t.type.caption, color: t.c.textDim }}>{tags.join(' · ')}</Text>
        ) : null}
      </View>
      {onRemove ? (
        <PillButton text={tr('online.remove')} label={tr('online.removeLabel', { name })} onPress={onRemove} />
      ) : null}
    </View>
  );
}

function EmptySeat() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
      <View
        style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: t.c.line }}
      />
      <Text style={{ ...t.type.body, color: t.c.textDim }}>{tr('online.emptySeat')}</Text>
    </View>
  );
}
