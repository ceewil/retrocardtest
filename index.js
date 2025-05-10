const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

function calculateGrendalLevel(trait, style) {
  let score = 50;
  const traitWeights = {
    muscular: 20,
    slimy: 10,
    sneaky: 15
  };
  const styleWeights = {
    punk: 10,
    goth: 15,
    "90's rapper": 20
  };
  score += traitWeights[trait.toLowerCase()] || 5;
  score += styleWeights[style.toLowerCase()] || 5;
  return score;
}

async function getAverageSkinTone(buffer) {
  const sharp = require('sharp');
  const { data } = await sharp(buffer).resize(10, 10).raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 3) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const total = data.length / 3;
  return {
    r: Math.round(r / total),
    g: Math.round(g / total),
    b: Math.round(b / total)
  };
}

function rgbToTone({ r, g, b }) {
  const brightness = (r + g + b) / 3;
  if (brightness < 80) return "dark skin tone";
  if (brightness < 150) return "medium skin tone";
  return "light skin tone";
}

async function generateBackstory(name, trait, style) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: `Write a short, quirky backstory (2 sentences max) for a collectible creature card. Name: ${name}. Trait: ${trait}. Style: ${style}. Keep it funny or ironic.`
      }
    ]
  });
  return completion.choices[0]?.message.content.trim();
}

const customFields = {
  "Grendals": (req) => {
    const trait = req.body.dominantTrait || "slimy";
    const style = req.body.visualStyle || "punk";
    req.cardName = generateGrendalName(trait, style);
    req.grendalLevel = calculateGrendalLevel(trait, style);
    req.cardTrait = trait;
    req.cardStyle = style;
    const toneText = req.extractedTone ? `The Grendal should have a ${req.extractedTone}, based on the photo.` : "";
    return `Create a vertical 9:16 trading card image of a grotesque gremlin-like character named ${req.cardName}.
Movie-realistic rendering, not cartoonish.
Centered, forward-facing bust-level pose.
Black background with green mottled border.
The creature should appear ${trait} and have a ${style} aesthetic.
${toneText}
No text on the image. Text will be added as HTML overlay.`;
  },
  "Operation Bravo": (req) => {
    const weapon = req.body.weaponType || "tactical rifle";
    const style = req.body.combatStyle || "close quarters combat";
    return `The figure is armed with a ${weapon} and specializes in ${style}.`;
  },
  "Trash Can Kids": (req) => {
    const item = req.body.favoriteItem || "soggy sandwich";
    const activity = req.body.favoriteActivity || "dumpster diving";
    return `They love their ${item} and spend most days ${activity}.`;
  }
};

app.post('/generate', upload.single('photo'), async (req, res) => {
  const character = req.body.character || '80s hero';

  try {
    const tone = await getAverageSkinTone(req.file.buffer);
    req.extractedTone = rgbToTone(tone);
  } catch (err) {
    console.warn("⚠️ Could not extract tone:", err.message);
    req.extractedTone = null;
  }

  const basePrompt = `Create a stylized portrait that resembles the uploaded photo.`;
  const themePrompt = {
    "Operation Bravo": "A classic 1980s military hero action figure on retro toy packaging with Kung Fu Grip.",
    "Grendals": "A creepy gremlin-style creature featured on a collectible trading card.",
    "Trash Can Kids": "A weird and disgusting cartoon child on a parody card with gross props."
  }[character] || "A retro character card in bold comic style.";

  const extras = customFields[character]?.(req) || "";
  const prompt = `${basePrompt} ${themePrompt} ${extras}`;

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1792",
    });

    const imageUrl = response.data[0]?.url;
    let backstory = "";

    if (character === "Grendals") {
      backstory = await generateBackstory(req.cardName, req.cardTrait, req.cardStyle);
    }

    res.json({
      imageUrl,
      cardName: req.cardName,
      grendalLevel: req.grendalLevel,
      backstory
    });
  } catch (err) {
    console.error("❌ OpenAI API Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
