'use strict';

const HUMAN_PRESENCE_DP = 1;

function parseHumanPresenceState(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1) return true;
  if (value === 0) return false;
  throw new Error(`Invalid human presence state: ${value}`);
}

module.exports = {
  HUMAN_PRESENCE_DP,
  parseHumanPresenceState,
};
