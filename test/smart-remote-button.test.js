'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseButtonActionFrame } = require('../drivers/smart_remote_1_button_3/button-action');

test('Tuya action frames map payload values to button actions', () => {
  assert.equal(parseButtonActionFrame(Buffer.from([0x11, 0xe5, 0xfd, 0x00])), 'oneClick');
  assert.equal(parseButtonActionFrame(Buffer.from([0x11, 0xe6, 0xfd, 0x01])), 'twoClicks');
  assert.equal(parseButtonActionFrame(Buffer.from([0x11, 0xe7, 0xfd, 0x02])), 'longPress');
});

test('non-Tuya On/Off frames are not interpreted as button actions', () => {
  assert.equal(parseButtonActionFrame(Buffer.from([0x11, 0xe6, 0x02])), null);
});

test('malformed and unknown Tuya action frames are ignored', () => {
  assert.equal(parseButtonActionFrame(Buffer.from([0x11, 0xe5, 0xfd])), null);
  assert.equal(parseButtonActionFrame(Buffer.from([0x11, 0xe5, 0xfd, 0x03])), null);
});

test('button action parser requires a Buffer frame', () => {
  assert.throws(
    () => parseButtonActionFrame({ data: [0x11, 0xe5, 0xfd, 0x00] }),
    /Smart remote action frame must be a Buffer/,
  );
});
