# AI REPPO Demo

Off-chain investor demo for a voice-first datanet creation experience.

## What this does

- Uses a wake phrase: `Hey Reppo`
- Creates datanet economics from voice or typed prompts
- Simulates dataset discovery for the requested market
- Falls back to an RL environment proposal when live data is missing or fragmented
- Produces an off-chain execution summary suitable for investor presentations

## Local preview

```bash
cd /Users/raghavrmadya/Documents/Playground/demo
python3 -m http.server 4173
```

Then open `http://localhost:4173` in Chrome.

## Fast Vercel deployment

This is a static site, so Vercel deployment is simple:

1. Put the contents of this `demo` folder in a GitHub repo.
2. Import that repo into Vercel.
3. Accept the default static deployment settings.
4. Add your custom domain or subdomain in Vercel.
5. Point the DNS record from GoDaddy to Vercel.

## Recommended pitch flow

1. Click `Investor walkthrough` to establish the core story.
2. Run a live prompt with `Hey Reppo`.
3. Show the dataset search panel.
4. Show the RL environment fallback as the “market bootstrap” wedge.
5. Finish on `Simulate creation`.
