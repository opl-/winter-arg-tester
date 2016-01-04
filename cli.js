var tester = require('./main');
var fs = require('fs');
var https = require('https');
var crypto = require('crypto');

var VERSION = 4;

var remote = 'warg.ngrok.io';

var config = require('./config.json');

config.rateLimit = config.rateLimit || 95;
config.applist = config.applist || 'app-list.txt';
config.debug = config.debug || false;

function debug() {
	if (config.debug) {
		var args = [];
		args[0] = '[debug]';
		for (var i = 0; i < arguments.length; i++) args[i + 1] = arguments[i];
		console.log.apply(console, args);
	}
}

var appIDs = fs.readFileSync(config.applist).toString().replace(/\r/g, '').split('\n');

function checkPassword(password, callback) {
	var results = [];

	var queries = 0;
	var elapsed = 0;
	var rateLimited = false;

	var left = [];
	for (var i = 0; i < appIDs.length; i++) left[i] = appIDs[i];

	console.log('== Checking password: ' + password);

	console.log();
	var intervalID = setInterval(function() {
		elapsed++;
		process.stdout.write('\x1b[1000D\x1b[K\x1b[A');
		console.log(((appIDs.length - left.length) + '/' + appIDs.length + '        ').substr(0,11) + ' ' + (queries + 'q/s       ').substr(0,8) + ' ' + (elapsed + 's     ').substr(0,5) + ' ' + (rateLimited ? '! RATE LIMITED (waiting) !' : ''));
		queries = 0;

		if (left.length === 0) {
			console.log('Done!');
			clearInterval(intervalID);
			return callback(results);
		}
	}, 1000);

	function nextAppID(ignoreRateLimit, fromTimeout) {
		if (left.length === 0) return;

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

		var appID = left[0];
		left.splice(0, 1);

		tester.tryPassword(password, appID, function(err, result) {
			if (err) {
				rateLimited = true;
				left.splice(0, 0, appID);
			} else {
				rateLimited = false;
				if (result) {
					//process.stdout.write('\x07');
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
			}
			nextAppID(ignoreRateLimit);
		});
	}

	for (var w = 0; w < 50; w++) nextAppID(w === 0);
}

function printHelp() {
	console.log('== help');
	console.log('Prints this message.');
	console.log('== password <password>');
	console.log('Check <password> against all app ids listed in a text file (default app-list.txt). Don\'t use quotes!');
	console.log('== list');
	console.log('Bruteforces all passwords in a text file (default custom-list.txt).');
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

	var password = process.argv.slice(3, process.argv.length).join(' ');

	tester.tryWintercomic(password, function(err, winterResult) {
		if (winterResult) {
			if (winterResult.url) {
				console.log('[wintercomic redirect] password=' + password + ', url=' + winterResult.url);
			} else {
				console.log('[wintercomic unusual] password=' + password + ', result:', winterResult);
			}
		}

		checkPassword(password, function(result) {
			process.exit();
		});
	});
}else if (process.argv[2] === 'list') {
    fs.readFile('custom-list.txt', function(err, buffer) {
        if (err) {
            console.log('Error: custom-list.txt does not exist.');
            return;
        }
        var text = buffer.toString().split('\n');
        var out = 0;
        checkList(0);

        function checkList(i) {
            if (i == text.length) {
                if (out == text.length)
                    console.log('Error: custom-list.txt is empty.');
                process.exit();
            }

            var password = text[i];
            if (text[i].trim() == '') {
                out++;
                checkList(i + 1);
            } else
                tester.tryWintercomic(password, function(err, winterResult) {
                    if (winterResult) {
                        if (winterResult.url) {
                            console.log('[wintercomic redirect] password=' + password + ', url=' + winterResult.url);
                        } else {
                            console.log('[wintercomic unusual] password=' + password + ', result:', winterResult);
                        }
                    }

                    checkPassword(password, function(result) {
                        checkList(i + 1);
                    });
                });
        }

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

		req.on('error', function(err) {
			console.log('Error when posting results. Retrying in 10 seconds.', err);
			setTimeout(function() {
				postResults(resp, result);
			}, 10000);
		});

		req.write(JSON.stringify({
			id: resp.id,
			result: result
		}));

		req.end();
	}

	function getNextPassword() {
		var req = https.request({
			host: remote,
			path: '/nextpassword?client=' + encodeURIComponent(VERSION) + '&applist=' + (crypto.createHash('md5').update(appIDs.join('\n')).digest('hex')),
			headers: {
				'content-type': 'application/json'
			}
		}, function(res) {
			res.on('data', function(data) {
				req.response = (req.response || '') + data.toString();
			}).on('end', function() {
				try {
					var resp = JSON.parse(req.response);
					var regexString = new RegExp("[<>\"'(){}]", "g"); // Regex check for XSS and SQL injection like strings
					if (resp.status === 'success') {
						var regexTest = regexString.test(resp.password);
						//console.log(regexTest);
						if(regexTest === false){
							checkPassword(resp.password, function(result) {
								if (resp.password.indexOf('/') !== -1) {
									postResults(resp, result);
								} else {
									tester.tryWintercomic(resp.password, function(err, winterResult) {
										if (winterResult) {
											if (winterResult.url) {
												console.log('[wintercomic redirect] password=' + resp.password + ', url=' + winterResult.url);
											} else {
												console.log('[wintercomic unusual] password=' + resp.password + ', result:', winterResult);
											}
											result.push(winterResult);
										}

										postResults(resp, result);
									});
								}
							});
						}else{
							var results = [];
							console.log("Received invalid password");
							console.log(resp.password);
							postResults(resp, results); // send back no response to remove the troll entry from the queue
						}
					}
					else if (resp.status === 'queue_empty') {
						console.log('No passwords to check. Retrying in 10 seconds.');
						setTimeout(getNextPassword, 10000);
					} else if (resp.status === 'invalid_applist') {
						console.log('Invalid app list. Downloading new list from the server.');

						var req2 = https.request({
							host: remote,
							path: '/res/app-list.txt'
						}, function(res) {
							res.on('data', function(data) {
								req2.response = (req2.response || '') + data.toString();
							});

							res.on('end', function() {
								var newName = 'app-list.' + (new Date().getTime()) + '.txt';
								fs.renameSync(config.applist, newName);

								fs.writeFile(config.applist, req2.response, function(err) {
									appIDs = req2.response.replace(/\r/g, '').split('\n');

									if (err) {
										fs.renameSync(newName, config.applist);
										console.log('Error writing new app list to disk. Skipping save.');
										setTimeout(getNextPassword, 10000);
									} else {
										console.log('App list updated.');
										setTimeout(getNextPassword, 10000);
									}
								});
							});
						});

						req2.on('error', function(err) {
							console.log('Error downloading new app list. Retrying in 10 seconds.', err);
							setTimeout(getNextPassword, 10000);
						});

						req2.end();
					} else {
						console.log('Unknown response (retrying in 10 seconds):', resp);
						setTimeout(getNextPassword, 10000);
					}
				} catch (e) {
					console.log(req.response);
					console.log('Exception when getting next password. Retrying in 10 seconds.', e);
					setTimeout(getNextPassword, 10000);
				}
			});
		});
		req.on('error', function(err) {
			console.log('Error when getting next password. Retrying in 10 seconds.', err);
			setTimeout(getNextPassword, 10000);
		});
		req.end();
	}

	getNextPassword();
}
