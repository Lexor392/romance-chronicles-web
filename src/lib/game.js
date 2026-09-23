export const STORAGE_KEY = 'lumen-visual-novel-v2';

export const defaultState = (storyId) => ({
  storyId,
  chapterIndex: 0,
  routeCounts: { artem: 0, nikita: 0, ilya: 0, self: 0 },
  chosen: [],
  completed: false,
  endingId: null,
  epilogueSeen: false,
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
  return save.stories[storyId] || defaultState(storyId);
}

export function applyChoice(state, choice, story) {
  const routeCounts = { ...state.routeCounts };
  routeCounts[choice.route] = (routeCounts[choice.route] || 0) + (choice.effect || 1);
  const isFinalChapter = state.chapterIndex >= story.chapters.length - 1;
  return {
    ...state,
    chapterIndex: isFinalChapter ? state.chapterIndex : state.chapterIndex + 1,
    routeCounts,
    chosen: [...state.chosen, choice.id],
    completed: isFinalChapter,
    endingId: isFinalChapter ? choice.route : null,
    updatedAt: Date.now()
  };
}

export function resolveEnding(story, state) {
  if (state.endingId && story.endings[state.endingId]) return story.endings[state.endingId];
  const scores = Object.entries(state.routeCounts).sort((a, b) => b[1] - a[1]);
  const [topRoute, topScore] = scores[0];
  const secondScore = scores[1]?.[1] || 0;
  const endingId = topRoute !== 'self' && topScore - secondScore <= 1 ? 'self' : topRoute;
  return story.endings[endingId] || story.endings.self;
}

export function percentComplete(state, story) {
  if (state.completed) return 100;
  return Math.round((state.chapterIndex / story.chapters.length) * 100);
}

