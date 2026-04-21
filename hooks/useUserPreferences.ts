// hooks/useUserPreferences.ts

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { updateUserProfile } from '@/lib/firebase/firestore';

// === Type Definitions ===

export interface TypingTheme {
  id: string;
  name: string;
  gradient: string;
  textColor: string;
  isDark: boolean; // Whether this theme is designed for dark mode
}

export interface TypingFont {
  id: string;
  name: string;
  className: string;
  isMonospace: boolean; // For categorization
}

// === Theme & Font Constants ===

export const TYPING_THEMES: TypingTheme[] = [
  { id: "standard", name: "Standard", gradient: "from-background to-background", textColor: "text-foreground", isDark: false },
  { id: "midnight-blue", name: "Midnight Blue", gradient: "from-slate-900/60 via-blue-900/40 to-slate-900/60", textColor: "text-blue-100", isDark: true },
  { id: "forest-mist", name: "Forest Mist", gradient: "from-emerald-900/50 via-teal-800/30 to-emerald-900/50", textColor: "text-emerald-100", isDark: true },
  { id: "neon-dreams", name: "Neon Dreams", gradient: "from-purple-600/40 via-pink-500/40 to-cyan-500/40", textColor: "text-white", isDark: true },
  { id: "sunset-blaze", name: "Sunset Blaze", gradient: "from-orange-600/50 via-red-500/40 to-pink-600/50", textColor: "text-orange-50", isDark: true },
  { id: "ocean-aurora", name: "Ocean Aurora", gradient: "from-cyan-600/40 via-blue-500/40 to-purple-600/40", textColor: "text-cyan-50", isDark: true },
  { id: "light-sky", name: "Light Sky", gradient: "from-blue-100/80 via-cyan-50/80 to-blue-100/80", textColor: "text-gray-900", isDark: false },
  { id: "soft-lavender", name: "Soft Lavender", gradient: "from-purple-100/70 via-pink-50/70 to-purple-100/70", textColor: "text-gray-900", isDark: false },
  { id: "cosmic-void", name: "Cosmic Void", gradient: "from-slate-950/80 via-purple-950/60 via-blue-950/60 to-slate-950/80", textColor: "text-purple-100", isDark: true },
  { id: "matrix-code", name: "Matrix Code", gradient: "from-black/90 via-green-950/70 to-black/90", textColor: "text-green-400", isDark: true },
];

export const TYPING_FONTS: TypingFont[] = [
  // Monospaced fonts (for coding/serious practice)
  { id: "fira-code", name: "Fira Code", className: "font-[family-name:var(--font-fira-code)]", isMonospace: true },
  { id: "jetbrains-mono", name: "JetBrains Mono", className: "font-[family-name:var(--font-jetbrains-mono)]", isMonospace: true },
  { id: "source-code-pro", name: "Source Code Pro", className: "font-[family-name:var(--font-source-code-pro)]", isMonospace: true },
  { id: "roboto-mono", name: "Roboto Mono", className: "font-[family-name:var(--font-roboto-mono)]", isMonospace: true },
  { id: "ubuntu-mono", name: "Ubuntu Mono", className: "font-[family-name:var(--font-ubuntu-mono)]", isMonospace: true },
  // Decorative fonts (for fun/stylistic typing)
  { id: "playfair-display", name: "Playfair Display", className: "font-[family-name:var(--font-playfair-display)]", isMonospace: false },
  { id: "lobster", name: "Lobster", className: "font-[family-name:var(--font-lobster)]", isMonospace: false },
  { id: "pacifico", name: "Pacifico", className: "font-[family-name:var(--font-pacifico)]", isMonospace: false },
  { id: "merriweather", name: "Merriweather", className: "font-[family-name:var(--font-merriweather)]", isMonospace: false },
  { id: "righteous", name: "Righteous", className: "font-[family-name:var(--font-righteous)]", isMonospace: false },
];

// === External Store for Cross-Tab Sync ===

type Listener = () => void;
let listeners: Listener[] = [];
let currentThemeId = "standard";
let currentFontId = "fira-code";
let currentSoundPackId = "disabled";
let currentSoundVolume = 0.5;
let currentSoundEnabled = false;

// Initialize from localStorage
if (typeof window !== 'undefined') {
  currentThemeId = localStorage.getItem('zentype-typing-theme') || "standard";
  currentFontId = localStorage.getItem('zentype-typing-font') || "fira-code";
  currentSoundPackId = localStorage.getItem('zentype-sound-pack') || "disabled";
  currentSoundVolume = parseFloat(localStorage.getItem('zentype-sound-volume') || "0.5");
  currentSoundEnabled = localStorage.getItem('zentype-sound-enabled') === 'true';
}

