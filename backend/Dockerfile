# ==============================================================================
# LifeLink Backend Dockerfile
# Production-ready, lightweight Node.js container
# ==============================================================================

FROM node:22-alpine AS runtime

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV PORT=5000

# Set working directory
WORKDIR /app

# Install dependencies (only production dependencies)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code
COPY . .

# Use non-root node user for security
USER node

# Expose backend API port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
