# anger

A pub-sub load tester for [Nes][nes]. Designed to be used to write custom
"realworld" like scenarios.

### Status: Experimental

## Install

```
npm install --save anger
```

## Usage

To use `anger`, simply require it, and supply it some test scenario configuration.

```js
const anger = require('anger')

const instance = anger({
  url: 'http://localhost:3000',
  subscription: '/greet', // the 'topic' to pub/sub test
  connections: 1000, // 1000 clients connect
  senders: 2, // 2 clients send messages
  requests: 1000, // 2 clients send 1000 requests
  responses: 10000, // expected number of responses (1000 connections responding to 1000 individual requests)
  identifier: (payload) => payload.meta.id, // used to apply an id to messages in, which matches it to the corresponding request
  trigger: (sender) => { // a function used to send a message to the server
    sender.request({
      method: 'POST',
      path: '/h',
      payload: {
        id: ++uid // this is used to map the responses to the requests
      }
    })
    return uid // must return the uid of the message sent
  }
})

instance.on('end', (result) => {
  // some stats are in result
})
```

## API

### anger(opts)

Start an anger instance against a given target.

* `opts`: An `Object` with configuration information. Can contain the following attributes:
    * `url`: The base url of the hapi/nes server you want to test.
    * `subscription`: A topic to test.
    * `connections`: The number of connections to maintain to server. Each is an individual nes client.
    * `senders`: The number of connections that should be senders.
    * `responses`: The number of overall expected responses to be recieved during this run.
    * `auth`: A `Function` passed to the nes client for authentication. This is passed the `client` and `index` of that client as params. Must return the auth object options. [reference.][nes-auth]
    * `identifier`: A function used to map some payload response data to a requests uid.
    * `trigger`: A function which is passed a nes client to emit a message to the server for testing. Must return some uid of a message sent.

**Returns** an instance/event emitter for tracking progress, etc.

### anger events

Because an anger instance is an `EventEmitter`, it emits several events. these are below:
* `error`: emitted on a error. The callback function will receive the `error` as the first parameter.
* `connect`: emitted when all clients are connected to the server.
* `subscribe`: emitted when all clients are subscribed to the server.
* `trigger`: emitted when a sender is sending a 'request' message. The callback function will receive the requests `uid` as the first parameter.
* `publish-events-recieved`: emitted when all connections receive the message 'response' sent from the server, in response to some triggered 'request'. The callback should receive the `uid` for the event that triggered it.
* `end`: emmited when testing finishes, with the `result` passed as the first parameter to the callback.

## Sample

Check out the [examples folder](./examples) for a simple sample.

## License

[MIT](./LICENSE). Copyright (c) Matteo Collina and David Mark Clements 2016.

[nes]: https://www.npmjs.com/package/nes
[nes-auth]: https://github.com/hapijs/nes#client-3
