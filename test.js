'use strict'

const test = require('tape')
const assert = require('assert')
const Bridge = require('./')

test('basic', function (t) {
  const bridge = Bridge({
    channels: {
      powerOfThree: {
        request: {
          validate: (data) => assert.equal(data, 3)
        },
        response: {
          validate: (data) => assert.equal(data, 27)
        }
      }
    }
  })

  t.plan(2)
  bridge.listen('powerOfThree', function (data, respond) {
    respond(null, Math.pow(data, 3))
  })

  bridge.send({
    channel: 'powerOfThree',
    payload: 3
  }, function onResponse (error, data) {
    t.ifError(error)
    t.equal(data, 27)
  })
})

test('input errors', function (t) {
  const bridge = Bridge({
    channels: {
      bar: {}
    }
  })

  t.plan(3)

  // Event does not exist
  t.throws(function () {
    bridge.send({channel: 'foo'}, function () {})
  })

  // No listeners
  bridge.send({channel: 'bar'}, function (error) {
    t.ok(error, 'no listeners error')

    bridge.listen('bar', (data, respond) => respond(null, 5))
    bridge.send({channel: 'bar'}, function (error, data) {
      t.ifError(error, 'no error for sending now because a listener is here')
    })
  })
})

test('validators', function (t) {
  const bridge = Bridge({
    channels: {
      price: {
        request: {
          validate: (data) => assert.equal(data.product, 'tom ford')
        },
        response: {
          validate: (data) => assert.equal(data.price, 400)
        }
      }
    }
  })

  t.plan(4)

  bridge.listen('price', function (data, respond) {
    respond(null, {price: 401})
  })

  bridge.send({
    channel: 'price',
    payload: {product: 'tom ford2'}
  }, function (error) {
    t.pass(error)
    t.ok(error.message.indexOf('tom ford') !== -1, 'should be request validation error')
  })

  bridge.send({
    channel: 'price',
    payload: {product: 'tom ford'}
  }, function (error) {
    t.pass(error)
    t.ok(error.message.indexOf('400') !== -1, 'should be response validation error')
  })
})

test('listen twice and unlisten', function (t) {
  const bridge = Bridge({
    channels: {
      foo: {}
    }
  })

  const unlisten = bridge.listen('foo', function (data, respond) {
    respond(null, 'bar')
  })

  t.throws(function () {
    bridge.listen('foo')
  })

  unlisten()
  bridge.listen('foo', function () {})

  t.end()
})

test('middleware', function (t) {
  let before = false
  let after = false

  const bridge = Bridge({
    channels: {
      foo: {
        request: {
          middleware: [(next) => {
            before = true
            next()
          }]
        },
        response: {
          middleware: [(next) => {
            after = true
            next()
          }]
        }
      }
    }
  })

  t.plan(6)

  t.equal(before, false)
  t.equal(after, false)

  bridge.listen('foo', (data, respond) => {
    t.equal(before, true, 'request middleware ran')
    t.equal(after, false, 'respond middleware didnt')

    respond()
  })

  bridge.send({channel: 'foo'}, () => {
    t.equal(before, true, 'request middleware ran')
    t.equal(after, true, 'respond middleware ran')
  })
})

test('parameter validation', function (t) {
  t.throws(() => Bridge({
    channels: {
      foo: {
        request: {
          unknown: 1
        }
      }
    }
  }))

  t.end()
})
