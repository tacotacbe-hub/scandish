// backend/knexfile.js

module.exports = {

  development: { // Environnement local (avec SQLite)
    client: 'sqlite3',
    connection: {
      filename: './scandish.sqlite'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },

  production: { // Environnement de production (avec MySQL)
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,      // Hôte de la DB (fourni par LWS)
      user: process.env.DB_USER,      // Nom d'utilisateur (fourni par LWS)
      password: process.env.DB_PASSWORD, // Mot de passe
      database: process.env.DB_NAME   // Nom de la DB
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }

};