'use strict'

const EE = require('events').EventEmitter
const nes = require('nes')
const Histogram = require('native-hdr-histogram')
const histUtil = require('hdr-histogram-percentiles-obj')
const steed = require('steed')
const get = require('lodash.get')
const Client = nes.Client

function anger (opts) {
  if (opts.senders > opts.connections) {
    throw Error('Senders *are* connections, must be <= connections')
  }
  const tracker = new EE()
  const clients = new Array(opts.connections)
  const senders = new Array(opts.senders)
  const latencies = new Histogram(1, 10000, 5)
  const identifier = opts.identifier || 'id'
  const tail = opts.tail || false
  const auth = opts.auth
  const expectedResponses = typeof opts.responses === 'number'
    ? opts.responses
    : opts.connections * opts.requests
  const map = new Map()
  const uidOf = typeof identifier === 'function'
    ? identifier
    : (payload) => get(payload, identifier)

  for (var i = 0; i < clients.length; i++) {
    clients[i] = new Client(opts.url)
    if (i < opts.senders) {
      senders[i] = clients[i]
    }
  }

  // map because of errors
  steed.map(clients, (client, done) => {
    client.connect({ auth: auth }, done)
  }, (err) => {
    if (err) {
      return onError(err)
    }

    tracker.emit('connect')

    // map because of errors
    steed.map(clients, (client, done) => {
      client.subscribe(opts.subscription, handler, done)
    }, (err) => {
      if (err) {
        return onError(err)
      }

      tracker.emit('subscribe')
    })
  })

  tracker.on('subscribe', next)

  var totalResponses = 0
  var totalRequests = 0

  function handler (payload) {
    const mapObj = map.get(uidOf(payload))
    totalResponses++

    const startTime = mapObj.start
    const end = process.hrtime(startTime)
    const responseTime = end[0] * 1e3 + end[1] / 1e6
    latencies.record(responseTime)

    if (!--mapObj.expectedResponses) {
      tracker.emit('publish-events-recieved', uidOf(payload))

      if (!tail && totalResponses === expectedResponses) {
        complete()
      }

      return next(mapObj.sender)
    }
  }

  function next (sender) {
    if (totalRequests === opts.requests) return

    // begin emitting the requests if none have been emitted
    if (!totalRequests) {
      for (let i = 0; i < senders.length; i++) {
        triggerSender(senders[i])
      }
    }

    // if sender is passed in, trigger it
    if (sender) triggerSender(sender)
  }

  function triggerSender (sender) {
    const uid = opts.trigger(sender)
    if (++totalRequests === opts.requests && tail) setTimeout(complete, tail)
    map.set(uid, { start: process.hrtime(), sender: sender, expectedResponses: clients.length, id: uid })

    // emit trigger every time a client sends a message
    tracker.emit('trigger', uid)
  }

  function complete () {
    clients.forEach(disconnect)
    tracker.emit('end', {
      latency: histUtil.addPercentiles(latencies, histUtil.histAsObj(latencies)),
      requests: totalRequests,
      responses: totalResponses,
      connections: clients.length,
      senders: opts.senders
    })
  }

  function disconnect (client) {
    client.disconnect()
  }

  function onError (err) {
    clients.forEach(disconnect)
    tracker.emit('error', err)
  }

  return tracker
}

module.exports = anger
