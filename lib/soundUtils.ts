/**
 * Web Audio API synthesizer for message alert chime.
 * Generates an elegant, gentle two-tone chime without external audio files.
 * Works 100% offline and in all modern browsers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playMessageSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: 659.25 Hz (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tone 2: 830.61 Hz (G#5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.08);

    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.08);
    osc2.stop(now + 0.38);
  } catch (e) {
    // AudioContext autoplay restrictions or browser block
    console.debug('Audio notification skipped', e);
  }
}

/**
 * Request Web Notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  } catch {
    return 'denied';
  }
}

/**
 * Show system web notification if window is in background
 */
export function showBrowserNotification(title: string, body: string, icon = '/favicon.ico') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted' && document.hidden) {
    try {
      const notification = new Notification(title, {
        body,
        icon,
        silent: true, // We already play our synthesized chime
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (e) {
      console.debug('Notification could not be displayed', e);
    }
  }
}
