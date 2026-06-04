import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/useAppStore';
import type { AppStore } from '../store/useAppStore';

export const useAppContext = <T,>(selector: (state: AppStore) => T): T => {
  return useAppStore(useShallow(selector));
};
