# Keyboard Sound Packs

This directory contains mechanical keyboard sound effects for ZenType's typing test.

## Available Sound Packs

### 1. Cherry MX Blue
- **Type:** Clicky
- **Description:** Classic clicky mechanical switch sound. Tactile bump with audible click.
- **File:** `cherry-mx-blue/keypress.mp3` (2.0KB)

### 2. Cherry MX Brown
- **Type:** Tactile
- **Description:** Popular tactile switch with quiet operation. Tactile bump without click.
- **File:** `cherry-mx-brown/keypress.mp3` (2.4KB)

### 3. Holy Panda
- **Type:** Premium Tactile
- **Description:** Enthusiast-favorite tactile switch with sharp tactility.
- **File:** `holy-panda/keypress.mp3` (2.0KB)

### 4. Topre
- **Type:** Electro-Capacitive
- **Description:** Unique "thock" sound from hybrid rubber dome/spring mechanism.
- **File:** `topre/keypress.mp3` (3.3KB)

### 5. Buckling Spring
- **Type:** Clicky (Vintage)
- **Description:** IBM Model M typewriter sound. Distinctive loud click.
- **File:** `buckling-spring/keypress.mp3` (3.3KB)

### 6. NovelKeys Cream
- **Type:** Linear
- **Description:** Smooth linear switch with deep sound profile.
- **File:** `novelkeys-cream/keypress.mp3` (2.0KB)

## Error Sound

Each sound pack includes an error sound for incorrect keystrokes:
- **File:** `[pack-name]/error.wav` (13KB)
- **Type:** Descending tone (440Hz → 220Hz)
- **Duration:** 150ms
- **Description:** A subtle descending beep that provides audio feedback for typing errors without disrupting flow
- **Generated:** Programmatically created using Node.js WAV generation script

### Error Sound Design

The error sound is designed to be:
- **Distinctive:** Different from mechanical keyboard sounds to clearly indicate errors
- **Unobtrusive:** Short duration (150ms) to avoid disrupting typing rhythm
- **Audible:** Descending tone provides clear negative feedback
- **Consistent:** Same error sound across all keyboard sound packs

## Sound Source & License

All sound files are sourced from the [kbsim project](https://github.com/tplai/kbsim) by tplai.

- **License:** MIT License
- **Repository:** https://github.com/tplai/kbsim
- **Original Files:** `src/assets/audio/[switch]/press/GENERIC_R0.mp3`

## Technical Specifications

- **Format:** MP3
- **File Size:** 2-3.3KB per sound
- **Duration:** ~100-300ms
- **Sample Rate:** Optimized for web playback

## Usage

Sound files are loaded and played using the `use-sound` library in the `useKeyboardSound` hook.

```typescript
import useSound from 'use-sound';

// Keypress sound for correct typing
const [playKeypress] = useSound('/sounds/cherry-mx-blue/keypress.mp3', {
  volume: 0.5,
});

// Error sound for incorrect typing
const [playError] = useSound('/sounds/cherry-mx-blue/error.wav', {
  volume: 0.5,
});

// In typing handler:
if (isCorrect) {
  playKeypress();
} else {
  playError();
}
```

## Future Sound Packs

Additional sound packs can be added by:
1. Adding a new directory: `public/sounds/[pack-name]/`
2. Including a `keypress.mp3` file
3. Updating the sound pack selector in Settings
4. Adding the pack name to `soundPackOptions` constant
