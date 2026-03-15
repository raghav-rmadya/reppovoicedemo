const voiceToggle = document.getElementById("voice-toggle");
const voiceStatus = document.getElementById("voice-status");
const voiceName = document.getElementById("voice-name");
const currentQuestionEl = document.getElementById("current-question");
const textForm = document.getElementById("text-form");
const textInput = document.getElementById("text-input");
const responseText = document.getElementById("response-text");
const stepList = document.getElementById("step-list");
const specGrid = document.getElementById("spec-grid");
const datanetState = document.getElementById("datanet-state");
const createDatanetButton = document.getElementById("create-datanet");
const publishEntryButton = document.getElementById("publish-entry");
const castVoteButton = document.getElementById("cast-vote");
const workbench = document.getElementById("workbench");

const initialState = {
  searchIntent: "",
  searchSummary: "",
  searchSources: [],
  market: "",
  name: "",
  publishingFee: "",
  ownerTask: "",
  emissions: "",
  rewards: "70% publishers / 20% VeReppo voters / 10% reserve",
  datasetPlan: "",
  rlPlan: "",
  datanetCreated: false,
  publishes: 0,
  votes: 0,
  activity: [],
  currentQuestion: "Want me to look for an existing dataset opportunity first?",
  steps: [
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
  ],
};

let state = JSON.parse(JSON.stringify(initialState));
let conversation = [];
let recognition;
let listening = false;

function showWorkbench() {
  workbench.classList.remove("hidden");
}

function renderSteps() {
  stepList.innerHTML = "";
  state.steps.forEach((step) => {
    const row = document.createElement("article");
    row.className = `step ${step.status}`;

    const dot = document.createElement("span");
    dot.className = "step-dot";

    const copy = document.createElement("div");
    const title = document.createElement("p");
    title.className = "step-title";
    title.textContent = step.title;

    const body = document.createElement("p");
    body.className = "step-body";
    body.textContent = step.body;

    copy.append(title, body);
    row.append(dot, copy);
    stepList.append(row);
  });
}

function renderSpec() {
  const specs = [
    ["Search intent", state.searchIntent || "Not set"],
    ["Market", state.market || "Not defined yet"],
    ["Datanet", state.name || "Not named yet"],
    ["Owner task", state.ownerTask || "Not defined yet"],
    ["Publishing fee", state.publishingFee || "Not set"],
    ["Dataset scan", state.searchSummary || "No scan yet"],
    ["Launch note", "Publishing and voting are coming soon"],
    ["Best use today", "Spin up new onchain data businesses"],
  ];

  specGrid.innerHTML = "";
  specs.forEach(([key, value]) => {
    const card = document.createElement("article");
    card.className = "spec-card";

    const label = document.createElement("span");
    label.className = "spec-key";
    label.textContent = key;

    const text = document.createElement("p");
    text.className = "spec-value";
    text.textContent = value;

    card.append(label, text);
    specGrid.append(card);
  });
}

function renderDatanetState() {
  datanetState.innerHTML = "";

  const card = document.createElement("article");
  card.className = "datanet-card";

  const title = document.createElement("h3");
  title.className = "datanet-title";
  title.textContent = state.datanetCreated ? state.name : "Opportunity status";

  const body = document.createElement("p");
  body.className = "step-body";
  body.textContent = state.datanetCreated
    ? `${state.name} is prepared as the next onchain data business to spin up.`
    : state.searchSummary || "AI REPPO is ready to scan Reppo and broader web sources for a data opportunity.";

  const meta = document.createElement("div");
  meta.className = "datanet-meta";
  meta.innerHTML = `
    <span class="mini-pill ${state.datanetCreated ? "good" : ""}">${state.datanetCreated ? "Launch ready" : "Discovery"}</span>
    <span class="mini-pill">${state.searchSources?.join(" / ") || "reppo.exchange / web"}</span>
    <span class="mini-pill gold">Publishing + voting soon</span>
  `;

  card.append(title, body, meta);
  datanetState.append(card);

  (state.activity || []).slice(0, 4).forEach((item) => {
    const feed = document.createElement("article");
    feed.className = "feed-card";

    const feedTitle = document.createElement("p");
    feedTitle.className = "step-title";
    feedTitle.textContent = item.title;

    const feedBody = document.createElement("p");
    feedBody.className = "step-body";
    feedBody.textContent = item.body;

    feed.append(feedTitle, feedBody);
    datanetState.append(feed);
  });

  createDatanetButton.disabled =
    !state.market || !state.name || !state.publishingFee || !state.ownerTask || state.datanetCreated;
  publishEntryButton.disabled = true;
  castVoteButton.disabled = true;
}

function renderResponse(text) {
  responseText.textContent = text;
}

function renderQuestion() {
  currentQuestionEl.textContent = state.currentQuestion || "What do you want to do next?";
}

function renderAll(response) {
  showWorkbench();
  renderResponse(response);
  renderQuestion();
  renderSteps();
  renderSpec();
  renderDatanetState();
}

function setVoiceStatus(text) {
  voiceStatus.textContent = text;
}

async function speak(text) {
  try {
    const response = await fetch("/api/reppo-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("speech endpoint unavailable");
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(audioUrl);
  } catch (_error) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 0.96;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }
}

async function sendTurn(userText) {
  showWorkbench();
  conversation.push({ role: "user", content: userText });

  const response = await fetch("/api/reppo-turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userText,
      state,
      conversation,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.message || data?.details || data?.error || "Something went wrong.";
    renderResponse(message);
    setVoiceStatus(message.includes("OPENAI_API_KEY") ? "Add OPENAI_API_KEY in Vercel." : "Request failed.");
    return;
  }

  state = data.state;
  conversation.push({ role: "assistant", content: data.assistantMessage });
  renderAll(data.assistantMessage);
  speak(data.assistantMessage);
}

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setVoiceStatus("Voice input is unavailable in this browser. Type your message below.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    listening = true;
    document.body.classList.add("listening");
    setVoiceStatus("Listening.");
  };

  recognition.onresult = async (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");

    if (event.results[event.results.length - 1].isFinal) {
      await sendTurn(text);
    } else {
      setVoiceStatus(`Hearing: "${text}"`);
    }
  };

  recognition.onerror = (event) => {
    setVoiceStatus(`Voice error: ${event.error}`);
  };

  recognition.onend = () => {
    listening = false;
    document.body.classList.remove("listening");
    setVoiceStatus("Idle. Click the orb to continue.");
  };
}

voiceToggle.addEventListener("click", () => {
  if (!recognition) {
    return;
  }

  if (listening) {
    recognition.stop();
    return;
  }

  recognition.start();
});

textForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = textInput.value.trim();
  if (!text) {
    return;
  }

  textInput.value = "";
  await sendTurn(text);
});

createDatanetButton.addEventListener("click", async () => {
  await sendTurn("Create the new datanet now.");
});

publishEntryButton.addEventListener("click", async () => {
  await sendTurn("Tell me when publishing is available.");
});

castVoteButton.addEventListener("click", async () => {
  await sendTurn("Tell me when voting is available.");
});

voiceName.textContent = "OpenAI TTS with browser fallback";
renderQuestion();
renderResponse("I’m ready to search for a data opportunity or help you spin up a new one.");
setupRecognition();
