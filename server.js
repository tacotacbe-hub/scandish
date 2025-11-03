const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig.development);

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'super-secret-development-key';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours
const ALLOWED_BRANDS = ['IKEA', 'JYSK'];

app.use(express.json());
app.use(cors());

function buildUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalKey] = storedHash.split(':');
  if (!salt || !originalKey) {
    return false;
  }
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalKey, 'hex'), Buffer.from(derivedKey, 'hex'));
}

function createToken(userId) {
  const timestamp = Date.now();
  const payload = `${userId}.${timestamp}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

function parseToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [userId, timestamp, signature] = decoded.split('.');

    if (!userId || !timestamp || !signature) {
      return null;
    }

    const payload = `${userId}.${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return null;
    }

    if (Date.now() - Number(timestamp) > TOKEN_TTL_MS) {
      return null;
    }

    return { userId: Number(userId) };
  } catch (error) {
    console.error('Erreur de décodage du jeton:', error);
    return null;
  }
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authentification requise.' });
  }

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Format du jeton invalide.' });
  }

  const payload = parseToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Jeton invalide ou expiré.' });
  }

  const user = await knex('users').where({ id: payload.userId }).first();

  if (!user) {
    return res.status(401).json({ message: 'Utilisateur inexistant.' });
  }

  req.user = buildUserResponse(user);
  return next();
}

app.get('/', (_req, res) => {
  res.json({ message: 'API Scandish dédiée aux articles IKEA et JYSK.' });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nom, email et mot de passe sont obligatoires.' });
  }

  const normalisedEmail = String(email).trim().toLowerCase();

  try {
    const existingUser = await knex('users').where({ email: normalisedEmail }).first();

    if (existingUser) {
      return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' });
    }

    const passwordHash = hashPassword(password);
    const [userId] = await knex('users').insert({
      name: name.trim(),
      email: normalisedEmail,
      password_hash: passwordHash,
    });

    const newUser = await knex('users').where({ id: userId }).first();
    const token = createToken(newUser.id);

    res.status(201).json({ user: buildUserResponse(newUser), token });
  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);
    res.status(500).json({ message: 'Impossible de créer le compte pour le moment.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe sont obligatoires.' });
  }

  try {
    const user = await knex('users').where({ email: String(email).trim().toLowerCase() }).first();

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const token = createToken(user.id);
    res.json({ user: buildUserResponse(user), token });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Impossible de se connecter pour le moment.' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/listings', async (_req, res) => {
  try {
    const listings = await knex('listings as l')
      .leftJoin('users as u', 'l.seller_id', 'u.id')
      .select(
        'l.id',
        'l.title',
        'l.description',
        'l.price',
        'l.brand',
        'l.location',
        'l.image_url',
        'l.created_at',
        'l.updated_at',
        'u.id as seller_id',
        'u.name as seller_name'
      )
      .orderBy('l.created_at', 'desc');

    res.json(
      listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: Number(listing.price),
        brand: listing.brand,
        location: listing.location,
        imageUrl: listing.image_url,
        createdAt: listing.created_at,
        updatedAt: listing.updated_at,
        seller: {
          id: listing.seller_id,
          name: listing.seller_name,
        },
      }))
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des annonces:', error);
    res.status(500).json({ message: 'Impossible de récupérer les annonces pour le moment.' });
  }
});

app.get('/api/listings/:id', async (req, res) => {
  const listingId = Number(req.params.id);

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }

  try {
    const listing = await knex('listings as l')
      .leftJoin('users as u', 'l.seller_id', 'u.id')
      .where('l.id', listingId)
      .select(
        'l.id',
        'l.title',
        'l.description',
        'l.price',
        'l.brand',
        'l.location',
        'l.image_url',
        'l.created_at',
        'l.updated_at',
        'u.id as seller_id',
        'u.name as seller_name'
      )
      .first();

    if (!listing) {
      return res.status(404).json({ message: "L'annonce demandée est introuvable." });
    }

    res.json({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: Number(listing.price),
      brand: listing.brand,
      location: listing.location,
      imageUrl: listing.image_url,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      seller: {
        id: listing.seller_id,
        name: listing.seller_name,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'annonce:", error);
    res.status(500).json({ message: "Impossible de récupérer l'annonce pour le moment." });
  }
});

app.get('/api/me/listings', authMiddleware, async (req, res) => {
  try {
    const listings = await knex('listings').where({ seller_id: req.user.id }).orderBy('created_at', 'desc');

    res.json(
      listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: Number(listing.price),
        brand: listing.brand,
        location: listing.location,
        imageUrl: listing.image_url,
        createdAt: listing.created_at,
        updatedAt: listing.updated_at,
      }))
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des annonces utilisateur:', error);
    res.status(500).json({ message: 'Impossible de récupérer vos annonces pour le moment.' });
  }
});

