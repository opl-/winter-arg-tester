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
1. Download and install Tor browser [Here](https://www.torproject.org/index.html.en).
2. Run Tor Browser in background.
3. Edit config.json and set the tor config to "true".
4. Start the script as normal in bot or password mode and all traffic will be 
"proxied" with the help of tor.

