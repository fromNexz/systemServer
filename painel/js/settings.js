document.addEventListener("DOMContentLoaded", () => {
  const botTypeEl = document.getElementById("bot-type");
  const openEl = document.getElementById("open-hour");
  const closeEl = document.getElementById("close-hour");
  const notesEl = document.getElementById("notes");
  const saveBtn = document.getElementById("save-settings");
  const statusEl = document.getElementById("settings-status");
  const headerBotTypeEl = document.getElementById("header-bot-type");

  function setStatus(text, type = "info") {
    statusEl.textContent = text;
    if (!text) { statusEl.style.color = ""; return; }
    statusEl.style.color =
      type === "error" ? "#dc2626" : type === "success" ? "#16a34a" : "#6b7280";
  }

  function formatBotTypeLabel(botType) {
    if (botType === "ai") return "Chatbot: IA";
    return "Chatbot: Programado";
  }

  async function loadSettings() {
    try {
      setStatus("Carregando configurações...");
      const data = await window.getChatbotSettings();
      if (data.active_bot_type) botTypeEl.value = data.active_bot_type;
      if (data.business_open_hour) openEl.value = data.business_open_hour.slice(0, 5);
      if (data.business_close_hour) closeEl.value = data.business_close_hour.slice(0, 5);
      if (data.notes) notesEl.value = data.notes;
      headerBotTypeEl.textContent = formatBotTypeLabel(data.active_bot_type);
      setStatus("Configurações carregadas.");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao carregar configurações.", "error");
    }
  }

  saveBtn.addEventListener("click", async () => {
    try {
      setStatus("Salvando configurações...");
      const payload = {
        active_bot_type: botTypeEl.value || null,
        business_open_hour: openEl.value || null,
        business_close_hour: closeEl.value || null,
        notes: notesEl.value || null
      };
      const updated = await window.updateChatbotSettings(payload);
      headerBotTypeEl.textContent = formatBotTypeLabel(updated.active_bot_type);
      setStatus("Configurações salvas com sucesso.", "success");
    } catch (err) {
      console.error(err);
      setStatus("Erro ao salvar configurações.", "error");
    }
  });

  loadSettings();
});
