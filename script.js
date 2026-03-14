const transcriptEl = document.getElementById("transcript");
const blueprintEl = document.getElementById("blueprint");
const datasetResultsEl = document.getElementById("dataset-results");
const rlPlanEl = document.getElementById("rl-plan");
const payloadEl = document.getElementById("payload");
const voiceToggle = document.getElementById("voice-toggle");
const voiceStatus = document.getElementById("voice-status");
const simulateButton = document.getElementById("simulate-demo");
const textForm = document.getElementById("text-form");
const textInput = document.getElementById("text-input");
const deployButton = document.getElementById("deploy-button");
const deployStatus = document.getElementById("deploy-status");
const promptChips = document.querySelectorAll(".prompt-chip");

const initialState = {
  wakePhraseDetected: false,
  name: "Untitled Datanet",
  sector: "General intelligence market",
  description: "Voice-configured datanet for paid publishing and aligned curation.",
  publishingFee: "1 USDC",
  subnetFee: "0.15 ETH",
  emissions: "250 REPP / epoch",
  emissionsToken: "REPP",
  seedIncentive: "50,000 REPP bootstrap pool",
  contributorReward: "70% of emissions",
  curatorReward: "20% of emissions",
  treasuryShare: "10% treasury reserve",
  cadence: "Daily validation",
  dataSource: "API + human submitted data",
  audience: "Data buyers, contributors, curators",
  governance: "Weighted voting with stake and reputation",
  status: "Listening for instructions",
  lastIntent: "create_datanet",
  datasets: [],
  rlMode: false,
  rlEnvironment: {
    title: "No RL environment configured",
    summary: "AI REPPO will propose an RL environment when the right dataset is missing.",
    knobs: ["State space pending", "Reward function pending", "Simulator pending"]
  }
};

const state = JSON.parse(JSON.stringify(initialState));

const datasetCatalog = {
  ev: [
    {
      title: "Open Charge Map",
      fit: "High fit",
      coverage: "Global charging station metadata",
      freshness: "Community updated",
      note: "Useful for station locations and connectors, but limited uptime and pricing quality."
    },
    {
      title: "AFDC Alternative Fuel Stations",
      fit: "Medium fit",
      coverage: "US government station registry",
      freshness: "Periodic updates",
      note: "Great base dataset for station inventory, weak on live availability."
    },
    {
      title: "Utility and OEM API feeds",
      fit: "Partial fit",
      coverage: "Partner-specific telemetry",
      freshness: "Near real-time if integrated",
      note: "High-quality data exists but is fragmented behind commercial APIs."
    }
  ],
  sports: [
    {
      title: "Historical sportsbook odds",
      fit: "High fit",
      coverage: "Pre-match and live market lines",
      freshness: "Near real-time from vendors",
      note: "Good for predictions, but licensing can be restrictive."
    },
    {
      title: "Official league stats feeds",
      fit: "High fit",
      coverage: "Box scores and player events",
      freshness: "Live / post-game",
      note: "Strong source for outcome validation and model features."
    }
  ],
  robotics: [
    {
      title: "Warehouse object detection benchmarks",
      fit: "Partial fit",
      coverage: "Labeled perception tasks",
      freshness: "Static datasets",
      note: "Helpful for vision, but weak for decision-making and policy optimization."
    }
  ],
  default: [
    {
      title: "Open data sources",
      fit: "Partial fit",
      coverage: "Mixed public and partner data",
      freshness: "Varies by provider",
      note: "AI REPPO can combine multiple feeds, but specialized markets may need new data supply."
    }
  ]
};

const investorDemoScript = [
  "Hey Reppo, create a datanet called ChargeNet for EV charging station uptime and pricing.",
  "Set the publishing fee to 2 USDC and the subnet fee to 0.2 ETH.",
  "Use REPP with 500 REPP per epoch and a 100000 REPP seed incentive pool.",
  "Reward contributors with 70 percent, curators with 20 percent, and reserve 10 percent for treasury.",
  "Find datasets for EV charging uptime. If the data is fragmented, propose an RL environment for synthetic bootstrap coverage."
];