// Cache the snapshot to prevent infinite loops (React requirement)
let cachedSnapshot = { 
  themeId: currentThemeId, 
  fontId: currentFontId,
  soundPackId: currentSoundPackId,
  soundVolume: currentSoundVolume,
  soundEnabled: currentSoundEnabled,
};

const preferencesStore = {
  subscribe(listener: Listener) {
    listeners.push(listener);
    // Listen for storage events (cross-tab changes)
    const storageListener = (e: StorageEvent) => {
      if (e.key?.startsWith('zentype-')) {
        if (e.key === 'zentype-typing-theme' && e.newValue) {
          currentThemeId = e.newValue;
        }
        if (e.key === 'zentype-typing-font' && e.newValue) {
          currentFontId = e.newValue;
        }
        if (e.key === 'zentype-sound-pack' && e.newValue) {
          currentSoundPackId = e.newValue;
        }
        if (e.key === 'zentype-sound-volume' && e.newValue) {
          currentSoundVolume = parseFloat(e.newValue);
        }
        if (e.key === 'zentype-sound-enabled' && e.newValue) {
          currentSoundEnabled = e.newValue === 'true';
        }
        cachedSnapshot = { 
          themeId: currentThemeId, 
          fontId: currentFontId,
          soundPackId: currentSoundPackId,
          soundVolume: currentSoundVolume,
          soundEnabled: currentSoundEnabled,
        };
        listeners.forEach((l) => l());
      }
    };
    window.addEventListener('storage', storageListener);
    
    return () => {
      listeners = listeners.filter((l) => l !== listener);
      window.removeEventListener('storage', storageListener);
    };
  },
  getSnapshot() {
    return cachedSnapshot;
  },
  getServerSnapshot() {
    // Must be cached for SSR (same instance returned every time)
    return cachedSnapshot;
  },
  setTheme(themeId: string) {
    currentThemeId = themeId;
    localStorage.setItem('zentype-typing-theme', themeId);
    cachedSnapshot = { 
      themeId: currentThemeId, 
      fontId: currentFontId,
      soundPackId: currentSoundPackId,
      soundVolume: currentSoundVolume,
      soundEnabled: currentSoundEnabled,
    };
    listeners.forEach((l) => l());
  },
  setFont(fontId: string) {
    currentFontId = fontId;
    localStorage.setItem('zentype-typing-font', fontId);
    cachedSnapshot = { 
      themeId: currentThemeId, 
      fontId: currentFontId,
      soundPackId: currentSoundPackId,
      soundVolume: currentSoundVolume,
      soundEnabled: currentSoundEnabled,
    };
    listeners.forEach((l) => l());
  },
  setSoundPack(soundPackId: string) {
    currentSoundPackId = soundPackId;
    localStorage.setItem('zentype-sound-pack', soundPackId);
    cachedSnapshot = { 
      themeId: currentThemeId, 
      fontId: currentFontId,
      soundPackId: currentSoundPackId,
      soundVolume: currentSoundVolume,
      soundEnabled: currentSoundEnabled,
    };
    listeners.forEach((l) => l());
  },
  setSoundVolume(volume: number) {
    currentSoundVolume = volume;
    localStorage.setItem('zentype-sound-volume', volume.toString());
    cachedSnapshot = { 
      themeId: currentThemeId, 
      fontId: currentFontId,
      soundPackId: currentSoundPackId,
      soundVolume: currentSoundVolume,
      soundEnabled: currentSoundEnabled,
    };
    listeners.forEach((l) => l());
  },
  setSoundEnabled(enabled: boolean) {
    currentSoundEnabled = enabled;
    localStorage.setItem('zentype-sound-enabled', enabled.toString());
    cachedSnapshot = { 
      themeId: currentThemeId, 
      fontId: currentFontId,
      soundPackId: currentSoundPackId,
      soundVolume: currentSoundVolume,
      soundEnabled: currentSoundEnabled,
    };
    listeners.forEach((l) => l());
  },
};

/**
 * Custom hook to manage user preferences (theme, font, etc.)
 * Provides centralized state management with Firestore persistence
 */
