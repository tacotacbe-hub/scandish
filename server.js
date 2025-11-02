// backend/server.js

// 1. Dépendances
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// --- NOUVEAUTÉ : Initialisation de Knex et de la DB ---
const knex = require('knex')(require('./knexfile').development); // Charge la configuration SQLite
// ----------------------------------------------------

// 2. Initialisation
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Middlewares
app.use(express.json()); 
app.use(cors()); 

// ===============================================
// 4. SUPPRESSION de la SIMULATION DE BASE DE DONNÉES (en mémoire)
//    Les tableaux 'annonces', 'mesAnnonces', etc. sont maintenant dans la DB.
// ===============================================


// ===============================================
// 5. DÉFINITION des ROUTES D'API (avec Knex)
// ===============================================

// Route de base pour vérifier que le serveur est accessible
app.get('/', (req, res) => {
    res.send("API Scandish fonctionne ! (Connecté à SQLite)");
});

// --- Annonces (GET) ---
// Récupère TOUTES les annonces de la DB
app.get('/api/annonces', async (req, res) => {
    try {
        // Sélectionne toutes les colonnes de la table 'annonces'
        const annonces = await knex('annonces').select('*');
        
        // Formatte la réponse pour correspondre à ce que le Frontend attendait (vendeur: { nom: ... })
        const formattedAnnonces = annonces.map(ad => ({
            ...ad,
            vendeur: { id: ad.vendeur_id, nom: ad.vendeur_nom }
        }));

        res.json(formattedAnnonces);
    } catch (error) {
        console.error("Erreur de récupération des annonces:", error);
        res.status(500).json({ message: "Erreur serveur lors de la récupération des annonces." });
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
        console.error("Erreur lors de la création de l'annonce:", error);
        res.status(500).json({ message: "Erreur serveur lors de la création de l'annonce." });
    }
});

// --- Routes Simples (Laissées pour l'exemple, à connecter à la DB plus tard) ---

app.get('/api/services', (req, res) => {
    // Cette route n'est pas encore connectée à la DB services
    res.json([
        { id: 1, titre: "MontageExpress 75 (STATIC)", categorie: "Montage", localisation: "Paris, 75011", note: 5, description: "Monteur pro.", prestataire: { id: 104, nom: "MontagePro", avatarUrl: "https://placehold.co/80x80/A3C1C9/FFFFFF?text=M" } },
    ]);
});

app.get('/api/hacks', (req, res) => {
    // Cette route n'est pas encore connectée à la DB hacks
    res.json([
        { id: 1, titre: "Buffet IVAR et cannage (STATIC)", imageUrl: "https://placehold.co/600x400/D9C7A3/333333?text=Hack+IVAR+DB", createur: { id: 101, nom: "HackQueen" } },
    ]);
});

app.post('/api/login', (req, res) => {
    // ... (Logique de connexion non modifiée)
    const { email, password } = req.body;
    if (email === 'user@scandish.com' && password === 'pass') {
        res.json({ message: "Connexion réussie", token: "jwt-fake-token-12345" });
    } else {
        res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }
});

app.post('/api/contact', (req, res) => {
    // ... (Logique de contact non modifiée)
    console.log("Nouveau message reçu:", req.body);
    res.status(201).json({ message: "Message reçu par le serveur (201 Created) !" });
});

app.put('/api/boutique/settings', (req, res) => {
    // ... (Logique de mise à jour non modifiée)
    console.log("Paramètres de boutique mis à jour:", req.body);
    res.json({ message: "Paramètres enregistrés sur le serveur." });
});


// 6. Démarrage du Serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
    console.log(`📡 Connecté à la DB SQLite : scandish.sqlite`);
});