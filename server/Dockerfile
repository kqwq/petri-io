# Use the official Node.js image
FROM node:lts

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the ports
EXPOSE 3000
EXPOSE 3001

# Command to run the application
CMD ["node", "server.js"]
