# Base image with the system libraries Prisma needs at build and run time
FROM node:22.20.0-slim AS base

WORKDIR /app

# Install OpenSSL and libssl for runtime crypto needs
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    openssl \
    libssl3 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Build stage: all dependencies (including dev) to compile the app
FROM base AS build

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# Runtime stage: production dependencies and the compiled app only
FROM base AS runtime

COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install --frozen-lockfile --production \
  && yarn cache clean

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Run as the unprivileged user shipped with the Node image
USER node

# Expose the application port
EXPOSE 3000

# Command to run migrations then start the application
CMD ["sh", "-c", "yarn prisma migrate deploy && yarn start:prod"]
