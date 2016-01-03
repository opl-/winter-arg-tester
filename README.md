
app-list.txt thanks to xPaw (http://xpaw.me)

How do I use this?
---
1. Get [Node.js](https://nodejs.org/)
2. Pull this script (or just download it as a zip file [from here](https://github.com/opl-/winter-arg-tester/archive/master.zip) and unpack it somewhere).
3. Open a console in the directory you downloaded the code to.
4. Run:
  * `node cli help` to print the help message.
  * `node cli password <password>` where `<password>` is the phrase you want to test to check it for all games.
  * `node cli bot` to run in bot mode, which automatically gets passwords from a database and tests them without you having to do anything.
  
Tor support?
---
Tor support thanks to Fillerix99 and nepeat.

If you don't know how to setup tor:

1. Open a console in the directory you downloaded the code to.
2. Run `npm install`.
3. Download and install Tor Browser [here](https://www.torproject.org/index.html.en).
4. Run Tor Browser in background.
5. Edit config.json and change `"tor": false` to `"tor": true`.
6. Start the script as usual in bot or password mode and all traffic will be sent through tor.

If you know how to setup tor:

1. Open a console in the directory you downloaded the code to.
2. Run `npm install`.
3. Start tor.
4. Edit config.json and set `tor` to `{"port": 9050}` (or whichever port you are using).
5. Run the script like you normally would.
