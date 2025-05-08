const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Handle image uploads (in memory)
const upload = multer({ storage: multer.memoryStorage() });

// OpenAI setup (v4)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Image generation route with prompt customization
app.post('/generate', upload.single('photo'), async (req, res) => {
  const character = req.body.character || '80s hero';

  const customFields = {
    "Operation Bravo": () => {
      const weapon = req.body.weaponType || "tactical rifle";
      const style = req.body.combatStyle || "close quarters combat";
      return `The figure is armed with a ${weapon} and specializes in ${style}.`;
    },
    "Grendals": () => {
      const trait = req.body.dominantTrait || "mischievous";
      const look = req.body.visualStyle || "slimy punk";
      return `The character has a ${trait} personality and is styled in a ${look} aesthetic.`;
    },
    "Trash Can Kids": () => {
      const item = req.body.favoriteItem || "soggy sandwich";
      const activity = req.body.favoriteActivity || "dumpster diving";
      return `They love their ${item} and spend most days ${activity}.`;
    },
  };

  const basePrompt = `Create a highly stylized illustrated action figure card featuring a character that resembles the uploaded photo.`;
  const themePrompt = {
    "Operation Bravo": "The figure is a classic 1980s military hero with 'Kung Fu Grip', dressed in a retro green combat uniform and ready for battle. Include plastic accessories, packaging artwork, and explosive comic-style graphics.",
    "Grendals": "A creepy, mutated gremlin-like figure styled in a trashy, rebellious look, like a villainous 80s toy. Set on a card with slime, chaos, and gross-out accessories.",
    "Trash Can Kids": "A satirical, weird cartoon child with an exaggerated personality flaw. Package design should resemble a parody trading card with warped humor and grungy toy box elements.",
  }[character] || "A retro-style collectible toy with dynamic card art.";

  const extras = (customFields[character]?.() || "");

  const prompt = `${basePrompt} ${themePrompt} ${extras}`;

  console.log("🟢 Final prompt:", prompt);

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    console.log("✅ Image URL:", response.data[0].url);
    res.json({ imageUrl: response.data[0].url });
  } catch (err) {
    console.error("❌ OpenAI Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Image generation failed" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
