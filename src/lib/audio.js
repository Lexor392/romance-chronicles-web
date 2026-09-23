let audioContext;
let masterGain;
let activeNodes = [];

const tracks = {
  aurora: [174.61, 261.63, 349.23],
  velvet: [146.83, 220, 293.66],
  orbit: [110, 164.81, 246.94]
};

function ensureContext() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.035;
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') audioContext.resume();
}

export function stopMusic() {
  activeNodes.forEach(({ oscillator, gain }) => {
    try {
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.4);
      oscillator.stop(audioContext.currentTime + 0.45);
    } catch {
      // Audio nodes may already be stopped.
    }
  });
  activeNodes = [];
}

export function playMusic(trackId) {
  ensureContext();
  stopMusic();
  tracks[trackId].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 1 ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.7, audioContext.currentTime + 1.2);
    oscillator.connect(gain).connect(masterGain);
    oscillator.start();
    activeNodes.push({ oscillator, gain });
  });
}

export function playChoiceSound() {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(420, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(620, audioContext.currentTime + 0.18);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.3);
  oscillator.connect(gain).connect(masterGain);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.32);
}
