# Use Node.js slim image
FROM node:22-alpine

# Install poppler-utils for pdfimages
RUN apk add --no-cache poppler-utils

# Set working directory
WORKDIR /app

# Copy root workspace files
COPY package.json yarn.lock nx.json tsconfig.base.json tsconfig.json ./
# Copy the root eslint config file
COPY eslint.config.mjs ./

COPY .env .env

# Create necessary directory structure
RUN mkdir -p apps/rag-backend libs

# Copy the entire apps directory structure
COPY apps/rag-backend apps/rag-backend/

# Copy migrations
COPY migrations ./migrations


# Install dependencies
RUN yarn install --frozen-lockfile

# Install Nx and plugins
RUN yarn add -D nx @nx/js @nx/next @nx/cypress @nx/eslint @nx/jest @nx/webpack eslint -W

RUN yarn nx sync

# Build the backend app
# RUN yarn nx build rag-backend

# RUN find . -type d -name "dist*" | sort
# RUN find . -name "main.js" | sort

# Expose the port used by NestJS
EXPOSE 3000

# Run the built app
# CMD find . -name "main.js" -type f | xargs -I{} sh -c 'echo "Running {}"; node {}'

CMD ["yarn", "nx", "serve", "rag-backend"]
