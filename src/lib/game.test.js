import { describe, expect, it } from 'vitest';
import { applyChoice, defaultState, percentComplete, resolveEnding } from './game';
import { story } from '../data/stories';

describe('after-last-call visual novel engine', () => {
  it('starts with a clean route state', () => {
    const state = defaultState(story.id);
    expect(state.storyId).toBe('after-last-call');
    expect(state.chapterIndex).toBe(0);
    expect(state.routeCounts).toEqual({ artem: 0, nikita: 0, ilya: 0, self: 0 });
  });

  it('records a choice and advances to the next chapter', () => {
    const state = defaultState(story.id);
    const next = applyChoice(state, { id: 'chapter-1-nikita', route: 'nikita', effect: 2 }, story);
    expect(next.chapterIndex).toBe(1);
    expect(next.routeCounts.nikita).toBe(2);
    expect(next.chosen).toEqual(['chapter-1-nikita']);
    expect(next.completed).toBe(false);
  });

  it('resolves the final route and protects a close tie with the self ending', () => {
    expect(resolveEnding(story, { endingId: null, routeCounts: { artem: 7, nikita: 2, ilya: 1, self: 0 } }).id).toBe('artem');
    expect(resolveEnding(story, { endingId: null, routeCounts: { artem: 2, nikita: 2, ilya: 1, self: 0 } }).id).toBe('self');
    expect(resolveEnding(story, { endingId: 'ilya', routeCounts: { artem: 0, nikita: 0, ilya: 0, self: 0 } }).id).toBe('ilya');
  });

  it('reports progress across eleven chapters', () => {
    expect(percentComplete(defaultState(story.id), story)).toBe(0);
    expect(percentComplete({ ...defaultState(story.id), chapterIndex: 5 }, story)).toBe(45);
    expect(percentComplete({ ...defaultState(story.id), completed: true }, story)).toBe(100);
  });
});
