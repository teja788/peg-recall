import { create } from 'zustand';

/** true when "Buy" on the promoted unlock in the App Store opened the app:
 *  app/_layout.tsx then shows the unlock sheet (parent check first, as always). */
export const usePromoted = create<{ open: boolean }>(() => ({ open: false }));
