function computeFeatureVector(ppm) {
  const { width, height, data } = ppm;
  const pixelCount = width * height;
  if (!pixelCount) {
    throw new Error('Image sans pixels.');
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  let verticalChange = 0;
  let horizontalChange = 0;

  let brownish = 0;
  let bluish = 0;
  let warm = 0;
  let greyish = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];

      sumR += r;
      sumG += g;
      sumB += b;

      const intensity = (r + g + b) / 3;

      if (x < width - 1) {
        const nextIndex = (y * width + (x + 1)) * 3;
        const nr = data[nextIndex];
        const ng = data[nextIndex + 1];
        const nb = data[nextIndex + 2];
        const nextIntensity = (nr + ng + nb) / 3;
        verticalChange += Math.abs(intensity - nextIntensity);
      }

      if (y < height - 1) {
        const nextIndex = ((y + 1) * width + x) * 3;
        const nr = data[nextIndex];
        const ng = data[nextIndex + 1];
        const nb = data[nextIndex + 2];
        const nextIntensity = (nr + ng + nb) / 3;
        horizontalChange += Math.abs(intensity - nextIntensity);
      }

      const maxChannel = Math.max(r, g, b);
      const minChannel = Math.min(r, g, b);
      const chroma = maxChannel - minChannel;

      if (chroma < 0.08 && intensity > 0.6) {
        greyish += 1;
      } else if (r > g && g > b && r - b > 0.15) {
        brownish += 1;
      } else if (b > r && b > g && b - Math.max(r, g) > 0.1) {
        bluish += 1;
      } else if (r > 0.5 && g > 0.4 && b < 0.4) {
        warm += 1;
      }
    }
  }

  const totalPixels = pixelCount;
  const norm = 1 / totalPixels;

  return {
    avgR: sumR * norm,
    avgG: sumG * norm,
    avgB: sumB * norm,
    verticalChange: verticalChange / totalPixels,
    horizontalChange: horizontalChange / totalPixels,
    brownRatio: brownish * norm,
    blueRatio: bluish * norm,
    warmRatio: warm * norm,
    greyRatio: greyish * norm,
  };
}

function featureDistance(a, b) {
  const keys = Object.keys(a);
  let sum = 0;
  for (const key of keys) {
    const diff = (a[key] || 0) - (b[key] || 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

module.exports = {
  computeFeatureVector,
  featureDistance,
};
