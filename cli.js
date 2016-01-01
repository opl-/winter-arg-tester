var tester = require('./main');
var fs = require('fs');

if (process.argv.length < 4 || process.argv[2] === 'help') {
	console.log('== help');
	console.log('Prints this message.');
	console.log('== password <password>');
	console.log('Check <password> against all app ids listed in app-list.txt. Don\'t use quotes!');
} else if (process.argv[2] === 'password') {
	var appIDs = fs.readFileSync('app-list.txt').toString().replace(/\r/g, '').split('\n');
	var currentAppID = 0;

	var password = process.argv.slice(3, process.argv.length).join(' ');

	var queries = 0;
	var elapsed = 0;
	var rateLimited = false;

	var done = 0;

	console.log();
	setInterval(function() {
		elapsed++;
		process.stdout.write('\x1b[1000D\x1b[K\x1b[A');
		console.log((done + '/' + appIDs.length + '        ').substr(0,10) + ' ' + (queries + 'q/s       ').substr(0,8) + ' ' + (elapsed + 's     ').substr(0,5) + ' ' + (rateLimited ? '! RATE LIMITED (waiting) !' : ''));
		queries = 0;

		if (done === appIDs.length) {
			console.log('Done!');
			return process.exit();
		}
	}, 1000);

	process.on('SIGINT', function() {
		process.stdout.write('\n\r');
		process.exit();
	});

	function nextAppID() {
		if (currentAppID === appIDs.length) return;

		if (rateLimited) {
			return setTimeout(function() {
				nextAppID();
			}, 15000);
		}

		var appID = appIDs[currentAppID++];
		queries++;

		tester.tryPassword(password, appID, function(err, result) {
			done++;

			if (err) {
				rateLimited = true;
				currentAppID--;
			} else {
				rateLimited = false;
				if (!result) {
				} else if (result.url) {
					console.log('[found url] app=' + appID + ', password=' + password + ', url=' + result.url + '\n');
				} else if (result.response) {
					console.log('[found response] app=' + appID + ', password=' + password + ', response=' + result.response + '\n');
				} else {
					console.log('[found weird] app=' + appID + ', password=' + password + ', result=' + JSON.stringify(result) + '\n');
				}
				nextAppID();
			}
		});
	}

	for (var w = 0; w < 50; w++) nextAppID();
}
