document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("date-filter");
    const refreshBtn = document.getElementById("refresh-btn");
    const statusEl = document.getElementById("appointments-status");
    const tbody = document.getElementById("appointments-body");
    const headerDateEl = document.getElementById("header-date");

    function formatDateISO(d) {
        return d.toISOString().slice(0, 10);
    }

    function setStatus(text, type = "info") {
        statusEl.textContent = text;
        if (!text) {
            statusEl.style.color = "";
            return;
        }
        statusEl.style.color =
            type === "error" ? "#dc2626" : type === "success" ? "#16a34a" : "#6b7280";
    }

    function formatTime(hhmmss) {
        // "14:00:00" -> "14:00"
        return hhmmss ? hhmmss.slice(0, 5) : "";
    }

    function formatStatusBadge(status) {
        const span = document.createElement("span");
        span.classList.add("appointment-status");
        const s = (status || "").toLowerCase();

        if (s === "confirmed") span.classList.add("confirmed");
        else if (s === "cancelled") span.classList.add("cancelled");
        else span.classList.add("pending");

        span.textContent =
            s === "confirmed"
                ? "Confirmado"
                : s === "cancelled"
                    ? "Cancelado"
                    : "Pendente";

        return span;
    }

    function renderAppointments(list) {
        tbody.innerHTML = "";
        if (!list || list.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 5;
            td.textContent = "Nenhum agendamento para esta data.";
            td.style.color = "#6b7280";
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        for (const ap of list) {
            const tr = document.createElement("tr");

            const tdTime = document.createElement("td");
            tdTime.textContent = formatTime(ap.start_time);
            tr.appendChild(tdTime);

            const tdCustomer = document.createElement("td");
            tdCustomer.textContent = `${ap.customer_name || ""} (${ap.customer_phone || "-"})`;
            tr.appendChild(tdCustomer);

            const tdService = document.createElement("td");
            tdService.textContent = ap.service_name || "-";
            tr.appendChild(tdService);

            const tdChannel = document.createElement("td");
            tdChannel.textContent = ap.channel || "-";
            tr.appendChild(tdChannel);

            const tdStatus = document.createElement("td");
            tdStatus.appendChild(formatStatusBadge(ap.status));
            tr.appendChild(tdStatus);

            const tdActions = document.createElement("td");
            if (ap.customer_id) {
                const blockBtn = document.createElement("button");
                blockBtn.textContent = "Bloquear";
                blockBtn.style.border = "none";
                blockBtn.style.borderRadius = "999px";
                blockBtn.style.padding = "4px 10px";
                blockBtn.style.fontSize = "0.8rem";
                blockBtn.style.cursor = "pointer";
                blockBtn.style.backgroundColor = "#fee2e2";
                blockBtn.style.color = "#b91c1c";

                blockBtn.addEventListener("click", async () => {
                    
                    const reason = window.prompt("Motivo do bloqueio:", "Bloqueado via painel");
                    if (reason === null) return; 

                    
                    showDangerConfirm(
                        "Bloquear cliente",
                        `Tem certeza que deseja bloquear ${ap.customer_name || ""} (${ap.customer_phone || "-"})?<br><br><strong>Motivo:</strong> ${reason}`,
                        "Bloquear",
                        async () => {
                            try {
                                setStatus("Bloqueando cliente...");
                                await window.blockCustomer(ap.customer_id, reason);
                                showSuccess(
                                    "Cliente bloqueado!",
                                    "O cliente foi bloqueado com sucesso.",
                                    () => {
                                        setStatus("Cliente bloqueado com sucesso.", "success");
                                        loadAppointments();
                                    }
                                );
                            } catch (err) {
                                console.error(err);
                                showError("Erro ao bloquear", "Não foi possível bloquear o cliente.");
                                setStatus("Erro ao bloquear cliente.", "error");
                            }
                        }
                    );
                });


                tdActions.appendChild(blockBtn);
            } else {
                tdActions.textContent = "-";
            }
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        }
    }

    async function loadAppointments() {
        try {
            const dateValue = dateInput.value || null;
            setStatus("Carregando agendamentos...");
            const list = await window.getAppointments(dateValue);
            renderAppointments(list);
            setStatus("Agendamentos carregados.");
        } catch (err) {
            console.error(err);
            setStatus("Erro ao carregar agendamentos.", "error");
        }
    }

    // Inicializa com a data de hoje
    const today = new Date();
    const todayISO = formatDateISO(today);
    dateInput.value = todayISO;
    headerDateEl.textContent = `Agenda de ${todayISO}`;

    refreshBtn.addEventListener("click", () => {
        headerDateEl.textContent = `Agenda de ${dateInput.value || todayISO}`;
        loadAppointments();
    });

    loadAppointments();
});
