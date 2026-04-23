import { MtuImportDialog } from "./import-dialog.js";
import {
  MODULE_ID,
  buildGmData,
  buildPlayerData,
  fetchStellarObject,
  parseStellarObjectInput
} from "./mtu-api.js";

function checkRequiredSettings() {
  const slug = game.settings.get(MODULE_ID, "campaignSlug");
  const key  = game.settings.get(MODULE_ID, "apiKey");
  if (slug && key) return true;
  Dialog.prompt({
    title:   game.i18n.localize("MTU.warn.configRequired.title"),
    content: `<p>${game.i18n.localize("MTU.warn.configRequired.body")}</p>`,
    label:   game.i18n.localize("MTU.warn.configRequired.ok"),
  });
  return false;
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "apiKey", {
    name: "MTU.settings.apiKey.name",
    hint: "MTU.settings.apiKey.hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    restricted: true,
  });

  game.settings.register(MODULE_ID, "defaultFolderName", {
    name: "MTU.settings.defaultFolderName.name",
    hint: "MTU.settings.defaultFolderName.hint",
    scope: "world",
    config: true,
    type: String,
    default: "MTU Imports",
    restricted: true,
  });

  game.settings.register(MODULE_ID, "campaignSlug", {
    name: "MTU.settings.campaignSlug.name",
    hint: "MTU.settings.campaignSlug.hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    restricted: true,
  });
});

function isV13Plus() {
  return Number(game.release?.generation ?? 0) >= 13;
}

function openMtuImportDialog() {
  if (checkRequiredSettings()) new MtuImportDialog().render(true);
}

function makeMtuButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mtu-import-url";
  btn.innerHTML = `<i class="fas fa-satellite-dish"></i> ${game.i18n.localize("MTU.button.import")}`;
  btn.addEventListener("click", openMtuImportDialog);
  return btn;
}

function addMtuJournalButtonV13(app, html) {
  if (!game.user?.isGM) return;

  // In v13, render hooks for ApplicationV2-style UIs provide an element-like target.
  // Prefer the html argument, then fall back to app.element.
  const root =
    html instanceof HTMLElement ? html :
      app?.element instanceof HTMLElement ? app.element :
        app?.element?.[0] instanceof HTMLElement ? app.element[0] :
          null;

  if (!root) {
    console.warn("MTU | Could not resolve JournalDirectory root element in v13", { app, html });
    return;
  }

  if (root.querySelector(".mtu-import-url")) return;

  // Journal directory still has a top-right header area conceptually.
  // Try a few likely containers first.
  let target =
    root.querySelector(".directory-header .header-actions") ||
    root.querySelector(".directory-header .action-buttons") ||
    root.querySelector(".directory-header");

  if (!target) {
    console.warn("MTU | Could not find journal directory header target", root);
    return;
  }

  // If we are injecting directly into the header, create a wrapper so layout stays tidy.
  if (target.classList.contains("directory-header")) {
    let wrapper = target.querySelector(".mtu-header-controls");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "mtu-header-controls";
      target.appendChild(wrapper);
    }
    target = wrapper;
  }

  target.prepend(makeMtuButton());
}

function addMtuJournalButtonV12(html) {
  if (!game.user?.isGM) return;
  if (html.find(".mtu-import-url").length) return;

  const btn = $(`
    <button type="button" class="mtu-import-url">
      <i class="fas fa-satellite-dish"></i> ${game.i18n.localize("MTU.button.import")}
    </button>
  `);

  btn.on("click", openMtuImportDialog);

  const $target =
    html.find(".directory-header .action-buttons").first().length
      ? html.find(".directory-header .action-buttons").first()
      : html.find(".directory-header").first();

  if ($target.length) {
    $target.prepend(btn);
  }
}

Hooks.on("renderJournalDirectory", (app, html) => {
  if (isV13Plus()) {
    addMtuJournalButtonV13(app, html);
  } else {
    addMtuJournalButtonV12(html);
  }
});

Hooks.on("renderJournalSheet", (app, html) => {
  if (!game.user.isGM) return;

  new ContextMenu(html, ".pages-list .page", [
    {
      name: "MTU.menu.refreshFromMtu",
      icon: '<i class="fas fa-rotate"></i>',
      condition: (li) => {
        const page = getJournalPageFromLi(app, li);
        return !!page?.getFlag(MODULE_ID, "live");
      },
      callback: async (li) => {
        const page = getJournalPageFromLi(app, li);
        if (page) await refreshMtuPage(page, app);
      },
    },
    {
      name: "MTU.menu.editMtuId",
      icon: '<i class="fas fa-pen"></i>',
      condition: (li) => {
        const page = getJournalPageFromLi(app, li);
        return !!page?.getFlag(MODULE_ID, "live");
      },
      callback: async (li) => {
        const page = getJournalPageFromLi(app, li);
        if (page) {
          await editMtuJournalEntryId(app.object);
        }
      },
    },
  ]);
});

