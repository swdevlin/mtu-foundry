import { MtuImportDialog } from "./import-dialog.js";
import {
  MODULE_ID,
  buildGmData,
  buildOverviewData,
  buildPlayerData,
  buildSystemContext,
  buildTransitData,
  fetchStarSystem,
  findMainWorld,
  normalizeBodyPayload,
} from "./mtu-api.js";

function isV13Plus() {
  return Number(game.release?.generation ?? 0) >= 13;
}

function checkRequiredSettings() {
  const slug = game.settings.get(MODULE_ID, "campaignSlug");
  const key = game.settings.get(MODULE_ID, "apiKey");
  if (slug && key) return true;

  Dialog.prompt({
    title: game.i18n.localize("MTU.warn.configRequired.title"),
    content: `<p>${game.i18n.localize("MTU.warn.configRequired.body")}</p>`,
    label: game.i18n.localize("MTU.warn.configRequired.ok")
  });

  return false;
}

function openMtuImportDialog() {
  if (checkRequiredSettings()) new MtuImportDialog().render(true);
}

/* -------------------------------- */
/* Init                             */
/* -------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "apiKey", {
    name: "MTU.settings.apiKey.name",
    hint: "MTU.settings.apiKey.hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    restricted: true
  });

  game.settings.register(MODULE_ID, "defaultFolderName", {
    name: "MTU.settings.defaultFolderName.name",
    hint: "MTU.settings.defaultFolderName.hint",
    scope: "world",
    config: true,
    type: String,
    default: "MTU Imports",
    restricted: true
  });

  game.settings.register(MODULE_ID, "campaignSlug", {
    name: "MTU.settings.campaignSlug.name",
    hint: "MTU.settings.campaignSlug.hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    restricted: true
  });

  game.settings.register(MODULE_ID, "mDrive", {
    name: "MTU.settings.mDrive.name",
    hint: "MTU.settings.mDrive.hint",
    scope: "world",
    config: false,
    type: Number,
    default: 1,
    restricted: true
  });

  if (isV13Plus()) {
    patchV13JournalDirectoryContext();
  }
});

/* -------------------------------- */
/* Journal directory button         */
/* -------------------------------- */

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

  let target =
    root.querySelector(".directory-header .header-actions") ||
    root.querySelector(".directory-header .action-buttons") ||
    root.querySelector(".directory-header");

  if (!target) {
    console.warn("MTU | Could not find journal directory header target", root);
    return;
  }

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

/* -------------------------------- */
/* Shared helpers                   */
/* -------------------------------- */

function getElementFromMaybeJquery(value) {
  if (value instanceof HTMLElement) return value;
  if (value?.[0] instanceof HTMLElement) return value[0];
  return null;
}

function getJournalEntryFromLi(li) {
  const entryId =
    li?.data?.("documentId") ??
    li?.data?.("entityId") ??
    li?.data?.("entryId") ??
    li?.attr?.("data-document-id") ??
    li?.attr?.("data-entity-id") ??
    li?.attr?.("data-entry-id");

  if (entryId) return game.journal.get(entryId);

  const el = getElementFromMaybeJquery(li);
  if (!el) return null;

  const domEntryId =
    el.dataset?.documentId ||
    el.dataset?.entityId ||
    el.dataset?.entryId ||
    el.getAttribute("data-document-id") ||
    el.getAttribute("data-entity-id") ||
    el.getAttribute("data-entry-id");

  return domEntryId ? game.journal.get(domEntryId) : null;
}

function getJournalPageFromLi(app, li) {
  const pageId =
    li?.data?.("pageId") ??
    li?.data?.("page-id") ??
    li?.attr?.("data-page-id");

  if (pageId) return app.object.pages.get(pageId);

  const el = getElementFromMaybeJquery(li);
  if (!el) return null;

  const domPageId =
    el.dataset?.pageId ||
    el.getAttribute("data-page-id");

  return domPageId ? app.object.pages.get(domPageId) : null;
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

/* -------------------------------- */
/* Journal sheet page context menu  */
/* -------------------------------- */

function getV12JournalSheetPageContextOptions(app) {
  return [
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
      }
    },
  ];
}

function getV13JournalSheetPageContextOptions(app) {
  return [
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
      }
    }
  ];
}

Hooks.on("renderJournalSheet", (app, html) => {
  if (!game.user?.isGM) return;

  if (!isV13Plus()) {
    new ContextMenu(html, ".pages-list .page", getV12JournalSheetPageContextOptions(app));
    return;
  }

  const root =
    html instanceof HTMLElement ? html :
      app?.element instanceof HTMLElement ? app.element :
        app?.element?.[0] instanceof HTMLElement ? app.element[0] :
          null;

  if (!root) {
    console.warn("MTU | Could not resolve JournalSheet root element in v13", { app, html });
    return;
  }

  new ContextMenu(root, ".pages-list .page", getV13JournalSheetPageContextOptions(app));
});

/* -------------------------------- */
/* Journal directory context menu   */
/* -------------------------------- */

function getV13JournalDirectoryContextOptions() {
  return [
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
      }
    },
    {
      name: "MTU.menu.openImporter",
      icon: '<i class="fas fa-satellite-dish"></i>',
      condition: () => true,
      callback: async () => {
        openMtuImportDialog();
      }
    }
  ];
}

