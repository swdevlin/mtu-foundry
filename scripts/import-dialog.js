import {
  MODULE_ID,
  buildGmData,
  buildPlayerData,
  fetchStellarObject,
  parseStellarObjectInput,
} from "./mtu-api.js";

export class MtuImportDialog extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mtu-import-dialog",
      template: `modules/${MODULE_ID}/templates/import-dialog.html`,
      width: 520,
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
    });
  }

  get title() {
    return game.i18n.localize("MTU.importDialog.title");
  }

  getData() {
    return {
      defaultFolderName: game.settings.get(MODULE_ID, "defaultFolderName"),
      createPlayerPage: true,
      createGmPage: true,
      createSystemMapPage: true,
    };
  }

  async _updateObject(_event, formData) {
    if (!game.user.isGM) {
      ui.notifications.error(game.i18n.localize("MTU.notify.gmOnly"));
      return;
    }

    const data = foundry.utils.expandObject(formData);
    const defaultSlug = game.settings.get(MODULE_ID, "campaignSlug");

    let parsed;
    try {
      parsed = parseStellarObjectInput(data.sourceUrl, defaultSlug);
    } catch (err) {
      ui.notifications.error(err.message);
      return;
    }

    let payload;
    try {
      payload = await fetchStellarObject(parsed.campaignSlug, parsed.resourceId);
    } catch (err) {
      ui.notifications.error(game.i18n.format("MTU.notify.fetchFailed", { message: err.message }));
      return;
    }

    const sectorHex = [payload.sector_name, payload.hex].filter(Boolean).join(" ");
    const entryName = data.name?.trim() || payload.name || sectorHex
      || game.i18n.format("MTU.page.defaultName", { id: parsed.resourceId });
    const folder = await this._resolveFolder(data.folderName?.trim());

    const entry = await JournalEntry.create({
      name: entryName,
      folder: folder?.id ?? null,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      flags: {
        [MODULE_ID]: {
          campaignSlug: parsed.campaignSlug,
          resourceId: parsed.resourceId,
          importSource: "mytravelleruniverse",
        },
      },
    });

    const pages = [];

    if (data.createPlayerPage) {
      const playerHtml = await renderTemplate(
        `modules/${MODULE_ID}/templates/mtu-player.html`,
        buildPlayerData(payload)
      );

      pages.push({
        name: this.pageName("MTU.page.playerData", payload),
        type: "text",
        text: { content: playerHtml, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: {
          [MODULE_ID]: { live: true, mode: "player", resourceId: parsed.resourceId, campaignSlug: parsed.campaignSlug },
        },
      });
    }

    if (data.createGmPage) {
      const gmHtml = await renderTemplate(
        `modules/${MODULE_ID}/templates/mtu-gm.html`,
        buildGmData(payload)
      );
      pages.push({
        name: this.pageName("MTU.page.gmData", payload),
        type: "text",
        text: { content: gmHtml, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
        flags: {
          [MODULE_ID]: { live: true, mode: "gm", resourceId: parsed.resourceId, campaignSlug: parsed.campaignSlug },
        },
      });
    }

    if (data.createSystemMapPage && payload.star_system_map_url) {
      pages.push({
        name: game.i18n.localize("MTU.page.systemMap"),
        type: "image",
        src: payload.star_system_map_url,
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: {
          [MODULE_ID]: { systemMap: true },
        },
      });
    }

    if (pages.length > 0) {
      await entry.createEmbeddedDocuments("JournalEntryPage", pages);
    }

    ui.notifications.info(game.i18n.format("MTU.notify.entryCreated", { name: entry.name }));
    entry.sheet.render(true);
  }

  pageName(template, payload) {
    return game.i18n.format(template, {type: game.i18n.localize("MTU.stellarBodyType." + payload.type)});
  }

  async _resolveFolder(folderName) {
    const effectiveName = folderName || game.settings.get(MODULE_ID, "defaultFolderName");
    if (!effectiveName) return null;

    const existing = game.folders.find((f) => f.type === "JournalEntry" && f.name === effectiveName);
    if (existing) return existing;

    return Folder.create({ name: effectiveName, type: "JournalEntry", color: "#4b5563" });
  }
}