// /painel/js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const headerDate = document.getElementById("header-date");

    // Mostrar data de hoje no header
    const today = new Date();
    headerDate.textContent = today.toLocaleDateString("pt-BR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });


    const filterDate = document.getElementById("filter-date");
    filterDate.value = today.toISOString().split('T')[0];

    loadDashboardStats();
    loadAppointments();
});

async function loadDashboardStats() {
    try {
        const stats = await fetch("/dashboard/stats").then(r => r.json());

        document.getElementById("stat-appointments-today").textContent = stats.appointments_today;
        document.getElementById("stat-pending").textContent = stats.pending_today;
        document.getElementById("stat-confirmed").textContent = stats.confirmed_today;
        document.getElementById("stat-customers").textContent = stats.total_customers;
        document.getElementById("stat-blocked").textContent = stats.blocked_customers;

        const chatbotEl = document.getElementById("stat-chatbot");
        const chatbotCard = document.getElementById("chatbot-card");

        if (stats.chatbot_status === "ai") {
            chatbotEl.textContent = "IA ativo";
            chatbotCard.classList.add("stat-success");
        } else if (stats.chatbot_status === "scheduled") {
            chatbotEl.textContent = "Ativo";           
            chatbotCard.classList.add("stat-success"); 
        } else if (stats.chatbot_status === "qr_pending") {
            chatbotEl.textContent = "Aguardando QR";
            chatbotCard.classList.add("stat-warning");
        } else {
            chatbotEl.textContent = "Inativo";
            chatbotCard.classList.add("stat-muted");
        }

    } catch (err) {
        console.error("Erro ao carregar stats:", err);
    }
}

async function loadAppointments() {
    const filterDate = document.getElementById("filter-date").value;
    const tbody = document.getElementById("appointments-body");
    tbody.innerHTML = "<tr><td colspan='8'>Carregando...</td></tr>";

    try {
        const url = filterDate ? `/appointments/?date=${filterDate}` : '/appointments/';
        const appointments = await fetch(url).then(r => r.json());

        tbody.innerHTML = "";

        if (!appointments || appointments.length === 0) {
            tbody.innerHTML = "<tr><td colspan='8'>Nenhum agendamento encontrado.</td></tr>";
            return;
        }

        for (const ap of appointments) {
            const tr = document.createElement("tr");

            // ID
            const tdId = document.createElement("td");
            tdId.textContent = ap.id;
            tr.appendChild(tdId);

            // Data
            const tdDate = document.createElement("td");
            tdDate.textContent = new Date(ap.date).toLocaleDateString("pt-BR");
            tr.appendChild(tdDate);

            // Hora
            const tdTime = document.createElement("td");
            tdTime.textContent = ap.start_time ? ap.start_time.slice(0, 5) : "-";
            tr.appendChild(tdTime);

            // Cliente
            const tdCustomer = document.createElement("td");
            tdCustomer.textContent = ap.customer_name || "?";
            tr.appendChild(tdCustomer);

            // Telefone
            const tdPhone = document.createElement("td");
            tdPhone.textContent = ap.customer_phone || "-";
            tr.appendChild(tdPhone);

            // Serviço
            const tdService = document.createElement("td");
            tdService.textContent = ap.service_name || "-";
            tr.appendChild(tdService);

            // Status
            const tdStatus = document.createElement("td");
            const badge = document.createElement("span");
            badge.classList.add("appointment-status");
            const s = (ap.status || "").toLowerCase();

            if (s === "confirmed") badge.classList.add("confirmed");
            else if (s === "cancelled") badge.classList.add("cancelled");
            else badge.classList.add("pending");

            badge.textContent =
                s === "confirmed" ? "Confirmado" :
                    s === "cancelled" ? "Cancelado" : "Pendente";

            tdStatus.appendChild(badge);
            tr.appendChild(tdStatus);

            // Ações
            const tdActions = document.createElement("td");
            tdActions.style.display = "flex";
            tdActions.style.gap = "0.5rem";

            const btnEdit = document.createElement("button");
            btnEdit.textContent = "Editar";
            btnEdit.style.cssText = "padding: 0.25rem 0.75rem; background: #ffc107; color: #000; border: none; border-radius: 4px; cursor: pointer;";
            btnEdit.onclick = () => openEditModal(ap);
            tdActions.appendChild(btnEdit);

            const btnDelete = document.createElement("button");
            btnDelete.textContent = "Excluir";
            btnDelete.style.cssText = "padding: 0.25rem 0.75rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;";
            btnDelete.onclick = () => deleteAppointment(ap.id);
            tdActions.appendChild(btnDelete);

            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        }

    } catch (err) {
        console.error("Erro ao carregar agendamentos:", err);
        tbody.innerHTML = "<tr><td colspan='8'>Erro ao carregar agendamentos.</td></tr>";
    }
}

function clearFilter() {
    document.getElementById("filter-date").value = "";
    loadAppointments();
}

function openEditModal(appointment) {
    document.getElementById("edit-id").value = appointment.id;
    document.getElementById("edit-date").value = appointment.date;
    document.getElementById("edit-time").value = appointment.start_time;
    document.getElementById("edit-status").value = appointment.status;

    const modal = document.getElementById("edit-modal");
    modal.style.display = "flex";
}

function closeEditModal() {
    document.getElementById("edit-modal").style.display = "none";
}

document.getElementById("edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("edit-id").value;
    const date = document.getElementById("edit-date").value;
    const time = document.getElementById("edit-time").value;
    const status = document.getElementById("edit-status").value;

    // Adicionar segundos ao horário se não tiver
    const timeWithSeconds = time.includes(':') && time.split(':').length === 2
        ? time + ":00"
        : time;

    const payload = {
        date: date,
        start_time: timeWithSeconds,
        status: status
    };

    console.log("Enviando:", payload);  // Debug

    try {
        const response = await fetch(`/appointments/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erro completo do servidor:", JSON.stringify(errorData, null, 2));

            // Mostrar detalhes do erro se disponível
            if (errorData.detail && Array.isArray(errorData.detail)) {
                errorData.detail.forEach(err => {
                    console.error(`Campo: ${err.loc?.join('.')}, Erro: ${err.msg}`);
                });
            }

            throw new Error("Erro ao atualizar");
        }

        showSuccess(
            "Sucesso!",
            "Agendamento atualizado com sucesso!",
            () => {
                closeEditModal();
                loadAppointments();
                loadDashboardStats();
            }
        );
    } catch (err) {
        console.error("Erro:", err);
        showError(
            "Erro ao atualizar",
            "Não foi possível atualizar o agendamento. Verifique o console (F12) para mais detalhes."
        );
    }

});

async function deleteAppointment(id) {
    showDangerConfirm(
        "Excluir agendamento",
        "Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.",
        "Excluir",
        async () => {
            try {
                const response = await fetch(`/appointments/${id}`, {
                    method: "DELETE"
                });
                if (!response.ok) throw new Error("Erro ao excluir");

                showSuccess(
                    "Sucesso!",
                    "Agendamento excluído com sucesso!",
                    () => {
                        loadAppointments();
                        loadDashboardStats();
                    }
                );
            } catch (err) {
                console.error("Erro:", err);
                showError(
                    "Erro ao excluir",
                    "Não foi possível excluir o agendamento. Tente novamente."
                );
            }
        }
    );
}
