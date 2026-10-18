'use strict';

const HUMAN_MOTION_STATE_DP = 101;

const humanMotionStates = new Map([
  [0, 'none'],
  [1, 'large_move'],
  [2, 'small_move'],
]);

const humanMotionStateInsightValues = new Map([
  ['none', 0],
  ['small_move', 0.5],
  ['large_move', 1],
]);

function parseHumanMotionState(value) {
  const motionState = humanMotionStates.get(value);
  if (motionState === undefined) {
    throw new Error(`Invalid human motion state: ${value}`);
  }
  return motionState;
}

function toHumanMotionStateInsightValue(motionState) {
  const value = humanMotionStateInsightValues.get(motionState);
  if (value === undefined) {
    throw new Error(`Invalid human motion state: ${motionState}`);
  }
  return value;
}

module.exports = {
  HUMAN_MOTION_STATE_DP,
  parseHumanMotionState,
  toHumanMotionStateInsightValue,
};
