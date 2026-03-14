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

const datanetDefinition =
  "A datanet is a tokenized RL environment where the task is defined by the datanet owner, the inputs come from data publishers, and the verifiers are VeReppo voters.";

const initialState = {
  wakePhraseDetected: false,
  knowsDatanet: null,
  name: "",
  market: "",
  publishingFee: "",
  emissions: "",
  rewards: "70% publishers / 20% VeReppo voters / 10% reserve",
  datasetPlan: "",
  rlPlan: "",
  ownerTask: "",
  response:
    "I’m ready. I’ll ask a few questions and create the datanet live.",
  currentQuestion: "Do you already know what a datanet is?",
  steps: [
    {
      title: "Define the concept",
      body: "Confirm whether you want a quick explanation of what a datanet is.",
      status: "active"
    },
    {
      title: "Gather core setup",
      body: "Capture the market, datanet name, publishing fee, and owner-defined task.",
      status: "pending"
    },
    {
      title: "Create the datanet",
      body: "Instantiate the off-chain datanet and open it to publishers and VeReppo voters.",
      status: "pending"
    },
    {
      title: "Drive activity",
      body: "Publish sample inputs and register verifier votes.",
      status: "pending"
    }
  ],
  datanetCreated: false,
  publishes: 0,
  votes: 0,
  activity: [],
  pendingField: "knowsDatanet"
};

const state = JSON.parse(JSON.stringify(initialState));

