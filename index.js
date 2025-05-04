const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/generate', upload.single('photo'), async (req, res) => {
  const character = req.body.character || '80s action hero';
  const prompt = `Create a cartoon-style portrait of a person transformed into a ${character} from the 1980s. Use a bold, nostalgic design like an action figure packaging with neon lighting.`;

  try {
    const response = await openai.createImage({
      prompt,
      n: 1,
      size: '1024x1024'
    });

    const imageUrl = response.data.data[0].url;
    res.json({ imageUrl });
  } catch (err) {
    console.error('Error generating image:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
