var tester = require('./main');
var fs = require('fs');
var https = require('https');

var remote = 'warg.ngrok.io';

var config = require('./config.json');

config.rateLimit = config.rateLimit || 95;
config.applist = config.applist || 'app-list.txt';
config.debug = config.debug || false;

function debug() {
	if (config.debug) console.log.apply(console, arguments.unshift('[debug]'));
}

function checkPassword(password, callback) {
	var appIDs = fs.readFileSync(config.applist).toString().replace(/\r/g, '').split('\n');
	var currentAppID = 0;

	var results = [];

	var queries = 0;
	var elapsed = 0;
	var rateLimited = false;

	var done = 0;

	console.log('== Checking password: ' + password);

	console.log();
	var intervalID = setInterval(function() {
		elapsed++;
		process.stdout.write('\x1b[1000D\x1b[K\x1b[A');
		console.log((done + '/' + appIDs.length + '        ').substr(0,10) + ' ' + (queries + 'q/s       ').substr(0,8) + ' ' + (elapsed + 's     ').substr(0,5) + ' ' + (rateLimited ? '! RATE LIMITED (waiting) !' : ''));
		queries = 0;

		if (done === appIDs.length) {
			console.log('Done!');
			clearInterval(intervalID);
			return callback(results);
		}
	}, 1000);

	function nextAppID(ignoreRateLimit, fromTimeout) {
		if (currentAppID === appIDs.length) return;

		if (queries > config.rateLimit) {
			return setTimeout(function() {
				nextAppID(ignoreRateLimit, false);
			}, 50);
		}
		queries++;

		if (rateLimited && !fromTimeout) {
			return setTimeout(function() {
				nextAppID(ignoreRateLimit, ignoreRateLimit);
			}, 15000);
		}

		var appID = appIDs[currentAppID++];

		tester.tryPassword(password, appID, function(err, result) {
			done++;

			if (err) {
				rateLimited = true;
				currentAppID--;
			} else {
				rateLimited = false;
				if (result) {
					if (result.url) {
						console.log('[found url] app=' + appID + ', password=' + password + ', url=' + result.url + '\n');
					} else if (result.response) {
						console.log('[found response] app=' + appID + ', password=' + password + ', response=' + result.response + '\n');
					} else {
						console.log('[found weird] app=' + appID + ', password=' + password + ', result=' + JSON.stringify(result) + '\n');
					}

					results.push({
						appID: appID,
						result: result
					});
				}
				nextAppID(ignoreRateLimit);
			}
		});
	}

	for (var w = 0; w < 50; w++) nextAppID(w === 0);
}

function printHelp() {
	console.log('== help');
	console.log('Prints this message.');
	console.log('== password <password>');
	console.log('Check <password> against all app ids listed in a text file (default app-list.txt). Don\'t use quotes!');
	console.log('== bot');
	console.log('Automatically checks passwords.');
}

if (process.argv.length < 3 || process.argv[2] === 'help') {
	printHelp();
} else if (process.argv[2] === 'password') {
	if (process.argv.length < 3) return printHelp();

	process.on('SIGINT', function() {
		process.stdout.write('\n\r');
		process.exit();
	});

	checkPassword(process.argv.slice(3, process.argv.length).join(' '), function(result) {
		process.exit();
	});
} else if (process.argv[2] === 'bot') {
	process.on('SIGINT', function() {
		process.stdout.write('\n\r');
		process.exit();
	});

	function postResults(resp, result) {
		var req = https.request({
			host: remote,
			path: '/solve',
			method: 'POST',
			headers: {
				'content-type': 'application/json'
			}
		}, function(res) {
			res.on('data', function(data) {
				req.response = (req.response || '') + data.toString();
			}).on('end', function() {
				try {
					var a = JSON.parse(req.response);
					if (a.status === 'success') {
						console.log('Results posted.');
						getNextPassword();
					} else {
						console.warn('Error posting results! Retrying in 10 seconds.');
						console.log(req.response);
						setTimeout(function() {
							postResults(resp, result);
						}, 10000);
					}
				} catch (e) {
					console.log('Exception when posting results. Retrying in 10 seconds.', e);
					console.log(req.response);
					setTimeout(function() {
						postResults(resp, result);
					}, 10000);
				}
			});
		});

		req.write(JSON.stringify({
			id: resp.id,
			result: result
		}))

		req.end();
	}

	function getNextPassword() {
		var req = https.request({
			host: remote,
			path: '/nextpassword',
			headers: {
				'content-type': 'application/json'
			}
		}, function(res) {
			res.on('data', function(data) {
				req.response = (req.response || '') + data.toString();
			}).on('end', function() {
				try {
					var resp = JSON.parse(req.response);

					if (resp.status === 'success') {
						checkPassword(resp.password, function(result) {
							postResults(resp, result);
						});
					} else if (resp.status === 'queue_empty') {
						console.log('No passwords to check. Retrying in 10 seconds.');
						setTimeout(getNextPassword, 10000);
					} else {
						console.log('Unknown response (retrying in 10 seconds):', resp);
						setTimeout(getNextPassword, 10000);
					}
				} catch (e) {
					console.log('Exception when getting next password. Retrying in 10 seconds.', e);
					setTimeout(getNextPassword, 10000);
				}
			});
		});
		req.end();
	}

	getNextPassword();
}
