FROM node:20-slim

# Install OpenSSL 1.1 for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/database/package*.json ./packages/database/
COPY apps/api/package*.json ./apps/api/
COPY apps/admin/package*.json ./apps/admin/

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Generate Prisma Client and build
WORKDIR /app/packages/database
RUN npm install && npx prisma generate && npm run build

WORKDIR /app/apps/admin
RUN npm install && npm run build

WORKDIR /app/apps/api
RUN npm install && npm run build

# Set working directory and expose port
WORKDIR /app/apps/api
EXPOSE 3001

# Start the API
CMD ["node", "dist/index.js"]
