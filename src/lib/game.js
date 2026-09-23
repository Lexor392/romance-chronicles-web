export const STORAGE_KEY = 'lumen-save-v1';

export const defaultStoryState = (storyId) => ({
  storyId,
  chapterIndex: 0,
  metrics: { bond: 0, courage: 0, insight: 0 },
  chosen: [],
  completed: false,
  endingId: null,
  updatedAt: Date.now()
});

export const emptySave = () => ({
  stories: {},
  settings: { music: true, sound: true },
  lastStoryId: null
});

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw);
    return {
      ...emptySave(),
      ...parsed,
      settings: { ...emptySave().settings, ...(parsed.settings || {}) },
      stories: parsed.stories || {}
    };
  } catch {
    return emptySave();
  }
}

export function saveGame(save) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

export function getStoryState(save, storyId) {
  return save.stories[storyId] || defaultStoryState(storyId);
}

export function canChoose(choice, metrics) {
  if (!choice.requires) return true;
  return Object.entries(choice.requires).every(([key, value]) => (metrics[key] || 0) >= value);
}

export function applyChoice(state, choice) {
  const metrics = { ...state.metrics };
  Object.entries(choice.effects || {}).forEach(([key, value]) => {
    metrics[key] = Math.max(-5, Math.min(12, (metrics[key] || 0) + value));
  });
  return {
    ...state,
    metrics,
    chosen: [...state.chosen, choice.id],
    updatedAt: Date.now()
  };
}

export function resolveEnding(story, metrics) {
  const score = metrics.bond + metrics.courage + metrics.insight;
  const endingId = score >= story.endingThresholds.heroic && metrics.bond >= 4
    ? 'hope'
    : score >= story.endingThresholds.bittersweet
      ? 'bittersweet'
      : 'shadow';
  return story.endings.find((ending) => ending.id === endingId) || story.endings[0];
}

export function percentComplete(state, story) {
  if (state.completed) return 100;
  return Math.round((state.chapterIndex / story.chapters.length) * 100);
}
