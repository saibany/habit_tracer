FROM node:20-alpine

# Install OpenSSL - required for Prisma to connect to PostgreSQL
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Copy package definitions
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN cd client && npm install
RUN cd server && npm install

# Copy source code
COPY . .

# Build client and server
RUN cd client && npm run build
RUN cd server && npx prisma generate && npm run build

# Environment setup
ENV NODE_ENV=production
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Copy prisma schema for migrations
COPY server/prisma ./server/prisma

# Start the server - run migrations first, then start node
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && cd .. && node server/dist/app.js"]
