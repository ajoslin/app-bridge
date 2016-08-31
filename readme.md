# app-bridge [![Build Status](https://travis-ci.org/ajoslin/app-bridge.svg?branch=master)](https://travis-ci.org/ajoslin/app-bridge)

> Create a bridge.

Intended to be used as a global singleton request/response broker between independently loaded scripts that share the same Javascript contexts.

## Install

```
$ npm install --save app-bridge
```

## Usage

### In your "master" shell app:

```js
const Bridge = require('app-bridge/singleton')
const loadScriptOnce = require('load-script-once')

const bridge = Bridge({
  methods: {
    loadChildApp: {
      request: {
        middleware: [(next) => loadScriptOnce('/child-app.js', next)]
      },
      response: {
        validate: (data) => assert.ok(data && data.innerHTML, 'expected an element')
      }
    }
  }
})

function mountChildApp (params) {
  bridge.methods.loadChildApp(params, function (error, element) {
    parentElement.appendChild(element)
  })
}
```

### In your child app (child-app.js, loaded async):

```js
const bridge = require('app-bridge/singleton')()

bridge.listen(bridge.methods.loadChildApp, function (data, respond) {
  const element = document.createElement('child-app')
  element.innerHTML = JSON.stringify(data)

  respond(null, element)
})

```

## API

### `require('app-bridge')`

#### `Bridge(options)` -> `bridge`

##### options

An object with a property `methods`, which is also an object, with the following properties:

- `request: Object`
  - `validate: Function(data) => Error?` - if validate returns or throws an error, the request fails.
  - `middleware: Array<Function(callback)>` - an array of asynchronous functions to run in order before sending the request.
- `response: Object`
  - `validate: Function(data) => Error?` - if validate function returns or throws an error, the response fails.
  - `middleware: Array<Function(callback)>` - an array of asynchronous functions to run in order before sending the response.


#### `bridge.methods.{methodName}(payload, callback)`

Methods will be defined under the object `bridge.methods` matching the name of every key you passed into `options.methods`.

##### payload: any

Data to pass to this method's listener.

##### callback

A function which takes parameters `(error, data)`.

It is called with an error if an error occurs in any validate or middleware function, or if the listener responds with an error.

Otherwise, it is called with `data` that the listener responded with.

#### `bridge.listen(method, callback)`

##### method

A reference to one of the methods under `bridge.methods`.

##### listener

A function that will be called with `(data, respond)` when a message is sent on this channel.

Respond should be called with `(error, responseData)`.

### `require('app-bridge/singleton')`

This is the same as requiring the main file, except it creates or returns a singleton stored on the window.

The intention is that your "master" app will create the bridge using `app-bridge/singleton`, and your child apps will get that global bridge once they are asynchronously loaded.

## License

MIT © [Andrew Joslin](http://ajoslin.com)
