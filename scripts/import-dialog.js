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
  parseStarSystemInput,
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
      defaultFolderName:  game.settings.get(MODULE_ID, "defaultFolderName"),
      mDrive:             game.settings.get(MODULE_ID, "mDrive"),
      createOverviewPage: true,
      createPlayerPage:   true,
      createGmPage:       true,
      createSystemMapPage: true,
      createTransitPage:  true,
    };
  }

  async _updateObject(_event, formData) {
    if (!game.user.isGM) {
      ui.notifications.error(game.i18n.localize("MTU.notify.gmOnly"));
      return;
    }

    const data = foundry.utils.expandObject(formData);
    const defaultSlug = game.settings.get(MODULE_ID, "campaignSlug");
    const mDrive = Math.min(10, Math.max(1, parseInt(data.mDrive, 10) || 1));

    let parsed;
    try {
      parsed = parseStarSystemInput(data.sourceUrl, defaultSlug);
    } catch (err) {
      ui.notifications.error(err.message);
      return;
    }

    let system;
    try {
      system = await fetchStarSystem(parsed.campaignSlug, parsed.resourceId);
    } catch (err) {
      ui.notifications.error(game.i18n.format("MTU.notify.fetchFailed", { message: err.message }));
      return;
    }

    await game.settings.set(MODULE_ID, "mDrive", mDrive);

    const ctx = buildSystemContext(system);
    const mainWorldBody = findMainWorld(system);

    const entryName = data.name?.trim() || ctx.star_system_name
      || game.i18n.format("MTU.page.defaultName", { id: parsed.resourceId });

    const folder = await this._resolveFolder(data.folderName?.trim());

    const entry = await JournalEntry.create({
      name: entryName,
      folder: folder?.id ?? null,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      flags: {
        [MODULE_ID]: {
          campaignSlug:  parsed.campaignSlug,
          resourceId:    parsed.resourceId,
          importSource:  "mytravelleruniverse",
          importType:    "starSystem",
        },
      },
    });

    const pages = [];

    if (data.createOverviewPage) {
      const html = await renderTemplate(
        `modules/${MODULE_ID}/templates/mtu-overview.html`,
        buildOverviewData(system)
      );
      pages.push({
        name: game.i18n.localize("MTU.page.overview"),
        type: "text",
        text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: {
          [MODULE_ID]: { live: true, mode: "overview", resourceId: parsed.resourceId, campaignSlug: parsed.campaignSlug },
        },
      });
    }

    if (mainWorldBody) {
      const mainWorldCtx = {
        ...ctx,
        orbiting_name: buildStarLabel(system.primary_star),
      };
      const normalizedBody = normalizeBodyPayload(mainWorldBody, mainWorldCtx);

      if (data.createPlayerPage) {
        const html = await renderTemplate(
          `modules/${MODULE_ID}/templates/mtu-player.html`,
          buildPlayerData(normalizedBody)
        );
        pages.push({
          name: game.i18n.localize("MTU.page.mainWorldPlayer"),
          type: "text",
          text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
          ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
          flags: {
            [MODULE_ID]: { live: true, mode: "player", resourceId: parsed.resourceId, campaignSlug: parsed.campaignSlug },
          },
        });
      }

      if (data.createGmPage) {
        const html = await renderTemplate(
          `modules/${MODULE_ID}/templates/mtu-gm.html`,
          buildGmData(normalizedBody)
        );
        pages.push({
          name: game.i18n.localize("MTU.page.mainWorldGm"),
          type: "text",
          text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
          ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
          flags: {
            [MODULE_ID]: { live: true, mode: "gm", resourceId: parsed.resourceId, campaignSlug: parsed.campaignSlug },
          },
        });
      }
    }

    if (data.createSystemMapPage && system.star_system_map_url) {
      pages.push({
        name: game.i18n.localize("MTU.page.systemMap"),
        type: "image",
        src: system.star_system_map_url,
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: { [MODULE_ID]: { systemMap: true } },
      });
    }

    if (data.createTransitPage) {
      const html = await renderTemplate(
        `modules/${MODULE_ID}/templates/mtu-transit.html`,
        buildTransitData(system, mDrive)
      );
      pages.push({
        name: game.i18n.localize("MTU.page.transit"),
        type: "text",
        text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: {
          [MODULE_ID]: { live: true, mode: "transit", resourceId: parsed.resourceId, campaignSlug: parsed.campaignSlug },
        },
      });
    }

    if (pages.length > 0) {
      await entry.createEmbeddedDocuments("JournalEntryPage", pages);
    }

    ui.notifications.info(game.i18n.format("MTU.notify.entryCreated", { name: entry.name }));
    entry.sheet.render(true);
  }

  async _resolveFolder(folderName) {
    const effectiveName = folderName || game.settings.get(MODULE_ID, "defaultFolderName");
    if (!effectiveName) return null;

    const existing = game.folders.find((f) => f.type === "JournalEntry" && f.name === effectiveName);
    if (existing) return existing;

    return Folder.create({ name: effectiveName, type: "JournalEntry", color: "#4b5563" });
  }
}

function buildStarLabel(star) {
  if (!star) return "—";
  return `${star.stellar_type ?? ""}${star.stellar_subtype ?? ""} ${star.stellar_class ?? ""}`.trim() || "—";
}
