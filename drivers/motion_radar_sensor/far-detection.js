'use strict';

const FAR_DETECTION_DP = 4;

function validateFarDetection(value) {
  if (!Number.isInteger(value) || value < 0 || value > 1000) {
    throw new RangeError('MW radar detection distance must be an integer between 0 and 1000 cm');
  }
  return value;
}

module.exports = {
  FAR_DETECTION_DP,
  validateFarDetection,
};
