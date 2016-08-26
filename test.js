'use strict'

const test = require('tape')
const assert = require('assert')
const Bluebird = require('bluebird')
const Bridge = require('./')

test('basic', function (t) {
  const bridge = Bridge({
    methods: {
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
  bridge.listen(bridge.methods.powerOfThree, function (data, respond) {
    respond(null, Math.pow(data, 3))
  })

  bridge.methods.powerOfThree(3, function onResponse (error, data) {
    t.ifError(error)
    t.equal(data, 27)
  })
})

test('input errors', function (t) {
  const bridge = Bridge({
    methods: {
      bar: {}
    }
  })

  t.plan(3)

  // Event does not exist
  t.throws(function () {
    bridge.methods.foo()
  })

  // No listen(bridge.methods.s
  bridge.methods.bar(function (error) {
    t.ok(error, 'no listeners error')

    bridge.listen(bridge.methods.bar, (data, respond) => respond(null, 5))
    bridge.methods.bar(function (error) {
      t.ifError(error, 'no error for sending now because a listener is here')
    })
  })
})

test('validators', function (t) {
  const bridge = Bridge({
    methods: {
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

  bridge.listen(bridge.methods.price, function (data, respond) {
    respond(null, {price: 401})
  })

  bridge.methods.price({product: 'tom ford2'}, function (error) {
    t.pass(error)
    t.ok(error.message.indexOf('tom ford') !== -1, 'should be request validation error')
  })

  bridge.methods.price({product: 'tom ford'}, function (error) {
    t.pass(error)
    t.ok(error.message.indexOf('400') !== -1, 'should be response validation error')
  })
})

test('listen twice and unlisten', function (t) {
  const bridge = Bridge({
    methods: {
      foo: {}
    }
  })

  const unlisten = bridge.listen(bridge.methods.foo, function (data, respond) {
    respond(null, 'bar')
  })

  t.throws(function () {
    bridge.listen(bridge.methods.foo)
  })

  unlisten()
  bridge.listen(bridge.methods.foo, function () {})

  t.end()
})

test('middleware', function (t) {
  let before = false
  let after = false

  const bridge = Bridge({
    methods: {
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

  bridge.listen(bridge.methods.foo, (data, respond) => {
    t.equal(before, true, 'request middleware ran')
    t.equal(after, false, 'respond middleware didnt')

    respond()
  })

  bridge.methods.foo(() => {
    t.equal(before, true, 'request middleware ran')
    t.equal(after, true, 'respond middleware ran')
  })
})

test('parameter validation', function (t) {
  t.throws(() => Bridge({
    methods: {
      foo: {
        request: {
          unknown: 1
        }
      }
    }
  }))

  t.end()
})

test('promisifyAll works', function (t) {
  const bridge = Bridge({
    methods: {
      cat: {}
    }
  })

  bridge.listen(bridge.methods.cat, function (data, respond) {
    respond(null, 'cat' + data)
  })

  Bluebird.promisifyAll(bridge.methods)

  bridge.methods.catAsync(2)
    .then(function (response) {
      t.equal(response, 'cat2')
      t.end()
    })
    .catch(t.fail)
})