app.post('/api/listings', authMiddleware, async (req, res) => {
  const { title, description, price, brand, location, imageUrl } = req.body;

  if (!title || price === undefined || !brand || !location) {
    return res.status(400).json({ message: 'Titre, prix, marque et localisation sont obligatoires.' });
  }

  const normalisedBrand = String(brand).trim().toUpperCase();
  if (!ALLOWED_BRANDS.includes(normalisedBrand)) {
    return res.status(400).json({ message: 'Seules les marques IKEA ou JYSK sont autorisées.' });
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice) || numericPrice <= 0) {
    return res.status(400).json({ message: 'Le prix doit être un nombre positif.' });
  }

  try {
    const [listingId] = await knex('listings').insert({
      title: title.trim(),
      description: description ? String(description).trim() : null,
      price: numericPrice,
      brand: normalisedBrand,
      location: location.trim(),
      image_url: imageUrl ? String(imageUrl).trim() : null,
      seller_id: req.user.id,
    });

    const created = await knex('listings').where({ id: listingId }).first();

    res.status(201).json({
      id: created.id,
      title: created.title,
      description: created.description,
      price: Number(created.price),
      brand: created.brand,
      location: created.location,
      imageUrl: created.image_url,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
      seller: {
        id: req.user.id,
        name: req.user.name,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'annonce:', error);
    res.status(500).json({ message: "Impossible de créer l'annonce pour le moment." });
  }
});

app.post('/api/listings/:id/save', authMiddleware, async (req, res) => {
  const listingId = Number(req.params.id);

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }

  try {
    const listing = await knex('listings').where({ id: listingId }).first();

    if (!listing) {
      return res.status(404).json({ message: "L'annonce demandée est introuvable." });
    }

    await knex('saved_listings')
      .insert({ user_id: req.user.id, listing_id: listingId })
      .onConflict(['user_id', 'listing_id'])
      .ignore();

    res.status(201).json({ message: "L'annonce a été ajoutée à vos favoris." });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'annonce:', error);
    res.status(500).json({ message: "Impossible d'enregistrer l'annonce pour le moment." });
  }
});

app.delete('/api/listings/:id/save', authMiddleware, async (req, res) => {
  const listingId = Number(req.params.id);

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }

  try {
    await knex('saved_listings').where({ user_id: req.user.id, listing_id: listingId }).del();
    res.json({ message: "L'annonce a été retirée de vos favoris." });
  } catch (error) {
    console.error('Erreur lors de la suppression de la sauvegarde:', error);
    res.status(500).json({ message: 'Impossible de retirer cette annonce pour le moment.' });
  }
});

