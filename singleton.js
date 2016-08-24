const window = require('global/window')
const Bridge = require('./')

const KEY = '__APP_BRIDGE_v1__'

module.exports = function singletonBridge (data) {
  if (!window[KEY]) {
    window[KEY] = Bridge(data)
  }

  return window[KEY]
}
