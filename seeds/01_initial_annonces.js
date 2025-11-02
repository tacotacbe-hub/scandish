// backend/seeds/01_initial_annonces.js

exports.seed = async function(knex) {
  // Supprime toutes les entrées existantes
  await knex('annonces').del();
  
  // Insère les nouvelles annonces
  await knex('annonces').insert([
    { 
        titre: 'Étagère Billy (DB Persistante)', 
        prix: 35.00, 
        localisation: 'Marseille, 13001', 
        imageUrl: 'https://placehold.co/300x250/A3C1C9/333333?text=Billy+SQL',
        vendeur_id: 1, 
        vendeur_nom: 'VendeurSQL'
    },
    { 
        titre: 'Fauteuil Strandmon (DB Persistante)', 
        prix: 130.50, 
        localisation: 'Lille, 59000', 
        imageUrl: 'https://placehold.co/300x250/B9C7B3/333333?text=Strandmon+SQL',
        vendeur_id: 2, 
        vendeur_nom: 'VintageSeller'
    }
  ]);
};