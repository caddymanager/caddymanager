FROM node:alpine

RUN mkdir -p /usr/src/node-app && chown -R node:node /usr/src/node-app

# Install PM2 globally before switching to node user
RUN npm install pm2 -g

WORKDIR /usr/src/node-app

# Accept build arguments
ARG BUILD_NUMBER=unknown
ARG GIT_COMMIT=unknown
ARG GIT_BRANCH=unknown
ARG BUILD_DATE=unknown

# Set environment variables from build args
ENV BUILD_NUMBER=$BUILD_NUMBER
ENV GIT_COMMIT=$GIT_COMMIT
ENV GIT_BRANCH=$GIT_BRANCH
ENV BUILD_DATE=$BUILD_DATE

COPY package*.json ./

USER node

RUN npm ci

COPY --chown=node:node . .

# Generate build info with passed environment variables and ensure it completes
RUN node scripts/generateBuildInfo.js && \
    echo "Verifying build info files exist:" && \
    ls -la src/build-info.* || echo "No build-info files found"

EXPOSE 3000

CMD ["npm", "start"]