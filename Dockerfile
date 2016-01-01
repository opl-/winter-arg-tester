FROM node:5.3.0

# Set WORKDIR to /src
WORKDIR /src

# Bundle app source
ADD . /src

# Set default command to run in bot mode.
CMD ["node", "cli.js", "bot"]
