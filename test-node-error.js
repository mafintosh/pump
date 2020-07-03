var pump = require('./index')

var rs = require('fs').createReadStream('/dev/random')
var ws = require('fs').createWriteStream('/dev/null')

var callbackCalled = false

var check = function (err) {
  if (err && err.streamIndex === 0) {
    console.log('test-node-error.js passes')
    clearTimeout(timeout)
  }
}

setTimeout(function () {
  rs.destroy(new Error('premature close'))
}, 1000)

pump(rs, ws, check)

var timeout = setTimeout(function () {
  throw new Error('timeout')
}, 5000)
