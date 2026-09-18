import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { DARK, LIGHT, layout, radii, spacing, timing, type, type Surfaces } from './tokens';

export * from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  c: Surfaces;
  spacing: typeof spacing;
  radii: typeof radii;
  type: typeof type;
  layout: typeof layout;
  timing: typeof timing;
}

function makeTheme(scheme: 'light' | 'dark'): Theme {
  return {
    scheme,
    c: scheme === 'dark' ? DARK : LIGHT,
    spacing,
    radii,
    type,
    layout,
    timing,
  };
}

const LIGHT_THEME = makeTheme('light');
const DARK_THEME = makeTheme('dark');

const ThemeContext = createContext<Theme>(LIGHT_THEME);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => (scheme === 'dark' ? DARK_THEME : LIGHT_THEME), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Reads the current theme. Falls back to the system scheme outside a provider. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
