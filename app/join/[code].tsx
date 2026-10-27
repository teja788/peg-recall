/**
 * Where an invite link lands (…/join/482913), in the web game or the app:
 * "You're invited", your animal and name, Join. A device that already has a
 * seat in this room goes straight back to it.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { tr } from '../../src/i18n';
import { onlineEnabled } from '../../src/online/config';
import { formatCode, normalizeCode } from '../../src/online/protocol';
import { useRoom } from '../../src/store/room';
import { useSettings } from '../../src/store/settings';
import { useTheme } from '../../src/theme';
import { Card, Note, OnlineFrame, StatusLine, WideButton, YouRow, errorText } from '../../src/ui/online';

export default function JoinScreen() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = normalizeCode(params.code);
  const status = useRoom((s) => s.status);
  const error = useRoom((s) => s.error);
  const seat = useRoom((s) => s.seat);
  const roomCode = useRoom((s) => s.code);
  const hydrated = useSettings((s) => s.hydrated);
  const [asked, setAsked] = useState(false);

  // already sitting in this room on this device: back to it
  useEffect(() => {
    if (!code || !onlineEnabled) return;
    void useRoom
      .getState()
      .rejoin(code)
      .then((ok) => ok && router.replace({ pathname: '/room/[code]', params: { code } }));
  }, [code, router]);

  useEffect(() => {
    if (asked && seat && roomCode === code && code) router.replace({ pathname: '/room/[code]', params: { code } });
  }, [asked, seat, roomCode, code, router]);
  useEffect(() => {
    if (error) setAsked(false);
  }, [error]);

  const join = () => {
    if (!code) return;
    const s = useSettings.getState();
    useRoom.getState().clear();
    setAsked(true);
    useRoom.getState().join(code, s.names[0] || undefined, s.avatars[0]);
  };

  const home = () => router.replace('/');

  if (!onlineEnabled || !code) {
    return (
      <OnlineFrame title={tr('online.title')} onBack={home}>
        <Note text={tr(onlineEnabled ? 'online.err.notFound' : 'online.err.rules')} />
        <WideButton text={tr('common.home')} onPress={home} />
      </OnlineFrame>
    );
  }

  return (
    <OnlineFrame title={tr('online.title')} onBack={home}>
      <StatusLine status={asked ? status : 'open'} />
      {error ? <Note text={errorText(error)} /> : null}
      <Card>
        <Text accessibilityRole="header" style={{ ...t.type.title, color: t.c.text }}>
          {tr('online.invited')}
        </Text>
        <Text style={{ ...t.type.heading, color: t.c.textDim }}>{tr('online.room', { code: formatCode(code) })}</Text>
      </Card>
      <Card>
        <YouRow />
      </Card>
      <WideButton text={tr('online.join')} filled disabled={asked || !hydrated} onPress={join} />
    </OnlineFrame>
  );
}
