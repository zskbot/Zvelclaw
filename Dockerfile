# syntax=docker/dockerfile:1
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
RUN npm install --omit=dev
ENTRYPOINT ["node", "src/cli.js"]
CMD ["help"]
