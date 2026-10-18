'use strict';

function getObsoleteCapabilities(deviceCapabilities, declaredCapabilities) {
  if (!Array.isArray(deviceCapabilities) || !Array.isArray(declaredCapabilities)) {
    throw new TypeError('Device and declared capabilities must be arrays');
  }

  const declared = new Set(declaredCapabilities);
  return deviceCapabilities.filter(capabilityId => !declared.has(capabilityId));
}

module.exports = {
  getObsoleteCapabilities,
};
