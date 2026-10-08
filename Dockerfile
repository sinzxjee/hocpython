FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY lib ./lib
COPY public ./public
RUN mkdir .data && chown node:node .data
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]

