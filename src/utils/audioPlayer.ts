/**
 * Utility for playing PCM audio returned by Gemini TTS
 */

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioContextClass({ sampleRate: 24000 });
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

export function playBase64Pcm(base64Data: string, sampleRate = 24000): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audioCtx = getAudioContext();
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit signed PCM to float32
      const int16View = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      const float32Array = new Float32Array(int16View.length);
      for (let i = 0; i < int16View.length; i++) {
        float32Array[i] = int16View[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => resolve();
      source.start();
    } catch (err) {
      console.error('Audio playback error:', err);
      reject(err);
    }
  });
}

/**
 * Play a soothing, audible completion chime using Web Audio API
 */
export function playCompletionAlert(): void {
  try {
    const audioCtx = getAudioContext();
    const now = audioCtx.currentTime;

    // Harmonic bell sequence: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.85);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.9);
    });
  } catch (err) {
    console.error('Failed to play completion alert chime:', err);
  }
}

