/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
// backend/migrations/votre_nom_de_fichier_date.js

exports.up = function(knex) {
  // Crée la table 'annonces' si elle n'existe pas
  return knex.schema.createTable('annonces', (table) => {
    table.increments('id').primary(); // ID unique auto-incrémenté
    table.string('titre').notNullable();
    table.decimal('prix', 8, 2).notNullable(); // Prix avec 2 décimales
    table.string('localisation').notNullable();
    table.string('imageUrl').defaultTo('https://placehold.co/300x250/E5E5E5/333333?text=Article');
    table.string('statut').defaultTo('Actif');
    
    // Simuler le vendeur
    table.integer('vendeur_id').notNullable();
    table.string('vendeur_nom').notNullable();

    table.timestamps(true, true); // colonnes created_at et updated_at
  });
};

exports.down = function(knex) {
  // Inverse l'opération (pour annuler la migration)
  return knex.schema.dropTable('annonces');
};