export const useUserPreferences = () => {
  const { user, profile, isLoading } = useAuth();
  const preferences = useSyncExternalStore(
    preferencesStore.subscribe,
    preferencesStore.getSnapshot,
    preferencesStore.getServerSnapshot
  );

  const [dynamicTextColor, setDynamicTextColor] = useState<string>("text-foreground");

  // Load preferences from profile on mount
  useEffect(() => {
    if (profile && !isLoading) {
      if (profile.preferredThemeId && profile.preferredThemeId !== preferences.themeId) {
        preferencesStore.setTheme(profile.preferredThemeId);
        console.log('Loaded theme preference from profile:', profile.preferredThemeId);
      }
      if (profile.preferredFontId && profile.preferredFontId !== preferences.fontId) {
        preferencesStore.setFont(profile.preferredFontId);
        console.log('Loaded font preference from profile:', profile.preferredFontId);
      }
      // Load sound preferences (if they exist in profile)
      if ((profile as any).soundPackId && (profile as any).soundPackId !== preferences.soundPackId) {
        preferencesStore.setSoundPack((profile as any).soundPackId);
        console.log('Loaded sound pack preference from profile:', (profile as any).soundPackId);
      }
      if (typeof (profile as any).soundVolume === 'number' && (profile as any).soundVolume !== preferences.soundVolume) {
        preferencesStore.setSoundVolume((profile as any).soundVolume);
        console.log('Loaded sound volume preference from profile:', (profile as any).soundVolume);
      }
      if (typeof (profile as any).soundEnabled === 'boolean' && (profile as any).soundEnabled !== preferences.soundEnabled) {
        preferencesStore.setSoundEnabled((profile as any).soundEnabled);
        console.log('Loaded sound enabled preference from profile:', (profile as any).soundEnabled);
      }
    }
  }, [profile, isLoading]);

  // Find current theme and font objects
  const currentTheme = TYPING_THEMES.find((t) => t.id === preferences.themeId) || TYPING_THEMES[0];
  const currentFont = TYPING_FONTS.find((f) => f.id === preferences.fontId) || TYPING_FONTS[0];

  // Dynamic text color calculation based on theme and light/dark mode
  useEffect(() => {
    const updateTextColor = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      
      if (currentTheme.id === 'standard') {
        // Standard theme always uses CSS variable
        setDynamicTextColor('text-foreground');
      } else if (currentTheme.isDark && !isDarkMode) {
        // Dark theme in light mode → use darker text
        setDynamicTextColor('text-gray-800');
      } else if (!currentTheme.isDark && isDarkMode) {
        // Light theme in dark mode → use lighter text
        setDynamicTextColor('text-white');
      } else {
        // Perfect match (dark theme in dark mode or light theme in light mode)
        setDynamicTextColor(currentTheme.textColor);
      }
    };

    updateTextColor();

    // Watch for light/dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTextColor();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [currentTheme]);

  // Set theme with Firestore persistence
  const setTheme = async (themeId: string) => {
    preferencesStore.setTheme(themeId);
    
    if (user && profile) {
      try {
        await updateUserProfile(user.uid, { preferredThemeId: themeId });
        console.log('Theme preference saved to profile:', themeId);
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };

  // Set font with Firestore persistence
  const setFont = async (fontId: string) => {
    preferencesStore.setFont(fontId);
    
    if (user && profile) {
      try {
        await updateUserProfile(user.uid, { preferredFontId: fontId });
        console.log('Font preference saved to profile:', fontId);
      } catch (error) {
        console.error('Error saving font preference:', error);
      }
    }
  };

  // Set sound pack with Firestore persistence
  const setSoundPack = async (soundPackId: string) => {
    preferencesStore.setSoundPack(soundPackId);
    
    if (user && profile) {
      try {
        await updateUserProfile(user.uid, { soundPackId } as any);
        console.log('Sound pack preference saved to profile:', soundPackId);
      } catch (error) {
        console.error('Error saving sound pack preference:', error);
      }
    }
  };

  // Set sound volume with Firestore persistence
  const setSoundVolume = async (volume: number) => {
    preferencesStore.setSoundVolume(volume);
    
    if (user && profile) {
      try {
        await updateUserProfile(user.uid, { soundVolume: volume } as any);
        console.log('Sound volume preference saved to profile:', volume);
      } catch (error) {
        console.error('Error saving sound volume preference:', error);
      }
    }
  };

  // Set sound enabled with Firestore persistence
  const setSoundEnabled = async (enabled: boolean) => {
    preferencesStore.setSoundEnabled(enabled);
    
    if (user && profile) {
      try {
        await updateUserProfile(user.uid, { soundEnabled: enabled } as any);
        console.log('Sound enabled preference saved to profile:', enabled);
      } catch (error) {
        console.error('Error saving sound enabled preference:', error);
      }
    }
  };

  return {
    // Arrays of all available options
    availableThemes: TYPING_THEMES,
    availableFonts: TYPING_FONTS,
    
    // Current selections
    currentTheme,
    currentFont,
    
    // Smart text color
    dynamicTextColor,
    
    // Setters
    setTheme,
    setFont,
    setSoundPack,
    setSoundVolume,
    setSoundEnabled,
    
    // Sound preferences
    soundPackId: preferences.soundPackId,
    soundVolume: preferences.soundVolume,
    soundEnabled: preferences.soundEnabled,
    
    // Loading state
    isLoading,
    
    // Legacy compatibility
    themeId: preferences.themeId,
    fontId: preferences.fontId,
  };
};
