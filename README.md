# HRPIA

Prototype web app for football match predictions.

## Setup

1. Copy `.env.example` to `.env` and fill in your OpenAI and Firebase keys.
2. Install dependencies with `npm install`.
3. Start the server: `node index.js`.
4. Visit `http://localhost:3000` in your browser.

The app uses OpenAI to search for today's Betclic and Winamax matches with their odds, caches the data in Firebase and lets the AI generate detailed predictions on demand.
