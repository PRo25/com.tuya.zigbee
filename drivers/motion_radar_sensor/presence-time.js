'use strict';

const PRESENCE_TIME_DP = 102;

function validatePresenceTime(value) {
  if (!Number.isInteger(value) || value < 10 || value > 28800) {
    throw new RangeError('Presence keep time must be an integer between 10 and 28800 seconds');
  }
  return value;
}

module.exports = {
  PRESENCE_TIME_DP,
  validatePresenceTime,
};
