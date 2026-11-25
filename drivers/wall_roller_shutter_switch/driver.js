'use strict';

const Homey = require('homey');

class WallRollerShutterSwitchDriver extends Homey.Driver {

  async onInit() {
    this.homey.flow
      .getActionCard('wall_roller_shutter_open')
      .registerRunListener(async ({ device }) => {
        await device.open();
        return true;
      });

    this.homey.flow
      .getActionCard('wall_roller_shutter_close')
      .registerRunListener(async ({ device }) => {
        await device.close();
        return true;
      });

    this.homey.flow
      .getActionCard('wall_roller_shutter_stop')
      .registerRunListener(async ({ device }) => {
        await device.stop();
        return true;
      });
  }

}

module.exports = WallRollerShutterSwitchDriver;
