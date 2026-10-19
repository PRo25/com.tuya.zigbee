'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { parseButtonActionFrame } = require('./button-action');

class SmartRemote1Button3 extends ZigBeeDevice {

  async onNodeInit() {
    const node = await this.homey.zigbee.getNode(this);
    const zclHandleFrame = node.handleFrame;
    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      if (clusterId === 6 && Buffer.isBuffer(frame) && frame[2] === 0xfd) {
        const action = parseButtonActionFrame(frame);
        if (!action) {
          this.log('Ignoring unsupported smart remote action frame:', frame.toString('hex'));
          return;
        }

        return this.buttonCommandParser(action);
      }

      return zclHandleFrame(endpointId, clusterId, frame, meta);
    };
  }

  buttonCommandParser(action) {
    return this.driver.buttonTrigger.trigger(this, {}, { action })
      .then(() => this.log(`Triggered 1 button Smart Remote, action=${action}`))
      .catch(error => this.error('Error triggering 1 button Smart Remote', error));
  }

  onDeleted() {
    this.log('1 button Smart Remote Controller has been removed');
  }

}

module.exports = SmartRemote1Button3;
