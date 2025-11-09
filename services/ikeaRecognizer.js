const fs = require('fs');
const path = require('path');
const { parseAsciiPpm } = require('./ppmUtils');
const { computeFeatureVector, featureDistance } = require('./featureExtraction');

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'ikea_catalog', 'catalog.json');

function normaliseBase64Input(input) {
  if (!input) {
    return null;
  }
  const trimmed = input.trim();
  const base64Marker = ';base64,';
  if (trimmed.includes(base64Marker)) {
    const [, payload] = trimmed.split(base64Marker);
    return payload.trim();
  }
  return trimmed;
}

class IkeaRecognizer {
  constructor() {
    this.references = [];
    this.keywordMap = new Map();
    this.loadCatalog();
  }

  loadCatalog() {
    const catalogRaw = fs.readFileSync(CATALOG_PATH, 'utf-8');
    const catalog = JSON.parse(catalogRaw);
    this.references = catalog.map((entry) => {
      const absolutePath = path.join(__dirname, '..', entry.referenceImage);
      const buffer = fs.readFileSync(absolutePath);
      const ppm = parseAsciiPpm(buffer);
      const vector = computeFeatureVector(ppm);
      const keywords = [entry.model, ...(entry.keywords || [])]
        .map((keyword) => keyword.toLowerCase());
      for (const keyword of keywords) {
        if (!this.keywordMap.has(keyword)) {
          this.keywordMap.set(keyword, []);
        }
        this.keywordMap.get(keyword).push(entry.model);
      }
      return {
        ...entry,
        absolutePath,
        vector,
        keywords,
      };
    });
  }

  matchByKeywords(imageUrl) {
    if (!imageUrl) {
      return null;
    }
    const lowered = imageUrl.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const reference of this.references) {
      let score = 0;
      for (const keyword of reference.keywords) {
        if (lowered.includes(keyword)) {
          score += 1;
        }
      }
      if (score > 0 && score >= bestScore) {
        bestScore = score;
        bestMatch = reference;
      }
    }

    if (!bestMatch) {
      return null;
    }

    const confidence = Math.min(0.9, 0.6 + 0.1 * bestScore);
    return {
      brand: 'IKEA',
      model: bestMatch.model,
      name: bestMatch.name,
      description: bestMatch.description,
      method: 'keywords',
      confidence,
    };
  }

  matchByPpm(base64) {
    if (!base64) {
      return null;
    }

    const payload = normaliseBase64Input(base64);
    if (!payload) {
      return null;
    }

    let buffer;
    try {
      buffer = Buffer.from(payload, 'base64');
    } catch (error) {
      throw new Error('Image en base64 invalide.');
    }

    let ppm;
    try {
      ppm = parseAsciiPpm(buffer);
    } catch (error) {
      throw new Error(`Impossible de lire l'image (PPM attendu): ${error.message}`);
    }

    const vector = computeFeatureVector(ppm);

    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const reference of this.references) {
      const distance = featureDistance(vector, reference.vector);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = reference;
      }
    }

    if (!best) {
      return null;
    }

    const MAX_DISTANCE = 1.5;
    const confidence = Math.max(0, 1 - (bestDistance / MAX_DISTANCE));

    return {
      brand: 'IKEA',
      model: best.model,
      name: best.name,
      description: best.description,
      method: 'ppm-features',
      confidence: Number(confidence.toFixed(3)),
      distance: Number(bestDistance.toFixed(4)),
    };
  }

  recognize({ imageUrl, imageBase64 }) {
    const keywordResult = this.matchByKeywords(imageUrl);
    if (keywordResult) {
      return keywordResult;
    }

    if (imageBase64) {
      return this.matchByPpm(imageBase64);
    }

    return null;
  }
}

const recognizer = new IkeaRecognizer();

module.exports = {
  recognizer,
};
