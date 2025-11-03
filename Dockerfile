FROM node:23-alpine

# Create app dir
WORKDIR /app

# Install app dependencies
COPY package*.json ./

# Run npm install
RUN npm install

# Copy app source code
COPY . .

# Set environment variable to allow binding to all interfaces
ENV HOST=0.0.0.0

# Expose the port the app will run on
EXPOSE 3005

# Start the application
CMD ["npm", "start"]
