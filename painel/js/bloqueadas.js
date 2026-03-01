document.addEventListener("DOMContentLoaded", () => {
    const tbody = document.getElementById("blocked-body");
    const btnAdd = document.getElementById("btn-add-block");
    const inputPhone = document.getElementById("input-phone");
    const inputName = document.getElementById("input-name");
    const inputReason = document.getElementById("input-reason");

    
    const headerDate = document.getElementById("header-date");
    if (headerDate) {
        headerDate.textContent = new Date().toLocaleDateString("pt-BR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
    }

    function formatDate(d) {
        if (!d) return "-";
        const date = new Date(d);
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("pt-BR");
    }

    async function loadBlocked() {
        tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";
        try {
            const customers = await window.getCustomers();
            const blocked = customers.filter(c => c.is_blocked);

            tbody.innerHTML = "";

            if (blocked.length === 0) {
                tbody.innerHTML = "<tr><td colspan='5'>Nenhum número bloqueado.</td></tr>";
                return;
            }

            for (const c of blocked) {
                const tr = document.createElement("tr");

                const tdName = document.createElement("td");
                tdName.textContent = c.name || "-";
                tr.appendChild(tdName);

                const tdPhone = document.createElement("td");
                tdPhone.textContent = c.phone;
                tr.appendChild(tdPhone);

                const tdReason = document.createElement("td");
                tdReason.textContent = c.blocked_reason || "-";
                tr.appendChild(tdReason);

                const tdDate = document.createElement("td");
                tdDate.textContent = formatDate(c.last_appointment_date);
                tr.appendChild(tdDate);

                const tdActions = document.createElement("td");
                const btnUnblock = document.createElement("button");
                btnUnblock.textContent = "Desbloquear";
                btnUnblock.className = "btn-action btn-unblock";
                btnUnblock.addEventListener("click", () => {
                    window.showConfirm(
                        "Desbloquear cliente",
                        `Deseja desbloquear ${c.name || c.phone}? Ela voltará a receber respostas do chatbot.`,
                        async () => {
                            try {
                                await window.unblockCustomer(c.id);
                                window.showSuccess("Desbloqueada!", `${c.name || c.phone} foi desbloqueada com sucesso.`, loadBlocked);
                            } catch (err) {
                                window.showError("Erro", "Não foi possível desbloquear.");
                            }
                        }
                    );
                });
                tdActions.appendChild(btnUnblock);
                tr.appendChild(tdActions);

                tbody.appendChild(tr);
            }
        } catch (err) {
            console.error(err);
            tbody.innerHTML = "<tr><td colspan='5'>Erro ao carregar bloqueadas.</td></tr>";
        }
    }

    // Adicionar número manualmente
    btnAdd.addEventListener("click", async () => {
        const phone = inputPhone.value.trim();
        const name = inputName.value.trim() || "Bloqueada manualmente";
        const reason = inputReason.value.trim() || "Bloqueado via painel";

        if (!phone) {
            window.showError("Campo obrigatório", "Informe o número de telefone.");
            return;
        }

        if (!/^\d{10,15}$/.test(phone)) {
            window.showError("Número inválido", "Use apenas números com DDI. Ex: 5551999999999");
            return;
        }

        try {
            btnAdd.disabled = true;
            btnAdd.textContent = "Bloqueando...";

            // Primeiro cria o cliente se não existir, depois bloqueia
            const res = await fetch("/customers/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, name, channel: "manual" })
            });

            let customerId;
            if (res.ok) {
                const created = await res.json();
                customerId = created.id;
            } else {
                // Se já existe, busca pelo número
                const all = await window.getCustomers();
                const existing = all.find(c => c.phone === phone);
                if (existing) {
                    customerId = existing.id;
                } else {
                    throw new Error("Não foi possível criar o cliente.");
                }
            }

            await window.blockCustomer(customerId, reason);

            inputPhone.value = "";
            inputName.value = "";
            inputReason.value = "";

            window.showSuccess("Bloqueado!", `O número ${phone} foi bloqueado com sucesso.`, loadBlocked);
        } catch (err) {
            console.error(err);
            window.showError("Erro ao bloquear", err.message || "Tente novamente.");
        } finally {
            btnAdd.disabled = false;
            btnAdd.textContent = "+ Bloquear número";
        }
    });

    loadBlocked();
});
