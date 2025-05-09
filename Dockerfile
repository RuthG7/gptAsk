# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# Copy package.json and lock file
COPY package.json package-lock.json* ./

# Install dependencies based on the lock file
RUN npm ci --only=production

# Stage 2: Build the Next.js application
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package.json and lock file first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies) needed for the build
RUN npm ci

# Copy all source code AFTER installing dependencies
COPY . .

# Remove the COPY --from=deps line as we install directly here

# Set NEXT_TELEMETRY_DISABLED to avoid extra network calls during build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application
RUN npm run build

# Stage 3: Production image - minimal environment
FROM node:18-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from the builder stage
COPY --from=builder /app/public ./public
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Change ownership of necessary folders
# (Adjust if you have specific file permission needs)
USER nextjs

# Expose the port Next.js runs on (default 3000)
EXPOSE 3000

# Set the default port for Cloud Run
ENV PORT 3000

# Command to run the application using the Node.js server
# This uses the output of `output: 'standalone'` in next.config.js
CMD ["node", "server.js"]