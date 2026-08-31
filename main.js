var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AnswerWithAIPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  provider: "openai",
  openaiApiKey: "",
  openaiModel: "gpt-4o",
  claudeApiKey: "",
  claudeModel: "claude-sonnet-4-20250514",
  geminiApiKey: "",
  geminiModel: "gemini-2.0-flash",
  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "llama3",
  openaiLocalBaseUrl: "http://localhost:8080",
  openaiLocalApiKey: "",
  openaiLocalModel: "",
  systemPrompt: "You are a helpful assistant. Answer the question concisely and clearly in plain text. Do not use markdown formatting, code blocks, bullet points, or any special formatting. Just write plain sentences.",
  maxTokens: 1024,
  answerMode: "short",
  // Cached model lists fetched from each provider's "list models" endpoint (populated via the settings UI)
  cachedModels: {}
};
async function callOpenAI(question, settings) {
  if (!settings.openaiApiKey)
    throw new Error("OpenAI API key is not set.");
  const response = await (0, import_obsidian.requestUrl)({
    url: "https://api.openai.com/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model: settings.openaiModel,
      messages: [
        { role: "system", content: settings.systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: settings.maxTokens
    })
  });
  if (response.status !== 200) {
    throw new Error(`OpenAI API error: ${response.status} - ${response.text}`);
  }
  return response.json.choices[0].message.content.trim();
}
async function callClaude(question, settings) {
  if (!settings.claudeApiKey)
    throw new Error("Claude API key is not set.");
  const response = await (0, import_obsidian.requestUrl)({
    url: "https://api.anthropic.com/v1/messages",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.claudeApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: settings.claudeModel,
      max_tokens: settings.maxTokens,
      system: settings.systemPrompt,
      messages: [
        { role: "user", content: question }
      ]
    })
  });
  if (response.status !== 200) {
    throw new Error(`Claude API error: ${response.status} - ${response.text}`);
  }
  return response.json.content[0].text.trim();
}
async function callGemini(question, settings) {
  if (!settings.geminiApiKey)
    throw new Error("Gemini API key is not set.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent?key=${settings.geminiApiKey}`;
  const response = await (0, import_obsidian.requestUrl)({
    url,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: question }] }],
      systemInstruction: { parts: [{ text: settings.systemPrompt }] },
      generationConfig: { maxOutputTokens: settings.maxTokens }
    })
  });
  if (response.status !== 200) {
    throw new Error(`Gemini API error: ${response.status} - ${response.text}`);
  }
  return response.json.candidates[0].content.parts[0].text.trim();
}
async function callOllama(question, settings) {
  if (!settings.ollamaBaseUrl)
    throw new Error("Ollama base URL is not set.");
  if (!settings.ollamaModel)
    throw new Error("Ollama model is not set.");
  const baseUrl = settings.ollamaBaseUrl.replace(/\/+$/, "");
  const response = await (0, import_obsidian.requestUrl)({
    url: `${baseUrl}/api/chat`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: settings.ollamaModel,
      messages: [
        { role: "system", content: settings.systemPrompt },
        { role: "user", content: question }
      ],
      stream: false,
      think: false,
      options: { num_predict: settings.maxTokens }
    })
  });
  if (response.status !== 200) {
    throw new Error(`Ollama API error: ${response.status} - ${response.text}`);
  }
  const content = response.json.message.content.trim();
  if (!content) {
    throw new Error("Ollama returned no content — response was truncated by the token limit, likely consumed by model reasoning. Try raising Max Tokens or disabling thinking.");
  }
  return content;
}
async function callOpenAILocal(question, settings) {
  if (!settings.openaiLocalBaseUrl)
    throw new Error("OpenAI (Local) base URL is not set.");
  const baseUrl = settings.openaiLocalBaseUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json" };
  if (settings.openaiLocalApiKey)
    headers["Authorization"] = `Bearer ${settings.openaiLocalApiKey}`;
  const response = await (0, import_obsidian.requestUrl)({
    url: `${baseUrl}/v1/chat/completions`,
    method: "POST",
    headers,
    body: JSON.stringify({
      model: settings.openaiLocalModel || "local-model",
      messages: [
        { role: "system", content: settings.systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: settings.maxTokens,
      stream: false
    })
  });
  if (response.status !== 200) {
    throw new Error(`OpenAI (Local) API error: ${response.status} - ${response.text}`);
  }
  const content = response.json.choices[0].message.content.trim();
  if (!content) {
    throw new Error("OpenAI (Local) returned no content — the response may have been truncated by the token limit or consumed by model reasoning. Try raising Max Tokens.");
  }
  return content;
}
// Fetches the list of available model ids for the given provider from its "list models" endpoint
async function fetchModels(settings) {
  switch (settings.provider) {
    case "openai": {
      if (!settings.openaiApiKey)
        throw new Error("OpenAI API key is not set.");
      const response = await (0, import_obsidian.requestUrl)({
        url: "https://api.openai.com/v1/models",
        method: "GET",
        headers: { "Authorization": `Bearer ${settings.openaiApiKey}` },
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return response.json.data.map((m) => m.id).sort();
    }
    case "claude": {
      if (!settings.claudeApiKey)
        throw new Error("Claude API key is not set.");
      const response = await (0, import_obsidian.requestUrl)({
        url: "https://api.anthropic.com/v1/models?limit=1000",
        method: "GET",
        headers: {
          "x-api-key": settings.claudeApiKey,
          "anthropic-version": "2023-06-01"
        },
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return response.json.data.map((m) => m.id);
    }
    case "gemini": {
      if (!settings.geminiApiKey)
        throw new Error("Gemini API key is not set.");
      const response = await (0, import_obsidian.requestUrl)({
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${settings.geminiApiKey}&pageSize=1000`,
        method: "GET",
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return (response.json.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
    }
    case "ollama": {
      if (!settings.ollamaBaseUrl)
        throw new Error("Ollama base URL is not set.");
      const baseUrl = settings.ollamaBaseUrl.replace(/\/+$/, "");
      const response = await (0, import_obsidian.requestUrl)({
        url: `${baseUrl}/api/tags`,
        method: "GET",
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return (response.json.models || []).map((m) => m.name);
    }
    case "openai-local": {
      if (!settings.openaiLocalBaseUrl)
        throw new Error("OpenAI (Local) base URL is not set.");
      const baseUrl = settings.openaiLocalBaseUrl.replace(/\/+$/, "");
      const headers = {};
      if (settings.openaiLocalApiKey)
        headers["Authorization"] = `Bearer ${settings.openaiLocalApiKey}`;
      const response = await (0, import_obsidian.requestUrl)({
        url: `${baseUrl}/v1/models`,
        method: "GET",
        headers,
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return (response.json.data || []).map((m) => m.id);
    }
    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
  }
}
// Lightweight connectivity check per provider — hits a cheap list endpoint, does not consume tokens
async function testConnection(settings) {
  switch (settings.provider) {
    case "openai": {
      if (!settings.openaiApiKey)
        throw new Error("OpenAI API key is not set.");
      const response = await (0, import_obsidian.requestUrl)({
        url: "https://api.openai.com/v1/models",
        method: "GET",
        headers: { "Authorization": `Bearer ${settings.openaiApiKey}` },
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return "OpenAI connection OK.";
    }
    case "claude": {
      if (!settings.claudeApiKey)
        throw new Error("Claude API key is not set.");
      const response = await (0, import_obsidian.requestUrl)({
        url: "https://api.anthropic.com/v1/models",
        method: "GET",
        headers: {
          "x-api-key": settings.claudeApiKey,
          "anthropic-version": "2023-06-01"
        },
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return "Claude connection OK.";
    }
    case "gemini": {
      if (!settings.geminiApiKey)
        throw new Error("Gemini API key is not set.");
      const response = await (0, import_obsidian.requestUrl)({
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${settings.geminiApiKey}`,
        method: "GET",
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return "Gemini connection OK.";
    }
    case "ollama": {
      if (!settings.ollamaBaseUrl)
        throw new Error("Ollama base URL is not set.");
      const baseUrl = settings.ollamaBaseUrl.replace(/\/+$/, "");
      const response = await (0, import_obsidian.requestUrl)({
        url: `${baseUrl}/api/tags`,
        method: "GET",
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return "Ollama connection OK.";
    }
    case "openai-local": {
      if (!settings.openaiLocalBaseUrl)
        throw new Error("OpenAI (Local) base URL is not set.");
      const baseUrl = settings.openaiLocalBaseUrl.replace(/\/+$/, "");
      const headers = {};
      if (settings.openaiLocalApiKey)
        headers["Authorization"] = `Bearer ${settings.openaiLocalApiKey}`;
      const response = await (0, import_obsidian.requestUrl)({
        url: `${baseUrl}/v1/models`,
        method: "GET",
        headers,
        throw: false
      });
      if (response.status !== 200)
        throw new Error(`HTTP ${response.status} - ${response.text}`);
      return "OpenAI (Local) connection OK.";
    }
    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
  }
}
// Builds effective settings by appending answer length instructions based on mode (short/long)
function buildEffectiveSettings(settings, mode) {
  var effectivePrompt = settings.systemPrompt;
  if (mode === "short") {
    effectivePrompt += " Answer in maximum 3-4 sentences. Keep it brief and concise.";
  } else if (mode === "long") {
    effectivePrompt += " Answer in detail with up to 10 sentences. Provide a thorough explanation.";
  }
  return Object.assign({}, settings, { systemPrompt: effectivePrompt });
}
async function getAIResponse(question, settings, mode) {
  var effectiveSettings = buildEffectiveSettings(settings, mode || settings.answerMode);
  switch (effectiveSettings.provider) {
    case "openai":
      return callOpenAI(question, effectiveSettings);
    case "claude":
      return callClaude(question, effectiveSettings);
    case "gemini":
      return callGemini(question, effectiveSettings);
    case "ollama":
      return callOllama(question, effectiveSettings);
    case "openai-local":
      return callOpenAILocal(question, effectiveSettings);
    default:
      throw new Error(`Unknown provider: ${effectiveSettings.provider}`);
  }
}
var AnswerWithAIPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.addCommand({
      id: "answer-with-ai-short",
      name: "Answer selected question with AI (Short)",
      editorCallback: (editor, view) => {
        this.answerSelection(editor, "short");
      }
    });
    this.addCommand({
      id: "answer-with-ai-long",
      name: "Answer selected question with AI (Long)",
      editorCallback: (editor, view) => {
        this.answerSelection(editor, "long");
      }
    });
    this.addSettingTab(new AnswerWithAISettingTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async answerSelection(editor, mode) {
    const answerMode = mode || this.settings.answerMode;
    const selection = editor.getSelection().trim();
    if (!selection) {
      new import_obsidian.Notice("\u26A0\uFE0F Please select a question first.");
      return;
    }
    const modeLabel = answerMode === "long" ? "Long" : "Short";
    const loadingNotice = new import_obsidian.Notice(`\u{1F916} Asking ${this.settings.provider} (${modeLabel})...`, 0);
    try {
      const answer = await getAIResponse(selection, this.settings, answerMode);
      const cursor = editor.getCursor("to");
      const lineEnd = { line: cursor.line, ch: editor.getLine(cursor.line).length };
      editor.replaceRange("\n" + answer, lineEnd);
      loadingNotice.hide();
      new import_obsidian.Notice(`\u2705 ${modeLabel} answer inserted.`);
    } catch (error) {
      loadingNotice.hide();
      const msg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`\u274C Error: ${msg}`);
      console.error("Answer with AI error:", error);
    }
  }
};
// Renders a small "Test connection" button + result text right below the API key field
function addTestConnectionButton(containerEl, plugin) {
  const wrapper = containerEl.createDiv({ cls: "awai-test-connection" });
  const button = wrapper.createEl("button", { text: "Test connection", cls: "awai-test-connection-btn" });
  const result = wrapper.createSpan({ cls: "awai-test-connection-result" });
  button.addEventListener("click", async () => {
    button.disabled = true;
    result.setText("Testing…");
    result.removeClass("awai-test-ok", "awai-test-err");
    try {
      const msg = await testConnection(plugin.settings);
      result.setText("✅ " + msg);
      result.addClass("awai-test-ok");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.setText("❌ " + msg);
      result.addClass("awai-test-err");
    } finally {
      button.disabled = false;
    }
  });
}
// Renders a Model setting as a dropdown populated from the cached model list plus a "Refresh models"
// button that fetches the list from the provider, and a text field for manual entry / override.
function addModelSetting(containerEl, settingTab, opts) {
  const plugin = settingTab.plugin;
  const provider = plugin.settings.provider;
  if (!plugin.settings.cachedModels)
    plugin.settings.cachedModels = {};
  const cached = plugin.settings.cachedModels[provider] || [];
  const current = plugin.settings[opts.key] || "";
  const options = cached.slice();
  if (current && !options.includes(current))
    options.unshift(current);
  const setting = new import_obsidian.Setting(containerEl).setName("Model").setDesc(opts.desc);
  if (options.length > 0) {
    setting.addDropdown((dropdown) => {
      for (const id of options)
        dropdown.addOption(id, id);
      dropdown.setValue(current).onChange(async (value) => {
        plugin.settings[opts.key] = value;
        await plugin.saveSettings();
      });
    });
  }
  setting.addButton((button) => {
    button.setButtonText("Refresh models").onClick(async () => {
      button.setDisabled(true);
      button.setButtonText("Loading…");
      try {
        const models = await fetchModels(plugin.settings);
        if (!plugin.settings.cachedModels)
          plugin.settings.cachedModels = {};
        plugin.settings.cachedModels[provider] = models;
        if (models.length && !models.includes(plugin.settings[opts.key])) {
          plugin.settings[opts.key] = models[0];
        }
        await plugin.saveSettings();
        new import_obsidian.Notice(`✅ Loaded ${models.length} model(s).`);
        settingTab.display();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        new import_obsidian.Notice(`❌ Could not load models: ${msg}`);
        button.setDisabled(false);
        button.setButtonText("Refresh models");
      }
    });
  });
  new import_obsidian.Setting(containerEl).setName("Model (manual)").setDesc(opts.manualDesc || "Type a model id directly if it is not in the list above.").addText(
    (text) => text.setPlaceholder(opts.placeholder || "").setValue(current).onChange(async (value) => {
      plugin.settings[opts.key] = value.trim();
      await plugin.saveSettings();
    })
  );
}
var AnswerWithAISettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h1", { text: "Answer with AI" });
    containerEl.createEl("p", {
      text: "Highlight a question, run the command, and get an AI answer inserted below your selection.",
      cls: "setting-item-description"
    });
    containerEl.createEl("h2", { text: "Provider" });
    new import_obsidian.Setting(containerEl).setName("AI Provider").setDesc("Choose which AI provider to use for answering questions.").addDropdown(
      (dropdown) => dropdown.addOption("openai", "OpenAI (GPT)").addOption("claude", "Claude (Anthropic)").addOption("gemini", "Gemini (Google)").addOption("ollama", "Ollama (Local)").addOption("openai-local", "OpenAI (Local / llama.cpp)").setValue(this.plugin.settings.provider).onChange(async (value) => {
        this.plugin.settings.provider = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.provider === "openai") {
      containerEl.createEl("h2", { text: "OpenAI Settings" });
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Your OpenAI API key.").addText(
        (text) => text.setPlaceholder("sk-...").setValue(this.plugin.settings.openaiApiKey).onChange(async (value) => {
          this.plugin.settings.openaiApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
      addTestConnectionButton(containerEl, this.plugin);
      addModelSetting(containerEl, this, {
        key: "openaiModel",
        desc: "OpenAI model to use. Click 'Refresh models' to load the list from your account.",
        placeholder: "gpt-4o"
      });
    }
    if (this.plugin.settings.provider === "claude") {
      containerEl.createEl("h2", { text: "Claude Settings" });
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Your Anthropic API key.").addText(
        (text) => text.setPlaceholder("sk-ant-...").setValue(this.plugin.settings.claudeApiKey).onChange(async (value) => {
          this.plugin.settings.claudeApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
      addTestConnectionButton(containerEl, this.plugin);
      addModelSetting(containerEl, this, {
        key: "claudeModel",
        desc: "Claude model to use. Click 'Refresh models' to load the list from your account.",
        placeholder: "claude-sonnet-4-20250514"
      });
    }
    if (this.plugin.settings.provider === "gemini") {
      containerEl.createEl("h2", { text: "Gemini Settings" });
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Your Google Gemini API key.").addText(
        (text) => text.setPlaceholder("AI...").setValue(this.plugin.settings.geminiApiKey).onChange(async (value) => {
          this.plugin.settings.geminiApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
      addTestConnectionButton(containerEl, this.plugin);
      addModelSetting(containerEl, this, {
        key: "geminiModel",
        desc: "Gemini model to use. Click 'Refresh models' to load the list from your account.",
        placeholder: "gemini-2.0-flash"
      });
    }
    if (this.plugin.settings.provider === "ollama") {
      containerEl.createEl("h2", { text: "Ollama Settings" });
      new import_obsidian.Setting(containerEl).setName("Base URL").setDesc("URL of your local Ollama server.").addText(
        (text) => text.setPlaceholder("http://localhost:11434").setValue(this.plugin.settings.ollamaBaseUrl).onChange(async (value) => {
          this.plugin.settings.ollamaBaseUrl = value.trim();
          await this.plugin.saveSettings();
        })
      );
      addTestConnectionButton(containerEl, this.plugin);
      addModelSetting(containerEl, this, {
        key: "ollamaModel",
        desc: "Ollama model to use. Click 'Refresh models' to load the installed models.",
        placeholder: "llama3"
      });
    }
    if (this.plugin.settings.provider === "openai-local") {
      containerEl.createEl("h2", { text: "OpenAI (Local) Settings" });
      containerEl.createEl("p", {
        text: "For an OpenAI-compatible local server such as llama.cpp (llama-server), LM Studio, or vLLM. Uses the /v1/chat/completions and /v1/models endpoints.",
        cls: "setting-item-description"
      });
      new import_obsidian.Setting(containerEl).setName("Base URL").setDesc("URL of your local OpenAI-compatible server (without the /v1 suffix).").addText(
        (text) => text.setPlaceholder("http://localhost:8080").setValue(this.plugin.settings.openaiLocalBaseUrl).onChange(async (value) => {
          this.plugin.settings.openaiLocalBaseUrl = value.trim();
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Optional. Only needed if your local server requires an API key (llama.cpp --api-key).").addText(
        (text) => text.setPlaceholder("(usually empty)").setValue(this.plugin.settings.openaiLocalApiKey).onChange(async (value) => {
          this.plugin.settings.openaiLocalApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
      addTestConnectionButton(containerEl, this.plugin);
      addModelSetting(containerEl, this, {
        key: "openaiLocalModel",
        desc: "Model to request. Click 'Refresh models' to load what the server currently has loaded. llama.cpp usually serves a single model regardless of this value.",
        placeholder: "local-model"
      });
    }
    containerEl.createEl("h2", { text: "General" });
    new import_obsidian.Setting(containerEl).setName("Default Answer Mode").setDesc("Short: 3-4 sentences. Long: up to 10 sentences with detailed explanation.").addDropdown(
      (dropdown) => dropdown.addOption("short", "Short (3-4 sentences)").addOption("long", "Long (up to 10 sentences)").setValue(this.plugin.settings.answerMode).onChange(async (value) => {
        this.plugin.settings.answerMode = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("System Prompt").setDesc("System prompt sent to the AI before your question.").addTextArea(
      (text) => text.setValue(this.plugin.settings.systemPrompt).setRows(6).onChange(async (value) => {
        this.plugin.settings.systemPrompt = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Max Tokens").setDesc("Maximum number of tokens in the AI response.").addText(
      (text) => text.setValue(String(this.plugin.settings.maxTokens)).onChange(async (value) => {
        const parsed = parseInt(value);
        if (!isNaN(parsed) && parsed > 0) {
          this.plugin.settings.maxTokens = parsed;
          await this.plugin.saveSettings();
        }
      })
    );
  }
};