function patchV13JournalDirectoryContext() {
  const JournalDirectoryClass = foundry?.applications?.sidebar?.tabs?.JournalDirectory;
  if (!JournalDirectoryClass) {
    console.warn("MTU | Could not find JournalDirectory class for v13 context patch");
    return;
  }

  if (JournalDirectoryClass.prototype._mtuPatchedEntryContextOptions) return;

  const original = JournalDirectoryClass.prototype._getEntryContextOptions;
  if (typeof original !== "function") {
    console.warn("MTU | JournalDirectory._getEntryContextOptions is not available");
    return;
  }

  JournalDirectoryClass.prototype._getEntryContextOptions = function (...args) {
    const options = original.call(this, ...args) ?? [];

    if (!game.user?.isGM) return options;
    if (options.some((o) => o?.name === "MTU.menu.refreshFromMtu")) return options;

    options.push(...getV13JournalDirectoryContextOptions());
    return options;
  };

  JournalDirectoryClass.prototype._mtuPatchedEntryContextOptions = true;
}

// v12 only
Hooks.on("getJournalDirectoryEntryContext", (_html, options) => {
  if (isV13Plus()) return;
  if (!game.user?.isGM) return;

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
      }
    },
    {
      name: "MTU.menu.openImporter",
      icon: '<i class="fas fa-satellite-dish"></i>',
      condition: () => true,
      callback: async () => {
        openMtuImportDialog();
      }
    }
  );
});

/* -------------------------------- */
/* Rendering and refresh logic      */
/* -------------------------------- */

async function renderMtuContent(mode, system, campaignSlug) {
  switch (mode) {
    case "overview": {
      const mDrive = game.settings.get(MODULE_ID, "mDrive") ?? 1;
      return renderTemplate(`modules/${MODULE_ID}/templates/mtu-overview.html`, buildOverviewData(system, mDrive));
    }

    case "transit": {
      const mDrive = game.settings.get(MODULE_ID, "mDrive") ?? 1;
      return renderTemplate(`modules/${MODULE_ID}/templates/mtu-transit.html`, buildTransitData(system, mDrive));
    }

    default: {
      const mainWorld = findMainWorld(system);
      if (!mainWorld) {
        return `<p>${game.i18n.localize("MTU.notify.noMainWorld")}</p>`;
      }
      const ctx = buildSystemContext(system);
      const star = system.primary_star ?? {};
      const primaryStarLabel = `${star.stellar_type ?? ""}${star.stellar_subtype ?? ""} ${star.stellar_class ?? ""}`.trim() || "—";
      const mainWorldCtx = {
        ...ctx,
        orbiting_name: mainWorld.orbiting_name || primaryStarLabel,
      };
      const normalizedBody = normalizeBodyPayload(mainWorld, mainWorldCtx);
      const data = mode === "gm" ? buildGmData(normalizedBody, campaignSlug) : buildPlayerData(normalizedBody);
      return renderTemplate(`modules/${MODULE_ID}/templates/mtu-${mode}.html`, data);
    }
  }
}

async function refreshMtuPage(page, app) {
  const campaignSlug = page.getFlag(MODULE_ID, "campaignSlug");
  const resourceId   = page.getFlag(MODULE_ID, "resourceId");
  const mode         = page.getFlag(MODULE_ID, "mode");

  if (!campaignSlug || !resourceId || !mode) {
    ui.notifications.error(game.i18n.localize("MTU.notify.pageMissingMetadata"));
    return;
  }

  try {
    const system  = await fetchStarSystem(campaignSlug, resourceId);
    const content = await renderMtuContent(mode, system, campaignSlug);

    await page.update({
      "text.content": content,
      "text.format":  CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
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
  const resourceId   = getEntryResourceId(entry);

  if (!campaignSlug || !resourceId) {
    ui.notifications.error(game.i18n.localize("MTU.notify.entryMissingMetadata"));
    return;
  }

  try {
    const system = await fetchStarSystem(campaignSlug, resourceId);
    await updateMtuJournalPages(entry, system, { campaignSlug, resourceId, updateSystemMap: false });

    entry.sheet?.render(true);
    ui.notifications.info(game.i18n.format("MTU.notify.entryRefreshed", { name: entry.name }));
  } catch (err) {
    console.error(err);
    ui.notifications.error(game.i18n.format("MTU.notify.refreshFailed", { message: err.message }));
  }
}

async function updateMtuJournalPages(entry, system, { campaignSlug, resourceId, updateSystemMap }) {
  const updates = [];

  for (const mode of ["overview", "player", "gm", "transit"]) {
    const page = findMtuTextPage(entry, mode);
    if (!page) continue;

    const content = await renderMtuContent(mode, system, campaignSlug);
    updates.push({
      _id: page.id,
      text: {
        content,
        format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
      },
      flags: {
        [MODULE_ID]: {
          ...page.getFlag(MODULE_ID),
          live: true,
          mode,
          resourceId,
          campaignSlug,
        }
      }
    });
  }

  if (updateSystemMap) {
    const systemMapPage = findSystemMapPage(entry);
    if (systemMapPage && system.map_url) {
      updates.push({
        _id: systemMapPage.id,
        src: system.map_url
      });
    }
  }

  if (updates.length) {
    await entry.updateEmbeddedDocuments("JournalEntryPage", updates);
  }
}
