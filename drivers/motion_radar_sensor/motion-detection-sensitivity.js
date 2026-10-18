'use strict';

const MOTION_DETECTION_SENSITIVITY_DP = 123;

function validateMotionDetectionSensitivity(value) {
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    throw new RangeError('Motion detection sensitivity must be an integer between 0 and 10');
  }
  return value;
}

module.exports = {
  MOTION_DETECTION_SENSITIVITY_DP,
  validateMotionDetectionSensitivity,
};
