/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('listings', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.decimal('price', 10, 2).notNullable();
    table.string('brand').notNullable();
    table.string('location').notNullable();
    table.string('image_url');
    table
      .integer('seller_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('saved_listings', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .integer('listing_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('listings')
      .onDelete('CASCADE');
    table.unique(['user_id', 'listing_id']);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('messages', (table) => {
    table.increments('id').primary();
    table
      .integer('listing_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('listings')
      .onDelete('CASCADE');
    table
      .integer('sender_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .integer('recipient_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.text('content').notNullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('saved_listings');
  await knex.schema.dropTableIfExists('listings');
  await knex.schema.dropTableIfExists('users');
};
