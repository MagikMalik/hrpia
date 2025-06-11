const express = require('express');
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
    const snap = await db.ref('matches/' + date).once('value');
    let matches = snap.val();

    if (!matches) {
      const prompt = `Nous sommes le ${date}. Liste uniquement les matchs de football professionnels de la journée avec les cotes 1X2 provenant de Winamax ou Betclic. Retourne un tableau JSON avec les champs id, homeTeam, awayTeam, bookmaker et odds (1,X,2). N'inclus pas de texte hors JSON.`;
      const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      const text = completion.data.choices[0].message.content.trim();
      matches = JSON.parse(text);
      await db.ref('matches/' + date).set(matches);
    }

    res.json(matches);
  } catch (error) {
    console.error(error);
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
    const prompt = `Analyse de manière professionnelle la rencontre de football ${homeTeam} contre ${awayTeam} du ${date}. Donne les pronostics 1X2, les deux équipes marquent, le score exact et le plus ou moins 2.5 buts avec un pourcentage de confiance pour chaque item. Termine par un bref commentaire de moins de 200 caractères.`;
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
