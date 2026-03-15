const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `
You are AI REPPO, a concise voice-first operator for the Reppo ecosystem.

Core positioning:
- Lead with discovery first.
- Start by asking whether the user wants to search for an existing dataset or opportunity in the Reppo ecosystem.
- You can describe this as looking across reppo.exchange and broader web sources in demo mode.
- If you find a weak or missing market, enthusiastically offer to spin up a new datanet.
- A datanet is a tokenized RL environment where the task is defined by the datanet owner, the inputs come from data publishers, and the verifiers are VeReppo voters.
- If asked about publishing or voting, say those abilities are coming soon, and right now you are best at helping spin up new onchain data businesses.

Your conversational style:
- natural, sharp, enthusiastic, not robotic
- short answers for spoken playback
- answer side questions naturally, including "what's your name?"
- never dump jargon unless asked

Your tasks:
- help the user search for an existing opportunity
- summarize whether the opportunity seems served or underserved
- if underserved, gather:
  1. market
  2. datanet name
  3. publishing fee
  4. owner-defined task
- once these are known, prepare a launch-ready datanet

Return strictly valid JSON matching the schema.
`;

function mergeState(current, patch = {}) {
  return {
    ...current,
    ...patch,
    activity: Array.isArray(current.activity) ? [...current.activity] : [],
  };
}

function buildSteps(state) {
  const steps = [
    {
      title: "Scan the market",
      body: "Check Reppo and broader web sources for an existing dataset or business opportunity.",
      status: "active",
    },
    {
      title: "Decide the path",
      body: "If supply is weak, offer to launch a new datanet.",
      status: "pending",
    },
    {
      title: "Shape the business",
      body: "Capture the task, name, publish fee, and launch plan.",
      status: "pending",
    },
    {
      title: "Prepare launch",
      body: "Set up the off-chain datanet demo and the onchain business story.",
      status: "pending",
    },
  ];

  if (state.searchSummary) {
    steps[0].status = "done";
    steps[1].status = "active";
    steps[1].body = state.searchSummary;
  }

  if (state.market || state.name || state.publishingFee || state.ownerTask) {
    steps[2].status = "active";
    const captured = [
      state.market ? "market" : null,
      state.name ? "name" : null,
      state.publishingFee ? "publish fee" : null,
      state.ownerTask ? "task" : null,
    ].filter(Boolean);
    if (captured.length) {
      steps[2].body = `Captured: ${captured.join(", ")}.`;
    }
  }

  if (state.market && state.name && state.publishingFee && state.ownerTask) {
    steps[2].status = "done";
    steps[3].status = "active";
    steps[3].body = state.datanetCreated
      ? `${state.name} is prepared as a launch-ready onchain data business.`
      : "Everything is ready. AI REPPO can spin up the new data business now.";
  }

  return steps;
}

function buildNextQuestion(state, fallback) {
  if (fallback) {
    return fallback;
  }
  if (!state.searchIntent) {
    return "Want me to look for an existing dataset opportunity first?";
  }
  if (!state.searchSummary) {
    return "What market should I scan?";
  }
  if (!state.market) {
    return "What market should this new datanet serve?";
  }
  if (!state.name) {
    return "What do you want to name it?";
  }
  if (!state.publishingFee) {
    return "How much should publishers pay to contribute data?";
  }
  if (!state.ownerTask) {
    return "What task should this datanet optimize for?";
  }
  return "I have enough. Want me to prepare the new data business?";
}

function executeActions(state, actions = []) {
  const next = mergeState(state);

  for (const action of actions) {
    if (!action || !action.type || action.type === "none") {
      continue;
    }

    if (action.type === "search_sources") {
      next.searchIntent = next.searchIntent || "Discovery first";
      next.searchSources = ["reppo.exchange", "broader web"];
      next.searchSummary =
        action.summary ||
        `In demo mode, AI REPPO scanned reppo.exchange and broader web sources for ${String(next.market || "the requested market").toLowerCase()}.`;
      next.activity.unshift({
        title: "Opportunity scan",
        body: next.searchSummary,
      });
    }

    if (action.type === "create_datanet" && !next.datanetCreated) {
      next.datanetCreated = true;
      next.activity.unshift({
        title: "Launch plan prepared",
        body: `${next.name} is positioned as the next onchain data business to spin up.`,
      });
    }
  }

  next.steps = buildSteps(next);
  next.currentQuestion = buildNextQuestion(next);
  return next;
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
    const currentState = body?.state || {};
    const conversation = Array.isArray(body?.conversation) ? body.conversation.slice(-8) : [];

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
      {
        role: "user",
        content: userText,
      },
    ];

    const schema = {
      name: "reppo_turn",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          assistant_message: { type: "string" },
          next_question: { type: "string" },
          state_patch: {
            type: "object",
            additionalProperties: false,
            properties: {
              searchIntent: { type: "string" },
              searchSummary: { type: "string" },
              market: { type: "string" },
              name: { type: "string" },
              publishingFee: { type: "string" },
              ownerTask: { type: "string" },
              emissions: { type: "string" },
              rewards: { type: "string" },
              datasetPlan: { type: "string" },
              rlPlan: { type: "string" }
            },
            required: [
              "searchIntent",
              "searchSummary",
              "market",
              "name",
              "publishingFee",
              "ownerTask",
              "emissions",
              "rewards",
              "datasetPlan",
              "rlPlan"
            ]
          },
          actions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: {
                  type: "string",
                  enum: ["none", "search_sources", "create_datanet"]
                },
                summary: { type: "string" }
              },
              required: ["type", "summary"]
            }
          }
        },
        required: ["assistant_message", "next_question", "state_patch", "actions"]
      }
    };

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

    const patchedState = {
      ...currentState,
      ...parsed.state_patch,
    };
    const nextState = executeActions(patchedState, parsed.actions);
    nextState.currentQuestion = buildNextQuestion(nextState, parsed.next_question);

    res.status(200).json({
      assistantMessage: parsed.assistant_message,
      nextQuestion: nextState.currentQuestion,
      state: nextState,
      actions: parsed.actions,
    });
  } catch (error) {
    res.status(500).json({
      error: "Unhandled server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
