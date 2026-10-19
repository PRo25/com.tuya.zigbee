'use strict';

const TUYA_ACTION_COMMAND_ID = 0xfd;

const buttonActions = new Map([
  [0, 'oneClick'],
  [1, 'twoClicks'],
  [2, 'longPress'],
]);

function parseButtonActionFrame(frame) {
  if (!Buffer.isBuffer(frame)) {
    throw new TypeError('Smart remote action frame must be a Buffer');
  }

  if (frame.length < 3 || frame[2] !== TUYA_ACTION_COMMAND_ID || frame.length < 4) {
    return null;
  }

  return buttonActions.get(frame[3]) || null;
}

module.exports = {
  parseButtonActionFrame,
};
