# Use an official Node.js runtime as a parent image
FROM node:22.20.0-slim

# Set the working directory inside the container
WORKDIR /app

# Install OpenSSL and libssl for runtime crypto needs
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    openssl \
    libssl3 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install yarn and global tools, then install dependencies
RUN npm install -g @nestjs/cli
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN yarn build

# Expose the application port
EXPOSE 3000

# Command to run migrations then start the application
CMD ["sh", "-c", "yarn prisma migrate deploy && yarn start:prod"]