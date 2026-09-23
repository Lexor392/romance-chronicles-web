let musicElement = null;
let currentTrack = null;
let audioContext = null;

export function playMusic(src) {
  if (!src) return;
  if (!musicElement) {
    musicElement = new window.Audio();
    musicElement.loop = true;
    musicElement.volume = 0.32;
    musicElement.preload = 'auto';
  }
  if (currentTrack !== src) {
    musicElement.src = src;
    currentTrack = src;
  }
  const promise = musicElement.play();
  if (promise?.catch) promise.catch(() => {});
}

export function stopMusic() {
  if (!musicElement) return;
  musicElement.pause();
  musicElement.currentTime = 0;
}

export function setMusicVolume(volume) {
  if (musicElement) musicElement.volume = volume;
}

export function playChoiceSound() {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(740, audioContext.currentTime + 0.14);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.24);
}

