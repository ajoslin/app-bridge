var assert = require('assert')
var assign = require('xtend/mutable')
var castArray = require('cast-array')
var series = require('run-series')

function noop () {}

module.exports = Bridge

function Bridge (options) {
  options = options || {}

  assert.equal(typeof options.channels, 'object', 'object options.channels required')

  var channels = {}
  for (var id in options.channels) {
    channels[id] = MessageChannel(id, options.channels[id])
  }

  return {
    send: send,
    listen: listen
  }

  function send (options, callback) {
    if (arguments.length === 2 && typeof payload === 'function') {
      callback = payload
      options = undefined
    }

    options = options || {}

    var channel = channels[options.channel]
    var payload = options.payload

    assert.ok(channel, 'channel "' + options.channel + '" does not exist')
    assert.equal(typeof callback, 'function', 'function callback required')

    var validateError = validate(payload, channel.request.validate)
    if (validateError) {
      return callback(formatError(validateError))
    }

    series(channel.request.middleware, onMiddlewareDone)

    function onMiddlewareDone (error) {
      if (error) return callback(formatError(error))

      var listener = channel.listeners[0]
      if (!listener) {
        return callback(formatError(new Error('Channel has no listeners.')))
      }

      listener(payload, onResponse)
    }

    function onResponse (error, response) {
      if (error) {
        return callback(formatError(error))
      }

      var validateError = validate(response, channel.response.validate)
      if (validateError) {
        return callback(formatError(validateError))
      }

      series(channel.response.middleware, function (error) {
        if (error) return callback(formatError(error))
        callback(null, response)
      })
    }

    function formatError (error) {
      return assign(error, {
        channel: channel.id,
        payload: payload
      })
    }
  }

  function validate (payload, validateFn) {
    try {
      return validateFn(payload)
    } catch (error) {
      return error
    }
  }

  function listen (channelId, listener) {
    var channel = channels[channelId]

    assert.ok(channel, 'channel "' + channelId + '" does not exist')
    assert.equal(channel.listeners.length, 0, 'Someone else is already listening on this channel!')
    assert.equal(typeof listener, 'function', 'function listener required')

    channel.listeners.push(listener)

    return function unlisten () {
      var index = channel.listeners.indexOf(listener)
      if (index !== -1) {
        channel.listeners.splice(index, 1)
      }
    }
  }
}

function MessageChannel (id, options) {
  options = options || {}
  options.request = options.request || {}
  options.response = options.response || {}

  validateOption(options.request)
  validateOption(options.response)

  return {
    listeners: [],
    id: id,
    request: {
      validate: options.request && options.request.validate || noop,
      middleware: castArray(options.request.middleware || [])
    },
    response: {
      validate: options.response && options.response.validate || noop,
      middleware: castArray(options.response.middleware || [])
    }
  }

  function validateOption (option) {
    for (var key in option) {
      if (!/middleware|validate/.test(key)) {
        throw new TypeError('options.request can only have middleware or validate')
      }
    }
  }
}
