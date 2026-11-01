import { useEffect, useState } from "react";

export const PREFERENCES_KEY = "lucky-draw.preferences.v1";

interface StoredPreferences {
  soundEnabled: boolean;
  reduceMotion: boolean;
}

function systemPrefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function loadPreferences(): StoredPreferences {
  const fallback = {
    soundEnabled: true,
    reduceMotion: systemPrefersReducedMotion(),
  };

  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(PREFERENCES_KEY) ?? "null",
    );

    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    const candidate = parsed as Partial<StoredPreferences>;
    return {
      soundEnabled:
        typeof candidate.soundEnabled === "boolean"
          ? candidate.soundEnabled
          : fallback.soundEnabled,
      reduceMotion:
        typeof candidate.reduceMotion === "boolean"
          ? candidate.reduceMotion
          : fallback.reduceMotion,
    };
  } catch {
    return fallback;
  }
}

export function usePreferences() {
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      // Preferences remain usable in memory when storage is blocked.
    }
  }, [preferences]);

  return {
    ...preferences,
    setSoundEnabled: (soundEnabled: boolean) =>
      setPreferences((previous) => ({ ...previous, soundEnabled })),
    setReduceMotion: (reduceMotion: boolean) =>
      setPreferences((previous) => ({ ...previous, reduceMotion })),
  };
}
