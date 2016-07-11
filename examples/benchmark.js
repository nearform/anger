'use strict'

const anger = require('../')

let uid = 0
const instance = anger({
  url: 'http://localhost:3000',
  subscription: '/greet',
  senders: 2,
  connections: 10,
  requests: 1000,
  responses: 10000,
  identifier: (payload) => payload.meta.id,
  trigger: (sender) => {
    sender.request({
      method: 'POST',
      path: '/h',
      payload: {
        id: ++uid
      }
    })
    return uid
  }
})

instance.on('end', (result) => {
  // do things with result! yay!
})
