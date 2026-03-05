const API_BASE_URL = "/api";

async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} falhou (${res.status}): ${text}`);
  }
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT ${path} falhou (${res.status}): ${text}`);
  }
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include"
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PATCH ${path} falhou (${res.status}): ${text}`);
  }
  return res.json();
}


window.getChatbotSettings = function () {
  return apiGet("/settings/chatbot");
};

window.updateChatbotSettings = function (payload) {
  return apiPut("/settings/chatbot", payload);
};

window.getAppointments = function (date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiGet(`/appointments/${query}`);
};

window.blockCustomer = function (customerId, reason) {
  return apiPatch(`/customers/${customerId}/block`, {
    is_blocked: true,
    blocked_reason: reason || "Bloqueado via painel"
  });
};

window.getCustomers = function () {
  return apiGet("/customers/");
};

window.blockCustomer = function (customerId, reason) {
  return apiPatch(`/customers/${customerId}/block`, {
    is_blocked: true,
    blocked_reason: reason || "Bloqueado via painel"
  });
};

window.unblockCustomer = function (customerId) {
  return apiPatch(`/customers/${customerId}/block`, {
    is_blocked: false,
    blocked_reason: null
  });
};

window.deleteCustomer = async function(customerId) {
  const response = await fetch(`/api/customers/${customerId}`, {
    method: 'DELETE',
    credentials: "include"
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erro ao excluir cliente');
  }
  return response.json();
};