function addMessage(role, text) {
  const bubble = document.createElement("article");
  bubble.className = `bubble ${role}`;

  const label = document.createElement("span");
  label.className = "bubble-label";
  label.textContent = role === "user" ? "Founder" : role === "assistant" ? "AI REPPO" : "System";

  const body = document.createElement("p");
  body.textContent = text;

  bubble.append(label, body);
  transcriptEl.append(bubble);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function titleFromSector(sector) {
  const cleaned = sector.replace(/[^a-z0-9 ]/gi, " ").trim();
  if (!cleaned) {
    return "Untitled Datanet";
  }

  return `${cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")}Net`;
}

function parseField(text, pattern, groupIndex = 1, transform = (value) => value) {
  const match = text.match(pattern);
  return match ? transform(match[groupIndex].trim()) : null;
}

function extractPercent(text, label) {
  const regex = new RegExp(`${label}[^\\d]*(\\d{1,3})\\s*percent`, "i");
  const match = text.match(regex);
  return match ? `${match[1]}% of emissions` : null;
}

function detectMarketKey(text) {
  const lower = text.toLowerCase();
  if (lower.includes("charging") || lower.includes("ev")) {
    return "ev";
  }
  if (lower.includes("sport")) {
    return "sports";
  }
  if (lower.includes("robot") || lower.includes("warehouse")) {
    return "robotics";
  }
  return "default";
}

function createRlEnvironment(text) {
  const market = detectMarketKey(text);

  if (market === "ev") {
    state.rlEnvironment = {
      title: "EV Fleet Coverage Simulator",
      summary: "Simulates station uptime, pricing volatility, queue times, and route demand so AI REPPO can bootstrap contributor activity where live data is fragmented.",
      knobs: [
        "State space: location, charger type, uptime, queue length, time of day",
        "Actions: publish update, validate listing, challenge bad data",
        "Reward: uptime accuracy, freshness, coverage, validator agreement"
      ]
    };
    state.rlMode = true;
    return;
  }

  if (market === "robotics") {
    state.rlEnvironment = {
      title: "Warehouse Robotics RL Lab",
      summary: "Creates a synthetic warehouse with pick paths, congestion, battery drain, and task assignments so the datanet can bootstrap control and routing data before real-world integrations arrive.",
      knobs: [
        "State space: map graph, robot position, payload, queue backlog",
        "Actions: reroute, assign task, charge, defer, collaborate",
        "Reward: throughput, safety margin, energy efficiency, SLA hits"
      ]
    };
    state.rlMode = true;
    return;
  }

  state.rlEnvironment = {
    title: "Synthetic Market Bootstrap Environment",
    summary: "Defines a configurable simulator that produces initial trajectories and reward signals while the real datanet supply side is forming.",
    knobs: [
      "State space based on domain events",
      "Actions based on contributor behavior",
      "Reward tuned for quality, coverage, and demand"
    ]
  };
  state.rlMode = true;
}

function updateStateFromText(rawText) {
  const hasWakePhrase = /hey\s+reppo/i.test(rawText);
  const text = rawText.replace(/hey\s+reppo[:,]?\s*/i, "").trim();
  const lower = text.toLowerCase();

  if (hasWakePhrase) {
    state.wakePhraseDetected = true;
  }

  const name = parseField(text, /called\s+([a-z0-9][a-z0-9\s-]{1,40})/i);
  if (name) {
    state.name = name;
  }

  const sector = parseField(
    text,
    /(?:for|around)\s+([a-z0-9\s,&/-]+?)(?:\.|,| with| set| then| and| search| find| target| reward)/i
  );
  if (sector) {
    state.sector = sector;
    if (state.name === initialState.name) {
      state.name = titleFromSector(sector);
    }
  }

  const publishFee = parseField(
    text,
    /publishing fee(?: to| of)?\s+([\d.]+\s*[a-z]+)/i,
    1,
    (value) => value.toUpperCase().replace(/\s+/, " ")
  );
  if (publishFee) {
    state.publishingFee = publishFee;
  }

  const subnetFee = parseField(
    text,
    /subnet fee(?: to| of)?\s+([\d.]+\s*[a-z]+)/i,
    1,
    (value) => value.toUpperCase().replace(/\s+/, " ")
  );
  if (subnetFee) {
    state.subnetFee = subnetFee;
  }

  const emissions = text.match(/(\d[\d,]*)\s+([a-z]{2,10})\s+(?:per epoch|each epoch|epoch)/i);
  if (emissions) {
    state.emissions = `${emissions[1].replace(/,/g, "")} ${emissions[2].toUpperCase()} / epoch`;
    state.emissionsToken = emissions[2].toUpperCase();
  }

  const seedPool = text.match(/(\d[\d,]*)\s+([a-z]{2,10})\s+(?:seed incentive pool|bootstrap pool|seed incentives?)/i);
  if (seedPool) {
    state.seedIncentive = `${seedPool[1].replace(/,/g, "")} ${seedPool[2].toUpperCase()} bootstrap pool`;
  }

  const contributors = extractPercent(text, "contributors?");
  if (contributors) {
    state.contributorReward = contributors;
  }

  const curators = extractPercent(text, "curators?");
  if (curators) {
    state.curatorReward = curators;
  }

  const treasury = text.match(/(?:treasury|reserve)[^\d]*(\d{1,3})\s*percent/i);
  if (treasury) {
    state.treasuryShare = `${treasury[1]}% treasury reserve`;
  }

  const audience = parseField(
    text,
    /target\s+([a-z0-9,\s&-]+?)(?:\.|,| with| and| then)/i
  );
  if (audience) {
    state.audience = audience;
  }

  if (lower.includes("daily")) {
    state.cadence = "Daily validation";
  }
  if (lower.includes("weekly")) {
    state.cadence = "Weekly validation";
  }

  if (lower.includes("voting")) {
    state.governance = "Curator voting weighted by stake and reputation";
  }

  if (lower.includes("charging")) {
    state.dataSource = "Station telemetry + pricing feeds + crowd reports";
  } else if (lower.includes("sport")) {
    state.dataSource = "Odds feeds + event streams + prediction submissions";
  } else if (lower.includes("robot")) {
    state.dataSource = "Simulator traces + fleet telemetry + operator feedback";
  }

  if (lower.includes("search for datasets") || lower.includes("find datasets") || lower.includes("search datasets")) {
    const key = detectMarketKey(text);
    state.datasets = datasetCatalog[key];
    state.lastIntent = "search_datasets";
  }

  if (lower.includes("rl environment") || lower.includes("synthetic") || lower.includes("if there are gaps")) {
    createRlEnvironment(text);
    state.lastIntent = "propose_rl";
  }

  if (lower.includes("create a datanet") || lower.includes("launch a datanet") || lower.includes("monetization plan")) {
    state.lastIntent = "create_datanet";
  }

  state.description = `${state.name} monetizes ${state.sector.toLowerCase()} through paid publishing, token emissions, and curator-governed validation.`;
  state.status = state.rlMode ? "Ready with dataset and RL bootstrap plan" : "Ready for off-chain creation";
}

function renderBlueprint() {
  const fields = [
    ["Name", state.name],
    ["Sector", state.sector],
    ["Publishing fee", state.publishingFee],
    ["Subnet fee", state.subnetFee],
    ["Emissions", state.emissions],
    ["Seed incentive", state.seedIncentive],
    ["Contributor rewards", state.contributorReward],
    ["Curator rewards", state.curatorReward],
    ["Treasury", state.treasuryShare],
    ["Cadence", state.cadence],
    ["Data source", state.dataSource],
    ["Audience", state.audience],
    ["Governance", state.governance],
    ["Status", state.status]
  ];

  blueprintEl.innerHTML = "";
  for (const [label, value] of fields) {
    const card = document.createElement("div");
    card.className = "blueprint-card";

    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;

    card.append(dt, dd);
    blueprintEl.append(card);
  }
}

function renderDatasetResults() {
  datasetResultsEl.innerHTML = "";
  const datasets = state.datasets.length ? state.datasets : datasetCatalog.default;

  datasets.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const title = document.createElement("h3");
    title.textContent = entry.title;

    const note = document.createElement("p");
    note.textContent = entry.note;

    const meta = document.createElement("div");
    meta.className = "result-meta";
    meta.innerHTML = `
      <span class="tag good">${entry.fit}</span>
      <span class="tag">${entry.coverage}</span>
      <span class="tag">${entry.freshness}</span>
    `;

    card.append(title, note, meta);
    datasetResultsEl.append(card);
  });
}

