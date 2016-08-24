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
  channels: {
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
  bridge.send('loadChildApp', {body: params}, function (error, element) {
    parentElement.appendChild(element)
  })
}
```

### In your child app (child-app.js, loaded async):

```js
const bridge = require('app-bridge/singleton')()

bridge.listen('loadChildApp', function (data, respond) {
  const element = document.createElement('child-app')
  element.innerHTML = JSON.stringify(data)

  respond(null, element)
})

```

## API

### `require('app-bridge')`

#### `Bridge(options)` -> `bridge`

##### options

An objeect with a property `channels`, which is also an object, with the following properties:

- `request: Object`
  - `validate: Function(data) => Error?` - if validate returns or throws an error, the request fails.
  - `middleware: Array<Function(callback)>` - an array of asynchronous functions to run in order before sending the request.
- `response: Object`
  - `validate: Function(data) => Error?` - if validate function returns or throws an error, the response fails.
  - `middleware: Array<Function(callback)>` - an array of asynchronous functions to run in order before sending the response.


#### `bridge.send(options, callback)`

##### options

An object with the following properties:

- `channel: String` - One of the channels defined in the Bridge constructor.
- `payload: Any` - The payload to send to any listeners.

##### callback

A function which takes parameters `(error, data)`.

It is called with an error if an error occurs in any validate or middleware function, or if the listener responds with an error.

Otherwise, it is called with `data` that the listener responded with.

#### `bridge.listen(channel, callback)`

##### channel

The string ID of one of the channels defined in the constructor

##### listener

A function that will be called with `(data, respond)` when a message is sent on this channel.

Respond should be called with `(error, responseData)`.

### `require('app-bridge/singleton')

This is the same as requiring the main file, except it creates or returns a singleton stored on the window.

The intention is that your "master" app will create the bridge using `app-bridge/singleton`, and your child apps will get that global bridge once they are asynchronously loaded.

## License

MIT © [Andrew Joslin](http://ajoslin.com)
