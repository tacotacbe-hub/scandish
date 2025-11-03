/**
 * @param { import("knex").Knex } knex
 */
exports.seed = async function seed(knex) {
  await knex('messages').del();
  await knex('saved_listings').del();
  await knex('listings').del();
  await knex('users').del();

  const [aliceId] = await knex('users').insert({
    name: 'Alice',
    email: 'alice@example.com',
    password_hash: '9c56991d3f031f22f9f545eef3716524:03dfcd7e23c2ca5b99bb382dcc3422d3bc0010c8391905629dfce1d7a9ab22f828ab9f4dbe41f0e250c493ec875abb8e85a7ea811319cf35013ac00c559b0aa3'
  });

  const [bobId] = await knex('users').insert({
    name: 'Bob',
    email: 'bob@example.com',
    password_hash: '452f7e456984f3991572bdf3d72f3fc6:ce0ae45e3e02d7e8633cf7be0e54317774731265b6005673f0bbec2abd915c3b9c3a16c34659de927eea31e28fec8955689f62efd208499c55872d7757250a64'
  });

  const [kivikId] = await knex('listings').insert({
    title: 'Canapé IKEA KIVIK',
    description: 'Canapé 3 places en très bon état, housses lavées récemment.',
    price: 280.0,
    brand: 'IKEA',
    location: 'Paris',
    image_url: 'https://placehold.co/600x400?text=Canape+KIVIK',
    seller_id: aliceId
  });

  const [veddeId] = await knex('listings').insert({
    title: 'Table JYSK VEDDE',
    description: 'Table en chêne massif avec rallonge, quelques marques d\'usage.',
    price: 190.0,
    brand: 'JYSK',
    location: 'Lyon',
    image_url: 'https://placehold.co/600x400?text=Table+VEDDE',
    seller_id: bobId
  });

  await knex('saved_listings').insert({ user_id: aliceId, listing_id: veddeId });

  await knex('messages').insert([
    {
      listing_id: kivikId,
      sender_id: bobId,
      recipient_id: aliceId,
      content: 'Bonjour, votre canapé est-il toujours disponible ?'
    },
    {
      listing_id: kivikId,
      sender_id: aliceId,
      recipient_id: bobId,
      content: 'Oui, il est toujours disponible. Souhaitez-vous venir le voir ?'
    }
  ]);
};
