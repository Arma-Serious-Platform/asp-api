# Use an official Node.js runtime as a parent image
FROM node:22.20.0-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install yarn and global tools, then install dependencies
RUN npm install -g yarn @nestjs/cli
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN yarn build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]