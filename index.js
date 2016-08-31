var assert = require('assert')
var assign = require('xtend/mutable')
var castArray = require('cast-array')
var series = require('run-series')
var Symbol = require('symbol-key')

function noop () {}

module.exports = Bridge

function Bridge (options) {
  options = options || {}

  assert.equal(typeof options.methods, 'object', 'object options.methods required')

  var methods = {}
  for (var key in options.methods) {
    methods[key] = Method(key, options.methods[key])
  }

  var privateId = Symbol('methodId')

  return {
    listen: function listenToMethod (method, listener) {
      assert.ok(method && method[privateId], 'Method must be a reference to a value in bridge.methods, got ' + typeof method)

      return listen(method[privateId], listener)
    },
    methods: Object.keys(methods).reduce(function (acc, methodId) {
      acc[methodId] = function appBridgeWrap (payload, callback) {
        send(methods[methodId], payload, callback)
      }
      acc[methodId][privateId] = methodId

      return acc
    }, {})
  }

  function send (method, payload, callback) {
    callback = callback || noop

    var validateError = validate(payload, method.request.validate)
    if (validateError) {
      return callback(formatError(validateError))
    }

    series(method.request.middleware, onMiddlewareDone)

    function onMiddlewareDone (error) {
      if (error) return callback(formatError(error))

      var listener = method.listeners[0]
      if (!listener) {
        return callback(formatError(new Error('Method ' + method.id + ' has no listeners.')))
      }

      listener(payload, onResponse)
    }

    function onResponse (error, response) {
      if (error) {
        return callback(formatError(error))
      }

      var validateError = validate(response, method.response.validate)
      if (validateError) {
        return callback(formatError(validateError))
      }

      series(method.response.middleware, function (error) {
        if (error) return callback(formatError(error))
        callback(null, response)
      })
    }

    function formatError (error) {
      return assign(error, {
        method: method.id,
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

  function listen (methodId, listener) {
    var method = methods[methodId]

    assert.ok(method, 'method "' + methodId + '" does not exist')
    assert.equal(method.listeners.length, 0, 'Someone else is already listening on this method!')
    assert.equal(typeof listener, 'function', 'function listener required')

    method.listeners.push(listener)

    return function unlisten () {
      var index = method.listeners.indexOf(listener)
      if (index !== -1) {
        method.listeners.splice(index, 1)
      }
    }
  }
}

function Method (id, options) {
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
