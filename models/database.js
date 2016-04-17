module.exports.knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: "./xkcdfinder.sqlite"
  },
  debug: false,
  useNullAsDefault: true
});
module.exports.bookshelf = require('bookshelf')(module.exports.knex);
