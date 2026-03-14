const voiceToggle = document.getElementById("voice-toggle");
const voiceStatus = document.getElementById("voice-status");
const textForm = document.getElementById("text-form");
const textInput = document.getElementById("text-input");
const responseText = document.getElementById("response-text");
const stepList = document.getElementById("step-list");
const specGrid = document.getElementById("spec-grid");

const initialState = {
  wakePhraseDetected: false,
  name: "Untitled Datanet",
  market: "No market selected yet",
  publishingFee: "Not set",
  emissions: "Not set",
  rewards: "Not set",
  datasetPlan: "Pending",
  rlPlan: "Not needed yet",
  response:
    "I'm ready. Ask me to create a datanet, find datasets, or design an RL environment.",
  steps: [
    {
      title: "Waiting for input",
      body: "Click the orb and speak, or type a command below.",
      status: "active"
    },
    {
      title: "Interpret market",
      body: "I map your request into a datanet scope and incentive model.",
      status: "pending"
    },
    {
      title: "Check data supply",
      body: "I look for existing datasets and data contribution paths.",
      status: "pending"
    },
    {
      title: "Decide bootstrap path",
      body: "If supply is weak, I recommend an RL environment.",
      status: "pending"
    }
  ]
};

const state = JSON.parse(JSON.stringify(initialState));

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
    ["Market", state.market],
    ["Datanet", state.name],
    ["Publishing fee", state.publishingFee],
    ["Emissions", state.emissions],
    ["Rewards", state.rewards],
    ["Dataset plan", state.datasetPlan],
    ["RL path", state.rlPlan]
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

function setResponse(text) {
  state.response = text;
  responseText.textContent = text;
}

function updateSteps(mode) {
  const steps = JSON.parse(JSON.stringify(initialState.steps));

  steps[0].status = "done";
  steps[0].body = "Request received.";
  steps[1].status = "done";
  steps[1].body = `Mapped market: ${state.market}.`;
  steps[2].status = "active";
  steps[2].body = state.datasetPlan;
  steps[3].status = "pending";

  if (mode === "rl") {
    steps[2].status = "done";
    steps[3].status = "done";
    steps[3].body = state.rlPlan;
  } else if (mode === "dataset") {
    steps[2].status = "done";
    steps[3].status = "active";
    steps[3].body = "Existing supply is usable. RL stays on standby.";
  } else {
    steps[3].status = "active";
    steps[3].body = "Waiting to see if an RL bootstrap is needed.";
  }

  state.steps = steps;
}

function marketFromText(text) {
  const lower = text.toLowerCase();
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
  return "Custom market";
}

function datanetName(market) {
  return market
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("") + "Net";
}

function parseFee(text) {
  const match = text.match(/publishing fee(?: to| of)?\s+([\d.]+\s*[a-z]+)/i);
  return match ? match[1].toUpperCase().replace(/\s+/, " ") : "Suggested: 2 USDC";
}

function parseEmissions(text) {
  const match = text.match(/(\d[\d,]*)\s+([a-z]{2,10})\s+(?:per epoch|epoch)/i);
  return match ? `${match[1].replace(/,/g, "")} ${match[2].toUpperCase()} / epoch` : "Suggested: 500 REPP / epoch";
}

function parseRewards(text) {
  const contributor = text.match(/contributors?[^\d]*(\d{1,3})\s*percent/i);
  const curator = text.match(/curators?[^\d]*(\d{1,3})\s*percent/i);

  if (contributor || curator) {
    const pieces = [];
    if (contributor) {
      pieces.push(`${contributor[1]}% contributors`);
    }
    if (curator) {
      pieces.push(`${curator[1]}% curators`);
    }
    return pieces.join(" / ");
  }

  return "Suggested: 70% contributors / 20% curators / 10% reserve";
}

function processIntent(rawText) {
  const hasWakePhrase = /hey\s+reppo/i.test(rawText);
  const text = rawText.replace(/hey\s+reppo[:,]?\s*/i, "").trim();
  const lower = text.toLowerCase();

  state.wakePhraseDetected = hasWakePhrase || state.wakePhraseDetected;
  state.market = marketFromText(text);
  state.name = datanetName(state.market);
  state.publishingFee = parseFee(text);
  state.emissions = parseEmissions(text);
  state.rewards = parseRewards(text);

  let mode = "create";

  if (lower.includes("dataset")) {
    state.datasetPlan = `Searching public and partner sources for ${state.market.toLowerCase()}.`;
    mode = "dataset";
  } else {
    state.datasetPlan = "Ready to search datasets once the market definition is confirmed.";
  }

  if (lower.includes("rl") || lower.includes("synthetic") || lower.includes("if there are gaps")) {
    state.rlPlan = `Propose a simulated ${state.market.toLowerCase()} environment to bootstrap supply before live contributors scale up.`;
    mode = "rl";
  } else {
    state.rlPlan = "Standby until data supply looks thin.";
  }

  if (mode === "rl") {
    setResponse(
      `I mapped ${state.market.toLowerCase()} into ${state.name}, checked for data supply, and I’d bootstrap the market with an RL environment while contributors come online.`
    );
  } else if (mode === "dataset") {
    setResponse(
      `I mapped ${state.market.toLowerCase()} into ${state.name} and I’m searching for usable datasets before proposing any synthetic bootstrap path.`
    );
  } else {
    setResponse(
      `I mapped your request into ${state.name} with a draft publishing fee, emissions plan, and reward split. Next I can search for datasets or design an RL bootstrap path.`
    );
  }

  updateSteps(mode);
  renderSpec();
}

function setVoiceStatus(text) {
  voiceStatus.textContent = text;
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 0.96;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

let recognition;
let listening = false;

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
    setVoiceStatus("Listening. Say “Hey Reppo” or just say what you want built.");
  };

  recognition.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");

    if (event.results[event.results.length - 1].isFinal) {
      processIntent(text);
      speak(state.response);
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
    setVoiceStatus("Idle. Click the orb to speak again.");
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

  processIntent(text);
  textInput.value = "";
});

renderSteps();
renderSpec();
setupRecognition();