function renderRlPlan() {
  rlPlanEl.innerHTML = "";

  const card = document.createElement("article");
  card.className = "rl-card";

  const title = document.createElement("h3");
  title.textContent = state.rlEnvironment.title;

  const summary = document.createElement("p");
  summary.textContent = state.rlEnvironment.summary;

  const meta = document.createElement("div");
  meta.className = "rl-meta";
  state.rlEnvironment.knobs.forEach((item) => {
    const tag = document.createElement("span");
    tag.className = `tag ${state.rlMode ? "warn" : ""}`.trim();
    tag.textContent = item;
    meta.append(tag);
  });

  card.append(title, summary, meta);
  rlPlanEl.append(card);
}

function renderPayload() {
  const payload = {
    assistant: "AI REPPO",
    wakePhrase: state.wakePhraseDetected ? "Hey Reppo" : "manual",
    datanet: {
      name: state.name,
      sector: state.sector,
      description: state.description,
      publishingFee: state.publishingFee,
      subnetFee: state.subnetFee,
      validationCadence: state.cadence,
      audience: state.audience,
      dataSource: state.dataSource
    },
    economics: {
      emissionsSchedule: state.emissions,
      emissionsToken: state.emissionsToken,
      seedIncentive: state.seedIncentive,
      contributorReward: state.contributorReward,
      curatorReward: state.curatorReward,
      treasuryShare: state.treasuryShare
    },
    discovery: {
      datasetsFound: state.datasets.map((entry) => entry.title),
      rlBootstrapEnabled: state.rlMode,
      rlEnvironment: state.rlEnvironment.title
    },
    executionMode: "off-chain demo"
  };

  payloadEl.textContent = JSON.stringify(payload, null, 2);
}

