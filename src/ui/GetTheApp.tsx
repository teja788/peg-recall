/**
 * Web game only: "Get Color Catch for iPhone and iPad", on Home and the
 * game-over sheet, never during a game. Wide screens (a computer, an iPad)
 * also get a QR code to scan with a phone; a phone gets just the button.
 * The app itself shows nothing.
 */
import React from 'react';
import { Image, Linking, Platform, Text, View, useWindowDimensions } from 'react-native';

import { tr } from '../i18n';
import { count } from '../store/analytics';
import { hasStore } from '../store/storefront';
import { useTheme } from '../theme';
import { Card, WideButton } from './online';
import { PLAY_URL } from './shareText';

const QR = require('../../assets/qr-appstore.png');

export function GetTheApp() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  // the app, and `expo start --web` (screenshots, iPad checks), sell the unlock themselves
  if (Platform.OS !== 'web' || hasStore) return null;
  const wide = width >= 700;
  const open = () => {
    count({ 'getapp.tap': 1 });
    void Linking.openURL(PLAY_URL);
  };
  return (
    <Card style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center' }}>
      {wide ? (
        <Image
          source={QR}
          accessibilityLabel={tr('getApp.scan')}
          style={{ width: 112, height: 112, borderRadius: t.radii.sm }}
        />
      ) : null}
      <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: t.spacing.sm }}>
        <Text style={{ ...t.type.heading, color: t.c.text }}>{tr('getApp.title')}</Text>
        {wide ? <Text style={{ ...t.type.body, color: t.c.textDim }}>{tr('getApp.scan')}</Text> : null}
        <WideButton text={tr('web.getApp')} onPress={open} />
      </View>
    </Card>
  );
}
