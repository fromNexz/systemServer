document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.getElementById("customers-body");
  const modal = document.getElementById("block-modal");
  const modalText = document.getElementById("block-modal-text");
  const reasonInput = document.getElementById("block-reason");
  const cancelBtn = document.getElementById("block-cancel");
  const confirmBtn = document.getElementById("block-confirm");

  let currentCustomer = null;

  function formatDate(d) {
    if (!d) return "-";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("pt-BR");
  }

  function openModal(customer) {
    currentCustomer = customer;
    modalText.textContent = `${customer.name || ""} (${customer.phone})`;
    reasonInput.value = "";
    modal.classList.remove("hidden");
  }

  function closeModal() {
    currentCustomer = null;
    modal.classList.add("hidden");
  }

  cancelBtn.addEventListener("click", closeModal);

  confirmBtn.addEventListener("click", async () => {
    if (!currentCustomer) return;
    const reason = reasonInput.value.trim() || "Bloqueado via painel";
    confirmBtn.disabled = true;

    try {
      await window.blockCustomer(currentCustomer.id, reason);
      closeModal();
      showSuccess(
        "Cliente bloqueado!",
        `${currentCustomer.name || currentCustomer.phone} foi bloqueado com sucesso.`,
        () => {
          loadCustomers();
        }
      );
    } catch (err) {
      console.error(err);
      showError("Erro ao bloquear", "Não foi possível bloquear o cliente.");
    } finally {
      confirmBtn.disabled = false;
    }
  });

  async function deleteCustomerHandler(customer) {
    showDangerConfirm(
      "Excluir cliente",
      `Tem certeza que deseja excluir <strong>${customer.name || customer.phone}</strong>?<br><br>Esta ação não pode ser desfeita!`,
      "Excluir",
      async () => {
        try {
          await window.deleteCustomer(customer.id);
          showSuccess(
            "Cliente excluído!",
            "O cliente foi excluído com sucesso.",
            () => {
              loadCustomers();
            }
          );
        } catch (err) {
          console.error(err);
          showError(
            "Erro ao excluir",
            err.message || "Não foi possível excluir o cliente."
          );
        }
      }
    );
  }

  async function loadCustomers() {
    tbody.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";
    try {
      const customers = await window.getCustomers();
      tbody.innerHTML = "";

      if (!customers.length) {
        tbody.innerHTML = "<tr><td colspan='6'>Nenhum cliente encontrado.</td></tr>";
        return;
      }

      for (const c of customers) {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.textContent = c.name || "-";
        tr.appendChild(tdName);

        const tdPhone = document.createElement("td");
        tdPhone.textContent = c.phone;
        tr.appendChild(tdPhone);

        const tdCount = document.createElement("td");
        tdCount.textContent = c.total_appointments || 0;
        tr.appendChild(tdCount);

        const tdLast = document.createElement("td");
        tdLast.textContent = formatDate(c.last_appointment_date);
        tr.appendChild(tdLast);

        const tdStatus = document.createElement("td");
        const badge = document.createElement("span");
        badge.textContent = c.is_blocked ? "Bloqueado" : "Ativo";
        badge.className = c.is_blocked ? "badge badge-danger" : "badge badge-success";
        tdStatus.appendChild(badge);
        tr.appendChild(tdStatus);

        const tdActions = document.createElement("td");
        tdActions.style.display = "flex";
        tdActions.style.gap = "0.5rem";

        // Botão Bloquear/Desbloquear
        const btnBlock = document.createElement("button");
        if (c.is_blocked) {
          btnBlock.textContent = "Desbloquear";
          btnBlock.className = "btn";
          btnBlock.addEventListener("click", async () => {
            showConfirm(
              "Desbloquear cliente",
              `Deseja desbloquear ${c.name || c.phone}?`,
              async () => {
                try {
                  await window.unblockCustomer(c.id);
                  showSuccess(
                    "Cliente desbloqueado!",
                    "O cliente foi desbloqueado com sucesso.",
                    () => {
                      loadCustomers();
                    }
                  );
                } catch (err) {
                  console.error(err);
                  showError("Erro ao desbloquear", "Não foi possível desbloquear o cliente.");
                }
              }
            );
          });
        } else {
          btnBlock.textContent = "Bloquear";
          btnBlock.className = "btn btn-danger";
          btnBlock.addEventListener("click", () => openModal(c));
        }
        tdActions.appendChild(btnBlock);

        // Botão Excluir
        const btnDelete = document.createElement("button");
        btnDelete.textContent = "Excluir";
        btnDelete.className = "btn btn-danger";
        btnDelete.style.background = "#dc3545";
        btnDelete.addEventListener("click", () => deleteCustomerHandler(c));
        tdActions.appendChild(btnDelete);

        tr.appendChild(tdActions);

        tbody.appendChild(tr);
      }
    } catch (err) {
      console.error(err);
      tbody.innerHTML = "<tr><td colspan='6'>Erro ao carregar clientes.</td></tr>";
    }
  }

  loadCustomers();
});