app.get('/api/me/saved', authMiddleware, async (req, res) => {
  try {
    const saved = await knex('saved_listings as s')
      .join('listings as l', 's.listing_id', 'l.id')
      .join('users as u', 'l.seller_id', 'u.id')
      .where('s.user_id', req.user.id)
      .select(
        'l.id as listing_id',
        'l.title',
        'l.description',
        'l.price',
        'l.brand',
        'l.location',
        'l.image_url',
        'l.created_at',
        'l.updated_at',
        'u.id as seller_id',
        'u.name as seller_name'
      )
      .orderBy('l.created_at', 'desc');

    res.json(
      saved.map((listing) => ({
        id: listing.listing_id,
        title: listing.title,
        description: listing.description,
        price: Number(listing.price),
        brand: listing.brand,
        location: listing.location,
        imageUrl: listing.image_url,
        createdAt: listing.created_at,
        updatedAt: listing.updated_at,
        seller: {
          id: listing.seller_id,
          name: listing.seller_name,
        },
      }))
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des favoris:', error);
    res.status(500).json({ message: 'Impossible de récupérer vos annonces sauvegardées pour le moment.' });
  }
});

app.post('/api/listings/:id/messages', authMiddleware, async (req, res) => {
  const listingId = Number(req.params.id);
  const { content } = req.body;

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Le contenu du message est obligatoire.' });
  }

  try {
    const listing = await knex('listings').where({ id: listingId }).first();

    if (!listing) {
      return res.status(404).json({ message: "L'annonce demandée est introuvable." });
    }

    const recipientId = listing.seller_id;

    const [messageId] = await knex('messages').insert({
      listing_id: listingId,
      sender_id: req.user.id,
      recipient_id: recipientId,
      content: content.trim(),
    });

    const message = await knex('messages').where({ id: messageId }).first();

    res.status(201).json({
      id: message.id,
      listingId: message.listing_id,
      senderId: message.sender_id,
      recipientId: message.recipient_id,
      content: message.content,
      createdAt: message.created_at,
      updatedAt: message.updated_at,
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ message: "Impossible d'envoyer le message pour le moment." });
  }
});

app.get('/api/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await knex('messages as m')
      .leftJoin('listings as l', 'm.listing_id', 'l.id')
      .leftJoin('users as sender', 'm.sender_id', 'sender.id')
      .leftJoin('users as recipient', 'm.recipient_id', 'recipient.id')
      .where(function whereBuilder() {
        this.where('m.sender_id', req.user.id).orWhere('m.recipient_id', req.user.id);
      })
      .select(
        'm.id',
        'm.content',
        'm.created_at',
        'm.updated_at',
        'l.id as listing_id',
        'l.title as listing_title',
        'sender.id as sender_id',
        'sender.name as sender_name',
        'recipient.id as recipient_id',
        'recipient.name as recipient_name'
      )
      .orderBy('m.created_at', 'asc');

    res.json(
      messages.map((message) => ({
        id: message.id,
        content: message.content,
        createdAt: message.created_at,
        updatedAt: message.updated_at,
        listing: {
          id: message.listing_id,
          title: message.listing_title,
        },
        sender: {
          id: message.sender_id,
          name: message.sender_name,
        },
        recipient: {
          id: message.recipient_id,
          name: message.recipient_name,
        },
      }))
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ message: 'Impossible de récupérer vos messages pour le moment.' });
  }
});

app.get('/api/listings/:id/messages', authMiddleware, async (req, res) => {
  const listingId = Number(req.params.id);

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }

  try {
    const listing = await knex('listings').where({ id: listingId }).first();

    if (!listing) {
      return res.status(404).json({ message: "L'annonce demandée est introuvable." });
    }

    if (listing.seller_id !== req.user.id) {
      const isParticipant = await knex('messages')
        .where({ listing_id: listingId })
        .andWhere(function participantBuilder() {
          this.where('sender_id', req.user.id).orWhere('recipient_id', req.user.id);
        })
        .first();

      if (!isParticipant) {
        return res.status(403).json({ message: 'Accès refusé pour cette conversation.' });
      }
    }

    const messages = await knex('messages as m')
      .leftJoin('users as sender', 'm.sender_id', 'sender.id')
      .leftJoin('users as recipient', 'm.recipient_id', 'recipient.id')
      .where('m.listing_id', listingId)
      .orderBy('m.created_at', 'asc')
      .select(
        'm.id',
        'm.content',
        'm.created_at',
        'm.updated_at',
        'sender.id as sender_id',
        'sender.name as sender_name',
        'recipient.id as recipient_id',
        'recipient.name as recipient_name'
      );

    res.json(
      messages.map((message) => ({
        id: message.id,
        content: message.content,
        createdAt: message.created_at,
        updatedAt: message.updated_at,
        sender: {
          id: message.sender_id,
          name: message.sender_name,
        },
        recipient: {
          id: message.recipient_id,
          name: message.recipient_name,
        },
      }))
    );
  } catch (error) {
    console.error('Erreur lors de la récupération des messages par annonce:', error);
    res.status(500).json({ message: 'Impossible de récupérer les messages pour le moment.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
});
