const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/cards', express.static(path.join(__dirname, 'cards')));

const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function generateGrendalName(trait, style) {
  const traitWords = {
    muscular: ["Flex", "Bulk", "Ripped", "Brawn"],
    slimy: ["Sludge", "Goop", "Gloop", "Grease"],
    sneaky: ["Skulk", "Creep", "Shade", "Whisp"]
  };
  const styleWords = {
    "90's rapper": ["Mic", "G", "Fresh", "Rhymes"],
    goth: ["Hex", "Fade", "Grave"],
    punk: ["Spit", "Crash", "Stitch"]
  };
  const t = traitWords[trait.toLowerCase()] || [trait];
  const s = styleWords[style.toLowerCase()] || [style];
  const first = t[Math.floor(Math.random() * t.length)];
  const last = s[Math.floor(Math.random() * s.length)];
  return `${first} ${last}`;
}

async function composeGrendalCard(baseImgUrl, name, outputFile = "final-card.png") {
  const canvasWidth = 768;
  const canvasHeight = 1343;
  const imageX = 49;
  const imageY = 334;
  const imageWidth = 670;
  const imageHeight = 670;

  // Fetch and resize the DALL·E image with enforced PNG format
  const response = await fetch(baseImgUrl);
  const originalBuffer = Buffer.from(await response.arrayBuffer());

  const resizedBuffer = await sharp(originalBuffer)
    .resize(imageWidth, imageHeight, { fit: "cover" }) // Resize to fit the frame
    .png() // Strip EXIF metadata and enforce compatibility
    .toBuffer();

  // Generate the SVG for the name in the white bar
  const svgText = `
    <svg width="${canvasWidth}" height="${canvasHeight}">
      <style>
        .title {
          font-family: 'Impact', sans-serif;
          font-size: 48px;
          font-weight: bold;
          fill: #ff0000;
          stroke: #000000;
          stroke-width: 2px;
          paint-order: stroke;
        }
      </style>
      <text x="50%" y="1275" text-anchor="middle" class="title">${name}</text>
    </svg>
  `;

  // Create the composite image
  const finalBuffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      { input: resizedBuffer, top: imageY, left: imageX },
      { input: "Grendalstt.png", top: 0, left: 0 },
      { input: Buffer.from(svgText), top: 0, left: 0 }
    ])
    .png()
    .toBuffer();

  const outputPath = path.join(__dirname, "cards", outputFile);
  fs.writeFileSync(outputPath, finalBuffer);
  return `/cards/${outputFile}`;
}


const customFields = {
  "Grendals": (req) => {
    const trait = (req.body.dominantTrait || "slimy").trim();
    const style = (req.body.visualStyle || "punk").trim();
    req.cardName = generateGrendalName(trait, style);
    return `
      Create a vertical 9:16 trading card image of a grotesque gremlin-like character inspired by the uploaded photo.
      - Portrait orientation, black background
      - Green mottled border
      - Centered bust-level pose
      - High-contrast, saturated color cartoon look
      The Grendal should appear ${trait} and have a ${style} aesthetic.
      No text on the image. Leave space above and below for template overlay.
    `.trim();
  },

  "Operation Bravo": (req) => {
    const weapon = (req.body.weaponType || "tactical rifle").trim();
    const style = (req.body.combatStyle || "close quarters combat").trim();
    return `The figure is armed with a ${weapon} and specializes in ${style}.`;
  },

  "Trash Can Kids": (req) => {
    const item = (req.body.favoriteItem || "soggy sandwich").trim();
    const activity = (req.body.favoriteActivity || "dumpster diving").trim();
    return `They love their ${item} and spend most days ${activity}.`;
  }
};

app.post('/generate', upload.single('photo'), async (req, res) => {
  const character = req.body.character || '80s hero';

  const basePrompt = `Create a stylized cartoon character portrait that resembles the uploaded photo.`;
  const themePrompt = {
    "Operation Bravo": "The figure is a classic 1980s military hero with 'Kung Fu Grip', dressed in a retro green combat uniform.",
    "Grendals": "A creepy gremlin-like creature featured on a collectible trading card.",
    "Trash Can Kids": "A satirical, weird cartoon child with exaggerated traits."
  }[character] || "A retro-style collectible toy with bold card art.";

  const extras = (customFields[character]?.(req) || "").trim();
  const prompt = `${basePrompt} ${themePrompt} ${extras}`.trim();

  console.log("🟢 Final prompt to OpenAI:", prompt);

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024"
    });

    const imageUrl = response.data[0]?.url;

    if (character === "Grendals") {
      const filename = `grendal-${Date.now()}.png`;
      const finalPath = await composeGrendalCard(imageUrl, req.cardName, filename);
      res.json({ imageUrl: finalPath });
    } else {
      res.json({ imageUrl });
    }
  } catch (err) {
    console.error("❌ OpenAI API Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
