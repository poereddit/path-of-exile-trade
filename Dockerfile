FROM node:14-alpine AS build

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn

COPY ./ ./

RUN yarn build

FROM node:14-alpine AS final

ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn

COPY --from=build /usr/src/app/dist .

CMD ["node", "bot.js"]