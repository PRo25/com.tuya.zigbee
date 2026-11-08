'use strict';

const { CLUSTER, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');

Cluster.addCluster(TuyaSpecificCluster);
Cluster.addCluster(TuyaOnOffCluster);

class WallSwitch1GangTouch extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    this.registerCapability('onoff', CLUSTER.ON_OFF);

    const onOffCluster = zclNode.endpoints[1].clusters.onOff;
    onOffCluster.on('attr.tuyaBacklightSwitch', value => {
      this.updateBacklightSetting(value).catch(error => {
        this.error('Failed to update touch switch backlight setting from attribute 0x5000', error);
      });
    });

    try {
      const { tuyaBacklightSwitch } = await onOffCluster.readAttributes(['tuyaBacklightSwitch']);
      if (tuyaBacklightSwitch !== undefined) {
        await this.updateBacklightSetting(tuyaBacklightSwitch);
      }
    } catch (error) {
      this.error('Failed to read touch switch backlight attribute 0x5000', error);
    }

    await zclNode.endpoints[1].clusters.basic
      .readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
      .catch(error => {
        this.error('Error when reading device attributes', error);
      });
  }

  async updateBacklightSetting(value) {
    if (value !== 0 && value !== 1 && value !== 'Off' && value !== 'On') {
      this.error('Ignoring invalid touch switch backlight attribute 0x5000 value:', value);
      return;
    }

    await this.setSettings({ switch_backlight: value === 1 || value === 'On' });
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('switch_backlight')) {
      const value = newSettings.switch_backlight ? 1 : 0;

      try {
        await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({
          tuyaBacklightSwitch: value
        });
      } catch (error) {
        this.error('Failed to write touch switch backlight attribute 0x5000:', { value }, error);
        throw error;
      }
    }
  }

}

module.exports = WallSwitch1GangTouch;
