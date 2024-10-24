
default: init dev

init:
	echo "Building the project"
	cd ./server && npm install

dev:
	echo "Starting development server"
	cd server && node server.mjs

op:
	cd operator-server && node main.mjs

docker-build:
	echo "Building docker image"
	docker build -f containerization/Dockerfile.server -t kqwq/petri-io-server .

docker-compose:
	echo "Starting docker-compose"
	docker compose -f containerization/docker-compose.yaml up
	
k8s-deploy-minikube:
	echo "Deploying to k8s"
	minikube start
	minikube kubectl -- apply -f containerization/k8s-deployment.yaml
	minikube kubectl -- apply -f containerization/k8s-service.yaml
	minikube kubectl -- get pods
	minikube kubectl -- get services