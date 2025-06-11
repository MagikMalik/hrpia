# HRPIA

Prototype web app for football match predictions.

## Setup

1. Copy `.env.example` to `.env` and fill in your API keys (OpenAI, odds API, Firebase).
2. Install dependencies with `npm install`.
3. Start the server: `node index.js`.
4. Visit `http://localhost:3000` in your browser.

The app will fetch today's matches from The Odds API for Betclic and Winamax, cache predictions in Firebase, and allow AI analysis using OpenAI.
