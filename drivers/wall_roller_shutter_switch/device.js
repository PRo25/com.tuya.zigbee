'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);

const POSITION_DATAPOINT = 2;
const CONTROL_DATAPOINT = 1;
const ACCURATE_CALIBRATION_DATAPOINT = 3;
const BACKLIGHT_DATAPOINT = 7;
const MOTOR_STEERING_DATAPOINT = 8;
const INDICATOR_STATUS_DATAPOINT = 14;
const QUICK_CALIBRATION_DATAPOINT = 10;
const MOTOR_STEERING = {
  forward: 0,
  back: 1,
};
const INDICATOR_STATUS = {
  relay: 0,
  pos: 1,
  none: 2,
};
const CONTROL_COMMAND = {
  open: 0,
  stop: 1,
  close: 2,
};
const CALIBRATION_COMMAND = {
  start: 0,
  end: 1,
};
const DATA_TYPE = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = chunks => {
  let value = 0;

  for (const chunk of chunks) {
    value = (value << 8) + chunk;
  }

  return value;
};

const getDataValue = dpValue => {
  switch (dpValue.datatype) {
    case DATA_TYPE.raw:
      return dpValue.data;
    case DATA_TYPE.bool:
      return dpValue.data[0] === 1;
    case DATA_TYPE.value:
    case DATA_TYPE.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case DATA_TYPE.string:
      return String.fromCharCode(...dpValue.data);
    case DATA_TYPE.enum:
      return dpValue.data[0];
    default:
      return undefined;
  }
};

class WallRollerShutterSwitch extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    const handleDatapoint = data => {
      if (data.dp === CONTROL_DATAPOINT) {
        const command = getDataValue(data);
        const state = {
          [CONTROL_COMMAND.open]: 'up',
          [CONTROL_COMMAND.stop]: 'idle',
          [CONTROL_COMMAND.close]: 'down',
        }[command];

        if (state) {
          this.setCapabilityValue('windowcoverings_state', state)
            .catch(err => this.error('Failed to update roller shutter state', err));
        }
        return;
      }

      if (data.dp !== POSITION_DATAPOINT) return;

      const value = getDataValue(data);
      if (typeof value !== 'number' || value < 0 || value > 100) return;

      this.setCapabilityValue('windowcoverings_set', value / 100)
        .catch(err => this.error('Failed to update roller shutter position', err));
    };

    zclNode.endpoints[1].clusters.tuya.on('response', handleDatapoint);
    zclNode.endpoints[1].clusters.tuya.on('reporting', handleDatapoint);
    this.registerCapabilityListener('windowcoverings_set', value => this.setPosition(value));
    this.registerCapabilityListener('windowcoverings_state', state => this.setState(state));

    await zclNode.endpoints[1].clusters.basic
      .readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource'])
      .catch(err => this.error('Failed to read roller shutter device attributes', err));
  }

  async setPosition(position) {
    const configuredMaxOpenPercentage = this.getSettings().max_open_percentage;
    const maxOpenPercentage = Number.isFinite(configuredMaxOpenPercentage)
      ? configuredMaxOpenPercentage
      : 100;
    const limitedPosition = Math.min(position, maxOpenPercentage / 100);
    return this.writeData32(POSITION_DATAPOINT, Math.round(limitedPosition * 100));
  }

  async setState(state) {
    const command = state === 'up'
      ? CONTROL_COMMAND.open
      : state === 'down'
        ? CONTROL_COMMAND.close
        : CONTROL_COMMAND.stop;

    return this.writeEnum(CONTROL_DATAPOINT, command);
  }

  async open() {
    return this.setState('up');
  }

  async close() {
    return this.setState('down');
  }

  async stop() {
    return this.setState('idle');
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('accurate_calibration')) {
      await this.writeEnum(
        ACCURATE_CALIBRATION_DATAPOINT,
        newSettings.accurate_calibration
          ? CALIBRATION_COMMAND.start
          : CALIBRATION_COMMAND.end,
      );
    }

    if (changedKeys.includes('switch_backlight')) {
      await this.writeBool(BACKLIGHT_DATAPOINT, newSettings.switch_backlight);
    }

    if (changedKeys.includes('motor_steering')) {
      await this.writeEnum(
        MOTOR_STEERING_DATAPOINT,
        newSettings.motor_steering === 'back'
          ? MOTOR_STEERING.back
          : MOTOR_STEERING.forward,
      );
    }

    if (changedKeys.includes('light_mode')) {
      await this.writeEnum(
        INDICATOR_STATUS_DATAPOINT,
        INDICATOR_STATUS[newSettings.light_mode],
      );
    }

    if (changedKeys.includes('quick_calibration_time')) {
      await this.writeData32(
        QUICK_CALIBRATION_DATAPOINT,
        this.getSettings().quick_calibration_time,
      );
    }
  }

}

module.exports = WallRollerShutterSwitch;
