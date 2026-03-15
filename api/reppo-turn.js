const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `
You are AI REPPO, a concise, confident, voice-first operator for the Reppo ecosystem.

Core behavior:
- Keep replies very short, natural, and strong for spoken playback.
- Most replies should be one short sentence or two very short sentences.
- The experience should feel like a premium launch assistant, not a dashboard.
- Do not overexplain unless asked.
- If the user asks side questions, answer briefly, then return to the launch flow.

Product framing:
- Start from the user's market or dataset request.
- You can say you scan reppo.exchange and the broader market in demo mode.
- If the market looks open or underserved, confidently move into creating a new datanet.
- A datanet is a tokenized RL environment where the owner defines the task and data publishers provide inputs.
- If asked about publishing or voting, say those capabilities are coming soon.
- If asked about agents, say an agent-specific flow is coming soon.
- Right now, AI REPPO is best at helping spin up new onchain data businesses.

Desired flow:
1. Understand the market or dataset opportunity.
2. Briefly say what you found.
3. Move to a clean step-by-step launch flow.
4. Ask for:
   - approval of the 20k REPPO spin-up fee
   - publishing fee amount and token
   - emissions seed amount and token
5. Once those are known, say the datanet creation flow is ready.
6. Keep every turn crisp enough to sound premium over voice.
7. Prefer concise operator-style phrasing like:
   - "Market looks open. I'm moving into launch mode."
   - "Approved. Now set the publishing fee."
   - "Good. Now seed emissions."
   - "Locked. Your datanet is packaged."

Return strictly valid JSON matching the schema.
`;

const STAGE_ORDER = [
  "idle",
  "search_result",
  "approve_spinup",
  "publishing_fee",
  "emissions",
  "review",
  "success",
];

function normalizeState(current = {}, patch = {}) {
  const next = {
    stage: current.stage || "idle",
    market: current.market || "",
    datasetSummary: current.datasetSummary || "",
    name: current.name || "",
    spinupFee: current.spinupFee || "20k REPPO",
    publishingFeeAmount: current.publishingFeeAmount || "",
    publishingFeeToken: current.publishingFeeToken || "",
    emissionsAmount: current.emissionsAmount || "",
    emissionsToken: current.emissionsToken || "",
    transactionStatus: current.transactionStatus || "",
    currentQuestion: current.currentQuestion || "What market or dataset opportunity do you want to work on?",
  };

  for (const [key, value] of Object.entries(patch)) {
    next[key] = typeof value === "string" ? value : next[key];
  }

  return next;
}

function buildNameFromMarket(market) {
  if (!market) {
    return "";
  }
  return market
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function computeStage(state) {
  if (state.transactionStatus === "ready") {
    return "success";
  }
  if (state.publishingFeeAmount && state.publishingFeeToken && state.emissionsAmount && state.emissionsToken) {
    return "review";
  }
  if (state.publishingFeeAmount && state.publishingFeeToken) {
    return "emissions";
  }
  if (state.transactionStatus === "approved") {
    return "publishing_fee";
  }
  if (state.datasetSummary) {
    return "approve_spinup";
  }
  if (state.market) {
    return "search_result";
  }
  return "idle";
}

function buildQuestion(state) {
  switch (state.stage) {
    case "search_result":
      return "This looks open. Want me to spin up a new datanet?";
    case "approve_spinup":
      return `Please approve ${state.spinupFee}.`;
    case "publishing_fee":
      return "What publishing fee do you want to set, and in which token?";
    case "emissions":
      return "How much emissions do you want to seed, and in which token?";
    case "review":
      return "I have the config. Say create when you want me to package it.";
    case "success":
      return "Your datanet flow is ready for the next onchain step.";
    default:
      return "What market or dataset opportunity do you want to work on?";
  }
}

function buildMeta(state) {
  switch (state.stage) {
    case "search_result":
      return ["Opportunity found", "Entering launch mode"];
    case "approve_spinup":
      return [state.market || "Market set", state.spinupFee];
    case "publishing_fee":
      return [state.name || "Datanet named", "Fee config"];
    case "emissions":
      return ["Launch economics", "Seed incentives"];
    case "review":
      return ["Config complete", "Ready to create"];
    case "success":
      return ["Launch package prepared", "Onchain handoff next"];
    default:
      return ["Voice first", "Datanets live", "Agents soon"];
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({
      error: "Missing OPENAI_API_KEY",
      message: "Add OPENAI_API_KEY in Vercel project environment variables.",
    });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const userText = body?.userText || "";
    const currentState = normalizeState(body?.state || {});
    const conversation = Array.isArray(body?.conversation) ? body.conversation.slice(-8) : [];

    const schema = {
      name: "reppo_turn",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          assistant_message: { type: "string" },
          state_patch: {
            type: "object",
            additionalProperties: false,
            properties: {
              market: { type: "string" },
              datasetSummary: { type: "string" },
              name: { type: "string" },
              spinupFee: { type: "string" },
              publishingFeeAmount: { type: "string" },
              publishingFeeToken: { type: "string" },
              emissionsAmount: { type: "string" },
              emissionsToken: { type: "string" },
              transactionStatus: { type: "string" }
            },
            required: [
              "market",
              "datasetSummary",
              "name",
              "spinupFee",
              "publishingFeeAmount",
              "publishingFeeToken",
              "emissionsAmount",
              "emissionsToken",
              "transactionStatus"
            ]
          }
        },
        required: ["assistant_message", "state_patch"]
      }
    };

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `Current state:\n${JSON.stringify(currentState, null, 2)}`,
      },
      ...conversation.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: String(message.content || ""),
      })),
      { role: "user", content: userText },
    ];

    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages,
        response_format: {
          type: "json_schema",
          json_schema: schema,
        },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      res.status(500).json({ error: "OpenAI request failed", details: errorText });
      return;
    }

    const completion = await openaiResponse.json();
    const content = completion?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    const nextState = normalizeState(currentState, parsed.state_patch);

    if (!nextState.spinupFee) {
      nextState.spinupFee = "20k REPPO";
    }

    if (!nextState.name && nextState.market) {
      nextState.name = `${buildNameFromMarket(nextState.market)}Net`;
    }

    nextState.stage = computeStage(nextState);
    nextState.currentQuestion = buildQuestion(nextState);

    if (!STAGE_ORDER.includes(nextState.stage)) {
      nextState.stage = "idle";
      nextState.currentQuestion = buildQuestion(nextState);
    }

    res.status(200).json({
      assistantMessage: parsed.assistant_message,
      state: nextState,
      meta: buildMeta(nextState),
    });
  } catch (error) {
    res.status(500).json({
      error: "Unhandled server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