let voices = [];
let preferredVoice = null;
let recognition;
let listening = false;

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
    ["Market", state.market || "Not defined yet"],
    ["Datanet", state.name || "Not named yet"],
    ["Owner task", state.ownerTask || "Not defined yet"],
    ["Publishing fee", state.publishingFee || "Not set"],
    ["Emissions", state.emissions || "Suggested: 500 REPP / epoch"],
    ["VeReppo rewards", state.rewards],
    ["Dataset plan", state.datasetPlan || "Pending after creation"],
    ["RL path", state.rlPlan || "Standby until needed"]
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
  title.textContent = state.datanetCreated ? state.name : "Draft datanet";

  const body = document.createElement("p");
  body.className = "step-body";
  body.textContent = state.datanetCreated
    ? `${state.name} is live for publishers and VeReppo voters in this off-chain demo.`
    : "Answer the interview questions and AI REPPO will create the datanet automatically.";

  const meta = document.createElement("div");
  meta.className = "datanet-meta";
  meta.innerHTML = `
    <span class="mini-pill ${state.datanetCreated ? "good" : ""}">${state.datanetCreated ? "Live" : "Interviewing"}</span>
    <span class="mini-pill">${state.publishes} publishes</span>
    <span class="mini-pill gold">${state.votes} votes</span>
  `;

  card.append(title, body, meta);
  datanetState.append(card);

  state.activity.slice(0, 4).forEach((item) => {
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

  createDatanetButton.disabled = !isReadyToCreate() || state.datanetCreated;
  publishEntryButton.disabled = !state.datanetCreated;
  castVoteButton.disabled = !state.datanetCreated;
}

function setResponse(text) {
  state.response = text;
  responseText.textContent = text;
}

function setCurrentQuestion(text) {
  state.currentQuestion = text;
  currentQuestionEl.textContent = text;
}

function updateSteps() {
  const steps = JSON.parse(JSON.stringify(initialState.steps));

  if (state.knowsDatanet !== null) {
    steps[0].status = "done";
    steps[0].body = state.knowsDatanet
      ? "User already knows the datanet concept."
      : "AI REPPO explained the datanet concept.";
    steps[1].status = "active";
  }

  if (state.market || state.name || state.publishingFee || state.ownerTask) {
    steps[1].status = "active";
    const progress = [
      state.market ? "market" : null,
      state.name ? "name" : null,
      state.publishingFee ? "publish fee" : null,
      state.ownerTask ? "task" : null
    ].filter(Boolean);
    steps[1].body = progress.length
      ? `Captured: ${progress.join(", ")}.`
      : steps[1].body;
  }

  if (isReadyToCreate()) {
    steps[1].status = "done";
    steps[2].status = state.datanetCreated ? "done" : "active";
    steps[2].body = state.datanetCreated
      ? `${state.name} is live in demo mode.`
      : "Everything is ready. AI REPPO can create the datanet now.";
  }

  if (state.datanetCreated) {
    steps[3].status = "active";
    steps[3].body = `${state.publishes} publisher entries and ${state.votes} VeReppo votes recorded.`;
  }

  state.steps = steps;
}

function addActivity(title, body) {
  state.activity.unshift({ title, body });
}

function isYes(text) {
  return /\b(yes|yeah|yep|i do|i know|sure|correct)\b/i.test(text);
}

function isNo(text) {
  return /\b(no|nope|not really|i don't|dont know|do not know)\b/i.test(text);
}

function extractMarket(text) {
  const lower = text.toLowerCase();
  const direct = text.match(/(?:for|around)\s+([a-z0-9\s,&/-]+?)(?:\.|,| with| called| named| charging| and)/i);
  if (direct) {
    return direct[1].trim();
  }
  if (lower.includes("charging") || lower.includes("ev")) {
    return "EV charging uptime";
  }
  if (lower.includes("robot") || lower.includes("warehouse")) {
    return "Warehouse robotics";
  }
  if (lower.includes("sport")) {
    return "Sports prediction";
  }
  if (lower.includes("climate") || lower.includes("air quality")) {
    return "Climate intelligence";
  }
  return "";
}

function extractName(text) {
  const match = text.match(/(?:name it|call it|called|named)\s+([a-z0-9][a-z0-9\s-]{1,40})/i);
  return match ? match[1].trim() : "";
}

function extractPublishingFee(text) {
  const match = text.match(/(?:publishing fee|charge(?: publishers| contributors)? to publish|cost to publish)(?: to| of)?\s+([\d.]+\s*[a-z]+)/i);
  return match ? match[1].toUpperCase().replace(/\s+/, " ") : "";
}

function extractTask(text) {
  const match = text.match(/(?:task is|task should be|it should|i want it to|for)\s+([a-z0-9\s,&/-]{8,100})/i);
  return match ? match[1].trim() : "";
}

function suggestNameFromMarket(market) {
  if (!market) {
    return "";
  }
  return market
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("") + "Net";
}

function chooseNextQuestion() {
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
    return "How much do you want to charge data contributors to publish into this datanet?";
  }
  if (!state.ownerTask) {
    return "What task should this datanet optimize for?";
  }
  if (!state.datanetCreated) {
    return "I have enough. Should I create the datanet now?";
  }
  return "The datanet is live. Want me to publish a sample entry or record a VeReppo vote?";
}

function explainDatanet() {
  state.knowsDatanet = false;
  setResponse(`${datanetDefinition} What is this datanet for?`);
  setCurrentQuestion("What is this datanet for?");
  addActivity("Concept explained", "AI REPPO explained what a datanet is and moved into setup.");
}

function maybeAutofillFromFullPrompt(text) {
  const market = extractMarket(text);
  const name = extractName(text);
  const fee = extractPublishingFee(text);
  const task = extractTask(text);

  if (market && !state.market) {
    state.market = market;
  }
  if (name && !state.name) {
    state.name = name;
  }
  if (fee && !state.publishingFee) {
    state.publishingFee = fee;
  }
  if (task && !state.ownerTask) {
    state.ownerTask = task;
  }
  if (!state.name && state.market) {
    state.name = suggestNameFromMarket(state.market);
  }
}

function processInterview(rawText) {
  const hasWakePhrase = /hey\s+reppo/i.test(rawText);
  const text = rawText.replace(/hey\s+reppo[:,]?\s*/i, "").trim();
  const lower = text.toLowerCase();

  state.wakePhraseDetected = hasWakePhrase || state.wakePhraseDetected;
  maybeAutofillFromFullPrompt(text);

  if (state.knowsDatanet === null) {
    if (isNo(text) || lower.includes("what is a datanet")) {
      explainDatanet();
      updateSteps();
      renderSpec();
      renderDatanetState();
      renderSteps();
      return;
    }
    if (isYes(text)) {
      state.knowsDatanet = true;
      addActivity("Concept skipped", "User already knew what a datanet is.");
      setResponse("Got it. What is this datanet for?");
      setCurrentQuestion("What is this datanet for?");
      updateSteps();
      renderSpec();
      renderDatanetState();
      renderSteps();
      return;
    }
    if (lower.includes("create") || lower.includes("datanet")) {
      state.knowsDatanet = true;
      addActivity("Concept assumed", "AI REPPO inferred the user wants to move straight into creation.");
    }
  }

  if (!state.market) {
    state.market = extractMarket(text) || text;
    if (!state.name) {
      state.name = suggestNameFromMarket(state.market);
    }
    addActivity("Market defined", `Datanet scope set to ${state.market}.`);
    setResponse(`This datanet is for ${state.market}. What do you want to name it?`);
    setCurrentQuestion("What do you want to name the datanet?");
    updateSteps();
    renderSpec();
    renderDatanetState();
    renderSteps();
    return;
  }

  if (!state.name || state.name === suggestNameFromMarket(state.market)) {
    const explicitName = extractName(text);
    if (explicitName) {
      state.name = explicitName;
    } else if (!/what|how|yes|no/i.test(text)) {
      state.name = text;
    }
    addActivity("Name chosen", `Datanet named ${state.name}.`);
    setResponse(`${state.name} it is. How much should publishers pay to contribute data?`);
    setCurrentQuestion("How much do you want to charge data contributors to publish into this datanet?");
    updateSteps();
    renderSpec();
    renderDatanetState();
    renderSteps();
    return;
  }

  if (!state.publishingFee) {
    state.publishingFee = extractPublishingFee(text) || text.toUpperCase();
    addActivity("Publishing fee set", `Publish fee set to ${state.publishingFee}.`);
    setResponse(`Publishers will pay ${state.publishingFee}. What task should ${state.name} optimize for?`);
    setCurrentQuestion("What task should this datanet optimize for?");
    updateSteps();
    renderSpec();
    renderDatanetState();
    renderSteps();
    return;
  }

  if (!state.ownerTask) {
    state.ownerTask = extractTask(text) || text;
    state.datasetPlan = `Search for publisher inputs relevant to ${state.market.toLowerCase()}.`;
    state.rlPlan = `If supply is thin, spin up a tokenized RL environment around the task "${state.ownerTask}".`;
    addActivity("Task defined", `Owner task set to ${state.ownerTask}.`);
    setResponse(
      `I have the market, name, publish fee, and task. I’m creating ${state.name} now for publishers and VeReppo voters.`
    );
    setCurrentQuestion("I’m creating the datanet now.");
    autoCreateDatanet();
    return;
  }

  if (state.datanetCreated && /publish/i.test(lower)) {
    publishEntry();
    return;
  }

  if (state.datanetCreated && /vote|voter|verify/i.test(lower)) {
    castVote();
    return;
  }

  setResponse("I’m still here with the datanet live. Want me to publish sample data or record a VeReppo vote?");
  setCurrentQuestion("Publish sample data or record a VeReppo vote?");
  renderSteps();
}

function autoCreateDatanet() {
  state.datanetCreated = true;
  state.emissions = state.emissions || "Suggested: 500 REPP / epoch";
  addActivity(
    "Datanet created",
    `${state.name} is live. Publishers can now submit inputs, and VeReppo voters can verify them.`
  );
  updateSteps();
  renderSpec();
  renderDatanetState();
  renderSteps();
  setResponse(
    `${state.name} is live. Publishers can contribute inputs, and VeReppo voters can verify them. Want me to publish a sample contribution next?`
  );
  setCurrentQuestion("Want me to publish a sample contribution?");
  speak(state.response);
}

function createDatanet() {
  if (!isReadyToCreate() || state.datanetCreated) {
    return;
  }
  autoCreateDatanet();
}

function isReadyToCreate() {
  return Boolean(state.market && state.name && state.publishingFee && state.ownerTask);
}

function publishEntry() {
  if (!state.datanetCreated) {
    return;
  }

  state.publishes += 1;
  addActivity(
    `Publisher input #${state.publishes}`,
    `A publisher submitted a ${state.market.toLowerCase()} input and paid ${state.publishingFee}.`
  );
  updateSteps();
  renderDatanetState();
  renderSteps();
  setResponse(
    `Sample publisher input accepted. ${state.name} now has ${state.publishes} published input${state.publishes === 1 ? "" : "s"}. Want me to record a VeReppo vote too?`
  );
  setCurrentQuestion("Want me to record a VeReppo verifier vote too?");
  speak(state.response);
}

function castVote() {
  if (!state.datanetCreated) {
    return;
  }

  state.votes += 1;
  addActivity(
    `VeReppo vote #${state.votes}`,
    `A VeReppo voter verified the latest publisher input for ${state.name}.`
  );
  updateSteps();
  renderDatanetState();
  renderSteps();
  setResponse(
    `VeReppo vote recorded. ${state.name} now has ${state.votes} verifier vote${state.votes === 1 ? "" : "s"} shaping data quality.`
  );
  setCurrentQuestion("The datanet is live. Want another publish or another vote?");
  speak(state.response);
}

function setVoiceStatus(text) {
  voiceStatus.textContent = text;
}

function choosePreferredVoice() {
  if (!("speechSynthesis" in window)) {
    voiceName.textContent = "Speech not supported in this browser";
    return;
  }

  voices = window.speechSynthesis.getVoices();
  preferredVoice =
    voices.find((voice) => /samantha|ava|allison|serena|karen/i.test(voice.name)) ||
    voices.find((voice) => /google us english|zira|aria|jenny/i.test(voice.name)) ||
    voices.find((voice) => /en-us|en_us/i.test(voice.lang)) ||
    voices[0] ||
    null;

  voiceName.textContent = preferredVoice
    ? `Using ${preferredVoice.name}`
    : "Using browser default voice";
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.98;
  utterance.pitch = 0.94;
  utterance.volume = 1;
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setVoiceStatus("Voice input is unavailable in this browser. Type your command below.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    listening = true;
    document.body.classList.add("listening");
    setVoiceStatus("Listening. Say “Hey Reppo” or just answer the current question.");
  };

  recognition.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");

    if (event.results[event.results.length - 1].isFinal) {
      processInterview(text);
    } else {
      setVoiceStatus(`Hearing: "${text}"`);
    }
  };

  recognition.onerror = (event) => {
    setVoiceStatus(`Voice error: ${event.error}. Type instead if needed.`);
  };

  recognition.onend = () => {
    listening = false;
    document.body.classList.remove("listening");
    setVoiceStatus("Idle. Click the orb to answer the next question.");
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

textForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = textInput.value.trim();
  if (!text) {
    return;
  }

  processInterview(text);
  speak(state.response);
  textInput.value = "";
});

createDatanetButton.addEventListener("click", createDatanet);
publishEntryButton.addEventListener("click", publishEntry);
castVoteButton.addEventListener("click", castVote);

if ("speechSynthesis" in window) {
  choosePreferredVoice();
  window.speechSynthesis.onvoiceschanged = choosePreferredVoice;
}

renderSteps();
renderSpec();
renderDatanetState();
setCurrentQuestion(state.currentQuestion);
setupRecognition();
