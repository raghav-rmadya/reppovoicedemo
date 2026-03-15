# AI REPPO

Voice-first datanet creation demo backed by OpenAI.

## What changed

- Frontend talks to Vercel serverless functions
- OpenAI handles the conversational interview
- OpenAI speech generates spoken replies
- Datanet creation, publish input, and VeReppo vote actions are executed as off-chain demo state changes

## Files to deploy

Upload these frontend files to the repo root:

- `index.html`
- `styles.css`
- `script.js`
- `README.md`
- `vercel.json`

Upload this folder to the repo root too:

- `api/`

## Required environment variable

In Vercel, add:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Endpoints

- `api/reppo-turn.js`: conversational turn handler
- `api/reppo-speech.js`: text-to-speech proxy

## Notes

- Voice input still uses the browser microphone API for capture
- Spoken output comes from OpenAI first, with browser speech as fallback
- If the site replies with an API key error, add `OPENAI_API_KEY` in Vercel and redeploy