Hooks.on("getJournalDirectoryEntryContext", (_html, options) => {
  if (!game.user.isGM) return;

  options.push(
    {
      name: "MTU.menu.refreshFromMtu",
      icon: '<i class="fas fa-rotate"></i>',
      condition: (li) => {
        const entry = getJournalEntryFromLi(li);
        return isMtuJournal(entry);
      },
      callback: async (li) => {
        const entry = getJournalEntryFromLi(li);
        if (entry) await refreshMtuJournalEntry(entry);
      },
    },
    {
      name: "MTU.menu.editMtuId",
      icon: '<i class="fas fa-pen"></i>',
      condition: (li) => {
        const entry = getJournalEntryFromLi(li);
        return isMtuJournal(entry);
      },
      callback: async (li) => {
        const entry = getJournalEntryFromLi(li);
        if (entry) await editMtuJournalEntryId(entry);
      },
    },
    {
      name: "MTU.menu.openImporter",
      icon: '<i class="fas fa-satellite-dish"></i>',
      condition: () => true,
      callback: () => { if (checkRequiredSettings()) new MtuImportDialog().render(true); },
    }
  );
});

function getJournalEntryFromLi(li) {
  const entryId =
    li.data?.("documentId") ??
    li.data?.("entityId") ??
    li.data?.("entryId") ??
    li.attr?.("data-document-id") ??
    li.attr?.("data-entity-id") ??
    li.attr?.("data-entry-id");

  return entryId ? game.journal.get(entryId) : null;
}

function getJournalPageFromLi(app, li) {
  const pageId =
    li.data?.("pageId") ??
    li.data?.("page-id") ??
    li.attr?.("data-page-id");

  return pageId ? app.object.pages.get(pageId) : null;
}

function isMtuJournal(entry) {
  return entry?.getFlag(MODULE_ID, "importSource") === "mytravelleruniverse";
}

function getEntryCampaignSlug(entry) {
  return entry.getFlag(MODULE_ID, "campaignSlug")
    ?? findFirstLiveMtuPage(entry)?.getFlag(MODULE_ID, "campaignSlug")
    ?? game.settings.get(MODULE_ID, "campaignSlug")
    ?? "";
}

function getEntryResourceId(entry) {
  return entry.getFlag(MODULE_ID, "resourceId")
    ?? findFirstLiveMtuPage(entry)?.getFlag(MODULE_ID, "resourceId")
    ?? "";
}

function findFirstLiveMtuPage(entry) {
  return entry.pages.find((page) => !!page.getFlag(MODULE_ID, "live")) ?? null;
}

function findMtuTextPage(entry, mode) {
  return entry.pages.find((page) =>
    page.type === "text" && page.getFlag(MODULE_ID, "mode") === mode
  ) ?? null;
}

function findSystemMapPage(entry) {
  return entry.pages.find((page) =>
    page.type === "image" && !!page.getFlag(MODULE_ID, "systemMap")
  ) ?? null;
}

async function renderMtuContent(mode, payload) {
  const data = mode === "gm" ? buildGmData(payload) : buildPlayerData(payload);
  return renderTemplate(`modules/${MODULE_ID}/templates/mtu-${mode}.html`, data);
}

async function refreshMtuPage(page, app) {
  const campaignSlug = page.getFlag(MODULE_ID, "campaignSlug");
  const resourceId = page.getFlag(MODULE_ID, "resourceId");
  const mode = page.getFlag(MODULE_ID, "mode");

  if (!campaignSlug || !resourceId || !mode) {
    ui.notifications.error(game.i18n.localize("MTU.notify.pageMissingMetadata"));
    return;
  }

  try {
    const payload = await fetchStellarObject(campaignSlug, resourceId);
    const content = await renderMtuContent(mode, payload);

    await page.update({
      "text.content": content,
      "text.format": CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
    });

    app?.render(true);
    ui.notifications.info(game.i18n.localize("MTU.notify.pageRefreshed"));
  } catch (err) {
    console.error(err);
    ui.notifications.error(game.i18n.format("MTU.notify.refreshFailed", { message: err.message }));
  }
}

