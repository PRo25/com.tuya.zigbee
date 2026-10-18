'use strict';

const INDICATOR_DP = 107;

function validateIndicator(value) {
  if (typeof value !== 'boolean') {
    throw new TypeError('Indicator must be a boolean');
  }
  return value;
}

module.exports = {
  INDICATOR_DP,
  validateIndicator,
};
