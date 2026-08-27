export interface AdminConfirmationOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

let activeDialog: HTMLDialogElement | null = null;

export function confirmAdminAction(options: AdminConfirmationOptions): Promise<boolean> {
  activeDialog?.remove();

  const dialog = document.createElement("dialog");
  dialog.className = "fixed inset-0 m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50";
  dialog.setAttribute("aria-labelledby", "atomic-admin-confirm-title");
  dialog.setAttribute("aria-describedby", "atomic-admin-confirm-message");
  dialog.innerHTML = `
    <div class="space-y-5 p-6">
      <div class="space-y-2">
        <h2 id="atomic-admin-confirm-title" class="text-lg font-semibold"></h2>
        <p id="atomic-admin-confirm-message" class="text-sm text-muted-foreground"></p>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" data-admin-confirm-cancel class="rounded-md border px-4 py-2 text-sm"></button>
        <button type="button" data-admin-confirm-submit class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"></button>
      </div>
    </div>`;

  const title = dialog.querySelector<HTMLElement>("#atomic-admin-confirm-title");
  const message = dialog.querySelector<HTMLElement>("#atomic-admin-confirm-message");
  const cancel = dialog.querySelector<HTMLButtonElement>("[data-admin-confirm-cancel]");
  const submit = dialog.querySelector<HTMLButtonElement>("[data-admin-confirm-submit]");
  if (!title || !message || !cancel || !submit) return Promise.resolve(false);
  title.textContent = options.title;
  message.textContent = options.message;
  cancel.textContent = options.cancelLabel;
  submit.textContent = options.confirmLabel;

  document.body.append(dialog);
  activeDialog = dialog;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      if (activeDialog === dialog) activeDialog = null;
      resolve(value);
    };
    cancel.addEventListener("click", () => finish(false));
    submit.addEventListener("click", () => finish(true));
    dialog.addEventListener("cancel", () => finish(false), { once: true });
    dialog.addEventListener("close", () => finish(false), { once: true });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") finish(false);
    });
    dialog.showModal();
    submit.focus();
  });
}
