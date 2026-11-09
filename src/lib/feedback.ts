/**
 * Sound and haptic feedback for study interactions.
 *
 * No audio assets: a couple of oscillator beeps through the Web Audio API are
 * enough signal for "card flipped" / "rated this" and avoid shipping and
 * licensing sound files for something this small. One AudioContext is reused
 * because Safari caps how many can exist and creating one per tap leaks them.
 *
 * Both effects are opt-in and read from the caller, never from here, so this
 * module stays free of React and Firebase and can be called from anywhere —
 * see `usePreferences` for where the on/off state actually lives.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function beep(frequency: number, durationMs: number, gain = 0.05) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  volume.gain.value = gain;

  oscillator.connect(volume);
  volume.connect(ctx.destination);

  const now = ctx.currentTime;
  oscillator.start(now);
  // Linear fade rather than a hard stop, so it doesn't click.
  volume.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
  oscillator.stop(now + durationMs / 1000);
}

export function playTapSound(enabled: boolean) {
  if (!enabled) return;
  beep(520, 70);
}

export function playCorrectSound(enabled: boolean) {
  if (!enabled) return;
  beep(660, 90);
  setTimeout(() => beep(880, 110), 70);
}

export function playIncorrectSound(enabled: boolean) {
  if (!enabled) return;
  beep(220, 140, 0.04);
}

export function triggerHaptic(
  enabled: boolean,
  pattern: number | number[] = 12,
) {
  if (!enabled) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw rather than no-op when called outside a user
    // gesture; either way there is nothing to recover.
  }
}
