FROM node:20-alpine

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

# Start the server
CMD ["node", "server/dist/app.js"]
