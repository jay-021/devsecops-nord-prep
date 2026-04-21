// components/user-preferences-loader.tsx

"use client";

import { ReactNode } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface UserPreferencesLoaderProps {
  children: ReactNode;
}

/**
 * Component that loads and applies user preferences from their profile
 * This runs after authentication is complete and applies theme/font preferences
 */
export const UserPreferencesLoader = ({ children }: UserPreferencesLoaderProps) => {
  // This hook automatically loads preferences from profile and applies them
  useUserPreferences();

  // Simply render children - the hook handles the preference loading
  return <>{children}</>;
};
