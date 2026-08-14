/**
 * Vibration + beep so a successful scan is felt/heard, not just logged — the
 * user is looking at the game box in front of the camera, not the screen.
 * Best-effort: silently no-ops wherever the browser doesn't support it.
 */
export function notifyCodeDetected() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(80);
  }

  try {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => void ctx.close();
  } catch {
    // Web Audio unsupported/blocked — vibration and the visual flash still cover it.
  }
}
