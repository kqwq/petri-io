
default: init dev

init:
	echo "Building the project"
	cd ./server && npm install

dev:
	echo "Starting development server"
	cd server && node server.mjs
