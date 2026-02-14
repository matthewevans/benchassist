import { useContext } from 'react';
import { AppContext, type AppContextValue } from '@/context/AppContext.tsx';

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
