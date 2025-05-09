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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Character-specific prompt customization
const customFields = {
  "Grendals": (req) => {
  const trait = req.body.dominantTrait || "slimy";
  const style = req.body.visualStyle || "toxic punk";

  return `Create a vertical 9:16 trading card image titled "Grendals Trading Card" featuring a grotesque, mischievous gremlin-like creature inspired by the uploaded photo. Use a consistent design layout:

- Portrait orientation, black background
- Green, mottled reptilian border
- Pink-on-black name banner at the top
- Red-on-black footer that reads "GRENDALS TRADING CARDS"
- Optional white badge with a number in one corner
- Character is centered and cropped at the torso
- High-contrast lighting and saturated cartoon color style

The Grendal should appear ${trait}, and its aesthetic should reflect a ${style} personality. Maintain exaggerated features and a chaotic or grotesquely humorous vibe, suitable for 1980s horror-comedy parody trading cards.`;
}


  "Operation Bravo": (req) => {
    const weapon = req.body.weaponType || "tactical rifle";
    const style = req.body.combatStyle || "close quarters combat";
    return `The figure is armed with a ${weapon} and specializes in ${style}.`;
  },

  "Trash Can Kids": (req) => {
    const item = req.body.favoriteItem || "soggy sandwich";
    const activity = req.body.favoriteActivity || "dumpster diving";
    return `They love their ${item} and spend most days ${activity}. The design should parody collectible kids' cards from the 80s, with gross-out humor and warped personality traits.`;
  }
};

app.post('/generate', upload.single('photo'), async (req, res) => {
  const character = req.body.character || '80s hero';

  const basePrompt = `Create a highly stylized illustrated action figure card or parody trading card featuring a character that resembles the uploaded photo.`;

  const themePrompt = {
    "Operation Bravo": "The figure is a classic 1980s military hero with 'Kung Fu Grip', dressed in a retro green combat uniform and ready for battle. Include plastic accessories, packaging artwork, and explosive comic-style graphics.",
    "Grendals": "A creepy, mutated gremlin-like creature featured on a collectible trading card. The layout should be consistent with horror-comedy cards of the 1980s.",
    "Trash Can Kids": "A satirical, weird cartoon child with an exaggerated personality flaw. Package design should resemble a parody trading card with warped humor and grungy toy box elements.",
  }[character] || "A retro-style collectible toy with dynamic card art.";

  const extras = (customFields[character]?.(req) || "");
  const prompt = `${basePrompt} ${themePrompt} ${extras}`;

  console.log("🟢 Final prompt:", prompt);

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = response.data[0]?.url;
    console.log("✅ Image URL:", imageUrl);
    res.json({ imageUrl });
  } catch (err) {
    console.error("❌ OpenAI API Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
