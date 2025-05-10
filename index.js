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
  const canvas = require('canvas');
  const { createCanvas, loadImage, registerFont } = canvas;

  // Load image from URL
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const baseImage = await loadImage(imageBuffer);

  // Set canvas size to match image
  const width = baseImage.width;
  const height = baseImage.height;
  const finalCanvas = createCanvas(width, height + 220); // extra space for text
  const ctx = finalCanvas.getContext("2d");

  // Draw the original image
  ctx.drawImage(baseImage, 0, 0);

  // Draw overlay (background box)
  ctx.fillStyle = "black";
  ctx.fillRect(0, height, width, 220);

  // Add text styling
  ctx.fillStyle = "red";
  ctx.font = "bold 36px Arial";
  ctx.fillText(req.cardName || "UNKNOWN", width / 2 - 150, height + 50);

  ctx.fillStyle = "yellow";
  ctx.font = "bold 24px Arial";
  ctx.fillText(`Grendal Level: ${req.grendalLevel || 0}`, width / 2 - 150, height + 90);

  ctx.fillStyle = "white";
  ctx.font = "italic 18px Arial";
  ctx.fillText(req.backstory || "No story provided.", width / 2 - 150, height + 130);

  // Save image
  const outputPath = path.join(__dirname, "cards", `grendal-${Date.now()}.png`);
  const out = fs.createWriteStream(outputPath);
  const stream = finalCanvas.createPNGStream();
  stream.pipe(out);

  await new Promise((resolve) => out.on("finish", resolve));
  return res.json({ imageUrl: `/cards/${path.basename(outputPath)}` });
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
