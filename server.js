// backend/server.js

// 1. Dépendances
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// --- Initialisation de Knex et de la DB ---
// Utilise le knexfile que nous avons configuré pour se connecter à SQLite en local.
const knex = require('knex')(require('./knexfile').development); 
// ----------------------------------------------------

// 2. Initialisation
const app = express();
// PORT utilisé par Render (process.env.PORT) ou 3000 en local
const PORT = process.env.PORT || 3000; 

// 3. Middlewares
app.use(express.json()); 
app.use(cors()); 

// --- Liste de secours (Fallback) en cas de problème de DB sur Render ---
const FALLBACK_ANNONCES = [
    { id: 999, titre: 'Article de Secours 1 (Render)', prix: 10.00, localisation: 'Online', imageUrl: 'https://placehold.co/300x250/A3C1C9/333333?text=Article+Secours', vendeur: { id: 999, nom: 'Render Fallback' } },
    { id: 998, titre: 'Article de Secours 2 (Render)', prix: 20.00, localisation: 'Online', imageUrl: 'https://placehold.co/300x250/B9C7B3/333333?text=Article+Secours', vendeur: { id: 998, nom: 'Render Fallback' } }
];
// ---------------------------------------------------------------------

// ===============================================
// 5. DÉFINITION des ROUTES D'API (avec Knex)
// ===============================================

// Route de base pour vérifier que le serveur est accessible
app.get('/', (req, res) => {
    res.send("API Scandish fonctionne ! (Connecté à SQLite)");
});

// --- Annonces (GET) ---
// Récupère TOUTES les annonces de la DB (ou utilise le fallback)
app.get('/api/annonces', async (req, res) => {
    try {
        // Tente de récupérer les données de la DB persistante
        const annonces = await knex('annonces').select('*');
        
        if (annonces.length > 0) {
            // Si des données sont trouvées, les formater et les renvoyer
            const formattedAnnonces = annonces.map(ad => ({
                ...ad,
                vendeur: { id: ad.vendeur_id, nom: ad.vendeur_nom }
            }));
            return res.json(formattedAnnonces);
        }

        // Si la DB est vide ou n'a pas pu être initialisée (problème SQLite éphémère)
        throw new Error("DB vide ou non accessible.");

    } catch (error) {
        // En cas d'erreur de connexion à SQLite ou autre, utiliser les données de secours
        console.warn("ATTENTION: Erreur de connexion à la DB. Utilisation des données de secours. Détail de l'erreur:", error.message);
        return res.json(FALLBACK_ANNONCES);
    }
});

// Récupère les annonces du Vendeur (simulé pour l'utilisateur connecté)
app.get('/api/annonces/les-miennes', async (req, res) => {
    try {
        // Simuler la récupération des annonces d'un vendeur spécifique (ici ID 1)
        const mesAnnonces = await knex('annonces')
            .where({ vendeur_id: 1 }) 
            .select('id', 'titre', 'prix', 'statut');

        res.json(mesAnnonces);
    } catch (error) {
        console.error("Erreur de récupération des annonces personnelles:", error);
        // Utiliser une réponse vide ou un message d'erreur si la DB est hors ligne
        res.status(500).json({ message: "Erreur serveur lors de la récupération de vos annonces." });
    }
});

// --- Annonces (POST : Création) ---
app.post('/api/annonces', async (req, res) => {
    const { titre, prix, localisation, imageUrl } = req.body;
    
    // Simuler le vendeur et les données pour l'insertion
    const newAd = {
        titre,
        prix,
        localisation,
        imageUrl,
        vendeur_id: 1, // Utilisateur connecté
        vendeur_nom: "Votre Boutique (DB)"
    };
    
    try {
        // Insertion dans la DB et récupération de l'ID inséré
        const [id] = await knex('annonces').insert(newAd); 
        
        // Retourner l'objet complet au frontend
        res.status(201).json({ 
            message: "Annonce créée avec succès sur la DB.", 
            data: { id, ...newAd, vendeur: { nom: newAd.vendeur_nom } } 
        });
    } catch (error) {
        // En cas d'échec de l'insertion (ex: DB non persistante)
        console.error("Erreur lors de la création de l'annonce. La DB n'est peut-être pas persistante:", error);
        res.status(500).json({ message: "Erreur serveur : Impossible d'enregistrer l'annonce de manière persistante." });
    }
});

// --- Routes Simples (Laissées pour l'exemple, à connecter à la DB plus tard) ---

app.get('/api/services', (req, res) => {
    res.json([
        { id: 1, titre: "MontageExpress 75 (STATIC)", categorie: "Montage", localisation: "Paris, 75011", note: 5, description: "Monteur pro.", prestataire: { id: 104, nom: "MontagePro", avatarUrl: "https://placehold.co/80x80/A3C1C9/FFFFFF?text=M" } },
    ]);
});

app.get('/api/hacks', (req, res) => {
    res.json([
        { id: 1, titre: "Buffet IVAR et cannage (STATIC)", imageUrl: "https://placehold.co/600x400/D9C7A3/333333?text=Hack+IVAR+DB", createur: { id: 101, nom: "HackQueen" } },
    ]);
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (email === 'user@scandish.com' && password === 'pass') {
        res.json({ message: "Connexion réussie", token: "jwt-fake-token-12345" });
    } else {
        res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }
});

app.post('/api/contact', (req, res) => {
    console.log("Nouveau message reçu:", req.body);
    res.status(201).json({ message: "Message reçu par le serveur (201 Created) !" });
});

app.put('/api/boutique/settings', (req, res) => {
    console.log("Paramètres de boutique mis à jour:", req.body);
    res.json({ message: "Paramètres enregistrés sur le serveur." });
});


// 6. Démarrage du Serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
    console.log(`📡 Tentative de connexion à la DB SQLite : scandish.sqlite`);
});