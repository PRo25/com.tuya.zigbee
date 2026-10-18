'use strict';

const MOTION_DETECTION_MODE_DP = 122;

const motionDetectionModes = {
  pir_and_radar: 0,
  pir_or_radar: 1,
  only_radar: 2,
};

function toMotionDetectionModeEnum(mode) {
  if (!Object.prototype.hasOwnProperty.call(motionDetectionModes, mode)) {
    throw new Error(`Unsupported motion detection mode: ${mode}`);
  }
  return motionDetectionModes[mode];
}

module.exports = {
  MOTION_DETECTION_MODE_DP,
  toMotionDetectionModeEnum,
};
