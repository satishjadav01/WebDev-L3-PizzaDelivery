import { describe, expect, it } from 'vitest';
import { builderStepsFixture as steps } from '../../test/fixtures.js';
import {
  BUILDER_ACTION,
  allSelectedIds,
  builderReducer,
  initialBuilderState,
  isBuildComplete,
  isStepComplete,
  selectedOptions,
} from './builderState.js';

const [base, sauce, cheese, veggie] = steps;
const toggle = (state, step, optionId) =>
  builderReducer(state, { type: BUILDER_ACTION.TOGGLE, step, optionId });

describe('builder selection rules', () => {
  it('replaces the choice in a single-choice step', () => {
    let state = toggle(initialBuilderState, base, 'b1');
    state = toggle(state, base, 'b2');
    expect(state.selections.base).toEqual(['b2']);
  });

  it('clears a single-choice step when the same option is picked again', () => {
    const state = toggle(toggle(initialBuilderState, base, 'b1'), base, 'b1');
    expect(state.selections.base).toEqual([]);
  });

  it('adds and removes options in a multi-choice step', () => {
    let state = toggle(initialBuilderState, veggie, 'v1');
    state = toggle(state, veggie, 'v2');
    expect(state.selections.veggie).toEqual(['v1', 'v2']);
    state = toggle(state, veggie, 'v1');
    expect(state.selections.veggie).toEqual(['v2']);
  });

  it('refuses to exceed the maximum for a multi-choice step', () => {
    let state = toggle(initialBuilderState, veggie, 'v1');
    state = toggle(state, veggie, 'v2');
    const blocked = toggle(state, veggie, 'v3');
    expect(blocked).toBe(state);
    expect(blocked.selections.veggie).toHaveLength(veggie.max);
  });

  it('treats an optional step as complete when empty, a required step as incomplete', () => {
    expect(isStepComplete(initialBuilderState, veggie)).toBe(true);
    expect(isStepComplete(initialBuilderState, base)).toBe(false);
  });

  it('is complete only when every required step has a choice', () => {
    let state = toggle(initialBuilderState, base, 'b1');
    state = toggle(state, sauce, 's1');
    expect(isBuildComplete(state, steps)).toBe(false);
    state = toggle(state, cheese, 'c1');
    expect(isBuildComplete(state, steps)).toBe(true);
  });

  it('lists chosen ids and options in step order, tagged with their category', () => {
    let state = toggle(initialBuilderState, veggie, 'v2');
    state = toggle(state, base, 'b2');
    expect(allSelectedIds(state, steps)).toEqual(['b2', 'v2']);
    expect(selectedOptions(state, steps).map((o) => [o.category, o.name])).toEqual([
      ['base', 'Cheese Burst'],
      ['veggie', 'Olives'],
    ]);
  });

  it('resets to an empty build', () => {
    const state = toggle(initialBuilderState, base, 'b1');
    expect(builderReducer(state, { type: BUILDER_ACTION.RESET })).toEqual(initialBuilderState);
  });
});
