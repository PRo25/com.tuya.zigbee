'use strict';

const STATIONARY_DETECTION_SENSITIVITY_DP = 2;

function validateStationaryDetectionSensitivity(value) {
  if (!Number.isInteger(value) || value < 0 || value > 10) {
    throw new RangeError('Stationary detection sensitivity must be an integer between 0 and 10');
  }
  return value;
}

module.exports = {
  STATIONARY_DETECTION_SENSITIVITY_DP,
  validateStationaryDetectionSensitivity,
};
