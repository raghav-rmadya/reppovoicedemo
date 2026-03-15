const voiceToggle = document.getElementById("voice-toggle");
const voiceStatus = document.getElementById("voice-status");
const textForm = document.getElementById("text-form");
const textInput = document.getElementById("text-input");
const screenLabel = document.getElementById("screen-label");
const screenTitle = document.getElementById("screen-title");
const screenBody = document.getElementById("screen-body");
const screenMeta = document.getElementById("screen-meta");
const screenSummary = document.getElementById("screen-summary");
const screenCard = document.getElementById("screen-card");

const initialState = {
  stage: "idle",
  market: "",
  datasetSummary: "",
  name: "",
  spinupFee: "20k REPPO",
  publishingFeeAmount: "",
  publishingFeeToken: "",
  emissionsAmount: "",
  emissionsToken: "",
  transactionStatus: "",
  currentQuestion: "What market or dataset opportunity do you want to work on?",
};

let state = JSON.parse(JSON.stringify(initialState));
let conversation = [];
let recognition;
let listening = false;
let currentAudio;

const stageContent = {
  idle: {
    label: "Ready",
    title: "What do you want to work on?",
    body:
      "Say a market or ask me to look for a dataset opportunity. If the market looks open, I’ll spin up a new datanet flow.",
  },
  searching: {
    label: "Scanning",
    title: "Scanning market",
    body: "Mapping the opportunity now.",
  },
  search_result: {
    label: "Opportunity",
    title: "This looks like a market worth launching.",
    body: "I don’t see a clean existing fit. I’m moving into launch mode.",
  },
  approve_spinup: {
    label: "Step 1",
    title: "Approve the spin-up fee.",
    body: "Please approve 20k REPPO so I can prepare the new datanet.",
  },
  publishing_fee: {
    label: "Step 2",
    title: "Set the publishing fee.",
    body: "What should publishers pay to submit data, and which token do you want to charge in?",
  },
  emissions: {
    label: "Step 3",
    title: "Seed emissions.",
    body: "How much emissions do you want to seed, and in which token?",
  },
  review: {
    label: "Ready",
    title: "Your launch config is ready.",
    body: "Say create when you want me to package the datanet.",
  },
  success: {
    label: "Launch Ready",
    title: "Your datanet is packaged.",
    body: "Launch package locked. Onchain handoff is next.",
  },
};

function setVoiceStatus(text) {
  voiceStatus.textContent = text;
}

function setStage(stage) {
  document.body.classList.toggle("processing", stage === "searching");
  document.body.classList.toggle("success-mode", stage === "success");
  const content = stageContent[stage] || stageContent.idle;
  screenLabel.textContent = content.label;
  screenTitle.textContent = content.title;
  screenBody.textContent = content.body;
}

function flashStage() {
  document.body.classList.remove("stage-flash");
  void screenCard.offsetWidth;
  document.body.classList.add("stage-flash");
  window.setTimeout(() => {
    document.body.classList.remove("stage-flash");
  }, 450);
}

function renderSummary() {
  const pills = [];

  if (state.market) {
    pills.push(["Market", state.market]);
  }
  if (state.name) {
    pills.push(["Datanet", state.name]);
  }
  if (state.spinupFee && state.stage !== "idle" && state.stage !== "searching") {
    pills.push(["Spin-up", state.spinupFee]);
  }
  if (state.publishingFeeAmount || state.publishingFeeToken) {
    pills.push([
      "Publish fee",
      `${state.publishingFeeAmount || "?"} ${state.publishingFeeToken || ""}`.trim(),
    ]);
  }
  if (state.emissionsAmount || state.emissionsToken) {
    pills.push([
      "Seed",
      `${state.emissionsAmount || "?"} ${state.emissionsToken || ""}`.trim(),
    ]);
  }

  if (pills.length === 0) {
    screenSummary.classList.add("hidden");
    screenSummary.innerHTML = "";
    return;
  }

  screenSummary.classList.remove("hidden");
  screenSummary.innerHTML = pills
    .map(
      ([key, value]) =>
        `<span class="summary-pill"><strong>${key}</strong>${value}</span>`
    )
    .join("");
}

function renderMeta(meta = []) {
  const defaults =
    state.stage === "idle"
      ? ["Voice first", "Datanets live", "Agents soon"]
      : state.stage === "searching"
        ? ["Scanning market", "Preparing launch"]
        : meta;

  screenMeta.innerHTML = (defaults || [])
    .map((item) => `<span class="meta-pill">${item}</span>`)
    .join("");
}

function renderTurn(response) {
  setStage(state.stage);
  screenBody.textContent = response || stageContent[state.stage]?.body || stageContent.idle.body;
  renderSummary();
}

function renderProcessingState() {
  const statusMap = {
    idle: ["Scanning market", "Preparing launch"],
    search_result: ["Preparing launch", "Opening config"],
    approve_spinup: ["Recording approval", "Opening fee config"],
    publishing_fee: ["Setting publish fee", "Opening emissions"],
    emissions: ["Packaging datanet", "Preparing handoff"],
    review: ["Packaging datanet", "Preparing handoff"],
    success: ["Packaging datanet", "Preparing handoff"],
  };

  const [title, chip] = statusMap[state.stage] || statusMap.idle;
  screenLabel.textContent = "Working";
  screenTitle.textContent = title;
  screenBody.textContent = "One moment.";
  renderMeta([title, chip]);
}

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    URL.revokeObjectURL(currentAudio.dataset.url || "");
    currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

async function speak(text) {
  stopCurrentAudio();

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
    audio.dataset.url = audioUrl;
    currentAudio = audio;
    audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (currentAudio === audio) {
        currentAudio = null;
      }
    };
  } catch (_error) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.03;
      utterance.pitch = 0.97;
      window.speechSynthesis.speak(utterance);
    }
  }
}

async function sendTurn(userText) {
  conversation.push({ role: "user", content: userText });
  setVoiceStatus("Working.");
  setStage("searching");
  renderProcessingState();
  renderSummary();

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
    setStage(state.stage || "idle");
    renderMeta(["Request failed"]);
    screenBody.textContent = message;
    setVoiceStatus(message.includes("OPENAI_API_KEY") ? "Add OPENAI_API_KEY in Vercel." : "Request failed.");
    return;
  }

  state = data.state;
  conversation.push({ role: "assistant", content: data.assistantMessage });
  setVoiceStatus("Ready.");
  setStage(state.stage);
  flashStage();
  renderMeta(data.meta || []);
  renderTurn(data.assistantMessage);
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
    if (!document.body.classList.contains("processing")) {
      setVoiceStatus("Idle. Click the orb, then talk.");
    }
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

setStage(state.stage);
renderMeta();
renderSummary();
setupRecognition();
