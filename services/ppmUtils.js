const COMMENT_CHAR = '#';

function tokenizePpm(text) {
  const tokens = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(COMMENT_CHAR)) {
      continue;
    }
    const parts = trimmed.split(/\s+/);
    for (const part of parts) {
      if (part.length > 0) {
        tokens.push(part);
      }
    }
  }
  return tokens;
}

function parseAsciiPpm(buffer) {
  if (!buffer || !buffer.length) {
    throw new Error('Image vide ou non fournie.');
  }

  const text = buffer.toString('utf-8');
  const tokens = tokenizePpm(text);

  if (tokens.length < 4) {
    throw new Error('Fichier PPM invalide ou incomplet.');
  }

  const magic = tokens.shift();
  if (magic !== 'P3') {
    throw new Error(`Format PPM non supporté: ${magic}. Seul le format ASCII P3 est accepté.`);
  }

  const width = parseInt(tokens.shift(), 10);
  const height = parseInt(tokens.shift(), 10);
  const maxVal = parseInt(tokens.shift(), 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(maxVal)) {
    throw new Error('En-tête PPM invalide.');
  }
  if (width <= 0 || height <= 0 || maxVal <= 0) {
    throw new Error('Dimensions ou valeur maximale invalides dans le PPM.');
  }

  const expectedValues = width * height * 3;
  if (tokens.length < expectedValues) {
    throw new Error('Données PPM insuffisantes.');
  }

  const data = new Float32Array(expectedValues);
  const normalizer = 1 / maxVal;
  for (let i = 0; i < expectedValues; i += 1) {
    const value = parseInt(tokens[i], 10);
    if (!Number.isFinite(value)) {
      throw new Error(`Valeur de pixel invalide détectée à l'indice ${i}.`);
    }
    data[i] = Math.max(0, Math.min(1, value * normalizer));
  }

  return { width, height, maxVal, data };
}

module.exports = {
  parseAsciiPpm,
};
