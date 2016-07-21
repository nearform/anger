'use strict'

const test = require('tap').test
const anger = require('..')

test('backoff test', { timeout: 3000 }, (t) => {
  t.plan(4)

  const startTime = process.hrtime()

  require('./authServer')((err, server) => {
    t.error(err)

    t.tearDown(server.stop.bind(server))

    let uid = 0
    const instance = anger({
      url: server.info.uri,
      subscription: '/greet',
      senders: 1,
      connections: 1,
      requests: 1,
      responses: 1,
      identifier: (payload) => payload.meta.id,
      auth: { headers: { authorization: `Basic ${new Buffer('jane:jane').toString('base64')}` } },
      trigger: (sender) => {
        sender.request({
          method: 'POST',
          path: '/h',
          payload: {
            id: ++uid
          }
        })
        return uid
      },
      retryOpts: {
        retries: 3,
        min: 750,
        max: 750
      }
    })

    instance.on('error', (err) => {
      t.ok(err, 'error happened')
      const end = process.hrtime(startTime)
      const elapsedTime = end[0] * 1e3 + end[1] / 1e6
      t.ok(elapsedTime >= 1500, 'should have taken at least a second and a half to fail')
      t.equal(server.failedCount, 3)
    })

    instance.on('end', () => {
      t.fail('end never happens')
    })
  })
})
