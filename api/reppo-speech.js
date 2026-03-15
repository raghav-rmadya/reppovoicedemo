const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const input = String(body?.text || "").trim();

    if (!input) {
      res.status(400).json({ error: "Missing text" });
      return;
    }

    const response = await fetch(OPENAI_SPEECH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        voice: "nova",
        input,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(500).json({ error: "OpenAI speech request failed", details: errorText });
      return;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(audioBuffer);
  } catch (error) {
    res.status(500).json({
      error: "Unhandled speech error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
