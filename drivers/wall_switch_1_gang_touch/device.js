'use strict';

const { CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V2_MULTI_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class WallSwitch1GangTouch extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.registerCapability('onoff', CLUSTER.ON_OFF);

    const handleDatapoint = async data => {
      try {
        await this.processDatapoint(data);
      } catch (error) {
        this.error('Failed to process touch switch Tuya datapoint', error);
      }
    };

    zclNode.endpoints[1].clusters.tuya.on('reporting', handleDatapoint);
    zclNode.endpoints[1].clusters.tuya.on('response', handleDatapoint);

    await zclNode.endpoints[1].clusters.basic
      .readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
      .catch(error => {
        this.error('Error when reading device attributes', error);
      });
  }

  async processDatapoint(data) {
    if (data.dp !== V2_MULTI_SWITCH_DATA_POINTS.backlightSwitch) {
      this.log('Ignoring unrelated touch switch datapoint:', data.dp);
      return;
    }

    const value = getDataValue(data);
    if (typeof value !== 'boolean') {
      this.error('Ignoring non-boolean touch switch backlight datapoint:', data);
      return;
    }

    await this.setSettings({ switch_backlight: value });
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('switch_backlight')) {
      await this.writeBool(
        V2_MULTI_SWITCH_DATA_POINTS.backlightSwitch,
        newSettings.switch_backlight
      );
    }
  }

  onDeleted() {
    this.log('1 Gang Touch Wall Switch removed');
  }
}

module.exports = WallSwitch1GangTouch;
