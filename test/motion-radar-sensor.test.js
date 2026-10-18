'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getDataValue } = require('../lib/TuyaHelpers');
const { getObsoleteCapabilities } = require('../drivers/motion_radar_sensor/capabilities');
const {
  HUMAN_PRESENCE_DP,
  parseHumanPresenceState,
} = require('../drivers/motion_radar_sensor/human-presence-state');
const {
  HUMAN_MOTION_STATE_DP,
  parseHumanMotionState,
  toHumanMotionStateInsightValue,
} = require('../drivers/motion_radar_sensor/human-motion-state');
const {
  MOTION_DETECTION_MODE_DP,
  toMotionDetectionModeEnum,
} = require('../drivers/motion_radar_sensor/motion-detection-mode');
const {
  MOTION_DETECTION_SENSITIVITY_DP,
  validateMotionDetectionSensitivity,
} = require('../drivers/motion_radar_sensor/motion-detection-sensitivity');
const {
  STATIONARY_DETECTION_SENSITIVITY_DP,
  validateStationaryDetectionSensitivity,
} = require('../drivers/motion_radar_sensor/stationary-detection-sensitivity');

test('obsolete device capabilities are those not declared by the driver', () => {
  assert.deepEqual(
    getObsoleteCapabilities(
      ['alarm_motion', 'human_motion_none', 'human_motion_state'],
      ['alarm_motion', 'human_motion_state'],
    ),
    ['human_motion_none'],
  );
});

test('capability cleanup retains all declared capabilities', () => {
  assert.deepEqual(
    getObsoleteCapabilities(['measure_battery', 'human_motion_level'], ['measure_battery', 'human_motion_level']),
    [],
  );
});

test('motion detection modes map to Tuya enum values on DP 122', () => {
  assert.equal(MOTION_DETECTION_MODE_DP, 122);
  assert.equal(toMotionDetectionModeEnum('pir_and_radar'), 0);
  assert.equal(toMotionDetectionModeEnum('pir_or_radar'), 1);
  assert.equal(toMotionDetectionModeEnum('only_radar'), 2);
});

test('unsupported motion detection modes are rejected', () => {
  assert.throws(
    () => toMotionDetectionModeEnum('unknown'),
    /Unsupported motion detection mode: unknown/,
  );
});

test('human presence DP 1 accepts boolean and numeric on/off values', () => {
  assert.equal(HUMAN_PRESENCE_DP, 1);
  assert.equal(parseHumanPresenceState(true), true);
  assert.equal(parseHumanPresenceState(false), false);
  assert.equal(parseHumanPresenceState(1), true);
  assert.equal(parseHumanPresenceState(0), false);
});

test('human presence rejects values outside boolean and numeric binary forms', () => {
  assert.throws(
    () => parseHumanPresenceState(2),
    /Invalid human presence state: 2/,
  );
});

test('human presence boolean datapoints decode from Tuya payload bytes', () => {
  assert.equal(parseHumanPresenceState(getDataValue({ datatype: 1, data: Buffer.from([1]) })), true);
  assert.equal(parseHumanPresenceState(getDataValue({ datatype: 1, data: Buffer.from([0]) })), false);
});

test('human motion state DP 101 maps Tuya enum values to Homey states', () => {
  assert.equal(HUMAN_MOTION_STATE_DP, 101);
  assert.equal(parseHumanMotionState(getDataValue({ datatype: 4, data: Buffer.from([0]) })), 'none');
  assert.equal(parseHumanMotionState(getDataValue({ datatype: 4, data: Buffer.from([1]) })), 'large_move');
  assert.equal(parseHumanMotionState(getDataValue({ datatype: 4, data: Buffer.from([2]) })), 'small_move');
});

test('human motion state rejects unknown enum values', () => {
  assert.throws(
    () => parseHumanMotionState(3),
    /Invalid human motion state: 3/,
  );
});

test('human motion states map to their numeric Insights levels', () => {
  assert.equal(toHumanMotionStateInsightValue('none'), 0);
  assert.equal(toHumanMotionStateInsightValue('small_move'), 0.5);
  assert.equal(toHumanMotionStateInsightValue('large_move'), 1);
});

test('human motion Insights mapping rejects unknown states', () => {
  assert.throws(
    () => toHumanMotionStateInsightValue('unknown'),
    /Invalid human motion state: unknown/,
  );
});

test('motion detection sensitivity accepts integer DP 123 values from 0 to 10', () => {
  assert.equal(MOTION_DETECTION_SENSITIVITY_DP, 123);
  for (let value = 0; value <= 10; value += 1) {
    assert.equal(validateMotionDetectionSensitivity(value), value);
  }
});

test('motion detection sensitivity rejects values outside the integer range 0 to 10', () => {
  for (const value of [-1, 11, 1.5, Number.NaN]) {
    assert.throws(
      () => validateMotionDetectionSensitivity(value),
      /Motion detection sensitivity must be an integer between 0 and 10/,
    );
  }
});

test('stationary detection sensitivity accepts integer DP 2 values from 0 to 10', () => {
  assert.equal(STATIONARY_DETECTION_SENSITIVITY_DP, 2);
  for (let value = 0; value <= 10; value += 1) {
    assert.equal(validateStationaryDetectionSensitivity(value), value);
  }
});

test('stationary detection sensitivity rejects values outside the integer range 0 to 10', () => {
  for (const value of [-1, 11, 1.5, Number.NaN]) {
    assert.throws(
      () => validateStationaryDetectionSensitivity(value),
      /Stationary detection sensitivity must be an integer between 0 and 10/,
    );
  }
});
