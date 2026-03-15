const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `
You are AI REPPO, a concise voice-first operator for creating datanets.

Core definition:
"A datanet is a tokenized RL environment where the task is defined by the datanet owner, the inputs come from data publishers, and the verifiers are VeReppo voters."

Your job:
- Hold a natural spoken conversation.
- Answer side questions naturally, including "what's your name?".
- Resume the datanet interview after side questions.
- Collect these fields when creating a datanet:
  1. whether the user already knows what a datanet is
  2. what the datanet is for (market)
  3. what they want to name it
  4. how much publishers should pay to publish into it
  5. what task the datanet owner wants the datanet to optimize for
- Do not mistake side questions for datanet values.
- Keep replies short, direct, and natural for spoken playback.
- Once the required fields are present, you may suggest creation or create it if the user clearly wants it.
- After creation, you may create sample events like publisher submissions or VeReppo votes.

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
      title: "Define the concept",
      body: "Confirm whether the user wants a quick definition of what a datanet is.",
      status: "active",
    },
    {
      title: "Gather core setup",
      body: "Capture the market, datanet name, publishing fee, and owner-defined task.",
      status: "pending",
    },
    {
      title: "Create the datanet",
      body: "Instantiate the off-chain datanet and open it to publishers and VeReppo voters.",
      status: "pending",
    },
    {
      title: "Drive activity",
      body: "Publish sample inputs and register verifier votes.",
      status: "pending",
    },
  ];

  if (state.knowsDatanet !== null) {
    steps[0].status = "done";
    steps[0].body = state.knowsDatanet
      ? "User already knows the datanet concept."
      : "AI REPPO explained the datanet concept.";
    steps[1].status = "active";
  }

  if (state.market || state.name || state.publishingFee || state.ownerTask) {
    steps[1].status = "active";
    const captured = [
      state.market ? "market" : null,
      state.name ? "name" : null,
      state.publishingFee ? "publish fee" : null,
      state.ownerTask ? "task" : null,
    ].filter(Boolean);
    if (captured.length) {
      steps[1].body = `Captured: ${captured.join(", ")}.`;
    }
  }

  if (state.market && state.name && state.publishingFee && state.ownerTask) {
    steps[1].status = "done";
    steps[2].status = state.datanetCreated ? "done" : "active";
    steps[2].body = state.datanetCreated
      ? `${state.name} is live in demo mode.`
      : "Everything is ready. AI REPPO can create the datanet now.";
  }

  if (state.datanetCreated) {
    steps[3].status = "active";
    steps[3].body = `${state.publishes || 0} publisher entries and ${state.votes || 0} VeReppo votes recorded.`;
  }

  return steps;
}

function buildNextQuestion(state, fallback) {
  if (fallback) {
    return fallback;
  }
  if (state.knowsDatanet === null) {
    return "Do you already know what a datanet is?";
  }
  if (!state.market) {
    return "What is this datanet for?";
  }
  if (!state.name) {
    return "What do you want to name the datanet?";
  }
  if (!state.publishingFee) {
    return "How much should publishers pay to contribute data?";
  }
  if (!state.ownerTask) {
    return "What task should this datanet optimize for?";
  }
  if (!state.datanetCreated) {
    return "Should I create the datanet now?";
  }
  return "Do you want a sample publish or a VeReppo vote?";
}

function executeActions(state, actions = []) {
  const next = mergeState(state);

  for (const action of actions) {
    if (!action || !action.type) {
      continue;
    }

    if (action.type === "create_datanet" && !next.datanetCreated) {
      next.datanetCreated = true;
      next.emissions = next.emissions || "Suggested: 500 REPP / epoch";
      next.datasetPlan =
        next.datasetPlan || `Search for publisher inputs relevant to ${String(next.market || "the market").toLowerCase()}.`;
      next.rlPlan =
        next.rlPlan ||
        `If supply is thin, spin up a tokenized RL environment around the task "${next.ownerTask || "owner-defined task"}".`;
      next.activity.unshift({
        title: "Datanet created",
        body: `${next.name} is live. Publishers can contribute inputs, and VeReppo voters can verify them.`,
      });
    }

    if (action.type === "publish_input" && next.datanetCreated) {
      next.publishes = (next.publishes || 0) + 1;
      next.activity.unshift({
        title: `Publisher input #${next.publishes}`,
        body: `A publisher submitted a ${String(next.market || "market").toLowerCase()} input and paid ${next.publishingFee || "the publish fee"}.`,
      });
    }

    if (action.type === "record_vote" && next.datanetCreated) {
      next.votes = (next.votes || 0) + 1;
      next.activity.unshift({
        title: `VeReppo vote #${next.votes}`,
        body: `A VeReppo voter verified the latest publisher input for ${next.name}.`,
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
        content: `Current datanet state:\n${JSON.stringify(currentState, null, 2)}`,
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
              knowsDatanet: { type: ["boolean", "null"] },
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
              "knowsDatanet",
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
                  enum: ["none", "create_datanet", "publish_input", "record_vote"]
                }
              },
              required: ["type"]
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