async function refreshMtuJournalEntry(entry) {
  const campaignSlug = getEntryCampaignSlug(entry);
  const resourceId = getEntryResourceId(entry);

  if (!campaignSlug || !resourceId) {
    ui.notifications.error(game.i18n.localize("MTU.notify.entryMissingMetadata"));
    return;
  }

  try {
    const payload = await fetchStellarObject(campaignSlug, resourceId);
    await updateMtuJournalPages(entry, payload, {
      campaignSlug,
      resourceId,
      updateSystemMap: false,
    });

    entry.sheet?.render(true);
    ui.notifications.info(game.i18n.format("MTU.notify.entryRefreshed", { name: entry.name }));
  } catch (err) {
    console.error(err);
    ui.notifications.error(game.i18n.format("MTU.notify.refreshFailed", { message: err.message }));
  }
}

async function editMtuJournalEntryId(entry) {
  if (!checkRequiredSettings()) return;
  const current = getEntryResourceId(entry);

  new Dialog({
    title: game.i18n.localize("MTU.dialog.editId.title"),
    content: `
      <div class="form-group">
        <label>${game.i18n.localize("MTU.dialog.editId.label")}</label>
        <div class="form-fields">
          <input type="text" id="mtu-new-id" value="${current}" style="width:100%" />
        </div>
        <p class="notes">${game.i18n.localize("MTU.dialog.editId.notes")}</p>
      </div>`,
    buttons: {
      save: {
        icon: '<i class="fas fa-save"></i>',
        label: game.i18n.localize("MTU.dialog.editId.save"),
        callback: async (html) => {
          const raw = String(html.find("#mtu-new-id").val() ?? "").trim();
          if (!raw) return;

          let newResourceId = raw;
          let newCampaignSlug = getEntryCampaignSlug(entry);

          if (!/^\d+$/.test(raw)) {
            try {
              const parsed = parseStellarObjectInput(raw, newCampaignSlug);
              newResourceId = parsed.resourceId;
              newCampaignSlug = parsed.campaignSlug;
            } catch (err) {
              ui.notifications.error(err.message);
              return;
            }
          }

          try {
            const payload = await fetchStellarObject(newCampaignSlug, newResourceId);

            await entry.setFlag(MODULE_ID, "resourceId", newResourceId);
            await entry.setFlag(MODULE_ID, "campaignSlug", newCampaignSlug);

            await updateMtuJournalPages(entry, payload, {
              campaignSlug: newCampaignSlug,
              resourceId: newResourceId,
              updateSystemMap: true,
            });

            entry.sheet?.render(true);
            ui.notifications.info(game.i18n.format("MTU.notify.entryUpdated", { name: entry.name }));
          } catch (err) {
            console.error(err);
            ui.notifications.error(game.i18n.format("MTU.notify.updateFailed", { message: err.message }));
          }
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("MTU.dialog.editId.cancel"),
      },
    },
    default: "save",
  }).render(true);
}

async function updateMtuJournalPages(entry, payload, { campaignSlug, resourceId, updateSystemMap }) {
  const updates = [];

  const playerPage = findMtuTextPage(entry, "player");
  if (playerPage) {
    const playerHtml = await renderMtuContent("player", payload);
    updates.push({
      _id: playerPage.id,
      text: {
        content: playerHtml,
        format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
      },
      flags: {
        [MODULE_ID]: {
          ...playerPage.getFlag(MODULE_ID),
          live: true,
          mode: "player",
          resourceId,
          campaignSlug,
        },
      },
    });
  }

  const gmPage = findMtuTextPage(entry, "gm");
  if (gmPage) {
    const gmHtml = await renderMtuContent("gm", payload);
    updates.push({
      _id: gmPage.id,
      text: {
        content: gmHtml,
        format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,
      },
      flags: {
        [MODULE_ID]: {
          ...gmPage.getFlag(MODULE_ID),
          live: true,
          mode: "gm",
          resourceId,
          campaignSlug,
        },
      },
    });
  }

  if (updateSystemMap) {
    const systemMapPage = findSystemMapPage(entry);
    if (systemMapPage && payload.star_system_map_url) {
      updates.push({
        _id: systemMapPage.id,
        src: payload.star_system_map_url,
      });
    }
  }

  if (updates.length) {
    await entry.updateEmbeddedDocuments("JournalEntryPage", updates);
  }
}
