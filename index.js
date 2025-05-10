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

function calculateGrendalLevel(ability, style) {
  const baseScores = {
    muscular: 50,
    slimy: 30,
    sneaky: 40,
    bodyguard: 45,
    wizard: 38,
    soul: 40,
    "kung fu master": 50
  };

  const baseAbility = baseScores[ability.toLowerCase()] || 30;
  const baseStyle = baseScores[style.toLowerCase()] || 30;

  const multiplier = (Math.random() * 0.8 + 1.1).toFixed(2); // 1.1 to 1.9
  const level = Math.round((baseAbility + baseStyle) * multiplier);
  return level;
}

function generateGrendalName(ability, style) {
  const abilityWords = {
    muscular: ["Flex", "Bulk", "Ripped", "Brawn"],
    slimy: ["Sludge", "Goop", "Gloop", "Grease"],
    sneaky: ["Skulk", "Creep", "Shade", "Whisp"],
    "kung fu master": ["Kick", "Strike", "Tiger", "Crane"]
  };
  const styleWords = {
    bodyguard: ["Shield", "Tank", "Guard"],
    soul: ["Groove", "Beat", "Soul"],
    inmate: ["Cell", "Shank", "Warden"],
    punk: ["Spit", "Crash", "Stitch"]
  };

  const a = abilityWords[ability.toLowerCase()] || [ability];
  const s = styleWords[style.toLowerCase()] || [style];
  const first = a[Math.floor(Math.random() * a.length)];
  const last = s[Math.floor(Math.random() * s.length)];
  return `${first} ${last}`;
}

function generateBackstory(name, ability, style) {
  return `${name} was once a regular Gremlin, until they were transformed by ${style} culture and became incredibly ${ability}. Now, they're known for ${ability}-based antics across the underground scene.`;
}

const customFields = {
  "Grendals": (req) => {
    const ability = req.body.specialAbility || "slimy";
    const style = req.body.visualStyle || "punk";

    req.cardName = generateGrendalName(ability, style);
    req.grendalLevel = calculateGrendalLevel(ability, style);
    req.backstory = generateBackstory(req.cardName, ability, style);

    return `Create a vertical 9:16 trading card image of a realistic gremlin-like character inspired by the uploaded photo.

- Portrait orientation, black background
- Green mottled border
- Centered bust-level pose
- Movie-style lighting and textures (realistic, not cartoonish)
- No text on the image

The Grendal should appear ${ability} and have a ${style} aesthetic. Leave space above and below for overlay.`;
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
