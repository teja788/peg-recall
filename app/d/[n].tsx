/**
 * Where a "Beat my score" link lands (…/d/47?s=8&r=14&by=Ravi): board #47 on
 * the game screen, which reads the link strictly (src/ui/challenge.ts).
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function ChallengeLink() {
  const { n, s, r, by } = useLocalSearchParams<{ n: string; s?: string; r?: string; by?: string }>();
  // only plain strings go on (a repeated ?s=…&s=… is an array: dropped)
  const params = Object.fromEntries(
    Object.entries({ d: n, s, r, by }).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );
  return <Redirect href={{ pathname: '/game', params: { mode: 'ai', ...params } }} />;
}
