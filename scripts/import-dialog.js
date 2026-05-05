import {
  MODULE_ID,
  buildGmData,
  buildOverviewData,
  buildPlayerData,
  buildSystemContext,
  buildTransitData,
  fetchStarSystem,
  fetchSubsector,
  findMainWorld,
  isSubsectorInput,
  normalizeBodyPayload,
  parseStarSystemInput,
  parseSubsectorInput,
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
      defaultFolderName:   game.settings.get(MODULE_ID, "defaultFolderName"),
      mDrive:              game.settings.get(MODULE_ID, "mDrive"),
      createOverviewPage:  true,
      createPlayerPage:    true,
      createGmPage:        true,
      createSystemMapPage: true,
      createTransitPage:   true,
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
    const pageOptions = {
      createOverviewPage:  data.createOverviewPage,
      createPlayerPage:    data.createPlayerPage,
      createGmPage:        data.createGmPage,
      createSystemMapPage: data.createSystemMapPage,
      createTransitPage:   data.createTransitPage,
    };

    await game.settings.set(MODULE_ID, "mDrive", mDrive);
    const folder = await this.resolveFolder(data.folderName?.trim());

    if (isSubsectorInput(data.sourceUrl)) {
      let parsed;
      try {
        parsed = parseSubsectorInput(data.sourceUrl, defaultSlug);
      } catch (err) {
        ui.notifications.error(err.message);
        return;
      }

      let subsector;
      try {
        subsector = await fetchSubsector(parsed.campaignSlug, parsed.resourceId);
      } catch (err) {
        ui.notifications.error(game.i18n.format("MTU.notify.fetchFailed", { message: err.message }));
        return;
      }

      const ids = (subsector.star_systems ?? []).map((s) => (typeof s === "object" ? s.id : s));
      if (ids.length === 0) {
        ui.notifications.warn(game.i18n.localize("MTU.notify.subsectorEmpty"));
        return;
      }

      ui.notifications.info(game.i18n.format("MTU.notify.subsectorImporting", { count: ids.length }));
      let successCount = 0;

      for (const id of ids) {
        try {
          const system = await fetchStarSystem(parsed.campaignSlug, String(id));
          await this.createSystemJournal(system, parsed.campaignSlug, String(id), mDrive, folder, pageOptions);
          successCount++;
        } catch (err) {
          console.error(`MTU | Failed to import system ${id}:`, err);
          ui.notifications.warn(game.i18n.format("MTU.notify.systemImportFailed", { id, message: err.message }));
        }
      }

      ui.notifications.info(game.i18n.format("MTU.notify.subsectorDone", { count: successCount }));

    } else {
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

      const entry = await this.createSystemJournal(
        system, parsed.campaignSlug, parsed.resourceId, mDrive, folder, pageOptions,
        data.name?.trim() || null
      );
      ui.notifications.info(game.i18n.format("MTU.notify.entryCreated", { name: entry.name }));
      entry.sheet.render(true);
    }
  }

  async createSystemJournal(system, campaignSlug, resourceId, mDrive, folder, pageOptions, nameOverride = null) {
    const ctx = buildSystemContext(system);
    const mainWorldBody = findMainWorld(system);

    const entryName = nameOverride || ctx.star_system_name
      || game.i18n.format("MTU.page.defaultName", { id: resourceId });

    const entry = await JournalEntry.create({
      name: entryName,
      folder: folder?.id ?? null,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      flags: {
        [MODULE_ID]: {
          campaignSlug,
          resourceId,
          importSource: "mytravelleruniverse",
          importType:   "starSystem",
        },
      },
    });

    const pages = [];

    if (pageOptions.createOverviewPage) {
      const html = await renderTemplate(
        `modules/${MODULE_ID}/templates/mtu-overview.html`,
        buildOverviewData(system, mDrive)
      );
      pages.push({
        name: game.i18n.localize("MTU.page.overview"),
        type: "text",
        text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: { [MODULE_ID]: { live: true, mode: "overview", resourceId, campaignSlug } },
      });
    }

    if (mainWorldBody) {
      const mainWorldCtx = { ...ctx, orbiting_name: buildStarLabel(system.primary_star) };
      const bodyWithName = mainWorldBody.name ? mainWorldBody : { ...mainWorldBody, name: system.main_world?.name ?? null };
      const normalizedBody = normalizeBodyPayload(bodyWithName, mainWorldCtx);

      if (pageOptions.createPlayerPage) {
        const html = await renderTemplate(
          `modules/${MODULE_ID}/templates/mtu-player.html`,
          buildPlayerData(normalizedBody)
        );
        pages.push({
          name: game.i18n.localize("MTU.page.mainWorldPlayer"),
          type: "text",
          text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
          ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
          flags: { [MODULE_ID]: { live: true, mode: "player", resourceId, campaignSlug } },
        });
      }

      if (pageOptions.createGmPage) {
        const html = await renderTemplate(
          `modules/${MODULE_ID}/templates/mtu-gm.html`,
          buildGmData(normalizedBody, campaignSlug)
        );
        pages.push({
          name: game.i18n.localize("MTU.page.mainWorldGm"),
          type: "text",
          text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
          ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
          flags: { [MODULE_ID]: { live: true, mode: "gm", resourceId, campaignSlug } },
        });
      }
    }

    if (pageOptions.createSystemMapPage && system.map_url) {
      pages.push({
        name: game.i18n.localize("MTU.page.systemMap"),
        type: "image",
        src: system.map_url,
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: { [MODULE_ID]: { systemMap: true } },
      });
    }

    if (pageOptions.createTransitPage) {
      const html = await renderTemplate(
        `modules/${MODULE_ID}/templates/mtu-transit.html`,
        buildTransitData(system, mDrive)
      );
      pages.push({
        name: game.i18n.localize("MTU.page.transit"),
        type: "text",
        text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML },
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
        flags: { [MODULE_ID]: { live: true, mode: "transit", resourceId, campaignSlug } },
      });
    }

    if (pages.length > 0) {
      await entry.createEmbeddedDocuments("JournalEntryPage", pages);
    }

    return entry;
  }

  async resolveFolder(folderName) {
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
