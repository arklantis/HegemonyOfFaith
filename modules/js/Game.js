/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * HegemonyOfFaith implementation: (C) 2026 Yen / Gamefly Studio
 * Copyright (C) 2026 Yen / Gamefly Studio
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * modules/js/Game.js
 *
 * HegemonyOfFaith user interface script
 *
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

const [dojo, declare, GameGui, Counter, Stock] = await importDojoLibs([
  "dojo",
  "dojo/_base/declare",
  "ebg/core/gamegui",
  "ebg/counter",
  "ebg/stock",
]);

window.ebg = window.ebg || {};
window.ebg.core = window.ebg.core || {};
window.ebg.core.gamegui = window.ebg.core.gamegui || GameGui;
window.ebg.counter = window.ebg.counter || Counter;
window.ebg.stock = window.ebg.stock || Stock;
const ebg = window.ebg;

const LegacyGame = declare("bgagame.hegemonyoffaith", GameGui, {
    constructor: function () {
      this.cardwidth = 108;
      this.cardheight = 150;
      this.believerTypeNames = {
        1: _("Fool"),
        2: _("Prayer"),
        3: _("Missionary"),
        4: _("Elder"),
        5: _("Fanatic"),
      };
      this.sectNames = {
        1: _("Hawk"),
        2: _("Lotus"),
        3: _("Peace Cross"),
        4: _("Taiji"),
        5: _("Bushido"),
        6: _("Hexagram"),
        7: _("Holy Sword"),
        8: _("Moon"),
      };
      this.actionCardTypeById = {};
      this.currentTurnActionMask = 0;
      this.currentTurnPerformedActionsCount = 0;
      this.currentTurnMaxActions = 2;
      this.wasCurrentPlayerActive = false;
      this.actionSubmissionInFlight = false;
      this.lastSubmittedActionCardId = null;
      this.lastSubmittedActionAt = 0;
      this.lastSubmittedActionSignature = "";
      this.playActionDebounceUntil = 0;
      this.counterMirrorObservers = [];
      this.localHandCountObservers = [];
      this.currentAoeCombatType = null;
      this.currentAoeAttackerId = null;
      this.currentAoeActionCardId = null;
      this.currentFaithWarActionCardType = null;
      this.currentFaithWarActionCardId = 0;
      this.currentFaithWarActionOwnerId = 0;
      this.currentFaithWarActionLabel = "";
      this.lastUiMessageText = "";
      this.lastUiMessageType = "";
      this.lastUiMessageAt = 0;
      this.faithWarLogEntries = [];
      this.faithWarRoundNo = 0;
      this.faithWarCleanupTimeout = null;
      this.pendingFaithWarRoundClearTimeout = null;
      this.deferFaithWarResultClearOnNextAction = false;
      this.faithWarAssignNoticeShown = false;
      this.hasCommittedDuelBelieverThisRound = false;
      this.lastDuelRevealAt = 0;
      this.minDuelRevealDisplayMs = 3600;
      this.preferredDuelBelieverCardId = 0;
      this.duelLogMode = "war";
      this.currentDuelLeftId = null;
      this.currentDuelRightId = null;
      this.currentAoeCommitTargetIds = [];
      this.currentAoeAssignedAction = "";
      this.currentAoeDefendedPlayerIds = {};
      this.currentAoeDefendedSectIds = {};
      this.hiddenPendingActionCard = null;
      this.pendingRevivedFromGraveyard = {};
      this.pendingBelieverSourceByCardId = {};
      this.pendingProphetDrawNoFlyCount = 0;
      this.pendingProphetSnatchNoFlyCount = 0;
      this.pendingSkill = null;
      this.skillTargetHandles = [];
      this.mySkillState = null;
      this.skillProtection = { physical: {}, mental: {} };
      this.pendingFaithWarUseZombie = false;
      this.selectedZombieGraveCardId = 0;
      this.selectedZombieGraveCardType = 0;
      this.infoSpyPendingPlayerId = 0;
      this.infoSpyPendingPlayerName = "";
      this.infoSpyCloseInFlight = false;
      this.currentCenterActionDiscardKey = "";
      this.currentCenterActionHadDefenseDiscard = false;
      this.pendingCenterActionDiscardTimeout = null;
      this.centerActionHoldUntil = 0;
      this.isProphetPredictionFlowActive = false;
      this.pendingProphetFlowClearTimeout = null;
      this.pendingProphetVisualClearTimeout = null;
      this.mobileCardTooltipTimer = null;
      this.mobileCardTooltipTouch = null;
      this.mobileCardTooltipShown = false;
      this.mobileCardTooltipSuppressClickUntil = 0;
      this.graveyardActualCount = 0;
      this.combatResultHoldMs = 2000;
      this.combatResultCleanupBufferMs = 1000;
      this.unifiedCardFlyMs = 520;
      this.unifiedCardFlightStaggerMs = 90;
      this.unifiedRevealFlipMs = 500;
      this.unifiedRevealHoldMs = 2000;
      this.combatRevealLingerMs = 300;
      this.combatRevealGateUntil = 0;
      this.unifiedRedistributeShuffleHoldMs = 1200;
      this.unifiedShufflePulseMs = 1200;
      this.everyoneEqualFxPendingUntil = 0;
      this.chaosComingFxPendingUntil = 0;
      this.pendingBelieverHandSyncCards = null;
      this.pendingActionHandSyncCards = null;
      this.pendingBelieverHandSyncTimeout = null;
      this.pendingActionHandSyncTimeout = null;
      this.suppressedActionDiscardFlightByCardId = {};
      this.pendingPublicCountsSyncTimeout = null;
      this.pendingPublicCountsSyncPayload = null;
      this.suppressDeckSourceForNextNewBelievers = 0;
      this.suppressDeckSourceForNextNewActionCards = 0;
      this.suppressDeckSourceExpiryTsBeliever = 0;
      this.suppressDeckSourceExpiryTsAction = 0;
      this.resolvedThemeRootUrl = "";
      this.gameEndSummaryTickTimer = null;
      this.gameEndSummaryAutoTimer = null;
      this.gameEndSummaryConfirmSent = false;
      this.initialSkillChoices = [];
      this.initialSkillDraftSelectedId = 0;
      this.actionButtonOrderHooked = false;
      this.pendingPracticeAiStepTimers = {};
      this.practiceAiStepInFlight = {};
      this.pendingTransientArenaClearTimeout = null;
      this.pendingDuelRoundSetupTimeout = null;
      this.pendingHardResyncTimeout = null;
      this.lastAutoResyncAt = 0;
      this.pendingClientConfirmation = null;
      this.skipNextImpermanenceConfirm = false;
    },

    getResponsiveHandCardSize: function () {
      const viewportWidth =
        typeof window !== "undefined"
          ? Math.min(
              window.innerWidth || 9999,
              document && document.documentElement
                ? document.documentElement.clientWidth || 9999
                : 9999
            )
          : 9999;
      if (viewportWidth <= 640) {
        const mobileCardWidth = Math.max(
          58,
          Math.min(70, Math.round(viewportWidth * 0.18))
        );
        return {
          width: mobileCardWidth,
          height: Math.round(mobileCardWidth * 1.3889),
          margin: 6,
        };
      }
      if (viewportWidth <= 900) {
        return { width: 96, height: 133, margin: 9 };
      }
      return { width: this.cardwidth, height: this.cardheight, margin: 10 };
    },

    setup: function (gamedatas) {
      const baseShowMessage = this.showMessage.bind(this);
      this.showMessage = function (message, type) {
        const msg = String(message || "");
        const kind = String(type || "info");
        const now = Date.now();
        if (
          msg === this.lastUiMessageText &&
          kind === this.lastUiMessageType &&
          now - this.lastUiMessageAt < 1200
        ) {
          return;
        }
        this.lastUiMessageText = msg;
        this.lastUiMessageType = kind;
        this.lastUiMessageAt = now;
        baseShowMessage(message, type);
      }.bind(this);

      if (!this.actionButtonOrderHooked) {
        const baseAddActionButton = this.addActionButton.bind(this);
        this.addActionButton = function (id, label, method, destination, color) {
          const result = baseAddActionButton(
            id,
            label,
            method,
            destination,
            color
          );
          this.reorderGeneralActionButtons();
          return result;
        }.bind(this);
        this.actionButtonOrderHooked = true;
      }

      // JS HTML Injection removed since the framework now uses classic .tpl layout.
      // Build game area HTML
      const tActionDeck = this.escapeHtml(_("Action Deck"));
      const tActionDiscard = this.escapeHtml(_("Action Discard"));
      const tBelieverDeck = this.escapeHtml(_("Believer Deck"));
      const tGraveyard = this.escapeHtml(_("Graveyard"));
      const tCards = this.escapeHtml(_("cards"));
      const tMySkillCard = this.escapeHtml(_("My Skill Card"));
      const tMyActionCards = this.escapeHtml(_("My Action Cards"));
      const tMyBelieverCards = this.escapeHtml(_("My Believer Cards"));
      const handCardSize = this.getResponsiveHandCardSize();
      document.getElementById("game_play_area").innerHTML = `
        <div id="play_area">
            <!-- Common Deck & Graveyard Area -->
            <div id="common_table" class="whiteblock common-table">
                <!-- Decks Row -->
                <div class="common-decks-row">
                    <div class="deck_container">
                        <h4 class="deck-title">${tActionDeck}</h4>
                        <div id="action_deck" class="deck_slot card-back-action"></div>
                        <div class="deck_counter"><span id="action_deck_count">0</span> ${tCards}</div>
                    </div>
                    <div class="deck_container">
                        <h4 class="deck-title">${tActionDiscard}</h4>
                        <div id="action_discard" class="deck_slot action_discard_slot">
                          <div id="action_discard_top" class="deck-preview-wrap"></div>
                        </div>
                    </div>
                    <div class="deck_container">
                        <h4 class="deck-title">${tBelieverDeck}</h4>
                        <div id="believer_deck" class="deck_slot card-back-believer"></div>
                        <div class="deck_counter"><span id="believer_deck_count">0</span> ${tCards}</div>
                    </div>
                    <div class="deck_container">
                        <h4 class="deck-title">${tGraveyard}</h4>
                        <div id="graveyard" class="deck_slot graveyard_slot">
                          <div id="graveyard_cards" class="deck-preview-wrap"></div>
                        </div>
                        <div class="deck_counter"><span id="graveyard_count">0</span> ${tCards}</div>
                    </div>
                </div>

                <!-- Central Arena Row -->
                <div id="central_arena" class="central-arena">
                    <!-- Cards will be dynamically placed here during combat/resolution -->
                </div>
            </div>

            <!-- Player Tables -->
            <div id="table_area" class="table-area">
                <div id="playertables" class="playertables-contents"></div>
            </div>
        </div>
        <div id="myhand_wrap">
            <div id="myhand_top_row">
              <div id="skill_hand" class="whiteblock">
                  <h3>${tMySkillCard}</h3>
                  <div id="myskillcards"></div>
              </div>
              <div id="action_hand" class="whiteblock">
                  <h3>${tMyActionCards}</h3>
                  <div id="myactioncards"></div>
              </div>
            </div>
            <div id="believer_hand" class="whiteblock">
                <h3>${tMyBelieverCards}</h3>
                <div id="mybelievercards"></div>
            </div>
        </div>
    `;
      // --- 1. Setup Action Cards Stock ---
      this.playerActionCards = new ebg.stock();
      this.playerActionCards.create(
        this,
        $("myactioncards"),
        handCardSize.width,
        handCardSize.height
      );

      this.playerActionCards.image_items_per_row = 100;
      this.playerActionCards.item_margin = handCardSize.margin; // Space between cards
      this.playerActionCards.extraClasses = "card card-action";
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(1);
      }

      this.playerActionCards.onItemCreate = dojo.hitch(
        this,
        function (card_div, card_type, card_id) {
          // card_type is our sprite_idx integer!
          dojo.attr(card_div, "data-index", card_type);
          dojo.attr(card_div, "data-card-id", card_id);
          this.attachActionCardTooltip(
            card_div,
            this.getActionCardKeyName(parseInt(card_type, 10))
          );
          //dojo.style(card_div, "backgroundSize", "400% 400%"); // Force bypass CSS cache
        }
      );

      // Add card types (Action Cards 1-15)
      this.playerActionCards.addItemType(
        0,
        0,
        g_gamethemeurl + "img/action_cards_en.png",
        0
      ); // Card Back fallback
      for (const [key, info] of Object.entries(gamedatas.const.actioncards)) {
        // Calculate sprite index from key mapping we defined
        let sprite_idx = this.getActionCardSpriteIndex(key);

        this.playerActionCards.addItemType(
          sprite_idx,
          sprite_idx, // We don't use weights for now
          g_gamethemeurl + "img/action_cards_en.png",
          sprite_idx
        );
      }

      for (const i in gamedatas.actioncards) {
        const card = gamedatas.actioncards[i];
        let sprite_idx = this.getActionCardSpriteIndex(card.type);
        this.playerActionCards.addToStockWithId(sprite_idx, card.id);
        this.actionCardTypeById[String(card.id)] = card.type;
      }

      // --- 2. Setup Believer Cards Stock (New!) ---

      this.playerBelieverCards = new ebg.stock();
      this.playerBelieverCards.create(
        this,
        $("mybelievercards"),
        handCardSize.width,
        handCardSize.height
      );
      this.playerBelieverCards.image_items_per_row = 100;
      this.playerBelieverCards.item_margin = handCardSize.margin;
      this.playerBelieverCards.extraClasses = "card card-believer";
      if (this.playerBelieverCards.setSelectionMode) {
        this.playerBelieverCards.setSelectionMode(1);
      }

      this.playerBelieverCards.onItemCreate = dojo.hitch(
        this,
        function (card_div, card_type, card_id) {
          // card_type is directly the sprite index for Believer cards
          dojo.attr(card_div, "data-index", card_type);
          this.attachBelieverTooltip(card_div, parseInt(card_type, 10));
          //dojo.style(card_div, "backgroundSize", "600% 100%"); // Force bypass CSS cache
        }
      );

      // Add Believer types (1-5)
      for (let i = 1; i <= 5; i++) {
        this.playerBelieverCards.addItemType(
          i, // type id
          i, // weight
          g_gamethemeurl + "img/believer_cards_en.png",
          i // sprite index (1=Fool, etc)
        );
      }

      for (const i in gamedatas.believercards) {
        const card = gamedatas.believercards[i];
        this.playerBelieverCards.addToStockWithId(card.type, card.id);
      }

      // --- 3. Setup Skill Card Stock (display only, one card) ---
      this.playerSkillCards = new ebg.stock();
      this.playerSkillCards.create(
        this,
        $("myskillcards"),
        handCardSize.width,
        handCardSize.height
      );
      this.playerSkillCards.image_items_per_row = 100;
      this.playerSkillCards.item_margin = Math.min(6, handCardSize.margin);
      this.playerSkillCards.extraClasses = "card card-skill";
      if (this.playerSkillCards.setSelectionMode) {
        this.playerSkillCards.setSelectionMode(0);
      }
      this.playerSkillCards.onItemCreate = dojo.hitch(
        this,
        function (card_div, card_type, card_id) {
          dojo.attr(card_div, "data-index", card_type);
          const skillType = parseInt(card_type, 10);
          this.attachSkillTooltip(card_div, skillType, this.mySkillState);
        }
      );
      for (let i = 1; i <= 16; i++) {
        this.playerSkillCards.addItemType(
          i,
          i,
          g_gamethemeurl + "img/skill_cards_en.png",
          i
        );
      }
      this.mySkillState = gamedatas.my_skill_state || null;
      this.initialSkillChoices = this.normalizeInitialSkillChoices(
        gamedatas.initial_skill_choices || []
      );
      this.playerSkillPublicState = gamedatas.player_skill_public_state || {};
      if (
        !this.playerSkillPublicState[String(this.player_id)] &&
        this.mySkillState
      ) {
        this.playerSkillPublicState[String(this.player_id)] = this.mySkillState;
      }
      this.setSkillProtectionSnapshot(gamedatas.skill_protection || null);
      this.updateSkillProtectionFromActorState(
        this.player_id,
        this.mySkillState
      );
      if (gamedatas.skillcards) {
        for (const i in gamedatas.skillcards) {
          const skillCard = gamedatas.skillcards[i];
          this.playerSkillCards.addToStockWithId(
            parseInt(skillCard.type, 10),
            skillCard.id
          );
        }
      }

      // Set common board counts
      dojo.byId("action_deck_count").innerHTML = gamedatas.action_deck_count;
      dojo.byId("believer_deck_count").innerHTML =
        gamedatas.believer_deck_count;
      this.graveyardActualCount =
        parseInt(gamedatas.graveyard_count || 0, 10) || 0;
      dojo.byId("graveyard_count").innerHTML = this.graveyardActualCount;
      this.graveyardCards = this.normalizeGraveyardCards(
        gamedatas.graveyard_cards
      );
      this.actionDiscardCards = Object.values(
        gamedatas.actiondiscardpile || {}
      );
      this.renderActionDiscardTop();
      this.renderGraveyardPreview();
      dojo.connect(
        dojo.byId("graveyard"),
        "onclick",
        this,
        "onGraveyardClicked"
      );
      this.rehydrateCombatArenaFromSnapshot(gamedatas);
      this.restoreFaithWarLogFromStorageForSnapshot(gamedatas);

      // Add info to player boards and build player tables
      for (const player_id in gamedatas.players) {
        const player = gamedatas.players[player_id];

        // Generate playertable for main game area
        let roleStr = "Leader";
        if (player.player_role == 1) roleStr = "Follower";
        if (player.player_role == 2) roleStr = "Wanderer";

        const playerTableHtml = `
            <div class="playertable whiteblock playertable_top" id="playertable_${player_id}" style="--player-color:#${
          player.player_color
        }; --player-color-bg:#${player.player_color}33;">
              <div class="playertable_header">
                <span class="playertablename">${
                  player.player_name
                } <span class="role-inline" id="table_role_${player_id}">(${roleStr})</span></span>
                <span class="sect_emblem" id="table_sect_${player_id}" style="--player-color:#${
          player.player_color
        }; color:#${player.player_color};">
                  ${this.getSectBadgeHtml(player.player_sect)}
                  ${this.getColoredSectNameHtml(player_id, player.player_sect)}
                </span>
              </div>
              <div class="playertablecard" id="playertablecard_${player_id}">
                
                <!-- Player Status / Hand Counters -->
                <div class="table_status_area">
                    <!-- Skill Card (Hidden) -->
                    <div class="table_card_item">
                        <div class="card card-skill-back table-mini-card skill-mini-card"></div>
                        <div class="table-mini-label">Skills</div>
                    </div>
                    <!-- Action Hand -->
                    <div class="table_card_item" title="Action Cards in Hand">
                        <div class="card-back-action table-mini-card"></div>
                        <div class="hand-count-badge" id="table_action_count_${player_id}">${
          player.action_count
        }</div>
                        <div class="table-mini-label">Action</div>
                    </div>
                    <!-- Believer Hand -->
                    <div class="table_card_item" title="Believer Cards in Hand">
                        <div class="card-back-believer table-mini-card"></div>
                        <div class="hand-count-badge" id="table_believer_count_${player_id}">${
          player.believer_count
        }</div>
                        <div class="table-mini-label">Believers</div>
                    </div>
                </div>

              </div>
            </div>`;
        dojo.place(playerTableHtml, "playertables");

        // Generate player panel extra info
        const panelRoleStr = this.getPlayerPanelRoleText(player_id);
        const isSkillRevealed =
          gamedatas.player_skills_revealed &&
          parseInt(gamedatas.player_skills_revealed[player_id], 10) === 1;
        const skillCard =
          gamedatas.player_skills && gamedatas.player_skills[player_id]
            ? gamedatas.player_skills[player_id]
            : null;
        const skillType =
          isSkillRevealed && skillCard ? parseInt(skillCard.type, 10) : 0;
        const skillClass = isSkillRevealed
          ? "card-skill panel-skill-front"
          : "card-skill-back panel-skill-back";

        const playerPanelHtml = `
            <div class="hegemony_player_panel" id="panel_${player_id}">
              <div class="role_label" id="role_${player_id}">${panelRoleStr}</div>
              <div class="sect_label" id="sect_${player_id}" style="--player-color:#${
          player.player_color
        };">
                ${this.getSectBadgeHtml(player.player_sect)}
                ${this.getColoredSectNameHtml(player_id, player.player_sect)}
              </div>
              <div class="panel_counters_grid">
                  <div class="panel_counter_item skills_label">
                      <div class="panel_counter_main">
                        <div id="skill_icon_${player_id}" class="icon-skill panel-skill-card ${skillClass}" data-index="${skillType}"></div>
                        <span class="panel-skill-active" id="skill_active_${player_id}"></span>
                      </div>
                      <span class="panel-counter-text">Skill</span>
                  </div>
                  <div class="panel_counter_item actions_label">
                      <div class="panel_counter_main">
                        <div id="action_icon_${player_id}" class="icon-action"></div>
                        <span id="action_count_${player_id}" class="panel-count">${
          player.action_count
        }</span>
                      </div>
                      <span class="panel-counter-text">Action</span>
                  </div>
                  <div class="panel_counter_item believers_label">
                      <div class="panel_counter_main">
                        <div id="believer_icon_${player_id}" class="icon-believer"></div>
                        <span id="believer_count_${player_id}" class="panel-count">${
          player.believer_count
        }</span>
                      </div>
                      <span class="panel-counter-text">Believers</span>
                  </div>
              </div>
            </div>`;
        if (this.bga && this.bga.playerPanels) {
          dojo.place(
            playerPanelHtml,
            this.bga.playerPanels.getElement(player_id)
          );
        } else {
          // BGA static analyzer workaround
          let legacyBoard = dojo.byId("player_bo" + "ard_" + player_id);
          if (legacyBoard) dojo.place(playerPanelHtml, legacyBoard);
        }
      }

      // Add skill tooltips for player panels.
      for (const player_id in gamedatas.players) {
        const isSkillRevealed =
          gamedatas.player_skills_revealed &&
          parseInt(gamedatas.player_skills_revealed[player_id], 10) === 1;
        const skillCard =
          gamedatas.player_skills && gamedatas.player_skills[player_id]
            ? gamedatas.player_skills[player_id]
            : null;
        const skillNode = dojo.byId("skill_icon_" + player_id);
        if (!skillNode) continue;
        if (!isSkillRevealed || !skillCard) {
          this.attachSkillTooltip(skillNode, 0, null);
        } else {
          const skillType = parseInt(skillCard.type, 10);
          const skillStateForTooltip =
            this.getEffectiveSkillStateForPanel(player_id);
          this.attachSkillTooltip(skillNode, skillType, skillStateForTooltip);
        }

        const actionIconNode = dojo.byId("action_icon_" + player_id);
        if (actionIconNode) {
          this.attachPanelCounterTooltip(
            actionIconNode,
            _("Action Cards"),
            _("Action cards currently in this player's hand.")
          );
        }
        const believerIconNode = dojo.byId("believer_icon_" + player_id);
        if (believerIconNode) {
          this.attachPanelCounterTooltip(
            believerIconNode,
            _("Believer Cards"),
            _("Believer cards currently in this player's hand.")
          );
        }
      }

      // Keep right player panel counters synced with table counters.
      this.setupPanelCounterMirrors(gamedatas.players);
      this.setupCurrentPlayerHandCountSync();
      this.refreshAllPlayerSkillActiveBadges();
      this.installPracticeAiConsoleHelper();

      // --- Event Listeners ---
      dojo.connect(
        this.playerActionCards,
        "onChangeSelection",
        this,
        "onPlayerActionCardsSelectionChanged"
      );
      dojo.connect(
        this.playerBelieverCards,
        "onChangeSelection",
        this,
        "onPlayerBelieverSelectionChanged"
      );
      dojo.connect(
        this.playerSkillCards,
        "onChangeSelection",
        this,
        "onPlayerSkillSelectionChanged"
      );
      this.setupDisabledActionCardClickGuard();

      this.setupNotifications();
    },

    onEnteringState: function (stateName, args) {
      if (stateName !== "chooseInitialSkill") {
        this.clearInitialSkillDraftArea();
      }

      if (stateName !== "playerTurn" && this.pendingAction) {
        this.cancelPendingActionSelection();
      }
      if (stateName !== "playerTurn" && this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
      if (
        this.pendingClientConfirmation &&
        this.pendingClientConfirmation.stateName &&
        this.pendingClientConfirmation.stateName !== stateName
      ) {
        this.pendingClientConfirmation = null;
      }
      if (stateName !== "gameEndSummary") {
        this.clearGameEndSummaryTimers();
      } else {
        if (this.pendingTransientArenaClearTimeout) {
          clearTimeout(this.pendingTransientArenaClearTimeout);
          this.pendingTransientArenaClearTimeout = null;
        }
        if (this.pendingCenterActionDiscardTimeout) {
          clearTimeout(this.pendingCenterActionDiscardTimeout);
          this.pendingCenterActionDiscardTimeout = null;
        }
        if (this.faithWarCleanupTimeout) {
          clearTimeout(this.faithWarCleanupTimeout);
          this.faithWarCleanupTimeout = null;
        }
        this.centerActionHoldUntil = 0;
      }
      if (stateName !== "playerTurn") {
        this.pendingFaithWarUseZombie = false;
      }
      if (
        stateName !== "playerTurn" &&
        stateName !== "chooseSurrenderOrWanderer"
      ) {
        this.clearTargetSelection();
      }
      if (stateName !== "faithWarDuel") {
        this.clearZombieGraveSelection();
        this.closeZombieGravePickerModal();
      }
      if (stateName === "faithWarDuel" || stateName === "faithDebateDuel") {
        // New duel round entered: clear local commit latch to avoid stale lockouts.
        this.hasCommittedDuelBelieverThisRound = false;
      }
      if (stateName === "reverseKarmaPrompt") {
        // Keep prompt-phase UI clean: only show skill stack after confirmed use.
        this.setReverseKarmaContext(0, 0);
      }
      if (this.shouldHoldTransientArenaForConfrontation(args, stateName)) {
        this.ensureConfrontationActionVisual(args, stateName);
      }
      if (stateName === "reverseKarmaPrompt") {
        this.refreshCombatActionStacks();
      }
      if (stateName === "prophetSkillPrompt" || stateName === "prophetGuess") {
        setTimeout(
          function () {
            this.ensureProphetPredictionVisualForState(stateName, args);
          }.bind(this),
          0
        );
      }

      if (stateName === "playerTurn") {
        this.clearTransientArenaAfterAction(0);
        let maskFromServer = 0;
        if (args && typeof args.performed_actions_mask !== "undefined") {
          maskFromServer = args.performed_actions_mask;
        } else if (
          args &&
          args.args &&
          typeof args.args.performed_actions_mask !== "undefined"
        ) {
          maskFromServer = args.args.performed_actions_mask;
        }
        this.currentTurnActionMask =
          (parseInt(maskFromServer || 0, 10) || 0) & 0b01111;
        let performedFromServer = 0;
        let maxFromServer = 2;
        if (args && typeof args.performed_actions_count !== "undefined") {
          performedFromServer = args.performed_actions_count;
        } else if (
          args &&
          args.args &&
          typeof args.args.performed_actions_count !== "undefined"
        ) {
          performedFromServer = args.args.performed_actions_count;
        }
        if (args && typeof args.max_actions_this_turn !== "undefined") {
          maxFromServer = args.max_actions_this_turn;
        } else if (
          args &&
          args.args &&
          typeof args.args.max_actions_this_turn !== "undefined"
        ) {
          maxFromServer = args.args.max_actions_this_turn;
        }
        this.currentTurnPerformedActionsCount = Math.max(
          0,
          parseInt(performedFromServer || 0, 10) || 0
        );
        this.currentTurnMaxActions = Math.max(
          1,
          parseInt(maxFromServer || 2, 10) || 2
        );
        if (args && args.skill_state) {
          this.mySkillState = args.skill_state;
          this.applyPublicSkillStateForPlayer(this.player_id, this.mySkillState);
          this.refreshCurrentPlayerSkillTooltips();
        } else if (args && args.args && args.args.skill_state) {
          this.mySkillState = args.args.skill_state;
          this.applyPublicSkillStateForPlayer(this.player_id, this.mySkillState);
          this.refreshCurrentPlayerSkillTooltips();
        }
      }

      switch (stateName) {
        case "playerTurn":
          this.updatePossibleActions(args.can_do);
          break;
      }
      this.refreshHandCardReadinessVisuals(stateName, args);
    },

    updatePossibleActions: function (possibleActions) {
      this.playerActionCards.unselectAll();
      this.playerBelieverCards.unselectAll();

      if (this.isCurrentPlayerActive()) {
        // Update selection permissions based on state
      }
    },

    getSingleSelectedBelieverCardId: function () {
      const items =
        (this.playerBelieverCards &&
          typeof this.playerBelieverCards.getSelectedItems === "function" &&
          this.playerBelieverCards.getSelectedItems()) ||
        [];
      if (!items || items.length !== 1) return 0;
      return parseInt((items[0] && items[0].id) || 0, 10) || 0;
    },

    rememberPreferredDuelBelieverSelection: function () {
      const stateName = String(this.getCurrentStateName() || "");
      if (
        [
          "faithWarDuel",
          "faithDebateDuel",
          "resolveDuel",
          "resolveFaithDebateDuel",
          "chooseWarRepresentative",
          "chooseFaithDebateRepresentative",
        ].indexOf(stateName) === -1
      ) {
        return;
      }
      const selectedId = this.getSingleSelectedBelieverCardId();
      if (selectedId > 0) {
        this.preferredDuelBelieverCardId = selectedId;
      }
    },

    clearPreferredDuelBelieverSelection: function () {
      this.preferredDuelBelieverCardId = 0;
    },

    hasMyBelieverCardInHandById: function (cardId) {
      const id = parseInt(cardId || 0, 10);
      if (id <= 0) return false;
      if (dojo.byId("mybelievercards_item_" + id)) return true;
      const root = dojo.byId("mybelievercards");
      if (!root) return false;
      return (
        dojo.query(
          '.stockitem[data-item-id="' +
            id +
            '"], .stockitem[data-card-id="' +
            id +
            '"], [data-item-id="' +
            id +
            '"], [data-card-id="' +
            id +
            '"]',
          root
        ).length > 0
      );
    },

    tryRestorePreferredDuelBelieverSelection: function (stateName) {
      const rawState = String(stateName || this.getCurrentStateName() || "");
      const duelState =
        rawState === "resolveDuel"
          ? "faithWarDuel"
          : rawState === "resolveFaithDebateDuel"
          ? "faithDebateDuel"
          : rawState;
      if (duelState !== "faithWarDuel" && duelState !== "faithDebateDuel") {
        return;
      }
      if (!this.isCurrentPlayerActive()) return;
      if (this.hasCommittedDuelBelieverThisRound) return;
      if (this.getSingleSelectedBelieverCardId() > 0) {
        this.rememberPreferredDuelBelieverSelection();
        return;
      }
      if (
        duelState === "faithWarDuel" &&
        this.canCurrentPlayerUseZombieArmyFromGrave() &&
        parseInt(this.selectedZombieGraveCardId || 0, 10) > 0
      ) {
        // Keep graveyard preselection as priority for Zombie Army flow.
        return;
      }
      const preferredId = parseInt(this.preferredDuelBelieverCardId || 0, 10);
      if (preferredId <= 0) return;
      if (!this.hasMyBelieverCardInHandById(preferredId)) {
        this.clearPreferredDuelBelieverSelection();
        return;
      }

      if (
        this.playerBelieverCards &&
        typeof this.playerBelieverCards.selectItem === "function"
      ) {
        this.playerBelieverCards.selectItem(preferredId);
      } else {
        const node =
          dojo.byId("mybelievercards_item_" + preferredId) ||
          dojo.query(
            '.stockitem[data-item-id="' +
              preferredId +
              '"], .stockitem[data-card-id="' +
              preferredId +
              '"], [data-item-id="' +
              preferredId +
              '"], [data-card-id="' +
              preferredId +
              '"]',
            dojo.byId("mybelievercards")
          )[0];
        if (node && typeof node.click === "function") {
          node.click();
        }
      }
      this.rememberPreferredDuelBelieverSelection();
    },

    setupPanelCounterMirrors: function (players) {
      const makeMirror = function (tableId, panelId) {
        const tableElem = dojo.byId(tableId);
        const panelElem = dojo.byId(panelId);
        if (!tableElem || !panelElem) {
          return;
        }

        const syncNow = function () {
          panelElem.innerHTML = tableElem.innerHTML;
        };
        syncNow();

        if (typeof MutationObserver !== "undefined") {
          const observer = new MutationObserver(syncNow);
          observer.observe(tableElem, {
            childList: true,
            characterData: true,
            subtree: true,
          });
          this.counterMirrorObservers.push(observer);
        }
      }.bind(this);

      for (const player_id in players) {
        makeMirror(
          "table_action_count_" + player_id,
          "action_count_" + player_id
        );
        makeMirror(
          "table_believer_count_" + player_id,
          "believer_count_" + player_id
        );
      }
    },

    getStockDomCount: function (containerId) {
      const root = dojo.byId(containerId);
      if (!root) return 0;
      return dojo.query(".stockitem", root).length;
    },

    getStockCardIdsFromContainer: function (containerId) {
      const root = dojo.byId(containerId);
      if (!root) return [];
      const ids = [];
      dojo.query(".stockitem", root).forEach(
        function (node) {
          if (containerId === "myactioncards") {
            const actionIds =
              this.extractActionCardIdCandidatesFromStockNode(node);
            if (actionIds.length > 0) {
              ids.push(actionIds[0]);
              return;
            }
          }
          const dataCardId = parseInt(
            node.getAttribute("data-card-id") || 0,
            10
          );
          if (dataCardId > 0) {
            ids.push(dataCardId);
            return;
          }
          const idText = String(node.id || "");
          const m = idText.match(/(\d+)$/);
          if (!m) return;
          ids.push(parseInt(m[1], 10));
        }.bind(this)
      );
      return ids;
    },

    replaceCurrentBelieverHand: function (cards) {
      const existingIds = this.getStockCardIdsFromContainer("mybelievercards");
      existingIds.forEach(
        function (cardId) {
          this.playerBelieverCards.removeFromStockById(cardId);
        }.bind(this)
      );
      (cards || []).forEach(
        function (card) {
          if (!card || typeof card.type === "undefined" || !card.id) return;
          this.playerBelieverCards.addToStockWithId(
            parseInt(card.type, 10),
            parseInt(card.id, 10)
          );
        }.bind(this)
      );
      this.syncCurrentPlayerHandCounters();
    },

    replaceCurrentActionHand: function (cards) {
      const existingIds = this.getStockCardIdsFromContainer("myactioncards");
      existingIds.forEach(
        function (cardId) {
          this.playerActionCards.removeFromStockById(cardId);
          delete this.actionCardTypeById[String(cardId)];
        }.bind(this)
      );
      (cards || []).forEach(
        function (card) {
          if (!card || !card.type || !card.id) return;
          const spriteType = this.getActionCardSpriteIndex(String(card.type));
          this.playerActionCards.addToStockWithId(
            spriteType,
            parseInt(card.id, 10)
          );
          this.actionCardTypeById[String(card.id)] = String(card.type);
        }.bind(this)
      );
      this.syncCurrentPlayerHandCounters();
    },

    refreshCurrentPlayerSkillTooltips: function () {
      const selfState = this.getEffectiveSkillStateForPanel(this.player_id);
      const skillRoot = dojo.byId("myskillcards");
      if (skillRoot) {
        dojo.query(".stockitem", skillRoot).forEach(
          function (node) {
            const t = parseInt(dojo.attr(node, "data-index") || "0", 10);
            this.attachSkillTooltip(node, t, selfState);
          }.bind(this)
        );
      }

      const panelSkillNode = dojo.byId("skill_icon_" + this.player_id);
      if (panelSkillNode) {
        const t = parseInt(dojo.attr(panelSkillNode, "data-index") || "0", 10);
        this.attachSkillTooltip(panelSkillNode, t, selfState);
      }
    },

    applySkillRevealToPlayer: function (playerId, skillType, skillState) {
      const pid = String(playerId);
      if (!this.gamedatas.player_skills_revealed) {
        this.gamedatas.player_skills_revealed = {};
      }
      this.gamedatas.player_skills_revealed[pid] = 1;
      if (!this.gamedatas.player_skills) {
        this.gamedatas.player_skills = {};
      }
      this.gamedatas.player_skills[pid] = {
        type: parseInt(skillType, 10),
      };
      if (skillState) {
        this.applyPublicSkillStateForPlayer(pid, skillState);
      }

      const icon = dojo.byId("skill_icon_" + pid);
      if (icon) {
        dojo.removeClass(icon, "card-skill-back");
        dojo.removeClass(icon, "panel-skill-back");
        dojo.addClass(icon, "card-skill");
        dojo.addClass(icon, "panel-skill-front");
        dojo.attr(icon, "data-index", parseInt(skillType, 10));
        const stateForTip =
          this.getEffectiveSkillStateForPanel(pid) || skillState || null;
        this.attachSkillTooltip(icon, parseInt(skillType, 10), stateForTip);
      }
      this.refreshPlayerSkillActiveBadge(pid);
    },

    hideSkillForPlayer: function (playerId) {
      const pid = String(playerId);
      if (!this.gamedatas.player_skills_revealed) {
        this.gamedatas.player_skills_revealed = {};
      }
      this.gamedatas.player_skills_revealed[pid] = 0;
      if (!this.gamedatas.player_skills) {
        this.gamedatas.player_skills = {};
      }
      this.gamedatas.player_skills[pid] = null;
      this.applyPublicSkillStateForPlayer(pid, null);

      const icon = dojo.byId("skill_icon_" + pid);
      if (icon) {
        dojo.removeClass(icon, "card-skill");
        dojo.removeClass(icon, "panel-skill-front");
        dojo.addClass(icon, "card-skill-back");
        dojo.addClass(icon, "panel-skill-back");
        dojo.attr(icon, "data-index", 0);
        this.attachSkillTooltip(icon, 0, null);
      }
    },

    replaceCurrentPlayerSkillCard: function (oldSkillCardId, newSkillCard) {
      const oldId = parseInt(oldSkillCardId || 0, 10);
      if (oldId > 0) {
        try {
          this.playerSkillCards.removeFromStockById(oldId);
        } catch (e) {}
      }
      if (newSkillCard && newSkillCard.id && newSkillCard.type) {
        this.playerSkillCards.addToStockWithId(
          parseInt(newSkillCard.type, 10),
          parseInt(newSkillCard.id, 10)
        );
      }
    },

    isImpermanenceActiveForCurrentPlayer: function () {
      const state = this.mySkillState || null;
      if (state && parseInt(state.skill_type || 0, 10) === 12) {
        return true;
      }
      const skill =
        this.gamedatas &&
        this.gamedatas.player_skills &&
        this.gamedatas.player_skills[String(this.player_id)];
      return !!(skill && parseInt(skill.type || 0, 10) === 12);
    },

    resolvePlayerAnchorNodeId: function (playerId, options) {
      const pid = String(playerId || "");
      if (!pid) return null;
      const opts = options || {};
      const selfNodeId = String(opts.selfNodeId || "");
      if (pid === String(this.player_id || "") && selfNodeId) {
        return dojo.byId(selfNodeId) ? selfNodeId : null;
      }
      const allowTable = opts.allowTable !== false;
      const allowPanel = opts.allowPanel !== false;
      const preferTable = opts.preferTable !== false;
      const candidates = preferTable
        ? ["playertable_" + pid, "panel_" + pid]
        : ["panel_" + pid, "playertable_" + pid];
      for (let i = 0; i < candidates.length; i++) {
        const id = candidates[i];
        if (!allowTable && id.indexOf("playertable_") === 0) continue;
        if (!allowPanel && id.indexOf("panel_") === 0) continue;
        if (!dojo.byId(id)) continue;
        if (this.isNodeUsableForCardFlight(id)) return id;
      }
      const fallbackId = String(opts.fallbackId || "");
      if (
        fallbackId &&
        dojo.byId(fallbackId) &&
        this.isNodeUsableForCardFlight(fallbackId)
      )
        return fallbackId;
      return null;
    },

    resolvePlayerCardAnchorNodeId: function (playerId, mode, cardKind) {
      const pid = String(playerId || "");
      if (!pid) return null;
      const kind = String(cardKind || "action");
      const anchorMode = String(mode || "public");
      if (anchorMode === "receive") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: kind === "believer" ? "mybelievercards" : "myactioncards",
          preferTable: true,
        });
      }
      if (anchorMode === "return") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: kind === "believer" ? "mybelievercards" : "myactioncards",
          preferTable: false,
        });
      }
      if (anchorMode === "play_action") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: "myactioncards",
          preferTable: true,
        });
      }
      if (anchorMode === "redistribute_source") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: kind === "believer" ? "mybelievercards" : "myactioncards",
          preferTable: true,
          allowPanel: false,
        });
      }
      if (anchorMode === "redistribute_target") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: kind === "believer" ? "mybelievercards" : "myactioncards",
          preferTable: true,
          allowPanel: false,
        });
      }
      return this.resolvePlayerAnchorNodeId(pid, { preferTable: true });
    },

    getCardBackClassByKind: function (cardKind) {
      return cardKind === "believer"
        ? "card card-back-believer"
        : "card card-back-action";
    },

    getBelieverSpriteBackgroundPosition: function (type) {
      const t = Math.max(0, Math.min(5, parseInt(type || 0, 10) || 0));
      return String(t * 20) + "% 0%";
    },

    getActionSpriteBackgroundPosition: function (spriteIdx) {
      const idx = Math.max(0, Math.min(15, parseInt(spriteIdx || 0, 10) || 0));
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      return String(col * 33.333) + "% " + String(row * 33.333) + "%";
    },

    getThemeAssetUrl: function (relativePath) {
      const rel = String(relativePath || "").replace(/^\/+/, "");
      let root =
        (typeof g_gamethemeurl !== "undefined" && g_gamethemeurl) ||
        (this.bga &&
          this.bga.gamedatas &&
          this.bga.gamedatas.gamethemeurl) ||
        this.resolvedThemeRootUrl ||
        "";
      if (!root) {
        root = this.detectThemeRootUrl();
      }
      return root ? String(root).replace(/\/+$/, "") + "/" + rel : rel;
    },

    detectThemeRootUrl: function () {
      if (this.resolvedThemeRootUrl) {
        return this.resolvedThemeRootUrl;
      }
      let detected = "";
      const docs =
        typeof document !== "undefined" && document ? document : null;
      if (docs && docs.querySelectorAll) {
        const nodes = docs.querySelectorAll("script[src],link[href]");
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const raw =
            String(
              (node && (node.getAttribute("src") || node.getAttribute("href"))) ||
                ""
            ) || "";
          if (!raw) continue;
          const normalized = raw.replace(/\\/g, "/");
          const marker = "/games/hegemonyoffaith/";
          const at = normalized.indexOf(marker);
          if (at < 0) continue;
          const cut = normalized.indexOf("/modules/", at);
          if (cut > at) {
            detected = normalized.substring(0, cut);
            break;
          }
          const cssCut = normalized.indexOf("/hegemonyoffaith.css", at);
          if (cssCut > at) {
            detected = normalized.substring(0, cssCut);
            break;
          }
        }
      }
      if (detected) {
        this.resolvedThemeRootUrl = detected.replace(/\/+$/, "");
      }
      return this.resolvedThemeRootUrl || "";
    },

    ensureStableNodeId: function (node, prefix) {
      if (!node) return "";
      if (node.id) return String(node.id);
      const id =
        String(prefix || "hof_node") +
        "_" +
        Math.floor(Math.random() * 1000000).toString();
      node.id = id;
      return id;
    },

    forceBelieverFaceSpriteOnNode: function (node, type) {
      if (!node) return false;
      const t = Math.max(0, Math.min(5, parseInt(type || 0, 10) || 0));
      const spritePos = this.getBelieverSpriteBackgroundPosition(t);
      const candidates = [];
      const primaryUrl = this.getThemeAssetUrl("img/believer_cards_en.png");
      if (primaryUrl) candidates.push(String(primaryUrl));
      const detectedRoot = this.detectThemeRootUrl();
      if (detectedRoot) {
        candidates.push(
          String(detectedRoot).replace(/\/+$/, "") + "/img/believer_cards_en.png"
        );
      }
      candidates.push("img/believer_cards_en.png");
      const seen = {};
      let isSet = false;

      for (let i = 0; i < candidates.length; i++) {
        const rawUrl = String(candidates[i] || "");
        if (!rawUrl || seen[rawUrl]) continue;
        seen[rawUrl] = true;
        if (node && node.style && typeof node.style.setProperty === "function") {
          node.style.setProperty("background", 'url("' + rawUrl + '") no-repeat', "important");
          node.style.setProperty(
            "background-image",
            'url("' + rawUrl + '")',
            "important"
          );
          node.style.setProperty("background-size", "600% 100%", "important");
          node.style.setProperty("background-repeat", "no-repeat", "important");
          node.style.setProperty(
            "background-position",
            String(spritePos || "0% 0%"),
            "important"
          );
          node.style.setProperty("background-color", "transparent", "important");
        }
        if (node && node.ownerDocument && node.ownerDocument.defaultView) {
          const win = node.ownerDocument.defaultView;
          const computed = win.getComputedStyle(node);
          const bg = String((computed && computed.backgroundImage) || "");
          if (bg && bg !== "none") {
            isSet = true;
            break;
          }
        }
      }

      return isSet;
    },

    applyBelieverFaceToNode: function (node, type) {
      if (!node) return;
      dojo.removeClass(node, "card-back-believer");
      dojo.removeClass(node, "facedown");
      dojo.removeClass(node, "aoe-defense-facedown");
      dojo.removeClass(node, "card-action");
      dojo.addClass(node, "card-believer");
      node.setAttribute("data-index", String(parseInt(type || 0, 10) || 0));
      this.applyInlineBelieverFaceStyle(node, type);
      this.forceBelieverFaceSpriteOnNode(node, type);
      this.attachBelieverTooltip(node, parseInt(type || 0, 10) || 0);
    },

    applyActionFaceToNode: function (node, cardType) {
      if (!node) return;
      const actionIdx = this.getActionCardSpriteIndex(cardType);
      dojo.removeClass(node, "card-back-believer");
      dojo.removeClass(node, "facedown");
      dojo.removeClass(node, "aoe-defense-facedown");
      dojo.removeClass(node, "card-believer");
      dojo.addClass(node, "card-action");
      node.setAttribute("data-index", String(actionIdx));
      node.removeAttribute("data-believer-type");
      this.applyInlineActionFaceStyle(node, actionIdx);
      this.attachActionCardTooltip(node, cardType);
    },

    clearCombatRevealOverlay: function (anchorNode) {
      if (!anchorNode || !anchorNode.getAttribute) return;
      const overlayId = String(
        anchorNode.getAttribute("data-reveal-overlay-id") || ""
      );
      if (overlayId) {
        const overlayNode = dojo.byId(overlayId);
        if (overlayNode) dojo.destroy(overlayNode);
        anchorNode.removeAttribute("data-reveal-overlay-id");
      }
      dojo.style(anchorNode, {
        visibility: "",
        opacity: "",
      });
    },

    clearCombatRevealOverlayWithin: function (nodeOrId) {
      const root =
        typeof nodeOrId === "string" ? dojo.byId(nodeOrId) : nodeOrId || null;
      if (!root) return;
      const directCard =
        root.className && /\bcombat-result-card\b/.test(root.className)
          ? root
          : null;
      const cardNodes = directCard
        ? [directCard]
        : dojo.query(".combat-result-card", root);
      (cardNodes || []).forEach(
        function (cardNode) {
          this.clearCombatRevealOverlay(cardNode);
        }.bind(this)
      );
    },

    syncCombatRevealOverlayLabel: function (anchorNode, labelText, resultType) {
      if (!anchorNode || !anchorNode.getAttribute) return;
      const overlayId = String(
        anchorNode.getAttribute("data-reveal-overlay-id") || ""
      );
      if (!overlayId) return;
      const overlayNode = dojo.byId(overlayId);
      if (!overlayNode) return;
      const labelNode = dojo.query(".combat-result-label", overlayNode)[0] || null;
      if (!labelNode) return;
      labelNode.innerHTML = String(labelText || "");
      dojo.removeClass(labelNode, "is-hit");
      dojo.removeClass(labelNode, "is-miss");
      dojo.removeClass(labelNode, "is-win");
      dojo.removeClass(labelNode, "is-lose");
      dojo.removeClass(labelNode, "is-draw");
      const normalized = String(resultType || "").toLowerCase();
      if (normalized === "winner" || normalized === "win") {
        dojo.addClass(labelNode, "is-win");
      } else if (normalized === "loser" || normalized === "lose") {
        dojo.addClass(labelNode, "is-lose");
      } else if (normalized === "draw") {
        dojo.addClass(labelNode, "is-draw");
      }
    },

    applyInlineBelieverFaceStyle: function (node, type) {
      if (!node) return;
      const spriteIdx = Math.max(0, Math.min(5, parseInt(type || 0, 10) || 0));
      const spritePos = this.getBelieverSpriteBackgroundPosition(spriteIdx);
      const spriteUrl = this.getThemeAssetUrl("img/believer_cards_en.png");
      if (node.style && typeof node.style.removeProperty === "function") {
        node.style.removeProperty("width");
        node.style.removeProperty("height");
        node.style.removeProperty("min-width");
        node.style.removeProperty("min-height");
      }
      dojo.style(node, {
        display: "inline-block",
        opacity: "1",
      });
      node.setAttribute("data-index", String(spriteIdx));
      if (node && node.style && typeof node.style.setProperty === "function") {
        node.style.setProperty(
          "background",
          'url("' + String(spriteUrl || "") + '") no-repeat',
          "important"
        );
        node.style.setProperty(
          "background-image",
          'url("' + String(spriteUrl || "") + '")',
          "important"
        );
        node.style.setProperty("background-size", "600% 100%", "important");
        node.style.setProperty("background-repeat", "no-repeat", "important");
        node.style.setProperty(
          "background-position",
          String(spritePos || "0% 0%"),
          "important"
        );
        node.style.setProperty("background-color", "transparent", "important");
      }
    },

    applyInlineActionFaceStyle: function (node, spriteIdx) {
      if (!node) return;
      const actionIdx = Math.max(
        0,
        Math.min(15, parseInt(spriteIdx || 0, 10) || 0)
      );
      const spritePos = this.getActionSpriteBackgroundPosition(actionIdx);
      const spriteUrl = this.getThemeAssetUrl("img/action_cards_en.png");
      if (node.style && typeof node.style.removeProperty === "function") {
        node.style.removeProperty("width");
        node.style.removeProperty("height");
        node.style.removeProperty("min-width");
        node.style.removeProperty("min-height");
      }
      dojo.style(node, {
        display: "inline-block",
        opacity: "1",
      });
      node.setAttribute("data-index", String(actionIdx));
      if (node && node.style && typeof node.style.setProperty === "function") {
        node.style.setProperty(
          "background-image",
          'url("' + String(spriteUrl || "") + '")',
          "important"
        );
        node.style.setProperty("background-size", "400% 400%", "important");
        node.style.setProperty("background-repeat", "no-repeat", "important");
        node.style.setProperty(
          "background-position",
          String(spritePos || "0% 0%"),
          "important"
        );
      }
    },

    isNodeUsableForCardFlight: function (nodeOrId) {
      const node =
        typeof nodeOrId === "string" ? dojo.byId(nodeOrId) : nodeOrId || null;
      if (!node) return false;
      try {
        const pos = dojo.position(node, true);
        if (!pos) return false;
        return parseFloat(pos.w || 0) > 2 && parseFloat(pos.h || 0) > 2;
      } catch (e) {
        return false;
      }
    },

    ensureCardFlightRootPositioned: function (rootNode) {
      if (!rootNode) return;
      if (rootNode === document.body || rootNode === document.documentElement) {
        return;
      }
      const pos = String(dojo.style(rootNode, "position") || "");
      if (
        pos !== "relative" &&
        pos !== "absolute" &&
        pos !== "fixed" &&
        pos !== "sticky"
      ) {
        dojo.style(rootNode, "position", "relative");
      }
    },

    isNodeWithinContainer: function (containerNode, nodeOrId) {
      const node =
        typeof nodeOrId === "string" ? dojo.byId(nodeOrId) : nodeOrId || null;
      if (!containerNode || !node) return false;
      let cursor = node;
      while (cursor) {
        if (cursor === containerNode) return true;
        cursor = cursor.parentNode || null;
      }
      return false;
    },

    chooseCardFlightRoot: function (sourceNode, targetNode, preferredRootId) {
      const preferredRoot = dojo.byId(preferredRootId || "game_play_area");
      if (
        preferredRoot &&
        this.isNodeWithinContainer(preferredRoot, sourceNode) &&
        this.isNodeWithinContainer(preferredRoot, targetNode)
      ) {
        return preferredRoot;
      }
      return typeof dojo.body === "function" ? dojo.body() : document.body;
    },

    getCardFlightSourcePositionInRoot: function (sourceNode, rootNode) {
      const src = sourceNode ? dojo.position(sourceNode, true) : null;
      if (!src) return { left: 0, top: 0 };
      if (
        !rootNode ||
        rootNode === document.body ||
        rootNode === document.documentElement
      ) {
        return {
          left: Math.round(parseFloat(src.x || 0)),
          top: Math.round(parseFloat(src.y || 0)),
        };
      }
      const rootPos = dojo.position(rootNode, true) || { x: 0, y: 0 };
      return {
        left: Math.round(parseFloat(src.x || 0) - parseFloat(rootPos.x || 0)),
        top: Math.round(parseFloat(src.y || 0) - parseFloat(rootPos.y || 0)),
      };
    },

    lockTempCardSizeToNode: function (tempNodeOrId, sourceNodeOrId, important) {
      const tempNode =
        typeof tempNodeOrId === "string"
          ? dojo.byId(tempNodeOrId)
          : tempNodeOrId || null;
      const sourceNode =
        typeof sourceNodeOrId === "string"
          ? dojo.byId(sourceNodeOrId)
          : sourceNodeOrId || null;
      if (!tempNode || !sourceNode) return false;
      const sourcePos = dojo.position(sourceNode, true);
      const width = Math.round(parseFloat((sourcePos && sourcePos.w) || 0));
      const height = Math.round(parseFloat((sourcePos && sourcePos.h) || 0));
      if (!(width > 0) || !(height > 0)) return false;
      const priority = important ? "important" : "";
      tempNode.style.setProperty("width", width + "px", priority);
      tempNode.style.setProperty("height", height + "px", priority);
      return true;
    },

    getCardFlightScaleBetweenNodes: function (sourceNodeOrId, targetNodeOrId) {
      const sourceNode =
        typeof sourceNodeOrId === "string"
          ? dojo.byId(sourceNodeOrId)
          : sourceNodeOrId || null;
      const targetNode =
        typeof targetNodeOrId === "string"
          ? dojo.byId(targetNodeOrId)
          : targetNodeOrId || null;
      if (!sourceNode || !targetNode) return 1;
      const sourcePos = dojo.position(sourceNode, true);
      const targetPos = dojo.position(targetNode, true);
      const sourceW = parseFloat((sourcePos && sourcePos.w) || 0);
      const targetW = parseFloat((targetPos && targetPos.w) || 0);
      if (!(sourceW > 0) || !(targetW > 0)) return 1;
      return Math.max(0.35, Math.min(1.8, targetW / sourceW));
    },

    getCardFlightTargetPositionInRoot: function (
      targetNode,
      rootNode,
      mobileNode
    ) {
      const targetPos = targetNode ? dojo.position(targetNode, true) : null;
      if (!targetPos) return { left: 0, top: 0 };
      const mobilePos = mobileNode ? dojo.position(mobileNode, true) : null;
      const mobileW = Math.max(0, parseFloat((mobilePos && mobilePos.w) || 0));
      const mobileH = Math.max(0, parseFloat((mobilePos && mobilePos.h) || 0));
      const rootPos =
        !rootNode ||
        rootNode === document.body ||
        rootNode === document.documentElement
          ? { x: 0, y: 0 }
          : dojo.position(rootNode, true) || { x: 0, y: 0 };
      return {
        left: Math.round(
          parseFloat(targetPos.x || 0) -
            parseFloat(rootPos.x || 0) +
            parseFloat(targetPos.w || 0) / 2 -
            mobileW / 2
        ),
        top: Math.round(
          parseFloat(targetPos.y || 0) -
            parseFloat(rootPos.y || 0) +
            parseFloat(targetPos.h || 0) / 2 -
            mobileH / 2
        ),
      };
    },

    shouldUseAbsoluteCardFlight: function (sourceNode, targetNode) {
      if (!sourceNode || !targetNode) return false;
      const sourceId = String(sourceNode.id || "");
      const className = String(sourceNode.className || "");
      if (
        sourceId.indexOf("card_fly_") === 0 ||
        sourceId.indexOf("card_clone_fly_") === 0 ||
        sourceId.indexOf("revive_anim_") === 0 ||
        sourceId.indexOf("witchhunt_fly_") === 0 ||
        sourceId.indexOf("impermanence_showcase_fly_") === 0 ||
        sourceId.indexOf("prophet_") === 0
      ) {
        return true;
      }
      if (
        className.indexOf("panel-fly-temp-card") !== -1 ||
        className.indexOf("revive-fly-card") !== -1 ||
        className.indexOf("witchhunt-fly-card") !== -1 ||
        className.indexOf("impermanence-victory-fly-card") !== -1
      ) {
        return true;
      }
      const sourceParent = sourceNode.parentNode || null;
      const targetParent = targetNode.parentNode || null;
      if (sourceParent && targetParent && sourceParent !== targetParent) {
        return true;
      }
      return false;
    },

    createAbsoluteCardFlightAnimation: function (
      sourceNode,
      targetNode,
      duration,
      delay
    ) {
      if (!sourceNode || !targetNode) return null;
      const root =
        sourceNode.parentNode ||
        (typeof dojo.body === "function" ? dojo.body() : document.body);
      if (!root) return null;
      this.ensureCardFlightRootPositioned(root);
      const startPos = this.getCardFlightSourcePositionInRoot(sourceNode, root);
      const endPos = this.getCardFlightTargetPositionInRoot(
        targetNode,
        root,
        sourceNode
      );
      dojo.style(sourceNode, {
        position: "absolute",
        left: startPos.left + "px",
        top: startPos.top + "px",
      });
      return dojo.animateProperty({
        node: sourceNode,
        duration: Math.max(0, parseInt(duration || 0, 10)),
        delay: Math.max(0, parseInt(delay || 0, 10)),
        properties: {
          left: {
            start: startPos.left,
            end: endPos.left,
          },
          top: {
            start: startPos.top,
            end: endPos.top,
          },
        },
      });
    },

    animateCardFlightBatch: function (spec) {
      const args = spec || {};
      const sourceId = String(args.sourceId || "");
      const targetId = String(args.targetId || "");
      const count = Math.max(0, parseInt(args.count || 0, 10));
      const cap = Math.max(
        1,
        parseInt(typeof args.cap !== "undefined" ? args.cap : count, 10)
      );
      const duration = Math.max(0, parseInt(args.duration || 520, 10));
      const delayStep = Math.max(0, parseInt(args.delayStep || 100, 10));
      let nextDelay = Math.max(0, parseInt(args.startDelay || 0, 10));
      if (!count || !sourceId || !targetId) return nextDelay;
      if (!dojo.byId(sourceId) || !dojo.byId(targetId)) return nextDelay;
      const visualN = Math.min(cap, count);
      const cardClass =
        typeof args.cardClass === "string" && args.cardClass.length
          ? args.cardClass
          : this.getCardBackClassByKind(args.cardKind || "action");
      for (let i = 0; i < visualN; i++) {
        this.animateTempCardFlight({
          sourceId: sourceId,
          targetId: targetId,
          cardClass: cardClass,
          duration: duration,
          startDelay: nextDelay,
          fromScale:
            typeof args.fromScale === "number" ? Number(args.fromScale) : 1,
          toScale: typeof args.toScale === "number" ? Number(args.toScale) : 1,
          dataIndex: parseInt(args.dataIndex || 0, 10),
        });
        nextDelay += delayStep;
      }
      return nextDelay;
    },

    getRedistributeSourceNodeId: function (cardKind, playerId) {
      const pid = String(playerId || "");
      if (!pid) return null;
      return this.resolvePlayerCardAnchorNodeId(
        pid,
        "redistribute_source",
        cardKind
      );
    },

    getRedistributeTargetNodeId: function (cardKind, playerId) {
      const pid = String(playerId || "");
      if (!pid) return null;
      return this.resolvePlayerCardAnchorNodeId(
        pid,
        "redistribute_target",
        cardKind
      );
    },

    getVisibleHandCountForRedistributeFx: function (cardKind, playerId) {
      const pid = parseInt(playerId || 0, 10);
      if (pid <= 0) return 0;
      if (String(pid) === String(this.player_id || "")) {
        return this.getStockDomCount(
          cardKind === "believer" ? "mybelievercards" : "myactioncards"
        );
      }
      return cardKind === "believer"
        ? this.getPublicBelieverCountForPlayer(pid)
        : this.getPublicActionCountForPlayer(pid);
    },

    setCurrentHandConcealedForRedistribute: function (cardKind, concealed) {
      const rootId = cardKind === "believer" ? "mybelievercards" : "myactioncards";
      const root = dojo.byId(rootId);
      if (!root) return;
      if (concealed) {
        dojo.addClass(root, "redistribute-hand-concealed");
      } else {
        dojo.removeClass(root, "redistribute-hand-concealed");
      }
    },

    ensureRedistributeCenterAnchorNodeId: function (cardKind) {
      const arena = dojo.byId("central_arena");
      if (!arena) return null;
      const kind = cardKind === "believer" ? "believer" : "action";
      const anchorId = "redistribute_center_anchor_" + kind;
      let anchor = dojo.byId(anchorId);
      if (!anchor) {
        dojo.place(
          '<div id="' +
            anchorId +
            '" class="redistribute-center-anchor redistribute-center-anchor-' +
            kind +
            '"></div>',
          arena,
          "last"
        );
        anchor = dojo.byId(anchorId);
      }
      if (!anchor) return null;
      if (anchor.parentNode !== arena) {
        dojo.place(anchor, arena, "last");
      }
      dojo.style(anchor, {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: "108px",
        height: "150px",
        marginLeft: "-54px",
        marginTop: "-75px",
        pointerEvents: "none",
        zIndex: 2480,
      });
      return anchorId;
    },

    showCenterShuffleFx: function (cardKind, anchorNodeId) {
      const isBeliever = cardKind === "believer";
      const arena = dojo.byId("central_arena");
      const gameArea = dojo.byId("game_play_area");
      const shuffleHoldMs = this.getUnifiedRedistributeShuffleHoldMs();
      const pulseMs = this.getUnifiedShufflePulseMs();
      const staggerMs = this.getUnifiedCardFlightStaggerMs();
      const fxId =
        (isBeliever ? "everyone_equal" : "chaos_coming") + "_shuffle_fx";
      const backClass = isBeliever ? "card-back-believer" : "card-back-action";
      const old = dojo.byId(fxId);
      if (old) dojo.destroy(old);
      if (gameArea || arena) {
        dojo.place(
          '<div id="' +
            fxId +
            '" class="skill-shuffle-fx-wrap">' +
            '<div class="skill-shuffle-fx-layer panel-fly-temp-card ' +
            backClass +
            ' layer-a"></div>' +
            '<div class="skill-shuffle-fx-layer panel-fly-temp-card ' +
            backClass +
            ' layer-b"></div>' +
            '<div class="skill-shuffle-fx-layer panel-fly-temp-card ' +
            backClass +
            ' layer-c"></div>' +
            "</div>",
          gameArea || arena
        );
        if (gameArea && arena) {
          const anchorTargetId =
            anchorNodeId && dojo.byId(anchorNodeId)
              ? anchorNodeId
              : "central_arena";
          this.placeOnObject(fxId, anchorTargetId);
          dojo.style(fxId, {
            position: "absolute",
            zIndex: 2600,
          });
        }
        setTimeout(function () {
          const node = dojo.byId(fxId);
          if (node) dojo.destroy(node);
        }, shuffleHoldMs + staggerMs * 2);
      }

      dojo
        .query(
          ".table_status_area ." +
            (isBeliever ? "card-back-believer" : "card-back-action")
        )
        .forEach(function (node) {
          dojo.addClass(node, "skill-shuffle-pulse");
          setTimeout(function () {
            dojo.removeClass(node, "skill-shuffle-pulse");
          }, pulseMs);
        });
    },

    playGlobalHandRedistributeFx: function (
      cardKind,
      sourceCounts,
      distribution
    ) {
      const arena = dojo.byId("central_arena");
      const gameArea = dojo.byId("game_play_area");
      const centerNodeId =
        this.ensureRedistributeCenterAnchorNodeId(cardKind) ||
        (arena ? "central_arena" : gameArea ? "game_play_area" : null);
      if (!centerNodeId || !dojo.byId(centerNodeId)) return 0;
      this.setCurrentHandConcealedForRedistribute(cardKind, true);
      const cardClass = this.getCardBackClassByKind(cardKind);
      const players = this.getPlayersInSeatOrder();
      const src = sourceCounts || {};
      const dist = distribution || {};
      const collectCap = 3;
      const dealCap = 3;
      const flyMs = this.getUnifiedCardFlyMs();
      const staggerMs = this.getUnifiedCardFlightStaggerMs();
      let gatherDelay = 0;

      players.forEach(
        function (row) {
          const pid = parseInt(row.id || 0, 10);
          if (pid <= 0) return;
          const sourceId =
            this.getRedistributeSourceNodeId(cardKind, pid) ||
            this.resolvePlayerAnchorNodeId(pid, {
              preferTable: true,
              allowPanel: false,
            });
          if (!sourceId || !dojo.byId(sourceId)) return;
          const rawSource =
            typeof src[String(pid)] !== "undefined"
              ? src[String(pid)]
              : src[pid];
          const sourceCount =
            typeof rawSource !== "undefined"
              ? Math.max(0, parseInt(rawSource || 0, 10) || 0)
              : this.getVisibleHandCountForRedistributeFx(cardKind, pid);
          const visibleCount = this.getVisibleHandCountForRedistributeFx(
            cardKind,
            pid
          );
          const visualN = Math.min(
            collectCap,
            Math.max(0, sourceCount > 0 ? sourceCount : visibleCount)
          );
          gatherDelay = this.animateCardFlightBatch({
            sourceId: sourceId,
            targetId: centerNodeId,
            count: visualN,
            cap: collectCap,
            cardClass: cardClass,
            duration: flyMs,
            startDelay: gatherDelay,
            delayStep: staggerMs,
            fromScale: 1,
            toScale: 0.9,
            dataIndex: 0,
          });
        }.bind(this)
      );

      const gatherEndDelay = gatherDelay + flyMs;
      const shuffleDelay = Math.max(
        Math.round(staggerMs * 2),
        gatherEndDelay + Math.round(staggerMs * 1.2)
      );
      const shuffleFxHoldMs = this.getUnifiedRedistributeShuffleHoldMs();
      setTimeout(
        function () {
          this.showCenterShuffleFx(cardKind, centerNodeId);
        }.bind(this),
        shuffleDelay
      );

      let dealDelay = shuffleDelay + shuffleFxHoldMs;
      players.forEach(
        function (row) {
          const pid = parseInt(row.id || 0, 10);
          if (pid <= 0) return;
          const targetId =
            this.getRedistributeTargetNodeId(cardKind, pid) ||
            this.resolvePlayerAnchorNodeId(pid, {
              preferTable: true,
              allowPanel: false,
            });
          if (!targetId || !dojo.byId(targetId)) return;
          const rawCount =
            typeof dist[String(pid)] !== "undefined"
              ? dist[String(pid)]
              : dist[pid];
          const finalCount = Math.max(0, parseInt(rawCount || 0, 10) || 0);
          const toScale =
            String(pid) === String(this.player_id || "") ? 1 : 0.62;
          dealDelay = this.animateCardFlightBatch({
            sourceId: centerNodeId,
            targetId: targetId,
            count: finalCount,
            cap: dealCap,
            cardClass: cardClass,
            duration: flyMs,
            startDelay: dealDelay,
            delayStep: staggerMs,
            fromScale: 0.9,
            toScale: toScale,
            dataIndex: 0,
          });
        }.bind(this)
      );

      // Keep local hand concealed until authoritative syncActionHand/syncBelieverHand
      // arrives; otherwise old cards may flash back briefly before new hand replaces.
      const totalFxMs = Math.max(
        flyMs + shuffleFxHoldMs,
        parseInt(dealDelay || 0, 10) + flyMs + Math.round(staggerMs * 2)
      );
      return totalFxMs;
    },

    playEveryoneEqualShuffleFx: function (sourceCounts, distribution) {
      return this.playGlobalHandRedistributeFx(
        "believer",
        sourceCounts || {},
        distribution || {}
      );
    },

    pulseCurrentBelieverHandAfterRedistribute: function () {
      const root = dojo.byId("mybelievercards");
      if (!root) return;
      const nodes = dojo.query(".stockitem", root);
      if (!nodes || !nodes.length) return;
      const pulseMs = this.getUnifiedShufflePulseMs();
      nodes.forEach(function (node) {
        dojo.addClass(node, "skill-shuffle-pulse");
        setTimeout(function () {
          dojo.removeClass(node, "skill-shuffle-pulse");
        }, pulseMs);
      });
    },

    pulseCurrentActionHandAfterRedistribute: function () {
      const root = dojo.byId("myactioncards");
      if (!root) return;
      const nodes = dojo.query(".stockitem", root);
      if (!nodes || !nodes.length) return;
      const pulseMs = this.getUnifiedShufflePulseMs();
      nodes.forEach(function (node) {
        dojo.addClass(node, "skill-shuffle-pulse");
        setTimeout(function () {
          dojo.removeClass(node, "skill-shuffle-pulse");
        }, pulseMs);
      });
    },

    playChaosComingShuffleFx: function (sourceCounts, distribution) {
      return this.playGlobalHandRedistributeFx(
        "action",
        sourceCounts || {},
        distribution || {}
      );
    },

    markRedistributeDeckSourceSuppression: function (cardKind) {
      const kind = String(cardKind || "");
      const expiresAt = Date.now() + 9000;
      if (kind === "believer") {
        this.suppressDeckSourceForNextNewBelievers = 1;
        this.suppressDeckSourceExpiryTsBeliever = expiresAt;
      } else if (kind === "action") {
        this.suppressDeckSourceForNextNewActionCards = 1;
        this.suppressDeckSourceExpiryTsAction = expiresAt;
      }
    },

    consumeRedistributeDeckSourceSuppression: function (cardKind) {
      const kind = String(cardKind || "");
      const now = Date.now();
      if (kind === "believer") {
        const notExpired =
          parseInt(this.suppressDeckSourceExpiryTsBeliever || 0, 10) > now;
        const active =
          parseInt(this.suppressDeckSourceForNextNewBelievers || 0, 10) === 1 &&
          notExpired;
        this.suppressDeckSourceForNextNewBelievers = 0;
        this.suppressDeckSourceExpiryTsBeliever = 0;
        return active;
      }
      if (kind === "action") {
        const notExpired =
          parseInt(this.suppressDeckSourceExpiryTsAction || 0, 10) > now;
        const active =
          parseInt(this.suppressDeckSourceForNextNewActionCards || 0, 10) ===
            1 && notExpired;
        this.suppressDeckSourceForNextNewActionCards = 0;
        this.suppressDeckSourceExpiryTsAction = 0;
        return active;
      }
      return false;
    },

    getRedistributeFxPendingDelayMs: function (cardKind) {
      const kind = String(cardKind || "");
      const pendingUntil =
        kind === "believer"
          ? this.everyoneEqualFxPendingUntil
          : this.chaosComingFxPendingUntil;
      const remaining = parseInt(pendingUntil || 0, 10) - Date.now();
      return Math.max(0, parseInt(remaining || 0, 10));
    },

    applySyncedBelieverHandNow: function (cards, options) {
      const opts = options || {};
      const fromRedistribute = !!opts.fromRedistribute;
      const pulseAfter = !!opts.pulseAfter;
      this.suppressDeckSourceForNextNewBelievers = 0;
      this.suppressDeckSourceExpiryTsBeliever = 0;
      if (fromRedistribute) {
        this.cleanupLingeringCardFlightTemps("believer");
      }
      this.replaceCurrentBelieverHand(cards || []);
      this.setCurrentHandConcealedForRedistribute("believer", false);
      if (fromRedistribute && pulseAfter) {
        this.pulseCurrentBelieverHandAfterRedistribute();
      }
    },

    applySyncedActionHandNow: function (cards, options) {
      const opts = options || {};
      const fromRedistribute = !!opts.fromRedistribute;
      const pulseAfter = !!opts.pulseAfter;
      this.suppressDeckSourceForNextNewActionCards = 0;
      this.suppressDeckSourceExpiryTsAction = 0;
      if (fromRedistribute) {
        this.cleanupLingeringCardFlightTemps("action");
      }
      this.replaceCurrentActionHand(cards || []);
      this.setCurrentHandConcealedForRedistribute("action", false);
      if (fromRedistribute && pulseAfter) {
        this.pulseCurrentActionHandAfterRedistribute();
      }
    },

    schedulePendingRedistributeHandSync: function (cardKind) {
      const kind = String(cardKind || "");
      const isBeliever = kind === "believer";
      const timeoutKey = isBeliever
        ? "pendingBelieverHandSyncTimeout"
        : "pendingActionHandSyncTimeout";
      const cardsKey = isBeliever
        ? "pendingBelieverHandSyncCards"
        : "pendingActionHandSyncCards";

      if (this[timeoutKey]) {
        clearTimeout(this[timeoutKey]);
        this[timeoutKey] = null;
      }

      const waitMs = this.getRedistributeFxPendingDelayMs(kind) + 90;
      const flush = function () {
        this[timeoutKey] = null;
        const queuedCards = this[cardsKey] || [];
        this[cardsKey] = null;
        if (isBeliever) {
          this.applySyncedBelieverHandNow(queuedCards, {
            fromRedistribute: true,
            pulseAfter: true,
          });
        } else {
          this.applySyncedActionHandNow(queuedCards, {
            fromRedistribute: true,
            pulseAfter: true,
          });
        }
      }.bind(this);

      if (waitMs <= 0) {
        flush();
        return;
      }
      this[timeoutKey] = setTimeout(flush, waitMs);
    },

    syncCurrentPlayerHandCounters: function () {
      const pid = String(this.player_id);
      const actionCount = this.getStockDomCount("myactioncards");
      const believerCount = this.getStockDomCount("mybelievercards");

      const tableAction = dojo.byId("table_action_count_" + pid);
      if (tableAction) {
        tableAction.innerHTML = String(actionCount);
      }
      const tableBeliever = dojo.byId("table_believer_count_" + pid);
      if (tableBeliever) {
        tableBeliever.innerHTML = String(believerCount);
      }
    },

    escapeHtml: function (value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    getPlayerPanelColor: function (playerId) {
      const pid = String(playerId || "");
      const player =
        (this.gamedatas &&
          this.gamedatas.players &&
          this.gamedatas.players[pid]) ||
        null;
      let raw = (player && (player.player_color || player.color)) || "";
      raw = String(raw || "").trim();
      if (!raw) return null;
      if (raw[0] !== "#") raw = "#" + raw;
      return raw;
    },

    getColoredPlayerNameHtml: function (playerId, playerName) {
      const color = this.getPlayerPanelColor(playerId);
      return (
        '<span style="' +
        (color ? "color:" + color + ";" : "") +
        '">' +
        this.escapeHtml(playerName || _("Player")) +
        "</span>"
      );
    },

    getColoredSectNameHtml: function (playerId, sectId, className) {
      const pid = parseInt(playerId || 0, 10);
      const sid = parseInt(sectId || -1, 10);
      const color =
        sid >= 0
          ? this.getSectLeaderColorBySect(sid, pid)
          : this.getPlayerPanelColor(playerId);
      const cls = className ? " " + String(className) : "";
      return (
        '<span class="sect_name_text' +
        cls +
        '" style="' +
        (color ? "color:" + color + ";" : "") +
        '">' +
        this.escapeHtml(this.getSectLabel(sectId)) +
        "</span>"
      );
    },

    getSectLeaderIdBySect: function (sectId) {
      const sid = parseInt(sectId || -1, 10);
      if (sid < 0) return 0;
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const ids = Object.keys(players);
      for (let i = 0; i < ids.length; i++) {
        const pid = ids[i];
        const p = players[pid] || {};
        if (parseInt(p.player_sect || -1, 10) !== sid) continue;
        if (parseInt(p.player_role || -1, 10) === 0) {
          return parseInt(pid, 10) || 0;
        }
      }
      return 0;
    },

    getSectLeaderColorBySect: function (sectId, fallbackPlayerId) {
      const sid = parseInt(sectId || -1, 10);
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const fallbackId = parseInt(fallbackPlayerId || 0, 10);
      if (sid < 0) return this.getPlayerPanelColor(fallbackId);

      const explicitLeaderId = this.getSectLeaderIdBySect(sid);
      if (explicitLeaderId > 0) {
        const c = this.getPlayerPanelColor(explicitLeaderId);
        if (c) return c;
      }

      const fallbackPlayer = players[String(fallbackId)] || null;
      const fallbackLeaderId = parseInt(
        (fallbackPlayer && fallbackPlayer.player_leader_id) || 0,
        10
      );
      if (fallbackLeaderId > 0) {
        const leader = players[String(fallbackLeaderId)] || null;
        if (
          leader &&
          parseInt(leader.player_sect || -1, 10) === sid &&
          parseInt(leader.player_role || -1, 10) !== 2
        ) {
          const c = this.getPlayerPanelColor(fallbackLeaderId);
          if (c) return c;
        }
      }

      const leaderRefCount = {};
      Object.keys(players).forEach(function (pid) {
        const p = players[pid] || {};
        if (parseInt(p.player_sect || -1, 10) !== sid) return;
        if (parseInt(p.player_role || 2, 10) === 2) return;
        const lid = parseInt(p.player_leader_id || 0, 10);
        if (lid > 0) {
          leaderRefCount[String(lid)] = (leaderRefCount[String(lid)] || 0) + 1;
        }
      });
      let inferredLeaderId = 0;
      let inferredLeaderCount = -1;
      Object.keys(leaderRefCount).forEach(function (lidText) {
        const cnt = parseInt(leaderRefCount[lidText] || 0, 10);
        if (cnt > inferredLeaderCount) {
          inferredLeaderCount = cnt;
          inferredLeaderId = parseInt(lidText || 0, 10);
        }
      });
      if (inferredLeaderId > 0) {
        const c = this.getPlayerPanelColor(inferredLeaderId);
        if (c) return c;
      }

      if (
        fallbackPlayer &&
        parseInt(fallbackPlayer.player_sect || -1, 10) === sid
      ) {
        const c = this.getPlayerPanelColor(fallbackId);
        if (c) return c;
      }

      const sectMemberId = Object.keys(players).find(function (pid) {
        const p = players[pid] || {};
        return (
          parseInt(p.player_sect || -1, 10) === sid &&
          parseInt(p.player_role || 2, 10) !== 2
        );
      });
      if (sectMemberId) {
        return this.getPlayerPanelColor(parseInt(sectMemberId, 10));
      }

      return this.getPlayerPanelColor(fallbackId);
    },

    getSectColorForPlayer: function (playerId) {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const player = players[String(playerId)] || null;
      if (!player) return this.getPlayerPanelColor(playerId);
      const sectId = parseInt(player.player_sect || -1, 10);
      return this.getSectLeaderColorBySect(sectId, parseInt(playerId || 0, 10));
    },

    getCombatOwnerLabelHtml: function (playerId, playerName, options) {
      const opts = options || {};
      const includeSect =
        typeof opts.includeSect === "undefined" ? true : !!opts.includeSect;
      const player =
        this.gamedatas && this.gamedatas.players
          ? this.gamedatas.players[String(playerId)] || null
          : null;
      const sectLabel = this.getSectLabel(player ? player.player_sect : -1);
      const safeName = playerName || (player ? player.name : _("Player"));
      const sectClass =
        "combat-owner-sect" + (opts.sectClass ? " " + opts.sectClass : "");
      const playerClass =
        "combat-owner-player" +
        (opts.playerClass ? " " + opts.playerClass : "");
      const sectColor = this.getSectColorForPlayer(playerId);
      return (
        (includeSect
          ? '<div class="' +
            sectClass +
            '" style="' +
            (sectColor ? "color:" + sectColor + ";" : "") +
            '">' +
            this.escapeHtml(sectLabel) +
            "</div>"
          : "") +
        '<div class="' +
        playerClass +
        '">' +
        this.getColoredPlayerNameHtml(playerId, safeName) +
        "</div>"
      );
    },

    getCombatResultHoldMs: function () {
      const v = parseInt(this.combatResultHoldMs || 0, 10);
      return v > 0 ? v : 2600;
    },

    getUnifiedCardFlyMs: function () {
      const v = parseInt(this.unifiedCardFlyMs || 0, 10);
      return v > 0 ? v : 520;
    },

    getUnifiedCardFlightStaggerMs: function () {
      const v = parseInt(this.unifiedCardFlightStaggerMs || 0, 10);
      return v > 0 ? v : 90;
    },

    getUnifiedRevealFlipMs: function () {
      const v = parseInt(this.unifiedRevealFlipMs || 0, 10);
      return v > 0 ? v : 500;
    },

    getUnifiedRevealHoldMs: function () {
      const v = parseInt(this.unifiedRevealHoldMs || 0, 10);
      return v > 0 ? v : 1000;
    },

    getCombatRevealLingerMs: function () {
      const v = parseInt(this.combatRevealLingerMs || 0, 10);
      return v > 0 ? v : 0;
    },

    getUnifiedRedistributeShuffleHoldMs: function () {
      const v = parseInt(this.unifiedRedistributeShuffleHoldMs || 0, 10);
      return v > 0 ? v : Math.max(700, this.getUnifiedCardFlyMs() + 240);
    },

    getUnifiedShufflePulseMs: function () {
      const v = parseInt(this.unifiedShufflePulseMs || 0, 10);
      return v > 0 ? v : Math.max(900, this.getUnifiedCardFlyMs() + 680);
    },

    getUnifiedQuickClearDelayMs: function () {
      return (
        this.getUnifiedCardFlyMs() + this.getUnifiedCardFlightStaggerMs() * 2
      );
    },

    getUnifiedBannerClearDelayMs: function () {
      return (
        this.getUnifiedCardFlyMs() * 2 +
        this.getUnifiedCardFlightStaggerMs() * 2
      );
    },

    getUnifiedPostDrawDiscardDelayMs: function (drawAnimMs, drawCount) {
      const drawMs = Math.max(0, parseInt(drawAnimMs || 0, 10) || 0);
      const n = Math.max(0, parseInt(drawCount || 0, 10) || 0);
      const centerHoldMs = 1600;
      const bufferMs =
        this.getUnifiedCardFlyMs() +
        this.getUnifiedCardFlightStaggerMs() * 3 +
        (n > 1 ? this.getUnifiedCardFlightStaggerMs() : 0);
      return Math.max(
        this.getUnifiedCardFlyMs() * 2 + centerHoldMs,
        drawMs + bufferMs + centerHoldMs
      );
    },

    getUnifiedPostFlowDiscardDelayMs: function (flowMs) {
      const ms = Math.max(0, parseInt(flowMs || 0, 10) || 0);
      const centerHoldMs = 1600;
      return Math.max(
        this.getUnifiedCardFlyMs() +
          this.getUnifiedCardFlightStaggerMs() * 2 +
          centerHoldMs,
        ms + this.getUnifiedCardFlightStaggerMs() * 3 + centerHoldMs
      );
    },

    getUnifiedRedistributePendingMs: function (fxMs) {
      const base = Math.max(0, parseInt(fxMs || 0, 10) || 0);
      return Math.max(
        this.getUnifiedCardFlyMs() * 2,
        base + this.getUnifiedCardFlightStaggerMs() * 3
      );
    },

    getCombatResultCleanupDelayMs: function () {
      const hold = this.getCombatResultHoldMs();
      const buffer = parseInt(this.combatResultCleanupBufferMs || 0, 10);
      return hold + (buffer > 0 ? buffer : 1600);
    },

    setCombatRevealGate: function (durationMs) {
      const ms = Math.max(0, parseInt(durationMs || 0, 10) || 0);
      if (!ms) return;
      const until = Date.now() + ms;
      this.combatRevealGateUntil = Math.max(
        parseInt(this.combatRevealGateUntil || 0, 10) || 0,
        until
      );
    },

    getCombatRevealGateDelayMs: function () {
      const until = parseInt(this.combatRevealGateUntil || 0, 10) || 0;
      if (!(until > 0)) return 0;
      return Math.max(0, until - Date.now());
    },

    runAfterCombatRevealGate: function (callback, minDelayMs) {
      const cb = typeof callback === "function" ? callback : null;
      if (!cb) return;
      const gateDelayMs =
        typeof this.getCombatRevealGateDelayMs === "function"
          ? Math.max(0, parseInt(this.getCombatRevealGateDelayMs() || 0, 10))
          : 0;
      const requestedDelayMs = Math.max(0, parseInt(minDelayMs || 0, 10) || 0);
      const waitMs = Math.max(gateDelayMs, requestedDelayMs);
      if (waitMs > 0) {
        setTimeout(
          function () {
            cb.call(this);
          }.bind(this),
          waitMs
        );
        return;
      }
      cb.call(this);
    },

    clearCombatResultStateClass: function (node) {
      if (!node) return;
      dojo.removeClass(node, "is-winner");
      dojo.removeClass(node, "is-loser");
      dojo.removeClass(node, "is-draw");
    },

    applyCombatResultStateClass: function (node, resultType) {
      if (!node) return;
      this.clearCombatResultStateClass(node);
      if (resultType === "winner") dojo.addClass(node, "is-winner");
      else if (resultType === "loser") dojo.addClass(node, "is-loser");
      else if (resultType === "draw") dojo.addClass(node, "is-draw");
    },

    getHeadToHeadResultVisual: function (resultType, duelMode) {
      const result = String(resultType || "draw");
      const mode = String(duelMode || "war");
      if (result === "attacker") {
        return {
          attackerLabel: _("win"),
          defenderLabel: _("lose"),
          attackerState: "winner",
          defenderState: "loser",
        };
      }
      if (result === "defender") {
        return {
          attackerLabel: _("lose"),
          defenderLabel: _("win"),
          attackerState: "loser",
          defenderState: "winner",
        };
      }
      return {
        attackerLabel: _("draw"),
        defenderLabel: _("draw"),
        // War draw => both die (gray). Debate draw => both return to hand.
        attackerState: mode === "debate" ? "draw" : "loser",
        defenderState: mode === "debate" ? "draw" : "loser",
      };
    },

    buildFaithWarBannerTitle: function (
      leftName,
      leftPlayerId,
      rightName,
      rightPlayerId,
      prefixText
    ) {
      const leftColor = this.getSectColorForPlayer(leftPlayerId);
      const rightColor = this.getSectColorForPlayer(rightPlayerId);
      const leftHtml =
        '<span style="' +
        (leftColor ? "color:" + leftColor + ";" : "") +
        '">' +
        this.escapeHtml(leftName) +
        "</span>";
      const rightHtml =
        '<span style="' +
        (rightColor ? "color:" + rightColor + ";" : "") +
        '">' +
        this.escapeHtml(rightName) +
        "</span>";
      const prefix = prefixText
        ? this.escapeHtml(String(prefixText)) + " "
        : "";
      return (
        '<div class="faith-war-banner">' +
        prefix +
        leftHtml +
        " vs " +
        rightHtml +
        "</div>"
      );
    },

    getCombatBannerSectLabelByPlayer: function (playerId, fallbackText) {
      const pid = parseInt(playerId || 0, 10);
      if (pid > 0) {
        const sectId = this.getPlayerSectId(pid);
        if (sectId >= 0) {
          return this.getSectLabel(sectId);
        }
      }
      return String(fallbackText || _("another Sect"));
    },

    getPublicActionCountForPlayer: function (playerId) {
      const pid = String(playerId);
      const node = dojo.byId("table_action_count_" + pid);
      if (node) {
        const v = parseInt(
          (node.textContent || node.innerText || "0").trim(),
          10
        );
        if (!isNaN(v)) return v;
      }
      const player =
        (this.gamedatas &&
          this.gamedatas.players &&
          this.gamedatas.players[pid]) ||
        null;
      const fallback = player ? parseInt(player.action_count || 0, 10) : 0;
      return isNaN(fallback) ? 0 : fallback;
    },

    getPublicBelieverCountForPlayer: function (playerId) {
      const pid = String(playerId);
      const node = dojo.byId("table_believer_count_" + pid);
      if (node) {
        const v = parseInt(
          (node.textContent || node.innerText || "0").trim(),
          10
        );
        if (!isNaN(v)) return Math.max(0, v);
      }
      const player =
        (this.gamedatas &&
          this.gamedatas.players &&
          this.gamedatas.players[pid]) ||
        null;
      const fallback = player ? parseInt(player.believer_count || 0, 10) : 0;
      return isNaN(fallback) ? 0 : Math.max(0, fallback);
    },

    getSectBelieverCountFromPublicCounters: function (sectId) {
      const sid = parseInt(sectId || -1, 10);
      if (sid < 0) return 0;
      let total = 0;
      Object.keys(this.gamedatas.players || {}).forEach(
        function (pid) {
          const p = this.gamedatas.players[pid] || {};
          if (parseInt(p.player_role || 0, 10) === 2) return;
          if (parseInt(p.player_sect || -1, 10) !== sid) return;
          total += this.getPublicBelieverCountForPlayer(pid);
        }.bind(this)
      );
      return total;
    },

    canSelectKowtowTargetPlayer: function (targetPlayerId) {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const me = players[String(this.player_id)] || {};
      const target = players[String(targetPlayerId)] || {};
      const attackerSect = parseInt(me.player_sect || -1, 10);
      const targetSect = parseInt(target.player_sect || -1, 10);
      if (attackerSect < 0 || targetSect < 0 || attackerSect === targetSect) {
        return false;
      }
      const attackerBelievers =
        this.getSectBelieverCountFromPublicCounters(attackerSect);
      const targetBelievers =
        this.getSectBelieverCountFromPublicCounters(targetSect);
      return targetBelievers <= Math.floor(attackerBelievers / 2);
    },

    getPlayerSectId: function (playerId) {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const row = players[String(playerId || "")] || null;
      const sectId = row ? parseInt(row.player_sect || -1, 10) : -1;
      return isNaN(sectId) ? -1 : sectId;
    },

    getPlayerRoleId: function (playerId) {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const row = players[String(playerId || "")] || null;
      const roleId = row ? parseInt(row.player_role || 0, 10) : 0;
      return isNaN(roleId) ? 0 : roleId;
    },

    cardRequiresAnotherSectTarget: function (cardKey) {
      return (
        ["witch_hunt", "spread_rumors", "faith_debate", "faith_war"].indexOf(
          String(cardKey || "")
        ) !== -1
      );
    },

    cardRequiresOwnSectTarget: function (cardKey) {
      return String(cardKey || "") === "breaking_faith";
    },

    canSelectBreakingFaithTargetPlayer: function (targetPlayerId) {
      const myId = parseInt(this.player_id || 0, 10);
      const targetId = parseInt(targetPlayerId || 0, 10);
      if (!(myId > 0) || !(targetId > 0) || myId === targetId) return false;
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const myRow = players[String(myId)] || {};
      const targetRow = players[String(targetId)] || {};
      const mySect = this.getPlayerSectId(myId);
      const targetSect = this.getPlayerSectId(targetId);
      if (mySect < 0 || targetSect < 0 || mySect !== targetSect) return false;

      const myRole = this.getPlayerRoleId(myId);
      const targetRole = this.getPlayerRoleId(targetId);
      if (myRole === 1) {
        const sectLeaderId = parseInt(this.getSectLeaderIdBySect(mySect) || 0, 10);
        const linkedLeaderId = parseInt((myRow && myRow.player_leader_id) || 0, 10);
        // Keep follower targeting strict to leader, but be resilient to
        // transient identity desync (e.g. skip-turn notifications racing).
        if (sectLeaderId > 0) {
          return targetId === sectLeaderId;
        }
        if (linkedLeaderId > 0) {
          return targetId === linkedLeaderId;
        }
        return targetRole === 0;
      }
      if (myRole === 0) {
        return targetRole === 1;
      }
      // Fallback: if role data is temporarily stale, do not hard-block UI.
      // Backend still enforces full Breaking Faith legality.
      const targetIsWanderer = parseInt((targetRow && targetRow.player_role) || 0, 10) === 2;
      return !targetIsWanderer;
    },

    canSelectTargetPlayerForCard: function (cardKey, targetPlayerId) {
      const key = String(cardKey || "");
      if (!key || key === "kowtow_to_me") return true;
      if (key === "breaking_faith") {
        return this.canSelectBreakingFaithTargetPlayer(targetPlayerId);
      }
      const mySect = this.getPlayerSectId(this.player_id);
      const targetSect = this.getPlayerSectId(targetPlayerId);
      if (mySect < 0 || targetSect < 0) return false;
      if (this.cardRequiresAnotherSectTarget(key)) {
        if (mySect === targetSect) {
          const meRole = this.getPlayerRoleId(this.player_id);
          const targetRole = this.getPlayerRoleId(targetPlayerId);
          // In one sect there should be only one leader. If both appear as leaders
          // with same-sect data, trust backend validation instead of blocking click.
          if (meRole === 0 && targetRole === 0) {
            return true;
          }
        }
        return mySect !== targetSect;
      }
      if (this.cardRequiresOwnSectTarget(key)) return mySect === targetSect;
      return true;
    },

    hasSelectableTargetPlayerForCard: function (cardKey) {
      const key = String(cardKey || "");
      if (!key) return false;
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const attackKind = this.getAttackKindForActionCard(key);
      const meId = String(this.player_id || "");
      const playerIds = Object.keys(players);
      for (let i = 0; i < playerIds.length; i++) {
        const playerId = String(playerIds[i]);
        if (playerId === meId) continue;
        const player = players[playerId] || {};
        if (parseInt(player.player_role || 0, 10) === 2) continue;
        if (key === "secret_alliance") {
          if (this.getPublicActionCountForPlayer(playerId) <= 0) continue;
        }
        if (key === "spread_rumors") {
          const targetSectId = this.getPlayerSectId(playerId);
          if (this.getSectBelieverCountFromPublicCounters(targetSectId) <= 0) {
            continue;
          }
        }
        if (key === "faith_war" || key === "faith_debate") {
          const targetSectId = this.getPlayerSectId(playerId);
          if (this.getSectBelieverCountFromPublicCounters(targetSectId) <= 0) {
            continue;
          }
        }
        if (
          key === "kowtow_to_me" &&
          !this.canSelectKowtowTargetPlayer(playerId)
        ) {
          continue;
        }
        if (!this.canSelectTargetPlayerForCard(key, playerId)) continue;
        if (attackKind && this.isPlayerProtectedBySkill(playerId, attackKind)) {
          continue;
        }
        return true;
      }
      return false;
    },

    setTopInstruction: function (text) {
      // Do NOT call updatePageTitle here: it can recursively trigger action
      // button refresh in some multi-active states (Faith War assignment).
      const safeText = String(text || "");
      const titleNode =
        dojo.byId("pagemaintitletext") ||
        dojo.byId("gameaction_status") ||
        dojo.byId("gameaction_status_wrap");
      if (titleNode) {
        titleNode.textContent = safeText;
      }
    },

    extractAjaxErrorText: function (error) {
      if (!error) return "";
      const parts = [];
      const push = function (v) {
        const s = String(v || "").trim();
        if (s && parts.indexOf(s) === -1) {
          parts.push(s);
        }
      };
      try {
        push(error.message);
        push(error.error);
        push(error.reason);
        if (error.responseJSON) {
          push(error.responseJSON.error);
          push(error.responseJSON.message);
          push(error.responseJSON.reason);
        }
        push(error.responseText);
        if (!parts.length) {
          push(JSON.stringify(error));
        }
      } catch (e) {}
      return parts.join(" | ");
    },

    isHandMismatchAjaxErrorText: function (rawText) {
      const text = String(rawText || "").toLowerCase();
      if (!text) return false;
      return (
        text.indexOf("do not have this card in hand") >= 0 ||
        text.indexOf("don't have this card in hand") >= 0 ||
        text.indexOf("not have this card in hand") >= 0 ||
        text.indexOf("this card in hand") >= 0
      );
    },

    scheduleAutoHardResync: function () {
      if (this.pendingHardResyncTimeout) return;
      const now = Date.now();
      if (now - (parseInt(this.lastAutoResyncAt || 0, 10) || 0) < 4000) return;
      this.lastAutoResyncAt = now;
      this.showMessage(
        _("Connection desync detected. Auto-resyncing game state..."),
        "info"
      );
      this.pendingHardResyncTimeout = setTimeout(
        function () {
          this.pendingHardResyncTimeout = null;
          try {
            window.location.reload();
          } catch (e) {}
        }.bind(this),
        650
      );
    },

    tryRecoverFromPlayActionHandMismatch: function (actionName, payload, error) {
      if (String(actionName || "") !== "playActionCard") return false;
      const errorText = this.extractAjaxErrorText(error);
      if (!this.isHandMismatchAjaxErrorText(errorText)) return false;

      const attemptedId = parseInt((payload && payload.id) || 0, 10) || 0;
      if (attemptedId > 0) {
        this.consumeHiddenPendingActionCard(attemptedId);
        this.setDivineInspireSourceLocked(attemptedId, false);
        this.removeLocalActionCardFromHand(attemptedId);
      }
      if (
        this.pendingAction &&
        this.pendingAction.tempArenaId &&
        dojo.byId(this.pendingAction.tempArenaId)
      ) {
        dojo.destroy(this.pendingAction.tempArenaId);
      }
      this.pendingAction = null;
      this.pendingFaithWarUseZombie = false;
      this.clearTargetSelection();
      this.playerActionCards.unselectAll();
      this.playerBelieverCards.unselectAll();
      this.scheduleAutoHardResync();
      return true;
    },

    removeLocalActionCardFromHand: function (cardId) {
      if (!this.playerActionCards || !cardId) return;
      try {
        this.playerActionCards.removeFromStockById(cardId);
      } catch (e) {
        // Keep flow resilient if stock item was already removed by notif.
      }
      delete this.actionCardTypeById[String(cardId)];
      this.syncCurrentPlayerHandCounters();
    },

    extractActionCardIdFromStockItemId: function (rawId, rootId) {
      const idText = String(rawId || "").trim();
      if (!idText) return 0;
      const resolvedRootId = String(rootId || "myactioncards");
      const escapedRoot = resolvedRootId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let m = idText.match(new RegExp("^" + escapedRoot + "_item_(\\d+)$"));
      if (!m) {
        m = idText.match(/(?:^|_)item_(\d+)$/);
      }
      if (!m) return 0;
      const n = parseInt(m[1] || 0, 10);
      return n > 0 ? n : 0;
    },

    extractActionCardIdCandidatesFromStockNode: function (node, rootId) {
      if (!node) return [];
      const resolvedRootId = rootId || "myactioncards";
      const ids = [];
      const pushId = function (v) {
        const n = parseInt(v || 0, 10);
        if (n > 0 && ids.indexOf(n) === -1) {
          ids.push(n);
        }
      };

      // Preferred source: explicit DB id attributes.
      pushId(node.getAttribute("data-card-id"));
      pushId(node.getAttribute("data-item-id"));

      // BGA stock can put selection class on wrapper nodes while data-card-id
      // is attached to an inner node. Check one inner node when needed.
      if (ids.length === 0) {
        const innerNode = dojo.query("[data-card-id], [data-item-id]", node)[0];
        if (innerNode) {
          pushId(innerNode.getAttribute("data-card-id"));
          pushId(innerNode.getAttribute("data-item-id"));
        }
      }

      // Strict fallback: parse stock item id shape (e.g. myactioncards_item_123).
      if (ids.length === 0) {
        pushId(
          this.extractActionCardIdFromStockItemId(node.id, resolvedRootId)
        );
      }
      if (ids.length === 0 && node.parentNode) {
        pushId(
          this.extractActionCardIdFromStockItemId(
            node.parentNode.id,
            resolvedRootId
          )
        );
      }

      return ids;
    },

    getSingleSelectedActionCardIdFromHand: function (rootId) {
      const resolvedRootId = rootId || "myactioncards";
      const items =
        this.playerActionCards && this.playerActionCards.getSelectedItems
          ? this.playerActionCards.getSelectedItems() || []
          : [];

      if (items.length === 1) {
        // Resolve by matching currently selected stock DOM node identity first.
        const resolvedByNode = this.resolveSelectedActionCardIdFromStockItem(
          items[0],
          resolvedRootId
        );
        if (
          resolvedByNode > 0 &&
          this.getActionStockItemNodeByCardId(resolvedByNode, resolvedRootId)
        ) {
          return resolvedByNode;
        }
      }

      // Fallback: derive candidates from selected items + selected DOM nodes,
      // then require exactly one valid in-hand card id.
      const selectedIds = this.getSelectedActionCardIdsInHand(
        items,
        resolvedRootId
      );
      if (selectedIds.length === 1) {
        return parseInt(selectedIds[0], 10) || 0;
      }
      if (selectedIds.length > 1) {
        return 0;
      }

      const root = dojo.byId(resolvedRootId);
      if (!root) return 0;
      const selectedNodes = dojo.query(
        ".stockitem.stockitem_selected, .stockitem.selected, .stockitem_selected, .selected",
        root
      );
      if (!selectedNodes || selectedNodes.length !== 1) return 0;
      const selectedNode = selectedNodes[0];

      const nodeCandidates = this.extractActionCardIdCandidatesFromStockNode(
        selectedNode,
        resolvedRootId
      );
      for (let i = 0; i < nodeCandidates.length; i++) {
        const cid = parseInt(nodeCandidates[i] || 0, 10);
        if (cid <= 0) continue;
        if (
          this.actionCardTypeById[String(cid)] &&
          this.getActionStockItemNodeByCardId(cid, resolvedRootId)
        ) {
          return cid;
        }
      }

      // Last-resort strict fallback from selected item id format.
      if (items.length === 1 && items[0]) {
        const fallbackId = this.extractActionCardIdFromStockItemId(
          items[0].id,
          resolvedRootId
        );
        if (
          fallbackId > 0 &&
          this.actionCardTypeById[String(fallbackId)] &&
          this.getActionStockItemNodeByCardId(fallbackId, resolvedRootId)
        ) {
          return fallbackId;
        }
      }

      return 0;
    },

    getActionStockItemNodeByCardId: function (cardId, rootId) {
      const targetId = parseInt(cardId || 0, 10);
      if (!targetId) return null;
      const resolvedRootId = rootId || "myactioncards";
      const root = dojo.byId(resolvedRootId);
      if (!root) return null;

      const direct = dojo.byId(resolvedRootId + "_item_" + targetId);
      if (direct) return direct;

      const nodes = dojo.query(
        ".stockitem, [data-card-id], [data-item-id]",
        root
      );
      for (let i = 0; i < nodes.length; i++) {
        const nodeIds = this.extractActionCardIdCandidatesFromStockNode(
          nodes[i],
          resolvedRootId
        );
        if (nodeIds.indexOf(targetId) !== -1) {
          return nodes[i];
        }
      }
      return null;
    },

    isActionCardSoftDisabledById: function (cardId, rootId) {
      const resolvedRootId = rootId || "myactioncards";
      const node = this.getActionStockItemNodeByCardId(cardId, resolvedRootId);
      if (!node) return false;
      if (dojo.hasClass(node, "action-card-soft-disabled")) return true;
      const root = dojo.byId(resolvedRootId);
      let cur = node.parentNode || null;
      while (cur && cur !== root) {
        if (dojo.hasClass(cur, "action-card-soft-disabled")) return true;
        cur = cur.parentNode || null;
      }
      const nested = dojo.query(".action-card-soft-disabled", node);
      return !!(nested && nested.length > 0);
    },

    isNodeInsideSoftDisabledActionCard: function (node, rootId) {
      const resolvedRootId = rootId || "myactioncards";
      const root = dojo.byId(resolvedRootId);
      let cur = node || null;
      while (cur) {
        if (dojo.hasClass(cur, "action-card-soft-disabled")) return true;
        if (cur === root) break;
        cur = cur.parentNode || null;
      }
      return false;
    },

    setupDisabledActionCardClickGuard: function () {
      const root = dojo.byId("myactioncards");
      if (!root || this.disabledActionCardClickGuardBound) return;
      this.disabledActionCardClickGuardBound = true;
      const guard = function (evt) {
        const e = evt || window.event;
        const target = (e && (e.target || e.srcElement)) || null;
        if (!this.isNodeInsideSoftDisabledActionCard(target, "myactioncards")) {
          return;
        }
        if (this.playerActionCards) {
          this.playerActionCards.unselectAll();
        }
        dojo.stopEvent(e);
      }.bind(this);
      dojo.connect(root, "onmousedown", this, guard);
      dojo.connect(root, "onclick", this, guard);
      dojo.connect(root, "ontouchstart", this, guard);
    },

    setDivineInspireSourceLocked: function (cardId, locked) {
      const node = this.getActionStockItemNodeByCardId(cardId);
      if (!node) return;
      if (locked) {
        dojo.addClass(node, "divine-inspire-source-locked");
      } else {
        dojo.removeClass(node, "divine-inspire-source-locked");
      }
    },

    hidePendingActionCardFromHand: function (cardId, cardKey) {
      if (!this.playerActionCards || !cardId) return;
      if (
        this.hiddenPendingActionCard &&
        String(this.hiddenPendingActionCard.cardId) === String(cardId)
      ) {
        return;
      }
      if (this.hiddenPendingActionCard) {
        this.restoreHiddenPendingActionCard();
      }
      const resolvedKey =
        cardKey || this.actionCardTypeById[String(cardId)] || "unknown";
      if (!resolvedKey || resolvedKey === "unknown") return;

      try {
        this.playerActionCards.removeFromStockById(cardId);
      } catch (e) {
        return;
      }
      delete this.actionCardTypeById[String(cardId)];
      this.hiddenPendingActionCard = {
        cardId: cardId,
        cardKey: resolvedKey,
      };
      this.syncCurrentPlayerHandCounters();
    },

    restoreHiddenPendingActionCard: function (cardId) {
      if (!this.hiddenPendingActionCard) return;
      if (
        typeof cardId !== "undefined" &&
        cardId !== null &&
        String(this.hiddenPendingActionCard.cardId) !== String(cardId)
      ) {
        return;
      }
      const hidden = this.hiddenPendingActionCard;
      this.hiddenPendingActionCard = null;
      if (this.getActionStockItemNodeByCardId(hidden.cardId)) {
        return;
      }
      if (this.playerActionCards && this.playerActionCards.addToStockWithId) {
        this.playerActionCards.addToStockWithId(
          this.getActionCardSpriteIndex(hidden.cardKey),
          hidden.cardId
        );
        this.actionCardTypeById[String(hidden.cardId)] = hidden.cardKey;
        this.syncCurrentPlayerHandCounters();
      }
      this.setDivineInspireSourceLocked(hidden.cardId, false);
    },

    consumeHiddenPendingActionCard: function (cardId) {
      if (!this.hiddenPendingActionCard) return;
      if (
        typeof cardId !== "undefined" &&
        cardId !== null &&
        String(this.hiddenPendingActionCard.cardId) !== String(cardId)
      ) {
        return;
      }
      this.hiddenPendingActionCard = null;
    },

    setupCurrentPlayerHandCountSync: function () {
      const bindObserver = function (containerId) {
        const node = dojo.byId(containerId);
        if (!node || typeof MutationObserver === "undefined") return;
        const observer = new MutationObserver(
          function () {
            this.syncCurrentPlayerHandCounters();
            this.refreshHandCardReadinessVisuals();
          }.bind(this)
        );
        observer.observe(node, { childList: true, subtree: true });
        this.localHandCountObservers.push(observer);
      }.bind(this);

      bindObserver("myactioncards");
      bindObserver("mybelievercards");
      this.syncCurrentPlayerHandCounters();
      this.refreshHandCardReadinessVisuals();
    },

    getCardUniqueId: function (type, type_arg) {
      // Use type (the string key) to ensure cards don't stack incorrectly!
      return type;
    },

    // Helper to map Action Card Key Name to Sprite Index
    getActionCardSpriteIndex: function (key) {
      const mapping = {
        witch_hunt: 1,
        faith_war: 2,
        martyrdom: 3,
        spread_rumors: 4,
        faith_debate: 5,
        conspiracy: 6,
        great_mercy: 7,
        firm_faith: 8,
        breaking_faith: 9,
        kowtow_to_me: 10,
        info_spy: 11,
        secret_alliance: 12,
        its_a_miracle: 13,
        have_a_charity: 14,
        divine_inspire: 15, // Note: the system uses divine_inspire
      };
      return mapping[key] || 0; // Default to back
    },

    // Reverse mapping to get string name from sprite index
    getActionCardKeyName: function (sprite_idx) {
      const mapping = {
        1: "witch_hunt",
        2: "faith_war",
        3: "martyrdom",
        4: "spread_rumors",
        5: "faith_debate",
        6: "conspiracy",
        7: "great_mercy",
        8: "firm_faith",
        9: "breaking_faith",
        10: "kowtow_to_me",
        11: "info_spy",
        12: "secret_alliance",
        13: "its_a_miracle",
        14: "have_a_charity",
        15: "divine_inspire",
      };
      return mapping[sprite_idx] || "unknown";
    },

    getTargetPromptText: function (cardKey, cardName) {
      if (cardKey === "secret_alliance" || cardKey === "info_spy") {
        return dojo.string.substitute(
          _("Choose a target player for ${card_name}, or cancel."),
          { card_name: String(cardName || "") }
        );
      }
      if (cardKey === "breaking_faith") {
        return dojo.string.substitute(
          _("Choose a target player in your Sect for ${card_name}, or cancel."),
          { card_name: String(cardName || "") }
        );
      }
      if (cardKey === "faith_war" || cardKey === "faith_debate") {
        return dojo.string.substitute(
          _("Choose a target Sect for ${card_name}, or cancel."),
          { card_name: String(cardName || "") }
        );
      }
      if (cardKey === "witch_hunt" || cardKey === "spread_rumors") {
        return dojo.string.substitute(
          _("Choose a target Sect for ${card_name}, or cancel."),
          { card_name: String(cardName || "") }
        );
      }
      return dojo.string.substitute(
        _("Choose a target player for ${card_name}, or cancel."),
        { card_name: String(cardName || "") }
      );
    },

    getRepresentativeCandidatesForCurrentLeader: function (args) {
      const stateArgs =
        args && args.args && typeof args.args === "object"
          ? args.args
          : args || {};
      const me = parseInt(this.player_id || 0, 10);
      const candidatesByLeader =
        stateArgs && typeof stateArgs.candidates_by_leader === "object"
          ? stateArgs.candidates_by_leader
          : null;
      if (candidatesByLeader && me > 0) {
        const direct = candidatesByLeader[String(me)];
        if (Array.isArray(direct)) {
          return direct;
        }
        let myLeaderId = parseInt(stateArgs.requester_leader_id || 0, 10);
        if (!myLeaderId) {
          const mySect = this.getPlayerSectId(me);
          myLeaderId = parseInt(this.getSectLeaderIdBySect(mySect) || 0, 10);
        }
        if (!myLeaderId) {
          myLeaderId = me;
        }
        const scoped = candidatesByLeader[String(myLeaderId)];
        if (Array.isArray(scoped)) {
          return scoped;
        }
      }
      const attackerLeaderId = parseInt(stateArgs.attacker_leader_id || 0, 10);
      const defenderLeaderId = parseInt(stateArgs.defender_leader_id || 0, 10);

      if (
        me > 0 &&
        me === attackerLeaderId &&
        Array.isArray(stateArgs.attacker_candidates)
      ) {
        return stateArgs.attacker_candidates;
      }
      if (
        me > 0 &&
        me === defenderLeaderId &&
        Array.isArray(stateArgs.defender_candidates)
      ) {
        return stateArgs.defender_candidates;
      }

      // Legacy fallback for older running games that only include one candidate list.
      if (Array.isArray(stateArgs.candidates)) {
        return stateArgs.candidates;
      }
      return [];
    },

    formatRepresentativeCandidateLabel: function (candidate) {
      const name =
        candidate && candidate.name ? String(candidate.name) : _("Player");
      const believerCount = Math.max(
        0,
        parseInt((candidate && candidate.believer_count) || 0, 10) || 0
      );
      return dojo.string.substitute(_("${player_name} (Believers: ${count})"), {
        player_name: name,
        count: believerCount,
      });
    },

    getSkillStateFromArgs: function (args) {
      if (!args) return null;
      if (args.skill_state) return args.skill_state;
      if (args.args && args.args.skill_state) return args.args.skill_state;
      return this.mySkillState || null;
    },

    getSkillUsageCap: function (skillType) {
      const t = parseInt(skillType || 0, 10);
      const caps = {
        1: 1,
        3: 1,
        7: 3,
        8: 3,
        11: 3,
        14: 3,
        15: 1,
      };
      return parseInt(caps[t] || 0, 10);
    },

    getEffectiveSkillStateForPanel: function (playerId) {
      const pid = String(playerId || "");
      if (!pid) return null;
      const map = this.playerSkillPublicState || {};
      const publicState = map[pid] || null;
      if (pid === String(this.player_id)) {
        const selfState = this.mySkillState || null;
        if (!selfState) return publicState;
        if (!publicState) return selfState;
        const selfSkillType = parseInt((selfState && selfState.skill_type) || 0, 10);
        const publicSkillType = parseInt((publicState && publicState.skill_type) || 0, 10);
        if (selfSkillType <= 0 && publicSkillType > 0) return publicState;
        if (publicSkillType <= 0 && selfSkillType > 0) return selfState;
        if (selfSkillType > 0 && publicSkillType > 0 && selfSkillType !== publicSkillType) {
          return selfState;
        }
        const selfUses = parseInt((selfState && selfState.uses) || 0, 10);
        const publicUses = parseInt((publicState && publicState.uses) || 0, 10);
        const selfExhausted = parseInt((selfState && selfState.exhausted) || 0, 10) === 1;
        const publicExhausted = parseInt((publicState && publicState.exhausted) || 0, 10) === 1;
        if (publicExhausted && !selfExhausted) return publicState;
        if (publicUses > selfUses) return publicState;
        return selfState;
      }
      return publicState;
    },

    applyPublicSkillStateForPlayer: function (playerId, skillState) {
      const pid = String(playerId || "");
      if (!pid) return;
      if (!this.playerSkillPublicState) this.playerSkillPublicState = {};
      if (skillState) {
        this.playerSkillPublicState[pid] = skillState;
      } else {
        delete this.playerSkillPublicState[pid];
      }

      const icon = dojo.byId("skill_icon_" + pid);
      if (icon) {
        const skillType = parseInt(dojo.attr(icon, "data-index") || "0", 10);
        if (skillType > 0) {
          this.attachSkillTooltip(
            icon,
            skillType,
            this.getEffectiveSkillStateForPanel(pid)
          );
        }
      }
      this.refreshPlayerSkillActiveBadge(pid);
    },

    isPraiseLifeUsedThisTurnForCurrentPlayer: function (skillState) {
      const state = skillState || this.mySkillState || null;
      return (
        parseInt((state && state.praise_life_used_this_turn) || 0, 10) === 1
      );
    },

    hasRemainingActionSlotsThisTurn: function () {
      return this.currentTurnPerformedActionsCount < this.currentTurnMaxActions;
    },

    normalizeSkillProtectionSnapshot: function (snapshot) {
      const normalized = { physical: {}, mental: {} };
      ["physical", "mental"].forEach(function (kind) {
        const source = snapshot && snapshot[kind] ? snapshot[kind] : {};
        Object.keys(source || {}).forEach(function (pid) {
          normalized[kind][String(pid)] =
            parseInt(source[pid] || 0, 10) === 1 ? 1 : 0;
        });
      });
      return normalized;
    },

    setSkillProtectionSnapshot: function (snapshot) {
      this.skillProtection = this.normalizeSkillProtectionSnapshot(
        snapshot || {}
      );
      this.refreshAllPlayerSkillActiveBadges();
    },

    updateSkillProtectionFromActorState: function (playerId, skillState) {
      const pid = String(playerId || "");
      if (!pid || !skillState) return;
      if (!this.skillProtection || !this.skillProtection.physical) {
        this.skillProtection = { physical: {}, mental: {} };
      }
      this.skillProtection.physical[pid] =
        parseInt(skillState.protected_physical || 0, 10) === 1 ? 1 : 0;
      this.skillProtection.mental[pid] =
        parseInt(skillState.protected_mental || 0, 10) === 1 ? 1 : 0;
      this.refreshPlayerSkillActiveBadge(pid);
    },

    getAttackKindForActionCard: function (cardKey) {
      const key = String(cardKey || "");
      if (["witch_hunt", "faith_war", "martyrdom"].indexOf(key) !== -1) {
        return "physical";
      }
      if (["spread_rumors", "faith_debate", "conspiracy"].indexOf(key) !== -1) {
        return "mental";
      }
      return null;
    },

    canCurrentPlayerChooseZombieArmyForFaithWar: function () {
      const me = (this.gamedatas.players || {})[String(this.player_id)] || null;
      if (!me) return false;
      if (parseInt(me.player_role || 0, 10) !== 0) return false;
      if (parseInt(me.player_is_skill_sealed || 0, 10) === 1) return false;

      const effectiveSkillType = parseInt(
        (this.mySkillState || {}).gate_truth_effective_skill_type || 0,
        10
      );
      if (effectiveSkillType === 10) return true;

      const stateSkillType = parseInt(
        (this.mySkillState || {}).skill_type || 0,
        10
      );
      if (stateSkillType === 10) return true;

      const mySkillCard =
        (this.gamedatas.player_skills || {})[String(this.player_id)] || null;
      return parseInt((mySkillCard && mySkillCard.type) || 0, 10) === 10;
    },

    canUseZombieArmyThisTurnWindow: function () {
      if (!this.hasRemainingActionSlotsThisTurn()) return false;
      // Zombie Army augments Faith War (Physical). Once Physical is used this turn,
      // do not offer Zombie Army again.
      if ((this.currentTurnActionMask & 0b00100) !== 0) return false;
      return true;
    },

    getSkillActionTypeForUse: function (skillState) {
      const state = skillState || this.mySkillState || null;
      const baseSkillType = parseInt((state && state.skill_type) || 0, 10);
      if (baseSkillType !== 9) return baseSkillType;
      const effectiveType = parseInt(
        (state && state.gate_truth_effective_skill_type) || 0,
        10
      );
      if (effectiveType > 0) return effectiveType;
      return 9;
    },

    getGateTruthCopyTargetIdBySkillType: function (
      skillState,
      copiedSkillType
    ) {
      const state = skillState || this.mySkillState || null;
      if (!state) return 0;
      if (parseInt(state.skill_type || 0, 10) !== 9) return 0;
      if (parseInt(state.gate_truth_used_this_turn || 0, 10) === 1) return 0;
      const wantedType = parseInt(copiedSkillType || 0, 10);
      const targets = (state.gate_truth_copyable_targets || []).filter(
        function (row) {
          return parseInt((row && row.skill_type) || 0, 10) === wantedType;
        }
      );
      if (!targets.length) return 0;
      return parseInt((targets[0] && targets[0].id) || 0, 10);
    },

    canCurrentPlayerRequestFaithDebateStop: function (args) {
      const debateArgs =
        args && args.args && typeof args.args === "object"
          ? args.args
          : args || {};
      const myId = parseInt(this.player_id || 0, 10);
      if (!myId) return false;
      const attackerRepId = parseInt(
        (debateArgs && debateArgs.attacker_rep_id) ||
          (this.gamedatas &&
            this.gamedatas.combat_context &&
            this.gamedatas.combat_context.war_rep_attacker_id) ||
          0,
        10
      );
      const warType = parseInt(
        (this.gamedatas &&
          this.gamedatas.combat_context &&
          this.gamedatas.combat_context.war_type) ||
          0,
        10
      );
      return warType === 7 && attackerRepId > 0 && myId === attackerRepId;
    },

    hasMyActionCardTypeInHand: function (cardKey) {
      const wanted = String(cardKey || "");
      if (!wanted) return false;
      if (
        this.hiddenPendingActionCard &&
        String(this.hiddenPendingActionCard.cardKey || "") === wanted
      ) {
        return true;
      }
      const hasFromMap = Object.keys(this.actionCardTypeById || {}).some(
        function (cardId) {
          return String(this.actionCardTypeById[cardId] || "") === wanted;
        }.bind(this)
      );
      if (hasFromMap) return true;

      // Fallback for transient map desync: infer from live stock DOM.
      const root = dojo.byId("myactioncards");
      if (!root) return false;
      const nodes = dojo.query(".stockitem, [data-card-id], [data-item-id]", root);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeKey = this.getActionCardKeyFromStockNode(node);
        if (String(nodeKey || "") !== wanted) continue;
        const ids = this.extractActionCardIdCandidatesFromStockNode(
          node,
          "myactioncards"
        );
        ids.forEach(
          function (id) {
            if (!this.actionCardTypeById[String(id)]) {
              this.actionCardTypeById[String(id)] = wanted;
            }
          }.bind(this)
        );
        return true;
      }
      return false;
    },

    getFirstMyActionCardIdByType: function (cardKey) {
      const wanted = String(cardKey || "");
      let ids = Object.keys(this.actionCardTypeById || {})
        .filter(
          function (cardId) {
            return String(this.actionCardTypeById[cardId] || "") === wanted;
          }.bind(this)
        )
        .map(function (cardId) {
          return parseInt(cardId, 10);
        })
        .filter(function (cardId) {
          return cardId > 0;
        })
        .sort(function (a, b) {
          return a - b;
        });
      if (ids.length) return ids[0];

      // Fallback for transient map desync: infer from live stock DOM.
      const root = dojo.byId("myactioncards");
      if (!root) return 0;
      ids = [];
      const nodes = dojo.query(".stockitem, [data-card-id], [data-item-id]", root);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeKey = this.getActionCardKeyFromStockNode(node);
        if (String(nodeKey || "") !== wanted) continue;
        const nodeIds = this.extractActionCardIdCandidatesFromStockNode(
          node,
          "myactioncards"
        );
        nodeIds.forEach(
          function (id) {
            const parsed = parseInt(id || 0, 10);
            if (parsed > 0 && ids.indexOf(parsed) === -1) {
              ids.push(parsed);
              if (!this.actionCardTypeById[String(parsed)]) {
                this.actionCardTypeById[String(parsed)] = wanted;
              }
            }
          }.bind(this)
        );
      }
      ids.sort(function (a, b) {
        return a - b;
      });
      return ids.length ? ids[0] : 0;
    },

    isPlayerProtectedBySkill: function (playerId, attackKind) {
      const pid = String(playerId || "");
      const kind = String(attackKind || "");
      if (!pid || (kind !== "physical" && kind !== "mental")) return false;
      if (!this.skillProtection || !this.skillProtection[kind]) return false;
      return parseInt(this.skillProtection[kind][pid] || 0, 10) === 1;
    },

    getPlayerProtectionFlags: function (playerId) {
      const pid = String(playerId || "");
      const physical =
        !!this.skillProtection &&
        !!this.skillProtection.physical &&
        parseInt(this.skillProtection.physical[pid] || 0, 10) === 1;
      const mental =
        !!this.skillProtection &&
        !!this.skillProtection.mental &&
        parseInt(this.skillProtection.mental[pid] || 0, 10) === 1;
      return {
        physical: physical,
        mental: mental,
        active: physical || mental,
      };
    },

    refreshPlayerSkillActiveBadge: function (playerId) {
      const pid = String(playerId || "");
      const node = dojo.byId("skill_active_" + pid);
      if (!node) return;
      const playerRow =
        (this.gamedatas &&
          this.gamedatas.players &&
          this.gamedatas.players[pid]) ||
        null;

      const flags = this.getPlayerProtectionFlags(pid);
      const state = this.getEffectiveSkillStateForPanel(pid);
      const isSkillRevealed =
        this.gamedatas.player_skills_revealed &&
        parseInt(this.gamedatas.player_skills_revealed[pid] || 0, 10) === 1;
      const isSelf = pid === String(this.player_id);
      const isSealed =
        parseInt((playerRow && playerRow.player_is_skill_sealed) || 0, 10) ===
        1;
      const skillCard =
        this.gamedatas.player_skills && this.gamedatas.player_skills[pid]
          ? this.gamedatas.player_skills[pid]
          : null;
      // For self, trust live private skill state first so "Spent" remains accurate
      // even when public reveal snapshots lag one notification behind.
      let skillType = 0;
      if (
        pid === String(this.player_id) &&
        state &&
        parseInt(state.skill_type || 0, 10) > 0
      ) {
        skillType = parseInt(state.skill_type || 0, 10);
      } else if (isSkillRevealed && skillCard) {
        skillType = parseInt(skillCard.type || 0, 10);
      }
      const canShowUsageState = isSelf || isSkillRevealed;
      const usageCap = canShowUsageState ? this.getSkillUsageCap(skillType) : 0;
      const uses = parseInt(
        (state && state.uses) || (skillCard && skillCard.type_arg) || 0,
        10
      );
      const exhausted = canShowUsageState && usageCap > 0 && uses >= usageCap;
      const purpleHermitPendingSplit =
        skillType === 1 &&
        parseInt((state && state.purple_hermit_pending_split) || 0, 10) === 1;
      const shouldShowSeal = isSealed && (isSelf || isSkillRevealed);

      if (shouldShowSeal) {
        node.innerHTML = _("Seal");
        node.title = _("This revealed skill is sealed and currently inactive.");
        dojo.removeClass(node, "is-active");
        dojo.removeClass(node, "is-exhausted");
        dojo.addClass(node, "is-sealed");
        return;
      }

      if (purpleHermitPendingSplit) {
        node.innerHTML = _("Active");
        node.title = _(
          "Purple Hermit is active. Final split happens at your next turn start."
        );
        dojo.addClass(node, "is-active");
        dojo.removeClass(node, "is-exhausted");
        dojo.removeClass(node, "is-sealed");
        return;
      }

      if (!flags.active) {
        if (exhausted) {
          node.innerHTML = _("Spent");
          node.title = _("This limited-use skill has been exhausted.");
          dojo.removeClass(node, "is-active");
          dojo.addClass(node, "is-exhausted");
          dojo.removeClass(node, "is-sealed");
          return;
        }
        node.innerHTML = "";
        node.title = "";
        dojo.removeClass(node, "is-active");
        dojo.removeClass(node, "is-exhausted");
        dojo.removeClass(node, "is-sealed");
        return;
      }

      const kinds = [];
      if (flags.physical) kinds.push(_("Physical"));
      if (flags.mental) kinds.push(_("Mental"));
      node.innerHTML = _("Active");
      node.title = kinds.length
        ? dojo.string.substitute(
            _("Skill effect active: ${kinds} protection"),
            { kinds: kinds.join(" / ") }
          )
        : _("Skill effect active: protection");
      dojo.addClass(node, "is-active");
      dojo.removeClass(node, "is-exhausted");
      dojo.removeClass(node, "is-sealed");
    },

    refreshAllPlayerSkillActiveBadges: function () {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      Object.keys(players).forEach(
        function (pid) {
          this.refreshPlayerSkillActiveBadge(pid);
        }.bind(this)
      );
    },

    setSelectedTargetPlayerVisual: function (targetPlayerId) {
      Object.keys(this.gamedatas.players || {}).forEach(function (player_id) {
        const panelNode = dojo.byId("panel_" + player_id);
        const tableNode = dojo.byId("playertable_" + player_id);
        if (panelNode) {
          dojo.removeClass(panelNode, "target_selected");
        }
        if (tableNode) {
          dojo.removeClass(tableNode, "target_selected");
        }
      });
      const pid = String(parseInt(targetPlayerId || 0, 10));
      if (!pid || pid === "0" || pid === "NaN") return;
      const panelNode = dojo.byId("panel_" + pid);
      const tableNode = dojo.byId("playertable_" + pid);
      if (panelNode) {
        dojo.addClass(panelNode, "target_selected");
      }
      if (tableNode) {
        dojo.addClass(tableNode, "target_selected");
      }
    },

    clearSkillTargetSelection: function () {
      if (this.skillTargetHandles) {
        dojo.forEach(this.skillTargetHandles, dojo.disconnect);
      }
      this.skillTargetHandles = [];
      Object.keys(this.gamedatas.players || {}).forEach(function (player_id) {
        const panelNode = dojo.byId("panel_" + player_id);
        const tableNode = dojo.byId("playertable_" + player_id);
        if (panelNode) {
          dojo.removeClass(panelNode, "selectable_target");
          dojo.removeClass(panelNode, "target_selected");
        }
        if (tableNode) {
          dojo.removeClass(tableNode, "selectable_target");
          dojo.removeClass(tableNode, "target_selected");
        }
      });
    },

    highlightSkillTargetPlayers: function (allowSelf, allowedTargetIds) {
      const canTargetSelf =
        typeof allowSelf === "undefined" ? true : !!allowSelf;
      const allowedIds =
        allowedTargetIds && allowedTargetIds.length
          ? Object.fromEntries(
              allowedTargetIds.map(function (id) {
                return [String(parseInt(id, 10)), 1];
              })
            )
          : null;
      this.clearSkillTargetSelection();
      Object.keys(this.gamedatas.players || {}).forEach(
        function (player_id) {
          if (!canTargetSelf && String(player_id) === String(this.player_id)) {
            return;
          }
          if (allowedIds && !allowedIds[String(player_id)]) {
            return;
          }
          const node =
            dojo.byId("panel_" + player_id) ||
            dojo.byId("playertable_" + player_id);
          if (!node) return;
          dojo.addClass(node, "selectable_target");
          this.skillTargetHandles.push(
            dojo.connect(node, "onclick", this, function (evt) {
              if (evt) dojo.stopEvent(evt);
              this.onSkillTargetPlayerSelected(player_id);
            })
          );
        }.bind(this)
      );
    },

    getSoulCuttingSwordSelectionInstruction: function (targetPlayerId) {
      const base = _(
        "Soul-Cutting Sword: select 1 target player, then confirm."
      );
      const pid = parseInt(targetPlayerId || 0, 10);
      if (pid <= 0) return base;
      const targetName =
        (this.gamedatas.players[String(pid)] || {}).name || _("Player");
      return dojo.string.substitute(
        _(
          "Soul-Cutting Sword: selected target ${target_name}. Click Confirm, or select another player."
        ),
        { target_name: targetName }
      );
    },

    beginPendingSkillSelection: function (skillState) {
      if (!skillState) return;
      const baseSkillType = parseInt(skillState.skill_type || 0, 10);
      const skillType = this.getSkillActionTypeForUse(skillState);
      this.pendingSkill = {
        skillType: skillType,
        baseSkillType: baseSkillType,
        targetPlayerId: null,
      };
      this.playerActionCards.unselectAll();
      this.playerBelieverCards.unselectAll();

      if (skillType === 2) {
        dojo.addClass("mybelievercards", "highlight_stock");
        this.highlightSkillTargetPlayers(false);
        this.setTopInstruction(
          _(
            "KABOOM!: select 1 Believer and 1 non-self target player, then confirm."
          )
        );
      } else if (skillType === 11) {
        this.highlightSkillTargetPlayers(false);
        this.setTopInstruction(this.getSoulCuttingSwordSelectionInstruction(0));
      } else if (skillType === 13 || skillType === 7 || skillType === 8) {
        dojo.addClass("mybelievercards", "highlight_stock");
        if (skillType === 13) {
          this.setTopInstruction(
            _("Praise of Life: select 1 Believer to sacrifice, then confirm.")
          );
        } else if (skillType === 8) {
          this.setTopInstruction(
            _("World Peace: select 1 Believer to sacrifice, then confirm.")
          );
        } else {
          this.setTopInstruction(
            _("Eternal Truth: select 1 Believer to sacrifice, then confirm.")
          );
        }
      } else if (skillType === 1) {
        if (baseSkillType === 9) {
          this.setTopInstruction(
            _(
              "Gate of Truth copied Purple Hermit: confirm to snatch half of the copied-skill owner's Believers."
            )
          );
        } else {
          this.setTopInstruction(
            _(
              "Purple Hermit: activate to snatch half of your Leader's Believers now. Confirm to use."
            )
          );
        }
      } else if (skillType === 3) {
        this.setTopInstruction(
          _(
            "Headstronger: expel all your Followers and snatch half of each Follower's Believers. Confirm to use."
          )
        );
      } else if (skillType === 14 || skillType === 15) {
        this.setTopInstruction(_("Confirm to use this skill."));
      } else if (skillType === 9) {
        const copyTargets =
          (skillState && skillState.gate_truth_copyable_targets) || [];
        const targetIds = copyTargets
          .map(function (row) {
            return parseInt((row && row.id) || 0, 10);
          })
          .filter(function (id) {
            return id > 0;
          });
        this.pendingSkill.copyTargets = copyTargets;
        if (!targetIds.length) {
          this.setTopInstruction(
            _("No revealed skill can be copied right now.")
          );
        } else {
          this.highlightSkillTargetPlayers(false, targetIds);
          this.setTopInstruction(
            _(
              "Gate of Truth: choose one player with a revealed skill to copy, then confirm."
            )
          );
        }
      }

      this.onUpdateActionButtons(
        "playerTurn",
        this.gamedatas.gamestate.args || {}
      );
    },

    cancelPendingSkillSelection: function () {
      this.pendingSkill = null;
      this.playerBelieverCards.unselectAll();
      dojo.removeClass("mybelievercards", "highlight_stock");
      this.clearSkillTargetSelection();
      this.restoreServerGameState();
    },

    onSkillTargetPlayerSelected: function (targetPlayerId) {
      if (!this.pendingSkill) return;
      const tid = parseInt(targetPlayerId, 10);
      this.pendingSkill.targetPlayerId = tid;
      this.setSelectedTargetPlayerVisual(tid);
      if (parseInt(this.pendingSkill.skillType || 0, 10) === 11) {
        this.setTopInstruction(
          this.getSoulCuttingSwordSelectionInstruction(targetPlayerId)
        );
        return;
      }
      if (parseInt(this.pendingSkill.skillType || 0, 10) === 9) {
        const copyTargets = this.pendingSkill.copyTargets || [];
        const targetRow =
          copyTargets.find(function (row) {
            return parseInt((row && row.id) || 0, 10) === tid;
          }) || null;
        const targetName =
          (this.gamedatas.players[String(tid)] || {}).name || _("Player");
        const copiedSkillName = targetRow
          ? this.getSkillName(parseInt(targetRow.skill_type || 0, 10))
          : _("skill");
        this.setTopInstruction(
          dojo.string.substitute(
            _(
              "Gate of Truth target selected: ${target_name} (${skill_name}). Click Confirm, or select another player."
            ),
            {
              target_name: targetName,
              skill_name: copiedSkillName,
            }
          )
        );
        return;
      }
      this.showMessage(
        dojo.string.substitute(_("Skill target selected: ${target_name}"), {
          target_name:
            (this.gamedatas.players[String(targetPlayerId)] || {}).name ||
            _("Player"),
        }),
        "info"
      );
    },

    onUseSkillButtonClicked: function (options) {
      const opts = options || {};
      const fromSkillCard = !!opts.fromSkillCard;
      const skillState =
        this.mySkillState ||
        this.getSkillStateFromArgs(this.gamedatas.gamestate.args || {});
      if (!skillState || parseInt(skillState.skill_type || 0, 10) <= 0) {
        this.showMessage(_("No usable skill found."), "error");
        return;
      }
      const actionSkillType = this.getSkillActionTypeForUse(skillState);
      if (actionSkillType === 10) {
        // Zombie Army is a Faith War augment flow, not a standalone useSkill ajax.
        // Keep skill-card click and top-button click identical.
        this.onUseZombieArmyForFaithWarClicked();
        return;
      }
      const isSoulCuttingSword = actionSkillType === 11;
      const soulCuttingSwordFallbackCanUse =
        isSoulCuttingSword &&
        !this.hasRemainingActionSlotsThisTurn() &&
        parseInt(skillState.is_sealed || 0, 10) !== 1 &&
        parseInt(skillState.uses || 0, 10) < 3;
      const localStateCanUseFallback =
        this.isCurrentPlayerActive() &&
        parseInt(skillState.can_use || 0, 10) === 1;

      // Some same-state transitions can briefly desync local checkAction/can_use
      // right after the second action. Keep this guarded fallback for
      // Soul-Cutting Sword and let server-side validation stay authoritative.
      if (
        !this.checkAction("useSkill", true) &&
        !soulCuttingSwordFallbackCanUse &&
        !localStateCanUseFallback
      ) {
        return;
      }
      if (this.isDiscardMode) {
        this.showMessage(
          _("Finish or cancel discard selection before using a skill."),
          "info"
        );
        return;
      }
      if (
        parseInt(skillState.can_use || 0, 10) !== 1 &&
        !soulCuttingSwordFallbackCanUse
      ) {
        this.showMessage(
          skillState.disabled_reason ||
            _("This skill cannot be used right now."),
          "error"
        );
        return;
      }
      if (
        !fromSkillCard &&
        !this.skillUseNeedsManualSelection(actionSkillType)
      ) {
        if (this.actionSubmissionInFlight) return;
        this.actionSubmissionInFlight = true;
        this.ajaxAction("useSkill", {}, function () {
          this.actionSubmissionInFlight = false;
          this.cancelPendingSkillSelection();
        });
        return;
      }
      this.beginPendingSkillSelection(skillState);
    },

    onUseZombieArmyForFaithWarClicked: function () {
      if (this.actionSubmissionInFlight) return;
      const hasFaithWarCardInHand = this.hasMyActionCardTypeInHand("faith_war");
      const canPlayActionCardNow =
        this.checkAction("playActionCard", true) ||
        (this.isCurrentPlayerActive() && hasFaithWarCardInHand);
      if (!canPlayActionCardNow) return;
      if (this.pendingAction || this.pendingSkill) return;
      if (!this.canCurrentPlayerChooseZombieArmyForFaithWar()) {
        this.showMessage(_("Zombie Army is not available right now."), "error");
        return;
      }
      if (!this.hasRemainingActionSlotsThisTurn()) {
        this.showMessage(_("No action slots left this turn."), "error");
        return;
      }
      if (this.currentTurnActionMask & 0b00100) {
        this.showMessage(
          _("You have already used a Physical Attack this turn."),
          "error"
        );
        return;
      }
      if (this.getVisibleGraveyardCount() <= 0) {
        this.showMessage(
          _(
            "Graveyard has no Believers, so Zombie Army cannot be used in this Faith War."
          ),
          "error"
        );
        return;
      }
      const faithWarCardId = this.getFirstMyActionCardIdByType("faith_war");
      if (!faithWarCardId) {
        this.showMessage(
          _("You need a Faith War card in hand to use Zombie Army."),
          "error"
        );
        return;
      }
      this.beginTargetSelection(
        {
          id: faithWarCardId,
          type: this.getActionCardSpriteIndex("faith_war"),
        },
        { use_zombie: 1 }
      );
    },

    beginFaithWarZombieDecision: function (card) {
      if (!card || !card.id) return;
      if (this.actionSubmissionInFlight) return;
      if (!this.canCurrentPlayerChooseZombieArmyForFaithWar()) {
        this.beginTargetSelection(card, {});
        return;
      }
      if (
        !this.canUseZombieArmyThisTurnWindow() ||
        this.getVisibleGraveyardCount() <= 0
      ) {
        this.beginTargetSelection(card, {});
        return;
      }

      const cardId = parseInt(card.id, 10);
      const cardKey = "faith_war";
      if (
        this.pendingAction &&
        this.pendingAction.tempArenaId &&
        dojo.byId(this.pendingAction.tempArenaId)
      ) {
        dojo.destroy(this.pendingAction.tempArenaId);
      }
      this.clearTargetSelection();
      this.pendingFaithWarUseZombie = false;
      this.pendingAction = {
        cardId: cardId,
        cardKey: cardKey,
        targetChosen: false,
        zombieDecisionPending: true,
        tempArenaId: this.showPendingActionPreview(cardKey, cardId),
      };
      this.hidePendingActionCardFromHand(cardId, cardKey);
      this.playerActionCards.unselectAll();
      this.clearPendingActionButtons();
      this.addActionButton(
        "confirmZombieFaithWarDecision",
        _("Use Zombie Army"),
        "onConfirmZombieFaithWarDecisionClicked"
      );
      this.addActionButton(
        "cancelZombieFaithWarDecision",
        _("Cancel"),
        "cancelPendingActionSelection"
      );
      this.setTopInstruction(_("Use Zombie Army for this Faith War?"));
    },

    onConfirmZombieFaithWarDecisionClicked: function () {
      if (
        !this.pendingAction ||
        String(this.pendingAction.cardKey || "") !== "faith_war" ||
        !this.pendingAction.zombieDecisionPending
      ) {
        return;
      }
      if (
        !this.canCurrentPlayerChooseZombieArmyForFaithWar() ||
        !this.canUseZombieArmyThisTurnWindow() ||
        this.getVisibleGraveyardCount() <= 0
      ) {
        this.showMessage(_("Zombie Army is not available right now."), "error");
        this.cancelPendingActionSelection();
        return;
      }
      const cardId = parseInt(this.pendingAction.cardId || 0, 10);
      if (cardId <= 0) {
        this.cancelPendingActionSelection();
        return;
      }
      this.beginTargetSelection(
        {
          id: cardId,
          type: this.getActionCardSpriteIndex("faith_war"),
        },
        { use_zombie: 1 }
      );
    },

    onCopyZombieArmyForFaithWarClicked: function (targetPlayerId) {
      if (this.actionSubmissionInFlight) return;
      if (!this.checkAction("useSkill", true)) return;
      const skillState =
        this.getSkillStateFromArgs(
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.args) ||
            {}
        ) ||
        this.mySkillState ||
        null;
      const targetId = parseInt(targetPlayerId || 0, 10);
      if (!skillState || parseInt(skillState.skill_type || 0, 10) !== 9) {
        this.showMessage(_("Gate of Truth is not available."), "error");
        return;
      }
      if (targetId <= 0) {
        this.showMessage(
          _("No revealed Zombie Army skill can be copied right now."),
          "error"
        );
        return;
      }
      this.actionSubmissionInFlight = true;
      this.ajaxAction("useSkill", { target_id: targetId }, function () {
        this.cancelPendingSkillSelection();
        this.onUseZombieArmyForFaithWarClicked();
      });
    },

    onConfirmPendingSkillClicked: function () {
      if (!this.pendingSkill || this.actionSubmissionInFlight) return;
      const skillState =
        this.getSkillStateFromArgs(
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.args) ||
            {}
        ) ||
        this.mySkillState ||
        null;
      const localStateCanUseFallback =
        this.isCurrentPlayerActive() &&
        parseInt((skillState && skillState.can_use) || 0, 10) === 1;
      if (!this.checkAction("useSkill", true) && !localStateCanUseFallback)
        return;
      const skillType = parseInt(this.pendingSkill.skillType || 0, 10);
      const selectedBelievers =
        this.playerBelieverCards.getSelectedItems() || [];
      const args = {};

      if (skillType === 2) {
        if (selectedBelievers.length !== 1) {
          this.showMessage(_("Select exactly 1 Believer for KABOOM!"), "error");
          return;
        }
        if (!this.pendingSkill.targetPlayerId) {
          this.showMessage(_("Select a target player for KABOOM!"), "error");
          return;
        }
        args.believer_id = selectedBelievers[0].id;
        args.target_id = this.pendingSkill.targetPlayerId;
      } else if (skillType === 13) {
        if (selectedBelievers.length !== 1) {
          this.showMessage(
            _("Select exactly 1 Believer to sacrifice for Praise of Life"),
            "error"
          );
          return;
        }
        args.believer_id = selectedBelievers[0].id;
      } else if (skillType === 8) {
        if (selectedBelievers.length !== 1) {
          this.showMessage(
            _("Select exactly 1 Believer to sacrifice for World Peace"),
            "error"
          );
          return;
        }
        args.believer_id = selectedBelievers[0].id;
      } else if (skillType === 7) {
        if (selectedBelievers.length !== 1) {
          this.showMessage(
            _("Select exactly 1 Believer to sacrifice for Eternal Truth"),
            "error"
          );
          return;
        }
        args.believer_id = selectedBelievers[0].id;
      } else if (skillType === 11) {
        if (!this.pendingSkill.targetPlayerId) {
          this.showMessage(
            _("Select a target player for Soul-Cutting Sword"),
            "error"
          );
          return;
        }
        args.target_id = this.pendingSkill.targetPlayerId;
      } else if (skillType === 9) {
        if (!this.pendingSkill.targetPlayerId) {
          this.showMessage(
            _("Select a player with a revealed skill for Gate of Truth"),
            "error"
          );
          return;
        }
        args.target_id = this.pendingSkill.targetPlayerId;
      }

      this.actionSubmissionInFlight = true;
      this.ajaxAction("useSkill", args, function () {
        this.actionSubmissionInFlight = false;
        this.cancelPendingSkillSelection();
      });
    },

    onProphetEnableSkillClicked: function () {
      if (!this.checkAction("prophetEnableSkill", true)) return;
      this.ajaxAction("prophetEnableSkill", {});
    },

    onProphetSkipSkillClicked: function () {
      if (!this.checkAction("prophetSkipSkill", true)) return;
      this.ajaxAction("prophetSkipSkill", {});
    },

    onProphetGuessTypeClicked: function (believerType) {
      if (!this.checkAction("prophetGuessBelieverType", true)) return;
      this.ajaxAction("prophetGuessBelieverType", {
        believer_type: parseInt(believerType, 10),
      });
    },

    onProphetPassGuessClicked: function () {
      if (!this.checkAction("prophetPassGuess", true)) return;
      this.ajaxAction("prophetPassGuess", {});
    },

    onCompleteInfoSpyClicked: function () {
      if (this.infoSpyCloseInFlight) return;
      if (!this.checkAction("completeInfoSpy", true)) return;
      this.infoSpyCloseInFlight = true;
      this.ajaxAction("completeInfoSpy", {}, function () {
        this.infoSpyCloseInFlight = false;
        this.closeSpyResultModal();
      });
    },

    onCloseSpyResultModalClicked: function () {
      // Info Spy modal close should acknowledge server-side completion first.
      if (this.checkAction("completeInfoSpy", true)) {
        this.onCompleteInfoSpyClicked();
        return;
      }
      this.closeSpyResultModal();
    },

    onHolyRebirthUseClicked: function () {
      if (!this.checkAction("holyRebirthUse", true)) return;
      this.ajaxAction("holyRebirthUse", {});
    },

    onHolyRebirthSkipClicked: function () {
      if (!this.checkAction("holyRebirthSkip", true)) return;
      this.ajaxAction("holyRebirthSkip", {});
    },

    onReverseKarmaUseClicked: function () {
      if (!this.checkAction("reverseKarmaUse", true)) return;
      this.ajaxAction("reverseKarmaUse", {});
    },

    onReverseKarmaSkipClicked: function () {
      if (!this.checkAction("reverseKarmaSkip", true)) return;
      this.ajaxAction("reverseKarmaSkip", {});
    },

    onApproveFaithDebateStopClicked: function () {
      if (!this.checkAction("approveFaithDebateStop", true)) return;
      this.ajaxAction("approveFaithDebateStop", {});
    },

    onRejectFaithDebateStopClicked: function () {
      if (!this.checkAction("rejectFaithDebateStop", true)) return;
      this.ajaxAction("rejectFaithDebateStop", {});
    },

    onChooseZombieGraveBelieverClicked: function () {
      if (!this.checkAction("playBelieverCard", true)) return;
      this.showZombieGravePickerModal();
    },

    onConfirmGameEndSummaryClicked: function () {
      if (this.gameEndSummaryConfirmSent) return;
      if (!this.checkAction("confirmGameEndSummary", true)) return;
      this.gameEndSummaryConfirmSent = true;
      this.clearGameEndSummaryTimers();
      this.ajaxAction("confirmGameEndSummary", {});
    },

    onConfirmImpermanenceShowcaseClicked: function () {
      // Backward compatibility for stale clients/buttons.
      this.onConfirmGameEndSummaryClicked();
    },

    clearGameEndSummaryTimers: function () {
      if (this.gameEndSummaryTickTimer) {
        clearInterval(this.gameEndSummaryTickTimer);
        this.gameEndSummaryTickTimer = null;
      }
      if (this.gameEndSummaryAutoTimer) {
        clearTimeout(this.gameEndSummaryAutoTimer);
        this.gameEndSummaryAutoTimer = null;
      }
    },

    onUpdateActionButtons: function (stateName, args) {
      setTimeout(
        function () {
          this.refreshHandCardReadinessVisuals(stateName, args);
        }.bind(this),
        0
      );
      // Do not forcibly unlock in-flight submissions here.
      // Unlock only in ajaxAction callbacks to prevent duplicate sends.
      const incomingArgs = args || {};
      args = incomingArgs;
      if (stateName === "prophetSkillPrompt" || stateName === "prophetGuess") {
        setTimeout(
          function () {
            this.ensureProphetPredictionVisualForState(stateName, incomingArgs);
          }.bind(this),
          0
        );
      }
      if (stateName === "playerTurn") {
        const serverArgs =
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.args) ||
          {};
        args = Object.assign({}, serverArgs, incomingArgs);
        // Important: only refresh turn-window counters from the *incoming* state
        // payload (or nested incoming args.args). Avoid stale cached serverArgs
        // values from previous turns, which can wrongly lock action types.
        const readIncomingTurnArg = function (key) {
          if (incomingArgs && typeof incomingArgs[key] !== "undefined") {
            return incomingArgs[key];
          }
          if (
            incomingArgs &&
            incomingArgs.args &&
            typeof incomingArgs.args[key] !== "undefined"
          ) {
            return incomingArgs.args[key];
          }
          return undefined;
        };
        const maskRaw = readIncomingTurnArg("performed_actions_mask");
        if (typeof maskRaw !== "undefined") {
          const maskFromArgs = parseInt(maskRaw, 10);
          if (!Number.isNaN(maskFromArgs)) {
            this.currentTurnActionMask = maskFromArgs & 0b01111;
          }
        }
        const performedRaw = readIncomingTurnArg("performed_actions_count");
        if (typeof performedRaw !== "undefined") {
          this.currentTurnPerformedActionsCount = Math.max(
            0,
            parseInt(performedRaw || 0, 10) || 0
          );
        }
        const maxRaw = readIncomingTurnArg("max_actions_this_turn");
        if (typeof maxRaw !== "undefined") {
          this.currentTurnMaxActions = Math.max(
            1,
            parseInt(maxRaw || 2, 10) || 2
          );
        }
      }
      if (stateName !== "chooseInitialSkill") {
        this.clearInitialSkillDraftArea();
      }
      const praiseLifeDecisionPending =
        stateName === "playerTurn" &&
        parseInt((args && args.praise_life_decision_pending) || 0, 10) === 1;
      const turnSkillState =
        stateName === "playerTurn"
          ? this.getSkillStateFromArgs(args) || this.mySkillState || null
          : null;
      const canUseSkillFromTurnState =
        stateName === "playerTurn" &&
        turnSkillState &&
        parseInt(turnSkillState.can_use || 0, 10) === 1;
      const playerTurnNoActionSlots =
        stateName === "playerTurn" &&
        this.isCurrentPlayerActive() &&
        !this.hasRemainingActionSlotsThisTurn();
      const believerSelectionPhaseForUi = this.shouldBelieverHandBeReady(
        stateName,
        args
      );

      if (stateName !== "playerTurn") {
        this.isDiscardMode = false;
        if (this.playerActionCards && this.playerActionCards.setSelectionMode) {
          const canSelectActionCards = this.canSelectActionCardsInState(
            stateName,
            args
          );
          // End-turn hand-trim must allow selecting multiple Action cards.
          if (stateName === "discardingActionCard") {
            this.playerActionCards.setSelectionMode(
              believerSelectionPhaseForUi || !canSelectActionCards ? 0 : 2
            );
          } else {
            this.playerActionCards.setSelectionMode(
              believerSelectionPhaseForUi || !canSelectActionCards ? 0 : 1
            );
          }
        }
        if (this.playerSkillCards && this.playerSkillCards.setSelectionMode) {
          this.playerSkillCards.setSelectionMode(0);
        }
      } else {
        // Keep local discard intent while still in playerTurn.
        const possibleActions =
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.possibleactions) ||
          [];
        if (praiseLifeDecisionPending) {
          this.isDiscardMode = false;
          if (
            this.playerActionCards &&
            this.playerActionCards.setSelectionMode
          ) {
            this.playerActionCards.setSelectionMode(0);
          }
          if (this.playerSkillCards && this.playerSkillCards.setSelectionMode) {
            this.playerSkillCards.setSelectionMode(
              this.isDiscardMode
                ? 0
                : possibleActions.includes("useSkill") || canUseSkillFromTurnState
                ? 1
                : 0
            );
          }
        } else {
          if (
            this.playerActionCards &&
            this.playerActionCards.setSelectionMode
          ) {
            this.playerActionCards.setSelectionMode(
              believerSelectionPhaseForUi && !this.isDiscardMode
                ? 0
                : playerTurnNoActionSlots && !this.isDiscardMode
                ? 0
                : this.isDiscardMode
                ? 2
                : 1
            );
          }
          if (this.playerSkillCards && this.playerSkillCards.setSelectionMode) {
            this.playerSkillCards.setSelectionMode(
              this.isDiscardMode
                ? 0
                : possibleActions.includes("useSkill")
                ? 1
                : 0
            );
          }
        }
      }

      this.clearPendingActionButtons();

      if (
        this.pendingClientConfirmation &&
        !this.actionSubmissionInFlight &&
        this.renderClientConfirmationButtons()
      ) {
        return;
      }

      if (
        stateName === "playerTurn" &&
        this.pendingSkill &&
        !this.actionSubmissionInFlight
      ) {
        this.addActionButton(
          "confirmPendingSkill",
          _("Confirm Skill"),
          "onConfirmPendingSkillClicked"
        );
        this.addActionButton(
          "cancelPendingSkill",
          _("Cancel"),
          "cancelPendingSkillSelection"
        );
        return;
      }

      // If we are in a local pending selection flow, do not render default playerTurn buttons.
      if (
        stateName === "playerTurn" &&
        this.pendingAction &&
        !this.actionSubmissionInFlight
      ) {
        const key = this.pendingAction.cardKey;
        if (key === "faith_war" && this.pendingAction.zombieDecisionPending) {
          this.setTopInstruction(_("Use Zombie Army for this Faith War?"));
          this.addActionButton(
            "confirmZombieFaithWarDecision",
            _("Use Zombie Army"),
            "onConfirmZombieFaithWarDecisionClicked"
          );
          this.addActionButton(
            "cancelZombieFaithWarDecision",
            _("Cancel"),
            "cancelPendingActionSelection"
          );
          return;
        }
        if (key === "divine_inspire") {
          this.addActionButton(
            "confirmDivineInspire",
            _("Confirm Discard and Draw"),
            "onConfirmDivineInspireClicked"
          );
          this.addActionButton(
            "cancelDivineInspire",
            _("Cancel"),
            "cancelPendingActionSelection"
          );
          return;
        }
        if (key === "witch_hunt" && this.pendingAction.targetPlayerId) {
          for (let believerType = 1; believerType <= 5; believerType++) {
            this.addActionButton(
              "witchHuntType_" + believerType,
              this.formatBelieverTypeLabel(believerType),
              function () {
                this.playPendingAction({
                  target_id: this.pendingAction.targetPlayerId,
                  type_arg: believerType,
                });
              }.bind(this)
            );
          }
          this.addActionButton(
            "cancelWitchHuntType",
            _("Cancel"),
            "cancelPendingActionSelection"
          );
          return;
        }
        // Generic target selection fallback: keep only Cancel visible.
        this.addActionButton(
          "cancelTargetSelection",
          _("Cancel"),
          "cancelPendingActionSelection"
        );
        return;
      }

      const stateActivePlayerId = parseInt(
        (args && args.active_player_id) ||
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.args &&
            this.gamedatas.gamestate.args.active_player_id) ||
          0,
        10
      );
      const canRenderInitialSkillButtons =
        stateName === "chooseInitialSkill" &&
        (this.isCurrentPlayerActive() ||
          stateActivePlayerId === parseInt(this.player_id || 0, 10));
      const canRenderCurrentStateButtons =
        canRenderInitialSkillButtons ||
        (stateName === "playerTurn" && this.isCurrentPlayerActive()) ||
        (stateName === "chooseSurrenderOrWanderer" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "askLeaderSupport" && this.isCurrentPlayerActive()) ||
        (stateName === "surrenderLeaderResponse" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "discardingActionCard" && this.isCurrentPlayerActive()) ||
        (stateName === "leaderGiveBeliever" && this.isCurrentPlayerActive()) ||
        (stateName === "chooseWarRepresentative" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "martyrdomChooseRepresentative" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "chooseFaithDebateRepresentative" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "conspiracyChooseRepresentative" &&
          this.isCurrentPlayerActive()) ||
        stateName === "confirmDefense" ||
        stateName === "martyrdomChooseBelievers" ||
        stateName === "conspiracyChooseBelievers" ||
        (stateName === "faithDebateDuel" &&
          (this.isCurrentPlayerActive() ||
            this.canCurrentPlayerRequestFaithDebateStop(args))) ||
        (stateName === "faithWarDuel" && this.isCurrentPlayerActive()) ||
        (stateName === "prophetSkillPrompt" && this.isCurrentPlayerActive()) ||
        (stateName === "prophetGuess" && this.isCurrentPlayerActive()) ||
        (stateName === "infoSpyReview" && this.isCurrentPlayerActive()) ||
        (stateName === "holyRebirthPrompt" && this.isCurrentPlayerActive()) ||
        (stateName === "secretAllianceAttackerChoice" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "secretAllianceTargetChoice" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "faithDebateStopLeaderApproval" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "reverseKarmaPrompt" && this.isCurrentPlayerActive());
      if (stateName === "chooseInitialSkill") {
        if (this.playerActionCards && this.playerActionCards.setSelectionMode) {
          this.playerActionCards.setSelectionMode(0);
        }
        if (this.playerBelieverCards && this.playerBelieverCards.setSelectionMode) {
          this.playerBelieverCards.setSelectionMode(0);
        }
        if (this.playerSkillCards && this.playerSkillCards.setSelectionMode) {
          this.playerSkillCards.setSelectionMode(0);
        }
        dojo.removeClass("mybelievercards", "highlight_stock");
        const rawChoices = (args && args.choices) || [];
        let choices = this.normalizeInitialSkillChoices(rawChoices);
        if (!choices.length) {
          choices = this.normalizeInitialSkillChoices(this.initialSkillChoices || []);
        }
        this.renderInitialSkillDraftArea(choices, !!canRenderInitialSkillButtons);
        if (!choices.length) {
          this.clearInitialSkillDraftArea();
          this.setTopInstruction(_("Waiting for other players to choose Skills."));
          return;
        }
        this.initialSkillChoices = this.normalizeInitialSkillChoices(choices);
        if (!canRenderInitialSkillButtons) {
          this.setTopInstruction(_("Waiting for other players to choose Skills."));
          return;
        }
        this.setTopInstruction(_("Choose your starting Skill."));
        this.addActionButton(
          "confirmInitialSkillDraft",
          _("Confirm Starting Skill"),
          "onConfirmInitialSkillDraftClicked"
        );
        const confirmBtn = dojo.byId("confirmInitialSkillDraft");
        if (confirmBtn) {
          confirmBtn.disabled =
            parseInt(this.initialSkillDraftSelectedId || 0, 10) <= 0;
        }
        return;
      }
      if (canRenderCurrentStateButtons) {
        switch (stateName) {
          case "playerTurn":
            const skillState =
              this.getSkillStateFromArgs(args) || this.mySkillState || null;
            const canUseSkillFromState =
              skillState && parseInt(skillState.can_use || 0, 10) === 1;
            const praiseLifeUsedThisTurn =
              this.isPraiseLifeUsedThisTurnForCurrentPlayer(skillState);
            const hasRemainingActionSlots =
              this.hasRemainingActionSlotsThisTurn();
            const hasFaithWarCardInHand =
              this.hasMyActionCardTypeInHand("faith_war");
            const canPlayActionCardNow =
              this.checkAction("playActionCard", true) ||
              (this.isCurrentPlayerActive() && hasFaithWarCardInHand);
            if (skillState) {
              this.mySkillState = skillState;
            }
            if (args && args.wanderer_mode) {
              const targets = args.wanderer_targets || [];
              if (!targets.length) {
                this.showMessage(
                  _("No target has Believers. Wanderer turn ends."),
                  "info"
                );
                this.addActionButton(
                  "endTurn",
                  _("End Turn"),
                  "onEndTurnButtonClicked"
                );
              } else {
                targets.forEach(
                  function (target) {
                    this.addActionButton(
                      "wandererSteal_" + target.id,
                      dojo.string.substitute(_("Snatch from ${target_name}"), {
                        target_name: target.name,
                      }),
                      function () {
                        this.onWandererStealTargetClicked(target.id);
                      }.bind(this)
                    );
                  }.bind(this)
                );
              }
              break;
            }
            if (this.isDiscardMode) {
              if (!hasRemainingActionSlots) {
                this.isDiscardMode = false;
                this.playerActionCards.unselectAll();
                if (this.playerActionCards.setSelectionMode) {
                  this.playerActionCards.setSelectionMode(1);
                }
              } else {
                this.setTopInstruction(
                  _(
                    "Discard mode: select one or more Action cards, then confirm discard."
                  )
                );
                this.addActionButton(
                  "confirmDiscardSelectedActions",
                  _("Confirm Discard"),
                  "onDiscardSelectedActionsClicked"
                );
                this.addActionButton(
                  "cancelDiscardMode",
                  _("Cancel Discard"),
                  "onCancelDiscardModeClicked"
                );
                break;
              }
            }
            if (praiseLifeDecisionPending) {
              const canUseSkillNow =
                !this.isDiscardMode &&
                (this.checkAction("useSkill", true) ||
                  (this.isCurrentPlayerActive() && canUseSkillFromState));
              this.setTopInstruction(
                _(
                  "Use Praise of Life to sacrifice 1 Believer and gain 1 extra action, or end your turn."
                )
              );
              if (canUseSkillNow) {
                this.addActionButton(
                  "useSkillButton",
                  _("Use Skill: Praise of Life"),
                  "onUseSkillButtonClicked"
                );
              }
              this.addActionButton(
                "endTurn",
                _("End Turn"),
                "onEndTurnButtonClicked"
              );
              break;
            }
            if (
              !this.isDiscardMode &&
              skillState &&
              this.getSkillActionTypeForUse(skillState) > 0 &&
              this.getSkillActionTypeForUse(skillState) !== 10
            ) {
              const actionSkillType = this.getSkillActionTypeForUse(skillState);
              const isSoulCuttingSword = actionSkillType === 11;
              const soulCuttingSwordFallbackCanUse =
                !hasRemainingActionSlots &&
                isSoulCuttingSword &&
                parseInt(skillState.is_sealed || 0, 10) !== 1 &&
                parseInt(skillState.uses || 0, 10) < 3;
              const localStateCanUseFallback =
                this.isCurrentPlayerActive() && canUseSkillFromState;
              const canInvokeUseSkillAction =
                this.checkAction("useSkill", true) ||
                soulCuttingSwordFallbackCanUse ||
                localStateCanUseFallback;
              if (!canInvokeUseSkillAction) {
                // Keep button hidden only when both server action and local fallback
                // say it cannot be used.
              } else if (
                canUseSkillFromState ||
                soulCuttingSwordFallbackCanUse
              ) {
                if (soulCuttingSwordFallbackCanUse) {
                  this.setTopInstruction(
                    _(
                      "Action slots are used. You may still use Soul-Cutting Sword, or end your turn."
                    )
                  );
                }
                this.addActionButton(
                  "useSkillButton",
                  dojo.string.substitute(_("Use Skill: ${skill_name}"), {
                    skill_name: this.getSkillName(actionSkillType),
                  }),
                  "onUseSkillButtonClicked"
                );
              }
            }
            if (
              !this.isDiscardMode &&
              !praiseLifeDecisionPending &&
              canPlayActionCardNow &&
              this.canCurrentPlayerChooseZombieArmyForFaithWar() &&
              hasFaithWarCardInHand &&
              this.canUseZombieArmyThisTurnWindow()
            ) {
              const graveCount = this.getVisibleGraveyardCount();
              this.addActionButton(
                "useZombieArmyFaithWar",
                graveCount > 0
                  ? _("Use Zombie Army in Faith War")
                  : _("Zombie Army (graveyard empty)"),
                "onUseZombieArmyForFaithWarClicked"
              );
            }
            if (this.isDiscardMode && !hasRemainingActionSlots) {
              this.isDiscardMode = false;
              this.playerActionCards.unselectAll();
              if (this.playerActionCards.setSelectionMode) {
                this.playerActionCards.setSelectionMode(1);
              }
            }
            if (this.isDiscardMode) {
              this.addActionButton(
                "confirmDiscardSelectedActions",
                _("Confirm Discard"),
                "onDiscardSelectedActionsClicked"
              );
              this.addActionButton(
                "cancelDiscardMode",
                _("Cancel Discard"),
                "onCancelDiscardModeClicked"
              );
            } else {
              const canDiscardFromServer =
                typeof args.can_discard_now !== "undefined"
                  ? parseInt(args.can_discard_now || 0, 10) === 1
                  : null;
              const canDiscardNow =
                canDiscardFromServer !== null
                  ? canDiscardFromServer
                  : this.checkAction("discardActionCards", true);
              const discardBitAllows =
                canDiscardFromServer !== null
                  ? true
                  : !(this.currentTurnActionMask & 0b00001) ||
                    praiseLifeUsedThisTurn;
              if (
                canDiscardNow &&
                hasRemainingActionSlots &&
                discardBitAllows
              ) {
                this.addActionButton(
                  "toggleDiscardMode",
                  _("Discard Action Card(s)"),
                  "onToggleDiscardModeClicked"
                );
              }
              this.addActionButton(
                "endTurn",
                _("End Turn"),
                "onEndTurnButtonClicked"
              );
            }
            break;

          case "discardingActionCard":
            {
              const requiredDiscardCount = Math.max(
                0,
                parseInt((args && args.required_discard_count) || 0, 10) || 0
              );
              const handLimit = Math.max(
                0,
                parseInt((args && args.hand_limit) || 0, 10) || 0
              );
              const handCount = Math.max(
                0,
                parseInt((args && args.hand_count) || 0, 10) || 0
              );
              this.setTopInstruction(
                dojo.string.substitute(
                  _(
                    "Hand limit exceeded: select exactly ${n} Action card(s) to discard (hand ${hand_count}, limit ${hand_limit})."
                  ),
                  {
                    n: requiredDiscardCount,
                    hand_count: handCount,
                    hand_limit: handLimit,
                  }
                )
              );
              this.addActionButton(
                "confirmEndTurnDiscardingActionCards",
                _("Confirm Discard"),
                "onConfirmEndTurnDiscardingActionCardsClicked"
              );
            }
            break;

          case "chooseSurrenderOrWanderer":
            const surrenderCandidates =
              args && args.candidates ? args.candidates : [];
            this.highlightSurrenderLeaderPanels(args || {});
            if (surrenderCandidates.length) {
              this.setTopInstruction(
                _("Select a Sect Leader from the player panel to surrender.")
              );
            } else {
              this.showMessage(_("No Sect Leader available to ask."), "info");
              this.setTopInstruction(
                _("No Sect Leader available. You may become a Wanderer.")
              );
            }
            if (args && args.can_become_wanderer) {
              this.addActionButton(
                "becomeWanderer",
                _("Become a Wanderer"),
                "onBecomeWandererButtonClicked"
              );
            }
            break;

          case "askLeaderSupport":
            this.addActionButton(
              "acceptLeaderSupport",
              _("Give 1 Believer"),
              "onAcceptLeaderSupportClicked"
            );
            this.addActionButton(
              "rejectLeaderSupport",
              _("Refuse"),
              "onRejectLeaderSupportClicked"
            );
            break;

          case "surrenderLeaderResponse":
            this.addActionButton(
              "acceptSurrenderRequest",
              _("Accept Surrender"),
              "onAcceptSurrenderRequestClicked"
            );
            this.addActionButton(
              "rejectSurrenderRequest",
              _("Reject"),
              "onRejectSurrenderRequestClicked"
            );
            break;

          case "leaderGiveBeliever":
            this.setTopInstruction(
              _(
                "Select exactly 1 Believer to give your new Follower, then confirm."
              )
            );
            this.addActionButton(
              "confirmGiveBeliever",
              _("Confirm Give Believer"),
              "onConfirmGiveBelieverClicked"
            );
            this.addActionButton(
              "cancelGiveBeliever",
              _("Cancel Surrender/Support"),
              "onCancelGiveBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
            break;

          case "chooseWarRepresentative":
            let candidates =
              this.getRepresentativeCandidatesForCurrentLeader(args);
            if (!candidates.length) {
              this.showMessage(
                _("Waiting for representative selection..."),
                "info"
              );
              break;
            }
            candidates.forEach(
              function (candidate) {
                this.addActionButton(
                  "chooseRep_" + candidate.id,
                  this.formatRepresentativeCandidateLabel(candidate),
                  function () {
                    this.onChooseWarRepresentativeClicked(
                      parseInt(candidate.id || 0, 10)
                    );
                  }.bind(this)
                );
              }.bind(this)
            );
            break;

          case "conspiracyChooseRepresentative":
            const conspiracyCandidates =
              this.getRepresentativeCandidatesForCurrentLeader(args);
            if (!conspiracyCandidates.length) {
              this.showMessage(
                _("Waiting for Conspiracy representative selection..."),
                "info"
              );
              this.setTopInstruction(
                _("Waiting for representative selection...")
              );
              break;
            }
            conspiracyCandidates.forEach(
              function (candidate) {
                this.addActionButton(
                  "chooseConspRep_" + candidate.id,
                  this.formatRepresentativeCandidateLabel(candidate),
                  function () {
                    this.onChooseConspiracyRepresentativeClicked(
                      parseInt(candidate.id || 0, 10)
                    );
                  }.bind(this)
                );
              }.bind(this)
            );
            break;

          case "martyrdomChooseRepresentative":
            const martyrdomCandidates =
              this.getRepresentativeCandidatesForCurrentLeader(args);
            if (!martyrdomCandidates.length) {
              this.showMessage(
                _("Waiting for Martyrdom representative selection..."),
                "info"
              );
              this.setTopInstruction(
                _("Waiting for representative selection...")
              );
              break;
            }
            martyrdomCandidates.forEach(
              function (candidate) {
                this.addActionButton(
                  "chooseMartRep_" + candidate.id,
                  this.formatRepresentativeCandidateLabel(candidate),
                  function () {
                    this.onChooseMartyrdomRepresentativeClicked(
                      parseInt(candidate.id || 0, 10)
                    );
                  }.bind(this)
                );
              }.bind(this)
            );
            break;

          case "chooseFaithDebateRepresentative":
            const debateCandidates =
              this.getRepresentativeCandidatesForCurrentLeader(args);
            if (!debateCandidates.length) {
              this.showMessage(
                _("Waiting for Faith Debate representative selection..."),
                "info"
              );
              break;
            }
            debateCandidates.forEach(
              function (candidate) {
                this.addActionButton(
                  "chooseDebateRep_" + candidate.id,
                  this.formatRepresentativeCandidateLabel(candidate),
                  function () {
                    this.onChooseFaithDebateRepresentativeClicked(
                      parseInt(candidate.id || 0, 10)
                    );
                  }.bind(this)
                );
              }.bind(this)
            );
            break;

          case "confirmDefense":
            {
              const defenseKind = (args && args.defense_kind) || "physical";
              const defenseLabel = this.getDefenseKindLabel(defenseKind);
              const canRespond =
                this.isCurrentPlayerActive() ||
                this.checkAction("passDefense", true) ||
                this.checkAction("playDefenseCard", true);
              if (canRespond) {
                this.setTopInstruction(
                  dojo.string.substitute(
                    _(
                      "Play a matching ${defense_label} defense card, or click Skip Defense."
                    ),
                    { defense_label: defenseLabel }
                  )
                );
              } else {
                this.setTopInstruction(
                  dojo.string.substitute(
                    _("Waiting for ${defense_label} defense decisions."),
                    { defense_label: defenseLabel }
                  )
                );
              }
              if (!canRespond) break;
              this.addActionButton(
                "passDefense",
                _("Skip Defense"),
                "onPassDefenseClicked"
              );
            }
            break;

          case "faithWarDuel":
            if (
              this.hasCommittedDuelBelieverThisRound &&
              this.isCurrentPlayerActive() &&
              this.checkAction("playBelieverCard", true)
            ) {
              // Server says this player can commit now: clear stale local latch.
              this.hasCommittedDuelBelieverThisRound = false;
            }
            if (this.hasCommittedDuelBelieverThisRound) {
              this.setTopInstruction(
                _(
                  "You already committed your Believer. Waiting for confrontation to continue."
                )
              );
              dojo.removeClass("mybelievercards", "highlight_stock");
              break;
            }
            this.tryRestorePreferredDuelBelieverSelection("faithWarDuel");
            if (this.canCurrentPlayerUseZombieArmyFromGrave()) {
              const selectedZombie = this.getZombieGraveSelectionCard();
              const selectedText = selectedZombie
                ? " " +
                  dojo.string.substitute(
                    _(
                      "Selected graveyard Believer: ${believer_label}"
                    ),
                    {
                      believer_label: this.formatBelieverTypeLabel(
                        parseInt(selectedZombie.type || 0, 10)
                      ),
                    }
                  )
                : "";
              this.setTopInstruction(
                _(
                  "Choose 1 Believer from hand, or choose 1 from graveyard (Zombie Army), then click Confirm."
                ) + selectedText
              );
              this.addActionButton(
                "chooseZombieGraveBeliever",
                _("Choose from Graveyard"),
                "onChooseZombieGraveBelieverClicked"
              );
            } else {
              this.setTopInstruction(
                "You have been assigned to this war. Choose one Believer and click Confirm."
              );
            }
            this.addActionButton(
              "confirmBeliever",
              _("Confirm Believer for War"),
              "onConfirmBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
            break;

          case "martyrdomChooseBelievers":
            {
              const targetIdsFromArgs =
                this.getAoeCommitTargetIdsFromArgs(args);
              if (targetIdsFromArgs.length > 0) {
                this.currentAoeCommitTargetIds = targetIdsFromArgs;
              }
              this.syncAoeRepresentativeLabelsFromTargetIds(
                this.currentAoeCommitTargetIds
              );
              const canCommitBeliever =
                this.canCurrentPlayerCommitAoeBeliever(args);
              if (canCommitBeliever) {
                this.setTopInstruction(
                  this.getAoeCommitPromptText("martyrdom")
                );
                this.addActionButton(
                  "confirmMartyrdomBeliever",
                  _("Confirm Believer for Martyrdom"),
                  "onConfirmBelieverClicked"
                );
                dojo.addClass("mybelievercards", "highlight_stock");
              } else {
                dojo.removeClass("mybelievercards", "highlight_stock");
                this.setTopInstruction(
                  this.getAoeWaitingPromptText("martyrdom")
                );
              }
            }
            break;

          case "conspiracyChooseBelievers":
            {
              const targetIdsFromArgs =
                this.getAoeCommitTargetIdsFromArgs(args);
              if (targetIdsFromArgs.length > 0) {
                this.currentAoeCommitTargetIds = targetIdsFromArgs;
              }
              this.syncAoeRepresentativeLabelsFromTargetIds(
                this.currentAoeCommitTargetIds
              );
              const canCommitBeliever =
                this.canCurrentPlayerCommitAoeBeliever(args);
              if (canCommitBeliever) {
                this.setTopInstruction(
                  this.getAoeCommitPromptText("conspiracy")
                );
                this.addActionButton(
                  "confirmConspiracyBeliever",
                  _("Confirm Believer for Conspiracy"),
                  "onConfirmBelieverClicked"
                );
                dojo.addClass("mybelievercards", "highlight_stock");
              } else {
                dojo.removeClass("mybelievercards", "highlight_stock");
                this.setTopInstruction(
                  this.getAoeWaitingPromptText("conspiracy")
                );
              }
            }
            break;

          case "faithDebateDuel":
            {
              const debateArgs =
                args && args.args && typeof args.args === "object"
                  ? args.args
                  : args || {};
              if (
                this.hasCommittedDuelBelieverThisRound &&
                this.isCurrentPlayerActive() &&
                this.checkAction("playBelieverCard", true)
              ) {
                // Server says this player can commit now: clear stale local latch.
                this.hasCommittedDuelBelieverThisRound = false;
              }
              const myId = parseInt(this.player_id || 0, 10);
              const attackerRepId = parseInt(
                (debateArgs && debateArgs.attacker_rep_id) ||
                  (this.gamedatas &&
                    this.gamedatas.combat_context &&
                    this.gamedatas.combat_context.war_rep_attacker_id) ||
                  0,
                10
              );
              const defenderRepId = parseInt(
                (debateArgs && debateArgs.defender_rep_id) ||
                  (this.gamedatas &&
                    this.gamedatas.combat_context &&
                    this.gamedatas.combat_context.war_rep_defender_id) ||
                  0,
                10
              );
              const canStopByRole =
                this.canCurrentPlayerRequestFaithDebateStop(debateArgs);
              if (!this.hasCommittedDuelBelieverThisRound && canStopByRole) {
                this.addActionButton(
                  "stopFaithDebate",
                  _("Stop Faith Debate"),
                  "onStopFaithDebateClicked"
                );
              }
              const isDebateRepresentative =
                (myId > 0 && attackerRepId > 0 && myId === attackerRepId) ||
                (myId > 0 && defenderRepId > 0 && myId === defenderRepId);
              if (!isDebateRepresentative) {
                this.setTopInstruction(
                  _(
                    "Waiting for each chosen representative to choose a Believer."
                  )
                );
                dojo.removeClass("mybelievercards", "highlight_stock");
                break;
              }
              if (this.hasCommittedDuelBelieverThisRound) {
                this.setTopInstruction(
                  _(
                    "You already committed your Believer. Waiting for confrontation to continue."
                  )
                );
                dojo.removeClass("mybelievercards", "highlight_stock");
                break;
              }
              this.tryRestorePreferredDuelBelieverSelection("faithDebateDuel");
            }
            this.addActionButton(
              "confirmDebateBeliever",
              _("Confirm Believer for Faith Debate"),
              "onConfirmBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
            break;

          case "secretAllianceAttackerChoice":
            this.addActionButton(
              "confirmSecretAllianceOwnCard",
              _("Confirm Offered Action Card"),
              "onConfirmSecretAllianceOwnCardClicked"
            );
            this.setTopInstruction(
              _("Select one Action card from your hand to offer")
            );
            break;

          case "secretAllianceTargetChoice":
            this.addActionButton(
              "confirmSecretAllianceTargetCard",
              _("Confirm Exchange Card"),
              "onConfirmSecretAllianceTargetCardClicked"
            );
            this.setTopInstruction(
              _("Select one Action card from your hand to exchange")
            );
            break;

          case "prophetSkillPrompt":
            {
              const prophetArgs =
                args && args.args && typeof args.args === "object"
                  ? args.args
                  : args || {};
              const drawIndex = this.getSafeProphetDrawIndex(
                prophetArgs && prophetArgs.predict_target_index,
                1
              );
              const abilitySource = String(
                (prophetArgs && prophetArgs.ability_source) || "prophet"
              );
              if (abilitySource === "gate_truth_copy") {
                this.setTopInstruction(
                  dojo.string.substitute(
                    _(
                      "Gate of Truth copied The Prophet: predict draw #${draw_index} before Believer draw continues?"
                    ),
                    {
                      draw_index: drawIndex,
                    }
                  )
                );
              } else {
                this.setTopInstruction(
                  _(
                    "A player is drawing Believers. Use The Prophet to predict?"
                  )
                );
              }
            }
            this.addActionButton(
              "prophetEnableSkill",
              _("Use Prophet Skill"),
              "onProphetEnableSkillClicked"
            );
            this.addActionButton(
              "prophetSkipSkill",
              _("Skip This Time"),
              "onProphetSkipSkillClicked"
            );
            break;

          case "prophetGuess":
            {
              const prophetArgs =
                args && args.args && typeof args.args === "object"
                  ? args.args
                  : args || {};
              const drawIndex = this.getSafeProphetDrawIndex(
                prophetArgs && prophetArgs.predict_target_index,
                1
              );
              this.setTopInstruction(
                dojo.string.substitute(
                  _(
                    "Choose a Believer to predict draw #${draw_index}, or pass."
                  ),
                  {
                    draw_index: drawIndex,
                  }
                )
              );
            }
            for (let t = 1; t <= 5; t++) {
              this.addActionButton(
                "prophetGuessType_" + t,
                this.formatBelieverTypeLabel(t),
                function () {
                  this.onProphetGuessTypeClicked(t);
                }.bind(this)
              );
            }
            this.addActionButton(
              "prophetPassGuess",
              _("Do Not Guess"),
              "onProphetPassGuessClicked"
            );
            break;

          case "infoSpyReview":
            this.setTopInstruction(
              _("Review Info Spy result, then close it to continue your turn.")
            );
            this.addActionButton(
              "completeInfoSpy",
              _("Finish Info Spy"),
              "onCompleteInfoSpyClicked"
            );
            break;

          case "holyRebirthPrompt":
            {
              const holyArgs =
                args && args.args && typeof args.args === "object"
                  ? args.args
                  : args || {};
              const abilitySource = String(
                (holyArgs && holyArgs.ability_source) || "holy_rebirth"
              );
              if (abilitySource === "gate_truth_copy") {
                this.setTopInstruction(
                  _(
                    "Gate of Truth: copy Holy Rebirth and revive 3 Believers from graveyard now?"
                  )
                );
                this.addActionButton(
                  "holyRebirthUse",
                  _("Copy Holy Rebirth"),
                  "onHolyRebirthUseClicked"
                );
              } else {
                this.setTopInstruction(
                  _("Holy Rebirth: revive 3 Believers from graveyard now?")
                );
                this.addActionButton(
                  "holyRebirthUse",
                  _("Use Holy Rebirth"),
                  "onHolyRebirthUseClicked"
                );
              }
            }
            this.addActionButton(
              "holyRebirthSkip",
              _("Skip"),
              "onHolyRebirthSkipClicked"
            );
            break;

          case "reverseKarmaPrompt":
            this.setTopInstruction(
              _("Karma Reversed: invert this confrontation result order?")
            );
            this.addActionButton(
              "reverseKarmaUse",
              _("Use Karma Reversed"),
              "onReverseKarmaUseClicked"
            );
            this.addActionButton(
              "reverseKarmaSkip",
              _("Skip"),
              "onReverseKarmaSkipClicked"
            );
            break;

          case "faithDebateStopLeaderApproval":
            this.setTopInstruction(
              _(
                "Your representative asks to stop Faith Debate. Approve or reject."
              )
            );
            this.addActionButton(
              "approveFaithDebateStop",
              _("Approve"),
              "onApproveFaithDebateStopClicked"
            );
            this.addActionButton(
              "rejectFaithDebateStop",
              _("Reject"),
              "onRejectFaithDebateStopClicked"
            );
            break;

          case "gameEndSummary":
            this.setTopInstruction(
              _("Review the game-end summary, then click End Game.")
            );
            this.addActionButton(
              "confirmGameEndSummary",
              _("End Game"),
              "onConfirmGameEndSummaryClicked"
            );
            break;
        }
      }
    },

    ajaxAction: function (actionName, args, onSuccess) {
      const payload = Object.assign({}, args || {});
      const actionSig = actionName + ":" + JSON.stringify(payload);
      const now = Date.now();
      if (
        actionName === "playActionCard" &&
        now < (this.playActionDebounceUntil || 0)
      ) {
        return;
      }
      if (
        this.lastSubmittedActionSignature === actionSig &&
        now - this.lastSubmittedActionAt < 800
      ) {
        return;
      }
      if (actionName === "playActionCard") {
        this.playActionDebounceUntil = now + 1200;
      }
      this.lastSubmittedActionSignature = actionSig;
      this.lastSubmittedActionAt = now;
      const onAjaxError = function (error) {
        this.actionSubmissionInFlight = false;
        this.lastSubmittedActionSignature = "";
        this.lastSubmittedActionCardId = null;
        if (
          this.tryRecoverFromPlayActionHandMismatch(actionName, payload, error)
        ) {
          return;
        }
        if (actionName === "playActionCard") {
          this.playActionDebounceUntil = 0;
          if (
            this.pendingAction &&
            this.pendingAction.cardKey === "divine_inspire"
          ) {
            this.setDivineInspireSourceLocked(this.pendingAction.cardId, false);
            this.restoreHiddenPendingActionCard(this.pendingAction.cardId);
            if (
              this.pendingAction.tempArenaId &&
              dojo.byId(this.pendingAction.tempArenaId)
            ) {
              dojo.destroy(this.pendingAction.tempArenaId);
            }
            this.pendingAction = null;
            this.pendingFaithWarUseZombie = false;
          }
        }
        if (actionName === "completeInfoSpy") {
          this.infoSpyCloseInFlight = false;
        }
        this.syncActionSelectionModeToCurrentState();
        this.playerActionCards.unselectAll();
        this.playerBelieverCards.unselectAll();
        const stateName =
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.name) ||
          "";
        if (
          stateName === "confirmDefense" ||
          stateName === "martyrdomChooseBelievers" ||
          stateName === "conspiracyChooseBelievers" ||
          stateName === "faithWarDuel" ||
          stateName === "faithDebateDuel" ||
          stateName === "reverseKarmaPrompt"
        ) {
          if (stateName === "faithWarDuel") {
            this.ensureZombieGraveSelectionStillValid();
            this.closeZombieGravePickerModal();
          }
          this.onUpdateActionButtons(
            stateName,
            (this.gamedatas &&
              this.gamedatas.gamestate &&
              this.gamedatas.gamestate.args) ||
              {}
          );
        } else if (!this.pendingAction) {
          this.restoreHiddenPendingActionCard();
          this.restoreServerGameState();
        }
      }.bind(this);

      const performAction =
        this.bga &&
        this.bga.actions &&
        typeof this.bga.actions.performAction === "function"
          ? this.bga.actions.performAction.bind(this.bga.actions)
          : null;
      if (!performAction) {
        onAjaxError();
        this.showMessage(
          _("Action transport unavailable: performAction is missing."),
          "error"
        );
        return;
      }

      performAction(actionName, payload, {
        lock: true,
        checkAction: false,
        checkPossibleActions: false,
      })
        .then(
          function (result) {
            this.actionSubmissionInFlight = false;
            this.syncActionSelectionModeToCurrentState();
            if (onSuccess) onSuccess.call(this, result);
          }.bind(this)
        )
        .catch(
          function (error) {
            onAjaxError(error);
          }.bind(this)
        );
    },

    getPracticeAiPlayerIdMap: function () {
      const ids = this.gamedatas && this.gamedatas.practice_ai_player_ids;
      const map = {};
      (Array.isArray(ids) ? ids : []).forEach(function (pid) {
        map[String(pid)] = 1;
      });
      return map;
    },

    getPracticeAiPlayerRows: function () {
      const aiMap = this.getPracticeAiPlayerIdMap();
      const players = (this.gamedatas && this.gamedatas.players) || {};
      return Object.keys(players)
        .map(
          function (pid) {
            const player = players[pid] || {};
            return {
              seat: parseInt(player.player_no || 0, 10) || 0,
              player_id: parseInt(pid, 10),
              name: player.name || player.player_name || "Player",
              sect: this.getSectLabel(player.player_sect),
              me: String(pid) === String(this.player_id) ? "yes" : "",
              ai: aiMap[String(pid)] ? "on" : "",
            };
          }.bind(this)
        )
        .sort(function (a, b) {
          if (a.seat && b.seat && a.seat !== b.seat) return a.seat - b.seat;
          return a.player_id - b.player_id;
        })
        .map(function (row, idx) {
          return Object.assign({ index: idx + 1 }, row);
        });
    },

    printPracticeAiPlayers: function () {
      const rows = this.getPracticeAiPlayerRows();
      if (typeof console !== "undefined" && console.table) {
        console.table(rows);
      }
      return rows;
    },

    resolvePracticeAiConsoleTargetIds: function (target) {
      const rows = this.getPracticeAiPlayerRows();
      if (target === null || typeof target === "undefined") {
        return [];
      }
      if (Array.isArray(target)) {
        const seen = {};
        return target
          .flatMap(
            function (item) {
              return this.resolvePracticeAiConsoleTargetIds(item);
            }.bind(this)
          )
          .filter(function (pid) {
            const key = String(pid);
            if (seen[key]) return false;
            seen[key] = 1;
            return true;
          });
      }

      const text = String(target).trim();
      const lower = text.toLowerCase();
      if (lower === "all") {
        return rows.map(function (row) {
          return row.player_id;
        });
      }
      if (lower === "others" || lower === "other" || lower === "allbutme") {
        return rows
          .filter(
            function (row) {
              return String(row.player_id) !== String(this.player_id);
            }.bind(this)
          )
          .map(function (row) {
            return row.player_id;
          });
      }
      if (lower === "me" || lower === "self") {
        return rows
          .filter(
            function (row) {
              return String(row.player_id) === String(this.player_id);
            }.bind(this)
          )
          .map(function (row) {
            return row.player_id;
          });
      }

      const numeric = parseInt(text, 10);
      if (!isNaN(numeric) && String(numeric) === text) {
        const exact = rows.find(function (row) {
          return row.player_id === numeric;
        });
        if (exact) return [exact.player_id];
        const byIndex = rows.find(function (row) {
          return row.index === numeric;
        });
        if (byIndex) return [byIndex.player_id];
        const bySeat = rows.find(function (row) {
          return row.seat === numeric;
        });
        if (bySeat) return [bySeat.player_id];
      }

      return rows
        .filter(function (row) {
          return String(row.name || "").toLowerCase().indexOf(lower) !== -1;
        })
        .map(function (row) {
          return row.player_id;
        });
    },

    sendPracticeAiConsoleAction: function (actionName, args) {
      const payload = Object.assign({}, args || {});
      const performAction =
        this.bga &&
        this.bga.actions &&
        typeof this.bga.actions.performAction === "function"
          ? this.bga.actions.performAction.bind(this.bga.actions)
          : null;
      if (!performAction) {
        return Promise.reject(new Error("BGA action transport is unavailable."));
      }
      return performAction(actionName, payload, {
        lock: true,
        checkAction: false,
        checkPossibleActions: false,
      });
    },

    runPracticeAiConsoleActions: function (actions) {
      const rows = Array.isArray(actions) ? actions : [];
      if (!rows.length) {
        this.printPracticeAiPlayers();
        return Promise.resolve([]);
      }
      const results = [];
      let chain = Promise.resolve();
      rows.forEach(
        function (row) {
          chain = chain
            .then(
              function () {
                return this.sendPracticeAiConsoleAction(row.action, row.args);
              }.bind(this)
            )
            .then(
              function (result) {
                results.push(result);
                return result;
              }
            );
        }.bind(this)
      );
      return chain.then(
        function () {
          this.printPracticeAiPlayers();
          return results;
        }.bind(this)
      );
    },

    setPracticeAiByConsoleTarget: function (target, enabled) {
      const ids = this.resolvePracticeAiConsoleTargetIds(target);
      const actions = ids.map(function (pid) {
        return {
          action: "setPracticeAiPlayer",
          args: {
            player_id: pid,
            enabled: enabled ? 1 : 0,
          },
        };
      });
      return this.runPracticeAiConsoleActions(actions);
    },

    togglePracticeAiByConsoleTarget: function (target) {
      const ids = this.resolvePracticeAiConsoleTargetIds(target);
      const actions = ids.map(function (pid) {
        return {
          action: "togglePracticeAiPlayer",
          args: {
            player_id: pid,
          },
        };
      });
      return this.runPracticeAiConsoleActions(actions);
    },

    clearPracticeAiByConsole: function () {
      return this.runPracticeAiConsoleActions([
        { action: "clearPracticeAiPlayers", args: {} },
      ]);
    },

    installPracticeAiConsoleHelper: function () {
      if (typeof window === "undefined") return;
      const game = this;
      const helper = {
        players: function () {
          return game.printPracticeAiPlayers();
        },
        enable: function (target) {
          return game.setPracticeAiByConsoleTarget(target, true);
        },
        disable: function (target) {
          return game.setPracticeAiByConsoleTarget(target, false);
        },
        toggle: function (target) {
          return game.togglePracticeAiByConsoleTarget(target);
        },
        enableMe: function () {
          return game.setPracticeAiByConsoleTarget("me", true);
        },
        disableMe: function () {
          return game.setPracticeAiByConsoleTarget("me", false);
        },
        enableOthers: function () {
          return game.setPracticeAiByConsoleTarget("others", true);
        },
        disableOthers: function () {
          return game.setPracticeAiByConsoleTarget("others", false);
        },
        clear: function () {
          return game.clearPracticeAiByConsole();
        },
      };
      window.hofAi = helper;
      try {
        if (window.parent && window.parent !== window) {
          window.parent.hofAi = helper;
        }
      } catch (e) {}
      try {
        if (window.top && window.top !== window) {
          window.top.hofAi = helper;
        }
      } catch (e) {}
    },

    syncActionSelectionModeToCurrentState: function () {
      if (!this.playerActionCards || !this.playerActionCards.setSelectionMode) {
        return;
      }
      const stateName = String(this.getCurrentStateName() || "");
      const stateArgs =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args) ||
        {};
      const believerSelectionPhase = this.shouldBelieverHandBeReady(
        stateName,
        stateArgs
      );
      const noActionSlots =
        stateName === "playerTurn" &&
        this.isCurrentPlayerActive() &&
        !this.hasRemainingActionSlotsThisTurn();
      const canSelectActionCards = this.canSelectActionCardsInState(
        stateName,
        stateArgs
      );

      let mode = 0;
      if (stateName === "playerTurn") {
        mode = 1;
        if (
          this.isDiscardMode &&
          !believerSelectionPhase &&
          !noActionSlots
        ) {
          mode = 2;
        } else if (believerSelectionPhase || noActionSlots || !canSelectActionCards) {
          mode = 0;
        }
      } else {
        if (stateName === "discardingActionCard") {
          mode = !believerSelectionPhase && canSelectActionCards ? 2 : 0;
        } else {
          mode = !believerSelectionPhase && canSelectActionCards ? 1 : 0;
        }
      }

      if (
        stateName === "secretAllianceAttackerChoice" ||
        stateName === "secretAllianceTargetChoice"
      ) {
        mode = believerSelectionPhase ? 0 : 1;
      }

      this.playerActionCards.setSelectionMode(mode);
      this.refreshHandCardReadinessVisuals(stateName, stateArgs);
    },

    clearPendingActionButtons: function () {
      if (typeof this.clearActionButtons === "function") {
        this.clearActionButtons();
        return;
      }

      const actionBar = dojo.byId("generalactions");
      if (actionBar) {
        actionBar.innerHTML = "";
      }
    },

    rerenderCurrentActionButtons: function () {
      const stateName = this.getCurrentStateName();
      const stateArgs =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args) ||
        {};
      this.onUpdateActionButtons(stateName, stateArgs);
    },

    requestClientConfirmation: function (options) {
      const opts = options || {};
      this.pendingClientConfirmation = {
        stateName: this.getCurrentStateName(),
        message: String(opts.message || ""),
        confirmLabel: opts.confirmLabel || _("Confirm"),
        cancelLabel: opts.cancelLabel || _("Cancel"),
        onConfirm:
          typeof opts.onConfirm === "function" ? opts.onConfirm : null,
        onCancel: typeof opts.onCancel === "function" ? opts.onCancel : null,
      };
      this.renderClientConfirmationButtons();
    },

    renderClientConfirmationButtons: function () {
      const pending = this.pendingClientConfirmation;
      if (!pending) return false;

      this.clearPendingActionButtons();
      if (pending.message) {
        this.setTopInstruction(pending.message);
      }
      this.addActionButton(
        "clientConfirmProceed",
        pending.confirmLabel || _("Confirm"),
        "onConfirmClientConfirmationClicked",
        null,
        "blue"
      );
      this.addActionButton(
        "clientConfirmCancel",
        pending.cancelLabel || _("Cancel"),
        "onCancelClientConfirmationClicked",
        null,
        "red"
      );
      return true;
    },

    onConfirmClientConfirmationClicked: function () {
      const pending = this.pendingClientConfirmation;
      if (!pending || this.actionSubmissionInFlight) return;
      this.pendingClientConfirmation = null;
      if (pending.onConfirm) {
        pending.onConfirm.call(this);
      } else {
        this.rerenderCurrentActionButtons();
      }
    },

    onCancelClientConfirmationClicked: function () {
      const pending = this.pendingClientConfirmation;
      if (!pending || this.actionSubmissionInFlight) return;
      this.pendingClientConfirmation = null;
      if (pending.onCancel) {
        pending.onCancel.call(this);
      } else {
        this.rerenderCurrentActionButtons();
      }
    },

    getGeneralActionButtonPriority: function (node) {
      const id = String((node && node.id) || "").toLowerCase();
      const text = String((node && node.textContent) || "").toLowerCase();
      // Unified order across all states:
      // 1) choose/select, 2) confirm/execute, 3) cancel/skip.
      const isCancelLike =
        /(cancel|skip|pass|reject|refuse|decline|no|close|back|stop)/.test(
          id
        ) ||
        /(cancel|skip|pass|reject|refuse|decline|no|close|back|stop)/.test(
          text
        );
      if (isCancelLike) return 2;
      const isSelectLike =
        /(^choose|^select|^pick|^target|choose|select|pick|target|type_|wanderersteal_|choosezombiegravebeliever|chooserep_)/.test(
          id
        ) ||
        /(choose|select|pick|target)/.test(text);
      if (isSelectLike) return 0;
      const isConfirmLike =
        /(confirm|use|accept|approve|yes|play|give|send|discard|submit|continue)/.test(
          id
        ) ||
        /(confirm|use|accept|approve|yes|play|give|send|discard|submit|continue)/.test(
          text
        );
      if (isConfirmLike) return 1;
      return 1;
    },

    reorderGeneralActionButtons: function () {
      const root = dojo.byId("generalactions");
      if (!root) return;
      const nodes = Array.prototype.slice.call(root.children || []).filter(
        function (node) {
          return dojo.hasClass(node, "bgabutton");
        }
      );
      if (nodes.length <= 1) return;
      const ranked = nodes.map(
        function (node, index) {
          return {
            node: node,
            index: index,
            priority: this.getGeneralActionButtonPriority(node),
          };
        }.bind(this)
      );
      ranked.sort(function (a, b) {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.index - b.index;
      });
      ranked.forEach(function (row) {
        if (row.node && row.node.parentNode === root) {
          root.appendChild(row.node);
        }
      });
    },

    updateGraveyardCount: function (delta, absoluteValue) {
      if (typeof absoluteValue !== "undefined" && absoluteValue !== null) {
        this.graveyardActualCount = Math.max(
          0,
          parseInt(absoluteValue || 0, 10) || 0
        );
        this.syncGraveyardCardsFromCount();
        return;
      }
      const current = Math.max(
        0,
        parseInt(this.graveyardActualCount || 0, 10) || 0
      );
      this.graveyardActualCount = Math.max(
        0,
        current + (parseInt(delta || 0, 10) || 0)
      );
      this.syncGraveyardCardsFromCount();
    },

    sanitizeFaithWarBoardDom: function () {
      const boards = dojo.query("#faith_war_board");
      if (!boards || !boards.length) return null;
      const arena = dojo.byId("central_arena");
      let primary = null;
      if (arena) {
        for (let i = 0; i < boards.length; i++) {
          const node = boards[i];
          if (node && arena.contains(node)) {
            primary = node;
            break;
          }
        }
      }
      if (!primary) {
        primary = boards[boards.length - 1] || boards[0] || null;
      }
      for (let i = 0; i < boards.length; i++) {
        const node = boards[i];
        if (node && node !== primary) {
          dojo.destroy(node);
        }
      }
      if (arena && primary && primary.parentNode !== arena) {
        dojo.place(primary, arena, "last");
      }
      return primary;
    },

    getFaithWarBoardNode: function () {
      return this.sanitizeFaithWarBoardDom() || dojo.byId("faith_war_board");
    },

    getFaithWarSlotNodes: function () {
      const board = this.getFaithWarBoardNode();
      if (!board) {
        return { left: null, right: null };
      }
      const left =
        dojo.query("#faithwar_slot_left", board)[0] || dojo.byId("faithwar_slot_left");
      const right =
        dojo.query("#faithwar_slot_right", board)[0] || dojo.byId("faithwar_slot_right");
      return { left: left || null, right: right || null };
    },

    getFaithWarPlayerSlotNode: function (playerId) {
      const pid = String(playerId || "");
      if (!pid) return null;
      const board = this.getFaithWarBoardNode();
      if (board) {
        const scoped = dojo.query('[id="faithwar_slot_' + pid + '"]', board)[0];
        if (scoped) return scoped;
      }
      return dojo.byId("faithwar_slot_" + pid);
    },

    ensureFaithWarBoard: function () {
      const arena = dojo.byId("central_arena");
      if (!arena) return;
      this.clearProphetPendingPredictionVisual();
      const existingBoard = this.getFaithWarBoardNode();
      if (!existingBoard) {
        dojo.place(
          '<div id="faith_war_board" class="faith-war-board">' +
            '<div id="faithwar_action_panel" class="faith-war-action-panel">' +
            '<div id="faithwar_action_owner" class="faith-war-action-owner"></div>' +
            '<div id="faithwar_action_slot"></div>' +
            '<div id="faithwar_action_text" class="faith-war-action-label"></div>' +
            "</div>" +
            '<div class="faith-war-main">' +
            '<div id="faithwar_slot_left" class="faith-war-slot"></div>' +
            '<div class="faith-war-vs">VS</div>' +
            '<div id="faithwar_slot_right" class="faith-war-slot"></div>' +
            "</div>" +
            '<div id="faithwar_log_panel" class="faith-war-log-panel">' +
            '<div id="faithwar_log_title" class="faith-war-log-title">confrontation log</div>' +
            '<div id="faithwar_log_list" class="faith-war-log-list"></div>' +
            '<button type="button" id="faithwar_log_more" class="bgabutton bgabutton_white faith-war-log-more is-hidden">View all confrontation rounds in this war</button>' +
            "</div>" +
          "</div>",
          arena
        );
      } else if (existingBoard.parentNode !== arena) {
        dojo.place(existingBoard, arena, "last");
      }
      this.ensureFaithWarLogModal();
      const moreBtn = dojo.byId("faithwar_log_more");
      if (moreBtn) {
        moreBtn.onclick = function (evt) {
          if (evt) dojo.stopEvent(evt);
          this.openFaithWarLogModal();
          return false;
        }.bind(this);
      }
      this.renderFaithWarLog();
    },

    ensureFaithWarLogModal: function () {
      if (dojo.byId("faithwar_log_modal_overlay")) return;
      dojo.place(
        '<div id="faithwar_log_modal_overlay" class="spy-modal-overlay faith-war-log-overlay is-hidden">' +
          '<div class="spy-modal faith-war-log-modal">' +
          '<div class="spy-modal-head faith-war-log-modal-header">' +
          '<span id="faithwar_log_modal_title" class="spy-modal-title">All confrontation rounds in this war</span>' +
          '<button type="button" id="faithwar_log_close" class="bgabutton bgabutton_white">Close</button>' +
          "</div>" +
          '<div id="faithwar_log_modal_list" class="spy-modal-section faith-war-log-modal-list"></div>' +
          "</div>" +
          "</div>",
        "game_play_area"
      );
      dojo.connect(
        dojo.byId("faithwar_log_close"),
        "onclick",
        this,
        function () {
          this.closeFaithWarLogModal();
        }
      );
      dojo.connect(
        dojo.byId("faithwar_log_modal_overlay"),
        "onclick",
        this,
        function (evt) {
          if (
            evt &&
            evt.target &&
            evt.target.id === "faithwar_log_modal_overlay"
          ) {
            this.closeFaithWarLogModal();
          }
        }
      );
    },

    closeFaithWarLogModal: function () {
      const overlay = dojo.byId("faithwar_log_modal_overlay");
      if (overlay) {
        dojo.addClass(overlay, "is-hidden");
      }
    },

    applyFaithWarLogTooltips: function (rootNode) {
      if (!rootNode) return;
      dojo.query(".faith-war-log-mini-card[data-index]", rootNode).forEach(
        function (node) {
          const type = parseInt(node.getAttribute("data-index") || "0", 10);
          if (type > 0) {
            const opponentName = node.getAttribute("data-opponent-name") || "";
            const duelLabel = _("confrontation");
            const extraRows = opponentName
              ? [{ label: duelLabel, value: opponentName }]
              : [];
            this.attachBelieverTooltip(node, type, { extraRows: extraRows });
          }
        }.bind(this)
      );
    },

    setDuelLogMode: function (mode) {
      this.duelLogMode = mode === "debate" ? "debate" : "war";
      const isDebate = this.duelLogMode === "debate";
      const title = dojo.byId("faithwar_log_title");
      if (title)
        title.innerHTML = isDebate
          ? _("Debate confrontation log")
          : _("War confrontation log");
      const modalTitle = dojo.byId("faithwar_log_modal_title");
      if (modalTitle) {
        modalTitle.innerHTML = isDebate
          ? _("All confrontation rounds in this debate")
          : _("All confrontation rounds in this war");
      }
      const moreBtn = dojo.byId("faithwar_log_more");
      if (moreBtn && !dojo.hasClass(moreBtn, "is-hidden")) {
        moreBtn.innerHTML = isDebate
          ? _("View all confrontation rounds in this debate")
          : _("View all confrontation rounds in this war");
      }
    },

    isReplaySessionActive: function () {
      try {
        const replayFrom =
          typeof g_replayFrom !== "undefined"
            ? parseInt(g_replayFrom || 0, 10)
            : 0;
        if (replayFrom > 0) return true;
      } catch (e) {}

      try {
        if (typeof g_archive_mode !== "undefined") {
          const raw = g_archive_mode;
          if (
            raw === true ||
            raw === 1 ||
            raw === "1" ||
            String(raw).toLowerCase() === "true"
          ) {
            return true;
          }
        }
      } catch (e) {}

      return false;
    },

    openFaithWarLogModal: function () {
      const overlay = dojo.byId("faithwar_log_modal_overlay");
      const list = dojo.byId("faithwar_log_modal_list");
      if (!overlay || !list) return;
      list.innerHTML = this.faithWarLogEntries
        .map(function (entry) {
          return `<div class="faith-war-log-row">${entry}</div>`;
        })
        .join("");
      this.applyFaithWarLogTooltips(list);
      dojo.removeClass(overlay, "is-hidden");
    },

    getFaithWarLogStorageKey: function () {
      const tableId =
        parseInt(
          this.table_id ||
            (this.gamedatas && this.gamedatas.table_id) ||
            0,
          10
        ) || 0;
      const playerId = parseInt(this.player_id || 0, 10) || 0;
      return "hof_duel_log_v1_t" + tableId + "_p" + playerId;
    },

    canUseFaithWarLogStorage: function () {
      try {
        return typeof window !== "undefined" && !!window.localStorage;
      } catch (e) {
        return false;
      }
    },

    clearFaithWarLogStorageSnapshot: function () {
      if (!this.canUseFaithWarLogStorage()) return;
      try {
        window.localStorage.removeItem(this.getFaithWarLogStorageKey());
      } catch (e) {}
    },

    persistFaithWarLogStorageSnapshot: function () {
      if (!this.canUseFaithWarLogStorage()) return;
      if (this.isReplaySessionActive()) return;
      try {
        const entries = Array.isArray(this.faithWarLogEntries)
          ? this.faithWarLogEntries.filter(function (row) {
              return typeof row === "string" && row.length > 0;
            })
          : [];
        const roundNo = Math.max(
          0,
          parseInt(this.faithWarRoundNo || 0, 10) || 0
        );
        if (!entries.length && roundNo <= 0) {
          this.clearFaithWarLogStorageSnapshot();
          return;
        }
        const payload = {
          v: 1,
          mode: this.duelLogMode === "debate" ? "debate" : "war",
          round_no: roundNo,
          entries: entries,
          ts: Date.now(),
        };
        window.localStorage.setItem(
          this.getFaithWarLogStorageKey(),
          JSON.stringify(payload)
        );
      } catch (e) {}
    },

    restoreFaithWarLogFromStorageForSnapshot: function (gamedatas) {
      if (!this.canUseFaithWarLogStorage()) return;
      if (this.isReplaySessionActive()) return;
      const ctx = (gamedatas && gamedatas.combat_context) || {};
      const warType = parseInt(ctx.war_type || 0, 10);
      const expectedMode = warType === 7 ? "debate" : "war";
      const isDuelActive = [2, 7, 10, 12].indexOf(warType) !== -1;
      if (!isDuelActive) {
        this.clearFaithWarLogStorageSnapshot();
        return;
      }
      let payload = null;
      try {
        const raw = window.localStorage.getItem(this.getFaithWarLogStorageKey());
        if (!raw) return;
        payload = JSON.parse(raw);
      } catch (e) {
        return;
      }
      if (!payload || !Array.isArray(payload.entries)) return;
      const savedMode = payload.mode === "debate" ? "debate" : "war";
      if (savedMode !== expectedMode) {
        this.clearFaithWarLogStorageSnapshot();
        return;
      }
      if (!dojo.byId("faith_war_board")) {
        this.ensureFaithWarBoard();
      }
      this.duelLogMode = expectedMode;
      this.faithWarRoundNo = Math.max(
        0,
        parseInt(payload.round_no || 0, 10) || 0
      );
      this.faithWarLogEntries = payload.entries
        .filter(function (row) {
          return typeof row === "string" && row.length > 0;
        })
        .slice(-200);
      this.setDuelLogMode(expectedMode);
      this.renderFaithWarLog();
    },

    resetFaithWarLog: function () {
      this.faithWarLogEntries = [];
      this.faithWarRoundNo = 0;
      this.renderFaithWarLog();
      this.closeFaithWarLogModal();
      this.persistFaithWarLogStorageSnapshot();
    },

    escapeHtmlAttr: function (value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    getFaithWarLogMiniCardHtml: function (cardType, stateClass, meta) {
      if (!cardType)
        return '<span class="faith-war-log-mini-card mini-empty">?</span>';
      const extra = stateClass ? " " + stateClass : "";
      const safeOpponent = this.escapeHtmlAttr(meta && meta.opponentName);
      const safeMode = this.escapeHtmlAttr((meta && meta.duelMode) || "war");
      return `<span class="card card-believer faith-war-log-mini-card${extra}" data-index="${cardType}" data-opponent-name="${safeOpponent}" data-duel-mode="${safeMode}"></span>`;
    },

    pushFaithWarLogEntry: function (args) {
      if (!args) return;
      let attackerState = "";
      let defenderState = "";
      if (args.result_type === "attacker") {
        attackerState = "mini-winner";
        defenderState = "mini-loser";
      } else if (args.result_type === "defender") {
        attackerState = "mini-loser";
        defenderState = "mini-winner";
      } else {
        attackerState = "mini-loser";
        defenderState = "mini-loser";
      }
      const attackerMini = this.getFaithWarLogMiniCardHtml(
        args.card_a ? args.card_a.type : null,
        attackerState,
        {
          opponentName: args.defender_name || _("Defender"),
          duelMode: this.duelLogMode || "war",
        }
      );
      const defenderMini = this.getFaithWarLogMiniCardHtml(
        args.card_b ? args.card_b.type : null,
        defenderState,
        {
          opponentName: args.attacker_name || _("Attacker"),
          duelMode: this.duelLogMode || "war",
        }
      );
      let resultText = "draw";
      if (args.result_type === "attacker") resultText = "win";
      if (args.result_type === "defender") resultText = "lose";
      const bonusText = args.result_bonus ? " (bonus)" : "";
      const roundNo =
        this.faithWarRoundNo || this.faithWarLogEntries.length + 1;
      const row =
        `<span class="round-no">${roundNo}.</span> ` +
        `<span class="pname">${args.attacker_name}</span> ` +
        attackerMini +
        ` <span class="result ${resultText}">${resultText}${bonusText}</span> ` +
        `<span class="pname">${args.defender_name}</span> ` +
        defenderMini;
      this.faithWarLogEntries.push(row);
      this.renderFaithWarLog();
      this.persistFaithWarLogStorageSnapshot();
    },

    markLatestFaithWarLogBonus: function () {
      if (!this.faithWarLogEntries.length) return;
      const idx = this.faithWarLogEntries.length - 1;
      const row = this.faithWarLogEntries[idx];
      if (row.indexOf("(bonus)") >= 0) return;
      const winToken = 'class="result win">win';
      const loseToken = 'class="result lose">lose';
      if (row.indexOf(winToken) >= 0) {
        this.faithWarLogEntries[idx] = row.replace(
          winToken,
          'class="result win">win (bonus)'
        );
      } else if (row.indexOf(loseToken) >= 0) {
        this.faithWarLogEntries[idx] = row.replace(
          loseToken,
          'class="result lose">lose (bonus)'
        );
      } else {
        return;
      }
      this.renderFaithWarLog();
      this.persistFaithWarLogStorageSnapshot();
    },

    renderFaithWarLog: function () {
      const list = dojo.byId("faithwar_log_list");
      const moreBtn = dojo.byId("faithwar_log_more");
      if (!list) return;
      const maxVisible = 5;
      const recent = this.faithWarLogEntries.slice(-maxVisible);
      list.innerHTML = recent
        .map(function (entry) {
          return `<div class="faith-war-log-row">${entry}</div>`;
        })
        .join("");
      this.applyFaithWarLogTooltips(list);
      if (moreBtn) {
        if (this.faithWarLogEntries.length > 0) {
          moreBtn.innerHTML =
            this.duelLogMode === "debate"
              ? _("View all confrontation rounds in this debate")
              : _("View all confrontation rounds in this war");
          dojo.removeClass(moreBtn, "is-hidden");
        } else {
          dojo.addClass(moreBtn, "is-hidden");
        }
      }
    },

    clearFaithWarRoundCards: function (forceNow) {
      const force = !!forceNow;
      if (this.pendingFaithWarRoundClearTimeout) {
        clearTimeout(this.pendingFaithWarRoundClearTimeout);
        this.pendingFaithWarRoundClearTimeout = null;
      }
      const nowTs = Date.now();
      const minVisibleMs = Math.max(
        0,
        parseInt(this.minDuelRevealDisplayMs || 0, 10)
      );
      const elapsedSinceReveal =
        this.lastDuelRevealAt > 0 ? nowTs - this.lastDuelRevealAt : minVisibleMs;
      const minVisibleWaitMs =
        !force && minVisibleMs > 0 && elapsedSinceReveal < minVisibleMs
          ? Math.max(10, minVisibleMs - elapsedSinceReveal)
          : 0;
      const revealGateWaitMs =
        typeof this.getCombatRevealGateDelayMs === "function"
          ? Math.max(0, parseInt(this.getCombatRevealGateDelayMs() || 0, 10))
          : 0;
      const waitMs = Math.max(minVisibleWaitMs, revealGateWaitMs);
      if (waitMs > 0) {
        this.pendingFaithWarRoundClearTimeout = setTimeout(
          function () {
            this.pendingFaithWarRoundClearTimeout = null;
            this.clearFaithWarRoundCards(true);
          }.bind(this),
          waitMs
        );
        return;
      }
      const slots = this.getFaithWarSlotNodes();
      const left = slots.left;
      const right = slots.right;
      if (left) left.innerHTML = "";
      if (right) right.innerHTML = "";
      this.currentDuelLeftId = null;
      this.currentDuelRightId = null;
    },

    getDuelRoundSetupDelayMs: function () {
      const nowTs = Date.now();
      const minVisibleMs = Math.max(
        0,
        parseInt(this.minDuelRevealDisplayMs || 0, 10)
      );
      const elapsedSinceReveal =
        this.lastDuelRevealAt > 0 ? nowTs - this.lastDuelRevealAt : minVisibleMs;
      const minVisibleWaitMs =
        minVisibleMs > 0 && elapsedSinceReveal < minVisibleMs
          ? Math.max(0, minVisibleMs - elapsedSinceReveal)
          : 0;
      const revealGateWaitMs =
        typeof this.getCombatRevealGateDelayMs === "function"
          ? Math.max(0, parseInt(this.getCombatRevealGateDelayMs() || 0, 10))
          : 0;
      return Math.max(minVisibleWaitMs, revealGateWaitMs);
    },

    setDuelParticipants: function (
      leftPlayerId,
      rightPlayerId,
      leftName,
      rightName
    ) {
      this.ensureFaithWarBoard();
      this.currentDuelLeftId = String(leftPlayerId);
      this.currentDuelRightId = String(rightPlayerId);
      const slots = this.getFaithWarSlotNodes();
      const leftSlot = slots.left;
      const rightSlot = slots.right;
      if (leftSlot) leftSlot.innerHTML = "";
      if (rightSlot) rightSlot.innerHTML = "";

      const renderSlot = function (slot, pid, pname) {
        if (!slot) return;
        dojo.place(
          '<div id="faithwar_slot_' +
            pid +
            '" class="faith-war-player-card combat-result-item">' +
            '<div class="faith-war-owner combat-owner">' +
            this.getCombatOwnerLabelHtml(pid, pname, {
              includeSect: false,
              sectClass: "faith-war-sect-name",
              playerClass: "faith-war-player-name",
            }) +
            "</div>" +
            '<div class="card card-back-believer faith-war-card combat-result-card facedown"></div>' +
            '<div class="faith-war-card-label combat-result-label">?</div>' +
            "</div>",
          slot
        );
      }.bind(this);

      renderSlot(leftSlot, leftPlayerId, leftName);
      renderSlot(rightSlot, rightPlayerId, rightName);
    },

    normalizeReverseKarmaStackOwnerIds: function (ownerIds) {
      const rows = Array.isArray(ownerIds) ? ownerIds : [];
      const seen = {};
      const normalized = [];
      rows.forEach(function (value) {
        const pid = parseInt(value || 0, 10);
        if (pid <= 0 || seen[String(pid)]) return;
        seen[String(pid)] = 1;
        normalized.push(pid);
      });
      return normalized.slice(0, 2);
    },

    getReverseKarmaStackSkillTypeByOwner: function (ownerId) {
      const pid = String(parseInt(ownerId || 0, 10));
      if (!pid || pid === "0") return 16;
      const playerSkill =
        (this.gamedatas &&
          this.gamedatas.player_skills &&
          this.gamedatas.player_skills[pid]) ||
        null;
      const cardSkillType = parseInt(
        (playerSkill && playerSkill.type) || 0,
        10
      );
      if (cardSkillType === 9 || cardSkillType === 16) {
        return cardSkillType;
      }
      const ownerState = this.getEffectiveSkillStateForPanel(pid);
      const stateSkillType = parseInt(
        (ownerState && ownerState.skill_type) || 0,
        10
      );
      if (stateSkillType === 9 || stateSkillType === 16) {
        return stateSkillType;
      }
      return 16;
    },

    setReverseKarmaContext: function (active, ownerId, stackOwnerIds) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      const ctx = this.gamedatas.combat_context;
      const activeFlag = parseInt(active || 0, 10) === 1 ? 1 : 0;
      const owner = activeFlag ? parseInt(ownerId || 0, 10) : 0;
      ctx.reverse_karma_active = activeFlag;
      ctx.reverse_karma_owner_id = owner;
      ctx.war_reverse_karma_active = activeFlag;
      ctx.war_reverse_karma_owner_id = owner;

      let normalizedStack = [];
      if (typeof stackOwnerIds !== "undefined") {
        normalizedStack =
          this.normalizeReverseKarmaStackOwnerIds(stackOwnerIds);
      } else if (activeFlag === 0 && owner === 0) {
        normalizedStack = [];
      } else {
        normalizedStack = this.normalizeReverseKarmaStackOwnerIds(
          ctx.reverse_karma_stack_owner_ids ||
            ctx.war_reverse_karma_stack_owner_ids ||
            []
        );
      }
      if (!normalizedStack.length && activeFlag === 1 && owner > 0) {
        normalizedStack = [owner];
      }
      ctx.reverse_karma_stack_owner_ids = normalizedStack;
      ctx.war_reverse_karma_stack_owner_ids = normalizedStack;
    },

    isReverseKarmaCombatTypeByWarType: function (warType) {
      const wt = parseInt(warType || 0, 10);
      return [2, 3, 6, 7].indexOf(wt) !== -1;
    },

    getCombatSkillStackSpecs: function (cardType) {
      const key = String(cardType || "");
      const ctx = (this.gamedatas && this.gamedatas.combat_context) || {};
      const warType = parseInt(ctx.war_type || 0, 10);
      const specs = [];

      if (key === "faith_war") {
        const zombieOwnerId = parseInt(ctx.war_zombie_owner_id || 0, 10);
        if (zombieOwnerId > 0) {
          specs.push({ skillType: 10, ownerId: zombieOwnerId });
        }
      }

      const supportsReverseStack =
        this.isReverseKarmaCombatTypeByWarType(warType) &&
        ["faith_war", "faith_debate", "martyrdom", "conspiracy"].indexOf(
          key
        ) !== -1;
      const reverseStackOwnerIds = this.normalizeReverseKarmaStackOwnerIds(
        ctx.reverse_karma_stack_owner_ids ||
          ctx.war_reverse_karma_stack_owner_ids ||
          []
      );
      if (supportsReverseStack && reverseStackOwnerIds.length > 0) {
        reverseStackOwnerIds.forEach(
          function (ownerId) {
            const skillType =
              this.getReverseKarmaStackSkillTypeByOwner(ownerId);
            specs.push({ skillType: skillType, ownerId: ownerId });
          }.bind(this)
        );
      } else {
        const reverseActive =
          parseInt(
            ctx.reverse_karma_active || ctx.war_reverse_karma_active || 0,
            10
          ) === 1;
        const reverseOwnerId = parseInt(
          ctx.reverse_karma_owner_id || ctx.war_reverse_karma_owner_id || 0,
          10
        );
        if (supportsReverseStack && reverseActive && reverseOwnerId > 0) {
          specs.push({
            skillType:
              this.getReverseKarmaStackSkillTypeByOwner(reverseOwnerId),
            ownerId: reverseOwnerId,
          });
        }
      }

      return specs;
    },

    getCombatReverseStackStatusMeta: function (stackSpecs) {
      const rows = Array.isArray(stackSpecs) ? stackSpecs : [];
      const reverseRows = rows.filter(function (row) {
        const t = parseInt((row && row.skillType) || 0, 10);
        return t === 9 || t === 16;
      });
      const hasKarma = reverseRows.some(function (row) {
        return parseInt((row && row.skillType) || 0, 10) === 16;
      });
      const hasGate = reverseRows.some(function (row) {
        return parseInt((row && row.skillType) || 0, 10) === 9;
      });
      const ctx = (this.gamedatas && this.gamedatas.combat_context) || {};
      const reverseActive =
        parseInt(
          ctx.reverse_karma_active || ctx.war_reverse_karma_active || 0,
          10
        ) === 1;
      return {
        hasKarma: hasKarma,
        hasGate: hasGate,
        reverseActive: reverseActive,
        reverseCount: reverseRows.length,
      };
    },

    buildCombatStackSkillTooltipState: function (spec, stackSpecs, ownerState) {
      const skillType = parseInt((spec && spec.skillType) || 0, 10);
      if (!(skillType > 0)) return ownerState || null;
      const meta = this.getCombatReverseStackStatusMeta(stackSpecs);
      const state = ownerState
        ? Object.assign({}, ownerState)
        : { skill_type: skillType };

      if (skillType === 9) {
        const copiedType = parseInt(
          state.gate_truth_copied_skill_type || 0,
          10
        );
        // Gate card shown in reverse stack should explicitly expose copied Karma
        // so players can read copied-name/effect directly from the stack tooltip.
        if (copiedType <= 0) {
          state.gate_truth_copied_skill_type = 16;
        }
      }

      let statusNote = "";
      if (skillType === 16) {
        if (meta.hasGate && !meta.reverseActive) {
          statusNote = _(
            "Current confrontation has been restored to normal by Gate of Truth."
          );
        } else if (meta.reverseActive) {
          statusNote = _("Current confrontation outcome is reversed.");
        }
      } else if (skillType === 9) {
        if (meta.hasKarma && !meta.reverseActive) {
          statusNote = _("Karma Reversed effect has been canceled.");
        } else if (meta.reverseActive) {
          statusNote = _("Current confrontation outcome is reversed.");
        }
      }
      if (statusNote) {
        state.combat_reverse_status_note = statusNote;
      }
      return state;
    },

    renderCombatActionStack: function (
      slotNode,
      cardType,
      mainCardClass,
      mainCardId
    ) {
      if (!slotNode) return null;
      const spriteOffset = this.getActionCardSpriteIndex(cardType);
      const stackSpecs = this.getCombatSkillStackSpecs(cardType);
      const mainId = mainCardId ? ` id="${mainCardId}"` : "";
      const stackHtml =
        '<div class="combat-action-stack' +
        (stackSpecs.length > 0 ? " has-skill-stack" : "") +
        '">' +
        `<div${mainId} class="card card-action table_card_item ${mainCardClass} combat-action-primary" data-index="${spriteOffset}"></div>` +
        stackSpecs
          .map(function (spec, idx) {
            return `<div class="card card-skill combat-action-skill-card" data-index="${parseInt(
              spec.skillType || 0,
              10
            )}" data-stack-index="${idx}" data-skill-owner-id="${parseInt(spec.ownerId || 0, 10)}" data-skill-type="${parseInt(spec.skillType || 0, 10)}"></div>`;
          })
          .join("") +
        "</div>";
      slotNode.innerHTML = stackHtml;
      slotNode.setAttribute(
        "data-skill-stack-count",
        String(stackSpecs.length)
      );
      const mainNode =
        dojo.query(".combat-action-primary", slotNode)[0] ||
        dojo.query("." + mainCardClass.split(" ").join("."), slotNode)[0];
      if (mainNode) {
        this.attachActionCardTooltip(mainNode, cardType);
      }
      dojo.query(".combat-action-skill-card", slotNode).forEach(
        function (node, idx) {
          const skillType = parseInt(
            node.getAttribute("data-skill-type") || "0",
            10
          );
          const ownerId = String(
            node.getAttribute("data-skill-owner-id") || ""
          );
          const ownerState = this.getEffectiveSkillStateForPanel(ownerId);
          const spec = stackSpecs[idx] || { skillType: skillType, ownerId: 0 };
          const tipState = this.buildCombatStackSkillTooltipState(
            spec,
            stackSpecs,
            ownerState
          );
          this.attachSkillTooltip(node, skillType, tipState);
        }.bind(this)
      );
      return mainNode || null;
    },

    syncAoeActionSlotSpacing: function () {
      const row = dojo.byId("aoe_left_cards_row");
      const actionSlot = dojo.byId("aoe_action_card_slot");
      if (!row || !actionSlot) return;
      const stackCount = parseInt(
        actionSlot.getAttribute("data-skill-stack-count") || "0",
        10
      );
      if (stackCount > 0) {
        dojo.addClass(row, "has-skill-stack");
      } else {
        dojo.removeClass(row, "has-skill-stack");
      }
    },

    refreshCombatActionStacks: function () {
      const warSlot = dojo.byId("faithwar_action_slot");
      if (warSlot && this.currentFaithWarActionCardType) {
        this.renderCombatActionStack(
          warSlot,
          this.currentFaithWarActionCardType,
          "faith-war-action-card",
          ""
        );
      }

      const aoeSlot = dojo.byId("aoe_action_card_slot");
      if (aoeSlot && this.currentAoeCombatType) {
        let centerWrap = dojo.byId("current_center_action_card");
        if (!centerWrap) {
          aoeSlot.innerHTML = `<div id="current_center_action_card" data-card-type="${
            this.currentAoeCombatType
          }" data-card-id="${
            this.currentAoeActionCardId || ""
          }" class="center-action-wrap aoe-action-wrap"></div>`;
          centerWrap = dojo.byId("current_center_action_card");
        }
        this.renderCombatActionStack(
          centerWrap,
          this.currentAoeCombatType,
          "center-action-card",
          "center_action_card_face"
        );
        this.syncAoeActionSlotSpacing();
      }
    },

    setDuelActionCard: function (cardType, ownerPlayerId, labelText, cardId) {
      this.ensureFaithWarBoard();
      const slot = dojo.byId("faithwar_action_slot");
      const ownerNode = dojo.byId("faithwar_action_owner");
      const textNode = dojo.byId("faithwar_action_text");
      if (!slot) return;
      const nextCardType = String(cardType || "");
      const parsedCardId = parseInt(cardId || 0, 10);
      if (parsedCardId > 0) {
        this.currentFaithWarActionCardId = parsedCardId;
      } else if (
        nextCardType !== String(this.currentFaithWarActionCardType || "")
      ) {
        this.currentFaithWarActionCardId = 0;
      }
      this.currentFaithWarActionCardType = nextCardType;
      this.currentFaithWarActionOwnerId = parseInt(ownerPlayerId || 0, 10);
      this.currentFaithWarActionLabel = String(
        labelText || this.getActionCardDisplayName(cardType)
      );
      this.beginCenterActionDiscardTracking(
        this.currentFaithWarActionCardType,
        this.currentFaithWarActionCardId,
        this.currentFaithWarActionOwnerId,
        true
      );
      const mainNode = this.renderCombatActionStack(
        slot,
        this.currentFaithWarActionCardType,
        "faith-war-action-card",
        "faithwar_action_main_card"
      );
      if (mainNode) {
        dojo.attr(
          mainNode,
          "data-card-id",
          String(this.currentFaithWarActionCardId || "")
        );
      }
      if (ownerNode) {
        ownerNode.innerHTML =
          '<div class="faith-war-owner combat-owner">' +
          this.getCombatOwnerLabelHtml(ownerPlayerId, "", {
            sectClass: "faith-war-sect-name",
            playerClass: "faith-war-player-name",
          }) +
          "</div>";
      }
      if (textNode) {
        textNode.innerHTML = this.currentFaithWarActionLabel;
      }
    },

    moveDuelActionCardToDiscard: function () {
      const slot = dojo.byId("faithwar_action_slot");
      if (!slot) return;
      const cardNode = dojo.query(".faith-war-action-card", slot)[0];
      if (!cardNode) return;
      const cardType = String(this.currentFaithWarActionCardType || "");
      const cardId = String(this.currentFaithWarActionCardId || "");
      this.animateCardNodeCloneToTarget(cardNode, "action_discard", {
        tempPrefix: "duel_action_to_discard",
        duration: this.getUnifiedCardFlyMs(),
        zIndex: 2200,
      });
      if (cardType) {
        this.pushActionDiscardCard(cardType, cardId, {
          position: this.currentCenterActionHadDefenseDiscard
            ? "bottom"
            : "top",
        });
      }
      slot.innerHTML = "";
      const ownerNode = dojo.byId("faithwar_action_owner");
      if (ownerNode) ownerNode.innerHTML = "";
      const textNode = dojo.byId("faithwar_action_text");
      if (textNode) textNode.innerHTML = "";
      this.currentFaithWarActionCardType = null;
      this.currentFaithWarActionCardId = 0;
      this.currentFaithWarActionOwnerId = 0;
      this.currentFaithWarActionLabel = "";
      this.currentCenterActionDiscardKey = "";
      this.currentCenterActionHadDefenseDiscard = false;
    },

    animateFaithWarDeadCardsToGraveyard: function (deadPlayerIds) {
      if (!deadPlayerIds || !deadPlayerIds.length) return;
      const flyMs = this.getUnifiedCardFlyMs();
      deadPlayerIds.forEach(
        function (playerId, index) {
          const slot = this.getFaithWarPlayerSlotNode(playerId);
          if (!slot) return;
          const cardNode = dojo.query(".faith-war-card", slot)[0];
          if (!cardNode) return;
          this.clearCombatRevealOverlay(cardNode);
          this.animateCardNodeCloneToTarget(cardNode, "graveyard", {
            tempPrefix: "faithwar_dead_" + playerId,
            duration: flyMs,
            startDelay: index * 90,
            zIndex: 2000,
          });
        }.bind(this)
      );
    },

    renderFaithWarFaceDownCard: function (playerId, playerName) {
      this.ensureFaithWarBoard();
      const slots = this.getFaithWarSlotNodes();
      const leftSlot = slots.left;
      const rightSlot = slots.right;
      if (!leftSlot || !rightSlot) return;
      const slotId = "faithwar_slot_" + playerId;
      if (this.getFaithWarPlayerSlotNode(playerId)) return;
      const safeName =
        playerName ||
        (this.gamedatas.players[playerId]
          ? this.gamedatas.players[playerId].name
          : _("Player"));
      let targetSlot = null;
      if (String(playerId) === String(this.currentDuelLeftId)) {
        targetSlot = leftSlot;
      } else if (String(playerId) === String(this.currentDuelRightId)) {
        targetSlot = rightSlot;
      } else {
        targetSlot = leftSlot.innerHTML === "" ? leftSlot : rightSlot;
      }
      dojo.place(
        '<div id="' +
          slotId +
          '" class="faith-war-player-card combat-result-item">' +
          '<div class="faith-war-owner combat-owner">' +
          this.getCombatOwnerLabelHtml(playerId, safeName, {
            sectClass: "faith-war-sect-name",
            playerClass: "faith-war-player-name",
          }) +
          "</div>" +
          '<div class="card card-back-believer faith-war-card combat-result-card facedown"></div>' +
          '<div class="faith-war-card-label combat-result-label">?</div>' +
          "</div>",
        targetSlot
      );
    },

    revealFaithWarCard: function (playerId, cardType, labelText) {
      const slot = this.getFaithWarPlayerSlotNode(playerId);
      if (!slot) {
        return 0;
      }
      const cardNode = dojo.query(".faith-war-card", slot)[0];
      const labelNode = dojo.query(".faith-war-card-label", slot)[0];
      const flipMs = Math.max(
        180,
        parseInt(this.getUnifiedRevealFlipMs() || 0, 10) || 0
      );
      let revealMs = flipMs;
      if (cardNode) {
        this.clearCombatRevealOverlay(cardNode);
        dojo.removeClass(cardNode, "card-believer");
        dojo.addClass(cardNode, "card-back-believer");
        dojo.addClass(cardNode, "facedown");
        cardNode.setAttribute("data-index", "0");
        dojo.style(cardNode, {
          visibility: "visible",
          opacity: 1,
          display: "",
          position: "relative",
          zIndex: 20,
          transition: "",
          transform: "none",
        });
        const animatedMs = this.animateBelieverFlipReveal(
          cardNode,
          parseInt(cardType || 0, 10),
          { flipMs: flipMs }
        );
        if (animatedMs > 0) {
          revealMs = animatedMs;
        } else {
          this.applyBelieverFaceToNode(cardNode, parseInt(cardType || 0, 10));
        }
      }
      if (labelNode) {
        labelNode.innerHTML = labelText || "";
        dojo.style(labelNode, {
          visibility: "visible",
          opacity: 1,
          display: "block",
          minHeight: "18px",
          position: "relative",
          zIndex: 21,
        });
      }
      setTimeout(
        function () {
          const shownNode = dojo.query(".faith-war-card", slot)[0] || null;
          const shownLabel = dojo.query(".faith-war-card-label", slot)[0] || null;
          if (shownNode) {
            dojo.style(shownNode, {
              visibility: "visible",
              display: "",
              position: "relative",
              zIndex: 20,
            });
          }
          if (shownLabel) {
            dojo.style(shownLabel, {
              visibility: "visible",
              opacity: 1,
              display: "",
              position: "relative",
              zIndex: 21,
            });
          }
          let bg = "";
          if (
            shownNode &&
            shownNode.ownerDocument &&
            shownNode.ownerDocument.defaultView
          ) {
            const win = shownNode.ownerDocument.defaultView;
            const computed = win.getComputedStyle(shownNode);
            bg = String((computed && computed.backgroundImage) || "");
          }
          if (shownNode && (!bg || bg === "none")) {
            this.applyBelieverFaceToNode(
              shownNode,
              parseInt(cardType || 0, 10) || 0
            );
            this.forceBelieverFaceSpriteOnNode(
              shownNode,
              parseInt(cardType || 0, 10) || 0
            );
            dojo.style(shownNode, {
              visibility: "visible",
              opacity: 1,
              display: "",
            });
          }
        }.bind(this),
        Math.max(60, parseInt(revealMs || 0, 10) + 40)
      );
      return revealMs;
    },

    clearFaithWarArena: function (messageHtml) {
      const arena = dojo.byId("central_arena");
      if (!arena) return;
      this.clearProphetPendingPredictionVisual();
      this.currentAoeCombatType = null;
      this.currentAoeAttackerId = null;
      this.currentAoeActionCardId = null;

      const warBoard = this.getFaithWarBoardNode();
      arena.innerHTML = messageHtml || "";
      if (warBoard) {
        dojo.place(warBoard, arena);
      }
      this.renderFaithWarLog();
    },

    isAoeCombatType: function (cardType) {
      return cardType === "conspiracy" || cardType === "martyrdom";
    },

    syncAoeAnchorFromNotif: function (cardType, args) {
      if (!this.isAoeCombatType(cardType)) return;
      const source = args || {};
      const attackerId = parseInt(
        source.attacker_id ||
          this.currentAoeAttackerId ||
          source.player_id ||
          0,
        10
      );
      if (!attackerId) return;
      this.placeAoeActionCard(
        cardType,
        this.currentAoeActionCardId || "",
        attackerId
      );
    },

    ensureAoeCombatLayout: function (cardType, attackerId) {
      const arena = dojo.byId("central_arena");
      if (!arena) return;
      const nextAttackerId = parseInt(attackerId || 0, 10);
      const previousAttackerId = parseInt(this.currentAoeAttackerId || 0, 10);
      const rebuildLayout =
        this.currentAoeCombatType !== cardType ||
        !dojo.byId("aoe_combat_layout");
      if (rebuildLayout) {
        arena.innerHTML =
          '<div id="aoe_combat_layout" class="aoe-combat-layout">' +
          '<div id="aoe_left_cluster" class="aoe-left-cluster">' +
          '<div id="aoe_action_slot" class="aoe-action-slot">' +
          '<div id="aoe_attacker_label" class="aoe-attacker-label"></div>' +
          '<div id="aoe_left_cards_row" class="aoe-left-cards-row">' +
          '<div id="aoe_action_col" class="aoe-left-card-col">' +
          '<div id="aoe_action_owner_label" class="aoe-left-owner-label">???</div>' +
          '<div id="aoe_action_card_slot" class="aoe-action-card-slot"></div>' +
          "</div>" +
          '<div id="aoe_attacker_col" class="aoe-left-card-col">' +
          '<div id="aoe_attacker_owner_label" class="aoe-left-owner-label">???</div>' +
          '<div id="aoe_attacker_slot" class="aoe-attacker-slot"></div>' +
          "</div>" +
          "</div>" +
          "</div>" +
          "</div>" +
          '<div id="aoe_vs" class="aoe-vs-label">VS</div>' +
          '<div id="aoe_right_cluster" class="aoe-right-cluster">' +
          '<div id="aoe_right_lane" class="aoe-right-lane"></div>' +
          "</div>" +
          "</div>";
      } else {
        // Keep old sessions resilient: if partial/misaligned nodes exist, rebuild left cluster shape.
        const leftCluster = dojo.byId("aoe_left_cluster");
        if (
          leftCluster &&
          (!dojo.byId("aoe_action_card_slot") ||
            !dojo.byId("aoe_action_owner_label") ||
            !dojo.byId("aoe_attacker_owner_label"))
        ) {
          leftCluster.innerHTML =
            '<div id="aoe_action_slot" class="aoe-action-slot">' +
            '<div id="aoe_attacker_label" class="aoe-attacker-label"></div>' +
            '<div id="aoe_left_cards_row" class="aoe-left-cards-row">' +
            '<div id="aoe_action_col" class="aoe-left-card-col">' +
            '<div id="aoe_action_owner_label" class="aoe-left-owner-label">???</div>' +
            '<div id="aoe_action_card_slot" class="aoe-action-card-slot"></div>' +
            "</div>" +
            '<div id="aoe_attacker_col" class="aoe-left-card-col">' +
            '<div id="aoe_attacker_owner_label" class="aoe-left-owner-label">???</div>' +
            '<div id="aoe_attacker_slot" class="aoe-attacker-slot"></div>' +
            "</div>" +
            "</div>" +
            "</div>";
        }
      }
      this.currentAoeCombatType = cardType;
      this.currentAoeAttackerId = nextAttackerId;
      if (rebuildLayout || previousAttackerId !== nextAttackerId) {
        this.initAoeRightSlotsBySeatOrder(nextAttackerId, true);
      } else {
        this.initAoeRightSlotsBySeatOrder(nextAttackerId, false);
      }
    },

    getAoeOwnerLabelHtml: function (ownerId, playerName) {
      return this.getCombatOwnerLabelHtml(ownerId, playerName, {
        sectClass: "aoe-owner-sect",
        playerClass: "aoe-owner-player",
      });
    },

    getAoeSectOnlyLabelHtml: function (playerId) {
      const pid = parseInt(playerId || 0, 10);
      const sid = this.getPlayerSectId(pid);
      const sectColor = this.getSectLeaderColorBySect(sid, pid);
      return (
        '<div class="aoe-player-owner combat-owner">' +
        '<div class="combat-owner-sect aoe-owner-sect" style="' +
        (sectColor ? "color:" + sectColor + ";" : "") +
        '">' +
        this.escapeHtml(this.getSectLabel(sid)) +
        "</div>" +
        "</div>"
      );
    },

    setAoeTopSectLabel: function (attackerId) {
      const labelNode = dojo.byId("aoe_attacker_label");
      if (!labelNode) return;
      const pid = parseInt(attackerId || 0, 10);
      if (pid <= 0) {
        labelNode.innerHTML = "";
        return;
      }
      labelNode.innerHTML = this.getAoeSectOnlyLabelHtml(pid);
    },

    setAoeActionOwnerLabel: function (playerId, playerName) {
      const labelNode = dojo.byId("aoe_action_owner_label");
      if (!labelNode) return;
      const pid = parseInt(playerId || 0, 10);
      if (pid <= 0) {
        labelNode.textContent = "???";
        return;
      }
      labelNode.innerHTML = this.getCombatOwnerLabelHtml(pid, playerName, {
        includeSect: false,
        playerClass: "aoe-owner-player aoe-left-owner-player",
      });
    },

    setAoeAttackerBelieverOwnerLabel: function (playerId, playerName) {
      const labelNode = dojo.byId("aoe_attacker_owner_label");
      if (!labelNode) return;
      const pid = parseInt(playerId || 0, 10);
      if (pid <= 0) {
        labelNode.textContent = "???";
        return;
      }
      labelNode.innerHTML = this.getCombatOwnerLabelHtml(pid, playerName, {
        includeSect: false,
        playerClass: "aoe-owner-player aoe-left-owner-player",
      });
    },

    getCurrentAoeAttackerSectId: function () {
      const attackerId = parseInt(
        this.currentAoeAttackerId ||
          (this.gamedatas &&
            this.gamedatas.combat_context &&
            this.gamedatas.combat_context.war_attacker_id) ||
          0,
        10
      );
      if (!attackerId) return -1;
      return this.getPlayerSectId(attackerId);
    },

    getAoeSectOwnerLabelHtml: function (
      sectId,
      representativeId,
      representativeName,
      forceUnknownName
    ) {
      const sid = parseInt(sectId || -1, 10);
      const repId = parseInt(representativeId || 0, 10);
      const showUnknown = !!forceUnknownName || repId <= 0;
      const sectColor = this.getSectLeaderColorBySect(sid, repId);
      const sectLine =
        '<div class="aoe-owner-sect" style="' +
        (sectColor ? "color:" + sectColor + ";" : "") +
        '">' +
        this.escapeHtml(this.getSectLabel(sid)) +
        "</div>";
      let playerLine = '<div class="aoe-owner-player">???</div>';
      if (!showUnknown) {
        const safeName =
          representativeName ||
          (this.gamedatas &&
            this.gamedatas.players &&
            this.gamedatas.players[String(repId)] &&
            this.gamedatas.players[String(repId)].name) ||
          _("Player");
        playerLine =
          '<div class="aoe-owner-player">' +
          this.getColoredPlayerNameHtml(repId, safeName) +
          "</div>";
      }
      return sectLine + playerLine;
    },

    syncAoeRepresentativeLabelsFromTargetIds: function (targetIds) {
      const attackerSect = this.getCurrentAoeAttackerSectId();
      let inferredAttackerRepId = 0;
      (targetIds || []).forEach(
        function (pidRaw) {
          const pid = parseInt(pidRaw || 0, 10);
          if (!pid) return;
          const sectId = this.getPlayerSectId(pid);
          const playerName =
            (this.gamedatas &&
              this.gamedatas.players &&
              this.gamedatas.players[String(pid)] &&
              this.gamedatas.players[String(pid)].name) ||
            _("Player");
          if (sectId < 0) return;
          if (sectId === attackerSect) {
            inferredAttackerRepId = pid;
            this.setAoeAttackerBelieverOwnerLabel(pid, playerName);
            return;
          }
          this.ensureAoeRightSectSlot(sectId, pid, playerName, false);
        }.bind(this)
      );
      if (
        inferredAttackerRepId > 0 &&
        this.gamedatas &&
        this.gamedatas.combat_context
      ) {
        this.gamedatas.combat_context.war_rep_attacker_id =
          inferredAttackerRepId;
      }
    },

    getPlayersInSeatOrder: function () {
      return Object.keys(this.gamedatas.players || {})
        .map(
          function (pid) {
            const p = this.gamedatas.players[pid] || {};
            return {
              id: parseInt(pid, 10),
              player_no: parseInt(p.player_no || 0, 10),
              name: p.name || _("Player"),
            };
          }.bind(this)
        )
        .sort(function (a, b) {
          if (
            a.player_no > 0 &&
            b.player_no > 0 &&
            a.player_no !== b.player_no
          ) {
            return a.player_no - b.player_no;
          }
          return a.id - b.id;
        });
    },

    getActionCardsOnTableArray: function (cardsOnTable) {
      if (Array.isArray(cardsOnTable)) return cardsOnTable.slice();
      if (cardsOnTable && typeof cardsOnTable === "object") {
        return Object.values(cardsOnTable);
      }
      return [];
    },

    getBelieversOnTableArray: function (believersOnTable) {
      if (Array.isArray(believersOnTable)) return believersOnTable.slice();
      if (believersOnTable && typeof believersOnTable === "object") {
        return Object.values(believersOnTable);
      }
      return [];
    },

    findActionCardOnTableByType: function (cards, typeName) {
      const list = this.getActionCardsOnTableArray(cards);
      for (let i = 0; i < list.length; i++) {
        if (String(list[i].type || "") === String(typeName || "")) {
          return list[i];
        }
      }
      return null;
    },

    rehydrateFaithDuelArenaFromSnapshot: function (
      actionType,
      actionCard,
      combatContext
    ) {
      const attackerId = parseInt(
        (combatContext && combatContext.war_attacker_id) ||
          (actionCard && actionCard.location_arg) ||
          0,
        10
      );
      const defenderId = parseInt(
        (combatContext && combatContext.war_defender_id) || 0,
        10
      );
      const attackerRepId = parseInt(
        (combatContext && combatContext.war_rep_attacker_id) || 0,
        10
      );
      const defenderRepId = parseInt(
        (combatContext && combatContext.war_rep_defender_id) || 0,
        10
      );
      const leftId = attackerRepId || attackerId;
      const rightId = defenderRepId || defenderId;

      this.ensureFaithWarBoard();
      this.setDuelLogMode(actionType === "faith_debate" ? "debate" : "war");
      if (attackerId > 0) {
        this.setDuelActionCard(
          actionType,
          attackerId,
          this.getActionCardDisplayName(actionType),
          actionCard && actionCard.id ? actionCard.id : 0
        );
      }

      if (leftId > 0 && rightId > 0) {
        const leftName =
          (this.gamedatas.players[String(leftId)] || {}).name || _("Player");
        const rightName =
          (this.gamedatas.players[String(rightId)] || {}).name || _("Player");
        this.setDuelParticipants(leftId, rightId, leftName, rightName);
      }
    },

    rehydrateAoeArenaFromSnapshot: function (
      actionCard,
      combatContext,
      tableBelievers
    ) {
      if (!actionCard) return;
      const attackerId = parseInt(
        (combatContext && combatContext.war_attacker_id) ||
          actionCard.location_arg ||
          0,
        10
      );
      this.placeAoeActionCard(actionCard.type, actionCard.id, attackerId);
      this.getBelieversOnTableArray(tableBelievers).forEach(
        function (card) {
          const ownerId = parseInt(card.location_arg || 0, 10);
          if (!ownerId) return;
          const player = this.gamedatas.players[String(ownerId)] || {};
          this.addAoeCommitToArena({
            player_id: ownerId,
            player_name: player.name || _("Player"),
            sect_id: parseInt(player.player_sect || -1, 10),
            card_id: parseInt(card.id || 0, 10),
            card_type: parseInt(card.type || 0, 10),
            card_kind: "believer",
            facedown: true,
          });
        }.bind(this)
      );
      // F5 restore may happen before the attacker has committed their Believer.
      // The normal start notification shows a facedown placeholder; recreate it here too.
      this.ensureAoeAttackerBelieverPlaceholder();
    },

    rehydrateCombatArenaFromSnapshot: function (gamedatas) {
      if (!gamedatas) return;
      if (this.rehydrateProphetArenaFromSnapshot(gamedatas)) return;
      const combatContext = gamedatas.combat_context || {};
      const warType = parseInt(combatContext.war_type || 0, 10);
      const actionCards = this.getActionCardsOnTableArray(
        gamedatas.cardsontable
      );
      const believerCards = this.getBelieversOnTableArray(
        gamedatas.believersontable
      );
      if (!actionCards.length) return;

      let actionCard = null;
      if (warType === 2) {
        actionCard = this.findActionCardOnTableByType(actionCards, "faith_war");
      } else if (warType === 7) {
        actionCard = this.findActionCardOnTableByType(
          actionCards,
          "faith_debate"
        );
      } else if (warType === 3) {
        actionCard = this.findActionCardOnTableByType(actionCards, "martyrdom");
      } else if (warType === 6 || warType === 11) {
        actionCard = this.findActionCardOnTableByType(
          actionCards,
          "conspiracy"
        );
      }
      if (!actionCard) {
        actionCard = actionCards[0];
      }
      if (!actionCard || !actionCard.type) return;

      if (
        actionCard.type === "faith_war" ||
        actionCard.type === "faith_debate"
      ) {
        this.rehydrateFaithDuelArenaFromSnapshot(
          actionCard.type,
          actionCard,
          combatContext
        );
        return;
      }
      if (this.isAoeCombatType(actionCard.type)) {
        this.rehydrateAoeArenaFromSnapshot(
          actionCard,
          combatContext,
          believerCards
        );
        return;
      }

      this.showCenterActionCard(actionCard.type, actionCard.id || "");
    },

    getCurrentSnapshotStateName: function (gamedatas) {
      const state =
        (gamedatas && gamedatas.gamestate) ||
        (this.gamedatas && this.gamedatas.gamestate) ||
        {};
      return String(state.name || "");
    },

    getCurrentSnapshotStateArgs: function (gamedatas) {
      const state =
        (gamedatas && gamedatas.gamestate) ||
        (this.gamedatas && this.gamedatas.gamestate) ||
        {};
      const rawArgs = state.args || {};
      if (rawArgs && rawArgs.args && typeof rawArgs.args === "object") {
        return Object.assign({}, rawArgs, rawArgs.args);
      }
      return rawArgs || {};
    },

    rehydrateProphetArenaFromSnapshot: function (gamedatas) {
      const stateName = this.getCurrentSnapshotStateName(gamedatas);
      if (stateName !== "prophetSkillPrompt" && stateName !== "prophetGuess") {
        return false;
      }
      const stateArgs = this.getCurrentSnapshotStateArgs(gamedatas);
      const sourceKey = String(stateArgs.source_key || "");
      if (sourceKey !== "have_a_charity" && sourceKey !== "divine_inspire") {
        return false;
      }
      const actionCards = this.getActionCardsOnTableArray(
        (gamedatas && gamedatas.cardsontable) || {}
      );
      const sourceCard =
        this.findActionCardOnTableByType(actionCards, sourceKey) || {};
      this.clearFaithWarArena("");
      this.showCenterActionCard(sourceKey, sourceCard.id || "", {
        replaceExistingWithoutDiscard: true,
      });
      this.restoreProphetPendingPredictionVisual();
      return true;
    },

    getNormalizedProphetStateArgs: function (args) {
      const rawArgs =
        args && args.args && typeof args.args === "object"
          ? Object.assign({}, args, args.args)
          : args || {};
      const cachedArgs = this.getCurrentSnapshotStateArgs(this.gamedatas);
      return Object.assign({}, cachedArgs || {}, rawArgs || {});
    },

    ensureProphetPredictionVisualForState: function (stateName, args) {
      if (stateName !== "prophetSkillPrompt" && stateName !== "prophetGuess") {
        return;
      }
      const stateArgs = this.getNormalizedProphetStateArgs(args);
      const sourceKey = String(stateArgs.source_key || "");
      if (sourceKey !== "have_a_charity" && sourceKey !== "divine_inspire") {
        return;
      }
      const centerAction = dojo.byId("current_center_action_card");
      const currentType = centerAction
        ? String(centerAction.getAttribute("data-card-type") || "")
        : "";
      if (currentType !== sourceKey) {
        this.clearFaithWarArena("");
        this.showCenterActionCard(sourceKey, "", {
          replaceExistingWithoutDiscard: true,
        });
      }
      if (!dojo.byId("prophet_prediction_card_anchor")) {
        this.ensureProphetPredictionSlot();
      }
      if (!dojo.byId("prophet_pending_first_card")) {
        this.restoreProphetPendingPredictionVisual();
      } else {
        this.ensureProphetPredictionSlot();
      }
    },

    initAoeRightSlotsBySeatOrder: function (attackerId, forceReset) {
      const rightLane = dojo.byId("aoe_right_lane");
      if (!rightLane) return;
      if (forceReset) {
        rightLane.innerHTML = "";
      }
      const attacker = parseInt(attackerId || 0, 10);
      const attackerSect = this.getPlayerSectId(attacker);
      const wantedSects = [];
      const seenSects = {};
      this.getPlayersInSeatOrder().forEach(
        function (p) {
          const sectId = this.getPlayerSectId(p.id);
          if (
            sectId < 0 ||
            sectId === attackerSect ||
            seenSects[String(sectId)]
          ) {
            return;
          }
          seenSects[String(sectId)] = 1;
          wantedSects.push(String(sectId));
          const slot = this.ensureAoeRightSectSlot(sectId, 0, "", false);
          if (slot) {
            // Keep seat order stable without nuking existing commits.
            dojo.place(slot, rightLane, "last");
            this.ensureAoeRightSlotPlaceholder(sectId);
          }
        }.bind(this)
      );
      dojo.query(".aoe-player-slot", rightLane).forEach(function (slot) {
        const sectId = String(slot.getAttribute("data-sect-id") || "");
        if (!sectId || wantedSects.indexOf(sectId) === -1) {
          dojo.destroy(slot);
        }
      });
    },

    ensureAoeRightSectSlot: function (
      sectId,
      representativeId,
      representativeName,
      forceUnknownName
    ) {
      const rightLane = dojo.byId("aoe_right_lane");
      const sid = parseInt(sectId || -1, 10);
      if (!rightLane || sid < 0) return null;
      if (sid === this.getCurrentAoeAttackerSectId()) return null;
      const slotId = "aoe_sect_slot_" + sid;
      let slot = dojo.byId(slotId);
      let ownerNode = null;
      if (!slot) {
        slot = dojo.create(
          "div",
          {
            id: slotId,
            className: "aoe-player-slot",
            "data-sect-id": String(sid),
            "data-representative-id": "0",
          },
          rightLane
        );
        ownerNode = dojo.create(
          "div",
          {
            className: "aoe-player-owner",
          },
          slot
        );
        dojo.create(
          "div",
          {
            className: "aoe-player-cards",
          },
          slot
        );
      } else {
        ownerNode = dojo.query(".aoe-player-owner", slot)[0] || null;
      }

      const existingRepId = parseInt(
        slot.getAttribute("data-representative-id") || "0",
        10
      );
      const nextRepId = parseInt(representativeId || 0, 10);
      const shouldShowUnknown =
        !!forceUnknownName && existingRepId <= 0 && nextRepId <= 0;
      if (
        ownerNode &&
        (nextRepId > 0 ||
          shouldShowUnknown ||
          !slot.getAttribute("data-owner-init"))
      ) {
        ownerNode.innerHTML = this.getAoeSectOwnerLabelHtml(
          sid,
          nextRepId,
          representativeName,
          shouldShowUnknown || nextRepId <= 0
        );
        slot.setAttribute("data-owner-init", "1");
      }
      if (nextRepId > 0) {
        slot.setAttribute("data-representative-id", String(nextRepId));
      }
      return slot;
    },

    ensureAoeRightSlotPlaceholder: function (sectId) {
      const sid = parseInt(sectId || -1, 10);
      const slot = this.ensureAoeRightSectSlot(sid, 0, "", false);
      if (!slot) return;
      const cardsWrap = dojo.query(".aoe-player-cards", slot)[0] || slot;
      const existingItems = dojo.query(".aoe-commit-item", cardsWrap);
      if (existingItems.length > 0) {
        const hasCommittedCard = existingItems.some(function (node) {
          return (
            String(node.getAttribute("data-card-kind") || "") !== "placeholder"
          );
        });
        if (hasCommittedCard) {
          return;
        }
        cardsWrap.innerHTML = "";
      }

      const sectBelieverCount =
        sid >= 0 ? this.getSectBelieverCountFromPublicCounters(sid) : 0;
      const noSectBelievers = sid >= 0 && sectBelieverCount <= 0;

      const placeholderId =
        "aoe_placeholder_" + sid + "_" + Math.floor(Math.random() * 1000000);
      const wrap = dojo.create("div", {
        className: "combat-commit-wrap aoe-commit-item aoe-slot-placeholder",
        id: placeholderId,
      });
      wrap.setAttribute("data-player-id", "0");
      wrap.setAttribute("data-owner-id", "0");
      wrap.setAttribute("data-sect-id", String(sid));
      wrap.setAttribute("data-card-kind", "placeholder");
      const owner = dojo.create(
        "div",
        { className: "combat-commit-owner" },
        wrap
      );
      owner.innerHTML = this.getAoeSectOwnerLabelHtml(sid, 0, "", true);
      dojo.addClass(owner, "aoe-hidden");

      if (noSectBelievers) {
        dojo.addClass(wrap, "aoe-no-believer-placeholder");
        dojo.create(
          "div",
          {
            className: "aoe-empty-slot-note",
            innerHTML:
              this.escapeHtml(this.getSectLabel(sid)) +
              " " +
              this.escapeHtml(
                _("currently has no Believers for confrontation.")
              ),
          },
          wrap
        );
        dojo.place(wrap, cardsWrap, "last");
        return;
      }

      dojo.create(
        "div",
        {
          className: "card card-back-believer combat-commit-card facedown",
        },
        wrap
      );
      dojo.place(wrap, cardsWrap, "last");
    },

    ensureAoeAttackerBelieverPlaceholder: function () {
      const attackerSlot = dojo.byId("aoe_attacker_slot");
      if (!attackerSlot) return;

      // If attacker believer is already committed, keep that card as-is.
      if (
        dojo.query(
          '.aoe-commit-item[data-card-kind="believer"][data-card-id]',
          attackerSlot
        ).length > 0
      ) {
        return;
      }
      if (
        dojo.query(".aoe-commit-item.aoe-attacker-placeholder", attackerSlot)
          .length > 0
      ) {
        return;
      }

      attackerSlot.innerHTML = "";
      const wrap = dojo.create(
        "div",
        {
          className:
            "combat-commit-wrap aoe-commit-item aoe-attacker-placeholder",
        },
        attackerSlot
      );
      wrap.setAttribute("data-card-kind", "believer");
      dojo.create(
        "div",
        {
          className:
            "card card-back-believer combat-commit-card combat-result-card facedown",
        },
        wrap
      );
    },

    placeAoeActionCard: function (cardType, cardId, attackerId) {
      this.ensureAoeCombatLayout(cardType, attackerId);
      const actionSlot = dojo.byId("aoe_action_card_slot");
      if (!actionSlot) return;
      actionSlot.innerHTML = `<div id="current_center_action_card" data-card-type="${cardType}" data-card-id="${
        cardId || ""
      }" class="center-action-wrap aoe-action-wrap"></div>`;
      const centerWrap = dojo.byId("current_center_action_card");
      this.renderCombatActionStack(
        centerWrap,
        cardType,
        "center-action-card",
        "center_action_card_face"
      );
      this.syncAoeActionSlotSpacing();
      this.currentAoeActionCardId = cardId || null;
      this.beginCenterActionDiscardTracking(
        cardType,
        this.currentAoeActionCardId || "",
        attackerId || 0,
        false
      );
      const attackerPid = parseInt(attackerId || 0, 10);
      const attackerName =
        (this.gamedatas &&
          this.gamedatas.players &&
          this.gamedatas.players[String(attackerPid)] &&
          this.gamedatas.players[String(attackerPid)].name) ||
        _("Player");
      this.setAoeTopSectLabel(attackerPid);
      this.setAoeActionOwnerLabel(attackerPid, attackerName);

      const hasCommittedAttackerBeliever =
        dojo.query(
          '#aoe_attacker_slot .aoe-commit-item[data-card-kind="believer"][data-player-id]'
        ).length > 0;
      const attackerRepId = parseInt(
        (this.gamedatas &&
          this.gamedatas.combat_context &&
          this.gamedatas.combat_context.war_rep_attacker_id) ||
          0,
        10
      );
      if (!hasCommittedAttackerBeliever) {
        if (attackerRepId > 0) {
          const repName =
            (this.gamedatas &&
              this.gamedatas.players &&
              this.gamedatas.players[String(attackerRepId)] &&
              this.gamedatas.players[String(attackerRepId)].name) ||
            _("Player");
          this.setAoeAttackerBelieverOwnerLabel(attackerRepId, repName);
        } else {
          this.setAoeAttackerBelieverOwnerLabel(0, "");
        }
      }
    },

    addAoeCommitToArena: function (args) {
      const rightLane = dojo.byId("aoe_right_lane");
      const attackerSlot = dojo.byId("aoe_attacker_slot");
      if (!rightLane || !attackerSlot) return false;

      const cardKind = args.card_kind || "believer";
      const cardId = parseInt(args.card_id || 0, 10);
      const ownerId = parseInt(args.player_id || 0, 10);
      const isAttackerRepresentative =
        parseInt(args.is_attacker_representative || 0, 10) === 1;
      const attackerRepresentativeId = parseInt(
        (this.gamedatas &&
          this.gamedatas.combat_context &&
          this.gamedatas.combat_context.war_rep_attacker_id) ||
          0,
        10
      );
      const inferredAttackerRepresentative =
        cardKind === "believer" &&
        ownerId > 0 &&
        attackerRepresentativeId > 0 &&
        ownerId === attackerRepresentativeId;
      const isAttackerBeliever =
        cardKind === "believer" &&
        (isAttackerRepresentative ||
          inferredAttackerRepresentative ||
          (ownerId > 0 && ownerId === this.currentAoeAttackerId));

      let targetContainer = null;
      if (isAttackerBeliever) {
        targetContainer = attackerSlot;
        this.setAoeAttackerBelieverOwnerLabel(ownerId, args.player_name || "");
      } else {
        const sectId = parseInt(
          (typeof args.sect_id !== "undefined"
            ? args.sect_id
            : this.getPlayerSectId(ownerId)) || -1,
          10
        );
        const slot = this.ensureAoeRightSectSlot(
          sectId,
          ownerId,
          args.player_name || "",
          false
        );
        if (!slot) return false;
        targetContainer = dojo.query(".aoe-player-cards", slot)[0] || slot;
        // One-vs-many lane keeps one visible stack per sect:
        // placeholder -> defense OR placeholder -> believer.
        targetContainer.innerHTML = "";
      }
      const itemId =
        "aoe_commit_" +
        cardKind +
        "_" +
        (cardId || Math.floor(Math.random() * 1000000));
      const wrap = dojo.create("div", {
        className: "combat-commit-wrap aoe-commit-item combat-result-item",
        id: itemId,
      });
      wrap.setAttribute("data-player-id", String(ownerId || 0));
      wrap.setAttribute("data-owner-id", String(ownerId || 0));
      wrap.setAttribute("data-card-kind", cardKind);
      if (cardId) {
        wrap.setAttribute("data-card-id", String(cardId));
      }

      const owner = dojo.create(
        "div",
        { className: "combat-commit-owner" },
        wrap
      );
      owner.innerHTML = this.getAoeOwnerLabelHtml(ownerId, args.player_name);
      dojo.addClass(owner, "aoe-hidden");

      if (cardKind === "action") {
        const shouldFaceDown =
          typeof args.facedown === "undefined" ? false : !!args.facedown;
        if (shouldFaceDown) {
          const facedownDefenseNode = dojo.create(
            "div",
            {
              className:
                "card card-back-believer combat-commit-card combat-result-card facedown aoe-defense-facedown",
            },
            wrap
          );
          if (cardId) {
            facedownDefenseNode.setAttribute("data-card-id", String(cardId));
          }
          if (String(args.card_type || "").length) {
            facedownDefenseNode.setAttribute(
              "data-defense-card-type",
              String(args.card_type)
            );
          }
        } else {
          const actionIdx = this.getActionCardSpriteIndex(args.card_type);
          const actionNode = dojo.create(
            "div",
            {
              className: "card card-action combat-commit-card",
              "data-index": actionIdx,
            },
            wrap
          );
          this.attachActionCardTooltip(actionNode, args.card_type);
        }
      } else {
        const believerType = parseInt(args.card_type || 0, 10);
        const shouldFaceDown =
          typeof args.facedown === "undefined" ? true : !!args.facedown;
        if (shouldFaceDown) {
          const facedownNode = dojo.create(
            "div",
            {
              className:
                "card card-back-believer combat-commit-card combat-result-card facedown",
            },
            wrap
          );
          facedownNode.setAttribute("data-believer-type", String(believerType));
          if (cardId) {
            facedownNode.setAttribute("data-card-id", String(cardId));
          }
        } else {
          const believerNode = dojo.create(
            "div",
            {
              className:
                "card card-believer combat-commit-card combat-result-card",
              "data-index": believerType,
            },
            wrap
          );
          this.attachBelieverTooltip(believerNode, believerType);
        }
      }

      if (isAttackerBeliever) {
        targetContainer.innerHTML = "";
        // Conspiracy attacker believer returns to hand; keep it un-grayed on lose.
        // Martyrdom attacker believer always dies, so it should remain normal loser gray.
        if (String(this.currentAoeCombatType || "") === "conspiracy") {
          dojo.addClass(wrap, "aoe-attacker-believer");
        }
      }
      dojo.place(wrap, targetContainer, "last");
      return true;
    },

    animateAoeDefenseFlipReveal: function (nodeOrId, defenseCardType, options) {
      const node =
        typeof nodeOrId === "string" ? dojo.byId(nodeOrId) : nodeOrId || null;
      const cardType = String(defenseCardType || "");
      if (!node || !cardType) return 0;
      const actionIdx = this.getActionCardSpriteIndex(cardType);
      const opts = options || {};
      const configuredFlipMs = Math.max(
        220,
        parseInt(opts.flipMs || this.getUnifiedRevealFlipMs(), 10)
      );
      const halfMs = Math.max(90, Math.round(configuredFlipMs / 2));
      const expandStartLagMs = Math.max(12, parseInt(opts.expandStartLagMs || 16, 10));
      const totalMs = halfMs + expandStartLagMs + halfMs;
      const shrinkScaleX = 0.02;
      dojo.addClass(node, "believer-flip-active");
      dojo.style(node, {
        transformOrigin: "50% 50%",
        transition: "transform " + halfMs + "ms ease",
        transform: "scaleX(" + shrinkScaleX + ")",
      });
      setTimeout(
        function () {
          dojo.removeClass(node, "card-back-believer");
          dojo.removeClass(node, "facedown");
          dojo.removeClass(node, "aoe-defense-facedown");
          dojo.addClass(node, "card-action");
          node.setAttribute("data-index", String(actionIdx));
          node.removeAttribute("data-believer-type");
          this.applyInlineActionFaceStyle(node, actionIdx);
          this.attachActionCardTooltip(node, cardType);
          node.offsetHeight;
          setTimeout(function () {
            dojo.style(node, {
              transition: "transform " + halfMs + "ms ease",
              transform: "scaleX(1)",
            });
          }, expandStartLagMs);
        }.bind(this),
        halfMs
      );
      setTimeout(function () {
        dojo.style(node, {
          transition: "",
          transform: "",
        });
        dojo.removeClass(node, "believer-flip-active");
      }, totalMs + 40);
      return totalMs;
    },

    revealAoeBelievers: function () {
      let revealDurationMs = 0;
      const facedownCards = dojo.query(
        ".aoe-commit-item .combat-commit-card.facedown"
      );
      facedownCards.forEach(
        function (node) {
          const defenseCardType = String(
            node.getAttribute("data-defense-card-type") || ""
          );
          if (defenseCardType) {
            const defenseFlipMs = this.animateAoeDefenseFlipReveal(
              node,
              defenseCardType
            );
            revealDurationMs = Math.max(
              revealDurationMs,
              parseInt(defenseFlipMs || 0, 10)
            );
            return;
          }
          const believerType = parseInt(
            node.getAttribute("data-believer-type") || "0",
            10
          );
          if (!believerType) return;
          const flipMs = this.animateBelieverFlipReveal(node, believerType);
          revealDurationMs = Math.max(
            revealDurationMs,
            parseInt(flipMs || 0, 10)
          );
        }.bind(this)
      );
      return revealDurationMs;
    },

    setAoeResultState: function (cardId, resultType, textLabel, options) {
      if (!cardId) return;
      const wrap = dojo.query(
        '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
          cardId +
          '"]'
      )[0];
      if (!wrap) return;
      this.applyCombatResultStateClass(wrap, resultType);
      const opts = options || {};
      const hideLabel = !!opts.hideLabel;

      let label = dojo.query(".aoe-result-label", wrap)[0];
      if (hideLabel) {
        if (label) {
          dojo.destroy(label);
        }
        return;
      }
      if (!label) {
        label = dojo.create(
          "div",
          { className: "aoe-result-label combat-result-label" },
          wrap
        );
      } else {
        dojo.addClass(label, "combat-result-label");
      }
      label.textContent = textLabel || "";
      dojo.style(label, {
        visibility: "visible",
        display: "inline-flex",
        opacity: 1,
        position: "relative",
        zIndex: 8,
      });
      const cardNode = dojo.query(".combat-result-card", wrap)[0] || null;
      this.syncCombatRevealOverlayLabel(cardNode, textLabel || "", resultType);
    },

    animateAoeBelieversToTargets: function (ownerByCardId, options) {
      if (!ownerByCardId) return;
      const opts = options || {};
      const flyMs = this.getUnifiedCardFlyMs();
      Object.keys(ownerByCardId).forEach(
        function (cardId) {
          const wrap = dojo.query(
            '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
              cardId +
              '"]'
          )[0];
          if (!wrap) return;
          this.clearCombatRevealOverlayWithin(wrap);
          const ownerId = parseInt(ownerByCardId[cardId] || 0, 10);
          const targetId = this.getAoeBelieverReturnTargetNodeId(ownerId);
          if (!dojo.byId(targetId)) return;
          const forceCloneFlight =
            !!opts.forceCloneFlight ||
            String(this.currentAoeCombatType || "") === "conspiracy";
          // For dead/draw believers that go to graveyard, animate the card node
          // as a dedicated temp flight. Sliding the whole wrapper can be visually
          // swallowed by layout/overflow in some AOE boards.
          if (
            forceCloneFlight ||
            String(targetId) === "graveyard" ||
            ownerId <= 0
          ) {
            const cardNode = dojo.query(".combat-result-card", wrap)[0] || wrap;
            const cloneId = this.animateCardNodeCloneToTarget(cardNode, targetId, {
              tempPrefix: "aoe_to_target",
              duration: flyMs,
              zIndex: 2360,
            });
            if (cloneId) {
              // Keep the board tidy once the clone leaves the slot.
              setTimeout(
                function () {
                  if (wrap && wrap.parentNode) {
                    dojo.destroy(wrap);
                  }
                },
                Math.max(120, Math.round(flyMs * 0.35))
              );
              return;
            }

            // Fallback: if clone flight could not be created in this frame,
            // force a temp flight from the committed slot so cards do not
            // visually "disappear" without flying.
            if (wrap && wrap.id) {
              const fallbackCardNode =
                dojo.query(".combat-result-card", wrap)[0] || null;
              const fallbackClass =
                (fallbackCardNode && fallbackCardNode.className) ||
                "card card-back-believer";
              const fallbackIndex = parseInt(
                (fallbackCardNode &&
                  fallbackCardNode.getAttribute("data-index")) ||
                  0,
                10
              );
              this.animateTempCardFlight({
                sourceId: wrap.id,
                targetId: targetId,
                cardClass: String(fallbackClass || "card card-back-believer"),
                duration: flyMs,
                startDelay: 0,
                fromScale: 1,
                toScale: 0.62,
                dataIndex: fallbackIndex > 0 ? fallbackIndex : 0,
                zIndex: 2360,
              });
              setTimeout(
                function () {
                  if (wrap && wrap.parentNode) {
                    dojo.destroy(wrap);
                  }
                },
                Math.max(120, Math.round(flyMs * 0.35))
              );
              return;
            }
          }
          const anim = this.safeSlideToObject(wrap, targetId, flyMs);
          if (!anim) {
            dojo.destroy(wrap);
            return;
          }
          dojo.connect(anim, "onEnd", this, function () {
            dojo.destroy(wrap);
          });
          anim.play();
        }.bind(this)
      );
    },

    mapAoeReturnSourcesForCurrentPlayer: function (ownerByCardId) {
      if (!ownerByCardId) return;
      const myId = parseInt(this.player_id || 0, 10);
      if (myId <= 0) return;

      Object.keys(ownerByCardId).forEach(
        function (cardId) {
          const ownerId = parseInt(ownerByCardId[cardId] || 0, 10);
          if (ownerId !== myId) return;
          const wrap = dojo.query(
            '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
              cardId +
              '"]'
          )[0];
          if (!wrap || !wrap.id) return;
          this.pendingBelieverSourceByCardId[String(cardId)] = wrap.id;
        }.bind(this)
      );
    },

    getBelieverTypeName: function (type) {
      const t = parseInt(type || 0, 10);
      if (!(t > 0)) return _("Believer");
      return this.believerTypeNames[t] || _("Believer");
    },

    formatBelieverTypeLabel: function (type) {
      const t = parseInt(type || 0, 10);
      if (!(t > 0)) return this.getBelieverTypeName(type);
      return this.getBelieverTypeName(t) + " #" + t;
    },

    canCurrentPlayerUseZombieArmyFromGrave: function () {
      const ctx = (this.gamedatas && this.gamedatas.combat_context) || {};
      const zombieOwnerId = parseInt(ctx.war_zombie_owner_id || 0, 10);
      if (!zombieOwnerId) return false;

      const me = String(this.player_id || "");
      if (!me) return false;
      const repA = String(ctx.war_rep_attacker_id || "");
      const repB = String(ctx.war_rep_defender_id || "");
      if (me !== repA && me !== repB) return false;

      const players = (this.gamedatas && this.gamedatas.players) || {};
      const meInfo = players[String(me)] || null;
      const ownerInfo = players[String(zombieOwnerId)] || null;
      if (!meInfo || !ownerInfo) return false;
      if (String(meInfo.player_sect) !== String(ownerInfo.player_sect))
        return false;

      return this.getZombieEligibleGraveyardCards().length > 0;
    },

    getZombieSnapshotMaxDiscardArg: function () {
      const ctx = (this.gamedatas && this.gamedatas.combat_context) || {};
      const n = parseInt(ctx.war_zombie_snapshot_max_discard_arg || 0, 10);
      return n > 0 ? n : 0;
    },

    isGraveCardEligibleForZombieSnapshot: function (card) {
      if (!card) return false;
      const snapshotMaxArg = this.getZombieSnapshotMaxDiscardArg();
      if (snapshotMaxArg <= 0) return false;
      const discardArg = parseInt((card && card.location_arg) || 0, 10);
      if (discardArg <= 0) return false;
      return discardArg <= snapshotMaxArg;
    },

    getZombieEligibleGraveyardCards: function () {
      const liveCount = this.getLiveGraveyardCount();
      const list = this.normalizeGraveyardCards(this.graveyardCards).slice(
        0,
        liveCount
      );
      return list.filter(
        function (card) {
          return this.isGraveCardEligibleForZombieSnapshot(card);
        }.bind(this)
      );
    },

    getBelieverWinningTypes: function (type) {
      const t = parseInt(type || 0, 10);
      if (t < 1 || t > 5) {
        return { wins: [], bonus: 0 };
      }
      const winA = ((t + 3) % 5) + 1; // t-1 in cycle
      const winB = ((t + 2) % 5) + 1; // t-2 in cycle
      return {
        wins: [winA, winB],
        bonus: winA, // Faith War bonus applies on the direct counter (diff==1).
      };
    },

    compareBelieverTypesSimple: function (attackerType, defenderType, reverse) {
      const a = parseInt(attackerType || 0, 10);
      const d = parseInt(defenderType || 0, 10);
      if (a < 1 || a > 5 || d < 1 || d > 5) return 0;
      if (a === d) return 0;
      const diff = (a - d + 5) % 5;
      let winner = diff === 1 || diff === 2 ? 1 : -1;
      if (reverse) winner *= -1;
      return winner;
    },

    ensureAoeVisualBelieversFromResolvedPayload: function (actionKey, args) {
      const payload = args || {};
      const visualCards = Array.isArray(payload.visual_cards)
        ? payload.visual_cards
        : [];
      if (!visualCards.length) return;

      this.syncAoeAnchorFromNotif(actionKey, payload);
      visualCards.forEach(
        function (card) {
          const cardId = parseInt(card.card_id || card.id || 0, 10);
          if (!cardId) return;
          const existing = dojo.query(
            '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
              cardId +
              '"]'
          )[0];
          if (existing) return;

          const ownerId = parseInt(
            card.owner_id || card.player_id || card.location_arg || 0,
            10
          );
          const player =
            (this.gamedatas &&
              this.gamedatas.players &&
              this.gamedatas.players[String(ownerId)]) ||
            {};
          this.addCombatCommitToArena({
            player_id: ownerId,
            player_name:
              card.owner_name || card.player_name || player.name || _("Player"),
            sect_id:
              typeof card.sect_id !== "undefined"
                ? card.sect_id
                : player.player_sect,
            card_id: cardId,
            card_type: card.card_type || card.type || 0,
            card_kind: "believer",
            is_attacker_representative: card.is_attacker_representative || 0,
            facedown: true,
          });
        }.bind(this)
      );
    },

    computeConspiracyVisualOutcomesFromBoard: function (
      attackerCardId,
      reverseActive
    ) {
      const attackerWrap = dojo.query(
        '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
          String(attackerCardId || "") +
          '"]'
      )[0];
      if (!attackerWrap) return null;
      const attackerCardNode = dojo.query(
        ".combat-result-card",
        attackerWrap
      )[0];
      const attackerType = parseInt(
        attackerCardNode
          ? attackerCardNode.getAttribute("data-index") || "0"
          : "0",
        10
      );
      if (attackerType < 1 || attackerType > 5) return null;

      const attackerWins = {};
      const defenderWins = {};
      const draws = {};
      dojo
        .query('.aoe-commit-item[data-card-kind="believer"][data-card-id]')
        .forEach(
          function (wrap) {
            const cid = String(wrap.getAttribute("data-card-id") || "");
            if (!cid || cid === String(attackerCardId || "")) return;
            const cardNode = dojo.query(".combat-result-card", wrap)[0];
            const defenderType = parseInt(
              cardNode ? cardNode.getAttribute("data-index") || "0" : "0",
              10
            );
            const winner = this.compareBelieverTypesSimple(
              attackerType,
              defenderType,
              !!reverseActive
            );
            if (winner === 1) attackerWins[cid] = true;
            else if (winner === -1) defenderWins[cid] = true;
            else draws[cid] = true;
          }.bind(this)
        );
      return {
        attackerWins: attackerWins,
        defenderWins: defenderWins,
        draws: draws,
      };
    },

    getAoeBelieverReturnTargetNodeId: function (ownerId) {
      const pid = parseInt(ownerId || 0, 10);
      if (pid <= 0) return "graveyard";
      const target = this.resolvePlayerCardAnchorNodeId(
        pid,
        "return",
        "believer"
      );
      return target || "graveyard";
    },

    getBelieverTooltipHtml: function (type, extraRows) {
      const t = parseInt(type || 0, 10);
      const info = this.getBelieverWinningTypes(t);
      const name = this.getBelieverTypeName(t);
      const rows = Array.isArray(extraRows) ? extraRows : [];
      const winText = info.wins
        .map(
          function (target) {
            return this.getBelieverTypeName(target) + " #" + target;
          }.bind(this)
        )
        .join(", ");
      const bonusText = info.bonus
        ? this.getBelieverTypeName(info.bonus) + " #" + info.bonus
        : _("None");
      return (
        '<div class="card-text-tooltip">' +
        '<strong class="tooltip-card-title">' +
        name +
        " #" +
        t +
        "</strong>" +
        '<div class="tooltip-card-divider"></div>' +
        '<div class="tooltip-believer-rel"><span class="label">' +
        _("Win vs") +
        ":</span> " +
        winText +
        "</div>" +
        '<div class="tooltip-believer-rel"><span class="label">' +
        _("Faith War bonus vs") +
        ":</span> " +
        bonusText +
        "</div>" +
        rows
          .map(function (row) {
            return (
              '<div class="tooltip-believer-rel"><span class="label">' +
              String(row.label || "") +
              ":</span> " +
              String(row.value || "") +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    },

    attachBelieverTooltip: function (node, type, options) {
      if (!node) return;
      const t = parseInt(type || 0, 10);
      if (!t) return;
      const opts = options || {};
      const extraRows = Array.isArray(opts.extraRows) ? opts.extraRows : [];
      if (!node.id) {
        node.id =
          "believer_tip_" +
          t +
          "_" +
          Math.floor(Math.random() * 1000000).toString();
      }
      const html = this.getBelieverTooltipHtml(t, extraRows);
      if (typeof this.addTooltipHtml === "function") {
        this.addTooltipHtml(node.id, html, 300);
        if (typeof dojo.removeAttr === "function") {
          dojo.removeAttr(node, "title");
        } else {
          dojo.attr(node, "title", "");
        }
      } else {
        // Fallback for environments without rich tooltip support.
        const titleExtra = extraRows
          .map(function (row) {
            return String(row.label || "") + ": " + String(row.value || "");
          })
          .filter(function (line) {
            return line.trim().length > 0;
          })
          .join(" | ");
        const titleBase =
          this.getBelieverTypeName(t) +
          " #" +
          t +
          " | " +
          _("Win vs") +
          ": " +
          this.getBelieverWinningTypes(t)
            .wins.map(
              function (target) {
                return this.getBelieverTypeName(target) + " #" + target;
              }.bind(this)
            )
            .join(", ");
        dojo.attr(
          node,
          "title",
          titleExtra ? titleBase + " | " + titleExtra : titleBase
        );
      }
      this.bindMobileCardTooltip(node, html);
    },

    isTouchTooltipDevice: function () {
      if (typeof window === "undefined") return false;
      const nav = window.navigator || {};
      return (
        "ontouchstart" in window ||
        parseInt(nav.maxTouchPoints || 0, 10) > 0 ||
        parseInt(nav.msMaxTouchPoints || 0, 10) > 0
      );
    },

    clearMobileCardTooltipTimer: function () {
      if (this.mobileCardTooltipTimer) {
        clearTimeout(this.mobileCardTooltipTimer);
        this.mobileCardTooltipTimer = null;
      }
      this.mobileCardTooltipTouch = null;
    },

    closeMobileCardTooltip: function () {
      this.clearMobileCardTooltipTimer();
      const overlay = dojo.byId("mobile_card_tooltip_overlay");
      if (overlay) {
        dojo.destroy(overlay);
      }
    },

    showMobileCardTooltip: function (html) {
      if (!html) return;
      this.closeMobileCardTooltip();
      const overlay = dojo.create("div", {
        id: "mobile_card_tooltip_overlay",
        className: "spy-modal-overlay mobile-card-tooltip-overlay",
      });
      const modal = dojo.create(
        "div",
        { className: "spy-modal mobile-card-tooltip-modal" },
        overlay
      );
      const head = dojo.create("div", { className: "spy-modal-head" }, modal);
      dojo.create(
        "div",
        {
          className: "spy-modal-title",
          innerHTML: _("Card details"),
        },
        head
      );
      const closeBtn = dojo.create(
        "button",
        {
          innerHTML: _("Close"),
          className: "bgabutton bgabutton_white",
        },
        head
      );
      dojo.connect(closeBtn, "onclick", this, "closeMobileCardTooltip");
      dojo.create(
        "div",
        {
          className: "mobile-card-tooltip-content",
          innerHTML: html,
        },
        modal
      );
      dojo.connect(modal, "onclick", this, function (evt) {
        if (evt) dojo.stopEvent(evt);
      });
      dojo.connect(overlay, "onclick", this, function (evt) {
        if (evt && evt.target === overlay) {
          this.closeMobileCardTooltip();
        }
      });
      dojo.place(overlay, "game_play_area");
    },

    bindMobileCardTooltip: function (node, html) {
      if (!node || !html || !this.isTouchTooltipDevice()) return;
      if (node.getAttribute && node.getAttribute("data-mobile-tip-bound") === "1") {
        node.__hofMobileTooltipHtml = html;
        return;
      }
      node.__hofMobileTooltipHtml = html;
      if (node.setAttribute) {
        node.setAttribute("data-mobile-tip-bound", "1");
      }
      dojo.connect(
        node,
        "ontouchstart",
        this,
        function (evt) {
          if (!evt || !evt.touches || !evt.touches.length) return;
          this.clearMobileCardTooltipTimer();
          this.mobileCardTooltipShown = false;
          const touch = evt.touches[0];
          this.mobileCardTooltipTouch = {
            x: touch.clientX,
            y: touch.clientY,
            html: node.__hofMobileTooltipHtml || html,
          };
          this.mobileCardTooltipTimer = setTimeout(
            function () {
              const data = this.mobileCardTooltipTouch || {};
              this.mobileCardTooltipTimer = null;
              this.mobileCardTooltipShown = true;
              this.mobileCardTooltipSuppressClickUntil = Date.now() + 750;
              this.showMobileCardTooltip(data.html || html);
            }.bind(this),
            520
          );
        }.bind(this)
      );
      dojo.connect(
        node,
        "ontouchmove",
        this,
        function (evt) {
          if (!evt || !evt.touches || !evt.touches.length) return;
          const start = this.mobileCardTooltipTouch;
          if (!start) return;
          const touch = evt.touches[0];
          const dx = Math.abs(parseFloat(touch.clientX || 0) - start.x);
          const dy = Math.abs(parseFloat(touch.clientY || 0) - start.y);
          if (dx > 12 || dy > 12) {
            this.clearMobileCardTooltipTimer();
          }
        }.bind(this)
      );
      const endTouch = function (evt) {
        const wasShown = this.mobileCardTooltipShown;
        this.clearMobileCardTooltipTimer();
        if (wasShown && evt) {
          this.mobileCardTooltipShown = false;
          dojo.stopEvent(evt);
        }
      }.bind(this);
      dojo.connect(node, "ontouchend", this, endTouch);
      dojo.connect(node, "ontouchcancel", this, endTouch);
      dojo.connect(
        node,
        "onclick",
        this,
        function (evt) {
          if (Date.now() < parseInt(this.mobileCardTooltipSuppressClickUntil || 0, 10)) {
            dojo.stopEvent(evt);
          }
        }.bind(this)
      );
    },

    getActionCardDisplayName: function (cardType) {
      const names = {
        witch_hunt: _("Witch Hunt"),
        faith_war: _("Faith War"),
        martyrdom: _("Martyrdom"),
        spread_rumors: _("Spread Rumors"),
        faith_debate: _("Faith Debate"),
        conspiracy: _("Conspiracy"),
        great_mercy: _("Great Mercy"),
        firm_faith: _("Firm Faith"),
        breaking_faith: _("Breaking Faith"),
        kowtow_to_me: _("Kowtow To Me"),
        info_spy: _("Info-Spy"),
        secret_alliance: _("Secret Alliance"),
        its_a_miracle: _("It's a Miracle"),
        have_a_charity: _("Have a Charity"),
        divine_inspire: _("Divine Inspiration"),
      };
      if (names[cardType]) return names[cardType];
      return _("Action");
    },

    getActionTypeMaskByCardType: function () {
      if (!this.actionTypeMaskByCardType) {
        this.actionTypeMaskByCardType = {
          breaking_faith: 0b01000,
          kowtow_to_me: 0b01000,
          info_spy: 0b01000,
          secret_alliance: 0b01000,
          its_a_miracle: 0b01000,
          have_a_charity: 0b01000,
          divine_inspire: 0b01000,
          witch_hunt: 0b00100,
          faith_war: 0b00100,
          martyrdom: 0b00100,
          spread_rumors: 0b00010,
          faith_debate: 0b00010,
          conspiracy: 0b00010,
        };
      }
      return this.actionTypeMaskByCardType;
    },

    getActionTypeMaskFromCardType: function (cardType) {
      return this.getActionTypeMaskByCardType()[String(cardType || "")] || 0;
    },

    getActionTypeLabelFromMask: function (mask) {
      switch (mask) {
        case 0b01000:
          return _("Strategy");
        case 0b00100:
          return _("Physical Attack");
        case 0b00010:
          return _("Mental Attack");
        case 0b00001:
          return _("Discard");
        default:
          return _("Action");
      }
    },

    getDefenseKindLabel: function (defenseKind) {
      if (defenseKind === "mental") return _("Mental");
      if (defenseKind === "breaking_faith") return _("Breaking Faith");
      return _("Physical");
    },

    getDefenseKindByWarType: function (warType) {
      const t = parseInt(warType || 0, 10);
      if (t === 4) return "breaking_faith";
      if (t === 6 || t === 7 || t === 9) return "mental";
      return "physical";
    },

    getCurrentDefenseKindFromContext: function () {
      const stateArgs =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args) ||
        {};
      const fromArgs = String(stateArgs.defense_kind || "");
      if (
        fromArgs === "physical" ||
        fromArgs === "mental" ||
        fromArgs === "breaking_faith"
      ) {
        return fromArgs;
      }
      return this.getDefenseKindByWarType(this.getCurrentCombatWarType());
    },

    getExpectedDefenseCardKey: function (defenseKind) {
      const expectedByKind = {
        physical: "great_mercy",
        mental: "firm_faith",
        breaking_faith: "breaking_faith",
      };
      return expectedByKind[String(defenseKind || "")] || "great_mercy";
    },

    getDefenseMismatchMessage: function (defenseKind) {
      if (defenseKind === "mental") {
        return _(
          "This is a Mental Attack. You must use a Mental defense card (Firm Faith)."
        );
      }
      if (defenseKind === "breaking_faith") {
        return _(
          "This is a Breaking Faith attack. You must use Breaking Faith to defend."
        );
      }
      return _(
        "This is a Physical Attack. You must use a Physical defense card (Great Mercy)."
      );
    },

    validateDefenseCardSelectionItem: function (item) {
      const defenseKind = this.getCurrentDefenseKindFromContext();
      const expectedCardKey = this.getExpectedDefenseCardKey(defenseKind);
      const selectedCardKey =
        (item && this.actionCardTypeById[String(item.id)]) ||
        this.getActionCardKeyName(item ? item.type : 0);
      if (selectedCardKey === expectedCardKey) {
        return { ok: true, message: "" };
      }
      return {
        ok: false,
        message: this.getDefenseMismatchMessage(defenseKind),
      };
    },

    getSectLabel: function (sectId) {
      const id = parseInt(sectId, 10);
      if (id < 0) {
        return _("Wanderer");
      }
      const sectName = this.sectNames[id];
      if (sectName) return sectName;
      return dojo.string.substitute(_("Sect ${id}"), { id: id });
    },

    getPlayerNameWithSect: function (playerId, fallbackName) {
      const pid = String(playerId || "");
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const p = players[pid] || null;
      const name = (p && p.name) || fallbackName || _("Player");
      const sectId = p ? parseInt(p.player_sect || -1, 10) : -1;
      return name + " (" + this.getSectLabel(sectId) + ")";
    },

    getPlayerDisplayNameById: function (playerId, fallbackName) {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const p = players[String(playerId || "")] || null;
      return (p && (p.player_name || p.name)) || fallbackName || _("Player");
    },

    getPlayerTableRoleText: function (playerId) {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const p = players[String(playerId || "")] || null;
      const role = parseInt((p && p.player_role) || 0, 10);
      if (role === 1) return _("Follower");
      if (role === 2) return _("Wanderer");
      return _("Leader");
    },

    getPlayerPendingSkipTurnCount: function (playerId) {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const p = players[String(playerId || "")] || null;
      if (!p) return 0;
      const raw =
        typeof p.player_skip_turn_count !== "undefined"
          ? p.player_skip_turn_count
          : p.skip_turn_count;
      return Math.max(0, parseInt(raw || 0, 10) || 0);
    },

    getPlayerPanelRoleText: function (playerId) {
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const p = players[String(playerId || "")] || null;
      const role = parseInt((p && p.player_role) || 0, 10);
      let baseText = _("Leader");
      if (role === 1) {
        const leaderId = parseInt((p && p.player_leader_id) || 0, 10);
        const leaderName = this.getPlayerDisplayNameById(
          leaderId,
          String(leaderId || "")
        );
        baseText = dojo.string.substitute(_("Follower (of ${leader_name})"), {
          leader_name: leaderName,
        });
      }
      if (role === 2) {
        baseText = _("Wanderer");
      }
      const skipCount = this.getPlayerPendingSkipTurnCount(playerId);
      if (skipCount > 0) {
        baseText +=
          " - " +
          dojo.string.substitute(_("Skip next ${n} turn(s)"), {
            n: skipCount,
          });
      }
      return baseText;
    },

    refreshPlayerIdentityUi: function (playerId) {
      const pid = String(playerId || "");
      if (!pid) return;
      const players = (this.gamedatas && this.gamedatas.players) || {};
      const p = players[pid];
      if (!p) return;

      const roleInline = dojo.byId("table_role_" + pid);
      if (roleInline) {
        roleInline.innerHTML =
          "(" + this.escapeHtml(this.getPlayerTableRoleText(pid)) + ")";
      }

      const tableSectNode = dojo.byId("table_sect_" + pid);
      if (tableSectNode) {
        tableSectNode.innerHTML =
          this.getSectBadgeHtml(p.player_sect) +
          this.getColoredSectNameHtml(pid, p.player_sect);
      }

      const panelRoleNode = dojo.byId("role_" + pid);
      if (panelRoleNode) {
        panelRoleNode.innerHTML = this.escapeHtml(
          this.getPlayerPanelRoleText(pid)
        );
      }

      const panelSectNode = dojo.byId("sect_" + pid);
      if (panelSectNode) {
        panelSectNode.innerHTML =
          this.getSectBadgeHtml(p.player_sect) +
          this.getColoredSectNameHtml(pid, p.player_sect);
      }
    },

    applyPlayerIdentitySyncRow: function (row) {
      if (!row) return;
      const pid = String(
        typeof row.player_id !== "undefined" ? row.player_id : row.id || ""
      );
      if (!pid) return;
      if (!this.gamedatas) this.gamedatas = {};
      if (!this.gamedatas.players) this.gamedatas.players = {};
      if (!this.gamedatas.players[pid]) {
        this.gamedatas.players[pid] = { id: parseInt(pid, 10) };
      }
      const player = this.gamedatas.players[pid];

      if (typeof row.player_name !== "undefined") {
        player.player_name = String(row.player_name);
        player.name = String(row.player_name);
      }
      if (typeof row.player_role !== "undefined") {
        player.player_role = parseInt(row.player_role || 0, 10);
      }
      if (typeof row.player_sect !== "undefined") {
        player.player_sect = parseInt(row.player_sect || -1, 10);
      }
      if (typeof row.player_leader_id !== "undefined") {
        player.player_leader_id = parseInt(row.player_leader_id || 0, 10);
      }
      if (typeof row.player_is_skill_sealed !== "undefined") {
        player.player_is_skill_sealed = parseInt(
          row.player_is_skill_sealed || 0,
          10
        );
      }
      if (typeof row.player_skip_turn_count !== "undefined") {
        player.player_skip_turn_count = parseInt(
          row.player_skip_turn_count || 0,
          10
        );
      }

      this.refreshPlayerIdentityUi(pid);
      this.refreshPlayerSkillActiveBadge(pid);
    },

    getSectIconIndex: function (sectId) {
      const id = parseInt(sectId, 10);
      if (id >= 1 && id <= 8) return id - 1;
      if (id > 0) return (id - 1) % 8;
      return -1;
    },

    getSectBadgeHtml: function (sectId) {
      const iconIndex = this.getSectIconIndex(sectId);
      if (iconIndex < 0) {
        return `<span class="sect_badge_icon sect_badge_wanderer">W</span>`;
      }
      return `<span class="sect_badge_icon" data-sect-icon="${iconIndex}"></span>`;
    },

    getActionCardEffectText: function (cardKey) {
      const texts = {
        have_a_charity: _("Draw 2 Believers from the Believer deck."),
        info_spy: _("View 1 target player's Action and Believer cards."),
        its_a_miracle: _(
          "Revive up to 3 Believers from the top of graveyard to your hand."
        ),
        divine_inspire: _(
          "Discard X Action cards (excluding this card) to draw an equal number of Believers."
        ),
        secret_alliance: _(
          "Choose a player. Exchange 1 Action card from your hand with 1 Action card from that player."
        ),
        breaking_faith: _(
          "Same-Sect only. If used by a Leader: expel 1 Follower. If used by a Follower: become an independent Leader. If countered with Breaking Faith, snatch 1 Believer; otherwise, snatch half of target's Believers (rounded down)."
        ),
        kowtow_to_me: _(
          "Target a Sect with half or fewer Believers than your Sect, and forcibly absorb it."
        ),
        spread_rumors: _(
          "Target a Sect. Snatch 1 random Believer from each player in that Sect."
        ),
        faith_debate: _(
          "Sect vs Sect duel up to 5 rounds. Winner snatches loser's Believer."
        ),
        conspiracy: _(
          "Send 1 of your Believers to confront 1 Believer from each other Sect. Snatch each Believer you defeat; ties and losses are not snatched."
        ),
        witch_hunt: _(
          "Target a Sect and a Believer type. All matching Believers in that Sect die."
        ),
        faith_war: _(
          "Sect vs Sect war until one side has no available Believers."
        ),
        martyrdom: _(
          "Send 1 of your Believers to physically confront 1 Believer from each other Sect. Your sent Believer always dies after the confrontation; each opposing Believer that loses or draws also dies."
        ),
        great_mercy: _("Defends against Physical Attack."),
        firm_faith: _("Defends against Mental Attack."),
      };
      return texts[cardKey] || _("No text yet.");
    },

    getActionCardEffectSections: function (cardKey) {
      const key = String(cardKey || "");
      if (key === "breaking_faith") {
        return [
          _("Same-Sect only. If you are a Leader: expel 1 Follower."),
          _("If you are a Follower: become an independent Leader."),
          _(
            "If defended with Breaking Faith: snatch 1 Believer. If not defended: snatch half of target's Believers (rounded down)."
          ),
        ];
      }
      return [];
    },

    getActionCardTypeMeta: function (cardKey) {
      if (!cardKey) {
        return { label: _("Action"), cssClass: "support", iconKey: "" };
      }
      if (cardKey === "great_mercy") {
        return {
          label: _("Physical Defence"),
          cssClass: "support",
          iconKey: "physical_defence",
        };
      }
      if (cardKey === "firm_faith") {
        return {
          label: _("Mental Defence"),
          cssClass: "support",
          iconKey: "mental_defence",
        };
      }
      const mask = this.getActionTypeMaskFromCardType(cardKey);
      if (mask === 0b00100) {
        return {
          label: _("Physical Attack"),
          cssClass: "attack",
          iconKey: "physical_attack",
        };
      }
      if (mask === 0b00010) {
        return {
          label: _("Mental Attack"),
          cssClass: "attack",
          iconKey: "mental_attack",
        };
      }
      if (mask === 0b01000) {
        return {
          label: _("Strategy"),
          cssClass: "support",
          iconKey: "strategy",
        };
      }
      return { label: _("Action"), cssClass: "support", iconKey: "" };
    },

    getActionAttackScopeMeta: function (cardKey) {
      const key = String(cardKey || "");
      if (key === "spread_rumors" || key === "witch_hunt") {
        return {
          iconKey: "target",
          shortLabel: _("Target"),
          text: _("Targets one Sect without consuming Believers."),
        };
      }
      if (key === "faith_war" || key === "faith_debate") {
        return {
          iconKey: "duel_1v1",
          shortLabel: _("1 vs 1"),
          text: _("Targets one Sect with multi-round Believer confrontation."),
        };
      }
      if (key === "martyrdom" || key === "conspiracy") {
        return {
          iconKey: "aoe",
          shortLabel: _("AoE"),
          text: _("Non-discriminatory attack against all enemy Sects."),
        };
      }
      return null;
    },

    renderActionIconLabelHtml: function (iconKey, label, extraClass) {
      const key = String(iconKey || "");
      const text = String(label || "");
      const cls = String(extraClass || "");
      if (!key) {
        return '<span class="' + cls + '">' + this.escapeHtml(text) + "</span>";
      }
      return (
        '<span class="tooltip-action-icon-label ' +
        cls +
        '">' +
        '<span class="tooltip-action-icon is-' +
        key +
        '"></span>' +
        '<span class="tooltip-action-icon-text">' +
        this.escapeHtml(text) +
        "</span>" +
        "</span>"
      );
    },

    decorateActionTooltipTextWithIcons: function (text) {
      const source = String(text || "");
      if (!source) return "";
      const replacements = [
        {
          pattern: /Physical Defence/gi,
          iconKey: "physical_defence",
          label: _("Physical Defence"),
        },
        {
          pattern: /Mental Defence/gi,
          iconKey: "mental_defence",
          label: _("Mental Defence"),
        },
        {
          pattern: /Physical defense/gi,
          iconKey: "physical_defence",
          label: _("Physical Defence"),
        },
        {
          pattern: /Mental defense/gi,
          iconKey: "mental_defence",
          label: _("Mental Defence"),
        },
        {
          pattern: /Physical Attack/gi,
          iconKey: "physical_attack",
          label: _("Physical Attack"),
        },
        {
          pattern: /Physical attacks/gi,
          iconKey: "physical_attack",
          label: _("Physical Attack"),
        },
        {
          pattern: /Mental Attack/gi,
          iconKey: "mental_attack",
          label: _("Mental Attack"),
        },
        {
          pattern: /Mental attacks/gi,
          iconKey: "mental_attack",
          label: _("Mental Attack"),
        },
        {
          pattern: /\bStrategy\b/gi,
          iconKey: "strategy",
          label: _("Strategy"),
        },
      ];
      const tokens = [];
      let output = source;
      replacements.forEach(
        function (row, idx) {
          output = output.replace(
            row.pattern,
            function () {
              const token =
                "__ACTION_ICON_TOKEN_" + idx + "_" + tokens.length + "__";
              tokens.push({
                token: token,
                html: this.renderActionIconLabelHtml(
                  row.iconKey,
                  row.label,
                  "is-inline"
                ),
              });
              return token;
            }.bind(this)
          );
        }.bind(this)
      );
      tokens.forEach(function (row) {
        output = output.replace(row.token, row.html);
      });
      return output;
    },

    renderActionCardEffectHtml: function (cardKey, fallbackText) {
      const sections = this.getActionCardEffectSections(cardKey);
      if (sections && sections.length) {
        return sections
          .map(
            function (line) {
              return (
                '<div class="tooltip-action-effect-row">' +
                this.decorateActionTooltipTextWithIcons(line) +
                "</div>"
              );
            }.bind(this)
          )
          .join("");
      }
      return this.decorateActionTooltipTextWithIcons(fallbackText);
    },

    getSkillName: function (skillType) {
      const skillLabels =
        this.gamedatas &&
        this.gamedatas.const &&
        this.gamedatas.const.skill_labels &&
        this.gamedatas.const.skill_labels[skillType];
      if (skillLabels && skillLabels.name) {
        return skillLabels.name;
      }
      return dojo.string.substitute(_("Skill ${skill_type}"), {
        skill_type: skillType,
      });
    },

    getSkillEffectText: function (skillType) {
      const texts = {
        1: _(
          "Snatch half your Leader's Believers now. Before your next turn, if your Leader uses Breaking Faith on you, its snatch effect is nullified and you become independent immediately. Otherwise, at your next turn start, you snatch half again and become independent."
        ),
        2: _(
          "Sacrifice 1 Believer, target any player, and kill up to 3 of their Believers. After using this skill, you cannot perform Physical or Mental attacks for the rest of this turn."
        ),
        3: _(
          "Expel all Followers and snatch half of each Follower's Believers."
        ),
        4: _(
          "Predict the first Believer type drawn by that player; snatch it if correct."
        ),
        5: _(
          "Revive 3 Believers from graveyard."
        ),
        6: _(
          "When Followers draw Action cards, you also draw. Your hand limit is +1 per Follower."
        ),
        7: _(
          "Sacrifice 1 Believer to gain protection from Mental attacks until your next turn."
        ),
        8: _(
          "Sacrifice 1 Believer to gain protection from Physical attacks until your next turn."
        ),
        9: _(
          "Copy one other player's revealed skill until your next turn. Impermanence of Life cannot be copied."
        ),
        10: _(
          "Use graveyard Believers as substitutes in that Faith War's confrontations. Each used graveyard Believer is removed from the game."
        ),
        11: _(
          "Choose one player to skip their next turn."
        ),
        12: _(
          "Stay hidden until game end: do not become a Follower or Wanderer, and do not absorb other players. If you meet these conditions and have at least 5 Believers at game-end check, you win immediately. If this skill fails, reveal and discard it, then draw a new hidden skill."
        ),
        13: _(
          "Sacrifice 1 Believer to gain +1 extra action this turn."
        ),
        14: _(
          "Shuffle all players' Action cards in hand and redistribute from your seat order."
        ),
        15: _(
          "Shuffle all players' Believers in hand and redistribute from your seat order. This immediately ends your turn."
        ),
        16: _("Reverse Believer confrontation results for this confrontation."),
      };
      return texts[skillType] || _("Skill effect text not configured yet.");
    },
    getSkillTimingText: function (skillType) {
      const timing = {
        1: _(
          "Timing: While you are a Follower."
        ),
        2: _(
          "Timing: During your action phase, before performing any Physical or Mental attack this turn."
        ),
        3: _("Timing: During your action phase."),
        4: _(
          "Timing: Reactive when another player draws Believers."
        ),
        5: _(
          "Timing: Reactive when 3 or more of your Believers die at the same time."
        ),
        6: _(
          "Timing: Passive while you have one or more Followers."
        ),
        7: _("Timing: During your action phase."),
        8: _("Timing: During your action phase."),
        9: _("Timing: Depends on copied skill."),
        10: _("Timing: When you declare Faith War."),
        11: _("Timing: During your action phase."),
        12: _("Timing: At game-end check (passive)."),
        13: _("Timing: During your action phase."),
        14: _("Timing: During your action phase."),
        15: _("Timing: Before any action this turn."),
        16: _(
          "Timing: Reactive once when a confrontation starts."
        ),
      };
      return timing[skillType] || _("Timing: Not configured yet.");
    },

    getSkillUsageInfo: function (skillType, skillState) {
      const uses = parseInt((skillState && skillState.uses) || 0, 10);
      const usedThisTurn = parseInt(
        (skillState && skillState.karboom_used_this_turn) || 0,
        10
      );
      const praiseUsedThisTurn = parseInt(
        (skillState && skillState.praise_life_used_this_turn) || 0,
        10
      );
      const holyRebirthUsedThisTurn = parseInt(
        (skillState && skillState.holy_rebirth_used_this_turn) || 0,
        10
      );
      const handLimit = parseInt(
        (skillState && skillState.action_hand_limit) || 6,
        10
      );
      if (skillType === 1) {
        return {
          usageText: _("Uses: Once per game."),
          counterText: dojo.string.substitute(_("Count: ${uses}/1"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 2) {
        return {
          usageText: _("Uses: Once per turn."),
          counterText: dojo.string.substitute(_("Count: this turn ${used}/1"), {
            used: usedThisTurn,
          }),
        };
      }
      if (skillType === 3) {
        return {
          usageText: _("Uses: Once per game."),
          counterText: dojo.string.substitute(_("Count: ${uses}/1"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 4) {
        return {
          usageText: _("Uses: Unlimited (reactive)."),
          counterText: "",
        };
      }
      if (skillType === 5) {
        return {
          usageText: _("Uses: Once per round."),
          counterText: dojo.string.substitute(
            _("Count: this round ${used}/1"),
            { used: holyRebirthUsedThisTurn }
          ),
        };
      }
      if (skillType === 6) {
        return {
          usageText: _("Uses: Passive."),
          counterText: dojo.string.substitute(
            _("Count: current Action hand limit ${hand_limit}"),
            {
              hand_limit: handLimit,
            }
          ),
        };
      }
      if (skillType === 7) {
        const active = parseInt(
          (skillState && skillState.protected_mental) || 0,
          10
        );
        return {
          usageText: _("Uses: Up to 3 per game, once per turn."),
          counterText: dojo.string.substitute(
            _("Count: total ${uses}/3 · active protection ${status}"),
            {
              uses: uses,
              status: active ? "ON" : "OFF",
            }
          ),
        };
      }
      if (skillType === 8) {
        const active = parseInt(
          (skillState && skillState.protected_physical) || 0,
          10
        );
        return {
          usageText: _("Uses: Up to 3 per game, once per turn."),
          counterText: dojo.string.substitute(
            _("Count: total ${uses}/3 · active protection ${status}"),
            {
              uses: uses,
              status: active ? "ON" : "OFF",
            }
          ),
        };
      }
      if (skillType === 9) {
        const gateUsedThisTurn = parseInt(
          (skillState && skillState.gate_truth_used_this_turn) || 0,
          10
        );
        return {
          usageText: _(
            "Uses: Once per turn. Each revealed skill type can be copied once per game."
          ),
          counterText: dojo.string.substitute(_("Count: this turn ${used}/1"), {
            used: gateUsedThisTurn,
          }),
        };
      }
      if (skillType === 10) {
        return {
          usageText: _("Uses: Optional per Faith War declaration."),
          counterText: "",
        };
      }
      if (skillType === 11) {
        return {
          usageText: _("Uses: Up to 3 per game."),
          counterText: dojo.string.substitute(_("Count: total ${uses}/3"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 12) {
        return {
          usageText: _("Uses: Passive."),
          counterText: "",
        };
      }
      if (skillType === 13) {
        return {
          usageText: _("Uses: Once per turn."),
          counterText: dojo.string.substitute(_("Count: this turn ${used}/1"), {
            used: praiseUsedThisTurn,
          }),
        };
      }
      if (skillType === 14) {
        return {
          usageText: _("Uses: Up to 3 per game."),
          counterText: dojo.string.substitute(_("Count: total ${uses}/3"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 15) {
        return {
          usageText: _("Uses: Once per game."),
          counterText: dojo.string.substitute(_("Count: ${uses}/1"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 16) {
        return {
          usageText: _("Uses: Once per confrontation (reactive)."),
          counterText: "",
        };
      }
      return { usageText: _("Uses: Not configured."), counterText: "" };
    },

    getSkillUsageText: function (skillType, skillState) {
      return this.getSkillUsageInfo(skillType, skillState).usageText;
    },

    getGateTruthCopiedSkillHistoryText: function (skillState) {
      const rows = Array.isArray(
        skillState && skillState.gate_truth_copied_skill_types
      )
        ? skillState.gate_truth_copied_skill_types
        : [];
      const seen = {};
      const names = [];
      rows.forEach(
        function (rawType) {
          const skillType = parseInt(rawType || 0, 10);
          if (skillType <= 0 || seen[String(skillType)]) return;
          seen[String(skillType)] = 1;
          names.push(this.getSkillName(skillType));
        }.bind(this)
      );
      return names.length ? names.join(", ") : "???";
    },

    getSkillTooltipHtml: function (skillType, skillState) {
      const t = parseInt(skillType || 0, 10);
      if (!t) {
        return (
          '<div class="card-text-tooltip">' +
          '<strong class="tooltip-card-title skill-tooltip-title">' +
          this.escapeHtml(_("Unrevealed Skill")) +
          "</strong>" +
          '<div class="tooltip-card-divider"></div>' +
          this.escapeHtml(_("This skill has not been revealed yet.")) +
          "</div>"
        );
      }
      const name = this.getSkillName(t);
      const timing = this.getSkillTimingText(t);
      const usageInfo = this.getSkillUsageInfo(t, skillState || null);
      const usage = usageInfo.usageText || "";
      const usageCounter = usageInfo.counterText || "";
      const copiedSkillType =
        t === 9
          ? parseInt(
              (skillState && skillState.gate_truth_copied_skill_type) || 0,
              10
            )
          : 0;
      const copiedSkillName =
        copiedSkillType > 0 ? this.getSkillName(copiedSkillType) : "";
      const effectSkillType =
        t === 9 && copiedSkillType > 0 ? copiedSkillType : t;
      const effect = this.getSkillEffectText(effectSkillType);
      const copiedSkillHintHtml =
        copiedSkillType > 0
          ? '<div class="skill-tooltip-copy-current">' +
            this.escapeHtml(_("Current copied")) +
            " - " +
            this.escapeHtml(copiedSkillName) +
            "</div>"
          : "";
      const combatStatusNote = String(
        (skillState && skillState.combat_reverse_status_note) || ""
      );
      const combatStatusHtml = combatStatusNote
        ? '<div class="skill-tooltip-combat-status">' +
          this.escapeHtml(combatStatusNote) +
          "</div>"
        : "";
      const gateTruthCopiedHistoryHtml =
        t === 9
          ? '<div><strong class="skill-tooltip-title">' +
            this.escapeHtml(_("Copied skills")) +
            "</strong> " +
            this.escapeHtml(
              this.getGateTruthCopiedSkillHistoryText(skillState || null)
            ) +
            "</div>"
          : "";
      const usageCounterHtml = usageCounter
        ? '<div class="tooltip-skill-counter-row">' +
          this.escapeHtml(usageCounter) +
          "</div>"
        : "";
      const showUsageBlock =
        t !== 16 && (usage.length > 0 || usageCounter.length > 0);
      const usageBlockHtml = showUsageBlock
        ? '<div class="tooltip-card-divider"></div>' +
          '<div class="tooltip-skill-uses-row">' +
          usage +
          "</div>" +
          usageCounterHtml
        : "";
      return (
        '<div class="card-text-tooltip">' +
        '<div><strong class="tooltip-card-title skill-tooltip-title">' +
        name +
        "</strong></div>" +
        '<div class="tooltip-card-divider"></div>' +
        '<div class="tooltip-skill-meta-row">' +
        timing +
        "</div>" +
        '<div class="tooltip-card-divider"></div>' +
        '<div class="tooltip-skill-detail">' +
        effect +
        gateTruthCopiedHistoryHtml +
        copiedSkillHintHtml +
        combatStatusHtml +
        "</div>" +
        usageBlockHtml +
        "</div>"
      );
    },

    attachSkillTooltip: function (node, skillType, skillState) {
      if (!node) return;
      if (!node.id) {
        node.id = "skill_tip_" + Math.floor(Math.random() * 1000000).toString();
      }
      const html = this.getSkillTooltipHtml(skillType, skillState);
      if (typeof this.addTooltipHtml === "function") {
        this.addTooltipHtml(node.id, html, 300);
      }
      this.bindMobileCardTooltip(node, html);
    },

    attachPanelCounterTooltip: function (node, title, text) {
      if (!node) return;
      if (!node.id) {
        node.id = "panel_tip_" + Math.floor(Math.random() * 1000000).toString();
      }
      if (typeof this.addTooltipHtml === "function") {
        this.addTooltipHtml(
          node.id,
          '<div class="card-text-tooltip"><strong class="tooltip-card-title">' +
            title +
            "</strong>" +
            '<div class="tooltip-card-divider"></div>' +
            '<div class="tooltip-panel-counter-text">' +
            this.escapeHtml(String(text || "")) +
            "</div>" +
            "</div>",
          300
        );
      }
    },

    getActionCardTooltipHtml: function (cardKey) {
      const name = this.getActionCardDisplayName(cardKey || "unknown");
      const effect = this.getActionCardEffectText(cardKey || "unknown");
      const typeMeta = this.getActionCardTypeMeta(cardKey || "unknown");
      const scopeMeta = this.getActionAttackScopeMeta(cardKey || "unknown");
      const typeLabelHtml = this.renderActionIconLabelHtml(
        typeMeta.iconKey,
        typeMeta.label,
        "is-type"
      );
      const scopeHtml = scopeMeta
        ? '<div class="tooltip-attack-scope">' +
          this.renderActionIconLabelHtml(
            scopeMeta.iconKey,
            scopeMeta.shortLabel,
            "is-scope"
          ) +
          '<span class="tooltip-attack-scope-text">' +
          this.escapeHtml(scopeMeta.text) +
          "</span>" +
          "</div>"
        : "";
      return (
        '<div class="card-text-tooltip">' +
        '<strong class="tooltip-card-title">' +
        name +
        "</strong>" +
        '<div class="tooltip-card-divider"></div>' +
        '<div class="tooltip-card-type ' +
        typeMeta.cssClass +
        '">' +
        typeLabelHtml +
        "</div>" +
        scopeHtml +
        '<div class="tooltip-card-divider"></div>' +
        '<div class="tooltip-action-effect">' +
        this.renderActionCardEffectHtml(cardKey || "unknown", effect) +
        "</div>" +
        "</div>"
      );
    },

    attachActionCardTooltip: function (node, cardKey) {
      if (!node || !cardKey) return;
      const html = this.getActionCardTooltipHtml(cardKey);
      if (!node.id) {
        node.id =
          "action_tip_" +
          cardKey +
          "_" +
          Math.floor(Math.random() * 1000000).toString();
      }
      if (typeof this.addTooltipHtml === "function") {
        this.addTooltipHtml(node.id, html, 300);
        if (typeof dojo.removeAttr === "function") {
          dojo.removeAttr(node, "title");
        } else {
          dojo.attr(node, "title", "");
        }
      } else {
        dojo.attr(node, "title", this.getActionCardEffectText(cardKey));
      }
      this.bindMobileCardTooltip(node, html);
    },

    addCombatCommitToArena: function (args) {
      const arena = dojo.byId("central_arena");
      if (!arena || !args) return;
      if (
        this.currentAoeCombatType &&
        this.isAoeCombatType(this.currentAoeCombatType)
      ) {
        if (this.addAoeCommitToArena(args)) {
          return;
        }
      }
      // Fallback safety: if AOE layout already exists but combat type marker is stale,
      // still route commit cards into the AOE lane structure.
      if (dojo.byId("aoe_combat_layout")) {
        if (this.addAoeCommitToArena(args)) {
          return;
        }
      }

      const wrap = dojo.create("div", { className: "combat-commit-wrap" });
      const owner = dojo.create(
        "div",
        { className: "combat-commit-owner" },
        wrap
      );
      owner.innerHTML = this.getCombatOwnerLabelHtml(
        args.player_id || 0,
        args.player_name || _("Player"),
        {
          sectClass: "combat-commit-sect",
          playerClass: "combat-commit-player",
        }
      );

      const cardKind = args.card_kind || "believer";
      if (cardKind === "action") {
        const actionIdx = this.getActionCardSpriteIndex(args.card_type);
        const actionNode = dojo.create(
          "div",
          {
            className: "card card-action combat-commit-card",
            "data-index": actionIdx,
          },
          wrap
        );
        this.attachActionCardTooltip(actionNode, args.card_type);
      } else {
        if (args.facedown) {
          const facedownNode = dojo.create(
            "div",
            {
              className: "card card-back-believer combat-commit-card facedown",
            },
            wrap
          );
          const believerType = parseInt(args.card_type || 0, 10);
          if (believerType > 0) {
            facedownNode.setAttribute(
              "data-believer-type",
              String(believerType)
            );
          }
          if (parseInt(args.card_id || 0, 10) > 0) {
            facedownNode.setAttribute("data-card-id", String(args.card_id));
          }
        } else {
          const believerNode = dojo.create(
            "div",
            {
              className: "card card-believer combat-commit-card",
              "data-index": parseInt(args.card_type, 10),
            },
            wrap
          );
          this.attachBelieverTooltip(
            believerNode,
            parseInt(args.card_type, 10)
          );
        }
      }

      dojo.place(wrap, arena, "first");
      const existing = dojo.query(".combat-commit-wrap", arena);
      if (existing.length > 10) {
        dojo.destroy(existing[existing.length - 1]);
      }
    },

    renderActionDiscardTop: function () {
      const wrap = dojo.byId("action_discard_top");
      const slot = dojo.byId("action_discard");
      if (!wrap) return;
      wrap.innerHTML = "";
      const hasCards = !!(this.actionDiscardCards && this.actionDiscardCards.length);
      if (slot) {
        dojo.toggleClass(slot, "has_cards", hasCards);
      }
      if (!hasCards) return;

      const topCard = this.actionDiscardCards[0];
      const spriteOffset = this.getActionCardSpriteIndex(topCard.type);
      dojo.place(
        `<div class="action_discard_preview card-action" data-index="${spriteOffset}"></div>`,
        wrap
      );
      const previewNode = dojo.query(".action_discard_preview", wrap)[0];
      if (previewNode) {
        this.attachActionCardTooltip(previewNode, topCard.type);
      }
    },

    pushActionDiscardCard: function (cardType, cardId, options) {
      const entry = { id: cardId, type: cardType };
      const cards = this.actionDiscardCards || [];
      const placeBottom =
        options && String(options.position || "") === "bottom";
      this.actionDiscardCards = placeBottom
        ? cards.concat([entry])
        : [entry].concat(cards);
      this.renderActionDiscardTop();
    },

    moveCurrentCenterActionToDiscard: function (opts) {
      const options = opts || {};
      if (this.pendingCenterActionDiscardTimeout) {
        clearTimeout(this.pendingCenterActionDiscardTimeout);
        this.pendingCenterActionDiscardTimeout = null;
      }
      const currentCard = dojo.byId("current_center_action_card");
      if (!currentCard) return;
      const cardType = currentCard.getAttribute("data-card-type");
      if (
        !options.force &&
        this.shouldHoldTransientArenaForConfrontation() &&
        this.isConfrontationActionCardType(cardType)
      ) {
        return;
      }
      const cardId = currentCard.getAttribute("data-card-id");
      const cardNode =
        dojo.byId("center_action_card_face") ||
        dojo.query(".combat-action-primary", currentCard)[0] ||
        dojo.query(".center-action-card", currentCard)[0] ||
        null;
      if (cardNode && dojo.byId("action_discard")) {
        this.animateCardNodeCloneToTarget(cardNode, "action_discard", {
          tempPrefix: "center_action_to_discard",
          duration: this.getUnifiedCardFlyMs(),
          zIndex: 2200,
        });
      }
      dojo.destroy(currentCard);
      if (cardType) {
        this.pushActionDiscardCard(cardType, cardId, {
          position: this.currentCenterActionHadDefenseDiscard
            ? "bottom"
            : "top",
        });
      }
      this.currentCenterActionDiscardKey = "";
      this.currentCenterActionHadDefenseDiscard = false;
    },

    clearTransientArenaAfterAction: function (delayMs, opts) {
      const options = opts || {};
      if (this.pendingTransientArenaClearTimeout) {
        clearTimeout(this.pendingTransientArenaClearTimeout);
        this.pendingTransientArenaClearTimeout = null;
      }
      const run = function () {
        this.pendingTransientArenaClearTimeout = null;
        if (this.getCurrentStateName() === "gameEndSummary") {
          return;
        }
        if (
          !options.force &&
          this.shouldHoldTransientArenaForConfrontation()
        ) {
          this.ensureConfrontationActionVisual();
          return;
        }
        this.moveCurrentCenterActionToDiscard({ force: !!options.force });
        const arena = dojo.byId("central_arena");
        if (arena) {
          arena.innerHTML = "";
        }
        this.currentAoeCombatType = null;
        this.currentAoeAttackerId = null;
        this.currentAoeActionCardId = null;
        this.currentAoeCommitTargetIds = [];
        this.currentAoeAssignedAction = "";
        this.currentAoeDefendedPlayerIds = {};
        this.currentAoeDefendedSectIds = {};
      }.bind(this);

      const requestedDelayMs = Math.max(0, parseInt(delayMs || 0, 10) || 0);
      const revealGateDelayMs =
        typeof this.getCombatRevealGateDelayMs === "function"
          ? Math.max(0, parseInt(this.getCombatRevealGateDelayMs() || 0, 10))
          : 0;
      const redistributeGateDelayMs = Math.max(
        this.getRedistributeFxPendingDelayMs("believer"),
        this.getRedistributeFxPendingDelayMs("action")
      );
      const centerActionHoldDelayMs = Math.max(
        0,
        parseInt((this.centerActionHoldUntil || 0) - Date.now(), 10) || 0
      );
      const effectiveDelayMs = Math.max(
        requestedDelayMs,
        revealGateDelayMs,
        redistributeGateDelayMs,
        centerActionHoldDelayMs
      );
      if (effectiveDelayMs > 0) {
        this.pendingTransientArenaClearTimeout = setTimeout(
          run,
          effectiveDelayMs
        );
      } else {
        run();
      }
    },

    getCurrentStateName: function () {
      return (
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.name) ||
        ""
      );
    },

    getCurrentCombatWarType: function () {
      return parseInt(
        (this.gamedatas &&
          this.gamedatas.combat_context &&
          this.gamedatas.combat_context.war_type) ||
          0,
        10
      );
    },

    setClientCombatContext: function (warType, attackerId, defenderId) {
      if (!this.gamedatas) return;
      if (!this.gamedatas.combat_context) {
        this.gamedatas.combat_context = {};
      }
      const context = this.gamedatas.combat_context;
      const type = parseInt(warType || 0, 10);
      if (type) context.war_type = type;
      const attacker = parseInt(attackerId || 0, 10);
      if (attacker) context.war_attacker_id = attacker;
      const defender = parseInt(defenderId || 0, 10);
      if (defender) context.war_defender_id = defender;
    },

    getPendingConfrontationWarType: function (args) {
      const stateArgs = this.getCurrentSnapshotStateArgs(this.gamedatas);
      const source =
        args && args.args ? Object.assign({}, args, args.args) : args || {};
      return parseInt(
        source.war_type ||
          source.reverse_karma_pending_war_type ||
          (stateArgs && stateArgs.war_type) ||
          this.getCurrentCombatWarType() ||
          0,
        10
      );
    },

    getActionCardTypeForConfrontationWarType: function (warType) {
      const type = parseInt(warType || 0, 10);
      if (type === 2) return "faith_war";
      if (type === 3) return "martyrdom";
      if (type === 4) return "breaking_faith";
      if (type === 6) return "conspiracy";
      if (type === 7) return "faith_debate";
      if (type === 8) return "witch_hunt";
      if (type === 9) return "spread_rumors";
      if (type === 11) return "conspiracy";
      return "";
    },

    isConfrontationActionCardType: function (cardType) {
      const type = String(cardType || "");
      return (
        type === "faith_war" ||
        type === "faith_debate" ||
        type === "breaking_faith" ||
        type === "witch_hunt" ||
        type === "spread_rumors" ||
        type === "martyrdom" ||
        type === "conspiracy"
      );
    },

    isConfrontationHoldState: function (stateName) {
      const state = String(stateName || "");
      return (
        state === "confirmDefense" ||
        state === "afterDefenseResponses" ||
        state === "resolveAttack" ||
        state === "reverseKarmaPrompt" ||
        state === "resolveReverseKarmaPrompt" ||
        state === "chooseWarRepresentative" ||
        state === "chooseFaithDebateRepresentative" ||
        state === "martyrdomChooseRepresentative" ||
        state === "conspiracyChooseRepresentative" ||
        state === "martyrdomChooseBelievers" ||
        state === "conspiracyChooseBelievers" ||
        state === "faithWarDuel" ||
        state === "faithDebateDuel"
      );
    },

    getCurrentConfrontationActionVisualType: function () {
      const current = dojo.byId("current_center_action_card");
      const centerType = current
        ? String(current.getAttribute("data-card-type") || "")
        : "";
      if (this.isConfrontationActionCardType(centerType)) return centerType;

      const duelType = String(this.currentFaithWarActionCardType || "");
      if (this.isConfrontationActionCardType(duelType)) return duelType;

      const aoeType = String(this.currentAoeCombatType || "");
      if (this.isConfrontationActionCardType(aoeType)) return aoeType;

      return "";
    },

    shouldHoldTransientArenaForConfrontation: function (args, stateName) {
      const currentState = String(
        stateName || this.getCurrentStateName() || ""
      );
      if (!this.isConfrontationHoldState(currentState)) {
        return false;
      }
      const visualType = this.getCurrentConfrontationActionVisualType();
      if (visualType) return true;
      return !!this.getActionCardTypeForConfrontationWarType(
        this.getPendingConfrontationWarType(args)
      );
    },

    ensureConfrontationActionVisual: function (args, stateName) {
      if (!this.shouldHoldTransientArenaForConfrontation(args, stateName)) {
        return;
      }
      const existingType = this.getCurrentConfrontationActionVisualType();
      const warType = this.getPendingConfrontationWarType(args);
      const actionType =
        existingType || this.getActionCardTypeForConfrontationWarType(warType);
      if (!actionType) return;

      const actionCards = this.getActionCardsOnTableArray(
        (this.gamedatas && this.gamedatas.cardsontable) || {}
      );
      const actionCard =
        this.findActionCardOnTableByType(actionCards, actionType) || {};
      const combatContext =
        (this.gamedatas && this.gamedatas.combat_context) || {};

      if (actionType === "faith_war" || actionType === "faith_debate") {
        const slot = dojo.byId("faithwar_action_slot");
        const hasDuelAction =
          slot && dojo.query(".faith-war-action-card", slot).length > 0;
        if (hasDuelAction) return;

        if (actionCard && actionCard.type) {
          this.rehydrateFaithDuelArenaFromSnapshot(
            actionType,
            actionCard,
            combatContext
          );
          return;
        }

        const ownerId = parseInt(
          this.currentFaithWarActionOwnerId ||
            (combatContext && combatContext.war_attacker_id) ||
            0,
          10
        );
        this.ensureFaithWarBoard();
        this.setDuelLogMode(actionType === "faith_debate" ? "debate" : "war");
        this.setDuelActionCard(
          actionType,
          ownerId,
          this.getActionCardDisplayName(actionType),
          this.currentFaithWarActionCardId || ""
        );
        return;
      }

      if (this.isAoeCombatType(actionType)) {
        const current = dojo.byId("current_center_action_card");
        const currentType = current
          ? String(current.getAttribute("data-card-type") || "")
          : "";
        if (currentType === actionType) return;
        if (actionCard && actionCard.type) {
          this.rehydrateAoeArenaFromSnapshot(
            actionCard,
            combatContext,
            this.getBelieversOnTableArray(
              (this.gamedatas && this.gamedatas.believersontable) || {}
            )
          );
          return;
        }
        this.placeAoeActionCard(
          actionType,
          this.currentAoeActionCardId || "",
          this.currentAoeAttackerId || 0
        );
        return;
      }

      const current = dojo.byId("current_center_action_card");
      const currentType = current
        ? String(current.getAttribute("data-card-type") || "")
        : "";
      if (currentType === actionType) return;
      this.showCenterActionCard(actionType, actionCard.id || "", {
        replaceExistingWithoutDiscard: true,
      });
    },

    markAoePlayerDefended: function (playerId) {
      const pid = parseInt(playerId || 0, 10);
      if (!pid) return;
      this.currentAoeDefendedPlayerIds[String(pid)] = 1;
    },

    markAoeSectDefended: function (sectId) {
      const sid = parseInt(sectId || -1, 10);
      if (sid < 0) return;
      this.currentAoeDefendedSectIds[String(sid)] = 1;
    },

    hasCurrentPlayerSectDefendedInAoe: function () {
      const me =
        (this.gamedatas &&
          this.gamedatas.players &&
          this.gamedatas.players[String(this.player_id)]) ||
        null;
      const mySect = parseInt((me && me.player_sect) || -1, 10);
      if (mySect < 0) return false;
      if (this.currentAoeDefendedSectIds[String(mySect)]) return true;

      const defendedPlayerIds = Object.keys(
        this.currentAoeDefendedPlayerIds || {}
      );
      for (let i = 0; i < defendedPlayerIds.length; i++) {
        const pid = parseInt(defendedPlayerIds[i] || 0, 10);
        if (pid <= 0) continue;
        if (this.getPlayerSectId(pid) === mySect) {
          return true;
        }
      }
      return false;
    },

    hasAoeCommittedBelieverByPlayer: function (playerId) {
      const pid = parseInt(playerId || 0, 10);
      if (!pid) return false;
      return (
        dojo.query(
          '.aoe-commit-item[data-card-kind="believer"][data-player-id="' +
            String(pid) +
            '"]'
        ).length > 0
      );
    },

    canCurrentPlayerCommitAoeBeliever: function (args) {
      const myId = parseInt(this.player_id || 0, 10);
      if (!myId) return false;
      if (this.hasAoeCommittedBelieverByPlayer(myId)) return false;
      return (
        this.checkAction("playBelieverCard", true) ||
        this.isCurrentPlayerInAoeCommitTargets(args)
      );
    },

    getAoeCommitTargetIdsFromArgs: function (args) {
      const src =
        (args && args.target_ids) ||
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args &&
          this.gamedatas.gamestate.args.target_ids) ||
        [];
      if (!Array.isArray(src)) {
        return [];
      }
      return src
        .map(function (v) {
          return parseInt(v || 0, 10);
        })
        .filter(function (v) {
          return v > 0;
        });
    },

    isCurrentPlayerInAoeCommitTargets: function (args) {
      const myId = parseInt(this.player_id || 0, 10);
      if (!myId) return false;
      const mergedTargets = {};
      (this.currentAoeCommitTargetIds || []).forEach(function (v) {
        const id = parseInt(v || 0, 10);
        if (id > 0) mergedTargets[id] = 1;
      });
      this.getAoeCommitTargetIdsFromArgs(args).forEach(function (id) {
        mergedTargets[id] = 1;
      });
      return !!mergedTargets[myId];
    },

    resolveStateArgsForReadiness: function (args) {
      if (args && args.args && typeof args.args === "object") {
        return args.args;
      }
      if (args && typeof args === "object") {
        return args;
      }
      return (
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args) ||
        {}
      );
    },

    getActionCardKeyFromStockNode: function (node) {
      if (!node) return "";
      const knownIds = this.extractActionCardIdCandidatesFromStockNode(
        node,
        "myactioncards"
      );
      for (let i = 0; i < knownIds.length; i++) {
        const key = this.actionCardTypeById[String(knownIds[i] || "")];
        if (key) return String(key);
      }
      let spriteIdx = parseInt(node.getAttribute("data-index") || 0, 10);
      if (!(spriteIdx > 0)) {
        const inner = dojo.query("[data-index]", node)[0];
        if (inner) {
          spriteIdx = parseInt(inner.getAttribute("data-index") || 0, 10);
        }
      }
      if (!(spriteIdx > 0)) return "";
      return this.getActionCardKeyName(spriteIdx);
    },

    shouldBelieverHandBeReady: function (stateName, args) {
      const currentState = String(
        stateName || this.getCurrentStateName() || ""
      );
      const stateArgs = this.resolveStateArgsForReadiness(args);
      if (
        currentState === "resolveDuel" ||
        currentState === "resolveFaithDebateDuel"
      ) {
        // Keep the same readiness phase during duel resolution to avoid
        // temporary hand-style toggling between rounds.
        return true;
      }
      if (currentState === "reverseKarmaPrompt") {
        // Reverse Karma prompt is always inside an already-confirmed
        // confrontation flow. Keep believer hand in ready mode through the
        // whole prompt/wait window to prevent style flicker.
        return true;
      }
      if (currentState === "leaderGiveBeliever") {
        return (
          this.isCurrentPlayerActive() && this.checkAction("giveBeliever", true)
        );
      }
      if (currentState === "faithWarDuel") {
        // Keep hand readiness visually stable for the whole duel lifecycle.
        // Even during result/animation windows, action cards must stay dimmed
        // so players are not misled into thinking they can play Action cards.
        return true;
      }
      if (currentState === "faithDebateDuel") {
        // Mirror Faith War behavior: keep believers highlighted consistently
        // across the entire debate confrontation flow.
        return true;
      }
      if (
        currentState === "martyrdomChooseBelievers" ||
        currentState === "conspiracyChooseBelievers"
      ) {
        return this.canCurrentPlayerCommitAoeBeliever(stateArgs);
      }
      if (
        currentState === "playerTurn" &&
        this.pendingSkill &&
        !this.actionSubmissionInFlight
      ) {
        const pendingSkillType = parseInt(
          (this.pendingSkill && this.pendingSkill.skillType) || 0,
          10
        );
        return [2, 7, 8, 13].indexOf(pendingSkillType) !== -1;
      }
      return false;
    },

    canSelectActionCardsInState: function (stateName, args) {
      const currentState = String(
        stateName || this.getCurrentStateName() || ""
      );
      if (currentState === "playerTurn") {
        return this.isCurrentPlayerActive();
      }
      if (currentState === "discardingActionCard") {
        return (
          this.isCurrentPlayerActive() &&
          this.checkAction("confirmDiscardingActionCard", true)
        );
      }
      if (currentState === "confirmDefense") {
        return (
          this.isCurrentPlayerActive() ||
          this.checkAction("playDefenseCard", true) ||
          this.checkAction("passDefense", true)
        );
      }
      if (
        currentState === "secretAllianceAttackerChoice" ||
        currentState === "secretAllianceTargetChoice"
      ) {
        // Secret Alliance crosses an active-player handoff. Under the migrated
        // wrapper, local active/checkAction helpers can lag behind the visual
        // state and make the current chooser's Action hand appear dead.
        // Keep these dedicated choice states selectable and let the server
        // validate the actual submit.
        return true;
      }
      return false;
    },

    refreshActionCardReadinessVisuals: function (stateName, args) {
      const root = dojo.byId("myactioncards");
      if (!root) return;
      const currentState = String(
        stateName || this.getCurrentStateName() || ""
      );
      const stateArgs = this.resolveStateArgsForReadiness(args);
      const believerSelectionPhase = this.shouldBelieverHandBeReady(
        currentState,
        stateArgs
      );
      const applyInitialSkillDraftDimming = currentState === "chooseInitialSkill";
      const isActionDiscardSelectionPhase =
        currentState === "playerTurn" &&
        this.isCurrentPlayerActive() &&
        (this.isDiscardMode ||
          (!!this.pendingAction &&
            this.pendingAction.cardKey === "divine_inspire" &&
            !this.actionSubmissionInFlight));
      const skillState =
        this.getSkillStateFromArgs(stateArgs) || this.mySkillState || null;
      const praiseLifeUsedThisTurn =
        this.isPraiseLifeUsedThisTurnForCurrentPlayer(skillState);
      const attackLockedByKarboom =
        parseInt(
          (skillState && skillState.attack_locked_by_karboom) || 0,
          10
        ) === 1 &&
        parseInt((skillState && skillState.karboom_used_this_turn) || 0, 10) ===
          1;
      const applyTurnMaskDimming =
        currentState === "playerTurn" &&
        this.isCurrentPlayerActive() &&
        !isActionDiscardSelectionPhase &&
        !believerSelectionPhase;
      const applyDefenseStandbyDimming =
        currentState === "playerTurn" &&
        this.isCurrentPlayerActive() &&
        !isActionDiscardSelectionPhase &&
        !believerSelectionPhase;
      const applyNoActionSlotsDimming =
        currentState === "playerTurn" &&
        this.isCurrentPlayerActive() &&
        !isActionDiscardSelectionPhase &&
        !this.hasRemainingActionSlotsThisTurn();
      const applyDefenseFocusDimming =
        currentState === "confirmDefense" &&
        (this.isCurrentPlayerActive() ||
          this.checkAction("passDefense", true) ||
          this.checkAction("playDefenseCard", true));
      const defenseKindForReadiness =
        currentState === "confirmDefense"
          ? this.getCurrentDefenseKindFromContext()
          : "";
      const applyDefenseWaitingDimming =
        currentState === "confirmDefense" && !applyDefenseFocusDimming;
      const applyBreakingFaithTargetDimming =
        currentState === "playerTurn" &&
        this.isCurrentPlayerActive() &&
        !isActionDiscardSelectionPhase &&
        !believerSelectionPhase;
      const targetRequiredCards = {
        witch_hunt: 1,
        spread_rumors: 1,
        faith_debate: 1,
        faith_war: 1,
        info_spy: 1,
        secret_alliance: 1,
        kowtow_to_me: 1,
        breaking_faith: 1,
      };
      const defenseStandbyCardMap = {
        great_mercy: 1,
        firm_faith: 1,
      };
      const defenseFocusCardMap = {};
      if (applyDefenseFocusDimming) {
        // During confirmDefense, keep only the required defense card enabled.
        const expectedDefenseCardKey = this.getExpectedDefenseCardKey(
          defenseKindForReadiness
        );
        defenseFocusCardMap[String(expectedDefenseCardKey)] = 1;
      }

      dojo.query(".stockitem", root).forEach(
        function (node) {
          dojo.removeClass(node, "action-card-soft-disabled");
          const cardKey = this.getActionCardKeyFromStockNode(node);
          if (!cardKey) return;
          if (
            applyDefenseFocusDimming &&
            !defenseFocusCardMap[String(cardKey)]
          ) {
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (applyDefenseWaitingDimming) {
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (applyInitialSkillDraftDimming) {
            // During opening-skill draft, action cards are view-only.
            // Keep hover/tooltip available but prevent selectable affordance.
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (believerSelectionPhase) {
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (
            applyDefenseStandbyDimming &&
            defenseStandbyCardMap[String(cardKey)]
          ) {
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (applyNoActionSlotsDimming) {
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (
            applyBreakingFaithTargetDimming &&
            targetRequiredCards[String(cardKey)] &&
            !this.hasSelectableTargetPlayerForCard(cardKey)
          ) {
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (!applyTurnMaskDimming) return;
          const actionTypeMask = this.getActionTypeMaskFromCardType(cardKey);
          if (!actionTypeMask) return;
          if (
            attackLockedByKarboom &&
            (actionTypeMask === 0b00100 || actionTypeMask === 0b00010)
          ) {
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (
            !praiseLifeUsedThisTurn &&
            (this.currentTurnActionMask & actionTypeMask) !== 0
          ) {
            dojo.addClass(node, "action-card-soft-disabled");
          }
        }.bind(this)
      );
    },

    refreshBelieverCardReadinessVisuals: function (stateName, args) {
      const root = dojo.byId("mybelievercards");
      if (!root) return;
      const isReady = this.shouldBelieverHandBeReady(stateName, args);
      if (this.playerBelieverCards && this.playerBelieverCards.setSelectionMode) {
        this.playerBelieverCards.setSelectionMode(isReady ? 1 : 0);
      }
      dojo.query(".stockitem", root).forEach(function (node) {
        dojo.removeClass(node, "believer-card-ready");
        dojo.removeClass(node, "believer-card-waiting");
        dojo.addClass(
          node,
          isReady ? "believer-card-ready" : "believer-card-waiting"
        );
      });
      if (isReady) {
        this.tryRestorePreferredDuelBelieverSelection(stateName);
      }
    },

    refreshHandCardReadinessVisuals: function (stateName, args) {
      this.refreshActionCardReadinessVisuals(stateName, args);
      this.refreshBelieverCardReadinessVisuals(stateName, args);
    },

    getAoeCommitPromptText: function (actionKey) {
      const isAssigned = this.currentAoeAssignedAction === actionKey;
      const warType = parseInt(
        (this.gamedatas &&
          this.gamedatas.combat_context &&
          this.gamedatas.combat_context.war_type) ||
          0,
        10
      );
      if (actionKey === "martyrdom") {
        return isAssigned
          ? _(
              "You were assigned by your Leader to Martyrdom. Choose one Believer and click Confirm."
            )
          : _("Martyrdom: choose one Believer and click Confirm.");
      }
      if (actionKey === "conspiracy" && warType === 11) {
        return _(
          "Final Struggle (Conspiracy): choose one Believer and click Confirm."
        );
      }
      return isAssigned
        ? _(
            "You were assigned by your Leader to Conspiracy. Choose one Believer and click Confirm."
          )
        : _("Conspiracy: choose one Believer and click Confirm.");
    },

    getAoeWaitingPromptText: function (actionKey) {
      const warType = parseInt(
        (this.gamedatas &&
          this.gamedatas.combat_context &&
          this.gamedatas.combat_context.war_type) ||
          0,
        10
      );
      if (actionKey === "conspiracy" && warType === 11) {
        return _(
          "Final Struggle (Conspiracy): waiting for contenders to choose one Believer."
        );
      }
      const myId = parseInt(this.player_id || 0, 10);
      if (
        this.currentAoeDefendedPlayerIds[String(myId)] ||
        this.hasCurrentPlayerSectDefendedInAoe()
      ) {
        return _(
          "Your Sect is already defended. Waiting for other Sects to act."
        );
      }

      const attackerId = parseInt(
        this.currentAoeAttackerId ||
          (this.gamedatas &&
            this.gamedatas.combat_context &&
            this.gamedatas.combat_context.war_attacker_id) ||
          0,
        10
      );
      if (
        myId > 0 &&
        attackerId === myId &&
        this.hasAoeCommittedBelieverByPlayer(myId)
      ) {
        return actionKey === "martyrdom"
          ? _(
              "Martyrdom: your Believer is committed. Please wait for other players to defend or choose."
            )
          : _(
              "Conspiracy: your Believer is committed. Please wait for other players to defend or choose."
            );
      }

      return _("Waiting for each chosen representative to choose a Believer.");
    },

    syncAoeDefendersChooseState: function (notifArgs, actionKey, stateName) {
      const args = notifArgs || {};
      this.currentAoeCommitTargetIds = Array.isArray(args.target_ids)
        ? args.target_ids.map(function (v) {
            return parseInt(v || 0, 10);
          })
        : [];
      this.syncAoeRepresentativeLabelsFromTargetIds(
        this.currentAoeCommitTargetIds
      );
      const myId = parseInt(this.player_id || 0, 10);
      if (this.currentAoeCommitTargetIds.indexOf(myId) === -1) {
        this.currentAoeAssignedAction = "";
      }
      if (this.getCurrentStateName() !== stateName) return;
      const canCommitBeliever = this.canCurrentPlayerCommitAoeBeliever(args);
      this.setTopInstruction(
        canCommitBeliever
          ? this.getAoeCommitPromptText(actionKey)
          : this.getAoeWaitingPromptText(actionKey)
      );
      this.onUpdateActionButtons(
        stateName,
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args) ||
          {}
      );
    },

    handleAoeBelieverCommitted: function (notifArgs, actionKey) {
      const args = notifArgs || {};
      this.syncAoeAnchorFromNotif(actionKey, args);
      if (String(args.player_id || "") === String(this.player_id || "")) {
        const myId = parseInt(this.player_id || 0, 10);
        this.actionSubmissionInFlight = false;
        this.playerBelieverCards.removeFromStockById(args.card_id);
        this.playerBelieverCards.unselectAll();
        this.currentAoeAssignedAction = "";
        this.currentAoeCommitTargetIds = (
          this.currentAoeCommitTargetIds || []
        ).filter(
          function (v) {
            return parseInt(v || 0, 10) !== parseInt(this.player_id || 0, 10);
          }.bind(this)
        );
        if (
          this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args &&
          Array.isArray(this.gamedatas.gamestate.args.target_ids)
        ) {
          this.gamedatas.gamestate.args.target_ids =
            this.gamedatas.gamestate.args.target_ids
              .map(function (v) {
                return parseInt(v || 0, 10);
              })
              .filter(function (v) {
                return v > 0 && v !== myId;
              });
        }
        this.setTopInstruction(this.getAoeWaitingPromptText(actionKey));
        dojo.removeClass("mybelievercards", "highlight_stock");
        this.clearPendingActionButtons();
        const expectedStateName =
          actionKey === "martyrdom"
            ? "martyrdomChooseBelievers"
            : "conspiracyChooseBelievers";
        if (this.getCurrentStateName() === expectedStateName) {
          this.onUpdateActionButtons(
            expectedStateName,
            (this.gamedatas &&
              this.gamedatas.gamestate &&
              this.gamedatas.gamestate.args) ||
              {}
          );
        }
      }
      const countElem = dojo.byId("table_believer_count_" + args.player_id);
      if (countElem) {
        countElem.innerHTML = String(
          Math.max(0, parseInt(countElem.innerHTML || "0", 10) - 1)
        );
      }
      this.addCombatCommitToArena({
        player_id: args.player_id,
        player_name: args.player_name,
        sect_id: args.sect_id,
        card_id: args.card_id,
        card_type: args.card_type,
        card_kind: "believer",
        is_attacker_representative: args.is_attacker_representative,
        facedown: true,
      });
    },

    clearAoeCommitTransientState: function () {
      this.currentAoeCommitTargetIds = [];
      this.currentAoeAssignedAction = "";
      this.currentAoeDefendedPlayerIds = {};
      this.currentAoeDefendedSectIds = {};
    },

    syncDuelCommittedBeliever: function (notifArgs, duelStateName) {
      const args = notifArgs || {};
      const fromGraveyard = parseInt(args.from_graveyard || 0, 10) === 1;
      if (String(args.player_id || "") === String(this.player_id || "")) {
        this.hasCommittedDuelBelieverThisRound = true;
        this.actionSubmissionInFlight = false;
        this.clearPreferredDuelBelieverSelection();
        this.playerBelieverCards.removeFromStockById(args.card_id);
        this.playerBelieverCards.unselectAll();
        dojo.removeClass("mybelievercards", "highlight_stock");
        this.clearPendingActionButtons();
        if (this.getCurrentStateName() === duelStateName) {
          this.setTopInstruction(
            _("Believer submitted. Waiting for confrontation to continue.")
          );
          this.onUpdateActionButtons(
            duelStateName,
            (this.gamedatas &&
              this.gamedatas.gamestate &&
              this.gamedatas.gamestate.args) ||
              {}
          );
        }
      }
      const countElem = dojo.byId("table_believer_count_" + args.player_id);
      // Zombie Army can commit a Believer from graveyard in Faith War.
      // In that case the player's hand Believer count must not be decremented.
      if (countElem && !fromGraveyard) {
        countElem.innerHTML = String(
          Math.max(0, parseInt(countElem.innerHTML || "0", 10) - 1)
        );
      }
      this.renderFaithWarFaceDownCard(args.player_id, args.player_name);
      if (fromGraveyard) {
        if (typeof args.graveyard_cards !== "undefined") {
          this.setGraveyardCardsSnapshot(args.graveyard_cards);
        }
        if (typeof args.graveyard_count !== "undefined") {
          this.updateGraveyardCount(0, parseInt(args.graveyard_count || 0, 10));
        }
      }
    },

    scheduleDuelRoundCleanup: function (minDelayMs) {
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
      }
      const delayMs = Math.max(
        this.getCombatResultHoldMs(),
        Math.max(0, parseInt(minDelayMs || 0, 10) || 0)
      );
      this.faithWarCleanupTimeout = setTimeout(
        function () {
          this.clearFaithWarRoundCards();
          this.faithWarCleanupTimeout = null;
        }.bind(this),
        delayMs
      );
    },

    applyDuelResultVisualAndLog: function (notifArgs, duelMode, resultBonus) {
      const args = notifArgs || {};
      const mode = duelMode === "debate" ? "debate" : "war";
      if (typeof args.reverse_karma_active !== "undefined") {
        this.setReverseKarmaContext(
          parseInt(args.reverse_karma_active || 0, 10),
          parseInt(args.reverse_karma_owner_id || 0, 10),
          args.reverse_karma_stack_owner_ids || []
        );
      }
      const resultType = String(args.result_type || "draw");
      const resultVisual = this.getHeadToHeadResultVisual(resultType, mode);
      const cardAType =
        args.card_a && typeof args.card_a.type !== "undefined"
          ? args.card_a.type
          : 1;
      const cardBType =
        args.card_b && typeof args.card_b.type !== "undefined"
          ? args.card_b.type
          : 1;

      const attackerRevealMs = this.revealFaithWarCard(
        args.attacker_id,
        cardAType,
        resultVisual.attackerLabel
      );
      const defenderRevealMs = this.revealFaithWarCard(
        args.defender_id,
        cardBType,
        resultVisual.defenderLabel
      );
      const revealDurationMs = Math.max(
        parseInt(attackerRevealMs || 0, 10),
        parseInt(defenderRevealMs || 0, 10)
      );

      const attackerSlot = this.getFaithWarPlayerSlotNode(args.attacker_id);
      const defenderSlot = this.getFaithWarPlayerSlotNode(args.defender_id);
      this.clearCombatResultStateClass(attackerSlot);
      this.clearCombatResultStateClass(defenderSlot);
      this.applyCombatResultStateClass(
        attackerSlot,
        resultVisual.attackerState
      );
      this.applyCombatResultStateClass(
        defenderSlot,
        resultVisual.defenderState
      );

      this.pushFaithWarLogEntry({
        attacker_name: args.attacker_name || _("Attacker"),
        defender_name: args.defender_name || _("Defender"),
        card_a: args.card_a || null,
        card_b: args.card_b || null,
        result_type: resultType,
        result_bonus: !!resultBonus,
      });
      this.lastDuelRevealAt = Date.now();
      return {
        resultType: resultType,
        visual: resultVisual,
        revealDurationMs: revealDurationMs,
      };
    },

    mapDebateReturnCardSourcesForCurrentPlayer: function (args) {
      const aCardId = parseInt(
        (args && args.card_a && args.card_a.id) || 0,
        10
      );
      const bCardId = parseInt(
        (args && args.card_b && args.card_b.id) || 0,
        10
      );
      if (aCardId <= 0 || bCardId <= 0) return;

      const attackerOwnerId = parseInt((args && args.attacker_id) || 0, 10);
      const defenderOwnerId = parseInt((args && args.defender_id) || 0, 10);
      const myId = parseInt(this.player_id || 0, 10);
      if (myId <= 0) return;

      const resultType = String((args && args.result_type) || "draw");
      const leftAnchor = "faithwar_slot_left";
      const rightAnchor = "faithwar_slot_right";

      if (resultType === "attacker") {
        if (myId === attackerOwnerId) {
          this.pendingBelieverSourceByCardId[String(aCardId)] = leftAnchor;
          this.pendingBelieverSourceByCardId[String(bCardId)] = rightAnchor;
        }
        return;
      }

      if (resultType === "defender") {
        if (myId === defenderOwnerId) {
          this.pendingBelieverSourceByCardId[String(aCardId)] = leftAnchor;
          this.pendingBelieverSourceByCardId[String(bCardId)] = rightAnchor;
        }
        return;
      }

      // draw: each representative keeps their own committed believer
      if (myId === attackerOwnerId) {
        this.pendingBelieverSourceByCardId[String(aCardId)] = leftAnchor;
      }
      if (myId === defenderOwnerId) {
        this.pendingBelieverSourceByCardId[String(bCardId)] = rightAnchor;
      }
    },

    mapWarSurvivorReturnCardSourceForCurrentPlayer: function (args) {
      const myId = parseInt(this.player_id || 0, 10);
      if (myId <= 0) return;

      const resultType = String((args && args.result_type) || "draw");
      const attackerOwnerId = parseInt((args && args.attacker_id) || 0, 10);
      const defenderOwnerId = parseInt((args && args.defender_id) || 0, 10);
      const aCardId = parseInt(
        (args && args.card_a && args.card_a.id) || 0,
        10
      );
      const bCardId = parseInt(
        (args && args.card_b && args.card_b.id) || 0,
        10
      );
      const attackerFromGrave =
        parseInt((args && args.attacker_from_graveyard) || 0, 10) === 1;
      const defenderFromGrave =
        parseInt((args && args.defender_from_graveyard) || 0, 10) === 1;

      if (resultType === "attacker") {
        if (!attackerFromGrave && myId === attackerOwnerId && aCardId > 0) {
          this.pendingBelieverSourceByCardId[String(aCardId)] =
            "faithwar_slot_left";
        }
        return;
      }

      if (resultType === "defender") {
        if (!defenderFromGrave && myId === defenderOwnerId && bCardId > 0) {
          this.pendingBelieverSourceByCardId[String(bCardId)] =
            "faithwar_slot_right";
        }
      }
    },

    clearDeferredFaithWarResultIfNeeded: function () {
      if (!this.deferFaithWarResultClearOnNextAction) return;
      this.deferFaithWarResultClearOnNextAction = false;
      this.resetFaithWarLog();
      this.clearFaithWarRoundCards();
      this.clearFaithWarArena("");
    },

    beginCenterActionDiscardTracking: function (
      cardType,
      cardId,
      ownerId,
      forceReset
    ) {
      const key =
        String(cardType || "") +
        "|" +
        String(cardId || "") +
        "|" +
        String(ownerId || "");
      if (forceReset || this.currentCenterActionDiscardKey !== key) {
        this.currentCenterActionDiscardKey = key;
        this.currentCenterActionHadDefenseDiscard = false;
      }
    },

    showCenterActionCard: function (cardType, cardId, opts) {
      const options = opts || {};
      if (this.pendingCenterActionDiscardTimeout) {
        clearTimeout(this.pendingCenterActionDiscardTimeout);
        this.pendingCenterActionDiscardTimeout = null;
      }
      if (options.replaceExistingWithoutDiscard) {
        const existingCenterAction = dojo.byId("current_center_action_card");
        if (existingCenterAction) {
          dojo.destroy(existingCenterAction);
        }
      } else {
        this.moveCurrentCenterActionToDiscard();
      }
      const arena = dojo.byId("central_arena");
      if (!arena) return;
      const spriteOffset = this.getActionCardSpriteIndex(cardType);
      dojo.place(
        `<div id="current_center_action_card" data-card-type="${cardType}" data-card-id="${
          cardId || ""
        }" class="center-action-wrap">` +
          `<div id="center_action_card_face" class="card table_card_item card-action center-action-card" data-index="${spriteOffset}"></div>` +
          `</div>`,
        arena
      );
      const centerNode = dojo.byId("center_action_card_face");
      if (centerNode) {
        this.attachActionCardTooltip(centerNode, cardType);
        if (options.hideFaceUntilFlightEnd) {
          dojo.style(centerNode, "visibility", "hidden");
          dojo.addClass(centerNode, "center-action-card-hidden-until-flight");
        } else {
          dojo.style(centerNode, "visibility", "visible");
          dojo.removeClass(centerNode, "center-action-card-hidden-until-flight");
        }
      }
      this.beginCenterActionDiscardTracking(cardType, cardId || "", 0, true);
    },

    revealCenterActionCardFace: function () {
      const centerNode = dojo.byId("center_action_card_face");
      if (!centerNode) return;
      dojo.style(centerNode, "visibility", "visible");
      dojo.removeClass(centerNode, "center-action-card-hidden-until-flight");
    },

    normalizeGraveyardCards: function (cards) {
      let list = [];
      if (Array.isArray(cards)) {
        list = cards.slice();
      } else if (cards && typeof cards === "object") {
        list = Object.values(cards);
      }
      list = list.filter(function (card) {
        return card && typeof card.type !== "undefined";
      });

      const seen = {};
      return list.filter(function (card) {
        const key = String(card.id || "");
        if (!key) return true;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
    },

    getActualGraveyardCount: function () {
      return Math.max(0, parseInt(this.graveyardActualCount || 0, 10) || 0);
    },

    isZombieGraveyardConcealedForUi: function () {
      const ctx = (this.gamedatas && this.gamedatas.combat_context) || {};
      if (parseInt(ctx.war_type || 0, 10) !== 2) return false;
      if (parseInt(ctx.war_zombie_owner_id || 0, 10) <= 0) return false;
      return parseInt(ctx.war_zombie_snapshot_max_discard_arg || 0, 10) > 0;
    },

    getVisibleGraveyardCardsForUi: function () {
      const actualCount = this.getActualGraveyardCount();
      const all = this.normalizeGraveyardCards(this.graveyardCards).slice(
        0,
        actualCount
      );
      if (!this.isZombieGraveyardConcealedForUi()) {
        return all;
      }
      const snapshotMax = this.getZombieSnapshotMaxDiscardArg();
      return all.filter(function (card) {
        const arg = parseInt((card && card.location_arg) || 0, 10);
        return arg > snapshotMax;
      });
    },

    refreshGraveyardCountDisplayForUi: function () {
      const graveyardElem = dojo.byId("graveyard_count");
      if (!graveyardElem) return;
      graveyardElem.innerHTML = String(
        this.getVisibleGraveyardCardsForUi().length
      );
    },

    getLiveGraveyardCount: function () {
      return this.getActualGraveyardCount();
    },

    // Backward-compatible alias used by existing action/skill UI checks.
    getVisibleGraveyardCount: function () {
      return this.getVisibleGraveyardCardsForUi().length;
    },

    renderGraveyardPreview: function () {
      const wrap = dojo.byId("graveyard_cards");
      const graveyard = dojo.byId("graveyard");
      if (!wrap || !graveyard) return;
      wrap.innerHTML = "";

      const visibleCards = this.getVisibleGraveyardCardsForUi();
      const visibleCount = visibleCards.length;
      this.refreshGraveyardCountDisplayForUi();
      const previewCount = Math.max(0, Math.min(3, visibleCount));
      if (previewCount > 0) {
        dojo.addClass(graveyard, "has_cards");
      } else {
        dojo.removeClass(graveyard, "has_cards");
      }

      if (this.isZombieGraveyardConcealedForUi() && visibleCount <= 0) {
        dojo.create(
          "div",
          {
            className: "graveyard-preview-note",
            innerHTML: _("Believers have been summoned to war."),
          },
          wrap
        );
      }

      for (let index = 0; index < previewCount; index++) {
        const card = visibleCards[index] || null;
        const posClass = "graveyard_preview_pos_" + index;
        if (card && typeof card.type !== "undefined") {
          const node = dojo.create(
            "div",
            {
              className: "graveyard_preview_card card-believer " + posClass,
              "data-index": String(card.type),
            },
            wrap
          );
          this.attachBelieverTooltip(node, parseInt(card.type, 10));
        }
      }
    },

    onGraveyardClicked: function () {
      const stateName =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.name) ||
        "";
      if (
        stateName === "faithWarDuel" &&
        this.isCurrentPlayerActive() &&
        this.canCurrentPlayerUseZombieArmyFromGrave()
      ) {
        this.showZombieGravePickerModal();
        return;
      }
      this.showGraveyardModal();
    },

    clearZombieGraveSelection: function () {
      this.selectedZombieGraveCardId = 0;
      this.selectedZombieGraveCardType = 0;
    },

    getZombieGraveSelectionCard: function () {
      const selectedId = parseInt(this.selectedZombieGraveCardId || 0, 10);
      if (!selectedId) return null;
      const list = this.getZombieEligibleGraveyardCards();
      for (let i = 0; i < list.length; i++) {
        const card = list[i];
        if (parseInt(card.id || 0, 10) === selectedId) {
          return card;
        }
      }
      return null;
    },

    ensureZombieGraveSelectionStillValid: function () {
      const card = this.getZombieGraveSelectionCard();
      if (card) return true;
      this.clearZombieGraveSelection();
      return false;
    },

    closeZombieGravePickerModal: function () {
      const existing = dojo.byId("zombie_grave_picker_overlay");
      if (existing) {
        dojo.destroy(existing);
      }
    },

    selectZombieGraveCardAndClose: function (card) {
      if (!card || !card.id) return;
      this.selectedZombieGraveCardId = parseInt(card.id, 10);
      this.selectedZombieGraveCardType = parseInt(card.type || 0, 10);
      this.playerBelieverCards.unselectAll();
      this.closeZombieGravePickerModal();
      this.showMessage(
        dojo.string.substitute(
          _("Selected graveyard Believer: ${believer_label}"),
          {
            believer_label: this.formatBelieverTypeLabel(
              this.selectedZombieGraveCardType
            ),
          }
        ),
        "info"
      );
      const stateName =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.name) ||
        "";
      if (stateName === "faithWarDuel") {
        this.onUpdateActionButtons(
          stateName,
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.args) ||
            {}
        );
      }
    },

    showZombieGravePickerModal: function () {
      this.closeZombieGravePickerModal();
      if (!this.canCurrentPlayerUseZombieArmyFromGrave()) {
        this.showMessage(
          _("Zombie Army graveyard selection is not available now."),
          "error"
        );
        return;
      }

      const knownCards = this.getZombieEligibleGraveyardCards();
      if (!knownCards.length) {
        this.showMessage(_("No graveyard Believer is available."), "error");
        return;
      }

      const overlay = dojo.create("div", {
        id: "zombie_grave_picker_overlay",
        className: "spy-modal-overlay",
      });
      const modal = dojo.create(
        "div",
        { className: "spy-modal graveyard-modal" },
        overlay
      );
      const head = dojo.create("div", { className: "spy-modal-head" }, modal);
      dojo.create(
        "div",
        {
          className: "spy-modal-title",
          innerHTML: dojo.string.substitute(
            _("Zombie Army: choose one graveyard Believer (${count})"),
            {
              count: knownCards.length,
            }
          ),
        },
        head
      );
      const closeBtn = dojo.create(
        "button",
        {
          innerHTML: _("Cancel"),
          className: "bgabutton bgabutton_red",
        },
        head
      );
      dojo.connect(closeBtn, "onclick", this, "closeZombieGravePickerModal");

      const hint = dojo.create(
        "div",
        {
          className: "graveyard-modal-empty",
          innerHTML: _(
            "Click one graveyard Believer card to use in this Faith War round."
          ),
        },
        modal
      );
      dojo.style(hint, "paddingTop", "0");

      const strip = dojo.create(
        "div",
        { className: "graveyard-modal-strip" },
        modal
      );

      const selectedId = parseInt(this.selectedZombieGraveCardId || 0, 10);
      knownCards.forEach(
        function (card) {
          const id = parseInt(card.id || 0, 10);
          const mini = dojo.create(
            "div",
            {
              className:
                "card card-believer graveyard-modal-card zombie-grave-select-card" +
                (id === selectedId ? " is-selected" : ""),
              "data-index": String(card.type),
            },
            strip
          );
          this.attachBelieverTooltip(mini, parseInt(card.type, 10));
          dojo.connect(mini, "onclick", this, function (evt) {
            if (evt) dojo.stopEvent(evt);
            this.selectZombieGraveCardAndClose(card);
          });
        }.bind(this)
      );

      dojo.connect(overlay, "onclick", this, function (evt) {
        if (evt && evt.target === overlay) {
          this.closeZombieGravePickerModal();
        }
      });
      dojo.place(overlay, "game_play_area");
    },

    closeGraveyardModal: function () {
      const existing = dojo.byId("graveyard_modal_overlay");
      if (existing) {
        dojo.destroy(existing);
      }
    },

    showGraveyardModal: function () {
      this.closeGraveyardModal();
      const knownCards = this.getVisibleGraveyardCardsForUi();
      const liveCount = knownCards.length;
      const concealed = this.isZombieGraveyardConcealedForUi();

      const overlay = dojo.create("div", {
        id: "graveyard_modal_overlay",
        className: "spy-modal-overlay",
      });
      const modal = dojo.create(
        "div",
        { className: "spy-modal graveyard-modal" },
        overlay
      );
      const head = dojo.create("div", { className: "spy-modal-head" }, modal);
      dojo.create(
        "div",
        {
          className: "spy-modal-title",
          innerHTML: dojo.string.substitute(_("Graveyard (${count} cards)"), {
            count: liveCount,
          }),
        },
        head
      );
      const closeBtn = dojo.create(
        "button",
        {
          innerHTML: _("Close"),
          className: "bgabutton bgabutton_white",
        },
        head
      );
      dojo.connect(closeBtn, "onclick", this, "closeGraveyardModal");

      const strip = dojo.create(
        "div",
        { className: "graveyard-modal-strip" },
        modal
      );

      if (!liveCount) {
        dojo.create(
          "div",
          {
            className: "graveyard-modal-empty",
            innerHTML: concealed
              ? _("Believers have been summoned to war.")
              : _("No Believers yet."),
          },
          strip
        );
      } else {
        knownCards.forEach(
          function (card) {
            const mini = dojo.create(
              "div",
              {
                className: "card card-believer graveyard-modal-card",
                "data-index": String(card.type),
              },
              strip
            );
            this.attachBelieverTooltip(mini, parseInt(card.type, 10));
          }.bind(this)
        );
      }

      dojo.connect(overlay, "onclick", this, function (evt) {
        if (evt && evt.target === overlay) {
          this.closeGraveyardModal();
        }
      });
      dojo.place(overlay, "game_play_area");
    },

    closeSpyResultModal: function () {
      const existing = dojo.byId("spy_result_modal_overlay");
      if (existing) {
        dojo.destroy(existing);
      }
    },

    buildSpyGroupedCounts: function (cards, cardKind) {
      const grouped = {};
      (cards || []).forEach(
        function (card) {
          if (!card) return;
          if (cardKind === "action") {
            const key = String(card.type || "");
            if (!key) return;
            if (!grouped[key]) {
              grouped[key] = {
                key: key,
                name: this.getActionCardDisplayName(key),
                count: 0,
                cardKind: "action",
              };
            }
            grouped[key].count += 1;
            return;
          }
          const type = parseInt(card.type || 0, 10);
          if (!type) return;
          const key = String(type);
          if (!grouped[key]) {
            grouped[key] = {
              key: key,
              name: this.formatBelieverTypeLabel(type),
              count: 0,
              cardKind: "believer",
              believerType: type,
            };
          }
          grouped[key].count += 1;
        }.bind(this)
      );
      return Object.values(grouped).sort(function (a, b) {
        if (a.cardKind === "believer" && b.cardKind === "believer") {
          return (a.believerType || 0) - (b.believerType || 0);
        }
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
    },

    showSpyResultModal: function (targetName, actionCards, believerCards) {
      this.closeSpyResultModal();
      const overlay = dojo.create("div", {
        id: "spy_result_modal_overlay",
        className: "spy-modal-overlay",
      });
      // Place overlay first so tooltip binding sees live DOM nodes.
      dojo.place(overlay, "game_play_area");
      const modal = dojo.create("div", { className: "spy-modal" }, overlay);
      const head = dojo.create("div", { className: "spy-modal-head" }, modal);
      dojo.create(
        "div",
        {
          className: "spy-modal-title",
          innerHTML: dojo.string.substitute(
            _("Info Spy Result: ${target_name}"),
            {
              target_name: targetName || _("Player"),
            }
          ),
        },
        head
      );
      const closeBtn = dojo.create(
        "button",
        {
          innerHTML: _("Close"),
          className: "bgabutton bgabutton_white",
        },
        head
      );
      dojo.connect(closeBtn, "onclick", this, "onCloseSpyResultModalClicked");

      const actionSection = dojo.create(
        "div",
        { className: "spy-modal-section" },
        modal
      );
      dojo.create(
        "h4",
        {
          innerHTML: dojo.string.substitute(_("Action Cards (${count})"), {
            count: (actionCards || []).length,
          }),
        },
        actionSection
      );
      const actionGrouped = this.buildSpyGroupedCounts(actionCards, "action");
      const actionWrap = dojo.create(
        "div",
        { className: "spy-modal-action-list" },
        actionSection
      );
      actionGrouped.forEach(
        function (entry) {
          const line = dojo.create(
            "div",
            {
              className: "spy-modal-action-line",
            },
            actionWrap
          );
          const thumb = dojo.create(
            "div",
            {
              className: "spy-modal-card card card-action",
              "data-index": this.getActionCardSpriteIndex(entry.key),
            },
            line
          );
          this.attachActionCardTooltip(thumb, entry.key);
          this.attachActionCardTooltip(line, entry.key);
          const actionTitle =
            this.getActionCardDisplayName(entry.key) +
            ": " +
            this.getActionCardEffectText(entry.key);
          dojo.attr(thumb, "title", actionTitle);
          dojo.attr(line, "title", actionTitle);
          dojo.create(
            "div",
            {
              className: "spy-modal-action-name",
              innerHTML: this.escapeHtml(String(entry.name || "")),
            },
            line
          );
          dojo.create(
            "div",
            {
              className: "spy-modal-action-count",
              innerHTML: "+" + String(parseInt(entry.count || 0, 10)),
            },
            line
          );
        }.bind(this)
      );
      if (!actionGrouped.length) {
        dojo.create("div", { innerHTML: _("None") }, actionSection);
      }

      const believerSection = dojo.create(
        "div",
        { className: "spy-modal-section" },
        modal
      );
      dojo.create(
        "h4",
        {
          innerHTML: dojo.string.substitute(_("Believers (${count})"), {
            count: (believerCards || []).length,
          }),
        },
        believerSection
      );
      const believerGrouped = this.buildSpyGroupedCounts(
        believerCards,
        "believer"
      );
      const believerWrap = dojo.create(
        "div",
        { className: "spy-modal-believer-grid" },
        believerSection
      );
      believerGrouped.forEach(
        function (entry) {
          const item = dojo.create(
            "div",
            {
              className: "spy-modal-believer-item",
            },
            believerWrap
          );
          const card = dojo.create(
            "div",
            {
              className: "spy-modal-card card card-believer",
              "data-index": parseInt(entry.believerType || 0, 10),
            },
            item
          );
          this.attachBelieverTooltip(card, entry.believerType || 0);
          this.attachBelieverTooltip(item, entry.believerType || 0);
          const believerType = parseInt(entry.believerType || 0, 10);
          const believerTitle = this.formatBelieverTypeLabel(believerType);
          dojo.attr(card, "title", believerTitle);
          dojo.attr(item, "title", believerTitle);
          dojo.create(
            "div",
            {
              className: "spy-modal-believer-count",
              innerHTML: "+" + String(parseInt(entry.count || 0, 10)),
            },
            item
          );
        }.bind(this)
      );
      if (!believerGrouped.length) {
        dojo.create("div", { innerHTML: _("None") }, believerSection);
      }

      dojo.connect(overlay, "onclick", this, function (evt) {
        if (evt && evt.target === overlay) {
          this.onCloseSpyResultModalClicked();
        }
      });
    },

    syncGraveyardCardsFromCount: function () {
      const count = this.getLiveGraveyardCount();
      this.graveyardCards = this.normalizeGraveyardCards(
        this.graveyardCards
      ).slice(0, count);
      this.ensureZombieGraveSelectionStillValid();
      this.renderGraveyardPreview();
    },

    pushGraveyardCards: function (cards) {
      const incoming = this.normalizeGraveyardCards(cards);
      if (!incoming.length) return;
      this.graveyardCards = this.normalizeGraveyardCards(
        incoming.concat(this.graveyardCards || [])
      );
      this.syncGraveyardCardsFromCount();
    },

    setGraveyardCardsSnapshot: function (cards) {
      this.graveyardCards = this.normalizeGraveyardCards(cards);
      this.graveyardActualCount = this.graveyardCards.length;
      this.syncGraveyardCardsFromCount();
    },

    removeTopGraveyardCards: function (count) {
      const n = Math.max(0, parseInt(count || 0, 10));
      if (!n) return [];
      const normalized = this.normalizeGraveyardCards(this.graveyardCards);
      const removed = normalized.slice(0, n);
      this.graveyardCards = normalized.slice(n);
      this.syncGraveyardCardsFromCount();
      return removed;
    },

    animateBelieversFromPlayerToGraveyard: function (playerId, cards) {
      if (!cards || !cards.length) return;
      const pid = String(playerId || "");
      const source =
        pid === String(this.player_id || "")
          ? dojo.byId("mybelievercards")
          : dojo.byId("panel_" + pid) || dojo.byId("playertable_" + pid);
      const target = dojo.byId("graveyard");
      const root = dojo.byId("game_play_area");
      if (!source || !target || !root) return;
      if (
        !this.isNodeUsableForCardFlight(source) ||
        !this.isNodeUsableForCardFlight(target)
      ) {
        return;
      }

      const rootPos = dojo.position(root);
      const sourcePos = dojo.position(source);
      const baseLeft = sourcePos.x - rootPos.x + sourcePos.w / 2 - 24;
      const baseTop = sourcePos.y - rootPos.y + sourcePos.h / 2 - 34;
      const flyMs = this.getUnifiedCardFlyMs();
      const staggerMs = this.getUnifiedCardFlightStaggerMs();

      cards.forEach(
        function (card, idx) {
          const tempId =
            "witchhunt_fly_" +
            playerId +
            "_" +
            (card.id || idx) +
            "_" +
            Date.now();
          const type = parseInt(card.type || 1, 10);
          dojo.place(
            `<div id="${tempId}" class="card card-believer witchhunt-fly-card" data-index="${type}"></div>`,
            root
          );
          dojo.style(tempId, {
            position: "absolute",
            left: baseLeft + idx * 8 + "px",
            top: baseTop + idx * 6 + "px",
            zIndex: 2200,
          });
          setTimeout(
            function () {
              const anim = this.safeSlideToObject(tempId, target, flyMs);
              if (!anim) {
                dojo.destroy(tempId);
                return;
              }
              dojo.connect(anim, "onEnd", this, function () {
                dojo.destroy(tempId);
              });
              anim.play();
            }.bind(this),
            idx * staggerMs
          );
        }.bind(this)
      );
    },

    animateBelieverLossFromMyHandToPlayerAnchor: function (
      targetPlayerId,
      count
    ) {
      const n = Math.max(0, parseInt(count || 0, 10));
      if (!n) return;
      const targetId = this.resolvePlayerCardAnchorNodeId(
        targetPlayerId,
        "receive",
        "believer"
      );
      if (!targetId || !dojo.byId(targetId) || !dojo.byId("mybelievercards"))
        return;
      this.animateCardFlightBatch({
        sourceId: "mybelievercards",
        targetId: targetId,
        count: n,
        cap: 3,
        cardKind: "believer",
        duration: this.getUnifiedCardFlyMs(),
        startDelay: 0,
        delayStep: this.getUnifiedCardFlightStaggerMs(),
        fromScale: 1,
        toScale: 0.62,
        dataIndex: 0,
      });
    },

    animateRevivedBelieversToHand: function (cards) {
      if (!cards || !cards.length) return;
      cards.forEach(
        function (card, index) {
          this.animateTempCardFlight({
            tempId: "revive_anim_" + card.id + "_" + index,
            sourceId: "graveyard",
            targetId: "mybelievercards",
            cardClass: "graveyard_preview_card card-believer revive-fly-card",
            duration: this.getUnifiedCardFlyMs(),
            startDelay: index * this.getUnifiedCardFlightStaggerMs(),
            destroyOnEnd: true,
            dataIndex: parseInt(card.type || 0, 10),
            fromScale: 1,
            toScale: 1,
          });
        }.bind(this)
      );
    },

    getPlayerPublicAnchorNodeId: function (playerId) {
      return this.resolvePlayerCardAnchorNodeId(playerId, "public", "action");
    },

    getPlayerBelieverReceiveTargetNodeId: function (playerId) {
      return this.resolvePlayerCardAnchorNodeId(
        playerId,
        "receive",
        "believer"
      );
    },

    getPlayerActionReceiveTargetNodeId: function (playerId) {
      return this.resolvePlayerCardAnchorNodeId(playerId, "receive", "action");
    },

    animateTempCardFlight: function (spec) {
      const args = spec || {};
      const sourceId = args.sourceId || "";
      const targetId = args.targetId || "";
      const cardClass = args.cardClass || "card card-back-action";
      const duration = parseInt(
        args.duration || this.getUnifiedCardFlyMs(),
        10
      );
      const startDelay = parseInt(args.startDelay || 0, 10);
      const fromScale =
        typeof args.fromScale === "number" ? Number(args.fromScale) : 1;
      const toScale =
        typeof args.toScale === "number" ? Number(args.toScale) : 1;
      const dataIndex = parseInt(args.dataIndex || 0, 10);
      const providedTempId = String(args.tempId || "");
      const destroyOnEnd = args.destroyOnEnd !== false;
      const zIndex = parseInt(args.zIndex || 2350, 10);
      const callback =
        typeof args.onEnd === "function" ? args.onEnd.bind(this) : null;
      if (!sourceId || !targetId) return;
      const sourceNode = dojo.byId(sourceId);
      const targetNode = dojo.byId(targetId);
      if (!sourceNode || !targetNode) return;
      if (
        !this.isNodeUsableForCardFlight(sourceNode) ||
        !this.isNodeUsableForCardFlight(targetNode)
      ) {
        return;
      }

      let root = this.chooseCardFlightRoot(
        sourceNode,
        targetNode,
        args.rootId || "game_play_area"
      );
      if (!root) return;
      this.ensureCardFlightRootPositioned(root);

      const tempId =
        providedTempId ||
        "card_fly_" +
          Date.now().toString() +
          "_" +
          Math.floor(Math.random() * 1000000).toString();
      if (providedTempId && dojo.byId(tempId)) {
        dojo.destroy(tempId);
      }
      let html = `<div id="${tempId}" class="${cardClass} panel-fly-temp-card"`;
      if (dataIndex >= 0) {
        html += ` data-index="${dataIndex}"`;
      }
      html += "></div>";
      dojo.place(html, root);
      const sourcePos = this.getCardFlightSourcePositionInRoot(
        sourceNode,
        root
      );
      if (args.matchSourceSize === true) {
        this.lockTempCardSizeToNode(tempId, sourceNode, true);
      }
      const hideUntilStart = startDelay > 0 && args.hideUntilStart === true;
      dojo.style(tempId, {
        position: "absolute",
        left: sourcePos.left + "px",
        top: sourcePos.top + "px",
        zIndex: zIndex,
        visibility: hideUntilStart ? "hidden" : "visible",
        transform: "scale(" + fromScale + ")",
        transition: "transform " + duration + "ms ease",
      });

      let finished = false;
      const finalize = function () {
        if (finished) return;
        finished = true;
        if (callback) {
          callback(tempId);
        }
        if (destroyOnEnd) {
          dojo.destroy(tempId);
        }
      }.bind(this);

      const run = function () {
        const node = dojo.byId(tempId);
        if (!node) return;
        if (hideUntilStart) {
          dojo.style(node, "visibility", "visible");
        }
        setTimeout(function () {
          const n = dojo.byId(tempId);
          if (n) {
            dojo.style(n, "transform", "scale(" + toScale + ")");
          }
        }, 24);
        const anim = this.safeSlideToObject(tempId, targetId, duration);
        if (!anim) {
          finalize();
          return;
        }
        dojo.connect(anim, "onEnd", this, function () {
          finalize();
        });
        anim.play();
      }.bind(this);

      if (startDelay > 0) {
        setTimeout(run, startDelay);
      } else {
        run();
      }

      // Failsafe: if slide callback is lost/canceled, do not leave a ghost card behind.
      setTimeout(
        function () {
          finalize();
        }.bind(this),
        Math.max(180, startDelay + duration + 480)
      );
    },

    cleanupLingeringCardFlightTemps: function (cardKind) {
      const isBeliever = String(cardKind || "") === "believer";
      const className = isBeliever ? "card-back-believer" : "card-back-action";
      const root = dojo.byId("game_play_area");
      const selector =
        "[id^='card_fly_'].panel-fly-temp-card." + className;
      if (!root) return;
      dojo.query(selector, root).forEach(function (node) {
        dojo.destroy(node);
      });
    },

    safeSlideToObject: function (mobileObj, targetObj, duration, delay) {
      const sourceNode =
        typeof mobileObj === "string" ? dojo.byId(mobileObj) : mobileObj || null;
      const targetNode =
        typeof targetObj === "string" ? dojo.byId(targetObj) : targetObj || null;
      if (!sourceNode || !targetNode) return null;
      if (
        !this.isNodeUsableForCardFlight(sourceNode) ||
        !this.isNodeUsableForCardFlight(targetNode)
      ) {
        return null;
      }
      if (this.shouldUseAbsoluteCardFlight(sourceNode, targetNode)) {
        return this.createAbsoluteCardFlightAnimation(
          sourceNode,
          targetNode,
          duration,
          delay
        );
      }
      return this.slideToObject(mobileObj, targetObj, duration, delay);
    },

    animateCardNodeCloneToTarget: function (sourceNodeOrId, targetId, options) {
      const opts = options || {};
      const sourceNode =
        typeof sourceNodeOrId === "string"
          ? dojo.byId(sourceNodeOrId)
          : sourceNodeOrId;
      if (!sourceNode || !targetId || !dojo.byId(targetId)) return null;
      let root = this.chooseCardFlightRoot(
        sourceNode,
        dojo.byId(targetId),
        opts.rootId || "game_play_area"
      );
      if (!root) return null;
      this.ensureCardFlightRootPositioned(root);
      const sourcePos = this.getCardFlightSourcePositionInRoot(
        sourceNode,
        root
      );
      const tempId =
        String(opts.tempPrefix || "card_clone_fly") +
        "_" +
        Date.now().toString() +
        "_" +
        Math.floor(Math.random() * 1000000).toString();
      const sourceDataIndex =
        typeof opts.dataIndex !== "undefined"
          ? opts.dataIndex
          : dojo.attr(sourceNode, "data-index");
      let html =
        '<div id="' +
        tempId +
        '" class="' +
        String(opts.cardClass || sourceNode.className || "card") +
        '"';
      if (String(sourceDataIndex || "").length) {
        html += ' data-index="' + String(sourceDataIndex) + '"';
      }
      html += "></div>";
      dojo.place(html, root);
      dojo.style(tempId, {
        position: "absolute",
        left: sourcePos.left + "px",
        top: sourcePos.top + "px",
        zIndex: parseInt(opts.zIndex || 2200, 10),
      });
      const destroyOnEnd = opts.destroyOnEnd !== false;
      const callback =
        typeof opts.onEnd === "function" ? opts.onEnd.bind(this) : null;
      const duration = Math.max(
        0,
        parseInt(opts.duration || this.getUnifiedCardFlyMs(), 10)
      );
      const startDelay = Math.max(0, parseInt(opts.startDelay || 0, 10));
      let finished = false;
      const finalize = function () {
        if (finished) return;
        finished = true;
        if (callback) {
          callback(tempId);
        }
        if (destroyOnEnd) {
          dojo.destroy(tempId);
        }
      }.bind(this);
      const run = function () {
        const anim = this.safeSlideToObject(tempId, targetId, duration);
        if (!anim) {
          finalize();
          return;
        }
        dojo.connect(anim, "onEnd", this, finalize);
        anim.play();
      }.bind(this);
      if (startDelay > 0) {
        setTimeout(run, startDelay);
      } else {
        run();
      }
      setTimeout(
        function () {
          finalize();
        }.bind(this),
        Math.max(180, startDelay + duration + 480)
      );
      return tempId;
    },

    animateDeckDrawToPlayer: function (cardKind, playerId, count, options) {
      const n = Math.max(0, parseInt(count || 0, 10));
      if (!n) return;
      const pid = String(playerId || "");
      if (!pid) return;
      const opts = options || {};

      const sourceId =
        cardKind === "believer" ? "believer_deck" : "action_deck";
      // Public draw preview should land on the player's table/name area first;
      // side-panel is only a fallback when the table anchor is not available.
      const targetId = this.resolvePlayerAnchorNodeId(pid, {
        allowPanel: true,
        allowTable: true,
        preferTable: true,
        fallbackId: "playertable_" + pid,
      });
      if (!sourceId || !targetId || !dojo.byId(targetId)) return;

      this.animateCardFlightBatch({
        sourceId: sourceId,
        targetId: targetId,
        count: n,
        cap: n,
        cardKind: cardKind,
        duration: this.getUnifiedCardFlyMs(),
        startDelay: Math.max(0, parseInt(opts.startDelay || 0, 10) || 0),
        delayStep: 110,
        fromScale: 1,
        toScale: 0.62,
        dataIndex: 0,
      });
    },

    normalizeActionDiscardCards: function (args) {
      const src = args || {};
      const rawCards = Array.isArray(src.cards)
        ? src.cards
        : Array.isArray(src.discard_cards)
        ? src.discard_cards
        : [];
      const normalized = [];
      const seen = {};
      rawCards.forEach(
        function (card) {
          if (!card) return;
          const id = parseInt(card.id || card.card_id || 0, 10) || 0;
          const type = String(card.type || card.card_type || "");
          if (!id || !type || seen[String(id)]) return;
          seen[String(id)] = 1;
          normalized.push({ id: id, type: type });
        }.bind(this)
      );
      if (normalized.length) return normalized;

      const rawIds = Array.isArray(src.card_ids)
        ? src.card_ids
        : Array.isArray(src.discard_card_ids)
        ? src.discard_card_ids
        : [];
      rawIds.forEach(
        function (rawId) {
          const id = parseInt(rawId || 0, 10) || 0;
          if (!id || seen[String(id)]) return;
          const type = this.actionCardTypeById[String(id)] || "";
          if (!type) return;
          seen[String(id)] = 1;
          normalized.push({ id: id, type: type });
        }.bind(this)
      );
      return normalized;
    },

    markActionDiscardFlightSuppressed: function (cards) {
      const list = Array.isArray(cards) ? cards : [];
      const expiresAt = Date.now() + 10000;
      if (!this.suppressedActionDiscardFlightByCardId) {
        this.suppressedActionDiscardFlightByCardId = {};
      }
      list.forEach(
        function (card) {
          const id = parseInt((card && (card.id || card.card_id)) || 0, 10);
          if (id > 0) {
            this.suppressedActionDiscardFlightByCardId[String(id)] = expiresAt;
          }
        }.bind(this)
      );
    },

    consumeActionDiscardFlightSuppression: function (cardId) {
      const id = String(parseInt(cardId || 0, 10) || 0);
      if (!id || !this.suppressedActionDiscardFlightByCardId) return false;
      const expiresAt = parseInt(
        this.suppressedActionDiscardFlightByCardId[id] || 0,
        10
      );
      if (!expiresAt) return false;
      delete this.suppressedActionDiscardFlightByCardId[id];
      return expiresAt > Date.now();
    },

    animateActionCardsToDiscard: function (playerId, cards, options) {
      const list = Array.isArray(cards) ? cards : [];
      const opts = options || {};
      const shouldConsumeSuppression = opts.consumeSuppression === true;
      const pid = String(playerId || "");
      if (!list.length || !pid || !dojo.byId("action_discard")) return 0;
      const sourceId = this.resolvePlayerAnchorNodeId(pid, {
        allowPanel: true,
        allowTable: true,
        preferTable: true,
        fallbackId: "playertable_" + pid,
      });
      const isSelf = pid === String(this.player_id || "");
      const flyMs = this.getUnifiedCardFlyMs();
      const stepMs = Math.max(60, parseInt(opts.delayStep || 80, 10) || 80);
      const baseStartDelay = Math.max(
        0,
        parseInt(opts.startDelay || 0, 10) || 0
      );
      let animated = 0;
      list.forEach(
        function (card) {
          if (!card || !card.type) return;
          const cardId = parseInt(card.id || card.card_id || 0, 10) || 0;
          if (
            shouldConsumeSuppression &&
            cardId > 0 &&
            this.consumeActionDiscardFlightSuppression(cardId)
          ) {
            return;
          }
          const spriteOffset = this.getActionCardSpriteIndex(card.type);
          const startDelay = baseStartDelay + animated * stepMs;
          const sourceNode =
            isSelf && cardId > 0
              ? this.getActionStockItemNodeByCardId(cardId, "myactioncards")
              : null;
          if (sourceNode) {
            this.animateCardNodeCloneToTarget(sourceNode, "action_discard", {
              tempPrefix: "action_discard_fly",
              cardClass: "card card-action table_card_item",
              dataIndex: spriteOffset,
              duration: flyMs,
              startDelay: startDelay,
              zIndex: 2450,
            });
            animated++;
            return;
          }
          if (!sourceId || !dojo.byId(sourceId)) return;
          this.animateTempCardFlight({
            sourceId: sourceId,
            targetId: "action_discard",
            cardClass: "card card-action table_card_item",
            duration: flyMs,
            startDelay: startDelay,
            fromScale: isSelf ? 1 : 0.62,
            toScale: 0.62,
            dataIndex: spriteOffset,
            zIndex: 2450,
          });
          animated++;
        }.bind(this)
      );
      return animated > 0 ? baseStartDelay + flyMs + (animated - 1) * stepMs : 0;
    },

    getActionPlaySourceNodeId: function (playerId) {
      return this.resolvePlayerCardAnchorNodeId(
        playerId,
        "play_action",
        "action"
      );
    },

    getPlayedActionCardTargetNodeId: function (cardType) {
      const key = String(cardType || "");
      if (key === "faith_war" || key === "faith_debate") {
        if (dojo.byId("faithwar_action_main_card")) {
          return "faithwar_action_main_card";
        }
      }
      if (
        key === "martyrdom" ||
        key === "conspiracy" ||
        dojo.byId("center_action_card_face")
      ) {
        if (dojo.byId("center_action_card_face")) {
          return "center_action_card_face";
        }
      }
      return dojo.byId("central_arena") ? "central_arena" : null;
    },

    animatePlayedActionCardFlight: function (playerId, cardType, opts) {
      const options = opts || {};
      const pid = String(playerId || "");
      if (!pid) return false;
      const sourceId = this.getActionPlaySourceNodeId(pid);
      const targetId =
        options.targetId || this.getPlayedActionCardTargetNodeId(cardType);
      if (
        !sourceId ||
        !targetId ||
        !dojo.byId(sourceId) ||
        !dojo.byId(targetId)
      ) {
        return false;
      }
      const isSelf = pid === String(this.player_id);
      const spriteOffset = this.getActionCardSpriteIndex(cardType);
      this.animateTempCardFlight({
        sourceId: sourceId,
        targetId: targetId,
        cardClass: "card card-action table_card_item",
        duration: parseInt(options.duration || this.getUnifiedCardFlyMs(), 10),
        startDelay: parseInt(options.startDelay || 0, 10),
        fromScale:
          typeof options.fromScale === "number"
            ? options.fromScale
            : isSelf
            ? 1
            : 0.62,
        toScale: typeof options.toScale === "number" ? options.toScale : 1,
        dataIndex: spriteOffset,
        onEnd:
          typeof options.onEnd === "function" ? options.onEnd : undefined,
      });
      return true;
    },

    animateActionPlayFromPlayerAnchor: function (playerId, cardType) {
      this.animatePlayedActionCardFlight(playerId, cardType, {
        targetId: dojo.byId("central_arena") ? "central_arena" : null,
      });
    },

    scheduleCenterActionCardToDiscard: function (delayMs) {
      if (this.pendingCenterActionDiscardTimeout) {
        clearTimeout(this.pendingCenterActionDiscardTimeout);
        this.pendingCenterActionDiscardTimeout = null;
      }
      const waitMs = Math.max(0, parseInt(delayMs || 0, 10));
      this.centerActionHoldUntil = Date.now() + waitMs;
      const currentCard = dojo.byId("current_center_action_card");
      const expectedCardId = currentCard
        ? String(currentCard.getAttribute("data-card-id") || "")
        : "";
      this.pendingCenterActionDiscardTimeout = setTimeout(
        function () {
          this.pendingCenterActionDiscardTimeout = null;
          this.centerActionHoldUntil = 0;
          if (this.getCurrentStateName() === "gameEndSummary") return;
          if (!dojo.byId("current_center_action_card")) return;
          if (expectedCardId) {
            const liveCard = dojo.byId("current_center_action_card");
            const liveId = liveCard
              ? String(liveCard.getAttribute("data-card-id") || "")
              : "";
            if (liveId && liveId !== expectedCardId) {
              return;
            }
          }
          this.moveCurrentCenterActionToDiscard();
        }.bind(this),
        waitMs
      );
    },

    clearProphetPendingPredictionVisual: function () {
      if (this.pendingProphetVisualClearTimeout) {
        clearTimeout(this.pendingProphetVisualClearTimeout);
        this.pendingProphetVisualClearTimeout = null;
      }
      const pendingId = "prophet_pending_first_card";
      if (dojo.byId(pendingId)) {
        dojo.destroy(pendingId);
      }
      dojo.query('[id^="prophet_first_"]').forEach(function (node) {
        if (node && node.id) dojo.destroy(node.id);
      });
      dojo.query('[id^="prophet_extra_pred_"]').forEach(function (node) {
        if (node && node.id) dojo.destroy(node.id);
      });
      const guessNode = dojo.byId("prophet_prediction_guess_line");
      const resultNode = dojo.byId("prophet_prediction_result_line");
      if (guessNode) guessNode.innerHTML = "";
      if (resultNode) {
        resultNode.innerHTML = "";
        dojo.removeClass(resultNode, "is-hit");
        dojo.removeClass(resultNode, "is-miss");
      }
      // Reset host+slot each cycle so anchor/text never drift into stale layout.
      const slot = dojo.byId("prophet_prediction_slot");
      if (slot) {
        dojo.destroy(slot);
      }
      const host = dojo.byId("prophet_prediction_host");
      if (host) {
        dojo.destroy(host);
      }
      const arena = dojo.byId("central_arena");
      if (arena) {
        dojo.removeClass(arena, "prophet-stacked-layout");
        dojo.removeClass(arena, "prophet-prediction-active");
      }
    },

    getProphetPredictionBaseNode: function () {
      const centerWrap = dojo.byId("current_center_action_card");
      if (centerWrap) return centerWrap;
      const centerFace = dojo.byId("center_action_card_face");
      if (centerFace && centerFace.parentNode) return centerFace.parentNode;
      const arena = dojo.byId("central_arena");
      if (!arena) return null;
      const pendingCard = dojo.query('[id^="pending_action_play_"]', arena)[0];
      if (pendingCard) return pendingCard;
      return null;
    },

    mountProphetPredictionHost: function (host, arena, baseNode) {
      if (!host || !arena) return;
      if (baseNode && baseNode.parentNode === arena) {
        dojo.place(host, baseNode, "after");
      } else {
        dojo.place(host, arena, "last");
      }
      dojo.addClass(arena, "prophet-prediction-active");
      dojo.removeClass(arena, "prophet-stacked-layout");
      dojo.removeClass(host, "is-stacked-under-card");
      dojo.style(host, {
        left: "",
        top: "",
        right: "",
        transform: "none",
      });
    },

    ensureProphetPredictionSlot: function () {
      const arena = dojo.byId("central_arena");
      if (!arena) return null;
      const hostId = "prophet_prediction_host";
      let host = dojo.byId(hostId);
      if (!host) {
        dojo.place(
          '<div id="' +
            hostId +
            '" class="prophet-prediction-host" aria-hidden="true"></div>',
          arena,
          "last"
        );
        host = dojo.byId(hostId);
      }
      if (!host) return null;
      this.mountProphetPredictionHost(
        host,
        arena,
        this.getProphetPredictionBaseNode()
      );
      const slotId = "prophet_prediction_slot";
      let slot = dojo.byId(slotId);
      if (!slot) {
        dojo.place(
          '<div id="' +
            slotId +
            '" class="prophet-prediction-slot">' +
            '<div id="prophet_prediction_card_anchor" class="prophet-prediction-card-anchor"></div>' +
            '<div id="prophet_prediction_lines" class="prophet-prediction-lines">' +
            '<div id="prophet_prediction_guess_line" class="prophet-prediction-line guess"></div>' +
            '<div id="prophet_prediction_result_line" class="prophet-prediction-line result"></div>' +
            "</div>" +
            "</div>",
          host
        );
        slot = dojo.byId(slotId);
      }
      if (!slot) return null;
      if (slot.parentNode !== host) {
        dojo.place(slot, host, "last");
      }
      dojo.style(slot, {
        zIndex: 2380,
      });
      return slotId;
    },

    clearProphetPredictionTextLines: function () {
      this.ensureProphetPredictionSlot();
      const guessNode = dojo.byId("prophet_prediction_guess_line");
      const resultNode = dojo.byId("prophet_prediction_result_line");
      if (guessNode) guessNode.innerHTML = "";
      if (resultNode) {
        resultNode.innerHTML = "";
        dojo.removeClass(resultNode, "is-hit");
        dojo.removeClass(resultNode, "is-miss");
      }
    },

    setProphetPredictionTextLines: function (guessName, isHit) {
      this.ensureProphetPredictionSlot();
      const guessNode = dojo.byId("prophet_prediction_guess_line");
      const resultNode = dojo.byId("prophet_prediction_result_line");
      if (!guessNode || !resultNode) {
        return;
      }
      guessNode.innerHTML = this.escapeHtml(
        dojo.string.substitute(_("Predicted: ${guess_name}"), {
          guess_name: String(guessName || ""),
        })
      );
      resultNode.innerHTML = this.escapeHtml(isHit ? _("Hit") : _("Miss"));
      dojo.removeClass(resultNode, "is-hit");
      dojo.removeClass(resultNode, "is-miss");
      dojo.addClass(resultNode, isHit ? "is-hit" : "is-miss");
    },

    animateBelieverFlipReveal: function (nodeOrId, revealedType, options) {
      const node =
        typeof nodeOrId === "string" ? dojo.byId(nodeOrId) : nodeOrId || null;
      const type = parseInt(revealedType || 0, 10);
      if (!node || !(type > 0)) return 0;
      const opts = options || {};
      const configuredFlipMs = Math.max(
        220,
        parseInt(opts.flipMs || this.getUnifiedRevealFlipMs(), 10)
      );
      const halfMs = Math.max(90, Math.round(configuredFlipMs / 2));
      const expandStartLagMs = Math.max(12, parseInt(opts.expandStartLagMs || 16, 10));
      const totalMs = halfMs + expandStartLagMs + halfMs;
      const shrinkScaleX = 0.02;
      dojo.addClass(node, "believer-flip-active");
      dojo.style(node, {
        transformOrigin: "50% 50%",
        transition: "transform " + halfMs + "ms ease",
        transform: "scaleX(" + shrinkScaleX + ")",
      });
      setTimeout(
        function () {
          dojo.removeClass(node, "card-back-believer");
          dojo.removeClass(node, "facedown");
          dojo.addClass(node, "card-believer");
          node.setAttribute("data-index", String(type));
          this.applyInlineBelieverFaceStyle(node, type);
          this.forceBelieverFaceSpriteOnNode(node, type);
          if (dojo.hasClass(node, "prophet-temp-card")) {
            this.lockProphetTempCardSize(node, true);
          }
          this.attachBelieverTooltip(node, type);
          node.offsetHeight;
          setTimeout(function () {
            dojo.style(node, {
              transition: "transform " + halfMs + "ms ease",
              transform: "scaleX(1)",
            });
          }, expandStartLagMs);
        }.bind(this),
        halfMs
      );
      setTimeout(function () {
        dojo.style(node, {
          transition: "",
          transform: "",
        });
        dojo.removeClass(node, "believer-flip-active");
      }, totalMs + 40);
      return totalMs;
    },

    getProphetPredictionAnchorId: function () {
      this.ensureProphetPredictionSlot();
      if (dojo.byId("prophet_prediction_card_anchor")) {
        return "prophet_prediction_card_anchor";
      }
      if (dojo.byId("center_action_card_face"))
        return "center_action_card_face";
      if (dojo.byId("current_center_action_card"))
        return "current_center_action_card";
      if (dojo.byId("central_arena")) return "central_arena";
      return null;
    },

    attachProphetTempCardToAnchor: function (cardNodeId) {
      const node = dojo.byId(cardNodeId);
      const anchor = dojo.byId("prophet_prediction_card_anchor");
      if (!node || !anchor) return false;
      if (node.parentNode !== anchor) {
        dojo.place(node, anchor, "last");
      }
      dojo.style(node, {
        position: "absolute",
        left: "0px",
        top: "0px",
        zIndex: 2400,
        transition: "",
        transform: "none",
      });
      this.lockProphetTempCardSize(cardNodeId, true);
      return true;
    },

    lockProphetTempCardSize: function (cardNodeId, fillAnchor) {
      const node =
        typeof cardNodeId === "string" ? dojo.byId(cardNodeId) : cardNodeId || null;
      if (!node) return false;
      const anchor = dojo.byId("prophet_prediction_card_anchor");
      if (fillAnchor && anchor && node.parentNode === anchor) {
        node.style.setProperty("width", "100%", "important");
        node.style.setProperty("height", "100%", "important");
        return true;
      }
      let width = 0;
      let height = 0;
      const anchorPos = anchor ? dojo.position(anchor) : null;
      if (anchorPos) {
        width = Math.round(parseFloat(anchorPos.w || 0));
        height = Math.round(parseFloat(anchorPos.h || 0));
      }
      if (!(width > 0) || !(height > 0)) {
        const nodePos = dojo.position(node);
        width = Math.round(parseFloat((nodePos && nodePos.w) || 0));
        height = Math.round(parseFloat((nodePos && nodePos.h) || 0));
      }
      if (!(width > 0) || !(height > 0)) return false;
      node.style.setProperty("width", width + "px", "important");
      node.style.setProperty("height", height + "px", "important");
      return true;
    },

    getSafeProphetDrawIndex: function (value, fallback) {
      const parsed = parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
      const fallbackParsed = parseInt(fallback || 1, 10);
      return Number.isFinite(fallbackParsed) && fallbackParsed > 0
        ? fallbackParsed
        : 1;
    },

    moveTempCardToFlightRoot: function (cardNodeId, rootId) {
      const node = dojo.byId(cardNodeId);
      if (!node) return false;
      let root = dojo.byId(rootId || "game_play_area");
      if (!root) {
        root = typeof dojo.body === "function" ? dojo.body() : document.body;
      }
      if (!root) return false;
      this.ensureCardFlightRootPositioned(root);
      const nodePos = dojo.position(node, true);
      const rootPos = dojo.position(root, true) || { x: 0, y: 0 };
      if (node.parentNode !== root) {
        dojo.place(node, root, "last");
      }
      dojo.style(node, {
        position: "absolute",
        left: Math.round(parseFloat(nodePos.x || 0) - parseFloat(rootPos.x || 0)) + "px",
        top: Math.round(parseFloat(nodePos.y || 0) - parseFloat(rootPos.y || 0)) + "px",
        width: Math.round(parseFloat(nodePos.w || 0)) + "px",
        height: Math.round(parseFloat(nodePos.h || 0)) + "px",
      });
      return true;
    },

    restoreProphetPendingPredictionVisual: function () {
      this.ensureProphetPredictionSlot();
      const anchor = dojo.byId("prophet_prediction_card_anchor");
      if (!anchor) return;
      const existingPending = dojo.byId("prophet_pending_first_card");
      if (existingPending) {
        dojo.destroy(existingPending);
      }
      dojo.query(".prophet-temp-card", anchor).forEach(function (node) {
        if (node && node.id) {
          dojo.destroy(node.id);
        } else if (node && node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
      dojo.place(
        '<div id="prophet_pending_first_card" class="card card-back-believer prophet-temp-card"></div>',
        anchor,
        "last"
      );
      const pendingNode = dojo.byId("prophet_pending_first_card");
      if (pendingNode) {
        dojo.style(pendingNode, {
          position: "absolute",
          left: "0px",
          top: "0px",
          opacity: 1,
          visibility: "visible",
          transform: "none",
          zIndex: 2400,
        });
        this.lockProphetTempCardSize(pendingNode, true);
      }
      this.clearProphetPredictionTextLines();
    },

    showProphetPendingPredictionVisual: function () {
      const deckNode = dojo.byId("believer_deck");
      if (!deckNode) return;
      this.clearProphetPendingPredictionVisual();
      this.ensureProphetPredictionSlot();
      const anchorId = this.getProphetPredictionAnchorId();
      if (!anchorId || !dojo.byId(anchorId)) return;
      this.clearProphetPredictionTextLines();
      this.animateTempCardFlight({
        tempId: "prophet_pending_first_card",
        sourceId: "believer_deck",
        targetId: anchorId,
        cardClass: "card card-back-believer prophet-temp-card",
        duration: this.getUnifiedCardFlyMs(),
        matchSourceSize: true,
        toScale: this.getCardFlightScaleBetweenNodes("believer_deck", anchorId),
        destroyOnEnd: false,
        zIndex: 2400,
        onEnd: function (tempId) {
          this.attachProphetTempCardToAnchor(tempId);
        },
      });
    },

    animateProphetPredictionFlow: function (args) {
      const deckNode = dojo.byId("believer_deck");
      if (!deckNode || !args) return 0;

      if (this.pendingProphetVisualClearTimeout) {
        clearTimeout(this.pendingProphetVisualClearTimeout);
        this.pendingProphetVisualClearTimeout = null;
      }
      const drawerId = parseInt(args.drawer_id || 0, 10);
      const remainingN = Math.max(0, parseInt(args.remaining_draw_n || 0, 10));
      const flyMs = this.getUnifiedCardFlyMs();
      const revealHoldMs = this.getUnifiedRevealHoldMs();
      const revealFlowBudgetMs =
        this.getUnifiedRevealFlipMs() + revealHoldMs + flyMs;
      if (parseInt(args.clear_previous_prediction || 0, 10) === 1) {
        this.clearProphetPendingPredictionVisual();
      }
      this.ensureProphetPredictionSlot();
      this.clearProphetPredictionTextLines();
      let maxEndMs = 0;
      let predictionEvents = [];
      if (Array.isArray(args.prediction_events)) {
        predictionEvents = args.prediction_events
          .map(function (row) {
            return {
              draw_index: parseInt((row && row.draw_index) || 0, 10),
              guess_type: parseInt((row && row.guess_type) || 0, 10),
              revealed_type: parseInt((row && row.revealed_type) || 0, 10),
              guess_correct: parseInt((row && row.guess_correct) || 0, 10),
              receiver_id: parseInt((row && row.receiver_id) || 0, 10),
            };
          })
          .filter(function (row) {
            return row.revealed_type > 0;
          });
      }
      if (!predictionEvents.length) {
        const legacyType = parseInt(args.revealed_type || 0, 10);
        const legacyReceiver = parseInt(args.first_receiver_id || 0, 10);
        if (legacyType > 0 && legacyReceiver > 0) {
          predictionEvents = [
            {
              draw_index: 1,
              guess_type: parseInt(args.guess_type || 0, 10),
              revealed_type: legacyType,
              guess_correct: parseInt(args.guess_correct || 0, 10),
              receiver_id: legacyReceiver,
            },
          ];
        }
      }
      predictionEvents.sort(function (a, b) {
        return a.draw_index - b.draw_index;
      });

      const revealAndSendEvent = function (cardNodeId, eventRow) {
        this.ensureProphetPredictionSlot();
        const anchor = dojo.byId("prophet_prediction_card_anchor");
        let node = dojo.byId(cardNodeId);
        if (node && anchor && node.parentNode !== anchor) {
          dojo.destroy(cardNodeId);
          dojo.place(
            '<div id="' +
              String(cardNodeId) +
              '" class="card card-back-believer prophet-temp-card"></div>',
            anchor,
            "last"
          );
          this.attachProphetTempCardToAnchor(cardNodeId);
          node = dojo.byId(cardNodeId);
        }
        if (!node) return;
        const revealedType = parseInt(
          (eventRow && eventRow.revealed_type) || 0,
          10
        );
        const guessType = parseInt((eventRow && eventRow.guess_type) || 0, 10);
        const guessName =
          guessType > 0 ? this.formatBelieverTypeLabel(guessType) : "";
        const guessHit =
          guessType > 0 &&
          revealedType > 0 &&
          parseInt((eventRow && eventRow.guess_correct) || 0, 10) === 1;
        const receiverId = parseInt(
          (eventRow && eventRow.receiver_id) || 0,
          10
        );
        const flipMs = Math.max(
          180,
          parseInt(this.getUnifiedRevealFlipMs() || 0, 10) || 0
        );
        dojo.removeClass(node, "card-believer");
        dojo.addClass(node, "card-back-believer");
        dojo.addClass(node, "facedown");
        node.setAttribute("data-index", "0");
        dojo.style(node, {
          position: "absolute",
          left: "0px",
          top: "0px",
          zIndex: 2400,
          visibility: "visible",
          opacity: 1,
          transition: "",
          transform: "none",
        });
        this.lockProphetTempCardSize(node, true);
        const flipAnimMs = Math.max(
          parseInt(
            this.animateBelieverFlipReveal(node, revealedType, { flipMs: flipMs }) ||
              0,
            10
          ),
          flipMs
        );
        const guessTextDelayMs = Math.max(90, Math.round(flipAnimMs * 0.72));
        let slideDelayMs = flipAnimMs + revealHoldMs;
        if (guessType > 0 && revealedType > 0) {
          setTimeout(
            function () {
              this.setProphetPredictionTextLines(guessName, guessHit);
            }.bind(this),
            guessTextDelayMs
          );
          // Keep Prophet prediction result visible for at least the same
          // post-reveal hold window as combat result visuals.
          slideDelayMs = Math.max(
            slideDelayMs,
            guessTextDelayMs +
              revealHoldMs +
              this.getUnifiedCardFlightStaggerMs() * 3
          );
        }
        const targetId = this.getPlayerBelieverReceiveTargetNodeId(
          receiverId > 0 ? receiverId : drawerId
        );
        if (!targetId || !dojo.byId(targetId)) {
          dojo.destroy(cardNodeId);
          return;
        }
        setTimeout(
          function () {
            // Hide Prophet guess/result text as soon as this revealed card starts flying.
            this.clearProphetPredictionTextLines();
            this.moveTempCardToFlightRoot(cardNodeId, "game_play_area");
            const toTarget = this.safeSlideToObject(cardNodeId, targetId, flyMs);
            if (!toTarget) {
              dojo.destroy(cardNodeId);
              return;
            }
            dojo.connect(toTarget, "onEnd", this, function () {
              dojo.destroy(cardNodeId);
            });
            toTarget.play();
          }.bind(this),
          slideDelayMs
        );
        return slideDelayMs + flyMs;
      }.bind(this);

      if (predictionEvents.length > 0) {
        const firstEvent = predictionEvents[0];
        const pendingId = "prophet_pending_first_card";
        if (dojo.byId(pendingId)) {
          const endMs = revealAndSendEvent(pendingId, firstEvent);
          maxEndMs = Math.max(
            maxEndMs,
            parseInt(endMs || 0, 10) || revealFlowBudgetMs
          );
        } else {
          const anchorId =
            this.getProphetPredictionAnchorId() || "central_arena";
          const firstId = "prophet_first_" + Date.now();
          this.animateTempCardFlight({
            tempId: firstId,
            sourceId: "believer_deck",
            targetId: anchorId,
            cardClass: "card card-back-believer prophet-temp-card",
            duration: flyMs,
            matchSourceSize: true,
            toScale: this.getCardFlightScaleBetweenNodes("believer_deck", anchorId),
            destroyOnEnd: false,
            zIndex: 2400,
            onEnd: function () {
              this.attachProphetTempCardToAnchor(firstId);
              const endMs = revealAndSendEvent(firstId, firstEvent);
              maxEndMs = Math.max(
                maxEndMs,
                flyMs + (parseInt(endMs || 0, 10) || revealFlowBudgetMs)
              );
            },
          });
          maxEndMs = Math.max(maxEndMs, flyMs + revealFlowBudgetMs);
        }

        for (let idx = 1; idx < predictionEvents.length; idx++) {
          const eventRow = predictionEvents[idx];
          const cardId = "prophet_extra_pred_" + idx + "_" + Date.now();
          const delay =
            this.getUnifiedCardFlightStaggerMs() * 3 +
            idx * this.getUnifiedCardFlightStaggerMs() * 3;
          maxEndMs = Math.max(maxEndMs, delay + flyMs + revealFlowBudgetMs);
          const anchorId =
            this.getProphetPredictionAnchorId() || "central_arena";
          this.animateTempCardFlight({
            tempId: cardId,
            sourceId: "believer_deck",
            targetId: anchorId,
            cardClass: "card card-back-believer prophet-temp-card",
            duration: flyMs,
            startDelay: delay,
            hideUntilStart: true,
            matchSourceSize: true,
            toScale: this.getCardFlightScaleBetweenNodes("believer_deck", anchorId),
            destroyOnEnd: false,
            zIndex: 2400,
            onEnd: function () {
              this.attachProphetTempCardToAnchor(cardId);
              const endMs = revealAndSendEvent(cardId, eventRow);
              maxEndMs = Math.max(
                maxEndMs,
                delay + (parseInt(endMs || 0, 10) || revealFlowBudgetMs)
              );
            },
          });
        }
      } else {
        this.clearProphetPendingPredictionVisual();
      }

      const baseDelay = predictionEvents.length ? maxEndMs + 80 : 250;
      for (let i = 0; i < remainingN; i++) {
        const targetId = this.getPlayerBelieverReceiveTargetNodeId(drawerId);
        if (!targetId || !dojo.byId(targetId)) continue;
        this.animateTempCardFlight({
          sourceId: "believer_deck",
          targetId: targetId,
          cardClass: "card card-back-believer prophet-temp-card",
          duration: flyMs,
          startDelay: baseDelay + i * 160,
          fromScale: 1,
          toScale: 0.62,
          dataIndex: 0,
        });
        maxEndMs = Math.max(maxEndMs, baseDelay + i * 160 + flyMs);
      }
      if (maxEndMs > 0) {
        this.pendingProphetVisualClearTimeout = setTimeout(
          function () {
            this.pendingProphetVisualClearTimeout = null;
            this.clearProphetPendingPredictionVisual();
          }.bind(this),
          maxEndMs +
            Math.max(
              this.getUnifiedCardFlightStaggerMs() * 4,
              Math.round(flyMs * 0.9)
            )
        );
      }

      return maxEndMs;
    },

    showPendingActionPreview: function (cardKey, cardId) {
      const tempId = "pending_action_play_" + cardId;
      const existing = dojo.byId(tempId);
      if (existing) {
        dojo.destroy(existing);
      }
      const spriteOffset = this.getActionCardSpriteIndex(cardKey);
      dojo.place(
        `<div id="${tempId}" class="card card-action table_card_item pending-divine-card" data-index="${spriteOffset}"></div>`,
        "central_arena"
      );
      this.placeOnObject(tempId, "myactioncards");
      const previewAnim = this.safeSlideToObject(
        tempId,
        "central_arena",
        this.getUnifiedCardFlyMs()
      );
      if (previewAnim) {
        previewAnim.play();
      }
      return tempId;
    },

    beginTargetSelection: function (card, options) {
      const opts = options || {};
      if (
        this.pendingAction &&
        this.pendingAction.tempArenaId &&
        dojo.byId(this.pendingAction.tempArenaId)
      ) {
        dojo.destroy(this.pendingAction.tempArenaId);
      }
      this.clearTargetSelection();

      const cardKey = this.getActionCardKeyName(card.type);
      this.pendingFaithWarUseZombie =
        cardKey === "faith_war" && parseInt(opts.use_zombie || 0, 10) === 1;
      const cardName = this.getActionCardDisplayName(cardKey);
      if (!this.hasSelectableTargetPlayerForCard(cardKey)) {
        this.playerActionCards.unselectAll();
        return;
      }
      this.pendingAction = {
        cardId: card.id,
        cardKey: cardKey,
        targetChosen: false,
        tempArenaId: this.showPendingActionPreview(cardKey, card.id),
      };
      this.hidePendingActionCardFromHand(card.id, cardKey);

      this.playerActionCards.unselectAll();
      this.clearPendingActionButtons();
      this.addActionButton(
        "cancelTargetSelection",
        _("Cancel"),
        "cancelPendingActionSelection"
      );

      const selectionMeta = this.highlightSelectablePlayers(cardKey);
      if (
        selectionMeta &&
        selectionMeta.blockedNames &&
        selectionMeta.blockedNames.length
      ) {
        const kindLabel =
          selectionMeta.attackKind === "mental" ? _("Mental") : _("Physical");
        this.showMessage(
          dojo.string.substitute(
            _(
              "Protected target(s) cannot be attacked by ${attack_kind}: ${targets}"
            ),
            {
              attack_kind: kindLabel,
              targets: selectionMeta.blockedNames.join(", "),
            }
          ),
          "info"
        );
      }
      if (
        selectionMeta &&
        selectionMeta.wandererBlockedNames &&
        selectionMeta.wandererBlockedNames.length
      ) {
        this.showMessage(
          dojo.string.substitute(
            _("Wanderer cannot be targeted: ${targets}"),
            {
              targets: selectionMeta.wandererBlockedNames.join(", "),
            }
          ),
          "info"
        );
      }
      if (
        cardKey === "secret_alliance" &&
        selectionMeta &&
        selectionMeta.noActionTargetNames &&
        selectionMeta.noActionTargetNames.length
      ) {
        this.showMessage(
          dojo.string.substitute(
            _(
              "Secret Alliance cannot target players with no Action cards: ${players}"
            ),
            {
              players: selectionMeta.noActionTargetNames.join(", "),
            }
          ),
          "info"
        );
      }
      if (
        cardKey === "spread_rumors" &&
        selectionMeta &&
        selectionMeta.spreadRumorsBlockedSectLabels &&
        selectionMeta.spreadRumorsBlockedSectLabels.length
      ) {
        this.showMessage(
          dojo.string.substitute(
            _("Spread Rumors cannot target sects with no Believers: ${sects}"),
            {
              sects: selectionMeta.spreadRumorsBlockedSectLabels.join(", "),
            }
          ),
          "info"
        );
      }
      if (
        (cardKey === "faith_war" || cardKey === "faith_debate") &&
        selectionMeta &&
        selectionMeta.combatEmptySectLabels &&
        selectionMeta.combatEmptySectLabels.length
      ) {
        this.showMessage(
          dojo.string.substitute(
            _("confrontation cannot target sects with no Believers: ${sects}"),
            {
              sects: selectionMeta.combatEmptySectLabels.join(", "),
            }
          ),
          "info"
        );
      }
      if (
        selectionMeta &&
        parseInt(selectionMeta.selectableCount || 0, 10) <= 0
      ) {
        if (cardKey === "kowtow_to_me") {
          this.setTopInstruction(
            _("No valid target Sect for Kowtow To Me. You can cancel.")
          );
        } else {
          this.setTopInstruction(
            dojo.string.substitute(
              _("No valid targets for ${card_name}. You can cancel."),
              { card_name: cardName }
            )
          );
        }
      } else if (cardKey === "faith_war" && this.pendingFaithWarUseZombie) {
        this.setTopInstruction(
          _("Zombie Army is active. Choose a target Sect for Faith War.")
        );
      } else {
        this.setTopInstruction(this.getTargetPromptText(cardKey, cardName));
      }
      if (
        cardKey === "kowtow_to_me" &&
        selectionMeta &&
        selectionMeta.kowtowTooLargeSectLabels &&
        selectionMeta.kowtowTooLargeSectLabels.length
      ) {
        this.showMessage(
          dojo.string.substitute(
            _(
              "Kowtow To Me cannot target sects with too many Believers: ${sects}"
            ),
            {
              sects: selectionMeta.kowtowTooLargeSectLabels.join(", "),
            }
          ),
          "info"
        );
      }
    },

    beginDivineInspireSelection: function (card) {
      this.pendingAction = {
        cardId: card.id,
        cardKey: "divine_inspire",
        tempArenaId: this.showPendingActionPreview("divine_inspire", card.id),
      };
      this.hidePendingActionCardFromHand(card.id, "divine_inspire");

      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(2);
      }
      this.playerActionCards.unselectAll();
      this.setDivineInspireSourceLocked(card.id, true);
      this.clearPendingActionButtons();
      this.addActionButton(
        "confirmDivineInspire",
        _("Confirm Discard and Draw"),
        "onConfirmDivineInspireClicked"
      );
      this.addActionButton(
        "cancelDivineInspire",
        _("Cancel"),
        "cancelPendingActionSelection"
      );
      this.setTopInstruction(
        _(
          "Select one or more other Action cards to discard for Divine Inspiration"
        )
      );
    },

    highlightSelectablePlayers: function (cardKey) {
      this.clearTargetSelection();
      const key =
        cardKey || (this.pendingAction ? this.pendingAction.cardKey : "") || "";
      const attackKind = this.getAttackKindForActionCard(key);
      const blockedNames = [];
      const wandererBlockedNames = [];
      const noActionTargetNames = [];
      const spreadRumorsBlockedSectLabels = [];
      const combatEmptySectLabels = [];
      const kowtowTooLargeSectLabels = [];
      const blockedKowtowSectMap = {};
      const spreadRumorsBlockedSectMap = {};
      const combatEmptySectMap = {};
      const markTargetUnselectable = function (node) {
        if (!node) return;
        dojo.addClass(node, "target_unselectable");
        dojo.removeClass(node, "target_protected");
        dojo.removeClass(node, "selectable_target");
        dojo.removeClass(node, "target_selected");
      };
      let selectableCount = 0;
      Object.keys(this.gamedatas.players).forEach(
        function (player_id) {
          const player = this.gamedatas.players[player_id];
          const node =
            dojo.byId("panel_" + player_id) ||
            dojo.byId("playertable_" + player_id);
          if (!node) return;
          if (String(player_id) === String(this.player_id)) {
            markTargetUnselectable(node);
            return;
          }
          if (player && Number(player.player_role) === 2) {
            markTargetUnselectable(node);
            wandererBlockedNames.push(
              player && player.name ? player.name : _("Player")
            );
            return;
          }
          if (
            key === "secret_alliance" &&
            this.getPublicActionCountForPlayer(player_id) <= 0
          ) {
            markTargetUnselectable(node);
            noActionTargetNames.push(
              player && player.name ? player.name : _("Player")
            );
            return;
          }
          if (key === "spread_rumors") {
            const targetSectId = this.getPlayerSectId(player_id);
            if (
              this.getSectBelieverCountFromPublicCounters(targetSectId) <= 0
            ) {
              const sectKey = String(targetSectId);
              if (!spreadRumorsBlockedSectMap[sectKey]) {
                spreadRumorsBlockedSectMap[sectKey] = 1;
                spreadRumorsBlockedSectLabels.push(
                  this.getSectLabel(targetSectId)
                );
              }
              markTargetUnselectable(node);
              return;
            }
          }
          if (key === "faith_war" || key === "faith_debate") {
            const targetSectId = this.getPlayerSectId(player_id);
            if (
              this.getSectBelieverCountFromPublicCounters(targetSectId) <= 0
            ) {
              const sectKey = String(targetSectId);
              if (!combatEmptySectMap[sectKey]) {
                combatEmptySectMap[sectKey] = 1;
                combatEmptySectLabels.push(this.getSectLabel(targetSectId));
              }
              markTargetUnselectable(node);
              return;
            }
          }
          if (
            key === "kowtow_to_me" &&
            !this.canSelectKowtowTargetPlayer(player_id)
          ) {
            const sectId = parseInt(player.player_sect || -1, 10);
            const sectKey = String(sectId);
            if (!blockedKowtowSectMap[sectKey]) {
              blockedKowtowSectMap[sectKey] = 1;
              kowtowTooLargeSectLabels.push(this.getSectLabel(sectId));
            }
            markTargetUnselectable(node);
            return;
          }
          if (!this.canSelectTargetPlayerForCard(key, player_id)) {
            markTargetUnselectable(node);
            return;
          }
          if (
            attackKind &&
            this.isPlayerProtectedBySkill(player_id, attackKind)
          ) {
            markTargetUnselectable(node);
            blockedNames.push(
              player && player.name ? player.name : _("Player")
            );
            return;
          }
          dojo.addClass(node, "selectable_target");
          dojo.removeClass(node, "target_protected");
          dojo.removeClass(node, "target_unselectable");
          dojo.removeClass(node, "target_selected");
          selectableCount += 1;
          if (!this.targetTableHandles) this.targetTableHandles = [];
          this.targetTableHandles.push(
            dojo.connect(node, "onclick", this, function (evt) {
              if (evt) {
                dojo.stopEvent(evt);
              }
              this.onTargetPlayerSelected(player_id);
            })
          );
        }.bind(this)
      );
      return {
        selectableCount: selectableCount,
        blockedNames: blockedNames,
        wandererBlockedNames: wandererBlockedNames,
        noActionTargetNames: noActionTargetNames,
        spreadRumorsBlockedSectLabels: spreadRumorsBlockedSectLabels,
        combatEmptySectLabels: combatEmptySectLabels,
        kowtowTooLargeSectLabels: kowtowTooLargeSectLabels,
        attackKind: attackKind,
      };
    },

    highlightSurrenderLeaderPanels: function (args) {
      this.clearTargetSelection();
      const optionsFromArgs =
        (args && args.leader_options && args.leader_options.length
          ? args.leader_options
          : args && args.candidates
          ? args.candidates
          : []) || [];
      const markTargetUnselectable = function (node) {
        if (!node) return;
        dojo.addClass(node, "target_unselectable");
        dojo.removeClass(node, "target_protected");
        dojo.removeClass(node, "selectable_target");
        dojo.removeClass(node, "target_selected");
      };

      optionsFromArgs.forEach(
        function (option) {
          const pid = parseInt((option && option.id) || 0, 10);
          if (pid <= 0) return;
          const node =
            dojo.byId("panel_" + pid) || dojo.byId("playertable_" + pid);
          if (!node) return;

          const available = parseInt((option && option.available) || 0, 10) === 1;
          if (!available) {
            markTargetUnselectable(node);
            return;
          }

          dojo.addClass(node, "selectable_target");
          dojo.removeClass(node, "target_protected");
          dojo.removeClass(node, "target_unselectable");
          dojo.removeClass(node, "target_selected");

          if (!this.targetTableHandles) this.targetTableHandles = [];
          this.targetTableHandles.push(
            dojo.connect(node, "onclick", this, function (evt) {
              if (evt) dojo.stopEvent(evt);
              this.onChooseSurrenderLeaderClicked(pid);
            })
          );
        }.bind(this)
      );
    },

    clearTargetSelection: function () {
      if (this.targetTableHandles) {
        dojo.forEach(this.targetTableHandles, dojo.disconnect);
      }
      this.targetTableHandles = [];
      Object.keys(this.gamedatas.players).forEach(function (player_id) {
        const panelNode = dojo.byId("panel_" + player_id);
        const tableNode = dojo.byId("playertable_" + player_id);
        if (panelNode) {
          dojo.removeClass(panelNode, "selectable_target");
          dojo.removeClass(panelNode, "target_protected");
          dojo.removeClass(panelNode, "target_unselectable");
          dojo.removeClass(panelNode, "target_selected");
        }
        if (tableNode) {
          dojo.removeClass(tableNode, "selectable_target");
          dojo.removeClass(tableNode, "target_protected");
          dojo.removeClass(tableNode, "target_unselectable");
          dojo.removeClass(tableNode, "target_selected");
        }
      });
    },

    cancelPendingActionSelection: function () {
      this.actionSubmissionInFlight = false;
      this.pendingFaithWarUseZombie = false;
      if (
        this.pendingAction &&
        this.pendingAction.cardKey === "divine_inspire"
      ) {
        this.setDivineInspireSourceLocked(this.pendingAction.cardId, false);
      }
      this.restoreHiddenPendingActionCard(
        this.pendingAction ? this.pendingAction.cardId : null
      );
      if (
        this.pendingAction &&
        this.pendingAction.tempArenaId &&
        dojo.byId(this.pendingAction.tempArenaId)
      ) {
        dojo.destroy(this.pendingAction.tempArenaId);
      }

      this.pendingAction = null;
      this.clearTargetSelection();
      this.playerActionCards.unselectAll();
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(1);
      }
      this.restoreServerGameState();
    },

    onTargetPlayerSelected: function (targetPlayerId) {
      if (!this.pendingAction || this.pendingAction.targetChosen) return;

      const cardKey = this.pendingAction.cardKey;
      if (
        cardKey === "kowtow_to_me" &&
        !this.canSelectKowtowTargetPlayer(targetPlayerId)
      ) {
        const target = this.gamedatas.players[String(targetPlayerId)] || {};
        const targetSectLabel = this.getSectLabel(
          parseInt(target.player_sect || -1, 10)
        );
        this.showMessage(
          targetSectLabel +
            " " +
            _("has too many Believers to be absorbed by Kowtow To Me."),
          "error"
        );
        return;
      }
      if (!this.canSelectTargetPlayerForCard(cardKey, targetPlayerId)) {
        if (this.cardRequiresOwnSectTarget(cardKey)) {
          this.showMessage(
            _("Breaking Faith can only target players in your own Sect."),
            "error"
          );
        } else if (this.cardRequiresAnotherSectTarget(cardKey)) {
          const anotherSectErrorTextByCard = {
            witch_hunt: _("Witch Hunt must target another Sect"),
            spread_rumors: _("Spread Rumors must target another Sect"),
            faith_debate: _("Faith Debate must target another Sect"),
            faith_war: _("Faith War must target another Sect"),
          };
          this.showMessage(
            anotherSectErrorTextByCard[cardKey] ||
              _("This card must target another Sect."),
            "error"
          );
        } else {
          this.showMessage(_("Invalid target."), "error");
        }
        return;
      }
      const attackKind = this.getAttackKindForActionCard(cardKey);
      if (
        attackKind &&
        this.isPlayerProtectedBySkill(targetPlayerId, attackKind)
      ) {
        const targetName =
          (this.gamedatas.players[String(targetPlayerId)] || {}).name ||
          _("Player");
        const kindLabel = attackKind === "mental" ? _("Mental") : _("Physical");
        this.showMessage(
          dojo.string.substitute(
            _(
              "${target_name} is currently protected from ${attack_kind} attacks."
            ),
            {
              target_name: targetName,
              attack_kind: kindLabel,
            }
          ),
          "error"
        );
        return;
      }
      if (cardKey === "spread_rumors") {
        const targetSect = this.getPlayerSectId(targetPlayerId);
        if (this.getSectBelieverCountFromPublicCounters(targetSect) <= 0) {
          const targetSectLabel = this.getSectLabel(targetSect);
          this.showMessage(
            targetSectLabel +
              " " +
              _("has no Believers to snatch with Spread Rumors."),
            "error"
          );
          return;
        }
      }
      if (cardKey === "faith_war" || cardKey === "faith_debate") {
        const targetSect = this.getPlayerSectId(targetPlayerId);
        if (this.getSectBelieverCountFromPublicCounters(targetSect) <= 0) {
          const targetSectLabel = this.getSectLabel(targetSect);
          this.showMessage(
            dojo.string.substitute(
              _("${sect_name} has no Believers for this confrontation."),
              {
                sect_name: targetSectLabel,
              }
            ),
            "error"
          );
          return;
        }
      }
      this.pendingAction.targetChosen = true;
      this.setSelectedTargetPlayerVisual(targetPlayerId);
      if (cardKey === "witch_hunt") {
        this.pendingAction.targetPlayerId = targetPlayerId;
        this.clearTargetSelection();
        this.setSelectedTargetPlayerVisual(targetPlayerId);
        this.setTopInstruction(
          _("Choose a Believer for Witch Hunt, or cancel.")
        );
        this.onUpdateActionButtons("playerTurn", {});
        return;
      }

      if (cardKey === "secret_alliance") {
        if (this.getPublicActionCountForPlayer(targetPlayerId) <= 0) {
          const targetName =
            (this.gamedatas.players[String(targetPlayerId)] || {}).name ||
            _("Player");
          this.showMessage(
            dojo.string.substitute(
              _("${target_name} has no Action cards to exchange."),
              {
                target_name: targetName,
              }
            ),
            "error"
          );
          this.pendingAction.targetChosen = false;
          return;
        }
        this.playPendingAction({ target_id: targetPlayerId });
        return;
      }

      if (cardKey === "faith_war") {
        const useZombie =
          !!this.pendingFaithWarUseZombie &&
          this.canCurrentPlayerChooseZombieArmyForFaithWar() &&
          this.getVisibleGraveyardCount() > 0;
        if (this.pendingFaithWarUseZombie && !useZombie) {
          this.showMessage(
            _(
              "Zombie Army is not available right now, so this Faith War is played normally."
            ),
            "info"
          );
        }
        this.pendingFaithWarUseZombie = false;
        this.playPendingAction(
          useZombie
            ? { target_id: targetPlayerId, use_zombie: 1 }
            : { target_id: targetPlayerId }
        );
        return;
      }

      this.playPendingAction({ target_id: targetPlayerId });
    },

    playPendingAction: function (extraArgs) {
      if (!this.pendingAction || this.actionSubmissionInFlight) return;
      const pendingCardId = this.pendingAction.cardId;
      const pendingCardKey =
        this.pendingAction.cardKey ||
        this.actionCardTypeById[String(pendingCardId)] ||
        this.getActionCardKeyName(this.pendingAction.type);
      const pendingTypeMask =
        this.getActionTypeMaskFromCardType(pendingCardKey);
      const args = Object.assign({ id: pendingCardId }, extraArgs || {});
      const skipImpermanenceConfirm = !!this.skipNextImpermanenceConfirm;
      this.skipNextImpermanenceConfirm = false;
      if (
        pendingCardKey === "kowtow_to_me" &&
        this.isImpermanenceActiveForCurrentPlayer() &&
        !skipImpermanenceConfirm
      ) {
        this.requestClientConfirmation({
          message: _(
            "Recruiting followers with Kowtow To Me will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?"
          ),
          confirmLabel: _("Continue"),
          cancelLabel: _("Cancel Action"),
          onConfirm: function () {
            this.skipNextImpermanenceConfirm = true;
            this.playPendingAction(extraArgs);
          },
          onCancel: function () {
            this.cancelPendingActionSelection();
          },
        });
        return;
      }
      this.actionSubmissionInFlight = true;
      this.lastSubmittedActionCardId = pendingCardId;
      this.lastSubmittedActionAt = Date.now();
      this.clearTargetSelection();
      this.clearPendingActionButtons();
      this.pendingAction = null;
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.playerActionCards.unselectAll();
      this.ajaxAction("playActionCard", args, function () {
        this.consumeHiddenPendingActionCard(pendingCardId);
        this.removeLocalActionCardFromHand(pendingCardId);
        if (pendingTypeMask) {
          this.currentTurnActionMask |= pendingTypeMask;
        }
        if (this.playerActionCards.setSelectionMode) {
          this.playerActionCards.setSelectionMode(1);
        }
        this.restoreServerGameState();
      });
    },

    // --- Action Handlers ---

    onPlayerActionCardsSelectionChanged: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      const stateName = String(this.getCurrentStateName() || "");
      if (
        stateName === "playerTurn" &&
        this.isCurrentPlayerActive() &&
        this.currentTurnPerformedActionsCount >= this.currentTurnMaxActions
      ) {
        this.showMessage(
          _("No action slots left this turn. Use Skill or End Turn."),
          "info"
        );
        this.playerActionCards.unselectAll();
        return;
      }

      const items = this.playerActionCards.getSelectedItems();
      if (items.length <= 0) {
        return;
      }

      if (this.checkAction("confirmDiscardingActionCard", true)) {
        return;
      }

      if (this.isDiscardMode) {
        return;
      }
      if (this.pendingSkill) {
        this.playerActionCards.unselectAll();
        return;
      }

      if (
        this.pendingAction &&
        this.pendingAction.cardKey === "divine_inspire"
      ) {
        return;
      }
      if (
        this.pendingAction &&
        [
          "witch_hunt",
          "faith_war",
          "faith_debate",
          "spread_rumors",
          "info_spy",
          "secret_alliance",
          "kowtow_to_me",
          "breaking_faith",
        ].includes(this.pendingAction.cardKey) &&
        !(
          this.pendingAction.cardKey === "secret_alliance" &&
          this.pendingAction.targetPlayerId
        )
      ) {
        this.playerActionCards.unselectAll();
        return;
      }
      if (
        this.pendingAction &&
        this.pendingAction.cardKey === "secret_alliance" &&
        this.pendingAction.targetPlayerId
      ) {
        return;
      }
      if (this.checkAction("chooseSecretAllianceCard", true)) {
        return;
      }

      if (this.checkAction("playDefenseCard", true)) {
        if (items.length !== 1) {
          this.showMessage(_("Select exactly one defense card"), "error");
          this.playerActionCards.unselectAll();
          return;
        }
        const defenseValidation = this.validateDefenseCardSelectionItem(
          items[0]
        );
        if (!defenseValidation.ok) {
          this.showMessage(defenseValidation.message, "error");
          this.playerActionCards.unselectAll();
          return;
        }
        this.actionSubmissionInFlight = true;
        this.lastSubmittedActionCardId = items[0].id;
        this.lastSubmittedActionAt = Date.now();
        if (this.playerActionCards.setSelectionMode) {
          this.playerActionCards.setSelectionMode(0);
        }
        this.ajaxAction("playDefenseCard", { id: items[0].id }, function () {
          this.playerActionCards.unselectAll();
        });
        return;
      }

      if (!this.checkAction("playActionCard", true)) {
        this.playerActionCards.unselectAll();
        return;
      }

      const card = items[0];
      if (this.isActionCardSoftDisabledById(card && card.id, "myactioncards")) {
        // Defensive guard: ignore any stale selection attempt on visually
        // disabled cards (mouse race, reconnect, or delayed state refresh).
        this.playerActionCards.unselectAll();
        return;
      }
      const now = Date.now();
      if (
        String(this.lastSubmittedActionCardId) === String(card.id) &&
        now - this.lastSubmittedActionAt < 1500
      ) {
        return;
      }
      const skillState =
        this.getSkillStateFromArgs(
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.args) ||
            {}
        ) ||
        this.mySkillState ||
        null;
      const praiseLifeUsedThisTurn =
        this.isPraiseLifeUsedThisTurnForCurrentPlayer(skillState);
      const attackLockedByKarboom =
        parseInt(
          (skillState && skillState.attack_locked_by_karboom) || 0,
          10
        ) === 1 &&
        parseInt((skillState && skillState.karboom_used_this_turn) || 0, 10) ===
          1;

      const card_key =
        this.actionCardTypeById[String(card.id)] ||
        this.getActionCardKeyName(card.type);
      if (card_key === "faith_war" || card_key === "faith_debate") {
        const mySectId = this.getPlayerSectId(this.player_id);
        if (this.getSectBelieverCountFromPublicCounters(mySectId) <= 0) {
          this.showMessage(
            _(
              "Your Sect has no Believers. You can still discard Action cards, then end turn to enter surrender."
            ),
            "error"
          );
          this.playerActionCards.unselectAll();
          return;
        }
      }
      if (card_key === "spread_rumors") {
        let hasValidSpreadTarget = false;
        Object.keys(this.gamedatas.players || {}).forEach(
          function (pid) {
            if (hasValidSpreadTarget) return;
            if (String(pid) === String(this.player_id)) return;
            const p = this.gamedatas.players[pid] || {};
            if (parseInt(p.player_role || 0, 10) === 2) return;
            if (!this.canSelectTargetPlayerForCard("spread_rumors", pid))
              return;
            const targetSect = this.getPlayerSectId(pid);
            if (this.getSectBelieverCountFromPublicCounters(targetSect) > 0) {
              hasValidSpreadTarget = true;
            }
          }.bind(this)
        );
        if (!hasValidSpreadTarget) {
          this.showMessage(
            _("No target Sect currently has Believers for Spread Rumors."),
            "error"
          );
          this.playerActionCards.unselectAll();
          return;
        }
      }
      const defense_only_cards = ["great_mercy", "firm_faith"];
      if (
        defense_only_cards.includes(card_key) &&
        !this.checkAction("playDefenseCard")
      ) {
        this.showMessage(
          _(
            "Great Mercy and Firm Faith are defense cards and can only be played while defending"
          ),
          "error"
        );
        this.playerActionCards.unselectAll();
        return;
      }

      const actionTypeMask = this.getActionTypeMaskFromCardType(card_key);
      if (
        attackLockedByKarboom &&
        (actionTypeMask === 0b00100 || actionTypeMask === 0b00010)
      ) {
        this.showMessage(_("Your attacks are locked this turn."), "error");
        this.playerActionCards.unselectAll();
        return;
      }
      if (
        !praiseLifeUsedThisTurn &&
        actionTypeMask &&
        this.currentTurnActionMask & actionTypeMask
      ) {
        this.showMessage(
          dojo.string.substitute(
            _(
              "You have already used this action type this turn (${action_type})"
            ),
            {
              action_type: this.getActionTypeLabelFromMask(actionTypeMask),
            }
          ),
          "error"
        );
        this.playerActionCards.unselectAll();
        return;
      }
      if (card_key === "its_a_miracle") {
        const graveyardCount = parseInt(
          (dojo.byId("graveyard_count") || {}).innerText || "0"
        );
        if (!graveyardCount) {
          this.showMessage(
            _("You cannot play It's a Miracle when the graveyard is empty"),
            "error"
          );
          this.playerActionCards.unselectAll();
          return;
        }
        if (graveyardCount < 3) {
          this.showMessage(
            dojo.string.substitute(
              _(
                "Graveyard has only ${count} Believers. It's a Miracle will revive only that many."
              ),
              { count: graveyardCount }
            ),
            "info"
          );
        }
      }

      const targeted_cards = [
        "witch_hunt",
        "faith_war",
        "faith_debate",
        "spread_rumors",
        "info_spy",
        "secret_alliance",
        "kowtow_to_me",
        "breaking_faith",
      ];
      if (
        targeted_cards.includes(card_key) &&
        !this.hasSelectableTargetPlayerForCard(card_key)
      ) {
        this.playerActionCards.unselectAll();
        return;
      }
      if (card_key === "divine_inspire") {
        this.beginDivineInspireSelection(card);
        return;
      }

      if (
        card_key === "faith_war" &&
        this.canCurrentPlayerChooseZombieArmyForFaithWar() &&
        this.canUseZombieArmyThisTurnWindow() &&
        this.getVisibleGraveyardCount() > 0
      ) {
        this.beginFaithWarZombieDecision(card);
        return;
      }

      if (targeted_cards.includes(card_key)) {
        this.beginTargetSelection(card);
        return;
      }

      this.actionSubmissionInFlight = true;
      this.lastSubmittedActionCardId = card.id;
      this.lastSubmittedActionAt = Date.now();
      this.lastSubmittedActionSignature = "";
      const submittedTypeMask = actionTypeMask;
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.playerActionCards.unselectAll();
      this.ajaxAction("playActionCard", { id: card.id }, function () {
        this.removeLocalActionCardFromHand(card.id);
        if (submittedTypeMask) {
          this.currentTurnActionMask |= submittedTypeMask;
        }
        this.actionSubmissionInFlight = false;
        this.playerActionCards.unselectAll();
        if (this.playerActionCards.setSelectionMode) {
          this.playerActionCards.setSelectionMode(1);
        }
      });
    },

    onPlayerBelieverSelectionChanged: function () {
      this.rememberPreferredDuelBelieverSelection();
    },

    onPlayerSkillSelectionChanged: function () {
      if (this.isDiscardMode) {
        this.playerSkillCards.unselectAll();
        return;
      }
      const items = this.playerSkillCards.getSelectedItems();
      if (!items || items.length <= 0) return;
      this.playerSkillCards.unselectAll();
      this.onUseSkillButtonClicked({ fromSkillCard: true });
    },

    skillUseNeedsManualSelection: function (skillType) {
      const t = parseInt(skillType || 0, 10);
      return [2, 7, 8, 9, 11, 13].indexOf(t) !== -1;
    },

    onConfirmDivineInspireClicked: function () {
      if (
        !this.pendingAction ||
        this.pendingAction.cardKey !== "divine_inspire"
      ) {
        return;
      }
      if (this.actionSubmissionInFlight) {
        return;
      }

      const selected = this.playerActionCards.getSelectedItems() || [];
      const sourceCardId = parseInt(
        (this.pendingAction && this.pendingAction.cardId) || 0,
        10
      );
      const discardIds = this.getSelectedActionCardIdsInHand(
        selected,
        "myactioncards"
      )
        .filter(function (id) {
          const cid = parseInt(id || 0, 10);
          return cid > 0 && cid !== sourceCardId;
        })
        .filter(
          function (id, idx, arr) {
            return arr.indexOf(id) === idx;
          }
        );

      if (discardIds.length < 1) {
        this.showMessage(
          _("Select at least one other Action card to discard"),
          "error"
        );
        return;
      }

      const submittedTypeMask =
        this.getActionTypeMaskFromCardType("divine_inspire");
      const localDiscardCards = discardIds
        .map(
          function (cardId) {
            const id = parseInt(cardId || 0, 10) || 0;
            const type = this.actionCardTypeById[String(id)] || "";
            return id > 0 && type ? { id: id, type: type } : null;
          }.bind(this)
        )
        .filter(function (card) {
          return !!card;
        });
      this.actionSubmissionInFlight = true;
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.ajaxAction(
        "playActionCard",
        {
          id: sourceCardId,
          card_ids: discardIds.join(";"),
        },
        function () {
          this.animateActionCardsToDiscard(this.player_id, localDiscardCards);
          this.markActionDiscardFlightSuppressed(localDiscardCards);
          this.consumeHiddenPendingActionCard(this.pendingAction.cardId);
          this.setDivineInspireSourceLocked(this.pendingAction.cardId, false);
          this.removeLocalActionCardFromHand(this.pendingAction.cardId);
          if (submittedTypeMask) {
            this.currentTurnActionMask |= submittedTypeMask;
          }
          discardIds.forEach(
            function (cardId) {
              this.removeLocalActionCardFromHand(cardId);
            }.bind(this)
          );

          let countElem = dojo.byId("table_action_count_" + this.player_id);
          if (countElem) {
            countElem.innerHTML = String(
              this.getStockDomCount("myactioncards")
            );
          }

          if (
            this.pendingAction &&
            this.pendingAction.tempArenaId &&
            dojo.byId(this.pendingAction.tempArenaId)
          ) {
            dojo.destroy(this.pendingAction.tempArenaId);
          }

          this.pendingAction = null;
          this.playerActionCards.unselectAll();
          if (this.playerActionCards.setSelectionMode) {
            this.playerActionCards.setSelectionMode(1);
          }
          this.restoreServerGameState();
        }
      );
    },

    onConfirmSecretAllianceOwnCardClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (!this.checkAction("chooseSecretAllianceCard", true)) {
        return;
      }
      const selectedCardId =
        this.getSingleSelectedActionCardIdFromHand("myactioncards");
      if (!selectedCardId) {
        this.showMessage(_("Select exactly one Action card to offer"), "error");
        return;
      }
      this.actionSubmissionInFlight = true;
      if (this.playerActionCards && this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.ajaxAction(
        "chooseSecretAllianceCard",
        { id: selectedCardId },
        function () {
          this.playerActionCards.unselectAll();
        }
      );
    },

    onConfirmSecretAllianceTargetCardClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      const selectedCardId =
        this.getSingleSelectedActionCardIdFromHand("myactioncards");
      if (!selectedCardId) {
        this.showMessage(_("Select exactly one Action card"), "error");
        return;
      }
      if (!this.checkAction("chooseSecretAllianceCard", true)) {
        return;
      }
      this.actionSubmissionInFlight = true;
      if (this.playerActionCards && this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.ajaxAction(
        "chooseSecretAllianceCard",
        { id: selectedCardId },
        function () {
          this.playerActionCards.unselectAll();
        }
      );
    },

    resolveSelectedActionCardIdFromStockItem: function (item, rootId) {
      const root = dojo.byId(rootId || "myactioncards");
      const selectedNode = root
        ? dojo.query(
            ".stockitem.stockitem_selected, .stockitem.selected, .stockitem_selected, .selected",
            root
          )[0]
        : null;
      if (selectedNode) {
        const selectedNodeIds = this.extractActionCardIdCandidatesFromStockNode(
          selectedNode,
          rootId || "myactioncards"
        );
        for (let i = 0; i < selectedNodeIds.length; i++) {
          const selectedNodeCardId = parseInt(selectedNodeIds[i] || 0, 10);
          if (
            selectedNodeCardId > 0 &&
            this.actionCardTypeById[String(selectedNodeCardId)] &&
            this.getActionStockItemNodeByCardId(
              selectedNodeCardId,
              rootId || "myactioncards"
            )
          ) {
            return selectedNodeCardId;
          }
        }
      }

      const itemCandidates = [];
      const pushCandidate = function (v) {
        const n = parseInt(v || 0, 10);
        if (n > 0 && itemCandidates.indexOf(n) === -1) {
          itemCandidates.push(n);
        }
      };

      if (item) {
        pushCandidate(item.id);
        pushCandidate(item.item_id);
        pushCandidate(item.card_id);
        pushCandidate(
          this.extractActionCardIdFromStockItemId(
            item.id,
            rootId || "myactioncards"
          )
        );
      }

      for (let i = 0; i < itemCandidates.length; i++) {
        const cid = itemCandidates[i];
        if (
          this.actionCardTypeById[String(cid)] &&
          this.getActionStockItemNodeByCardId(cid, rootId || "myactioncards")
        ) {
          return cid;
        }
      }

      return 0;
    },

    getSelectedActionCardIdsInHand: function (items, rootId) {
      const selected = [];
      const pushIfValid = function (candidateId) {
        const cid = parseInt(candidateId || 0, 10);
        if (cid <= 0) return;
        if (!this.actionCardTypeById[String(cid)]) return;
        if (
          !this.getActionStockItemNodeByCardId(cid, rootId || "myactioncards")
        )
          return;
        if (selected.indexOf(cid) === -1) {
          selected.push(cid);
        }
      }.bind(this);

      (items || []).forEach(
        function (item) {
          if (!item) return;
          pushIfValid(item.card_id);
          pushIfValid(item.item_id);
          pushIfValid(item.id);
          const resolved = this.resolveSelectedActionCardIdFromStockItem(
            item,
            rootId || "myactioncards"
          );
          pushIfValid(resolved);
        }.bind(this)
      );

      const root = dojo.byId(rootId || "myactioncards");
      if (root) {
        dojo
          .query(
            ".stockitem.stockitem_selected, .stockitem.selected, .stockitem_selected, .selected",
            root
          )
          .forEach(
            function (node) {
              this.extractActionCardIdCandidatesFromStockNode(
                node,
                rootId || "myactioncards"
              ).forEach(
                function (cid) {
                  pushIfValid(cid);
                }.bind(this)
              );
            }.bind(this)
          );
      }

      return selected;
    },

    onUseDefenseCardClicked: function () {
      const items = this.playerActionCards.getSelectedItems();
      if (items.length !== 1) {
        this.showMessage(_("Select exactly one defense card"), "error");
        return;
      }
      const defenseValidation = this.validateDefenseCardSelectionItem(items[0]);
      if (!defenseValidation.ok) {
        this.showMessage(defenseValidation.message, "error");
        this.playerActionCards.unselectAll();
        return;
      }

      if (this.checkAction("playDefenseCard")) {
        this.ajaxAction("playDefenseCard", { id: items[0].id }, function () {
          this.playerActionCards.unselectAll();
        });
      }
    },

    onPassDefenseClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (this.checkAction("passDefense")) {
        this.lastSubmittedActionSignature = "";
        this.lastSubmittedActionCardId = null;
        this.actionSubmissionInFlight = true;
        this.ajaxAction("passDefense", {}, function () {
          this.playerActionCards.unselectAll();
        });
      }
    },

    onConfirmBelieverClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      this.ensureZombieGraveSelectionStillValid();
      const items = this.playerBelieverCards.getSelectedItems();
      const stateName =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.name) ||
        "";
      const canUseZombieFromGrave =
        stateName === "faithWarDuel" &&
        this.canCurrentPlayerUseZombieArmyFromGrave();
      const isHeadToHeadDuelState =
        stateName === "faithWarDuel" || stateName === "faithDebateDuel";
      const isAoeCommitState =
        stateName === "martyrdomChooseBelievers" ||
        stateName === "conspiracyChooseBelievers";
      const myId = parseInt(this.player_id || 0, 10);
      const aoeAlreadyCommitted =
        isAoeCommitState && myId > 0
          ? this.hasAoeCommittedBelieverByPlayer(myId)
          : false;
      const aoeTargetFallbackAllowed =
        isAoeCommitState &&
        !aoeAlreadyCommitted &&
        this.isCurrentPlayerInAoeCommitTargets();
      if (aoeAlreadyCommitted) {
        this.showMessage(
          _(
            "You already committed your Believer. Please wait for confrontation to continue."
          ),
          "info"
        );
        dojo.removeClass("mybelievercards", "highlight_stock");
        return;
      }
      if (
        isHeadToHeadDuelState &&
        this.hasCommittedDuelBelieverThisRound &&
        this.isCurrentPlayerActive() &&
        this.checkAction("playBelieverCard", true)
      ) {
        // Safety against stale local latch between duel rounds.
        this.hasCommittedDuelBelieverThisRound = false;
      }
      if (isHeadToHeadDuelState && this.hasCommittedDuelBelieverThisRound) {
        this.showMessage(
          _("You already committed your Believer this round. Please wait."),
          "info"
        );
        dojo.removeClass("mybelievercards", "highlight_stock");
        return;
      }
      if (isHeadToHeadDuelState && !this.isCurrentPlayerActive()) {
        this.showMessage(
          _("Please wait for confrontation to continue."),
          "info"
        );
        dojo.removeClass("mybelievercards", "highlight_stock");
        return;
      }
      let card_id = 0;
      if (items.length === 1) {
        card_id = parseInt(items[0].id, 10);
        this.clearZombieGraveSelection();
      } else if (items.length === 0 && canUseZombieFromGrave) {
        const selected = this.getZombieGraveSelectionCard();
        if (!selected || !selected.id) {
          this.showMessage(
            _("Please choose one graveyard Believer first (Zombie Army)."),
            "error"
          );
          return;
        }
        card_id = parseInt(selected.id, 10);
      } else {
        this.showMessage(_("Please select exactly one Believer card"), "error");
        return;
      }

      if (
        this.checkAction("playBelieverCard", true) ||
        aoeTargetFallbackAllowed
      ) {
        this.actionSubmissionInFlight = true;
        this.ajaxAction("playBelieverCard", { id: card_id }, function () {
          this.actionSubmissionInFlight = false;
          this.clearPreferredDuelBelieverSelection();
          this.playerBelieverCards.unselectAll();
          this.clearZombieGraveSelection();
          this.closeZombieGravePickerModal();
        });
      }
    },

    onToggleDiscardModeClicked: function () {
      if (!this.checkAction("discardActionCards")) {
        return;
      }
      if (!this.hasRemainingActionSlotsThisTurn()) {
        this.showMessage(
          _(
            "No action slots left this turn. Use an available Skill or End Turn."
          ),
          "info"
        );
        this.isDiscardMode = false;
        this.playerActionCards.unselectAll();
        if (this.playerActionCards.setSelectionMode) {
          this.playerActionCards.setSelectionMode(1);
        }
        this.onUpdateActionButtons("playerTurn", {});
        return;
      }

      this.actionSubmissionInFlight = false;
      this.lastSubmittedActionSignature = "";
      this.restoreHiddenPendingActionCard();
      this.pendingAction = null;
      this.clearTargetSelection();
      this.playerActionCards.unselectAll();
      this.isDiscardMode = !this.isDiscardMode;

      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(this.isDiscardMode ? 2 : 1);
      }

      if (this.isDiscardMode) {
        this.showMessage(
          _(
            "Discard mode: select one or more Action cards, then click Discard Action Card(s) again to confirm"
          ),
          "info"
        );
      } else {
        this.showMessage(_("Discard mode cancelled"), "info");
      }
      this.onUpdateActionButtons("playerTurn", {});
    },

    onCancelDiscardModeClicked: function () {
      this.isDiscardMode = false;
      this.playerActionCards.unselectAll();
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(1);
      }
      this.showMessage(_("Discard mode cancelled"), "info");
      this.onUpdateActionButtons("playerTurn", {});
    },

    onDiscardSelectedActionsClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (!this.checkAction("discardActionCards")) {
        return;
      }
      if (!this.hasRemainingActionSlotsThisTurn()) {
        this.showMessage(
          _(
            "No action slots left this turn. Use an available Skill or End Turn."
          ),
          "info"
        );
        this.isDiscardMode = false;
        this.playerActionCards.unselectAll();
        if (this.playerActionCards.setSelectionMode) {
          this.playerActionCards.setSelectionMode(1);
        }
        this.onUpdateActionButtons("playerTurn", {});
        return;
      }

      const items = this.playerActionCards.getSelectedItems();
      if (!items.length) {
        this.showMessage(
          _("Select one or more Action cards to discard"),
          "error"
        );
        return;
      }

      const discardIds = items.map(function (item) {
        return item.id;
      });

      this.actionSubmissionInFlight = true;
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.ajaxAction(
        "discardActionCards",
        { ids: discardIds.join(";") },
        function () {
          this.isDiscardMode = false;
          if (this.playerActionCards.setSelectionMode) {
            this.playerActionCards.setSelectionMode(1);
          }
          this.playerActionCards.unselectAll();
          this.onUpdateActionButtons("playerTurn", {});
        }
      );
    },

    onConfirmEndTurnDiscardingActionCardsClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (!this.checkAction("confirmDiscardingActionCard")) {
        return;
      }

      const stateArgs =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args) ||
        {};
      const requiredDiscardCount = Math.max(
        0,
        parseInt((stateArgs && stateArgs.required_discard_count) || 0, 10) || 0
      );
      const items = this.playerActionCards.getSelectedItems() || [];
      if (requiredDiscardCount > 0 && items.length !== requiredDiscardCount) {
        this.showMessage(
          dojo.string.substitute(
            _("You must select exactly ${n} Action card(s) to discard."),
            { n: requiredDiscardCount }
          ),
          "error"
        );
        return;
      }
      if (!items.length) {
        this.showMessage(_("Select Action card(s) to discard."), "error");
        return;
      }

      const discardIds = items.map(function (item) {
        return parseInt((item && item.id) || 0, 10) || 0;
      }).filter(function (id) {
        return id > 0;
      });
      if (!discardIds.length) {
        this.showMessage(_("Select Action card(s) to discard."), "error");
        return;
      }

      this.actionSubmissionInFlight = true;
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.ajaxAction(
        "confirmDiscardingActionCard",
        { ids: discardIds.join(";") },
        function () {
          this.actionSubmissionInFlight = false;
          this.playerActionCards.unselectAll();
        }
      );
    },

    onEndTurnButtonClicked: function () {
      if (this.checkAction("endTurn")) {
        if (this.actionSubmissionInFlight) {
          return;
        }
        this.ajaxAction("endTurn", {});
      }
    },

    normalizeInitialSkillChoices: function (rawChoices) {
      const list = Array.isArray(rawChoices)
        ? rawChoices
        : Object.values(rawChoices || {});
      const out = [];
      list.forEach(function (card) {
        const cardId = parseInt((card && card.id) || 0, 10);
        const skillType = parseInt((card && card.type) || 0, 10);
        if (!(cardId > 0) || !(skillType > 0)) return;
        out.push({
          id: cardId,
          type: skillType,
          type_arg: parseInt((card && card.type_arg) || 0, 10) || 0,
        });
      });
      return out;
    },

    clearInitialSkillDraftArea: function () {
      const area = dojo.byId("initial_skill_draft_area");
      if (area) {
        dojo.destroy(area);
      }
      this.initialSkillDraftSelectedId = 0;
    },

    renderInitialSkillDraftArea: function (choices, interactive) {
      const arena = dojo.byId("central_arena");
      if (!arena) return;
      const normalized = this.normalizeInitialSkillChoices(choices || []);
      const allowedIds = {};
      normalized.forEach(function (card) {
        allowedIds[String(parseInt((card && card.id) || 0, 10))] = 1;
      });
      if (!allowedIds[String(this.initialSkillDraftSelectedId || 0)]) {
        this.initialSkillDraftSelectedId = 0;
      }

      let area = dojo.byId("initial_skill_draft_area");
      if (!area) {
        area = dojo.create(
          "div",
          { id: "initial_skill_draft_area", className: "initial-skill-draft-area" },
          arena
        );
      } else {
        area.innerHTML = "";
      }
      dojo.toggleClass(area, "is-interactive", !!interactive);

      dojo.create(
        "div",
        {
          className: "initial-skill-draft-title",
          innerHTML: _("Choose one starting Skill you like for this game."),
        },
        area
      );
      dojo.create(
        "div",
        {
          className: "initial-skill-draft-subtitle",
          innerHTML: interactive
            ? _("Hover on a card to read Skill details.")
            : _("Waiting for other players to choose Skills."),
        },
        area
      );

      const row = dojo.create(
        "div",
        { className: "initial-skill-draft-cards" },
        area
      );

      normalized.forEach(
        function (card) {
          const cardId = parseInt((card && card.id) || 0, 10);
          const skillType = parseInt((card && card.type) || 0, 10);
          if (!(cardId > 0) || !(skillType > 0)) return;
          const node = dojo.create(
            "div",
            {
              id: "initial_skill_draft_card_" + cardId,
              className: "card card-skill initial-skill-draft-card is-selectable",
            },
            row
          );
          dojo.attr(node, "data-index", skillType);
          dojo.attr(node, "data-card-id", cardId);
          dojo.toggleClass(
            node,
            "is-selected",
            parseInt(this.initialSkillDraftSelectedId || 0, 10) === cardId
          );
          this.attachSkillTooltip(node, skillType, this.mySkillState || null);
          dojo.connect(
            node,
            "onclick",
            this,
            function () {
              this.onChooseInitialSkillClicked(cardId);
            }.bind(this)
          );
        }.bind(this)
      );
    },

    onChooseInitialSkillClicked: function (cardId) {
      const cid = parseInt(cardId || 0, 10);
      if (!(cid > 0)) return;
      const exists = (this.initialSkillChoices || []).some(function (card) {
        return parseInt((card && card.id) || 0, 10) === cid;
      });
      if (!exists) return;
      this.initialSkillDraftSelectedId = cid;
      this.onUpdateActionButtons(
        "chooseInitialSkill",
        (this.gamedatas && this.gamedatas.gamestate && this.gamedatas.gamestate.args) ||
          {}
      );
    },

    onConfirmInitialSkillDraftClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (!this.checkAction("chooseInitialSkill")) {
        return;
      }
      const selectedId = parseInt(this.initialSkillDraftSelectedId || 0, 10);
      if (!(selectedId > 0)) {
        this.showMessage(
          _("Please select exactly 1 starting Skill card."),
          "error"
        );
        return;
      }
      this.actionSubmissionInFlight = true;
      this.ajaxAction(
        "chooseInitialSkill",
        { card_id: selectedId },
        function () {
          this.clearInitialSkillDraftArea();
          this.setTopInstruction(_("Waiting for other players to choose Skills."));
        }
      );
    },

    onWandererStealTargetClicked: function (targetId) {
      if (this.checkAction("wandererSteal")) {
        this.ajaxAction("wandererSteal", { target_id: targetId });
      }
    },

    onChooseSurrenderLeaderClicked: function (leaderId) {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (this.checkAction("surrender")) {
        if (this.isImpermanenceActiveForCurrentPlayer()) {
          this.requestClientConfirmation({
            message: _(
              "Surrender will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?"
            ),
            confirmLabel: _("Continue"),
            cancelLabel: _("Cancel"),
            onConfirm: function () {
              this.actionSubmissionInFlight = true;
              this.setSelectedTargetPlayerVisual(leaderId);
              this.ajaxAction("surrender", { leader_id: leaderId });
            },
            onCancel: function () {
              this.rerenderCurrentActionButtons();
            },
          });
          return;
        }
        this.actionSubmissionInFlight = true;
        this.setSelectedTargetPlayerVisual(leaderId);
        this.ajaxAction("surrender", { leader_id: leaderId });
      }
    },

    onAcceptLeaderSupportClicked: function () {
      this.ajaxAction("acceptLeaderSupport", {});
    },

    onRejectLeaderSupportClicked: function () {
      this.ajaxAction("rejectLeaderSupport", {});
    },

    onAcceptSurrenderRequestClicked: function () {
      // Hidden-skill rule: do not expose any Impermanence-related hint on accept.
      this.ajaxAction("acceptSurrenderRequest", {});
    },

    onRejectSurrenderRequestClicked: function () {
      this.ajaxAction("rejectSurrenderRequest", {});
    },

    onConfirmGiveBelieverClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (!this.checkAction("giveBeliever")) {
        return;
      }
      const items = this.playerBelieverCards.getSelectedItems() || [];
      if (items.length !== 1) {
        this.showMessage(_("Please select exactly one Believer card"), "error");
        return;
      }
      this.actionSubmissionInFlight = true;
      this.ajaxAction(
        "giveBeliever",
        { id: parseInt(items[0].id, 10) },
        function () {
          dojo.removeClass("mybelievercards", "highlight_stock");
          this.playerBelieverCards.unselectAll();
        }
      );
    },

    onCancelGiveBelieverClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (!this.checkAction("cancelGiveBeliever")) {
        return;
      }
      this.requestClientConfirmation({
        message: _(
          "Cancel this surrender/support? The pending Follower will not receive a Believer and surrender flow will continue."
        ),
        confirmLabel: _("Confirm Cancel"),
        cancelLabel: _("Keep Giving Believer"),
        onConfirm: function () {
          this.actionSubmissionInFlight = true;
          this.ajaxAction("cancelGiveBeliever", {}, function () {
            dojo.removeClass("mybelievercards", "highlight_stock");
            this.playerBelieverCards.unselectAll();
          });
        },
        onCancel: function () {
          this.rerenderCurrentActionButtons();
        },
      });
    },

    onBecomeWandererButtonClicked: function () {
      if (this.checkAction("becomeWanderer")) {
        if (this.isImpermanenceActiveForCurrentPlayer()) {
          this.requestClientConfirmation({
            message: _(
              "Becoming Wanderer will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?"
            ),
            confirmLabel: _("Continue"),
            cancelLabel: _("Cancel"),
            onConfirm: function () {
              this.ajaxAction("becomeWanderer", {});
            },
            onCancel: function () {
              this.rerenderCurrentActionButtons();
            },
          });
          return;
        }
        this.ajaxAction("becomeWanderer", {});
      }
    },

    onChooseWarRepresentativeClicked: function (representativeId) {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (this.checkAction("chooseWarRepresentative")) {
        this.actionSubmissionInFlight = true;
        this.ajaxAction("chooseWarRepresentative", {
          representative_id: representativeId,
        });
      }
    },

    onChooseConspiracyRepresentativeClicked: function (representativeId) {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (this.checkAction("chooseConspiracyRepresentative")) {
        this.actionSubmissionInFlight = true;
        this.ajaxAction("chooseConspiracyRepresentative", {
          representative_id: representativeId,
        });
      }
    },

    onChooseMartyrdomRepresentativeClicked: function (representativeId) {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (this.checkAction("chooseMartyrdomRepresentative")) {
        this.actionSubmissionInFlight = true;
        this.ajaxAction("chooseMartyrdomRepresentative", {
          representative_id: representativeId,
        });
      }
    },

    onChooseFaithDebateRepresentativeClicked: function (representativeId) {
      if (this.actionSubmissionInFlight) {
        return;
      }
      if (this.checkAction("chooseFaithDebateRepresentative")) {
        this.actionSubmissionInFlight = true;
        this.ajaxAction("chooseFaithDebateRepresentative", {
          representative_id: representativeId,
        });
      }
    },

    onStopFaithDebateClicked: function () {
      const stateName = this.getCurrentStateName();
      const stateArgs =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.args) ||
        {};
      if (
        stateName !== "faithDebateDuel" ||
        this.hasCommittedDuelBelieverThisRound ||
        !this.canCurrentPlayerRequestFaithDebateStop(stateArgs)
      ) {
        return;
      }
      if (this.checkAction("stopFaithDebate", true)) {
        this.ajaxAction("stopFaithDebate", {});
        return;
      }
      if (
        stateName === "faithDebateDuel" &&
        !this.hasCommittedDuelBelieverThisRound &&
        this.canCurrentPlayerRequestFaithDebateStop(stateArgs)
      ) {
        // checkAction can desync in multiple-active state; backend remains authoritative.
        this.ajaxAction("stopFaithDebate", {});
      }
    },

    // --- Notifications ---
    setupNotifications: function () {
      dojo.subscribe("actionCardPlayed", this, "notif_actionCardPlayed");
      dojo.subscribe("newActionCards", this, "notif_newActionCards");
      dojo.subscribe("drawActionCards", this, "notif_drawActionCards");
      dojo.subscribe(
        "reshuffleActionDiscard",
        this,
        "notif_reshuffleActionDiscard"
      );
      dojo.subscribe("haveACharity", this, "notif_haveACharity");
      dojo.subscribe("divineInspiration", this, "notif_divineInspiration");
      dojo.subscribe("greatMercy", this, "notif_greatMercy");
      dojo.subscribe("infoSpy", this, "notif_infoSpy");
      dojo.subscribe("infoSpyFinished", this, "notif_infoSpyFinished");
      dojo.subscribe("newBelievers", this, "notif_newBelievers");
      dojo.subscribe("spyResult", this, "notif_spyResult");
      dojo.subscribe("believerStolen", this, "notif_believerStolen");
      dojo.subscribe("believersDiscarded", this, "notif_believersDiscarded");
      dojo.subscribe("breakingFaithStart", this, "notif_breakingFaithStart");
      dojo.subscribe("spreadRumorsStart", this, "notif_spreadRumorsStart");
      dojo.subscribe("spreadRumors", this, "notif_spreadRumors");
      dojo.subscribe("spreadRumorsSummary", this, "notif_spreadRumorsSummary");
      dojo.subscribe(
        "secretAllianceExchanged",
        this,
        "notif_secretAllianceExchanged"
      );
      dojo.subscribe(
        "actionCardsDiscarded",
        this,
        "notif_actionCardsDiscarded"
      );
      dojo.subscribe(
        "defenseDecisionPhase",
        this,
        "notif_defenseDecisionPhase"
      );
      dojo.subscribe("defensePlayed", this, "notif_defensePlayed");
      dojo.subscribe("passDefense", this, "notif_passDefense");
      dojo.subscribe("combatBlocked", this, "notif_combatBlocked");
      dojo.subscribe("becomeWanderer", this, "notif_becomeWanderer");
      dojo.subscribe("wandererSteal", this, "notif_wandererSteal");
      dojo.subscribe("wandererReborn", this, "notif_wandererReborn");
      dojo.subscribe("martyrdomStart", this, "notif_martyrdomStart");
      dojo.subscribe(
        "martyrdomAttackerCommitted",
        this,
        "notif_martyrdomAttackerCommitted"
      );
      dojo.subscribe(
        "martyrdomRepresentativePhase",
        this,
        "notif_martyrdomRepresentativePhase"
      );
      dojo.subscribe(
        "martyrdomRepresentativeChosen",
        this,
        "notif_martyrdomRepresentativeChosen"
      );
      dojo.subscribe(
        "martyrdomAssignedToYou",
        this,
        "notif_martyrdomAssignedToYou"
      );
      dojo.subscribe(
        "martyrdomBelieverCommitted",
        this,
        "notif_martyrdomBelieverCommitted"
      );
      dojo.subscribe(
        "martyrdomDefendersChoose",
        this,
        "notif_martyrdomDefendersChoose"
      );
      dojo.subscribe("martyrdomResolved", this, "notif_martyrdomResolved");
      dojo.subscribe("faithDebateStart", this, "notif_faithDebateStart");
      dojo.subscribe(
        "faithDebateRepresentativePhase",
        this,
        "notif_faithDebateRepresentativePhase"
      );
      dojo.subscribe(
        "faithDebateRepresentativeChosen",
        this,
        "notif_faithDebateRepresentativeChosen"
      );
      dojo.subscribe("faithDebateRound", this, "notif_faithDebateRound");
      dojo.subscribe(
        "faithDebateCardPlayed",
        this,
        "notif_faithDebateCardPlayed"
      );
      dojo.subscribe("faithDebateResult", this, "notif_faithDebateResult");
      dojo.subscribe("faithDebateStopped", this, "notif_faithDebateStopped");
      dojo.subscribe(
        "faithDebateStopProposed",
        this,
        "notif_faithDebateStopProposed"
      );
      dojo.subscribe(
        "faithDebateStopRejected",
        this,
        "notif_faithDebateStopRejected"
      );
      dojo.subscribe(
        "faithDebateStopRejectedPrivate",
        this,
        "notif_faithDebateStopRejectedPrivate"
      );
      dojo.subscribe("faithDebateEnd", this, "notif_faithDebateEnd");
      dojo.subscribe(
        "conspiracyRepresentativePhase",
        this,
        "notif_conspiracyRepresentativePhase"
      );
      dojo.subscribe("witchHuntStart", this, "notif_witchHuntStart");
      dojo.subscribe("witchHunt", this, "notif_witchHunt");
      dojo.subscribe(
        "conspiracyRepresentativeChosen",
        this,
        "notif_conspiracyRepresentativeChosen"
      );
      dojo.subscribe(
        "conspiracyAssignedToYou",
        this,
        "notif_conspiracyAssignedToYou"
      );
      dojo.subscribe(
        "conspiracyDefendersChoose",
        this,
        "notif_conspiracyDefendersChoose"
      );
      dojo.subscribe("conspiracyStart", this, "notif_conspiracyStart");
      dojo.subscribe(
        "conspiracyBelieverCommitted",
        this,
        "notif_conspiracyBelieverCommitted"
      );
      dojo.subscribe("conspiracyResolved", this, "notif_conspiracyResolved");
      dojo.subscribe("faithWarStart", this, "notif_faithWarStart");
      dojo.subscribe(
        "faithWarRepresentativePhase",
        this,
        "notif_faithWarRepresentativePhase"
      );
      dojo.subscribe(
        "faithWarRepresentativeChosen",
        this,
        "notif_faithWarRepresentativeChosen"
      );
      dojo.subscribe(
        "faithWarAssignedToYou",
        this,
        "notif_faithWarAssignedToYou"
      );
      dojo.subscribe("faithWarRound", this, "notif_faithWarRound");
      dojo.subscribe("faithWarCardPlayed", this, "notif_faithWarCardPlayed");
      dojo.subscribe("duelResult", this, "notif_duelResult");
      dojo.subscribe("duelBonus", this, "notif_duelBonus");
      dojo.subscribe("faithWarEnd", this, "notif_faithWarEnd");
      dojo.subscribe("finalStruggleStart", this, "notif_finalStruggleStart");
      dojo.subscribe(
        "finalInfiniteWarStarted",
        this,
        "notif_finalInfiniteWarStarted"
      );
      dojo.subscribe(
        "finalStruggleConspiracyEnd",
        this,
        "notif_finalStruggleConspiracyEnd"
      );
      dojo.subscribe("publicCountsSync", this, "notif_publicCountsSync");
      dojo.subscribe("skillKarboom", this, "notif_skillKarboom");
      dojo.subscribe("skillHeadstronger", this, "notif_skillHeadstronger");
      dojo.subscribe(
        "skillPurpleHermitActivated",
        this,
        "notif_skillPurpleHermitActivated"
      );
      dojo.subscribe(
        "skillPurpleHermitFinale",
        this,
        "notif_skillPurpleHermitFinale"
      );
      dojo.subscribe(
        "skillGateTruthCopied",
        this,
        "notif_skillGateTruthCopied"
      );
      dojo.subscribe("skillAscendWithMe", this, "notif_skillAscendWithMe");
      dojo.subscribe("skillPraiseLife", this, "notif_skillPraiseLife");
      dojo.subscribe("skillWorldPeace", this, "notif_skillWorldPeace");
      dojo.subscribe("skillEternalTruth", this, "notif_skillEternalTruth");
      dojo.subscribe(
        "skillSoulSeveringSword",
        this,
        "notif_skillSoulSeveringSword"
      );
      dojo.subscribe("soulBladeMarked", this, "notif_soulBladeMarked");
      dojo.subscribe(
        "soulBladeTurnSkipped",
        this,
        "notif_soulBladeTurnSkipped"
      );
      dojo.subscribe(
        "soulBladeTurnSkippedPrivate",
        this,
        "notif_soulBladeTurnSkippedPrivate"
      );
      dojo.subscribe("skillEveryoneEqual", this, "notif_skillEveryoneEqual");
      dojo.subscribe("skillChaosComing", this, "notif_skillChaosComing");
      dojo.subscribe("skillAutoDefense", this, "notif_skillAutoDefense");
      dojo.subscribe("skillHolyRebirth", this, "notif_skillHolyRebirth");
      dojo.subscribe("reverseKarmaStatus", this, "notif_reverseKarmaStatus");
      dojo.subscribe(
        "prophetPredictionStarted",
        this,
        "notif_prophetPredictionStarted"
      );
      dojo.subscribe(
        "prophetPredictionResolved",
        this,
        "notif_prophetPredictionResolved"
      );
      dojo.subscribe("prophetGuessChosen", this, "notif_prophetGuessChosen");
      dojo.subscribe("prophetGuessPassed", this, "notif_prophetGuessPassed");
      dojo.subscribe("skillRevealed", this, "notif_skillRevealed");
      dojo.subscribe("impermanenceFailed", this, "notif_impermanenceFailed");
      dojo.subscribe(
        "impermanenceVictoryShowcase",
        this,
        "notif_impermanenceVictoryShowcase"
      );
      dojo.subscribe("gameEndSummaryShow", this, "notif_gameEndSummaryShow");
      dojo.subscribe(
        "gameEndSummaryClosing",
        this,
        "notif_gameEndSummaryClosing"
      );
      dojo.subscribe("skillHiddenReset", this, "notif_skillHiddenReset");
      dojo.subscribe("skillCardReplaced", this, "notif_skillCardReplaced");
      dojo.subscribe(
        "initialSkillActivePlayerChanged",
        this,
        "notif_initialSkillActivePlayerChanged"
      );
      dojo.subscribe("syncBelieverHand", this, "notif_syncBelieverHand");
      dojo.subscribe("syncActionHand", this, "notif_syncActionHand");
      dojo.subscribe("skillStateUpdated", this, "notif_skillStateUpdated");
      dojo.subscribe("playerIdentitySync", this, "notif_playerIdentitySync");
      dojo.subscribe(
        "practiceAiPlayersChanged",
        this,
        "notif_practiceAiPlayersChanged"
      );
      dojo.subscribe(
        "practiceAiStepRequested",
        this,
        "notif_practiceAiStepRequested"
      );
      dojo.subscribe("botThinking", this, "notif_botThinking");
      dojo.subscribe(
        "kowtowForcedAbsorbed",
        this,
        "notif_kowtowForcedAbsorbed"
      );

      if (this.notifqueue != null) {
        const replaySyncBoost = this.isReplaySessionActive() ? 1.35 : 1;
        const duelResolveSyncMs = Math.round(
          Math.max(
            this.getCombatResultHoldMs() + 200,
            this.getUnifiedRevealFlipMs() +
              this.getUnifiedRevealHoldMs() +
              this.getCombatRevealLingerMs() +
              this.getUnifiedCardFlyMs() +
              this.getUnifiedCardFlightStaggerMs() * 4 +
              900
          ) * replaySyncBoost
        );
        const aoeResolveSyncMs = this.getCombatResultCleanupDelayMs() + 200;
        const combatRoundSyncMs = Math.round(
          (this.getUnifiedCardFlyMs() + this.getUnifiedCardFlightStaggerMs() * 2) *
            replaySyncBoost
        );
        const combatStartSyncMs = Math.round(500 * replaySyncBoost);
        const endBannerSyncMs = Math.round(
          this.getUnifiedBannerClearDelayMs() * replaySyncBoost
        );
        const prophetResolveSyncMs = Math.round(
          Math.max(
            2600,
            this.getUnifiedRevealFlipMs() +
              this.getUnifiedRevealHoldMs() +
              this.getUnifiedCardFlyMs() * 3 +
              this.getUnifiedCardFlightStaggerMs() * 8
          ) * replaySyncBoost
        );
        const redistributeSyncMs = Math.round(
          Math.max(
            4500,
            this.getUnifiedRedistributeShuffleHoldMs() +
              this.getUnifiedCardFlyMs() * 6 +
              this.getUnifiedCardFlightStaggerMs() * 10
          ) * replaySyncBoost
        );
        const drawActionSyncMs = Math.round(
          this.getUnifiedPostDrawDiscardDelayMs(
            this.getUnifiedCardFlyMs() * 2 +
              this.getUnifiedCardFlightStaggerMs() * 4,
            3
          ) * replaySyncBoost
        );
        this.notifqueue.setSynchronous("actionCardPlayed", 800);
        this.notifqueue.setSynchronous("haveACharity", drawActionSyncMs);
        this.notifqueue.setSynchronous("divineInspiration", drawActionSyncMs);
        this.notifqueue.setSynchronous(
          "secretAllianceExchanged",
          this.getUnifiedPostFlowDiscardDelayMs(0)
        );
        this.notifqueue.setSynchronous(
          "spreadRumorsSummary",
          this.getUnifiedPostFlowDiscardDelayMs(
            this.getUnifiedCardFlyMs() +
              this.getUnifiedCardFlightStaggerMs() * 3
          )
        );
        this.notifqueue.setSynchronous(
          "witchHunt",
          this.getUnifiedPostFlowDiscardDelayMs(
            this.getUnifiedCardFlyMs() +
              this.getUnifiedCardFlightStaggerMs() * 4
          )
        );
        this.notifqueue.setSynchronous("faithWarStart", combatStartSyncMs);
        this.notifqueue.setSynchronous("faithWarRound", combatRoundSyncMs);
        this.notifqueue.setSynchronous("faithWarCardPlayed", combatRoundSyncMs);
        this.notifqueue.setSynchronous("duelResult", duelResolveSyncMs);
        this.notifqueue.setSynchronous("duelBonus", combatRoundSyncMs);
        this.notifqueue.setSynchronous("faithWarEnd", endBannerSyncMs);
        this.notifqueue.setSynchronous("faithDebateStart", combatStartSyncMs);
        this.notifqueue.setSynchronous("faithDebateRound", combatRoundSyncMs);
        this.notifqueue.setSynchronous("faithDebateCardPlayed", combatRoundSyncMs);
        this.notifqueue.setSynchronous("faithDebateResult", duelResolveSyncMs);
        this.notifqueue.setSynchronous("faithDebateEnd", endBannerSyncMs);
        this.notifqueue.setSynchronous("newBelievers", combatRoundSyncMs);
        this.notifqueue.setSynchronous("martyrdomResolved", aoeResolveSyncMs);
        this.notifqueue.setSynchronous("conspiracyResolved", aoeResolveSyncMs);
        this.notifqueue.setSynchronous("skillKarboom", 1400);
        this.notifqueue.setSynchronous("skillWorldPeace", 1400);
        this.notifqueue.setSynchronous("skillEternalTruth", 1400);
        this.notifqueue.setSynchronous("skillSoulSeveringSword", 1200);
        this.notifqueue.setSynchronous("skillHolyRebirth", 1300);
        this.notifqueue.setSynchronous("reverseKarmaStatus", 900);
        this.notifqueue.setSynchronous("prophetGuessChosen", 900);
        this.notifqueue.setSynchronous("prophetGuessPassed", 750);
        this.notifqueue.setSynchronous("prophetPredictionStarted", 950);
        // Prophet reveal flow can exceed 2s for a single prediction
        // (fly + flip + hold + send-to-hand), and even longer when a
        // Gate of Truth copied Prophet also predicts. Keep the notification
        // queue blocked long enough so hand-sync notifications do not cut the
        // animation before guess text / flip / result text are visible.
        this.notifqueue.setSynchronous(
          "prophetPredictionResolved",
          prophetResolveSyncMs
        );
        this.notifqueue.setSynchronous("infoSpyFinished", 800);
        // Full redistribute FX includes gather + shuffle + deal phases and can
        // exceed 5s on larger tables. Keep sync long enough so hand-sync
        // notifications do not overtake and visually cut the sequence.
        this.notifqueue.setSynchronous("skillEveryoneEqual", redistributeSyncMs);
        this.notifqueue.setSynchronous("skillChaosComing", redistributeSyncMs);
        this.notifqueue.setSynchronous("impermanenceVictoryShowcase", 2400);
        this.notifqueue.setSynchronous("playerIdentitySync", 250);
        this.notifqueue.setSynchronous("practiceAiStepRequested", 50);
        this.notifqueue.setSynchronous("botThinking", 650);
        this.notifqueue.setSynchronous("kowtowForcedAbsorbed", 650);
      }
    },

    notif_botThinking: function () {},

    notif_practiceAiStepRequested: function (notif) {
      const args = (notif && notif.args) || {};
      const playerId = parseInt(args.player_id || 0, 10);
      const token = parseInt(args.token || 0, 10);
      if (!playerId || !token) return;

      const key = String(token);
      if (this.pendingPracticeAiStepTimers[key]) return;

      const stateName = String(args.state_name || "");
      let delayMs = parseInt(args.delay_ms || 0, 10);
      if (!delayMs || delayMs < 0) delayMs = 900;
      if (stateName === "faithWarDuel" || stateName === "faithDebateDuel") {
        delayMs = Math.max(delayMs, this.getCombatRevealGateDelayMs() + 250);
      }
      if (stateName === "playerTurn") {
        const centerWaitMs = Math.max(
          0,
          parseInt((this.centerActionHoldUntil || 0) - Date.now(), 10) || 0
        );
        delayMs = Math.max(delayMs, centerWaitMs + 300);
      }

      this.pendingPracticeAiStepTimers[key] = setTimeout(
        function () {
          delete this.pendingPracticeAiStepTimers[key];
          this.sendPracticeAiStep(playerId, token);
        }.bind(this),
        delayMs
      );
    },

    sendPracticeAiStep: function (playerId, token) {
      const key = String(token || "");
      if (!playerId || !token || this.practiceAiStepInFlight[key]) return;
      const performAction =
        this.bga &&
        this.bga.actions &&
        typeof this.bga.actions.performAction === "function"
          ? this.bga.actions.performAction.bind(this.bga.actions)
          : null;
      if (!performAction) return;

      this.practiceAiStepInFlight[key] = true;
      performAction(
        "runPracticeAiStep",
        { player_id: playerId, token: token },
        {
          lock: false,
          checkAction: false,
          checkPossibleActions: false,
        }
      )
        .then(
          function () {
            delete this.practiceAiStepInFlight[key];
          }.bind(this)
        )
        .catch(
          function () {
            delete this.practiceAiStepInFlight[key];
          }.bind(this)
        );
    },

    notif_practiceAiPlayersChanged: function (notif) {
      const args = (notif && notif.args) || {};
      if (!this.gamedatas) {
        this.gamedatas = {};
      }
      this.gamedatas.practice_ai_player_ids = (
        Array.isArray(args.practice_ai_player_ids)
          ? args.practice_ai_player_ids
          : []
      ).map(function (pid) {
        return parseInt(pid || 0, 10);
      });
    },

    notif_actionCardPlayed: function (notif) {
      this.clearDeferredFaithWarResultIfNeeded();
      let card_id = notif.args.card_id;
      let p_id = notif.args.player_id;
      let card_type = notif.args.card_type; // string key like 'have_a_charity'

      const pendingTempId = "pending_action_play_" + card_id;
      const hadPendingPreview = !!dojo.byId(pendingTempId);

      let countElem = dojo.byId("table_action_count_" + p_id);
      if (countElem) {
        if (String(p_id) === String(this.player_id)) {
          countElem.innerHTML = String(this.getStockDomCount("myactioncards"));
        } else {
          countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - 1);
        }
      }

      const typeMask = this.getActionTypeMaskFromCardType(card_type);
      if (typeMask) {
        this.currentTurnActionMask |= typeMask;
      }
      const isCombatActionCard =
        this.isAoeCombatType(card_type) ||
        this.isConfrontationActionCardType(card_type);
      const deferCenterFaceUntilFlightEnd =
        card_type === "have_a_charity" || card_type === "divine_inspire";
      if (isCombatActionCard) {
        // New combat declaration must not inherit previous combat's
        // Reverse Karma visual stack before current prompt/confirmation.
        this.setReverseKarmaContext(0, 0);
      }

      if (this.isAoeCombatType(card_type)) {
        this.placeAoeActionCard(card_type, card_id, p_id);
      } else if (card_type === "faith_war" || card_type === "faith_debate") {
        this.setDuelActionCard(
          card_type,
          p_id,
          this.getActionCardDisplayName(card_type),
          card_id
        );
      } else {
        this.currentAoeCombatType = null;
        this.currentAoeAttackerId = null;
        this.currentAoeActionCardId = null;
        this.clearFaithWarArena("");
        this.showCenterActionCard(card_type, card_id, {
          hideFaceUntilFlightEnd: deferCenterFaceUntilFlightEnd,
        });
      }

      // Unified play animation: everyone sees card fly from actor anchor/hand to table.
      // If local pending preview already exists, that preview is the animation.
      if (!hadPendingPreview) {
        const started = this.animatePlayedActionCardFlight(p_id, card_type, {
          onEnd: function () {
            if (deferCenterFaceUntilFlightEnd) {
              this.revealCenterActionCardFace();
            }
          },
        });
        if (!started && deferCenterFaceUntilFlightEnd) {
          this.revealCenterActionCardFace();
        }
      } else {
        dojo.destroy(pendingTempId);
        if (deferCenterFaceUntilFlightEnd) {
          this.revealCenterActionCardFace();
        }
      }

      if (p_id == this.player_id) {
        try {
          this.playerActionCards.removeFromStockById(card_id);
        } catch (e) {
          // Keep queue robust if local pending UI already removed this stock item.
        }
        this.consumeHiddenPendingActionCard(card_id);
        this.setDivineInspireSourceLocked(card_id, false);
        delete this.actionCardTypeById[String(card_id)];
        this.syncCurrentPlayerHandCounters();
      }
    },

    notif_newActionCards: function (notif) {
      this.isDiscardMode = false;
      const suppressDeckSource =
        this.consumeRedistributeDeckSourceSuppression("action");
      for (let i in notif.args.cards) {
        let card = notif.args.cards[i];
        let sprite_idx = this.getActionCardSpriteIndex(card.type);
        if (suppressDeckSource) {
          this.playerActionCards.addToStockWithId(sprite_idx, card.id);
        } else {
          this.playerActionCards.addToStockWithId(
            sprite_idx,
            card.id,
            "action_deck"
          );
        }
        this.actionCardTypeById[String(card.id)] = card.type;
      }

      let countElem = dojo.byId("table_action_count_" + this.player_id);
      if (countElem) {
        countElem.innerHTML =
          parseInt(countElem.innerHTML) + notif.args.cards.length;
      }
    },

    notif_drawActionCards: function (notif) {
      const drawPlayerId = parseInt(
        (notif.args && notif.args.player_id) || 0,
        10
      );
      const drawCount = parseInt((notif.args && notif.args.count) || 0, 10);
      // Drawer already gets local stock animation via newActionCards.
      // Keep this public flight for observers to avoid duplicate/offset-looking motion.
      if (
        drawPlayerId > 0 &&
        drawCount > 0 &&
        String(drawPlayerId) !== String(this.player_id || "")
      ) {
        this.animateDeckDrawToPlayer("action", drawPlayerId, drawCount);
      }
      let deckElem = dojo.byId("action_deck_count");
      if (deckElem) {
        if (typeof notif.args.deck_count !== "undefined") {
          deckElem.innerHTML = notif.args.deck_count;
        } else if (notif.args.count) {
          deckElem.innerHTML = Math.max(
            0,
            parseInt(deckElem.innerHTML) - notif.args.count
          );
        }
      }
    },

    notif_reshuffleActionDiscard: function (notif) {
      this.actionDiscardCards = [];
      this.renderActionDiscardTop();
      this.showMessage(
        _("Action discard pile reshuffled into the deck"),
        "info"
      );
    },

    applyBelieverDeckDrawVisualSync: function (spec) {
      const args = spec || {};
      const actorId = String(args.player_id || "");
      const drawCount = Math.max(0, parseInt(args.draw_n || 0, 10));
      const drawTotal = Math.max(
        0,
        parseInt(
          typeof args.draw_total_n !== "undefined"
            ? args.draw_total_n
            : drawCount,
          10
        )
      );

      const deckNode = dojo.byId("believer_deck_count");
      if (deckNode) {
        deckNode.innerHTML = String(
          Math.max(0, parseInt(deckNode.innerHTML || "0", 10) - drawTotal)
        );
      }

      if (!actorId) return 0;

      const believerCountElem = dojo.byId("table_believer_count_" + actorId);
      if (
        believerCountElem &&
        drawCount > 0 &&
        actorId !== String(this.player_id)
      ) {
        believerCountElem.innerHTML = String(
          parseInt(believerCountElem.innerHTML || "0", 10) + drawCount
        );
      }
      const shouldAnimateRaw = parseInt(args.animate_draw || 0, 10) === 1;
      const shouldAnimate =
        shouldAnimateRaw && !this.isProphetPredictionFlowActive;
      const startDelayMs = Math.max(
        0,
        parseInt(args.start_delay_ms || 0, 10) || 0
      );
      // Always show the public deck->player-anchor gain first. On mobile the
      // local hand is often below the fold, so the stock insertion alone is
      // not enough feedback when an AI controls the viewer's seat.
      if (shouldAnimate && drawCount > 0) {
        if (actorId === String(this.player_id || "")) {
          this.markRedistributeDeckSourceSuppression("believer");
        }
        this.animateDeckDrawToPlayer("believer", actorId, drawCount, {
          startDelay: startDelayMs,
        });
      }
      if (!shouldAnimate || drawCount <= 0) return 0;
      const maxVisual = drawCount;
      const flyMs = this.getUnifiedCardFlyMs();
      return maxVisual > 0
        ? startDelayMs + flyMs + (maxVisual - 1) * 110
        : 0;
    },

    notif_haveACharity: function (notif) {
      const args = notif.args || {};
      const prophetFlow = parseInt(args.prophet_flow || 0, 10) === 1;
      const actorId = String(args.player_id || "");
      const flowLeadInMs =
        this.getUnifiedCardFlyMs() + this.getUnifiedCardFlightStaggerMs();
      const drawN = Math.max(
        0,
        parseInt(
          typeof args.n !== "undefined"
            ? args.n
            : typeof args.draw_n !== "undefined"
            ? args.draw_n
            : 0,
          10
        )
      );
      const drawAnimMs = this.applyBelieverDeckDrawVisualSync({
        player_id: args.player_id || 0,
        draw_n:
          typeof args.n !== "undefined"
            ? args.n
            : typeof args.draw_n !== "undefined"
            ? args.draw_n
            : 0,
        draw_total_n:
          typeof args.n_total !== "undefined"
            ? args.n_total
            : typeof args.draw_total_n !== "undefined"
            ? args.draw_total_n
            : undefined,
        animate_draw: prophetFlow ? 0 : 1,
      });
      if (!prophetFlow) {
        if (drawN > 0) {
          this.showMessage(
            dojo.string.substitute(
              _("${player_name} draws ${count} Believers."),
              {
                player_name: args.player_name || _("Player"),
                count: drawN,
              }
            ),
            "info"
          );
        }
        this.setCombatRevealGate(flowLeadInMs);
        this.scheduleCenterActionCardToDiscard(
          flowLeadInMs + this.getUnifiedPostDrawDiscardDelayMs(drawAnimMs, drawN)
        );
      }
    },

    notif_divineInspiration: function (notif) {
      const args = notif.args || {};
      const discardN = Math.max(0, parseInt(args.discard_n || 0, 10));
      const actorId = String(args.player_id || "");
      const prophetFlow = parseInt(args.prophet_flow || 0, 10) === 1;
      const flowLeadInMs =
        this.getUnifiedCardFlyMs() + this.getUnifiedCardFlightStaggerMs();
      const drawN = Math.max(
        0,
        parseInt(
          typeof args.draw_n !== "undefined"
            ? args.draw_n
            : typeof args.n !== "undefined"
            ? args.n
            : 0,
          10
        )
      );
      const discardCards = this.normalizeActionDiscardCards({
        cards: args.discard_cards || [],
        card_ids: args.discard_card_ids || [],
      });
      const discardAnimMs = prophetFlow
        ? 0
        : this.animateActionCardsToDiscard(args.player_id || 0, discardCards, {
            consumeSuppression: true,
            startDelay: 300,
          });
      if (discardCards.length) {
        discardCards.forEach(
          function (card) {
            if (card && card.type) {
              this.pushActionDiscardCard(card.type, card.id || "");
            }
          }.bind(this)
        );
      }
      const drawAnimMs = this.applyBelieverDeckDrawVisualSync({
        player_id: args.player_id || 0,
        draw_n:
          typeof args.draw_n !== "undefined"
            ? args.draw_n
            : typeof args.n !== "undefined"
            ? args.n
            : 0,
        draw_total_n:
          typeof args.draw_total_n !== "undefined"
            ? args.draw_total_n
            : typeof args.n_total !== "undefined"
            ? args.n_total
            : undefined,
        animate_draw: prophetFlow ? 0 : 1,
        start_delay_ms: discardAnimMs,
      });

      if (actorId !== String(this.player_id)) {
        const actionCountElem = dojo.byId("table_action_count_" + actorId);
        if (actionCountElem && discardN > 0) {
          actionCountElem.innerHTML = String(
            Math.max(
              0,
              parseInt(actionCountElem.innerHTML || "0", 10) - discardN
            )
          );
        }
      } else if (args.insufficient_deck) {
        const drawN = Math.max(
          0,
          parseInt(
            typeof args.draw_n !== "undefined"
              ? args.draw_n
              : typeof args.n !== "undefined"
              ? args.n
              : 0,
            10
          )
        );
        this.showMessage(
          dojo.string.substitute(
            _(
              "Believer deck has fewer cards than discarded actions. You only drew ${count} Believers."
            ),
            {
              count: drawN,
            }
          ),
          "info"
        );
      }
      if (!prophetFlow) {
        this.showMessage(
          dojo.string.substitute(
            _(
              "${player_name} discards ${discard_count} Action card(s) and draws ${draw_count} Believers."
            ),
            {
              player_name: args.player_name || _("Player"),
              discard_count: discardN,
              draw_count: drawN,
            }
          ),
          "info"
        );
        this.setCombatRevealGate(flowLeadInMs);
        this.scheduleCenterActionCardToDiscard(
          flowLeadInMs + this.getUnifiedPostDrawDiscardDelayMs(drawAnimMs, drawN)
        );
      }
    },

    notif_greatMercy: function (notif) {
      let revivedCards = notif.args.cards || [];
      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(
          0,
          parseInt(notif.args.graveyard_count || 0, 10)
        );
      } else if (notif.args.n) {
        const removedCards = this.removeTopGraveyardCards(
          parseInt(notif.args.n)
        );
        this.updateGraveyardCount(-parseInt(notif.args.n));
        if (!revivedCards.length) {
          revivedCards = removedCards;
        }
      }

      if (String(notif.args.player_id) === String(this.player_id)) {
        revivedCards.forEach(
          function (card) {
            if (card && card.id) {
              this.pendingRevivedFromGraveyard[String(card.id)] = true;
            }
          }.bind(this)
        );
        this.animateRevivedBelieversToHand(revivedCards);
      }

      if (revivedCards.length) {
        const revivedNames = revivedCards
          .map(
            function (card) {
              return this.formatBelieverTypeLabel(card.type);
            }.bind(this)
          )
          .join(", ");

        this.showMessage(
          dojo.string.substitute(
            _(
              "${player_name} revived from the top of the graveyard: ${believer_names}"
            ),
            {
              player_name: notif.args.player_name,
              believer_names: revivedNames,
            }
          ),
          "info"
        );
      }
      this.scheduleCenterActionCardToDiscard(
        this.getUnifiedPostFlowDiscardDelayMs(0)
      );
    },

    notif_newBelievers: function (notif) {
      const suppressDeckSource =
        this.consumeRedistributeDeckSourceSuppression("believer");
      for (let i in notif.args.cards) {
        let card = notif.args.cards[i];
        const revivedFromGraveyard =
          !!this.pendingRevivedFromGraveyard[String(card.id)];
        const sourceAnchorId =
          this.pendingBelieverSourceByCardId[String(card.id)] || null;
        const prophetDrawNoFly =
          !revivedFromGraveyard &&
          parseInt(this.pendingProphetDrawNoFlyCount || 0, 10) > 0;
        const prophetSnatchNoFly =
          !revivedFromGraveyard &&
          parseInt(this.pendingProphetSnatchNoFlyCount || 0, 10) > 0;
        if (revivedFromGraveyard) {
          this.playerBelieverCards.addToStockWithId(card.type, card.id);
          delete this.pendingRevivedFromGraveyard[String(card.id)];
          delete this.pendingBelieverSourceByCardId[String(card.id)];
        } else if (prophetDrawNoFly) {
          this.playerBelieverCards.addToStockWithId(card.type, card.id);
          this.pendingProphetDrawNoFlyCount = Math.max(
            0,
            parseInt(this.pendingProphetDrawNoFlyCount || 0, 10) - 1
          );
          delete this.pendingBelieverSourceByCardId[String(card.id)];
        } else if (prophetSnatchNoFly) {
          this.playerBelieverCards.addToStockWithId(card.type, card.id);
          this.pendingProphetSnatchNoFlyCount = Math.max(
            0,
            parseInt(this.pendingProphetSnatchNoFlyCount || 0, 10) - 1
          );
          delete this.pendingBelieverSourceByCardId[String(card.id)];
        } else if (sourceAnchorId) {
          this.playerBelieverCards.addToStockWithId(card.type, card.id);
          const runSourceFlight = function () {
            this.clearCombatRevealOverlayWithin(sourceAnchorId);
            if (
              this.isNodeUsableForCardFlight(sourceAnchorId) &&
              this.isNodeUsableForCardFlight("mybelievercards")
            ) {
              this.animateTempCardFlight({
                sourceId: sourceAnchorId,
                targetId: "mybelievercards",
                cardClass: "card card-back-believer",
                duration: this.getUnifiedCardFlyMs(),
                startDelay: 0,
                fromScale: 0.62,
                toScale: 0.62,
                dataIndex: 0,
              });
            } else if (
              this.isNodeUsableForCardFlight("believer_deck") &&
              this.isNodeUsableForCardFlight("mybelievercards")
            ) {
              this.animateTempCardFlight({
                sourceId: "believer_deck",
                targetId: "mybelievercards",
                cardClass: "card card-back-believer",
                duration: this.getUnifiedCardFlyMs(),
                startDelay: 0,
                fromScale: 1,
                toScale: 1,
                dataIndex: 0,
              });
            }
          }.bind(this);
          const revealGateDelay = this.getCombatRevealGateDelayMs();
          if (revealGateDelay > 0) {
            setTimeout(runSourceFlight, revealGateDelay);
          } else {
            runSourceFlight();
          }
          delete this.pendingBelieverSourceByCardId[String(card.id)];
        } else {
          this.playerBelieverCards.addToStockWithId(card.type, card.id);
          const revealGateDelay = this.getCombatRevealGateDelayMs();
          if (
            !suppressDeckSource &&
            this.isNodeUsableForCardFlight("believer_deck") &&
            this.isNodeUsableForCardFlight("mybelievercards")
          ) {
            this.animateTempCardFlight({
              sourceId: "believer_deck",
              targetId: "mybelievercards",
              cardClass: "card card-back-believer",
              duration: this.getUnifiedCardFlyMs(),
              startDelay: Math.max(0, parseInt(revealGateDelay || 0, 10) || 0),
              fromScale: 1,
              toScale: 1,
              dataIndex: 0,
            });
          }
        }
      }

      let countElem = dojo.byId("table_believer_count_" + this.player_id);
      if (countElem) {
        countElem.innerHTML =
          parseInt(countElem.innerHTML) + notif.args.cards.length;
      }
    },

    notif_infoSpy: function (notif) {
      const args = notif.args || {};
      const actorId = parseInt(args.player_id || 0, 10);
      this.infoSpyPendingPlayerId = actorId;
      this.infoSpyPendingPlayerName = String(args.player_name || "");

      const actor = this.getPlayerNameWithSect(
        actorId,
        args.player_name || _("A player")
      );
      const target = this.getPlayerNameWithSect(
        args.target_id || 0,
        args.target_name || _("target")
      );
      this.showMessage(
        dojo.string.substitute(
          _("${player_name} is performing Info Spy on ${target_name}."),
          {
            player_name: actor,
            target_name: target,
          }
        ),
        "info"
      );

      if (String(actorId || "") !== String(this.player_id || "")) {
        this.setTopInstruction(
          dojo.string.substitute(
            _("${player_name} is spying. Please wait for spy to finish."),
            {
              player_name: args.player_name || _("A player"),
            }
          )
        );
      } else {
        this.setTopInstruction(
          _("You are reviewing Info Spy result. Close it to continue.")
        );
      }
    },

    notif_spyResult: function (notif) {
      const actionCards = Object.values(notif.args.action_cards || {});
      const believerCards = Object.values(notif.args.believer_cards || {});

      this.showMessage(
        _("You successfully used Info Spy and obtained target information."),
        "info"
      );
      this.showSpyResultModal(
        notif.args.target_name,
        actionCards,
        believerCards
      );
    },

    notif_infoSpyFinished: function (notif) {
      const args = notif.args || {};
      const actorId = parseInt(args.player_id || 0, 10);
      this.infoSpyPendingPlayerId = 0;
      this.infoSpyPendingPlayerName = "";
      this.infoSpyCloseInFlight = false;

      this.closeSpyResultModal();
      this.moveCurrentCenterActionToDiscard();
      this.showMessage(
        dojo.string.substitute(_("${player_name} finishes Info Spy."), {
          player_name: args.player_name || _("A player"),
        }),
        "info"
      );

      if (String(actorId || "") !== String(this.player_id || "")) {
        this.restoreServerGameState();
      }
    },

    notif_believerStolen: function (notif) {
      this.playerBelieverCards.removeFromStockById(notif.args.card_id);
      let countElem = dojo.byId("table_believer_count_" + this.player_id);
      if (countElem) {
        countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - 1);
      }
    },

    notif_believersDiscarded: function (notif) {
      if (notif.args.card_ids) {
        notif.args.card_ids.forEach(
          function (card_id) {
            this.playerBelieverCards.removeFromStockById(card_id);
          }.bind(this)
        );
      }
      let countElem = dojo.byId("table_believer_count_" + this.player_id);
      if (countElem) {
        countElem.innerHTML = Math.max(
          0,
          parseInt(countElem.innerHTML) - (notif.args.count || 0)
        );
      }
      // Keep graveyard preview authoritative from public resolved payloads
      // (which carry full top-of-grave snapshot). This private per-owner
      // message may contain only a subset and can corrupt top ordering.
    },

    notif_skillStateUpdated: function (notif) {
      if (notif.args && notif.args.skill_state) {
        this.mySkillState = notif.args.skill_state;
        this.applyPublicSkillStateForPlayer(this.player_id, this.mySkillState);
        this.updateSkillProtectionFromActorState(
          this.player_id,
          this.mySkillState
        );
        this.refreshCurrentPlayerSkillTooltips();
      }
    },

    notif_skillRevealed: function (notif) {
      const pid = String(notif.args.player_id || "");
      const skillType = parseInt(notif.args.skill_type || 0, 10);
      if (!pid || !skillType) return;
      if (pid === String(this.player_id) && notif.args.skill_state_actor) {
        this.mySkillState = notif.args.skill_state_actor;
        this.updateSkillProtectionFromActorState(
          this.player_id,
          this.mySkillState
        );
      }
      this.updateSkillProtectionFromActorState(
        pid,
        notif.args.skill_state_actor || null
      );
      this.applySkillRevealToPlayer(
        pid,
        skillType,
        notif.args.skill_state_actor || null
      );
    },

    notif_skillHeadstronger: function (notif) {
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            3,
          notif.args.skill_state_actor
        );
      }
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.applyPublicSkillStateForPlayer(this.player_id, this.mySkillState);
        this.refreshCurrentPlayerSkillTooltips();
        this.refreshHandCardReadinessVisuals();
      }
    },

    notif_skillPurpleHermitActivated: function (notif) {
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            1,
          notif.args.skill_state_actor
        );
      }
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.applyPublicSkillStateForPlayer(this.player_id, this.mySkillState);
        this.refreshCurrentPlayerSkillTooltips();
      }
    },

    notif_skillPurpleHermitFinale: function (notif) {
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applyPublicSkillStateForPlayer(
          notif.args.player_id,
          notif.args.skill_state_actor
        );
      }
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.applyPublicSkillStateForPlayer(this.player_id, this.mySkillState);
        this.refreshCurrentPlayerSkillTooltips();
      }
    },

    notif_skillGateTruthCopied: function (notif) {
      const args = notif.args || {};
      const pid = String(args.player_id || "");
      if (!pid) return;
      if (args.skill_state_actor) {
        const revealedSkillType =
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[pid] &&
            parseInt(this.gamedatas.player_skills[pid].type || 0, 10)) ||
          9;
        this.applySkillRevealToPlayer(
          pid,
          revealedSkillType,
          args.skill_state_actor
        );
      }
      if (pid === String(this.player_id) && args.skill_state_actor) {
        this.mySkillState = args.skill_state_actor;
        this.applyPublicSkillStateForPlayer(this.player_id, this.mySkillState);
        this.refreshCurrentPlayerSkillTooltips();
      }
    },

    notif_skillAscendWithMe: function (notif) {
      if (notif.args && notif.args.leader_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.leader_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.leader_id)] &&
            this.gamedatas.player_skills[String(notif.args.leader_id)].type) ||
            6,
          notif.args.skill_state_actor
        );
      }
      if (
        String(notif.args.leader_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.applyPublicSkillStateForPlayer(this.player_id, this.mySkillState);
        this.refreshCurrentPlayerSkillTooltips();
      }
    },

    notif_syncBelieverHand: function (notif) {
      const cards = (notif.args && notif.args.cards) || [];
      const redistributePending =
        this.getRedistributeFxPendingDelayMs("believer") > 0;
      if (redistributePending) {
        this.pendingBelieverHandSyncCards = cards;
        this.schedulePendingRedistributeHandSync("believer");
        return;
      }
      if (this.pendingBelieverHandSyncTimeout) {
        clearTimeout(this.pendingBelieverHandSyncTimeout);
        this.pendingBelieverHandSyncTimeout = null;
      }
      this.pendingBelieverHandSyncCards = null;
      this.applySyncedBelieverHandNow(cards, {
        fromRedistribute: false,
        pulseAfter: false,
      });
    },

    notif_syncActionHand: function (notif) {
      const cards = (notif.args && notif.args.cards) || [];
      const redistributePending = this.getRedistributeFxPendingDelayMs("action") > 0;
      if (redistributePending) {
        this.pendingActionHandSyncCards = cards;
        this.schedulePendingRedistributeHandSync("action");
        return;
      }
      if (this.pendingActionHandSyncTimeout) {
        clearTimeout(this.pendingActionHandSyncTimeout);
        this.pendingActionHandSyncTimeout = null;
      }
      this.pendingActionHandSyncCards = null;
      this.applySyncedActionHandNow(cards, {
        fromRedistribute: false,
        pulseAfter: false,
      });
    },

    notif_playerIdentitySync: function (notif) {
      const rows = (notif.args && notif.args.players) || [];
      rows.forEach(
        function (row) {
          this.applyPlayerIdentitySyncRow(row);
        }.bind(this)
      );
    },

    notif_kowtowForcedAbsorbed: function (notif) {
      const args = notif.args || {};
      const absorberName = args.player_name || _("Another player");
      const attackerSectName = args.attacker_sect_name || _("another Sect");
      this.showMessage(
        dojo.string.substitute(
          _(
            "Your Sect has been absorbed by ${absorber_name}. You are now a Follower in ${sect_name}."
          ),
          {
            absorber_name: absorberName,
            sect_name: attackerSectName,
          }
        ),
        "error"
      );
    },

    notif_skillKarboom: function (notif) {
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            2,
          notif.args.skill_state_actor
        );
      }
      const actorId = String(notif.args.player_id || "");
      const targetId = String(notif.args.target_id || "");
      const sacrificed = notif.args.sacrificed_card || null;
      const killed = notif.args.killed_cards || [];

      if (actorId === String(this.player_id) && sacrificed && sacrificed.id) {
        this.playerBelieverCards.removeFromStockById(
          parseInt(sacrificed.id, 10)
        );
      }
      if (targetId === String(this.player_id) && killed.length) {
        killed.forEach(
          function (card) {
            if (card && card.id) {
              this.playerBelieverCards.removeFromStockById(
                parseInt(card.id, 10)
              );
            }
          }.bind(this)
        );
      }

      if (sacrificed && sacrificed.type) {
        this.animateBelieversFromPlayerToGraveyard(actorId, [sacrificed]);
      }
      if (killed.length) {
        this.animateBelieversFromPlayerToGraveyard(targetId, killed);
      }

      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(
          0,
          parseInt(notif.args.graveyard_count || 0, 10)
        );
      }
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.updateSkillProtectionFromActorState(
          this.player_id,
          this.mySkillState
        );
        this.refreshCurrentPlayerSkillTooltips();
      }
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_skillPraiseLife: function (notif) {
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            13,
          notif.args.skill_state_actor
        );
      }
      const actorId = String(notif.args.player_id || "");
      const sacrificed = notif.args.sacrificed_card || null;
      if (actorId === String(this.player_id) && sacrificed && sacrificed.id) {
        this.playerBelieverCards.removeFromStockById(
          parseInt(sacrificed.id, 10)
        );
      }
      if (sacrificed && sacrificed.type) {
        this.animateBelieversFromPlayerToGraveyard(actorId, [sacrificed]);
      }
      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(
          0,
          parseInt(notif.args.graveyard_count || 0, 10)
        );
      }
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.updateSkillProtectionFromActorState(
          this.player_id,
          this.mySkillState
        );
        this.refreshCurrentPlayerSkillTooltips();
      }
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_skillWorldPeace: function (notif) {
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            8,
          notif.args.skill_state_actor
        );
      }
      const actorId = String(notif.args.player_id || "");
      const sacrificed = notif.args.sacrificed_card || null;
      if (actorId === String(this.player_id) && sacrificed && sacrificed.id) {
        this.playerBelieverCards.removeFromStockById(
          parseInt(sacrificed.id, 10)
        );
      }
      if (sacrificed && sacrificed.type) {
        this.animateBelieversFromPlayerToGraveyard(actorId, [sacrificed]);
      }
      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(
          0,
          parseInt(notif.args.graveyard_count || 0, 10)
        );
      }
      this.updateSkillProtectionFromActorState(
        notif.args.player_id || "",
        notif.args.skill_state_actor || null
      );
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.updateSkillProtectionFromActorState(
          this.player_id,
          this.mySkillState
        );
        this.refreshCurrentPlayerSkillTooltips();
      }
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_skillEternalTruth: function (notif) {
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            7,
          notif.args.skill_state_actor
        );
      }
      const actorId = String(notif.args.player_id || "");
      const sacrificed = notif.args.sacrificed_card || null;
      if (actorId === String(this.player_id) && sacrificed && sacrificed.id) {
        this.playerBelieverCards.removeFromStockById(
          parseInt(sacrificed.id, 10)
        );
      }
      if (sacrificed && sacrificed.type) {
        this.animateBelieversFromPlayerToGraveyard(actorId, [sacrificed]);
      }
      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(
          0,
          parseInt(notif.args.graveyard_count || 0, 10)
        );
      }
      this.updateSkillProtectionFromActorState(
        notif.args.player_id || "",
        notif.args.skill_state_actor || null
      );
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.updateSkillProtectionFromActorState(
          this.player_id,
          this.mySkillState
        );
        this.refreshCurrentPlayerSkillTooltips();
      }
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_skillSoulSeveringSword: function (notif) {
      const targetId = String((notif.args && notif.args.target_id) || "");
      if (targetId && this.gamedatas && this.gamedatas.players) {
        const target = this.gamedatas.players[targetId] || null;
        if (target) {
          target.player_skip_turn_count = Math.max(
            0,
            parseInt((notif.args && notif.args.target_skip_count) || 0, 10) || 0
          );
          this.refreshPlayerIdentityUi(targetId);
        }
      }
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            11,
          notif.args.skill_state_actor
        );
      }
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.refreshCurrentPlayerSkillTooltips();
      }
      const targetName =
        notif.args.target_name ||
        (this.gamedatas.players[String(notif.args.target_id || "")] || {})
          .name ||
        _("Player");
      this.showMessage(
        dojo.string.substitute(
          _("${player_name} uses Soul-Cutting Sword on ${target_name}."),
          {
            player_name: notif.args.player_name || _("A player"),
            target_name: targetName,
          }
        ),
        "info"
      );
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_soulBladeMarked: function (notif) {
      this.showMessage(
        _(
          "You were marked by Soul-Cutting Sword. Your next turn will be skipped."
        ),
        "error"
      );
    },

    notif_soulBladeTurnSkipped: function (notif) {
      const pid = String((notif.args && notif.args.player_id) || "");
      if (pid && this.gamedatas && this.gamedatas.players) {
        const player = this.gamedatas.players[pid] || null;
        if (player) {
          player.player_skip_turn_count = Math.max(
            0,
            parseInt((notif.args && notif.args.remaining_skip_count) || 0, 10) ||
              0
          );
          this.refreshPlayerIdentityUi(pid);
        }
      }
      const targetName =
        notif.args.player_name ||
        (this.gamedatas.players[String(notif.args.player_id || "")] || {})
          .name ||
        _("Player");
      this.showMessage(
        dojo.string.substitute(_("${player_name} skips this turn."), {
          player_name: targetName,
        }),
        "info"
      );
    },

    notif_soulBladeTurnSkippedPrivate: function (notif) {
      this.showMessage(
        _(
          "Your turn is skipped. You cannot act or draw Action cards this turn."
        ),
        "error"
      );
    },

    notif_prophetPredictionStarted: function (notif) {
      const args = notif.args || {};
      this.isProphetPredictionFlowActive = true;
      if (this.pendingProphetFlowClearTimeout) {
        clearTimeout(this.pendingProphetFlowClearTimeout);
        this.pendingProphetFlowClearTimeout = null;
      }
      this.showProphetPendingPredictionVisual();
      const drawerName = args.drawer_name || _("Player");
      this.setTopInstruction(
        _("Waiting for The Prophet prediction before draw continues.")
      );
      this.showMessage(
        dojo.string.substitute(
          _("${drawer_name} draw is paused for The Prophet prediction."),
          {
            drawer_name: drawerName,
          }
        ),
        "info"
      );
    },

    notif_prophetGuessChosen: function (notif) {
      const args = notif.args || {};
      const playerName = args.player_name || _("Player");
      const typeName =
        args.type_name ||
        this.formatBelieverTypeLabel(parseInt(args.type || 0, 10)) ||
        _("Believer");
      const drawIndex = this.getSafeProphetDrawIndex(args.draw_index, 1);
      this.showMessage(
        dojo.string.substitute(
          _("${player_name} predicts ${type_name} (draw #${draw_index})."),
          {
            player_name: playerName,
            type_name: typeName,
            draw_index: drawIndex,
          }
        ),
        "info"
      );
      this.setTopInstruction(
        _("The Prophet prediction selected. Revealing draw...")
      );
    },

    notif_prophetGuessPassed: function (notif) {
      const args = notif.args || {};
      const playerName = args.player_name || _("Player");
      this.showMessage(
        dojo.string.substitute(
          _("${player_name} chooses not to predict with The Prophet."),
          {
            player_name: playerName,
          }
        ),
        "info"
      );
      this.setTopInstruction(
        _("The Prophet prediction skipped. Resolving draw...")
      );
    },

    notif_prophetPredictionResolved: function (notif) {
      const args = notif.args || {};
      const flowPhase = String(args.prophet_flow_phase || "final");
      const myId = parseInt(this.player_id || 0, 10);
      const drawerId = parseInt(args.drawer_id || 0, 10);
      const remainingDrawN = Math.max(
        0,
        parseInt(args.remaining_draw_n || 0, 10) || 0
      );
      let prophetSnatchForMe = 0;
      let prophetDrawNoFlyForMe = 0;
      if (Array.isArray(args.prediction_events)) {
        args.prediction_events.forEach(function (row) {
          const receiverId = parseInt((row && row.receiver_id) || 0, 10);
          const guessCorrect = parseInt((row && row.guess_correct) || 0, 10);
          if (receiverId > 0 && receiverId === myId && guessCorrect === 1) {
            prophetSnatchForMe += 1;
          } else if (
            receiverId > 0 &&
            receiverId === myId &&
            guessCorrect !== 1
          ) {
            prophetDrawNoFlyForMe += 1;
          }
        });
      } else {
        const receiverId = parseInt(args.first_receiver_id || 0, 10);
        const guessCorrect = parseInt(args.guess_correct || 0, 10);
        if (receiverId > 0 && receiverId === myId && guessCorrect === 1) {
          prophetSnatchForMe += 1;
        } else if (
          receiverId > 0 &&
          receiverId === myId &&
          guessCorrect !== 1
        ) {
          prophetDrawNoFlyForMe += 1;
        }
      }
      if (drawerId > 0 && drawerId === myId && remainingDrawN > 0) {
        prophetDrawNoFlyForMe += remainingDrawN;
      }
      if (prophetDrawNoFlyForMe > 0) {
        this.pendingProphetDrawNoFlyCount = Math.max(
          0,
          parseInt(this.pendingProphetDrawNoFlyCount || 0, 10)
        ) + prophetDrawNoFlyForMe;
      }
      if (prophetSnatchForMe > 0) {
        this.pendingProphetSnatchNoFlyCount = Math.max(
          0,
          parseInt(this.pendingProphetSnatchNoFlyCount || 0, 10)
        ) + prophetSnatchForMe;
      }
      const prophetFlowMs = this.animateProphetPredictionFlow(args);
      const prophetGateMs = Math.max(
        0,
        parseInt(prophetFlowMs || 0, 10) || 0
      );
      if (prophetGateMs > 0) {
        this.setCombatRevealGate(
          prophetGateMs + this.getUnifiedCardFlightStaggerMs() * 2
        );
      }
      const gainRows = [
        {
          id: String(args.prophet_id || ""),
          gain: parseInt(args.prophet_gain_n || 0, 10),
        },
        {
          id: String(args.primary_prophet_id || ""),
          gain: parseInt(args.primary_gain_n || 0, 10),
        },
        {
          id: String(args.secondary_prophet_id || ""),
          gain: parseInt(args.secondary_gain_n || 0, 10),
        },
      ];
      const gainMap = {};
      gainRows.forEach(function (row) {
        if (!row.id || row.gain <= 0) return;
        gainMap[row.id] = (gainMap[row.id] || 0) + row.gain;
      });
      Object.keys(gainMap).forEach(function (pid) {
        const node = dojo.byId("table_believer_count_" + pid);
        if (!node) return;
        node.innerHTML = String(
          Math.max(0, parseInt(node.innerHTML || "0", 10) + gainMap[pid])
        );
      });

      const prophetId = String(args.prophet_id || "");
      const prophetVisible = parseInt(args.prophet_visible || 0, 10) === 1;

      const prophetName = prophetVisible
        ? args.prophet_name || _("Prophet")
        : _("Another Sect Leader");
      const drawerName = args.drawer_name || _("Player");
      const guessType = parseInt(args.guess_type || 0, 10);
      const revealedType = parseInt(args.revealed_type || 0, 10);
      if (guessType > 0 && revealedType > 0 && prophetVisible) {
        if (parseInt(args.guess_correct || 0, 10) === 1) {
          this.showMessage(
            dojo.string.substitute(
              _(
                "${prophet_name} predicted correctly. ${prophet_name} snatched the first Believer."
              ),
              {
                prophet_name: prophetName,
              }
            ),
            "info"
          );
        } else {
          this.showMessage(
            dojo.string.substitute(
              _("${prophet_name} predicted wrong. No Believers were snatched."),
              {
                prophet_name: prophetName,
              }
            ),
            "info"
          );
        }
      } else if (guessType === 0) {
        if (prophetVisible) {
          this.showMessage(
            dojo.string.substitute(_("${prophet_name} skipped prediction."), {
              prophet_name: prophetName,
            }),
            "info"
          );
        } else {
          this.showMessage(
            dojo.string.substitute(_("${drawer_name} draws Believers."), {
              drawer_name: drawerName,
            }),
            "info"
          );
        }
      }
      if (
        String(args.source_key || "") === "have_a_charity" ||
        String(args.source_key || "") === "divine_inspire"
      ) {
        if (flowPhase === "final") {
          this.setTopInstruction(_("The Prophet prediction ended."));
          this.scheduleCenterActionCardToDiscard(
            this.getUnifiedPostFlowDiscardDelayMs(prophetFlowMs)
          );
        } else {
          this.setTopInstruction(
            _("First Prophet reveal resolved. Waiting for next prediction.")
          );
        }
      }
      if (flowPhase === "final") {
        const clearAfterMs = Math.max(
          200,
          parseInt(prophetFlowMs || 0, 10) || 0
        );
        if (this.pendingProphetFlowClearTimeout) {
          clearTimeout(this.pendingProphetFlowClearTimeout);
          this.pendingProphetFlowClearTimeout = null;
        }
        this.pendingProphetFlowClearTimeout = setTimeout(
          function () {
            this.isProphetPredictionFlowActive = false;
            this.pendingProphetFlowClearTimeout = null;
          }.bind(this),
          clearAfterMs
        );
      } else {
        this.isProphetPredictionFlowActive = true;
      }
    },

    notif_skillAutoDefense: function (notif) {
      const pid = parseInt((notif.args && notif.args.player_id) || 0, 10);
      if (!pid) return;
      const defenseKind = String(
        (notif.args && notif.args.defense_kind) || "physical"
      );
      const cardType = defenseKind === "mental" ? "firm_faith" : "great_mercy";
      const player = this.gamedatas.players[String(pid)] || {};
      this.addAoeCommitToArena({
        player_id: pid,
        player_name: notif.args.player_name || player.name || _("Player"),
        sect_id: parseInt(
          (typeof notif.args.sect_id !== "undefined"
            ? notif.args.sect_id
            : player.player_sect) || -1,
          10
        ),
        card_kind: "action",
        card_type: cardType,
      });
      const attackLabel =
        defenseKind === "mental" ? _("Mental") : _("Physical");
      this.showMessage(
        dojo.string.substitute(
          _(
            "${player_name} is protected from ${attack_kind} attacks. Their Sect auto-defends."
          ),
          {
            player_name: notif.args.player_name || player.name || _("A player"),
            attack_kind: attackLabel,
          }
        ),
        "info"
      );
    },

    notif_skillHolyRebirth: function (notif) {
      const args = notif.args || {};
      const pid = String(args.player_id || "");
      const revivedN = parseInt(args.revived_n || 0, 10);
      const used = parseInt(args.used || 0, 10) === 1;

      if (typeof args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(args.graveyard_cards);
      }
      if (typeof args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, parseInt(args.graveyard_count || 0, 10));
      }

      if (pid && revivedN > 0 && pid !== String(this.player_id)) {
        const node = dojo.byId("table_believer_count_" + pid);
        if (node) {
          node.innerHTML = String(
            Math.max(0, parseInt(node.innerHTML || "0", 10) + revivedN)
          );
        }
      }

      if (args.player_id && args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(args.player_id)] &&
            this.gamedatas.player_skills[String(args.player_id)].type) ||
            5,
          args.skill_state_actor
        );
      }
      if (pid === String(this.player_id) && args.skill_state_actor) {
        this.mySkillState = args.skill_state_actor;
        this.refreshCurrentPlayerSkillTooltips();
      }

      if (used) {
        this.showMessage(
          dojo.string.substitute(
            _(
              "${player_name} uses Holy Rebirth and revives ${count} Believers."
            ),
            {
              player_name: args.player_name || _("A player"),
              count: revivedN,
            }
          ),
          "info"
        );
      } else {
        this.showMessage(
          (args.player_name || _("A player")) +
            " " +
            _("does not use Holy Rebirth this trigger."),
          "info"
        );
      }
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_reverseKarmaStatus: function (notif) {
      const args = notif.args || {};
      const active = parseInt(args.active || 0, 10) === 1;
      const ownerId = parseInt(args.owner_id || args.player_id || 0, 10);
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      this.setReverseKarmaContext(
        active ? 1 : 0,
        ownerId,
        args.stack_owner_ids || args.reverse_karma_stack_owner_ids || []
      );
      if (typeof args.war_type !== "undefined") {
        this.gamedatas.combat_context.war_type = parseInt(
          args.war_type || 0,
          10
        );
      }
      this.refreshCombatActionStacks();
      if (active) {
        this.showMessage(
          _(
            "A hidden confrontation response is activated for this confrontation."
          ),
          "info"
        );
      }
    },

    notif_impermanenceFailed: function (notif) {
      const args = notif.args || {};
      this.showMessage(
        dojo.string.substitute(
          _(
            "${player_name} failed Impermanence of Life and redrew a hidden skill."
          ),
          {
            player_name: args.player_name || _("A player"),
          }
        ),
        "info"
      );
      if (
        String(args.player_id || "") === String(this.player_id) &&
        this.pendingSkill
      ) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_impermanenceVictoryShowcase: function (notif) {
      const args = notif.args || {};
      const winnerId = parseInt(args.player_id || 0, 10);
      const winnerName = args.player_name || _("Player");
      const believerCount = parseInt(args.believer_count || 0, 10);
      const arena = dojo.byId("central_arena");
      if (arena) {
        arena.innerHTML =
          '<div class="impermanence-victory-wrap">' +
          '<div class="impermanence-victory-title">' +
          this.getColoredPlayerNameHtml(winnerId, winnerName) +
          " " +
          _("fulfills Impermanence of Life") +
          "</div>" +
          '<div class="card card-skill impermanence-victory-card is-hidden" data-index="12"></div>' +
          '<div class="impermanence-victory-subtitle">' +
          this.getColoredPlayerNameHtml(winnerId, winnerName) +
          " " +
          _("has 5 or more Believers and therefore wins this game.") +
          (believerCount > 0
            ? " (" +
              dojo.string.substitute(_("Current Believers: ${count}"), {
                count: believerCount,
              }) +
              ")"
            : "") +
          "</div>" +
          "</div>";
        const cardNode = dojo.query(".impermanence-victory-card", arena)[0];
        if (cardNode) {
          cardNode.id =
            cardNode.id ||
            "impermanence_victory_card_" +
              winnerId +
              "_" +
              Date.now().toString();
          this.attachSkillTooltip(cardNode, 12, null);
          let revealed = false;
          const revealTargetCard = function () {
            if (revealed) return;
            revealed = true;
            dojo.removeClass(cardNode, "is-hidden");
          };

          const sourceNode =
            dojo.byId("skill_icon_" + winnerId) ||
            dojo.byId("panel_" + winnerId) ||
            dojo.byId("playertable_" + winnerId);
          if (sourceNode && this.isNodeUsableForCardFlight(sourceNode)) {
            if (!sourceNode.id) {
              sourceNode.id =
                "impermanence_source_" +
                winnerId +
                "_" +
                Date.now().toString();
            }
            const flyMs = this.getUnifiedCardFlyMs();
            this.animateTempCardFlight({
              sourceId: sourceNode.id,
              targetId: cardNode.id,
              cardClass: "card card-skill impermanence-victory-fly-card",
              dataIndex: 12,
              duration: flyMs,
              zIndex: 2600,
              onEnd: revealTargetCard,
            });
            setTimeout(revealTargetCard, flyMs + 520);
          } else {
            revealTargetCard();
          }
        }
      }
      this.showMessage(
        dojo.string.substitute(
          _("${winner_name} wins by Impermanence of Life."),
          {
            winner_name: winnerName,
          }
        ),
        "info"
      );
    },

    notif_gameEndSummaryShow: function (notif) {
      const args = notif.args || {};
      const arena = dojo.byId("central_arena");
      if (!arena) return;
      if (this.pendingTransientArenaClearTimeout) {
        clearTimeout(this.pendingTransientArenaClearTimeout);
        this.pendingTransientArenaClearTimeout = null;
      }
      if (this.pendingCenterActionDiscardTimeout) {
        clearTimeout(this.pendingCenterActionDiscardTimeout);
        this.pendingCenterActionDiscardTimeout = null;
      }
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.centerActionHoldUntil = 0;

      const winnerId = parseInt(args.winner_id || 0, 10);
      const finalShowMode = String(args.final_show_mode || "");
      const players = Array.isArray(args.players) ? args.players : [];
      let winner = null;
      const losers = [];

      players.forEach(
        function (row) {
          const pid = parseInt(row.player_id || 0, 10);
          const normalized = {
            player_id: pid,
            player_name: row.player_name || _("Player"),
            player_sect: parseInt(row.player_sect || -1, 10),
            believer_count: parseInt(row.believer_count || 0, 10),
            pre_final_believer_count:
              typeof row.pre_final_believer_count !== "undefined"
                ? parseInt(row.pre_final_believer_count || 0, 10)
                : -1,
            is_final_war_contender:
              parseInt(row.is_final_war_contender || 0, 10) === 1 ? 1 : 0,
            is_final_struggle_contender:
              parseInt(row.is_final_struggle_contender || row.is_final_war_contender || 0, 10) === 1
                ? 1
                : 0,
            skill_type: parseInt(row.skill_type || 0, 10),
            is_winner:
              parseInt(row.is_winner || 0, 10) === 1 ||
              (winnerId > 0 && pid === winnerId),
          };
          if (normalized.is_winner && winner === null) {
            winner = normalized;
          } else {
            losers.push(normalized);
          }
        }.bind(this)
      );

      if (!winner && players.length > 0) {
        const fallback = players[0];
        winner = {
          player_id: parseInt(fallback.player_id || 0, 10),
          player_name: fallback.player_name || _("Player"),
          player_sect: parseInt(fallback.player_sect || -1, 10),
          believer_count: parseInt(fallback.believer_count || 0, 10),
          pre_final_believer_count:
            typeof fallback.pre_final_believer_count !== "undefined"
              ? parseInt(fallback.pre_final_believer_count || 0, 10)
              : -1,
          is_final_war_contender:
            parseInt(fallback.is_final_war_contender || 0, 10) === 1 ? 1 : 0,
          is_final_struggle_contender:
            parseInt(fallback.is_final_struggle_contender || fallback.is_final_war_contender || 0, 10) === 1
              ? 1
              : 0,
          skill_type: parseInt(fallback.skill_type || 0, 10),
          is_winner: true,
        };
      }

      const winnerNameHtml = winner
        ? this.getColoredPlayerNameHtml(winner.player_id, winner.player_name)
        : this.escapeHtml(args.winner_name || _("Player"));
      const winnerSectHtml = winner
        ? this.getColoredSectNameHtml(
            winner.player_id,
            winner.player_sect,
            "end-summary-sect-text"
          )
        : this.escapeHtml(_("Sect"));
      const winnerBelievers =
        winner && typeof winner.believer_count !== "undefined"
          ? parseInt(winner.believer_count || 0, 10)
          : parseInt(args.winner_believer_count || 0, 10);
      const formatBelieverCountText = function (row) {
        const current = parseInt(row.believer_count || 0, 10);
        const contender = parseInt(
          row.is_final_struggle_contender || row.is_final_war_contender || 0,
          10
        ) === 1
          ? 1
          : 0;
        const original =
          typeof row.pre_final_believer_count !== "undefined"
            ? parseInt(row.pre_final_believer_count, 10)
            : -1;
        if (contender && original >= 0) {
          if (finalShowMode === "war") {
            return dojo.string.substitute(
              _("${current} (before final war: ${original})"),
              {
                current: current,
                original: original,
              }
            );
          }
          if (finalShowMode === "struggle") {
            return dojo.string.substitute(
              _("${current} (before final struggle: ${original})"),
              {
                current: current,
                original: original,
              }
            );
          }
          return dojo.string.substitute(
            _("${current} (originally ${original})"),
            {
              current: current,
              original: original,
            }
          );
        }
        return String(current);
      };
      const winnerBelieversText = winner
        ? formatBelieverCountText(winner)
        : String(winnerBelievers);
      const reasonText =
        args.reason_text || _("A game-end rule determined the winner.");
      const endBtnDelayMs = Math.max(
        0,
        parseInt(args.end_button_delay_ms || 3000, 10)
      );
      const endBtnBaseLabel = _("End Game");

      const losersHtml = losers
        .map(
          function (row) {
            const skillType = parseInt(row.skill_type || 0, 10);
            const skillClass =
              skillType > 0
                ? "card card-skill end-summary-skill-card is-loser"
                : "card card-skill-back end-summary-skill-card is-loser";
            return (
              '<div class="end-summary-loser-item">' +
              '<div id="end_summary_skill_' +
              row.player_id +
              '" class="' +
              skillClass +
              '" data-index="' +
              (skillType > 0 ? skillType : 0) +
              '" data-skill-type="' +
              skillType +
              '"></div>' +
              '<div class="end-summary-loser-meta">' +
              '<div class="end-summary-loser-sect">' +
              this.getColoredSectNameHtml(
                row.player_id,
                row.player_sect,
                "end-summary-sect-text"
              ) +
              "</div>" +
              '<div class="end-summary-loser-player">' +
              this.getColoredPlayerNameHtml(row.player_id, row.player_name) +
              "</div>" +
              '<div class="end-summary-loser-believers">' +
              _("Believers") +
              ": " +
              this.escapeHtml(formatBelieverCountText(row)) +
              "</div>" +
              "</div>" +
              "</div>"
            );
          }.bind(this)
        )
        .join("");

      const winnerSkillType =
        winner && parseInt(winner.skill_type || 0, 10) > 0
          ? parseInt(winner.skill_type || 0, 10)
          : 0;
      const winnerSkillClass =
        winnerSkillType > 0
          ? "card card-skill end-summary-skill-card winner"
          : "card card-skill-back end-summary-skill-card winner";

      arena.innerHTML =
        '<div class="game-end-summary-wrap">' +
        '<div class="game-end-winner-block">' +
        '<div class="game-end-winner-card-col">' +
        '<div id="end_summary_winner_skill" class="' +
        winnerSkillClass +
        '" data-index="' +
        winnerSkillType +
        '" data-skill-type="' +
        winnerSkillType +
        '"></div>' +
        "</div>" +
        '<div class="game-end-winner-info">' +
        '<div class="game-end-winner-title">&#128081; ' +
        _("Winner") +
        ": " +
        winnerNameHtml +
        " (" +
        winnerSectHtml +
        ")" +
        "</div>" +
        '<div class="game-end-winner-believers">' +
        _("Believers") +
        ": " +
        this.escapeHtml(winnerBelieversText) +
        "</div>" +
        '<div class="game-end-win-reason">' +
        this.escapeHtml(reasonText) +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="game-end-losers-title">' +
        _("Losers") +
        ":</div>" +
        '<div class="game-end-losers-list">' +
        (losersHtml ||
          '<div class="game-end-no-losers">' +
            this.escapeHtml(_("No losing players.")) +
            "</div>") +
        "</div>" +
        '<div id="end_summary_action_area" class="game-end-summary-actions">' +
        '<button id="end_summary_end_game_btn" class="bgabutton bgabutton_blue" style="display:none;">' +
        endBtnBaseLabel +
        "</button>" +
        '<span id="end_summary_waiting_text" class="game-end-waiting-text"></span>' +
        "</div>" +
        "</div>";

      const winnerNode = dojo.byId("end_summary_winner_skill");
      if (winnerNode && winnerSkillType > 0) {
        this.attachSkillTooltip(winnerNode, winnerSkillType, null);
      }
      losers.forEach(
        function (row) {
          const skillType = parseInt(row.skill_type || 0, 10);
          if (skillType <= 0) return;
          const node = dojo.byId("end_summary_skill_" + row.player_id);
          if (!node) return;
          this.attachSkillTooltip(node, skillType, null);
        }.bind(this)
      );

      const endBtn = dojo.byId("end_summary_end_game_btn");
      const waitingNode = dojo.byId("end_summary_waiting_text");
      if (endBtn) {
        dojo.connect(endBtn, "onclick", this, function (evt) {
          dojo.stopEvent(evt);
          this.onConfirmGameEndSummaryClicked();
        });
      }

      this.clearGameEndSummaryTimers();
      this.gameEndSummaryConfirmSent = false;
      const startTs = Date.now();
      const renderCountdown = function () {
        const elapsed = Date.now() - startTs;
        const showButton = elapsed >= endBtnDelayMs;
        const remainToButtonSec = Math.max(
          0,
          Math.ceil((endBtnDelayMs - elapsed) / 1000)
        );

        if (endBtn) {
          dojo.style(endBtn, "display", showButton ? "inline-block" : "none");
          endBtn.textContent = endBtnBaseLabel;
        }
        if (waitingNode) {
          if (!showButton) {
            waitingNode.textContent = dojo.string.substitute(
              _("End Game button available in ${seconds}s"),
              { seconds: remainToButtonSec }
            );
          } else {
            waitingNode.textContent = "";
          }
        }
        if (showButton) {
          this.clearGameEndSummaryTimers();
        }
      }.bind(this);
      renderCountdown();

      this.gameEndSummaryTickTimer = setInterval(
        function () {
          renderCountdown();
        }.bind(this),
        250
      );
    },

    notif_gameEndSummaryClosing: function () {
      this.gameEndSummaryConfirmSent = true;
      this.clearGameEndSummaryTimers();
      const endBtn = dojo.byId("end_summary_end_game_btn");
      if (endBtn) {
        endBtn.disabled = true;
      }
      const waitingNode = dojo.byId("end_summary_waiting_text");
      if (waitingNode) {
        waitingNode.textContent = _("Finalizing game end...");
      }
    },

    notif_skillHiddenReset: function (notif) {
      const pid = String((notif.args && notif.args.player_id) || "");
      if (!pid) return;
      this.hideSkillForPlayer(pid);
      if (pid === String(this.player_id)) {
        this.refreshCurrentPlayerSkillTooltips();
      }
    },

    notif_skillCardReplaced: function (notif) {
      const args = notif.args || {};
      const newSkill = args.new_skill_card || null;
      this.replaceCurrentPlayerSkillCard(args.old_skill_card_id || 0, newSkill);
      const removedChoiceIds = Array.isArray(args.old_skill_card_ids)
        ? args.old_skill_card_ids.map(function (id) {
            return parseInt(id || 0, 10);
          })
        : [];
      if (removedChoiceIds.length) {
        const removedMap = {};
        removedChoiceIds.forEach(function (id) {
          if (id > 0) removedMap[String(id)] = 1;
        });
        this.initialSkillChoices = this.normalizeInitialSkillChoices(
          (this.initialSkillChoices || []).filter(function (card) {
            return !removedMap[String(parseInt((card && card.id) || 0, 10))];
          })
        );
        if (removedMap[String(parseInt(this.initialSkillDraftSelectedId || 0, 10))]) {
          this.initialSkillDraftSelectedId = 0;
        }
      } else if (String(this.getCurrentStateName() || "") === "chooseInitialSkill") {
        this.initialSkillChoices = [];
        this.initialSkillDraftSelectedId = 0;
      }
      if (!this.gamedatas.player_skills) this.gamedatas.player_skills = {};
      this.gamedatas.player_skills[String(this.player_id)] = newSkill
        ? { type: parseInt(newSkill.type || 0, 10) }
        : null;
      if (args.skill_state) {
        this.mySkillState = args.skill_state;
      }
      this.refreshCurrentPlayerSkillTooltips();
    },

    notif_initialSkillActivePlayerChanged: function (notif) {
      if (String(this.getCurrentStateName() || "") !== "chooseInitialSkill") {
        return;
      }
      const nArgs = (notif && notif.args) || {};
      if (!this.gamedatas) this.gamedatas = {};
      if (!this.gamedatas.gamestate) this.gamedatas.gamestate = {};
      if (!this.gamedatas.gamestate.args) this.gamedatas.gamestate.args = {};
      const nextActiveId = parseInt(nArgs.active_player_id || 0, 10);
      if (nextActiveId > 0) {
        this.gamedatas.gamestate.active_player = nextActiveId;
        this.gamedatas.gamestate.args.active_player_id = nextActiveId;
      }
      if (typeof nArgs.choices !== "undefined") {
        const normalized = this.normalizeInitialSkillChoices(nArgs.choices || []);
        this.gamedatas.gamestate.args.choices = normalized;
        this.initialSkillChoices = normalized;
        if (
          !normalized.some(function (card) {
            return (
              parseInt((card && card.id) || 0, 10) ===
              parseInt(this.initialSkillDraftSelectedId || 0, 10)
            );
          }, this)
        ) {
          this.initialSkillDraftSelectedId = 0;
        }
      }
      this.actionSubmissionInFlight = false;
      this.lastSubmittedActionSignature = "";
      this.onUpdateActionButtons(
        "chooseInitialSkill",
        (this.gamedatas && this.gamedatas.gamestate && this.gamedatas.gamestate.args) ||
          {}
      );
      this.refreshHandCardReadinessVisuals(
        "chooseInitialSkill",
        (this.gamedatas && this.gamedatas.gamestate && this.gamedatas.gamestate.args) ||
          {}
      );
    },

    notif_skillEveryoneEqual: function (notif) {
      const fxMs = this.playEveryoneEqualShuffleFx(
        (notif.args && notif.args.source_counts) || {},
        (notif.args && notif.args.distribution) || {}
      );
      const pendingMs = this.getUnifiedRedistributePendingMs(fxMs);
      this.everyoneEqualFxPendingUntil = Date.now() + pendingMs;
      this.markRedistributeDeckSourceSuppression("believer");
      this.showMessage(
        (notif.args.player_name || _("A player")) +
          " " +
          _(
            "used Everyone is Equal: all Believers were shuffled and redistributed."
          ),
        "info"
      );
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            15,
          notif.args.skill_state_actor
        );
      }
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.updateSkillProtectionFromActorState(
          this.player_id,
          this.mySkillState
        );
        this.refreshCurrentPlayerSkillTooltips();
      }
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_skillChaosComing: function (notif) {
      const fxMs = this.playChaosComingShuffleFx(
        (notif.args && notif.args.source_counts) || {},
        (notif.args && notif.args.distribution) || {}
      );
      const pendingMs = this.getUnifiedRedistributePendingMs(fxMs);
      this.chaosComingFxPendingUntil = Date.now() + pendingMs;
      this.markRedistributeDeckSourceSuppression("action");
      this.showMessage(
        (notif.args.player_name || _("A player")) +
          " " +
          _(
            "used Chaos Coming: all action cards were shuffled and redistributed."
          ),
        "info"
      );
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[String(notif.args.player_id)] &&
            this.gamedatas.player_skills[String(notif.args.player_id)].type) ||
            14,
          notif.args.skill_state_actor
        );
      }
      if (
        String(notif.args.player_id || "") === String(this.player_id) &&
        notif.args.skill_state_actor
      ) {
        this.mySkillState = notif.args.skill_state_actor;
        this.updateSkillProtectionFromActorState(
          this.player_id,
          this.mySkillState
        );
        this.refreshCurrentPlayerSkillTooltips();
      }
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_breakingFaithStart: function (notif) {
      const args = (notif && notif.args) || {};
      this.setClientCombatContext(4, args.player_id || 0, args.target_id || 0);
      this.ensureConfrontationActionVisual({ war_type: 4 }, "confirmDefense");
    },

    notif_spreadRumorsStart: function (notif) {
      const args = (notif && notif.args) || {};
      this.setClientCombatContext(
        9,
        args.player_id || 0,
        args.target_player_id || 0
      );
      this.ensureConfrontationActionVisual({ war_type: 9 }, "confirmDefense");
    },

    notif_spreadRumors: function (notif) {
      const args = notif.args || {};
      const attackerId = parseInt(args.player_id || 0, 10);
      const victimId = parseInt(args.victim_id || 0, 10);

      if (
        String(attackerId || "") === String(this.player_id || "") &&
        args.card_id &&
        victimId > 0
      ) {
        const sourceAnchorId = this.resolvePlayerAnchorNodeId(victimId, {
          allowPanel: true,
          allowTable: false,
          preferTable: false,
          fallbackId: "playertable_" + String(victimId || ""),
        });
        if (sourceAnchorId) {
          this.pendingBelieverSourceByCardId[String(args.card_id)] =
            sourceAnchorId;
        }
      }

      // Victim perspective: show stolen believer flying from own hand to attacker anchor.
      if (
        victimId > 0 &&
        String(victimId) === String(this.player_id || "") &&
        attackerId > 0
      ) {
        this.animateBelieverLossFromMyHandToPlayerAnchor(attackerId, 1);
      }

      if (victimId) {
        let victimElem = dojo.byId("table_believer_count_" + victimId);
        if (victimElem) {
          victimElem.innerHTML = Math.max(
            0,
            parseInt(victimElem.innerHTML) - 1
          );
        }
      }
    },

    notif_spreadRumorsSummary: function (notif) {
      if (notif.args.player_id) {
        let attackerElem = dojo.byId(
          "table_believer_count_" + notif.args.player_id
        );
        if (attackerElem) {
          attackerElem.innerHTML =
            parseInt(attackerElem.innerHTML) + (notif.args.stolen_total || 0);
        }
      }
      const attacker = this.getPlayerNameWithSect(
        notif.args.player_id,
        notif.args.player_name || _("A player")
      );
      const targetPlayer = this.getPlayerNameWithSect(
        notif.args.target_player_id,
        notif.args.target_player_name || _("Target")
      );
      const victimNames = (notif.args.victim_names || []).join(", ");
      const stolenTotal = parseInt(notif.args.stolen_total || 0, 10);
      if (stolenTotal > 0) {
        this.showMessage(
          dojo.string.substitute(
            _(
              "${attacker_name} plays Spread Rumors targeting ${target_name}. Snatches Believers from ${victim_names}."
            ),
            {
              attacker_name: attacker,
              target_name: targetPlayer,
              victim_names: victimNames || _("no one"),
            }
          ),
          "info"
        );
      } else {
        this.showMessage(
          dojo.string.substitute(
            _(
              "${attacker_name} plays Spread Rumors targeting ${target_name} but snatches no Believers."
            ),
            {
              attacker_name: attacker,
              target_name: targetPlayer,
            }
          ),
          "info"
        );
      }
      this.scheduleCenterActionCardToDiscard(
        this.getUnifiedPostFlowDiscardDelayMs(
          this.getUnifiedCardFlyMs() +
            this.getUnifiedCardFlightStaggerMs() * 3
        )
      );
    },

    notif_secretAllianceExchanged: function (notif) {
      const args = (notif && notif.args) || {};
      const attacker = this.getPlayerNameWithSect(
        args.attacker_id,
        args.player_name || _("A player")
      );
      const target = this.getPlayerNameWithSect(
        args.target_id,
        args.target_name || _("Target")
      );
      this.showMessage(
        dojo.string.substitute(
          _("${attacker_name} and ${target_name} exchange one Action card."),
          {
            attacker_name: attacker,
            target_name: target,
          }
        ),
        "info"
      );
      this.scheduleCenterActionCardToDiscard(
        this.getUnifiedPostFlowDiscardDelayMs(0)
      );
    },

    notif_witchHuntStart: function (notif) {
      const args = (notif && notif.args) || {};
      this.setClientCombatContext(
        8,
        args.player_id || 0,
        args.target_player_id || 0
      );
      this.ensureConfrontationActionVisual({ war_type: 8 }, "confirmDefense");
    },

    notif_witchHunt: function (notif) {
      const killedByOwner = notif.args.killed_by_owner || [];
      killedByOwner.forEach(
        function (entry) {
          const pid = String(entry.player_id || "");
          const count = parseInt(entry.count || 0, 10);
          const cardIds = entry.card_ids || [];
          const cards = entry.cards || [];

          const countElem = dojo.byId("table_believer_count_" + pid);
          if (countElem) {
            countElem.innerHTML = Math.max(
              0,
              parseInt(countElem.innerHTML || "0", 10) - count
            );
          }

          if (pid === String(this.player_id) && cardIds.length) {
            cardIds.forEach(
              function (cid) {
                this.playerBelieverCards.removeFromStockById(cid);
              }.bind(this)
            );
          }

          if (cards.length) {
            this.animateBelieversFromPlayerToGraveyard(pid, cards);
          }
        }.bind(this)
      );

      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, notif.args.graveyard_count);
      } else if (notif.args.n) {
        this.updateGraveyardCount(parseInt(notif.args.n, 10));
      }

      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      } else if (notif.args.killed_cards && notif.args.killed_cards.length) {
        this.pushGraveyardCards(notif.args.killed_cards);
      }

      const targetSect = parseInt(notif.args.target_sect || "-1", 10);
      const attackerPlayer = this.getPlayerNameWithSect(
        notif.args.attacker_id,
        notif.args.player_name || _("A player")
      );
      const targetPlayer = this.getPlayerNameWithSect(
        notif.args.target_player_id,
        notif.args.target_player_name || _("Target")
      );
      const targetMembers = Object.keys(this.gamedatas.players || {})
        .filter(
          function (pid) {
            const p = this.gamedatas.players[pid] || {};
            return (
              parseInt(p.player_role || "0", 10) !== 2 &&
              parseInt(p.player_sect || "-999", 10) === targetSect
            );
          }.bind(this)
        )
        .map(
          function (pid) {
            return (this.gamedatas.players[pid] || {}).name || "";
          }.bind(this)
        )
        .filter(function (name) {
          return !!name;
        });

      const membersText = targetMembers.length
        ? " (" + targetMembers.join(", ") + ")"
        : "";
      this.showMessage(
        dojo.string.substitute(
          _(
            "${attacker_name} attacks ${target_name}${members_text}. ${believer_type} Believers sent to graveyard: ${count}"
          ),
          {
            attacker_name: attackerPlayer,
            target_name: targetPlayer,
            members_text: membersText,
            believer_type: notif.args.type,
            count: notif.args.n,
          }
        ),
        "info"
      );
      this.scheduleCenterActionCardToDiscard(
        this.getUnifiedPostFlowDiscardDelayMs(
          this.getUnifiedCardFlyMs() +
            this.getUnifiedCardFlightStaggerMs() * 4
        )
      );
    },

    notif_actionCardsDiscarded: function (notif) {
      const args = (notif && notif.args) || {};
      const consumeDiscardAction =
        parseInt(
          (notif &&
          notif.args &&
          typeof notif.args.consume_discard_action !== "undefined"
            ? notif.args.consume_discard_action
            : 1) || 0,
          10
        ) === 1;
      const discardedCards = this.normalizeActionDiscardCards(args);
      this.animateActionCardsToDiscard(args.player_id || 0, discardedCards);
      if (
        String(args.player_id) === String(this.player_id) &&
        args.card_ids
      ) {
        args.card_ids.forEach(
          function (card_id) {
            this.playerActionCards.removeFromStockById(card_id);
            delete this.actionCardTypeById[String(card_id)];
          }.bind(this)
        );
        if (
          consumeDiscardAction &&
          this.getCurrentStateName() === "playerTurn" &&
          this.isCurrentPlayerActive()
        ) {
          this.currentTurnActionMask |= 0b00001;
          this.onUpdateActionButtons("playerTurn", {});
        }
      }

      if (discardedCards.length) {
        discardedCards.forEach(
          function (card) {
            if (!card || !card.type) return;
            this.pushActionDiscardCard(card.type, card.id || "");
          }.bind(this)
        );
      }

      let countElem = dojo.byId("table_action_count_" + args.player_id);
      if (countElem) {
        countElem.innerHTML = Math.max(
          0,
          parseInt(countElem.innerHTML) - (args.count || 0)
        );
      }
    },

    notif_defenseDecisionPhase: function (notif) {
      const defenseKind = (notif.args && notif.args.defense_kind) || "physical";
      const defenseLabel = this.getDefenseKindLabel(defenseKind);
      if (notif.args && notif.args.phase === "defense_prompt") {
        if (notif.args.scope === "sect") {
          this.showMessage(
            dojo.string.substitute(
              _("Waiting for Sect ${defense_label} defense decisions."),
              {
                defense_label: defenseLabel,
              }
            ),
            "info"
          );
        } else {
          const names = (notif.args.defender_names || []).join(", ");
          this.showMessage(
            dojo.string.substitute(
              _(
                "Waiting for ${defense_label} defense decision: ${defender_names}"
              ),
              {
                defense_label: defenseLabel,
                defender_names: names,
              }
            ),
            "info"
          );
        }
      }
    },

    notif_defensePlayed: function (notif) {
      const warType = this.getCurrentCombatWarType();
      const isAoeDefense = warType === 3 || warType === 6;
      if (
        isAoeDefense &&
        notif.args &&
        notif.args.player_id
      ) {
        this.markAoePlayerDefended(notif.args.player_id);
        const defendedSectId = parseInt(
          (notif.args && notif.args.sect_id) ||
            this.getPlayerSectId(notif.args.player_id) ||
            -1,
          10
        );
        this.markAoeSectDefended(defendedSectId);
      }
      if (String(notif.args.player_id) === String(this.player_id)) {
        this.playerActionCards.removeFromStockById(notif.args.card_id);
      }
      let countElem = dojo.byId("table_action_count_" + notif.args.player_id);
      if (countElem) {
        countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - 1);
      }
      this.addCombatCommitToArena({
        player_id: notif.args.player_id,
        player_name: notif.args.player_name,
        sect_id: notif.args.sect_id,
        card_id: notif.args.card_id,
        card_type: notif.args.card_type,
        card_kind: "action",
        facedown: isAoeDefense,
      });
      if (parseInt(notif.args.moved_to_discard || 0, 10) === 1) {
        if (
          dojo.byId("current_center_action_card") ||
          String(this.currentFaithWarActionCardType || "") !== ""
        ) {
          this.currentCenterActionHadDefenseDiscard = true;
        }
        this.pushActionDiscardCard(notif.args.card_type, notif.args.card_id);
      }
      if (isAoeDefense) {
        this.showMessage(_("A defender commits a facedown card"), "info");
      } else {
        this.showMessage(
          dojo.string.substitute(_("${player_name} uses a defense card"), {
            player_name: notif.args.player_name,
          }),
          "info"
        );
      }
      if (String(notif.args.player_id) === String(this.player_id)) {
        const stateName = this.getCurrentStateName();
        if (
          stateName === "conspiracyChooseBelievers" ||
          stateName === "martyrdomChooseBelievers"
        ) {
          this.setTopInstruction(
            _("Your Sect is already defended. Waiting for other Sects to act.")
          );
          dojo.removeClass("mybelievercards", "highlight_stock");
        }
      } else if (isAoeDefense) {
        const me =
          (this.gamedatas &&
            this.gamedatas.players &&
            this.gamedatas.players[String(this.player_id)]) ||
          null;
        const mySect = parseInt((me && me.player_sect) || -1, 10);
        const defendedSect = parseInt(
          (notif.args && notif.args.sect_id) || -1,
          10
        );
        if (mySect >= 0 && defendedSect >= 0 && mySect === defendedSect) {
          this.showMessage(
            _(
              "Your Sect is already defended. Your defense step is completed automatically."
            ),
            "info"
          );
          const stateName = this.getCurrentStateName();
          if (
            stateName === "conspiracyChooseBelievers" ||
            stateName === "martyrdomChooseBelievers"
          ) {
            this.setTopInstruction(
              _("Your Sect is already defended. Waiting for other Sects to act.")
            );
            dojo.removeClass("mybelievercards", "highlight_stock");
          }
        }
      }
    },

    notif_passDefense: function (notif) {
      if (notif.args && notif.args.anonymous) {
        this.showMessage(_("A defender chooses not to defend"), "info");
        return;
      }
      this.showMessage(
        dojo.string.substitute(_("${player_name} does not defend"), {
          player_name: notif.args.player_name || _("A defender"),
        }),
        "info"
      );
    },

    notif_combatBlocked: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      this.gamedatas.combat_context.war_type = 0;
      this.gamedatas.combat_context.war_attacker_id = 0;
      this.gamedatas.combat_context.war_defender_id = 0;
      this.gamedatas.combat_context.war_rep_attacker_id = 0;
      this.gamedatas.combat_context.war_rep_defender_id = 0;
      this.gamedatas.combat_context.war_zombie_owner_id = parseInt(
        (notif && notif.args && notif.args.zombie_owner_id) || 0,
        10
      );
      this.gamedatas.combat_context.war_zombie_snapshot_max_discard_arg =
        parseInt(
          (notif &&
            notif.args &&
            notif.args.war_zombie_snapshot_max_discard_arg) ||
            0,
          10
        );
      if (
        notif &&
        notif.args &&
        typeof notif.args.graveyard_cards !== "undefined"
      ) {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (
        notif &&
        notif.args &&
        typeof notif.args.graveyard_count !== "undefined"
      ) {
        this.updateGraveyardCount(0, parseInt(notif.args.graveyard_count || 0, 10));
      } else {
        this.renderGraveyardPreview();
      }
      this.clearZombieGraveSelection();
      this.closeZombieGravePickerModal();
      this.showMessage(_("Attack blocked by defense"), "info");
      this.clearTransientArenaAfterAction(this.getUnifiedQuickClearDelayMs(), {
        force: true,
      });
    },

    notif_becomeWanderer: function (notif) {
      const args = (notif && notif.args) || {};
      const playerName = args.player_name || _("A player");
      this.showMessage(
        dojo.string.substitute(
          _("${player_name} is rejected by all Sects and becomes a Wanderer."),
          {
            player_name: playerName,
          }
        ),
        "info"
      );
    },

    notif_wandererSteal: function (notif) {
      if (notif.args.target_id) {
        let victimElem = dojo.byId(
          "table_believer_count_" + notif.args.target_id
        );
        if (victimElem) {
          victimElem.innerHTML = Math.max(
            0,
            parseInt(victimElem.innerHTML) - 1
          );
        }
      }
      if (notif.args.player_id) {
        let wandererElem = dojo.byId(
          "table_believer_count_" + notif.args.player_id
        );
        if (wandererElem) {
          wandererElem.innerHTML = parseInt(wandererElem.innerHTML) + 1;
        }
      }
      this.showMessage(
        dojo.string.substitute(
          _("${player_name} snatches 1 Believer from ${target_name}"),
          {
            player_name: notif.args.player_name,
            target_name: notif.args.target_name,
          }
        ),
        "info"
      );
    },

    notif_wandererReborn: function (notif) {
      this.showMessage(
        notif.args.player_name +
          " " +
          _("rises again and returns to normal play!"),
        "info"
      );
    },

    notif_martyrdomStart: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      this.gamedatas.combat_context.war_type = 3;
      this.gamedatas.combat_context.war_rep_attacker_id = 0;
      this.gamedatas.combat_context.war_rep_defender_id = 0;
      this.setReverseKarmaContext(0, 0);
      this.currentAoeCommitTargetIds = [];
      this.currentAoeAssignedAction = "";
      this.currentAoeDefendedPlayerIds = {};
      this.currentAoeDefendedSectIds = {};
      const attackerId = parseInt(
        (notif.args && notif.args.player_id) || 0,
        10
      );
      if (attackerId > 0) {
        this.placeAoeActionCard(
          "martyrdom",
          this.currentAoeActionCardId || "",
          attackerId
        );
        this.ensureAoeAttackerBelieverPlaceholder();
      }
      this.showMessage(
        dojo.string.substitute(_("${player_name} initiates Martyrdom"), {
          player_name: notif.args.player_name,
        }),
        "info"
      );
    },

    notif_martyrdomAttackerCommitted: function (notif) {
      // Keep all clients visually in sync even if notifications arrive out of order.
      this.syncAoeAnchorFromNotif("martyrdom", notif.args);
      if (String(notif.args.player_id) === String(this.player_id)) {
        this.playerBelieverCards.removeFromStockById(notif.args.card_id);
        this.setTopInstruction(this.getAoeWaitingPromptText("martyrdom"));
        dojo.removeClass("mybelievercards", "highlight_stock");
      }
      let countElem = dojo.byId("table_believer_count_" + notif.args.player_id);
      if (countElem) {
        countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - 1);
      }
      this.addCombatCommitToArena({
        player_id: notif.args.player_id,
        player_name: notif.args.player_name,
        sect_id: notif.args.sect_id,
        card_id: notif.args.card_id,
        card_type: notif.args.card_type,
        card_kind: "believer",
        is_attacker_representative: notif.args.is_attacker_representative,
        facedown: true,
      });
      this.showMessage(
        dojo.string.substitute(
          _("${player_name} commits a Believer for Martyrdom"),
          {
            player_name: notif.args.player_name,
          }
        ),
        "info"
      );
    },

    notif_martyrdomRepresentativePhase: function (notif) {
      this.showMessage(
        _("Each Sect Leader chooses a representative for Martyrdom."),
        "info"
      );
    },

    notif_martyrdomRepresentativeChosen: function (notif) {
      const repId = parseInt(
        (notif.args && notif.args.representative_id) || 0,
        10
      );
      if (repId > 0) {
        const repSect = this.getPlayerSectId(repId);
        if (repSect >= 0 && repSect !== this.getCurrentAoeAttackerSectId()) {
          this.ensureAoeRightSectSlot(
            repSect,
            repId,
            (notif.args && notif.args.representative_name) || "",
            false
          );
        } else if (repSect >= 0) {
          this.setAoeAttackerBelieverOwnerLabel(
            repId,
            (notif.args && notif.args.representative_name) || ""
          );
        }
      }
      this.showMessage(
        dojo.string.substitute(_("${leader_name} assigned ${player_name}"), {
          leader_name: notif.args.leader_name,
          player_name: notif.args.representative_name,
        }),
        "info"
      );
    },

    notif_martyrdomAssignedToYou: function (notif) {
      this.currentAoeAssignedAction = "martyrdom";
      this.showMessage(
        dojo.string.substitute(
          _("You have been assigned by ${leader_name} to Martyrdom."),
          {
            leader_name: notif.args.leader_name,
          }
        ),
        "info"
      );
      if (this.getCurrentStateName() === "martyrdomChooseBelievers") {
        this.setTopInstruction(this.getAoeCommitPromptText("martyrdom"));
      }
    },

    notif_martyrdomBelieverCommitted: function (notif) {
      this.handleAoeBelieverCommitted(notif.args, "martyrdom");
    },

    notif_martyrdomDefendersChoose: function (notif) {
      this.showMessage(
        _(
          "Martyrdom: waiting for each chosen representative to choose a Believer."
        ),
        "info"
      );
      this.syncAoeDefendersChooseState(
        notif.args,
        "martyrdom",
        "martyrdomChooseBelievers"
      );
    },

    notif_martyrdomResolved: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      if (typeof notif.args.reverse_karma_active !== "undefined") {
        this.setReverseKarmaContext(
          parseInt(notif.args.reverse_karma_active || 0, 10),
          parseInt(notif.args.reverse_karma_owner_id || 0, 10),
          notif.args.reverse_karma_stack_owner_ids || []
        );
      }
      this.refreshCombatActionStacks();
      this.ensureAoeVisualBelieversFromResolvedPayload(
        "martyrdom",
        notif.args || {}
      );
      const deferredGraveyardCount =
        typeof notif.args.graveyard_count !== "undefined"
          ? parseInt(notif.args.graveyard_count || 0, 10)
          : null;
      const deferredGraveyardCards =
        typeof notif.args.graveyard_cards !== "undefined"
          ? notif.args.graveyard_cards
          : null;
      const revealDurationMs = this.revealAoeBelievers();
      const revealDelayMs =
        parseInt(revealDurationMs || 0, 10) +
        this.getUnifiedRevealHoldMs() +
        this.getCombatRevealLingerMs();
      this.setCombatRevealGate(
        revealDelayMs
      );
      const survivorSet = {};
      (notif.args.survivor_defenders || []).forEach(function (cid) {
        survivorSet[String(cid)] = true;
      });
      const deadSet = {};
      (notif.args.dead_defenders || []).forEach(function (cid) {
        deadSet[String(cid)] = true;
      });
      const ownerByCardId = {};
      dojo
        .query('.aoe-commit-item[data-card-kind="believer"]')
        .forEach(function (wrap) {
          const cardId = wrap.getAttribute("data-card-id");
          const ownerId = parseInt(
            wrap.getAttribute("data-owner-id") || "0",
            10
          );
          if (!cardId || !ownerId) return;
          if (survivorSet[String(cardId)]) {
            ownerByCardId[String(cardId)] = ownerId;
          } else if (deadSet[String(cardId)]) {
            ownerByCardId[String(cardId)] = 0;
          } else if (
            String(wrap.getAttribute("data-player-id")) ===
            String(notif.args.attacker_id)
          ) {
            ownerByCardId[String(cardId)] = 0;
          }
        });

      // Physical AoE: dead and draw participants are shown as losers (gray).
      const attackerBelieverWrap = dojo.query(
        '#aoe_attacker_slot .aoe-commit-item[data-card-kind="believer"]'
      )[0];
      if (attackerBelieverWrap) {
        const attackerCardId =
          attackerBelieverWrap.getAttribute("data-card-id");
        if (attackerCardId) {
          ownerByCardId[String(attackerCardId)] = 0;
          this.setAoeResultState(attackerCardId, "loser", "", {
            hideLabel: true,
          });
        }
      }
      Object.keys(survivorSet).forEach(
        function (cid) {
          this.setAoeResultState(cid, "winner", _("win"));
        }.bind(this)
      );
      Object.keys(deadSet).forEach(
        function (cid) {
          this.setAoeResultState(cid, "loser", _("lose"));
        }.bind(this)
      );
      this.mapAoeReturnSourcesForCurrentPlayer(ownerByCardId);
      this.runAfterCombatRevealGate(
        function () {
          this.animateAoeBelieversToTargets(ownerByCardId);
          const applyGraveyardSnapshot = function () {
            if (deferredGraveyardCards !== null) {
              this.setGraveyardCardsSnapshot(deferredGraveyardCards);
            }
            if (deferredGraveyardCount !== null) {
              this.updateGraveyardCount(0, deferredGraveyardCount);
            }
          }.bind(this);
          if (
            Object.keys(ownerByCardId || {}).length > 0 &&
            this.getUnifiedCardFlyMs() > 0
          ) {
            setTimeout(
              applyGraveyardSnapshot,
              this.getUnifiedCardFlyMs() + this.getUnifiedCardFlightStaggerMs()
            );
          } else {
            applyGraveyardSnapshot();
          }
          // Schedule transient clear only after return flights are started.
          // This avoids race cases where gate-delayed clear wipes cards before
          // Martyrdom graveyard flights become visible.
          this.clearTransientArenaAfterAction(
            this.getUnifiedCardFlyMs() + 260
          );
        }.bind(this),
        revealDelayMs
      );
      this.showMessage(
        dojo.string.substitute(_("Martyrdom by ${player_name} ends"), {
          player_name: notif.args.player_name,
        }),
        "info"
      );
      this.clearAoeCommitTransientState();
    },

    notif_faithDebateStart: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      this.gamedatas.combat_context.war_type = 7;
      this.gamedatas.combat_context.war_attacker_id = parseInt(
        notif.args.player_id || 0,
        10
      );
      this.gamedatas.combat_context.war_defender_id = parseInt(
        notif.args.target_player_id || notif.args.target_id || 0,
        10
      );
      // Keep Reverse Karma status if it was already confirmed in pre-combat prompt.
      this.hasCommittedDuelBelieverThisRound = false;
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.setDuelLogMode("debate");
      this.resetFaithWarLog();
      this.clearFaithWarRoundCards();
      const debateLeftId = parseInt(notif.args.player_id || 0, 10);
      const debateRightId = parseInt(
        notif.args.target_player_id || notif.args.target_id || 0,
        10
      );
      this.clearFaithWarArena(
        this.buildFaithWarBannerTitle(
          this.getCombatBannerSectLabelByPlayer(
            debateLeftId,
            notif.args.player_name
          ),
          debateLeftId,
          this.getCombatBannerSectLabelByPlayer(
            debateRightId,
            notif.args.target_name
          ),
          debateRightId,
          _("Faith Debate")
        )
      );
      this.setDuelActionCard(
        "faith_debate",
        notif.args.player_id,
        "Faith Debate"
      );
    },

    notif_faithDebateRepresentativePhase: function (notif) {
      // Keep silent to reduce spam.
    },

    notif_faithDebateRepresentativeChosen: function (notif) {
      // Keep silent to reduce spam.
    },

    notif_faithDebateRound: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      this.gamedatas.combat_context.war_type = 7;
      this.gamedatas.combat_context.war_rep_attacker_id = parseInt(
        (notif.args && notif.args.attacker_rep_id) || 0,
        10
      );
      this.gamedatas.combat_context.war_rep_defender_id = parseInt(
        (notif.args && notif.args.defender_rep_id) || 0,
        10
      );
      // Keep Reverse Karma display persistent across the whole Debate once activated.
      this.hasCommittedDuelBelieverThisRound = false;
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.setDuelLogMode("debate");
      this.faithWarRoundNo = parseInt(
        notif.args.round || this.faithWarRoundNo + 1
      );
      const applyDebateRoundSetup = function () {
        this.clearFaithWarRoundCards();
        const debateRoundLeftId = parseInt(
          notif.args.attacker_rep_id || notif.args.attacker_id || 0,
          10
        );
        const debateRoundRightId = parseInt(
          notif.args.defender_rep_id || notif.args.defender_id || 0,
          10
        );
        this.clearFaithWarArena(
          this.buildFaithWarBannerTitle(
            this.getCombatBannerSectLabelByPlayer(
              debateRoundLeftId,
              notif.args.attacker_rep_name || _("Attacker")
            ),
            debateRoundLeftId,
            this.getCombatBannerSectLabelByPlayer(
              debateRoundRightId,
              notif.args.defender_rep_name || _("Defender")
            ),
            debateRoundRightId,
            dojo.string.substitute(_("Faith Debate round ${round}/5:"), {
              round: this.faithWarRoundNo,
            })
          )
        );
        this.setDuelParticipants(
          notif.args.attacker_rep_id,
          notif.args.defender_rep_id,
          notif.args.attacker_rep_name,
          notif.args.defender_rep_name
        );
        const debateActionOwnerId = parseInt(
          (this.gamedatas.combat_context &&
            this.gamedatas.combat_context.war_attacker_id) ||
            this.currentFaithWarActionOwnerId ||
            notif.args.attacker_id ||
            notif.args.attacker_rep_id ||
            0,
          10
        );
        this.setDuelActionCard(
          "faith_debate",
          debateActionOwnerId,
          "Faith Debate"
        );
        if (this.getCurrentStateName() === "faithDebateDuel") {
          this.onUpdateActionButtons(
            "faithDebateDuel",
            (this.gamedatas &&
              this.gamedatas.gamestate &&
              this.gamedatas.gamestate.args) ||
              {}
          );
        }
      }.bind(this);
      if (this.pendingDuelRoundSetupTimeout) {
        clearTimeout(this.pendingDuelRoundSetupTimeout);
        this.pendingDuelRoundSetupTimeout = null;
      }
      const setupDelayMs = this.getDuelRoundSetupDelayMs();
      if (setupDelayMs > 0) {
        this.pendingDuelRoundSetupTimeout = setTimeout(
          function () {
            this.pendingDuelRoundSetupTimeout = null;
            applyDebateRoundSetup();
          }.bind(this),
          setupDelayMs
        );
      } else {
        applyDebateRoundSetup();
      }
    },

    notif_faithDebateCardPlayed: function (notif) {
      this.syncDuelCommittedBeliever(notif.args, "faithDebateDuel");
    },

    notif_faithDebateStopped: function (notif) {
      this.showMessage(
        dojo.string.substitute(
          _("${player_name} chooses to stop Faith Debate"),
          {
            player_name: notif.args.player_name,
          }
        ),
        "info"
      );
      dojo.removeClass("mybelievercards", "highlight_stock");
      this.setTopInstruction(_("Faith Debate is stopping..."));
    },

    notif_faithDebateStopProposed: function (notif) {
      this.showMessage(
        dojo.string.substitute(
          _(
            "${player_name} requests to stop Faith Debate; waiting for ${leader_name}."
          ),
          {
            player_name: notif.args.player_name,
            leader_name: notif.args.leader_name,
          }
        ),
        "info"
      );
      dojo.removeClass("mybelievercards", "highlight_stock");
    },

    notif_faithDebateStopRejected: function (notif) {
      this.showMessage(
        dojo.string.substitute(
          _(
            "${leader_name} rejects stopping Faith Debate requested by ${requester_name}."
          ),
          {
            leader_name: notif.args.leader_name,
            requester_name: notif.args.requester_name,
          }
        ),
        "info"
      );
    },

    notif_faithDebateStopRejectedPrivate: function (notif) {
      this.showMessage(
        _(
          "Your Leader rejects stopping Faith Debate. You must continue this round."
        ),
        "info"
      );
    },

    notif_faithDebateResult: function (notif) {
      this.mapDebateReturnCardSourcesForCurrentPlayer(notif.args || {});
      // Keep counts strictly server-authoritative during ongoing Debate.
      // Debaters' cards are parked in debateused and only return at debate end.
      const duelVisualInfo = this.applyDuelResultVisualAndLog(
        notif.args,
        "debate",
        false
      );
      const revealDelay =
        parseInt((duelVisualInfo && duelVisualInfo.revealDurationMs) || 0, 10) +
        this.getUnifiedRevealHoldMs();
      this.setCombatRevealGate(revealDelay + this.getCombatRevealLingerMs());
      const duelCleanupDelayMs =
        revealDelay +
        this.getCombatRevealLingerMs() +
        this.getUnifiedCardFlightStaggerMs() * 2 +
        120;
      this.scheduleDuelRoundCleanup(duelCleanupDelayMs);
    },

    notif_faithDebateEnd: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      const preserveReplayTrace = this.isReplaySessionActive();
      this.setReverseKarmaContext(0, 0);
      this.gamedatas.combat_context.war_type = 0;
      this.deferFaithWarResultClearOnNextAction = false;
      if (this.pendingDuelRoundSetupTimeout) {
        clearTimeout(this.pendingDuelRoundSetupTimeout);
        this.pendingDuelRoundSetupTimeout = null;
      }
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.runAfterCombatRevealGate(
        function () {
          this.moveDuelActionCardToDiscard();
          this.clearFaithWarRoundCards();
          this.clearFaithWarArena(
            '<div class="faith-war-banner">' +
              dojo.string.substitute(
                _("Faith Debate ended after ${round} rounds"),
                {
                  round: notif.args.round,
                }
              ) +
              "</div>"
          );
          if (preserveReplayTrace) {
            this.renderFaithWarLog();
          } else {
            this.resetFaithWarLog();
            this.clearTransientArenaAfterAction(this.getUnifiedBannerClearDelayMs());
          }
        }.bind(this)
      );
    },

    notif_conspiracyRepresentativePhase: function (notif) {
      this.showMessage(
        _("Each Sect Leader chooses a representative for Conspiracy."),
        "info"
      );
    },

    notif_conspiracyRepresentativeChosen: function (notif) {
      const suppressLeaderSelfMessage =
        notif.args &&
        String(notif.args.leader_id || "") ===
          String(notif.args.representative_id || "");
      const repId = parseInt(
        (notif.args && notif.args.representative_id) || 0,
        10
      );
      if (repId > 0) {
        const repSect = this.getPlayerSectId(repId);
        if (repSect >= 0 && repSect !== this.getCurrentAoeAttackerSectId()) {
          this.ensureAoeRightSectSlot(
            repSect,
            repId,
            (notif.args && notif.args.representative_name) || "",
            false
          );
        } else if (repSect >= 0) {
          this.setAoeAttackerBelieverOwnerLabel(
            repId,
            (notif.args && notif.args.representative_name) || ""
          );
        }
      }
      if (!suppressLeaderSelfMessage) {
        this.showMessage(
          dojo.string.substitute(_("${leader_name} assigned ${player_name}"), {
            leader_name: notif.args.leader_name,
            player_name: notif.args.representative_name,
          }),
          "info"
        );
      }
    },

    notif_conspiracyAssignedToYou: function (notif) {
      if (
        notif.args &&
        String(notif.args.leader_id || "") ===
          String(notif.args.representative_id || "")
      ) {
        return;
      }
      this.showMessage(
        dojo.string.substitute(
          _("You have been assigned by ${leader_name} to Conspiracy."),
          {
            leader_name: notif.args.leader_name,
          }
        ),
        "info"
      );
      this.currentAoeAssignedAction = "conspiracy";
      if (this.getCurrentStateName() === "conspiracyChooseBelievers") {
        this.setTopInstruction(this.getAoeCommitPromptText("conspiracy"));
      }
    },

    notif_conspiracyDefendersChoose: function (notif) {
      const isFinalStruggle =
        parseInt((notif.args && notif.args.final_struggle) || 0, 10) === 1;
      this.showMessage(
        isFinalStruggle
          ? _("Final Struggle Conspiracy: contenders must choose one Believer")
          : _(
              "Each chosen representative must choose a Believer for Conspiracy."
            ),
        "info"
      );
      this.syncAoeDefendersChooseState(
        notif.args,
        "conspiracy",
        "conspiracyChooseBelievers"
      );
    },

    notif_conspiracyStart: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      const isFinalStruggle =
        parseInt((notif.args && notif.args.final_struggle) || 0, 10) === 1;
      this.gamedatas.combat_context.war_type = isFinalStruggle ? 11 : 6;
      this.gamedatas.combat_context.war_rep_attacker_id = 0;
      this.gamedatas.combat_context.war_rep_defender_id = 0;
      this.setReverseKarmaContext(0, 0);
      this.currentAoeCommitTargetIds = [];
      this.currentAoeAssignedAction = "";
      this.currentAoeDefendedPlayerIds = {};
      this.currentAoeDefendedSectIds = {};
      const attackerId = parseInt(
        (notif.args && notif.args.player_id) || 0,
        10
      );
      this.gamedatas.combat_context.war_attacker_id = attackerId;
      if (attackerId > 0) {
        this.placeAoeActionCard(
          "conspiracy",
          this.currentAoeActionCardId || "",
          attackerId
        );
        this.ensureAoeAttackerBelieverPlaceholder();
      }
      this.showMessage(
        isFinalStruggle
          ? dojo.string.substitute(
              _(
                "${player_name} launches Final Struggle Conspiracy (R${round})"
              ),
              {
                player_name: notif.args.player_name,
                round: parseInt((notif.args && notif.args.round) || 1, 10),
              }
            )
          : dojo.string.substitute(_("${player_name} spreads a Conspiracy"), {
              player_name: notif.args.player_name,
            }),
        "info"
      );
      if (isFinalStruggle) {
        this.setTopInstruction(
          _("Final Struggle (Conspiracy): contenders choose one Believer.")
        );
      }
    },

    notif_conspiracyBelieverCommitted: function (notif) {
      this.handleAoeBelieverCommitted(notif.args, "conspiracy");
    },

    notif_conspiracyResolved: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      const isFinalStruggle =
        parseInt((notif.args && notif.args.final_struggle) || 0, 10) === 1;
      if (typeof notif.args.reverse_karma_active !== "undefined") {
        this.setReverseKarmaContext(
          parseInt(notif.args.reverse_karma_active || 0, 10),
          parseInt(notif.args.reverse_karma_owner_id || 0, 10),
          notif.args.reverse_karma_stack_owner_ids || []
        );
      }
      this.refreshCombatActionStacks();
      this.ensureAoeVisualBelieversFromResolvedPayload(
        "conspiracy",
        notif.args || {}
      );
      const revealDurationMs = this.revealAoeBelievers();
      const revealDelayMs =
        parseInt(revealDurationMs || 0, 10) +
        this.getUnifiedRevealHoldMs() +
        this.getCombatRevealLingerMs();
      this.setCombatRevealGate(
        revealDelayMs
      );
      const attackerCardId = String(notif.args.attacker_card_id || "");
      const stolenSet = {};
      (notif.args.attacker_stolen || []).forEach(function (cid) {
        stolenSet[String(cid)] = true;
      });
      let attackerWinsVisualSet = {};
      (
        notif.args.attacker_wins_visual ||
        notif.args.attacker_stolen ||
        []
      ).forEach(function (cid) {
        attackerWinsVisualSet[String(cid)] = true;
      });
      let defenderWinsSet = {};
      (notif.args.defender_wins || []).forEach(function (cid) {
        defenderWinsSet[String(cid)] = true;
      });
      let drawSet = {};
      (notif.args.draw_defenders || []).forEach(function (cid) {
        drawSet[String(cid)] = true;
      });
      const boardVisual = this.computeConspiracyVisualOutcomesFromBoard(
        attackerCardId,
        parseInt(notif.args.reverse_karma_active || 0, 10) === 1
      );
      if (boardVisual) {
        attackerWinsVisualSet = boardVisual.attackerWins || {};
        defenderWinsSet = boardVisual.defenderWins || {};
        drawSet = boardVisual.draws || {};
      }

      if (Object.keys(defenderWinsSet).length > 0) {
        this.setAoeResultState(attackerCardId, "loser", "", {
          hideLabel: true,
        });
      } else if (Object.keys(attackerWinsVisualSet).length > 0) {
        this.setAoeResultState(attackerCardId, "winner", "", {
          hideLabel: true,
        });
      } else {
        this.setAoeResultState(attackerCardId, "draw", "", {
          hideLabel: true,
        });
      }
      Object.keys(attackerWinsVisualSet).forEach(
        function (cid) {
          this.setAoeResultState(cid, "loser", _("lose"));
        }.bind(this)
      );
      Object.keys(defenderWinsSet).forEach(
        function (cid) {
          this.setAoeResultState(cid, "winner", _("win"));
        }.bind(this)
      );
      Object.keys(drawSet).forEach(
        function (cid) {
          this.setAoeResultState(cid, "draw", _("draw"));
        }.bind(this)
      );

      const ownerByCardId = {};
      dojo
        .query('.aoe-commit-item[data-card-kind="believer"]')
        .forEach(function (wrap) {
          const cardId = wrap.getAttribute("data-card-id");
          const ownerId = parseInt(
            wrap.getAttribute("data-owner-id") || "0",
            10
          );
          if (!cardId) return;
          if (String(cardId) === String(notif.args.attacker_card_id)) {
            ownerByCardId[String(cardId)] = parseInt(
              notif.args.attacker_owner,
              10
            );
          } else if (stolenSet[String(cardId)]) {
            ownerByCardId[String(cardId)] = parseInt(
              notif.args.attacker_owner,
              10
            );
          } else {
            ownerByCardId[String(cardId)] = ownerId;
          }
        });
      if (!isFinalStruggle) {
        this.mapAoeReturnSourcesForCurrentPlayer(ownerByCardId);
        this.runAfterCombatRevealGate(
          function () {
            this.animateAoeBelieversToTargets(ownerByCardId, {
              forceCloneFlight: true,
            });
            this.clearTransientArenaAfterAction(
              this.getUnifiedCardFlyMs() + 260
            );
          }.bind(this),
          revealDelayMs
        );
      } else {
        this.clearTransientArenaAfterAction(
          this.getCombatResultCleanupDelayMs() +
            this.getUnifiedCardFlyMs() +
            260
        );
      }
      if (!isFinalStruggle && notif.args.gain_by_player) {
        Object.keys(notif.args.gain_by_player).forEach(function (pid) {
          let countElem = dojo.byId("table_believer_count_" + pid);
          if (countElem) {
            countElem.innerHTML =
              parseInt(countElem.innerHTML) +
              parseInt(notif.args.gain_by_player[pid] || 0);
          }
        });
      }
      this.showMessage(
        isFinalStruggle
          ? dojo.string.substitute(
              _("Final Struggle Conspiracy by ${player_name} ends"),
              {
                player_name: notif.args.player_name,
              }
            )
          : dojo.string.substitute(
              _("Conspiracy by ${player_name} ends"),
              {
                player_name: notif.args.player_name,
              }
            ),
        "info"
      );
      if (isFinalStruggle && Array.isArray(notif.args.score_rows)) {
        const brief = notif.args.score_rows
          .map(function (row) {
            return (
              String(row.player_name || _("Player")) +
              ":" +
              String(parseInt(row.stolen || 0, 10))
            );
          })
          .join(" | ");
        if (brief) {
          this.showMessage(
            dojo.string.substitute(_("Final Struggle score - ${score_text}"), {
              score_text: brief,
            }),
            "info"
          );
        }
      }
      this.clearAoeCommitTransientState();
    },

    notif_finalStruggleStart: function (notif) {
      // Final Struggle does not apply Reverse Karma visuals.
      // Clear any previous-combat stack to prevent stale skill cards from showing.
      this.setReverseKarmaContext(0, 0, []);
      this.refreshCombatActionStacks();
      const mode = String((notif.args && notif.args.mode) || "");
      if (mode === "conspiracy") {
        this.showMessage(
          _("Final Struggle begins: Conspiracy cycle among tied contenders."),
          "info"
        );
        this.setTopInstruction(
          _(
            "Final Struggle (Conspiracy): contenders choose one Believer each round."
          )
        );
        return;
      }
      if (mode === "sect_war") {
        this.showMessage(
          _("Final Struggle begins: tied Sects enter final Faith War."),
          "info"
        );
        this.setTopInstruction(
          _(
            "Final Struggle (Sect War): each Sect Leader chooses a representative each round."
          )
        );
        return;
      }
      this.showMessage(
        _("Final Struggle begins between tied contenders."),
        "info"
      );
      this.setTopInstruction(
        _("Final Struggle: contenders choose one Believer to duel.")
      );
    },

    notif_finalInfiniteWarStarted: function (notif) {
      this.showMessage(
        _("Final War tied: Infinite War started with 3 random Believers each."),
        "info"
      );
      this.setTopInstruction(
        _("Infinite War: continue Final Struggle until one contender wins.")
      );
    },

    notif_finalStruggleConspiracyEnd: function (notif) {
      if (!notif || !notif.args) return;
      if (Array.isArray(notif.args.score_rows)) {
        const text = notif.args.score_rows
          .map(function (row) {
            return (
              String(row.player_name || _("Player")) +
              ":" +
              String(parseInt(row.stolen || 0, 10))
            );
          })
          .join(" | ");
        if (text) {
          this.showMessage(
            dojo.string.substitute(
              _("Final Struggle final score - ${score_text}"),
              {
                score_text: text,
              }
            ),
            "info"
          );
        }
      }
    },

    notif_faithWarStart: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      this.gamedatas.combat_context.war_type = 2;
      this.gamedatas.combat_context.war_attacker_id = parseInt(
        notif.args.player_id || 0,
        10
      );
      this.gamedatas.combat_context.war_defender_id = parseInt(
        notif.args.target_player_id || notif.args.target_id || 0,
        10
      );
      this.gamedatas.combat_context.war_zombie_owner_id = parseInt(
        notif.args.zombie_owner_id || 0,
        10
      );
      this.gamedatas.combat_context.war_zombie_snapshot_max_discard_arg =
        parseInt(notif.args.war_zombie_snapshot_max_discard_arg || 0, 10);
      this.renderGraveyardPreview();
      // Keep Reverse Karma status if it was already confirmed in pre-combat prompt.
      this.setDuelLogMode("war");
      this.deferFaithWarResultClearOnNextAction = false;
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.resetFaithWarLog();
      this.faithWarAssignNoticeShown = false;
      this.clearFaithWarRoundCards();
      const warLeftId = parseInt(notif.args.player_id || 0, 10);
      const warRightId = parseInt(
        notif.args.target_player_id || notif.args.target_id || 0,
        10
      );
      this.clearFaithWarArena(
        this.buildFaithWarBannerTitle(
          this.getCombatBannerSectLabelByPlayer(warLeftId, notif.args.player_name),
          warLeftId,
          this.getCombatBannerSectLabelByPlayer(warRightId, notif.args.target_name),
          warRightId,
          _("Faith War")
        )
      );
      this.setDuelActionCard("faith_war", notif.args.player_id, "Faith War");
      if (
        parseInt(notif.args.zombie_owner_id || 0, 10) ===
        parseInt(this.player_id || 0, 10)
      ) {
        const graveCount = parseInt(notif.args.graveyard_count || 0, 10);
        if (graveCount > 0) {
          this.showMessage(
            _(
              "Zombie Army is active in this Faith War. You can choose from hand or graveyard."
            ),
            "info"
          );
        }
      }
    },

    notif_faithWarRepresentativePhase: function (notif) {
      // Keep this silent to avoid repetitive war-round spam.
    },

    notif_faithWarRepresentativeChosen: function (notif) {
      // Silent by request: assignment summary is shown on board.
    },

    notif_faithWarAssignedToYou: function (notif) {
      // Only show once per war (first assignment), not every round.
      if (this.faithWarAssignNoticeShown) return;
      this.faithWarAssignNoticeShown = true;
      const assignedText = dojo.string.substitute(
        _(
          "You have been assigned to this war by ${leader_name}. Choose one Believer and click Confirm."
        ),
        {
          leader_name: notif.args.leader_name,
        }
      );
      this.showMessage(assignedText, "info");
      this.setTopInstruction(
        "You have been assigned to this war. Choose one Believer and click Confirm."
      );
    },

    notif_faithWarRound: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      const isFinalStruggle =
        parseInt((notif.args && notif.args.final_struggle) || 0, 10) === 1;
      if (isFinalStruggle) {
        this.gamedatas.combat_context.war_type = 10;
      }
      this.gamedatas.combat_context.war_rep_attacker_id = parseInt(
        notif.args.attacker_rep_id || 0,
        10
      );
      this.gamedatas.combat_context.war_rep_defender_id = parseInt(
        notif.args.defender_rep_id || 0,
        10
      );
      this.gamedatas.combat_context.war_zombie_owner_id = parseInt(
        notif.args.zombie_owner_id || 0,
        10
      );
      this.gamedatas.combat_context.war_zombie_snapshot_max_discard_arg =
        parseInt(notif.args.war_zombie_snapshot_max_discard_arg || 0, 10);
      this.renderGraveyardPreview();
      // Keep Reverse Karma display persistent across the whole War once activated.
      this.setDuelLogMode("war");
      this.hasCommittedDuelBelieverThisRound = false;
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.faithWarRoundNo = parseInt(
        notif.args.round || this.faithWarRoundNo + 1
      );
      const applyWarRoundSetup = function () {
        this.clearFaithWarRoundCards();
        const warRoundLeftId = parseInt(
          notif.args.attacker_rep_id || notif.args.attacker_id || 0,
          10
        );
        const warRoundRightId = parseInt(
          notif.args.defender_rep_id || notif.args.defender_id || 0,
          10
        );
        this.clearFaithWarArena(
          this.buildFaithWarBannerTitle(
            this.getCombatBannerSectLabelByPlayer(
              warRoundLeftId,
              notif.args.attacker_rep_name || notif.args.attacker_name
            ),
            warRoundLeftId,
            this.getCombatBannerSectLabelByPlayer(
              warRoundRightId,
              notif.args.defender_rep_name || notif.args.defender_name
            ),
            warRoundRightId,
            isFinalStruggle ? _("Final Struggle:") : ""
          )
        );
        this.setDuelParticipants(
          notif.args.attacker_rep_id,
          notif.args.defender_rep_id,
          notif.args.attacker_rep_name,
          notif.args.defender_rep_name
        );
        const warActionOwnerId = parseInt(
          (this.gamedatas.combat_context &&
            this.gamedatas.combat_context.war_attacker_id) ||
            this.currentFaithWarActionOwnerId ||
            notif.args.attacker_id ||
            notif.args.attacker_rep_id ||
            0,
          10
        );
        this.setDuelActionCard(
          "faith_war",
          warActionOwnerId,
          isFinalStruggle ? "Final Struggle" : "Faith War"
        );
        if (isFinalStruggle) {
          this.showMessage(_("Final Struggle continues."), "info");
        }
        if (this.getCurrentStateName() === "faithWarDuel") {
          this.onUpdateActionButtons(
            "faithWarDuel",
            (this.gamedatas &&
              this.gamedatas.gamestate &&
              this.gamedatas.gamestate.args) ||
              {}
          );
        }
      }.bind(this);
      if (this.pendingDuelRoundSetupTimeout) {
        clearTimeout(this.pendingDuelRoundSetupTimeout);
        this.pendingDuelRoundSetupTimeout = null;
      }
      const setupDelayMs = this.getDuelRoundSetupDelayMs();
      if (setupDelayMs > 0) {
        this.pendingDuelRoundSetupTimeout = setTimeout(
          function () {
            this.pendingDuelRoundSetupTimeout = null;
            applyWarRoundSetup();
          }.bind(this),
          setupDelayMs
        );
      } else {
        applyWarRoundSetup();
      }
    },

    notif_faithWarCardPlayed: function (notif) {
      this.syncDuelCommittedBeliever(notif.args, "faithWarDuel");
    },

    notif_duelResult: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      const duelResultType = String(notif.args.result_type || "draw");
      const stateName = String(this.getCurrentStateName() || "");
      const isDuelLifecycleState =
        stateName === "faithWarDuel" ||
        stateName === "faithDebateDuel" ||
        stateName === "resolveDuel" ||
        stateName === "resolveFaithDebateDuel";
      const canPreservePreselection =
        isDuelLifecycleState &&
        !this.hasCommittedDuelBelieverThisRound;
      if (canPreservePreselection) {
        this.rememberPreferredDuelBelieverSelection();
      }
      this.mapWarSurvivorReturnCardSourceForCurrentPlayer(notif.args || {});
      if (typeof notif.args.reverse_karma_active !== "undefined") {
        this.setReverseKarmaContext(
          parseInt(notif.args.reverse_karma_active || 0, 10),
          parseInt(notif.args.reverse_karma_owner_id || 0, 10),
          notif.args.reverse_karma_stack_owner_ids || []
        );
      }
      this.refreshCombatActionStacks();
      if (!canPreservePreselection) {
        this.playerBelieverCards.unselectAll();
      }
      // Keep counts strictly server-authoritative during ongoing Faith War.
      // Survivors are parked in warused and only return at war end.

      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, notif.args.graveyard_count);
      } else if (notif.args.dead_count) {
        this.updateGraveyardCount(notif.args.dead_count);
      }
      const hasGraveyardSnapshot =
        typeof notif.args.graveyard_cards !== "undefined";
      if (hasGraveyardSnapshot) {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }

      const deadCards = [];
      const attackerFromGrave =
        parseInt(notif.args.attacker_from_graveyard || 0, 10) === 1;
      const defenderFromGrave =
        parseInt(notif.args.defender_from_graveyard || 0, 10) === 1;
      if (duelResultType === "attacker" && notif.args.card_b) {
        if (!defenderFromGrave) deadCards.push(notif.args.card_b);
      } else if (duelResultType === "defender" && notif.args.card_a) {
        if (!attackerFromGrave) deadCards.push(notif.args.card_a);
      } else if (duelResultType === "draw") {
        if (notif.args.card_b && !defenderFromGrave)
          deadCards.push(notif.args.card_b);
        if (notif.args.card_a && !attackerFromGrave)
          deadCards.push(notif.args.card_a);
      }
      if (!hasGraveyardSnapshot) {
        this.pushGraveyardCards(deadCards);
      }
      const duelVisualInfo = this.applyDuelResultVisualAndLog(
        notif.args,
        "war",
        parseInt(notif.args.result_bonus || 0, 10) === 1
      );

      const deadPlayerIds = [];
      if (duelResultType === "attacker") {
        if (!defenderFromGrave) deadPlayerIds.push(notif.args.defender_id);
      } else if (duelResultType === "defender") {
        if (!attackerFromGrave) deadPlayerIds.push(notif.args.attacker_id);
      } else {
        if (!attackerFromGrave) deadPlayerIds.push(notif.args.attacker_id);
        if (!defenderFromGrave) deadPlayerIds.push(notif.args.defender_id);
      }

      const revealDelay =
        parseInt((duelVisualInfo && duelVisualInfo.revealDurationMs) || 0, 10) +
        this.getUnifiedRevealHoldMs();
      this.setCombatRevealGate(revealDelay + this.getCombatRevealLingerMs());
      const duelCleanupDelayMs =
        revealDelay +
        this.getCombatRevealLingerMs() +
        this.getUnifiedCardFlyMs() +
        160;
      this.scheduleDuelRoundCleanup(duelCleanupDelayMs);
      setTimeout(
        function () {
          const gateDelay = this.getCombatRevealGateDelayMs();
          if (gateDelay > 0) {
            setTimeout(
              function () {
                this.animateFaithWarDeadCardsToGraveyard(deadPlayerIds);
                if (canPreservePreselection) {
                  this.tryRestorePreferredDuelBelieverSelection("faithWarDuel");
                }
              }.bind(this),
              gateDelay
            );
            return;
          }
          this.animateFaithWarDeadCardsToGraveyard(deadPlayerIds);
          if (canPreservePreselection) {
            this.tryRestorePreferredDuelBelieverSelection("faithWarDuel");
          }
        }.bind(this),
        revealDelay + this.getCombatRevealLingerMs()
      );

      // Keep central war arena text-clean: no extra winner banner here.
    },

    notif_duelBonus: function (notif) {
      let message = dojo.string.substitute(
        _("${player_name} earned a War Bonus"),
        {
          player_name: notif.args.player_name,
        }
      );
      if (parseInt(notif.args.deck_empty || 0, 10) === 1) {
        message +=
          " - " + _("Believer deck is empty, so no bonus card is drawn");
      } else if (notif.args.delayed_until_war_end) {
        message += " - " + _("it will be added after the war ends");
      }
      this.showMessage(message, "info");
      this.markLatestFaithWarLogBonus();

      // Keep central war arena text-clean: no bonus banner here.
    },

    notif_faithWarEnd: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      const preserveReplayTrace = this.isReplaySessionActive();
      this.gamedatas.combat_context.war_type = 0;
      this.gamedatas.combat_context.war_zombie_owner_id = 0;
      this.gamedatas.combat_context.war_zombie_snapshot_max_discard_arg = 0;
      this.gamedatas.combat_context.war_rep_attacker_id = 0;
      this.gamedatas.combat_context.war_rep_defender_id = 0;
      this.renderGraveyardPreview();
      this.setReverseKarmaContext(0, 0);
      if (this.pendingDuelRoundSetupTimeout) {
        clearTimeout(this.pendingDuelRoundSetupTimeout);
        this.pendingDuelRoundSetupTimeout = null;
      }
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.clearZombieGraveSelection();
      this.closeZombieGravePickerModal();
      this.deferFaithWarResultClearOnNextAction = false;
      this.faithWarAssignNoticeShown = false;
      let summary = _("Faith War Ended");
      if (notif.args.pending_bonus_summary) {
        let bonusParts = [];
        Object.keys(notif.args.pending_bonus_summary).forEach(
          function (playerId) {
            const bonusCount = notif.args.pending_bonus_summary[playerId];
            if (!bonusCount) return;
            const playerName = this.gamedatas.players[playerId]
              ? this.gamedatas.players[playerId].name
              : _("Player");
            bonusParts.push(playerName + ": +" + bonusCount);
          }.bind(this)
        );
        if (bonusParts.length) {
          summary += " (" + bonusParts.join(", ") + ")";
        }
      }
      this.runAfterCombatRevealGate(
        function () {
          this.moveDuelActionCardToDiscard();
          this.clearFaithWarRoundCards();
          this.clearFaithWarArena(
            '<div class="faith-war-banner">' + summary + "</div>"
          );
          if (preserveReplayTrace) {
            this.renderFaithWarLog();
          } else {
            this.resetFaithWarLog();
            this.clearTransientArenaAfterAction(this.getUnifiedBannerClearDelayMs());
          }
        }.bind(this)
      );
      dojo.removeClass("mybelievercards", "highlight_stock");
    },

    notif_publicCountsSync: function (notif) {
      const payload = (notif && notif.args) || {};
      const applyPayload = function (args) {
        const actionCounts = args.action_counts || {};
        const believerCounts = args.believer_counts || {};
        if (typeof args.skill_protection !== "undefined") {
          this.setSkillProtectionSnapshot(args.skill_protection || {});
        }

        Object.keys(actionCounts).forEach(function (pid) {
          const node = dojo.byId("table_action_count_" + pid);
          if (node) {
            node.innerHTML = String(parseInt(actionCounts[pid] || 0, 10));
          }
        });
        Object.keys(believerCounts).forEach(function (pid) {
          const node = dojo.byId("table_believer_count_" + pid);
          if (node) {
            node.innerHTML = String(parseInt(believerCounts[pid] || 0, 10));
          }
        });

        const actionDeck = dojo.byId("action_deck_count");
        if (actionDeck && typeof args.action_deck_count !== "undefined") {
          actionDeck.innerHTML = String(
            parseInt(args.action_deck_count || 0, 10)
          );
        }
        const believerDeck = dojo.byId("believer_deck_count");
        if (believerDeck && typeof args.believer_deck_count !== "undefined") {
          believerDeck.innerHTML = String(
            parseInt(args.believer_deck_count || 0, 10)
          );
        }
        if (typeof args.graveyard_cards !== "undefined") {
          this.setGraveyardCardsSnapshot(args.graveyard_cards);
        }
        if (typeof args.graveyard_count !== "undefined") {
          this.updateGraveyardCount(0, parseInt(args.graveyard_count || 0, 10));
        } else if (typeof args.graveyard_cards !== "undefined") {
          this.renderGraveyardPreview();
        }
      }.bind(this);

      const revealGateDelay = Math.max(
        0,
        parseInt(this.getCombatRevealGateDelayMs() || 0, 10)
      );
      if (revealGateDelay > 0) {
        this.pendingPublicCountsSyncPayload = payload;
        if (this.pendingPublicCountsSyncTimeout) {
          clearTimeout(this.pendingPublicCountsSyncTimeout);
          this.pendingPublicCountsSyncTimeout = null;
        }
        const waitMs =
          revealGateDelay +
          this.getUnifiedCardFlyMs() +
          this.getUnifiedCardFlightStaggerMs();
        this.pendingPublicCountsSyncTimeout = setTimeout(
          function () {
            this.pendingPublicCountsSyncTimeout = null;
            const delayedPayload = this.pendingPublicCountsSyncPayload || {};
            this.pendingPublicCountsSyncPayload = null;
            applyPayload(delayedPayload);
          }.bind(this),
          waitMs
        );
        return;
      }

      applyPayload(payload);
    },
});

export class Game {
  constructor(bga) {
    const game = new LegacyGame();
    game.bga = bga || game.bga || null;
    game.legacyEntryLoaded = true;
    game.legacyCreated = true;
    game.legacyCreateError = "";
    game.legacySetupOk = false;
    game.legacySetupError = "";
    game.legacyEnterOk = false;
    game.legacyEnterError = "";
    game.legacyLeaveOk = false;
    game.legacyLeaveError = "";
    game.legacyButtonsOk = false;
    game.legacyButtonsError = "";
    game.lastEnteredState = "";
    game.lastButtonsState = "";

    game.syncLegacyContext = function () {
      const bgaFallbacks = this.bga || {};
      const globalFallbacks =
        typeof globalThis !== "undefined" && globalThis
          ? globalThis
          : typeof window !== "undefined" && window
          ? window
          : {};
      const preferredFields = [
        "bga",
        "gamedatas",
        "player_id",
        "table_id",
        "game_name",
        "notifqueue",
        "scoreCtrl",
        "isSpectator",
        "is_spectator",
        "metasiteurl",
        "gameinterface_tpl",
        "page",
        "connections",
        "tooltips",
        "lock",
        "serverreply",
        "player_no",
        "current_player_id",
        "curstate",
        "instantaneousMode",
        "default_viewport",
        "interface_min_width",
      ];

      const hydrateIfMissing = function (target, fieldName, value) {
        if (!target) {
          return;
        }
        if (typeof value === "undefined" || value === null) {
          return;
        }
        if (
          typeof target[fieldName] === "undefined" ||
          target[fieldName] === null ||
          target[fieldName] === ""
        ) {
          target[fieldName] = value;
        }
      };

      preferredFields.forEach(
        function (fieldName) {
          hydrateIfMissing(this, fieldName, bgaFallbacks[fieldName]);
        }.bind(this)
      );

      hydrateIfMissing(this, "player_id", globalFallbacks.g_player_id);
      hydrateIfMissing(this, "table_id", globalFallbacks.g_gametable_id);
      hydrateIfMissing(
        this,
        "player_id",
        globalFallbacks.gameui && globalFallbacks.gameui.player_id
      );
      hydrateIfMissing(
        this,
        "table_id",
        globalFallbacks.gameui && globalFallbacks.gameui.table_id
      );

      Object.keys(bgaFallbacks).forEach(
        function (fieldName) {
          hydrateIfMissing(this, fieldName, bgaFallbacks[fieldName]);
        }.bind(this)
      );
    };

    game.normalizeLegacyStateArgs = function (args) {
      if (!args || typeof args !== "object") {
        return args;
      }
      if (args.args && typeof args.args === "object") {
        return Object.assign({}, args, args.args);
      }
      return args;
    };

    game.syncLegacyStateSnapshot = function (stateName, args) {
      const normalizedArgs = this.normalizeLegacyStateArgs(args) || {};
      if (!this.gamedatas) {
        this.gamedatas = {};
      }
      if (!this.gamedatas.gamestate) {
        this.gamedatas.gamestate = {};
      }
      this.gamedatas.gamestate.name = stateName || this.gamedatas.gamestate.name || "";
      this.gamedatas.gamestate.args = Object.assign(
        {},
        this.gamedatas.gamestate.args || {},
        normalizedArgs
      );
      if (typeof normalizedArgs.active_player_id !== "undefined") {
        this.gamedatas.gamestate.active_player = normalizedArgs.active_player_id;
      }
      if (typeof normalizedArgs.possibleactions !== "undefined") {
        this.gamedatas.gamestate.possibleactions = normalizedArgs.possibleactions;
      }
      return normalizedArgs;
    };

    const baseSetup = typeof game.setup === "function" ? game.setup.bind(game) : null;
    const baseOnEnteringState =
      typeof game.onEnteringState === "function"
        ? game.onEnteringState.bind(game)
        : null;
    const baseOnLeavingState =
      typeof game.onLeavingState === "function"
        ? game.onLeavingState.bind(game)
        : null;
    const baseOnUpdateActionButtons =
      typeof game.onUpdateActionButtons === "function"
        ? game.onUpdateActionButtons.bind(game)
        : null;

    game.setup = function (gamedatas) {
      this.gamedatas = gamedatas;
      try {
        this.syncLegacyContext();
        if (baseSetup) {
          baseSetup(gamedatas);
        }
        this.syncLegacyContext();
        this.legacySetupOk = true;
      } catch (error) {
        this.legacySetupError = error && error.message ? error.message : String(error);
        throw error;
      }
    };

    game.onEnteringState = function (stateName, args) {
      this.lastEnteredState = stateName || "";
      const normalizedArgs = this.syncLegacyStateSnapshot(stateName, args);
      try {
        this.syncLegacyContext();
        if (baseOnEnteringState) {
          baseOnEnteringState(stateName, normalizedArgs);
        }
        this.syncLegacyContext();
        if (typeof this.syncActionSelectionModeToCurrentState === "function") {
          this.syncActionSelectionModeToCurrentState();
        }
        this.legacyEnterOk = true;
      } catch (error) {
        this.legacyEnterError = error && error.message ? error.message : String(error);
        throw error;
      }
    };

    game.onLeavingState = function (stateName) {
      this.syncLegacyStateSnapshot(stateName, {});
      try {
        this.syncLegacyContext();
        if (baseOnLeavingState) {
          baseOnLeavingState(stateName);
        }
        this.syncLegacyContext();
        this.legacyLeaveOk = true;
      } catch (error) {
        this.legacyLeaveError = error && error.message ? error.message : String(error);
        throw error;
      }
    };

    game.onUpdateActionButtons = function (stateName, args) {
      this.lastButtonsState = stateName || "";
      const normalizedArgs = this.syncLegacyStateSnapshot(stateName, args);
      try {
        this.syncLegacyContext();
        if (baseOnUpdateActionButtons) {
          baseOnUpdateActionButtons(stateName, normalizedArgs);
        }
        this.syncLegacyContext();
        if (typeof this.syncActionSelectionModeToCurrentState === "function") {
          this.syncActionSelectionModeToCurrentState();
        }
        this.legacyButtonsOk = true;
      } catch (error) {
        this.legacyButtonsError = error && error.message ? error.message : String(error);
        throw error;
      }
    };

    return game;
  }
}
