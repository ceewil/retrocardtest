const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function calculateGrendalLevel(trait, style) {
  const baseScores = {
    muscular: 50,
    slimy: 30,
    sneaky: 40,
    "90's rapper": 35,
    goth: 25,
    punk: 30,
    bodyguard: 45,
    wizard: 38,
    soul: 40
  };

  const baseTrait = baseScores[trait.toLowerCase()] || 30;
  const baseStyle = baseScores[style.toLowerCase()] || 30;

  const multiplier = (Math.random() * 0.8 + 1.1).toFixed(2); // 1.1 to 1.9
  const level = Math.round((baseTrait + baseStyle) * multiplier);
  return level;
}

function generateGrendalName(trait, style) {
  const traitWords = {
    muscular: ["Flex", "Bulk", "Ripped", "Brawn"],
    slimy: ["Sludge", "Goop", "Gloop", "Grease"],
    sneaky: ["Skulk", "Creep", "Shade", "Whisp"]
  };
  const styleWords = {
    "90's rapper": ["Mic", "G", "Fresh", "Rhymes"],
    goth: ["Hex", "Fade", "Grave"],
    punk: ["Spit", "Crash", "Stitch"],
    bodyguard: ["Shield", "Tank", "Guard"],
    soul: ["Groove", "Beat", "Soul"]
  };
  const t = traitWords[trait.toLowerCase()] || [trait];
  const s = styleWords[style.toLowerCase()] || [style];
  const first = t[Math.floor(Math.random() * t.length)];
  const last = s[Math.floor(Math.random() * s.length)];
  return `${first} ${last}`;
}

function generateBackstory(name, trait, style) {
  return `${name} was once a regular Gremlin, until they were transformed by ${style} culture and became incredibly ${trait}. Now, they're known for ${trait}-based antics across the underground scene.`;
}

const customFields = {
  "Grendals": (req) => {
    const trait = req.body.dominantTrait || "slimy";
    const style = req.body.visualStyle || "punk";

    req.cardName = generateGrendalName(trait, style);
    req.grendalLevel = calculateGrendalLevel(trait, style);
    req.backstory = generateBackstory(req.cardName, trait, style);

    return `Create a vertical 9:16 trading card image of a realistic gremlin-like character inspired by the uploaded photo.

- Portrait orientation, black background
- Green mottled border
- Centered bust-level pose
- Movie-style lighting and textures (realistic, not cartoonish)
- No text on the image

The Grendal should appear ${trait} and have a ${style} aesthetic. Leave space above and below for overlay.`;
  }
};

app.post('/generate', upload.single('photo'), async (req, res) => {
  const character = req.body.character || 'Grendals';
  const extras = (customFields[character]?.(req) || "");

  const prompt = `Create a stylized character portrait that resembles the uploaded photo. ${extras}`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024"
    });

    const imageUrl = response.data[0]?.url;

    res.json({
      imageUrl,
      cardName: req.cardName,
      grendalLevel: req.grendalLevel,
      backstory: req.backstory
    });
  } catch (err) {
    console.error("❌ OpenAI API Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
