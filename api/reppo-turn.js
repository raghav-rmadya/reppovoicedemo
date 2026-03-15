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
- Do not move into datanet creation unless the user explicitly asks to create, spin up, or launch a datanet.
- If the market looks open or underserved before the user asks to create, explain what you found and ask whether they want to create a datanet.
- A datanet is a tokenized RL environment where the owner defines the task and data publishers provide inputs.
- Reppo is the network for AI training data, powered by prediction markets.
- Reppo coordinates publishers, voters, datanet owners, and solver nodes around the creation of high-quality AI training data.
- Reppo is solving the AI training data bottleneck: scarcity of high-quality domain-specific data, weak incentive alignment, and opaque vendor-driven data supply.
- Publishers contribute raw or source data. Voters lock REPPO to get VeReppo and curate or validate data through economically aligned participation.
- Reppo datanets act like on-demand onchain businesses for AI models, agents, robotics, and other large-scale AI systems.
- If asked about publishing or voting, say those capabilities are not live through this flow yet and the user can use ReppoAgent on ACP or on X today.
- If asked about agents, say an agent-specific flow is coming soon.
- Right now, AI REPPO is best at helping spin up new onchain data businesses.
- In this demo, tell users that 50% of the spin-up fee is locked until the datanet is live and the other 50% is paid to the network.

Desired flow:
1. Understand the market or dataset opportunity.
2. Briefly say what you found.
3. Only if the user explicitly asks to create a datanet, move to a clean step-by-step launch flow.
4. Then ask for:
   - approval of the 20k REPPO spin-up fee
   - publishing fee amount and token
   - emissions allocation per epoch and token
   - whether to enable emissions contribution in exchange for fee share
5. Once those are known, ask the user to deploy the datanet.
6. After the user says deploy, present the datanet as deployed and ready for publishers and VeReppo voters.
7. Keep every turn crisp enough to sound premium over voice.
8. Prefer concise operator-style phrasing like:
   - "Market looks open. I'm moving into launch mode."
   - "Approved. Now set the publishing fee."
   - "Good. Now set emissions per epoch."
   - "Good. Now decide whether to enable emissions contribution for fee share."
   - "Locked. Say deploy datanet."
   - "Deployed. The market is open."
9. If the user says "approved" during launch mode, treat that as approving the demo spin-up fee and move to the next configuration step.
10. If the user asks "what dataset is most valuable to crowdsource right now" or similar, answer in one of two ways:
   - If you have concrete live research context in the conversation, give a researched answer with reasoning.
   - Otherwise, say this should be handled as a live research task across Reppo demand, broader AI market demand, and domain-specific scarcity signals, then give a short high-conviction directional answer with clear uncertainty.

Return strictly valid JSON matching the schema.
`;

const STAGE_ORDER = [
  "idle",
  "search_result",
  "launch_intro",
  "approve_spinup",
  "publishing_fee",
  "emissions",
  "contribution_share",
  "review",
  "deploy_pending",
  "success",
];

function normalizeState(current = {}, patch = {}) {
  const next = {
    stage: current.stage || "idle",
    mode: current.mode || "chat",
    market: current.market || "",
    datasetSummary: current.datasetSummary || "",
    reasoning: current.reasoning || "",
    name: current.name || "",
    spinupFee: current.spinupFee || "20k REPPO",
    publishingFeeAmount: current.publishingFeeAmount || "",
    publishingFeeToken: current.publishingFeeToken || "",
    emissionsAmount: current.emissionsAmount || "",
    emissionsToken: current.emissionsToken || "",
    emissionsPerEpoch: current.emissionsPerEpoch || "",
    contributionShareEnabled: current.contributionShareEnabled || "",
    contributionShareRate: current.contributionShareRate || "",
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
  if (state.transactionStatus === "deploying") {
    return "deploy_pending";
  }
  if (state.mode !== "launch") {
    return state.market || state.datasetSummary ? "search_result" : "idle";
  }
  if (
    state.publishingFeeAmount &&
    state.publishingFeeToken &&
    state.emissionsPerEpoch &&
    state.emissionsToken &&
    state.contributionShareEnabled
  ) {
    return "review";
  }
  if (
    state.publishingFeeAmount &&
    state.publishingFeeToken &&
    state.emissionsPerEpoch &&
    state.emissionsToken
  ) {
    return "contribution_share";
  }
  if (state.publishingFeeAmount && state.publishingFeeToken) {
    return "emissions";
  }
  if (state.transactionStatus === "approved") {
    return "publishing_fee";
  }
  if (state.mode === "launch") {
    return "launch_intro";
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
      return "Want me to create a datanet from this market?";
    case "launch_intro":
      return `First step: approve ${state.spinupFee}.`;
    case "approve_spinup":
      return `Please approve ${state.spinupFee}.`;
    case "publishing_fee":
      return "What publishing fee do you want to set, and in which token?";
    case "emissions":
      return "How much emissions do you want to allocate per epoch, and in which token?";
    case "contribution_share":
      return "Do you want to enable emissions contribution in exchange for fee share?";
    case "review":
      return "I have the config. Say deploy datanet when you want me to launch it.";
    case "deploy_pending":
      return "Deploying the datanet now.";
    case "success":
      return "Deployed. The market is open for publishers and VeReppo voters.";
    default:
      return "What market or dataset opportunity do you want to work on?";
  }
}

function buildMeta(state) {
  switch (state.stage) {
    case "search_result":
      return ["Result ready", "Create datanet if you want"];
    case "launch_intro":
      return [state.market || "Market set", "Creating datanet"];
    case "approve_spinup":
      return [state.market || "Market set", state.spinupFee];
    case "publishing_fee":
      return [state.name || "Datanet named", "Fee config"];
    case "emissions":
      return ["Launch economics", "Seed incentives"];
    case "contribution_share":
      return ["Fee share", "Contribution incentives"];
    case "review":
      return ["Config complete", "Ready to deploy"];
    case "deploy_pending":
      return ["Deploying datanet", "Opening market"];
    case "success":
      return ["Datanet deployed", "Publishers and voters ready"];
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
              reasoning: { type: "string" },
              mode: { type: "string" },
              name: { type: "string" },
              spinupFee: { type: "string" },
              publishingFeeAmount: { type: "string" },
              publishingFeeToken: { type: "string" },
              emissionsAmount: { type: "string" },
              emissionsToken: { type: "string" },
              emissionsPerEpoch: { type: "string" },
              contributionShareEnabled: { type: "string" },
              contributionShareRate: { type: "string" },
              transactionStatus: { type: "string" }
            },
            required: [
              "market",
              "datasetSummary",
              "reasoning",
              "mode",
              "name",
              "spinupFee",
              "publishingFeeAmount",
              "publishingFeeToken",
              "emissionsAmount",
              "emissionsToken",
              "emissionsPerEpoch",
              "contributionShareEnabled",
              "contributionShareRate",
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
