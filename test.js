var pump = require('./index');

var rs = require('fs').createReadStream('/dev/random');
var ws = require('fs').createWriteStream('/dev/null');

var toHex = function() {
	var reverse = new (require('stream').Transform)();

	reverse._transform = function(chunk, enc, callback) {
		reverse.push(chunk.toString('hex'));
		callback();
	};

	return reverse;
};

var wsClosed = false;
var rsClosed = false;
var callbackCalled = false;
var cbError = null;
var tsError = null;

var check = function() {
	if (wsClosed && rsClosed && callbackCalled && cbError === tsError && cbError === "Error from stream") process.exit(0);
};

ws.on('close', function() {
	wsClosed = true;
	check();
});

rs.on('close', function() {
	rsClosed = true;
	check();
});

var ts = toHex();
ts.destroy = function(err) {
	tsError = err;
};

pump(rs, toHex(), toHex(), ts, ws, function(err) {
	cbError = err;
	callbackCalled = true;
	check();
});

setTimeout(function() {
	rs.destroy();
	rs.emit('error', "Error from stream");
}, 1000);

setTimeout(function() {
	throw new Error('timeout');
}, 5000);