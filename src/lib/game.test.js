import { describe, expect, it } from 'vitest';
import { applyChoice, canChoose, defaultStoryState, percentComplete, resolveEnding } from './game';
import { stories } from '../data/stories';

describe('game engine', () => {
  it('applies choice effects and records the choice', () => {
    const state = defaultStoryState('aurora');
    const next = applyChoice(state, { id: 'test', effects: { bond: 2, courage: 1 } });
    expect(next.metrics).toEqual({ bond: 2, courage: 1, insight: 0 });
    expect(next.chosen).toContain('test');
  });

  it('locks choices until requirements are met', () => {
    expect(canChoose({ requires: { insight: 2 } }, { insight: 1 })).toBe(false);
    expect(canChoose({ requires: { insight: 2 } }, { insight: 2 })).toBe(true);
  });

  it('resolves three distinct ending tiers', () => {
    const story = stories[0];
    expect(resolveEnding(story, { bond: 5, courage: 5, insight: 5 }).id).toBe('hope');
    expect(resolveEnding(story, { bond: 3, courage: 2, insight: 2 }).id).toBe('bittersweet');
    expect(resolveEnding(story, { bond: 0, courage: 1, insight: 1 }).id).toBe('shadow');
  });

  it('reports progress across six chapters', () => {
    const story = stories[1];
    expect(percentComplete(defaultStoryState(story.id), story)).toBe(0);
    expect(percentComplete({ ...defaultStoryState(story.id), chapterIndex: 3 }, story)).toBe(50);
    expect(percentComplete({ ...defaultStoryState(story.id), completed: true }, story)).toBe(100);
  });
});
