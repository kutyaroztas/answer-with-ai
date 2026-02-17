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
  systemPrompt: "You are a helpful assistant. Answer the question concisely and clearly. Use markdown formatting.",
  maxTokens: 1024
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
async function getAIResponse(question, settings) {
  switch (settings.provider) {
    case "openai":
      return callOpenAI(question, settings);
    case "claude":
      return callClaude(question, settings);
    case "gemini":
      return callGemini(question, settings);
    default:
      throw new Error(`Unknown provider: ${settings.provider}`);
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
      id: "answer-with-ai",
      name: "Answer selected question with AI",
      editorCallback: (editor, view) => {
        this.answerSelection(editor);
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
  async answerSelection(editor) {
    const selection = editor.getSelection().trim();
    if (!selection) {
      new import_obsidian.Notice("\u26A0\uFE0F Please select a question first.");
      return;
    }
    const loadingNotice = new import_obsidian.Notice(`\u{1F916} Asking ${this.settings.provider}...`, 0);
    try {
      const answer = await getAIResponse(selection, this.settings);
      const cursor = editor.getCursor("to");
      const answerBlock = `

> [!ai]+ AI Answer (${this.settings.provider})
> ${answer.split("\n").join("\n> ")}
`;
      const lineEnd = { line: cursor.line, ch: editor.getLine(cursor.line).length };
      editor.replaceRange(answerBlock, lineEnd);
      loadingNotice.hide();
      new import_obsidian.Notice("\u2705 Answer inserted.");
    } catch (error) {
      loadingNotice.hide();
      const msg = error instanceof Error ? error.message : String(error);
      new import_obsidian.Notice(`\u274C Error: ${msg}`);
      console.error("Answer with AI error:", error);
    }
  }
};
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
      (dropdown) => dropdown.addOption("openai", "OpenAI (GPT)").addOption("claude", "Claude (Anthropic)").addOption("gemini", "Gemini (Google)").setValue(this.plugin.settings.provider).onChange(async (value) => {
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
      new import_obsidian.Setting(containerEl).setName("Model").setDesc("OpenAI model to use (e.g. gpt-4o, gpt-4o-mini, gpt-3.5-turbo)").addText(
        (text) => text.setValue(this.plugin.settings.openaiModel).onChange(async (value) => {
          this.plugin.settings.openaiModel = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.provider === "claude") {
      containerEl.createEl("h2", { text: "Claude Settings" });
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Your Anthropic API key.").addText(
        (text) => text.setPlaceholder("sk-ant-...").setValue(this.plugin.settings.claudeApiKey).onChange(async (value) => {
          this.plugin.settings.claudeApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian.Setting(containerEl).setName("Model").setDesc("Claude model to use (e.g. claude-sonnet-4-20250514, claude-3-haiku-20240307)").addText(
        (text) => text.setValue(this.plugin.settings.claudeModel).onChange(async (value) => {
          this.plugin.settings.claudeModel = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.provider === "gemini") {
      containerEl.createEl("h2", { text: "Gemini Settings" });
      new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Your Google Gemini API key.").addText(
        (text) => text.setPlaceholder("AI...").setValue(this.plugin.settings.geminiApiKey).onChange(async (value) => {
          this.plugin.settings.geminiApiKey = value.trim();
          await this.plugin.saveSettings();
        })
      );
      new import_obsidian.Setting(containerEl).setName("Model").setDesc("Gemini model to use (e.g. gemini-2.0-flash, gemini-1.5-pro)").addText(
        (text) => text.setValue(this.plugin.settings.geminiModel).onChange(async (value) => {
          this.plugin.settings.geminiModel = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
    containerEl.createEl("h2", { text: "General" });
    new import_obsidian.Setting(containerEl).setName("System Prompt").setDesc("System prompt sent to the AI before your question.").addTextArea(
      (text) => text.setValue(this.plugin.settings.systemPrompt).onChange(async (value) => {
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