function buildAssistantReply() {
  if (!state.wakePhraseDetected) {
    return "I’m ready when you are. Start with “Hey Reppo” so the demo feels like a true voice-first assistant.";
  }

  if (state.lastIntent === "search_datasets" && !state.rlMode) {
    return `I found candidate datasets for ${state.sector.toLowerCase()}. There is enough signal to start discovery, but the market is still fragmented, so I can also propose a bootstrap environment if you want synthetic coverage.`;
  }

  if (state.lastIntent === "propose_rl") {
    return `I found gaps in live market coverage, so I configured ${state.rlEnvironment.title}. This gives you a strong investor story: AI REPPO can search existing supply first, then manufacture a training environment when the data market is still early.`;
  }

  return `Configured ${state.name}. I captured the datanet economics, found data supply options, and prepared an off-chain execution plan that can later map to your existing smart contracts.`;
}

function processUtterance(text) {
  addMessage("user", text);
  updateStateFromText(text);
  renderBlueprint();
  renderDatasetResults();
  renderRlPlan();
  renderPayload();

  window.setTimeout(() => {
    addMessage("assistant", buildAssistantReply());
  }, 280);
}

function simulateInvestorDemo() {
  let delay = 0;
  investorDemoScript.forEach((line) => {
    window.setTimeout(() => processUtterance(line), delay);
    delay += 1100;
  });
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
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

let recognition;
let listening = false;

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setVoiceStatus("Voice input is unavailable in this browser. You can still type, present locally, and deploy the static app.");
    voiceToggle.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    listening = true;
    voiceToggle.textContent = "Listening...";
    setVoiceStatus("Listening for “Hey Reppo” and your request...");
  };

  recognition.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");

    if (event.results[event.results.length - 1].isFinal) {
      processUtterance(text);
      speak(buildAssistantReply());
    } else {
      setVoiceStatus(`Heard so far: "${text}"`);
    }
  };

  recognition.onerror = (event) => {
    setVoiceStatus(`Voice error: ${event.error}. Type into the composer if needed.`);
  };

  recognition.onend = () => {
    listening = false;
    voiceToggle.textContent = "Start AI REPPO";
    setVoiceStatus("Voice mode is idle. Click again to continue.");
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

simulateButton.addEventListener("click", simulateInvestorDemo);

textForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = textInput.value.trim();
  if (!text) {
    return;
  }

  processUtterance(text);
  textInput.value = "";
});

promptChips.forEach((chip) => {
  chip.addEventListener("click", () => processUtterance(chip.dataset.prompt));
});

deployButton.addEventListener("click", () => {
  deployStatus.textContent = `AI REPPO simulated a successful off-chain creation for ${state.name}. Dataset discovery is ${state.datasets.length ? "attached" : "pending"}, and RL bootstrap is ${state.rlMode ? "enabled" : "available on demand"}.`;
  addMessage(
    "system",
    `Demo complete. ${state.name} is presented as an off-chain datanet created by voice, with searchable dataset supply and a fallback RL bootstrap workflow.`
  );
});

addMessage(
  "assistant",
  "Say “Hey Reppo” to begin. I can create a datanet, search for datasets, and if the data market is thin, I’ll propose a bootstrap RL environment."
);
renderBlueprint();
renderDatasetResults();
renderRlPlan();
renderPayload();
setupRecognition();
