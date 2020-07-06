# Path of Exile Trade Discord Bot

1. Copy `.env.example` to `.env` and modify values as appropriate
   1. For local builds, use the `./dist` prefix to your migrations, i.e. `TYPEORM_ENTITIES=./dist/entities/*.js`
   1. For Docker builds, use root, i.e. `TYPEORM_ENTITIES=entities/*.js`
1. Build the project
   1. Local: `yarn` then `yarn build`
   1. Docker: `docker build -t <your_tag> .`
1. Create a Postgres database
1. Run the migration scripts
   1. Local: `./node_modules/.bin/typeorm migration:run`
   1. Docker: `docker run --rm --env-file=.env <your_tag> ./node_modules/.bin/typeorm migration:run`
1. Run the bot
   1. Local: `node ./dist/bot.js`
   1. Docker: `docker run -it --env-file=.env <your_tag>`
