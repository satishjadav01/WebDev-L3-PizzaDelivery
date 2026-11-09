/**
 * Pure state for the pizza builder. Selection rules (how many of each category) come from the
 * API's step definitions, so changing them server-side changes the UI without a code change.
 */

/** A step that allows exactly one option behaves like a radio group. */
export const SINGLE_CHOICE_MAX = 1;

export const BUILDER_ACTION = Object.freeze({ TOGGLE: 'toggle', RESET: 'reset' });

export const initialBuilderState = Object.freeze({ selections: {} });

/** Single-choice steps replace their selection; multi-choice steps toggle up to `max`. */
export function builderReducer(state, action) {
  switch (action.type) {
    case BUILDER_ACTION.RESET:
      return initialBuilderState;

    case BUILDER_ACTION.TOGGLE: {
      const { step, optionId } = action;
      const current = state.selections[step.category] ?? [];
      let next;
      if (step.max === SINGLE_CHOICE_MAX) {
        next = current[0] === optionId ? [] : [optionId];
      } else if (current.includes(optionId)) {
        next = current.filter((id) => id !== optionId);
      } else if (current.length < step.max) {
        next = [...current, optionId];
      } else {
        return state;
      }
      return { selections: { ...state.selections, [step.category]: next } };
    }

    default:
      return state;
  }
}

export const selectedIds = (state, step) => state.selections[step.category] ?? [];

export const isStepComplete = (state, step) => {
  const count = selectedIds(state, step).length;
  return count >= step.min && count <= step.max;
};

export const isBuildComplete = (state, steps) => steps.every((step) => isStepComplete(state, step));

/** All chosen option ids in step order, ready for the order API. */
export const allSelectedIds = (state, steps) => steps.flatMap((step) => selectedIds(state, step));

/** The chosen option objects in step order, each tagged with its category. */
export function selectedOptions(state, steps) {
  return steps.flatMap((step) =>
    step.options
      .filter((option) => selectedIds(state, step).includes(option.id))
      .map((option) => ({ ...option, category: step.category })),
  );
}
