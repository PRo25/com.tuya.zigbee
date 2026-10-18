'use strict';

const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { illuminanceMeasuredValueToLux } = require('../illuminance_sensor/measurements');
const { getObsoleteCapabilities } = require('./capabilities');
const {
  HUMAN_PRESENCE_DP,
  parseHumanPresenceState,
} = require('./human-presence-state');
const {
  HUMAN_MOTION_STATE_DP,
  parseHumanMotionState,
  toHumanMotionStateInsightValue,
} = require('./human-motion-state');
const {
  MOTION_DETECTION_MODE_DP,
  toMotionDetectionModeEnum,
} = require('./motion-detection-mode');
const {
  MOTION_DETECTION_SENSITIVITY_DP,
  validateMotionDetectionSensitivity,
} = require('./motion-detection-sensitivity');
const {
  STATIONARY_DETECTION_SENSITIVITY_DP,
  validateStationaryDetectionSensitivity,
} = require('./stationary-detection-sensitivity');

Cluster.addCluster(TuyaSpecificCluster);

class MotionRadarSensor extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    const declaredCapabilities = this.driver.manifest.capabilities;
    const obsoleteCapabilities = getObsoleteCapabilities(this.getCapabilities(), declaredCapabilities);
    for (const capabilityId of obsoleteCapabilities) {
      this.log(`Removing obsolete capability: ${capabilityId}`);
      await this.removeCapability(capabilityId);
    }

    for (const capabilityId of ['human_motion_state', 'human_motion_level']) {
      if (!this.hasCapability(capabilityId)) {
        await this.addCapability(capabilityId);
      }
    }

    const endpoint = zclNode.endpoints[1];
    const tuyaCluster = endpoint.clusters.tuya;
    this.humanPresenceDetectedTrigger = this.homey.flow.getDeviceTriggerCard('human_presence_detected');
    this.humanPresenceClearedTrigger = this.homey.flow.getDeviceTriggerCard('human_presence_no_longer_detected');
    this.humanMotionStateTriggers = {
      none: this.homey.flow.getDeviceTriggerCard('human_no_motion_detected'),
      large_move: this.homey.flow.getDeviceTriggerCard('human_large_move_detected'),
      small_move: this.homey.flow.getDeviceTriggerCard('human_small_move_detected'),
    };

    for (const event of ['reporting', 'response', 'reportingConfiguration']) {
      tuyaCluster.on(event, payload => {
        const data = Buffer.isBuffer(payload.data) ? payload.data : null;
        this.log(`Raw Tuya DP ${event}:`, {
          ...payload,
          ...(data ? { data: data.toString('hex') } : {}),
          ...(data ? {
            dataHex: `0x${data.toString('hex')}`,
            dataBytes: Array.from(data),
          } : {}),
        });

        if (payload.dp === HUMAN_PRESENCE_DP) {
          this.processHumanPresenceDatapoint(payload).catch(error => {
            this.error('Failed to process human presence datapoint', error);
          });
        }
        if (payload.dp === HUMAN_MOTION_STATE_DP) {
          this.processHumanMotionStateDatapoint(payload).catch(error => {
            this.error('Failed to process human motion state datapoint', error);
          });
        }
      });
    }

    if (typeof tuyaCluster.dataQuery === 'function') {
      this.log('Requesting Tuya device state (dataQuery 0x03)');
      tuyaCluster.dataQuery({})
        .catch(error => this.log('Tuya dataQuery skipped/failed:', error.message));
    } else {
      this.log('Tuya dataQuery is unavailable; cannot request device state');
    }

    endpoint.clusters[CLUSTER.IAS_ZONE.NAME]
      .onZoneStatusChangeNotification = ({ zoneStatus }) => {
        this.log('Motion status:', zoneStatus.alarm1);
        this.setCapabilityValue('alarm_motion', zoneStatus.alarm1).catch(this.error);
      };

    const powerConfiguration = endpoint.clusters[CLUSTER.POWER_CONFIGURATION.NAME];
    powerConfiguration
      .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

    endpoint.clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
      .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));

    try {
      const { batteryPercentageRemaining } = await powerConfiguration.readAttributes([
        'batteryPercentageRemaining',
      ]);
      if (batteryPercentageRemaining !== undefined && batteryPercentageRemaining !== 0xff) {
        this.onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining);
      }
    } catch (error) {
      this.log('Unable to read initial battery percentage; waiting for the next report:', error.message);
    }

    if (this.isFirstInit()) {
      const reportingConfigurations = [
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 21600,
          minChange: 2,
        },
        {
          endpointId: 1,
          cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 1800,
          minChange: 1000,
        },
      ];

      for (const configuration of reportingConfigurations) {
        await this.configureAttributeReporting([configuration])
          .catch(error => this.log('Optional attribute reporting configuration failed:', error.message));
      }
    }
  }

  async processHumanPresenceDatapoint(data) {
    const presence = parseHumanPresenceState(getDataValue(data));
    const previousPresence = this.getCapabilityValue('presence_state');

    this.log('Human presence state:', presence);
    await this.setCapabilityValue('presence_state', presence);

    if (previousPresence === undefined || previousPresence === null || previousPresence === presence) return;

    const trigger = presence
      ? this.humanPresenceDetectedTrigger
      : this.humanPresenceClearedTrigger;
    await trigger.trigger(this, {}).catch(error => {
      this.error('Failed to trigger human presence flow card', error);
    });
  }

  async processHumanMotionStateDatapoint(data) {
    const motionState = parseHumanMotionState(getDataValue(data));
    const previousMotionState = this.getCapabilityValue('human_motion_state');
    const insightValue = toHumanMotionStateInsightValue(motionState);
    this.log('Human motion state:', motionState);
    await this.setCapabilityValue('human_motion_state', motionState);

    if (this.getCapabilityValue('human_motion_level') !== insightValue) {
      await this.setCapabilityValue('human_motion_level', insightValue);
    }

    if (previousMotionState === undefined || previousMotionState === null || previousMotionState === motionState) return;

    await this.humanMotionStateTriggers[motionState].trigger(this, {}).catch(error => {
      this.error(`Failed to trigger human motion state flow card for "${motionState}"`, error);
    });
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    const batteryLevel = Math.max(0, Math.min(100, batteryPercentageRemaining / 2));
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;

    this.log('Battery level (%):', batteryLevel);
    this.setCapabilityValue('measure_battery', batteryLevel).catch(this.error);
    this.setCapabilityValue('alarm_battery', batteryLevel < batteryThreshold).catch(this.error);
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    const lux = illuminanceMeasuredValueToLux(measuredValue);
    if (lux === null) {
      this.log('Ignoring invalid illuminance value:', measuredValue);
      return;
    }

    const roundedLux = Math.round(lux * 100) / 100;
    this.log('Illuminance (lux):', roundedLux);
    this.setCapabilityValue('measure_luminance', roundedLux).catch(this.error);
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('motion_detection_mode')) {
      const value = toMotionDetectionModeEnum(newSettings.motion_detection_mode);
      this.log('Sending Tuya DP:', {
        dp: MOTION_DETECTION_MODE_DP,
        datatype: 4,
        value,
      });
      await this.writeEnum(MOTION_DETECTION_MODE_DP, value);
    }

    if (changedKeys.includes('motion_detection_sen')) {
      const value = validateMotionDetectionSensitivity(newSettings.motion_detection_sen);
      this.log('Sending Tuya DP:', {
        dp: MOTION_DETECTION_SENSITIVITY_DP,
        datatype: 2,
        value,
      });
      await this.writeData32(MOTION_DETECTION_SENSITIVITY_DP, value);
    }

    if (changedKeys.includes('sensitivity')) {
      const value = validateStationaryDetectionSensitivity(newSettings.sensitivity);
      this.log('Sending Tuya DP:', {
        dp: STATIONARY_DETECTION_SENSITIVITY_DP,
        datatype: 2,
        value,
      });
      await this.writeData32(STATIONARY_DETECTION_SENSITIVITY_DP, value);
    }
  }

  onDeleted() {
    this.log('Motion & Presence Sensor removed');
  }

}

module.exports = MotionRadarSensor;
