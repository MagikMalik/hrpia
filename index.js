const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const { Configuration, OpenAIApi } = require('openai');
const path = require('path');

dotenv.config();

// Firebase setup
if (process.env.FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

const db = admin.database();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/matches', async (req, res) => {
  const date = req.query.date || new Date().toISOString().substring(0, 10);
  try {
    const oddsApiKey = process.env.ODDS_API_KEY;
    const response = await axios.get(`https://api.the-odds-api.com/v4/sports/soccer_epl/odds`, {
      params: {
        apiKey: oddsApiKey,
        regions: 'eu',
        markets: 'h2h,over_under,correct_score,both_teams_to_score',
        bookmakers: 'betclic,winamax',
        dateFormat: 'iso',
        oddsFormat: 'decimal',
      },
    });
    // Filter by date
    const matches = response.data.filter(match => match.commence_time.startsWith(date));
    res.json(matches);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

app.get('/api/predictions', async (req, res) => {
  const date = req.query.date || new Date().toISOString().substring(0, 10);
  try {
    const snapshot = await db.ref('predictions/' + date).once('value');
    res.json(snapshot.val() || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to load predictions' });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { matchId, homeTeam, awayTeam, date } = req.body;
  try {
    const prompt = `Provide detailed football match predictions for ${homeTeam} vs ${awayTeam}. Include 1x2, both teams to score, exact score, and over/under 2.5 with confidence levels. 200 characters summary.`;
    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    const result = completion.data.choices[0].message.content;
    await db.ref(`predictions/${date}/${matchId}`).set({
      homeTeam,
      awayTeam,
      analysis: result,
    });
    res.json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
