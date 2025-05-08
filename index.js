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

// 🔧 Logging + Generation Route
app.post('/generate', upload.single('photo'), async (req, res) => {
  const character = req.body.character || '80s action hero';

  const prompt = `Create a cartoon-style portrait of a person transformed into a ${character} from the 1980s. Use a bold, nostalgic design like an action figure packaging with neon lighting.`;

  console.log(`🟢 Request received for character: ${character}`);

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    console.log("✅ OpenAI image response received");

    const imageUrl = response.data[0].url;
    res.json({ imageUrl });
  } catch (err) {
    console.error("❌ OpenAI API Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
