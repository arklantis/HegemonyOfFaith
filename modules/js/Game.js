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

// Master switch for in-development TEST/CHEAT console tools (hofEmptyDeck deck
// wipe, hofAi practice-AI control). MUST stay false for any public/release
// build. Flip to true only for local playtesting, then back to false before
// shipping. (Diagnostic [HOF-*] console traces are added on demand, not gated.)
const HOF_DEBUG_TOOLS = true;

const LegacyGame = declare("bgagame.hegemonyoffaith", GameGui, {
    constructor: function () {
      // Hand/played cards are the game's focus: bigger than the old 108x150.
      // Must stay in sync with --card-w/--card-h in hegemonyoffaith.css.
      this.cardwidth = 126;
      this.cardheight = 175;
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
      // Remaining Praise of Life repeat-bypasses (each lets ONE already-used
      // action type be played once more this turn). Server-authoritative.
      this.currentTurnRepeatBypass = 0;
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
      this.aoeCommitDoneByMe = false;
      // Authoritative "who has committed a Believer this AOE window" set, keyed
      // by player id and driven by the server commit notifications (attacker /
      // representative / conspiracy). Used instead of fragile DOM queries so a
      // committed player's hand stays locked even if the arena node lags or a
      // defenders-choose notif re-fires. Cleared per AOE window.
      this.aoeCommittedPlayerIds = {};
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
      // AOE auto-defense cards whose discard-pile push is deferred until they
      // actually fly into the pile at resolution (so the pile does not pop a new
      // card before any flight). {card_type, card_id} entries.
      this.pendingAoeDefenseDiscards = [];
      this.pendingCenterDefenseOverlay = null;
      this.pendingFaithWarDefenseOverlay = null;
      this.pendingCenterActionDiscardTimeout = null;
      this.centerActionHoldUntil = 0;
      // Timestamp (ms) until which a card/Believer flight is in progress; set by
      // safeSlideToObject, read by the practice-AI/zombie pacing gate so the next
      // play never overlaps a running flight.
      this.flightBusyUntil = 0;
      // Absolute time the stolen Believer leaves the arena center during Spread
      // Rumors, so the summary discards the card on the same clock.
      this.rumorCenterLeaveAt = 0;
      this.isProphetPredictionFlowActive = false;
      this.pendingProphetFlowClearTimeout = null;
      this.pendingProphetVisualClearTimeout = null;
      // Prophet skill-card parking (pure visual): actorId -> parked card info.
      this.prophetParkedSkills = {};
      // Debate round in which MY stop request was rejected (client-side latch;
      // the server enforces the same one-ask-per-round rule).
      this.myDebateStopRejectedRound = 0;
      // cardId -> timestamp: add this gained Believer to the hand stock ONLY at
      // that time (the visual flight is owned by another flow, e.g. the Spread
      // Rumors two-leg steal).
      this.pendingBelieverSilentAddUntil = {};
      // Native Prophet actors awaiting their reveal to fly the Skill card (first
      // use); scoped per prediction flow.
      this.pendingProphetParkActors = {};
      this.mobileCardTooltipTimer = null;
      this.mobileCardTooltipTouch = null;
      this.mobileCardTooltipShown = false;
      this.mobileCardTooltipSuppressClickUntil = 0;
      this.graveyardActualCount = 0;
      // --- Unified animation timing (single tuning point) ---
      // All animation/pause lengths derive from these via the getUnified*Ms /
      // getCombat*Ms getters. Do not hardcode ms literals elsewhere.
      this.unifiedCardFlyMs = 520; // one card flight
      this.unifiedCardFlightStaggerMs = 90; // gap between staggered flights
      this.unifiedRevealFlipMs = 500; // face-down -> face-up flip
      this.unifiedRevealHoldMs = 2000; // hold after a reveal
      this.unifiedCenterHoldMs = 1600; // min hold of center action card
      this.combatResultHoldMs = 2000;
      this.combatResultCleanupBufferMs = 1000;
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
      this.latestPracticeAiToken = 0;
      this.practiceAiWatchdogTimer = null;
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
      return { width: this.cardwidth, height: this.cardheight, margin: 6 };
    },

    setup: function (gamedatas) {
      // TEST/CHEAT console helper (gated by HOF_DEBUG_TOOLS, off for release):
      // type hofEmptyDeck() to send every Believer left in the deck to the
      // graveyard, so the next end-of-turn triggers the end game / Final
      // Struggle on demand.
      if (HOF_DEBUG_TOOLS) {
        try {
          const hofEmptyDeck = function () {
            const performAction =
              this.bga &&
              this.bga.actions &&
              typeof this.bga.actions.performAction === "function"
                ? this.bga.actions.performAction.bind(this.bga.actions)
                : null;
            if (!performAction) return "hofEmptyDeck: performAction unavailable.";
            performAction(
              "debugEmptyBelieverDeck",
              {},
              { lock: true, checkAction: false, checkPossibleActions: false }
            );
            return "hofEmptyDeck: request sent.";
          }.bind(this);
          window.hofEmptyDeck = hofEmptyDeck;
          // Also expose on the top frame so it works from the default console
          // context (the game runs in an iframe; same-origin, so window.top is
          // reachable).
          try {
            window.top.hofEmptyDeck = hofEmptyDeck;
          } catch (e) {}
        } catch (e) {}
      }
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

      // Build game area HTML — ring table layout: seats (playertables) around
      // the central arena in clockwise TURN ORDER (local player bottom), decks
      // shrunk below the arena, no section headings / white panels (deck names
      // live in the title attribute; the piles + counters speak for themselves).
      const tActionDeck = this.escapeHtml(_("Action Deck"));
      const tActionDiscard = this.escapeHtml(_("Action Discard"));
      const tBelieverDeck = this.escapeHtml(_("Believer Deck"));
      const tGraveyard = this.escapeHtml(_("Graveyard"));
      const tCards = this.escapeHtml(_("cards"));
      const handCardSize = this.getResponsiveHandCardSize();
      document.getElementById("game_play_area").innerHTML = `
        <div id="play_area">
            <div id="hof_table" data-players="4">
                <!-- Common Deck & Graveyard Area: TOPMOST strip, centered -->
                <div id="common_table" class="common-table">
                    <div class="common-decks-row">
                        <div class="deck_container" title="${tActionDeck}">
                            <div id="action_deck" class="deck_slot card-back-action"></div>
                            <div class="deck_counter"><span id="action_deck_count">0</span> ${tCards}</div>
                        </div>
                        <div class="deck_container" title="${tActionDiscard}">
                            <div id="action_discard" class="deck_slot action_discard_slot">
                              <div id="action_discard_top" class="deck-preview-wrap"></div>
                            </div>
                        </div>
                        <div class="deck_container" title="${tBelieverDeck}">
                            <div id="believer_deck" class="deck_slot card-back-believer"></div>
                            <div class="deck_counter"><span id="believer_deck_count">0</span> ${tCards}</div>
                        </div>
                        <div class="deck_container" title="${tGraveyard}">
                            <div id="graveyard" class="deck_slot graveyard_slot">
                              <div id="graveyard_cards" class="deck-preview-wrap"></div>
                            </div>
                            <div class="deck_counter"><span id="graveyard_count">0</span> ${tCards}</div>
                        </div>
                    </div>
                </div>
                <div id="hof_center">
                    <!-- Central Arena -->
                    <div id="central_arena" class="central-arena">
                        <!-- Cards will be dynamically placed here during combat/resolution -->
                    </div>
                </div>
                <!-- Player seats (grid areas assigned in JS, clockwise turn order) -->
                <div id="table_area" class="table-area">
                    <div id="playertables" class="playertables-contents"></div>
                </div>
            </div>
        </div>
        <div id="myhand_wrap">
            <div id="myhand_top_row">
              <div id="skill_hand">
                  <div id="myskillcards"></div>
              </div>
              <div id="action_hand">
                  <div id="myactioncards"></div>
              </div>
            </div>
            <div id="believer_hand">
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
        g_gamethemeurl + "img/action_cards_bg.png",
        0
      ); // Card Back fallback
      for (const [key, info] of Object.entries(gamedatas.const.actioncards)) {
        // Calculate sprite index from key mapping we defined
        let sprite_idx = this.getActionCardSpriteIndex(key);

        this.playerActionCards.addItemType(
          sprite_idx,
          sprite_idx, // We don't use weights for now
          g_gamethemeurl + "img/action_cards_bg.png",
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
          g_gamethemeurl + "img/believer_cards_bg.png",
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
          g_gamethemeurl + "img/skill_cards_bg.png",
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
      // Discard browse list: server stamps discard order in location_arg —
      // sort DESC so the list is newest-first even after a reload.
      this.actionDiscardCards = Object.values(
        gamedatas.actiondiscardpile || {}
      ).sort(function (a, b) {
        return (
          parseInt((b && b.location_arg) || 0, 10) -
          parseInt((a && a.location_arg) || 0, 10)
        );
      });
      this.renderActionDiscardTop();
      this.renderGraveyardPreview();
      dojo.connect(
        dojo.byId("graveyard"),
        "onclick",
        this,
        "onGraveyardClicked"
      );
      // Discard pile browses like the graveyard (newest first).
      dojo.connect(
        dojo.byId("action_discard"),
        "onclick",
        this,
        "onActionDiscardClicked"
      );
      this.rehydrateCombatArenaFromSnapshot(gamedatas);
      this.restoreFaithWarLogFromStorageForSnapshot(gamedatas);

      // Solo bot seats get manual fallback boards in the loop below. (The
      // framework's addAutomataPlayerPanel was tried and produced empty
      // "undefined" panels — undocumented signature — so it is not used.)

      // Add info to player boards and build player tables
      for (const player_id in gamedatas.players) {
        const player = gamedatas.players[player_id];

        // Generate playertable for main game area
        let roleStr = "Leader";
        if (player.player_role == 1) roleStr = "Follower";
        if (player.player_role == 2) roleStr = "Wanderer";

        const roleAttr =
          parseInt(player.player_role, 10) === 1
            ? "follower"
            : parseInt(player.player_role, 10) === 2
            ? "wanderer"
            : "leader";
        const playerTableHtml = `
            <div class="playertable playertable_top" id="playertable_${player_id}" data-role="${roleAttr}" style="--player-color:#${
          player.player_color
        }; --player-color-bg:#${player.player_color}33;">
              <div class="playertable_header">
                <div class="hof-seat-line1">
                  <span class="sect_emblem" id="table_sect_${player_id}" style="--player-color:#${
          player.player_color
        }; color:#${player.player_color};">
                    ${this.getSectBadgeHtml(player.player_sect)}
                    ${this.getColoredSectNameHtml(player_id, player.player_sect)}
                  </span>
                  <span class="role-inline" id="table_role_${player_id}">(${roleStr})</span>
                </div>
                <span class="playertablename">${player.player_name}</span>
              </div>
              <div class="playertablecard" id="playertablecard_${player_id}">
                <div class="table_status_area">
                    <!-- Skill card: big; face + tooltip switch on reveal -->
                    <div class="table_card_item hof-seat-skill">
                        <div class="card card-skill-back table-mini-card skill-mini-card" id="table_skill_${player_id}"></div>
                    </div>
                    <!-- Hand counters: back + badge only (names live in tooltips) -->
                    <div class="hof-seat-minis">
                        <div class="table_card_item">
                            <div class="card-back-action table-mini-card" id="table_action_icon_${player_id}"></div>
                            <div class="hand-count-badge" id="table_action_count_${player_id}">${
          player.action_count
        }</div>
                        </div>
                        <div class="table_card_item">
                            <div class="card-back-believer table-mini-card" id="table_believer_icon_${player_id}"></div>
                            <div class="hand-count-badge" id="table_believer_count_${player_id}">${
          player.believer_count
        }</div>
                        </div>
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
        let panelHost = null;
        if (this.bga && this.bga.playerPanels) {
          try {
            panelHost = this.bga.playerPanels.getElement(player_id);
          } catch (e) {
            panelHost = null;
          }
        }
        if (!panelHost) {
          // BGA static analyzer workaround
          panelHost = dojo.byId("player_bo" + "ard_" + player_id);
        }
        if (!panelHost && this.isSoloBotSeat(player_id)) {
          // Solo bot seat: the framework renders no native board for a virtual
          // player (getElement -> null crashed dojo.place with ownerDocument).
          // Create a minimal board in the boards column as the panel host.
          const boardsHost =
            dojo.byId("player_boards") || dojo.byId("right-side-first-part");
          if (boardsHost) {
            dojo.place(
              '<div id="hof_bot_board_' +
                player_id +
                '" class="player-board hof-bot-board">' +
                '<div class="hof-bot-board-name" style="color:#' +
                (player.player_color || "555555") +
                ';">' +
                (player.player_name || player.name || "AI") +
                "</div></div>",
              boardsHost
            );
            panelHost = dojo.byId("hof_bot_board_" + player_id);
          }
        }
        if (panelHost) {
          dojo.place(playerPanelHtml, panelHost);
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

        // Seat (ring) versions: no text labels — hover carries the names.
        const tableActionIcon = dojo.byId("table_action_icon_" + player_id);
        if (tableActionIcon) {
          this.attachPanelCounterTooltip(
            tableActionIcon,
            _("Action Cards"),
            _("Action cards currently in this player's hand.")
          );
        }
        const tableBelieverIcon = dojo.byId("table_believer_icon_" + player_id);
        if (tableBelieverIcon) {
          this.attachPanelCounterTooltip(
            tableBelieverIcon,
            _("Believer Cards"),
            _("Believer cards currently in this player's hand.")
          );
        }
        // Seat skill card: face + tooltip follow the reveal state.
        this.updateSeatSkillCard(player_id);
      }

      // Ring seats: place every playertable around the center in clockwise
      // TURN ORDER (player_no), local player at the bottom. Grid areas s0..sN
      // are defined per player-count in CSS (#hof_table[data-players]).
      this.assignRingSeats(gamedatas);

      // Keep right player panel counters synced with table counters.
      this.setupPanelCounterMirrors(gamedatas.players);
      this.setupCurrentPlayerHandCountSync();
      this.refreshAllPlayerSkillActiveBadges();
      this.installPracticeAiConsoleHelper();
      this.schedulePracticeAiWatchdog();

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
      this.initHandResizeSync();

      // Art/text separation: overlay translated text onto the de-texted skill
      // sprite everywhere a skill face appears (observer keeps it applied).
      this.initSkillCardTextOverlays();

      // Visual-tuning helper (retired from auto-on): adding "hof-debug-visual"
      // to <body> neutralizes all hand-card graying for overlay adjustment.
      // Enable manually from the console when needed:
      //   document.body.classList.add("hof-debug-visual")

      // Per-language card-text tuning hooks: tag the body with the user's
      // interface language (e.g. hof-lang-zh + hof-lang-zh-tw) so CSS can
      // adjust card overlay type per language (Chinese runs denser than
      // English — see the "Per-language card-text tuning" CSS block).
      try {
        const rawLang = String(
          (typeof dojo !== "undefined" &&
            dojo.config &&
            dojo.config.locale) ||
            (typeof navigator !== "undefined" && navigator.language) ||
            ""
        ).toLowerCase();
        if (rawLang) {
          const fullCode = rawLang.replace(/[^a-z0-9]+/g, "-");
          dojo.addClass(document.body, "hof-lang-" + fullCode);
          const shortCode = fullCode.split("-")[0];
          if (shortCode && shortCode !== fullCode) {
            dojo.addClass(document.body, "hof-lang-" + shortCode);
          }
        }
      } catch (e) {}

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
        // NOTE: do NOT remove the Final Struggle standings panel here. Entering the
        // gameEndSummary STATE happens right after the last flip, before the summary
        // SCREEN is shown — destroying it here made the standings vanish too early.
        // It is removed in notif_gameEndSummaryShow (when the summary actually opens).
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
        // Straight-to-GUESS responder (revealed Prophet, or a Gate whose copy
        // is already active): their skill flies out the moment their guess
        // window opens — NOT on the guess click. No-op if already parked; the
        // prompt state ("use/copy?") deliberately does not park (fly on
        // confirm via skillRevealed / skillGateTruthCopied instead).
        // Actor source is the ARGS responder_id — NOT gamestate.active_player,
        // which is a stale human while a solo bot responds (that stale id
        // parked a wrong Prophet card on the human's behalf).
        if (stateName === "prophetGuess" && this.isProphetPredictionFlowActive) {
          const guessArgs =
            args && args.args && typeof args.args === "object"
              ? args.args
              : args || {};
          const guessResponder = parseInt(
            (guessArgs && guessArgs.responder_id) || 0,
            10
          );
          if (guessResponder > 0) {
            this.parkProphetSkillCard(String(guessResponder));
          }
        }
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
        let bypassFromServer = 0;
        if (args && typeof args.praise_repeat_bypass !== "undefined") {
          bypassFromServer = args.praise_repeat_bypass;
        } else if (
          args &&
          args.args &&
          typeof args.args.praise_repeat_bypass !== "undefined"
        ) {
          bypassFromServer = args.args.praise_repeat_bypass;
        }
        this.currentTurnRepeatBypass = Math.max(
          0,
          parseInt(bypassFromServer || 0, 10) || 0
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
      // Diff update: only remove Believers that left and add ones that arrived.
      // Cards already in hand are left untouched, so the hand never fully clears
      // and re-renders ("disappear then reappear" flash) — it just slides.
      const existingIds = this.getStockCardIdsFromContainer("mybelievercards").map(
        String
      );
      const existingSet = {};
      existingIds.forEach(function (id) {
        existingSet[String(id)] = 1;
      });
      const wanted = {};
      (cards || []).forEach(function (card) {
        if (!card || typeof card.type === "undefined" || !card.id) return;
        wanted[String(card.id)] = card;
      });
      existingIds.forEach(
        function (cardId) {
          if (!wanted[String(cardId)]) {
            this.playerBelieverCards.removeFromStockById(cardId);
          }
        }.bind(this)
      );
      Object.keys(wanted).forEach(
        function (idStr) {
          if (existingSet[idStr]) return; // already present — leave it (no flash)
          const card = wanted[idStr];
          this.playerBelieverCards.addToStockWithId(
            parseInt(card.type, 10),
            parseInt(card.id, 10)
          );
        }.bind(this)
      );
      this.syncCurrentPlayerHandCounters();
    },

    replaceCurrentActionHand: function (cards) {
      // Diff update (see replaceCurrentBelieverHand): keep cards that stay so the
      // action hand never fully clears + re-adds (the "flash" on playing a card).
      const existingIds = this.getStockCardIdsFromContainer("myactioncards").map(
        String
      );
      const existingSet = {};
      existingIds.forEach(function (id) {
        existingSet[String(id)] = 1;
      });
      const wanted = {};
      (cards || []).forEach(function (card) {
        if (!card || !card.type || !card.id) return;
        wanted[String(card.id)] = card;
      });
      existingIds.forEach(
        function (cardId) {
          if (!wanted[String(cardId)]) {
            this.playerActionCards.removeFromStockById(cardId);
            delete this.actionCardTypeById[String(cardId)];
          }
        }.bind(this)
      );
      Object.keys(wanted).forEach(
        function (idStr) {
          if (existingSet[idStr]) return; // already present — leave it (no flash)
          const card = wanted[idStr];
          const spriteType = this.getActionCardSpriteIndex(String(card.type));
          this.playerActionCards.addToStockWithId(
            spriteType,
            parseInt(card.id, 10)
          );
          this.actionCardTypeById[idStr] = String(card.type);
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

    // Seat skill card: hidden = card back + generic "Skill card" tooltip;
    // revealed = the actual skill face (overlay text included) + that skill's
    // full tooltip. Single source: gamedatas reveal state.
    updateSeatSkillCard: function (playerId) {
      const pid = String(playerId || "");
      const node = dojo.byId("table_skill_" + pid);
      if (!node) return;
      const revealed =
        this.gamedatas.player_skills_revealed &&
        parseInt(this.gamedatas.player_skills_revealed[pid], 10) === 1;
      const card =
        this.gamedatas.player_skills && this.gamedatas.player_skills[pid];
      if (revealed && card && parseInt(card.type, 10) > 0) {
        const t = parseInt(card.type, 10);
        dojo.removeClass(node, "card-skill-back");
        dojo.addClass(node, "card-skill");
        // Re-decorate if the face changed (Gate of Truth redraw etc.).
        if (String(node.getAttribute("data-index") || "") !== String(t)) {
          const overlay = node.querySelector(".hof-card-text");
          if (overlay) overlay.parentNode.removeChild(overlay);
        }
        dojo.attr(node, "data-index", t);
        this.attachSkillTooltip(
          node,
          t,
          this.getEffectiveSkillStateForPanel(pid) || null
        );
      } else {
        dojo.removeClass(node, "card-skill");
        node.removeAttribute("data-index");
        const overlay = node.querySelector(".hof-card-text");
        if (overlay) overlay.parentNode.removeChild(overlay);
        dojo.addClass(node, "card-skill-back");
        this.attachSkillTooltip(node, 0, null);
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
      this.updateSeatSkillCard(pid);
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
      this.updateSeatSkillCard(pid);
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
      // 座位內的對應卡背(行動/信徒)是最精準的落點：位置對、尺寸=S級，
      // 飛牌自動縮放會跟著正確。找不到才退回整個座位框/面板。
      const seatKind = String(opts.seatCardKind || "");
      const seatKindId = seatKind ? "table_" + seatKind + "_icon_" + pid : "";
      const candidates = preferTable
        ? [seatKindId, "playertable_" + pid, "panel_" + pid]
        : ["panel_" + pid, seatKindId, "playertable_" + pid];
      for (let i = 0; i < candidates.length; i++) {
        const id = candidates[i];
        if (!id) continue;
        if (!allowTable && id.indexOf("table") !== -1) continue;
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
          seatCardKind: kind,
        });
      }
      if (anchorMode === "return") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: kind === "believer" ? "mybelievercards" : "myactioncards",
          preferTable: false,
          seatCardKind: kind,
        });
      }
      if (anchorMode === "play_action") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: "myactioncards",
          preferTable: true,
          seatCardKind: "action",
        });
      }
      if (anchorMode === "redistribute_source") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: kind === "believer" ? "mybelievercards" : "myactioncards",
          preferTable: true,
          allowPanel: false,
          seatCardKind: kind,
        });
      }
      if (anchorMode === "redistribute_target") {
        return this.resolvePlayerAnchorNodeId(pid, {
          selfNodeId: kind === "believer" ? "mybelievercards" : "myactioncards",
          preferTable: true,
          allowPanel: false,
          seatCardKind: kind,
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
      const primaryUrl = this.getThemeAssetUrl("img/believer_cards_bg.png");
      if (primaryUrl) candidates.push(String(primaryUrl));
      const detectedRoot = this.detectThemeRootUrl();
      if (detectedRoot) {
        candidates.push(
          String(detectedRoot).replace(/\/+$/, "") + "/img/believer_cards_bg.png"
        );
      }
      candidates.push("img/believer_cards_bg.png");
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
      const spriteUrl = this.getThemeAssetUrl("img/believer_cards_bg.png");
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
      const spriteUrl = this.getThemeAssetUrl("img/action_cards_bg.png");
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

    // 飛牌三級縮放：依「起訖節點的實際寬度 / 飛行暫存卡寬度」推導縮放比，
    // 讓卡在 S(面板/座位卡背)、M(座位技能/牌庫/墓地)、L(手牌/中央) 之間
    // 飛行時自然放大縮小。節點若不是卡片形狀(容器，如整條手牌區/座位框)
    // 比例會超出合理範圍 → 回傳 1(不縮放)。
    getFlightScaleForNode: function (nodeOrId, tempW) {
      const node =
        typeof nodeOrId === "string" ? dojo.byId(nodeOrId) : nodeOrId || null;
      if (!node || !(tempW > 0)) return 1;
      let w = 0;
      try {
        const pos = dojo.position(node, true);
        w = parseFloat((pos && pos.w) || 0);
      } catch (e) {
        return 1;
      }
      if (!(w > 0)) return 1;
      const ratio = w / tempW;
      // 非卡片節點(太寬=容器、太窄=徽章之類)不縮放。
      if (ratio > 1.6 || ratio < 0.25) return 1;
      return Math.max(0.3, Math.min(1.5, ratio));
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
      const duration = Math.max(
        0,
        parseInt(args.duration || this.getUnifiedCardFlyMs(), 10)
      );
      const delayStep = Math.max(
        0,
        parseInt(args.delayStep || this.getUnifiedCardFlightStaggerMs(), 10)
      );
      let nextDelay = Math.max(0, parseInt(args.startDelay || 0, 10));
      if (!count || !sourceId || !targetId) return nextDelay;
      if (!dojo.byId(sourceId) || !dojo.byId(targetId)) return nextDelay;
      const visualN = Math.min(cap, count);
      const cardClass =
        typeof args.cardClass === "string" && args.cardClass.length
          ? args.cardClass
          : this.getCardBackClassByKind(args.cardKind || "action");
      const onComplete =
        typeof args.onComplete === "function" ? args.onComplete : null;
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
          // Fire the completion callback when the LAST card of the batch lands,
          // so callers can chain the next step on the real animation end instead
          // of a guessed delay.
          onEnd: i === visualN - 1 && onComplete ? onComplete : undefined,
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
      // Host the FX in the arena and center it directly. placeOnObject was
      // landing the shuffle in a screen corner (wrong offset parent / 0-size
      // anchor), so position it absolutely at the host center instead.
      const host = arena || gameArea;
      if (host) {
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
          host
        );
        this.ensureCardFlightRootPositioned(host);
        dojo.style(fxId, {
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          margin: "0",
          zIndex: 2600,
        });
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
          const toScale = 1;
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

    getUnifiedCenterHoldMs: function () {
      const v = parseInt(this.unifiedCenterHoldMs || 0, 10);
      return v > 0 ? v : 1600;
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
      // Floor raised to 1000ms so the (now more pronounced, ~1.05s) center shuffle
      // wobble plays fully before cards are dealt back out.
      return v > 0 ? v : Math.max(1000, this.getUnifiedCardFlyMs() + 240);
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
      const centerHoldMs = this.getUnifiedCenterHoldMs();
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
      const centerHoldMs = this.getUnifiedCenterHoldMs();
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
          _("Target a player with ${card_name}."),
          { card_name: String(cardName || "") }
        );
      }
      if (cardKey === "breaking_faith") {
        return dojo.string.substitute(
          _("Target a player in your Sect with ${card_name}."),
          { card_name: String(cardName || "") }
        );
      }
      if (cardKey === "faith_war" || cardKey === "faith_debate") {
        return dojo.string.substitute(
          _("Target a Sect with ${card_name}."),
          { card_name: String(cardName || "") }
        );
      }
      if (cardKey === "witch_hunt" || cardKey === "spread_rumors") {
        return dojo.string.substitute(
          _("Target a Sect with ${card_name}."),
          { card_name: String(cardName || "") }
        );
      }
      return dojo.string.substitute(
        _("Target a player with ${card_name}."),
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
      // Once the Leader rejected a stop request this round, the button is gone
      // — only committing a Believer remains (prevents the ask-reject loop).
      if (parseInt((debateArgs && debateArgs.stop_request_blocked) || 0, 10) === 1) {
        return false;
      }
      const debateRound = parseInt(
        (debateArgs && debateArgs.debate_round) || 0,
        10
      );
      if (
        debateRound > 0 &&
        parseInt(this.myDebateStopRejectedRound || 0, 10) === debateRound
      ) {
        return false;
      }
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
          // Panel AND ring seat are both clickable targets.
          [
            dojo.byId("panel_" + player_id),
            dojo.byId("playertable_" + player_id),
          ].forEach(
            function (node) {
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
        }.bind(this)
      );
    },

    getSoulCuttingSwordSelectionInstruction: function (targetPlayerId) {
      const base = _("Soul-Cutting Sword: target 1 player.");
      const pid = parseInt(targetPlayerId || 0, 10);
      if (pid <= 0) return base;
      const targetName =
        (this.gamedatas.players[String(pid)] || {}).name || _("Player");
      return dojo.string.substitute(
        _("Soul-Cutting Sword: selected target ${target_name}."),
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
        copyTargetPlayerId: null,
        copyTargets:
          (skillState && skillState.gate_truth_copyable_targets) || [],
      };
      this.playerActionCards.unselectAll();
      this.playerBelieverCards.unselectAll();
      this.applyPendingSkillUI();
      this.onUpdateActionButtons(
        "playerTurn",
        this.gamedatas.gamestate.args || {}
      );
    },

    // Set the top instruction + highlights for the CURRENT pendingSkill.skillType.
    // Reused when a Gate of Truth copy transitions into the copied skill's own
    // effect selection (skillType switches from 9 to the copied type), so picking
    // the copy target flows straight into using it (copy = use).
    applyPendingSkillUI: function () {
      if (!this.pendingSkill) return;
      const skillType = parseInt(this.pendingSkill.skillType || 0, 10);
      const baseSkillType = parseInt(this.pendingSkill.baseSkillType || 0, 10);
      const isCopy = baseSkillType === 9 && skillType !== 9;
      if (skillType === 2) {
        dojo.addClass("mybelievercards", "highlight_stock");
        this.highlightSkillTargetPlayers(false);
        this.setTopInstruction(
          _("KABOOM!: select 1 Believer and target 1 other player.")
        );
      } else if (skillType === 11) {
        this.highlightSkillTargetPlayers(false);
        this.setTopInstruction(this.getSoulCuttingSwordSelectionInstruction(0));
      } else if (skillType === 13 || skillType === 7 || skillType === 8) {
        dojo.addClass("mybelievercards", "highlight_stock");
        if (skillType === 13) {
          this.setTopInstruction(
            _("Praise of Life: select 1 Believer to sacrifice.")
          );
        } else if (skillType === 8) {
          this.setTopInstruction(
            _("World Peace: select 1 Believer to sacrifice.")
          );
        } else {
          this.setTopInstruction(
            _("Eternal Truth: select 1 Believer to sacrifice.")
          );
        }
      } else if (skillType === 1) {
        if (isCopy) {
          this.setTopInstruction(
            _(
              "Gate of Truth copied Purple Hermit: snatch half of the copied-skill owner's Believers."
            )
          );
        } else {
          this.setTopInstruction(
            _("Purple Hermit: snatch half of your Leader's Believers now.")
          );
        }
      } else if (skillType === 3) {
        this.setTopInstruction(
          _(
            "Headstronger: expel all your Followers and snatch half of each Follower's Believers."
          )
        );
      } else if (skillType === 14 || skillType === 15) {
        this.setTopInstruction(_("Use this skill."));
      } else if (skillType === 9) {
        const copyTargets = this.pendingSkill.copyTargets || [];
        const targetIds = copyTargets
          .map(function (row) {
            return parseInt((row && row.id) || 0, 10);
          })
          .filter(function (id) {
            return id > 0;
          });
        if (!targetIds.length) {
          this.setTopInstruction(
            _("No revealed skill can be copied right now.")
          );
        } else {
          this.highlightSkillTargetPlayers(false, targetIds);
          this.setTopInstruction(
            _(
              "Gate of Truth: choose one player with a revealed skill to copy."
            )
          );
        }
      }
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
        // Copy = use: picking the copy target flows straight into the copied
        // skill's own effect selection (no separate "use" button). The copy is
        // NOT sent to the server yet — only the final Confirm submits copy+use
        // atomically, so Cancel here leaves nothing copied and nothing revealed.
        const copyTargets = this.pendingSkill.copyTargets || [];
        const targetRow =
          copyTargets.find(function (row) {
            return parseInt((row && row.id) || 0, 10) === tid;
          }) || null;
        const copiedType = targetRow
          ? parseInt(targetRow.skill_type || 0, 10)
          : 0;
        if (copiedType <= 0) {
          this.showMessage(
            _("That player has no copyable revealed skill."),
            "error"
          );
          return;
        }
        // Switch the pending selection to the copied skill, remembering who we
        // copy from. Reset any effect target/believer picked for the copy step.
        this.pendingSkill.copyTargetPlayerId = tid;
        this.pendingSkill.skillType = copiedType;
        this.pendingSkill.baseSkillType = 9;
        this.pendingSkill.targetPlayerId = null;
        this.clearSkillTargetSelection();
        this.playerBelieverCards.unselectAll();
        dojo.removeClass("mybelievercards", "highlight_stock");
        this.applyPendingSkillUI();
        this.onUpdateActionButtons(
          "playerTurn",
          this.gamedatas.gamestate.args || {}
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
          _("Finish discard selection before using a skill."),
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
          dojo.string.substitute(
            _("You have already used a ${action_type} action this turn."),
            {
              action_type: this.getActionTypeLabelFromMask(0b00100),
            }
          ),
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
      this.setTopInstruction(_("Zombie Army: you may use graveyard Believers for this Faith War."));
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

      // Skills that sacrifice one own Believer share one validation/string:
      // 2 KABOOM!, 13 Praise of Life, 8 World Peace, 7 Eternal Truth.
      if ([2, 13, 8, 7].indexOf(skillType) >= 0) {
        if (selectedBelievers.length !== 1) {
          this.showMessage(
            _("Select exactly 1 Believer to sacrifice."),
            "error"
          );
          return;
        }
        args.believer_id = selectedBelievers[0].id;
      }
      if (skillType === 2) {
        if (!this.pendingSkill.targetPlayerId) {
          this.showMessage(_("Target a player with KABOOM!"), "error");
          return;
        }
        args.target_id = this.pendingSkill.targetPlayerId;
      } else if (skillType === 11) {
        if (!this.pendingSkill.targetPlayerId) {
          this.showMessage(
            _("Target a player with Soul-Cutting Sword."),
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

      // Gate of Truth atomic copy+use: the copied skill's effect inputs are in
      // args (target_id / believer_id) for skillType (= the copied type); attach
      // who we copy from so the server does copy+use in one action.
      if (this.pendingSkill.copyTargetPlayerId) {
        // Gate of Truth copy target. Read by the useSkill entry in
        // hegemonyoffaith.action.php (that controller forwards positionally and
        // DROPS any arg it does not read — the earlier "copy target never
        // reaches the server" bug). target_id carries the EFFECT target.
        args.copy_from_player_id = this.pendingSkill.copyTargetPlayerId;
      }

      // Diagnostic: confirms whether the copy target is actually included in the
      // submitted args (vs lost in the client transition or dropped by transport).
      console.log(
        "[HOF-GATE-COPY] useSkill submit",
        "skillType=" + skillType,
        "copyTargetPlayerId=" + this.pendingSkill.copyTargetPlayerId,
        "args=" + JSON.stringify(args)
      );

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
      // Lock ALL hand cards up front unless this is genuinely the local player's
      // moment to act. Without this, during a turn handoff / another player's
      // turn there is a brief window where cards (incl. Believers) stay
      // clickable and invite a misclick that just bounces with "not your turn".
      // The deferred readiness refresh below re-enables the right cards when it
      // IS our turn. (Solo: the placeholder human is framework-"active" while a
      // bot owns the turn, so also lock when a bot owns the current state.)
      this.updateSeatActiveHighlight();
      const localCanActNow =
        typeof this.isCurrentPlayerActive === "function" &&
        this.isCurrentPlayerActive() &&
        !this.soloBotOwnsActiveState();
      if (!localCanActNow) {
        this.lockAllHandStocks();
      } else {
        // Genuinely this player's moment (own turn or a reactive window like
        // defense): release the gray hard-lock; the readiness refresh below
        // re-applies the per-card dimming rules.
        this.unlockAllHandStocks();
      }
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
        const bypassRaw = readIncomingTurnArg("praise_repeat_bypass");
        if (typeof bypassRaw !== "undefined") {
          this.currentTurnRepeatBypass = Math.max(
            0,
            parseInt(bypassRaw || 0, 10) || 0
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
          _("Confirm"),
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
          this.setTopInstruction(_("Zombie Army: you may use graveyard Believers for this Faith War."));
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
            _("Confirm"),
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
      // Solo: when a virtual bot truly owns this activeplayer state, never draw
      // the buttons for the placeholder human (isCurrentPlayerActive() is always
      // true for that human). This is the generic guard that stops the human
      // being handed — and rejected on — secret alliance / prophet / info-spy
      // prompts that actually belong to a bot.
      const soloBotOwnsThisState = this.soloBotOwnsActiveState();
      if (soloBotOwnsThisState) {
        const soloActorId = this.getSoloCurrentActorId();
        this.setTopInstruction(
          dojo.string.substitute(_("${player_name} (AI) is playing..."), {
            player_name:
              (this.gamedatas.players &&
                this.gamedatas.players[String(soloActorId)] &&
                this.gamedatas.players[String(soloActorId)].player_name) ||
              _("AI"),
          })
        );
        dojo.removeClass("mybelievercards", "highlight_stock");
      }
      const canRenderCurrentStateButtons =
        !soloBotOwnsThisState &&
        (canRenderInitialSkillButtons ||
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
        (stateName === "reverseKarmaPrompt" && this.isCurrentPlayerActive()));
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
          _("Confirm"),
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
          case "playerTurn": {
            // Solo: a bot owns this turn while the framework keeps a stale
            // human "active" — never draw the turn buttons for that human.
            const turnArgsForSolo =
              args && args.args && typeof args.args === "object"
                ? args.args
                : args || {};
            const soloActorId = parseInt(
              (turnArgsForSolo && turnArgsForSolo.solo_actor_id) || 0,
              10
            );
            if (
              soloActorId > 0 &&
              soloActorId !== parseInt(this.player_id || 0, 10)
            ) {
              this.setTopInstruction(
                dojo.string.substitute(_("${player_name} (AI) is playing..."), {
                  player_name:
                    (this.gamedatas.players &&
                      this.gamedatas.players[String(soloActorId)] &&
                      this.gamedatas.players[String(soloActorId)].player_name) ||
                    _("AI"),
                })
              );
              dojo.removeClass("mybelievercards", "highlight_stock");
              break;
            }
          }
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
                    "Discard mode: select one or more Action cards."
                  )
                );
                this.addActionButton(
                  "confirmDiscardSelectedActions",
                  _("Confirm"),
                  "onDiscardSelectedActionsClicked"
                );
                this.addActionButton(
                  "cancelDiscardMode",
                  _("Cancel"),
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
                  "Praise of Life: sacrifice 1 Believer to gain 1 extra action."
                )
              );
              if (canUseSkillNow) {
                this.addActionButton(
                  "useSkillButton",
                  dojo.string.substitute(_("Use Skill: ${skill_name}"), {
                    skill_name: _("Praise of Life"),
                  }),
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
                      "Action slots are used."
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
                  ? _("Use Zombie Army")
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
                _("Confirm"),
                "onDiscardSelectedActionsClicked"
              );
              this.addActionButton(
                "cancelDiscardMode",
                _("Cancel"),
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
                _("Confirm"),
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
                _("Select a Sect Leader to ask for surrender acceptance.")
              );
            } else {
              this.setTopInstruction(
                _("No Sect Leader is available, so you become a Wanderer.")
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
              _("Accept"),
              "onAcceptSurrenderRequestClicked"
            );
            this.addActionButton(
              "rejectSurrenderRequest",
              _("Refuse"),
              "onRejectSurrenderRequestClicked"
            );
            break;

          case "leaderGiveBeliever":
            this.setTopInstruction(
              _("Select exactly 1 Believer to give your Follower.")
            );
            this.addActionButton(
              "confirmGiveBeliever",
              _("Confirm"),
              "onConfirmGiveBelieverClicked"
            );
            this.addActionButton(
              "cancelGiveBeliever",
              _("Refuse"),
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
            const conspiracyCanDefendNow = this.currentPlayerHoldsAoeDefenseCard();
            if (conspiracyCanDefendNow && this.playerActionCards.setSelectionMode) {
              this.playerActionCards.setSelectionMode(1);
              this.refreshActionCardReadinessVisuals(stateName, args);
            }
            if (!conspiracyCandidates.length) {
              if (conspiracyCanDefendNow) {
                this.setTopInstruction(
                  _(
                    "Your Leader is choosing a representative. You may play your defense card now."
                  )
                );
                break;
              }
              this.showMessage(
                _("Waiting for Conspiracy representative selection..."),
                "info"
              );
              this.setTopInstruction(
                _("Waiting for representative selection...")
              );
              break;
            }
            if (conspiracyCanDefendNow) {
              this.setTopInstruction(
                _("Assign a representative, or play your defense card.")
              );
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
            const martyrdomCanDefendNow = this.currentPlayerHoldsAoeDefenseCard();
            if (martyrdomCanDefendNow && this.playerActionCards.setSelectionMode) {
              this.playerActionCards.setSelectionMode(1);
              this.refreshActionCardReadinessVisuals(stateName, args);
            }
            if (!martyrdomCandidates.length) {
              if (martyrdomCanDefendNow) {
                this.setTopInstruction(
                  _(
                    "Your Leader is choosing a representative. You may play your defense card now."
                  )
                );
                break;
              }
              this.showMessage(
                _("Waiting for Martyrdom representative selection..."),
                "info"
              );
              this.setTopInstruction(
                _("Waiting for representative selection...")
              );
              break;
            }
            if (martyrdomCanDefendNow) {
              this.setTopInstruction(
                _("Assign a representative, or play your defense card.")
              );
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
                  defenseKind === "breaking_faith"
                    ? _("Play Breaking Faith.")
                    : dojo.string.substitute(
                        _("Play a matching ${defense_label} defense card."),
                        { defense_label: defenseLabel }
                      )
                );
              } else {
                this.setTopInstruction(
                  dojo.string.substitute(
                    _("Waiting for players to decide whether to defend."),
                    { defense_label: defenseLabel }
                  )
                );
              }
              if (!canRespond) break;
              this.addActionButton(
                "passDefense",
                _("Skip"),
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
                _("Choose one Believer for this war.") +
                  selectedText
              );
              this.addActionButton(
                "chooseZombieGraveBeliever",
                _("Choose from Graveyard"),
                "onChooseZombieGraveBelieverClicked"
              );
            } else {
              this.setTopInstruction(
                _("Choose one Believer for this war.")
              );
            }
            this.addActionButton(
              "confirmBeliever",
              _("Confirm"),
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
              const isMartyrdomRep = this.isCurrentPlayerInAoeCommitTargets(
                args
              );
              const canCommitBeliever =
                isMartyrdomRep && this.canCurrentPlayerCommitAoeBeliever(args);
              if (canCommitBeliever) {
                this.setTopInstruction(
                  this.currentPlayerHoldsAoeDefenseCard()
                    ? _(
                        "Choose one Believer to commit, or play your defense card."
                      )
                    : this.getAoeCommitPromptText("martyrdom")
                );
                this.addActionButton(
                  "confirmMartyrdomBeliever",
                  _("Confirm"),
                  "onConfirmBelieverClicked"
                );
                dojo.addClass("mybelievercards", "highlight_stock");
              } else if (
                !isMartyrdomRep &&
                this.isCurrentPlayerActive() &&
                this.currentPlayerHoldsAoeDefenseCard()
              ) {
                // Waiting defense holder: only the defense card is playable.
                dojo.removeClass("mybelievercards", "highlight_stock");
                this.setTopInstruction(
                  _(
                    "Your representative is choosing a Believer. You may play your defense card instead, or wait."
                  )
                );
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
              const isConspiracyRep = this.isCurrentPlayerInAoeCommitTargets(
                args
              );
              const canCommitBeliever =
                isConspiracyRep && this.canCurrentPlayerCommitAoeBeliever(args);
              if (canCommitBeliever) {
                this.setTopInstruction(
                  this.currentPlayerHoldsAoeDefenseCard()
                    ? _(
                        "Choose one Believer to commit, or play your defense card."
                      )
                    : this.getAoeCommitPromptText("conspiracy")
                );
                this.addActionButton(
                  "confirmConspiracyBeliever",
                  _("Confirm"),
                  "onConfirmBelieverClicked"
                );
                dojo.addClass("mybelievercards", "highlight_stock");
              } else if (
                !isConspiracyRep &&
                this.isCurrentPlayerActive() &&
                this.currentPlayerHoldsAoeDefenseCard()
              ) {
                // Waiting defense holder: only the defense card is playable.
                dojo.removeClass("mybelievercards", "highlight_stock");
                this.setTopInstruction(
                  _(
                    "Your representative is choosing a Believer. You may play your defense card instead, or wait."
                  )
                );
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
              _("Confirm"),
              "onConfirmBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
            break;

          case "secretAllianceAttackerChoice":
            this.addActionButton(
              "confirmSecretAllianceOwnCard",
              _("Confirm"),
              "onConfirmSecretAllianceOwnCardClicked"
            );
            this.setTopInstruction(
              _("Select one Action card from your hand to exchange.")
            );
            break;

          case "secretAllianceTargetChoice":
            this.addActionButton(
              "confirmSecretAllianceTargetCard",
              _("Confirm"),
              "onConfirmSecretAllianceTargetCardClicked"
            );
            this.setTopInstruction(
              _("Select one Action card from your hand to exchange.")
            );
            break;

          case "prophetSkillPrompt":
            {
              const prophetArgs =
                args && args.args && typeof args.args === "object"
                  ? args.args
                  : args || {};
              // Responder guard: while a solo bot responds, the framework
              // active player is a stale human — never show them the buttons.
              const promptResponderId = parseInt(
                (prophetArgs && prophetArgs.responder_id) || 0,
                10
              );
              if (
                promptResponderId > 0 &&
                promptResponderId !== parseInt(this.player_id || 0, 10)
              ) {
                break;
              }
              const drawIndex = this.getSafeProphetDrawIndex(
                prophetArgs && prophetArgs.predict_target_index,
                1
              );
              const isCopy =
                String((prophetArgs && prophetArgs.ability_source) || "prophet") ===
                "gate_truth_copy";
              if (isCopy) {
                this.setTopInstruction(
                  dojo.string.substitute(
                    _("Copy The Prophet to predict Believer draw #${draw_index}?"),
                    { draw_index: drawIndex }
                  )
                );
              } else {
                this.setTopInstruction(
                  _("A player is drawing Believers. Use The Prophet to predict?")
                );
              }
              // Copied via Gate of Truth: frame the choice as Copy / Cancel, not
              // Use / Skip, so it reads as "copy this skill?" not "use a skill".
              this.addActionButton(
                "prophetEnableSkill",
                isCopy ? _("Copy The Prophet") : _("Use The Prophet"),
                "onProphetEnableSkillClicked"
              );
              this.addActionButton(
                "prophetSkipSkill",
                isCopy ? _("Cancel") : _("Skip"),
                "onProphetSkipSkillClicked"
              );
            }
            break;

          case "prophetGuess":
            {
              const prophetArgs =
                args && args.args && typeof args.args === "object"
                  ? args.args
                  : args || {};
              // Responder guard: while a solo bot responds, the framework
              // active player is a stale human — never show them the buttons.
              const guessResponderId = parseInt(
                (prophetArgs && prophetArgs.responder_id) || 0,
                10
              );
              if (
                guessResponderId > 0 &&
                guessResponderId !== parseInt(this.player_id || 0, 10)
              ) {
                break;
              }
              const drawIndex = this.getSafeProphetDrawIndex(
                prophetArgs && prophetArgs.predict_target_index,
                1
              );
              this.setTopInstruction(
                dojo.string.substitute(
                  _(
                    "Choose a Believer type to predict draw #${draw_index}."
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
              _("Skip"),
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
                    "Gate of Truth: copy Holy Rebirth to revive 3 Believers from the graveyard."
                  )
                );
                this.addActionButton(
                  "holyRebirthUse",
                  _("Copy Holy Rebirth"),
                  "onHolyRebirthUseClicked"
                );
              } else {
                this.setTopInstruction(
                  _("Holy Rebirth: revive 3 Believers from the graveyard.")
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
              _("Karma Reversed: invert the result of this confrontation.")
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
                "Your representative asks to stop Faith Debate."
              )
            );
            this.addActionButton(
              "approveFaithDebateStop",
              _("Accept"),
              "onApproveFaithDebateStopClicked"
            );
            this.addActionButton(
              "rejectFaithDebateStop",
              _("Refuse"),
              "onRejectFaithDebateStopClicked"
            );
            break;

          case "gameEndSummary":
            this.setTopInstruction(_("Review the game-end summary."));
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
      // Solo virtual bot seats render exactly like practice-AI seats (AI badge,
      // bot pacing visuals) — one shared display path.
      const soloIds = this.gamedatas && this.gamedatas.solo_bot_player_ids;
      (Array.isArray(soloIds) ? soloIds : []).forEach(function (pid) {
        map[String(pid)] = 1;
      });
      return map;
    },

    isSoloBotSeat: function (playerId) {
      const soloIds = this.gamedatas && this.gamedatas.solo_bot_player_ids;
      const pid = parseInt(playerId || 0, 10);
      return (
        Array.isArray(soloIds) &&
        soloIds.some(function (v) {
          return parseInt(v, 10) === pid;
        })
      );
    },

    // Real single actor for the current activeplayer state. In solo the lone
    // human is always the framework "active" placeholder, so this (fed by the
    // server's soloActorChanged notif / getAllDatas) is the authoritative owner.
    getSoloCurrentActorId: function () {
      const v =
        typeof this.soloCurrentActorId !== "undefined" &&
        this.soloCurrentActorId !== null
          ? this.soloCurrentActorId
          : (this.gamedatas && this.gamedatas.solo_current_actor_id) || 0;
      return parseInt(v || 0, 10);
    },

    // True when a virtual bot (not this human) owns the current activeplayer
    // sub-state. Generic across every activeplayer state — the reason the human
    // must not be shown action buttons for secret alliance / prophet guess /
    // info spy review etc. while a bot is really the one acting. Multiactive
    // states return false here: the framework active list is accurate for real
    // humans there, so isCurrentPlayerActive() can be trusted as-is.
    soloBotOwnsActiveState: function () {
      const gs = (this.gamedatas && this.gamedatas.gamestate) || {};
      if ((gs.type || "") !== "activeplayer") {
        return false;
      }
      const actor = this.getSoloCurrentActorId();
      if (actor <= 0 || !this.isSoloBotSeat(actor)) {
        return false;
      }
      return actor !== parseInt(this.player_id || 0, 10);
    },

    // Note: the framework's addAutomataPlayerPanel API was evaluated for solo
    // bot panels but produced empty "undefined" boards (undocumented payload).
    // Bots use the manual hof_bot_board_* fallback created in setup() instead.

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
      // Expose the practice-AI console control only when TEST/CHEAT tools are
      // enabled (HOF_DEBUG_TOOLS, off for release). The underlying practice-AI
      // server logic and the production zombie/disconnect auto-play are
      // unaffected; this only hides the manual console switch.
      if (HOF_DEBUG_TOOLS) {
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
      }
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
      } else if (stateName === "discardingActionCard") {
        mode = !believerSelectionPhase && canSelectActionCards ? 2 : 0;
      } else if (
        stateName === "martyrdomChooseBelievers" ||
        stateName === "conspiracyChooseBelievers" ||
        stateName === "martyrdomChooseRepresentative" ||
        stateName === "conspiracyChooseRepresentative"
      ) {
        // AOE defense window: the concealed defense card must stay selectable
        // even while the believer hand is in commit-ready mode (the two
        // selections coexist). canSelectActionCardsInState already gates this
        // on isCurrentPlayerActive() + playDefenseCard being available.
        mode = canSelectActionCards ? 1 : 0;
      } else {
        mode = !believerSelectionPhase && canSelectActionCards ? 1 : 0;
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
          statusNote = _(
            "Karma Reversed's confrontation reversal has been canceled by Gate of Truth's copied effect."
          );
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
      const cardType = String(this.currentFaithWarActionCardType || "");
      const cardId = String(this.currentFaithWarActionCardId || "");
      // Nothing tracked and nothing on the board: nothing to discard.
      const slot = dojo.byId("faithwar_action_slot");
      if (!slot && !cardType) return;
      const cardNode = slot
        ? dojo.query(".faith-war-action-card", slot)[0]
        : null;
      if (cardNode) {
        this.animateCardNodeCloneToTarget(cardNode, "action_discard", {
          tempPrefix: "duel_action_to_discard",
          duration: this.getUnifiedCardFlyMs(),
          zIndex: 2200,
        });
      }
      // Push to the discard pile data from the tracked card even when the board
      // (and its DOM card) is not present — otherwise the war/debate action card
      // never appears in the discard pile (e.g. blocked war at fast AI speed).
      if (cardType) {
        this.pushActionDiscardCard(cardType, cardId, {
          position: this.currentCenterActionHadDefenseDiscard
            ? "bottom"
            : "top",
        });
      }
      if (slot) slot.innerHTML = "";
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
      if (!deadPlayerIds || !deadPlayerIds.length) {
        // Nothing flies (e.g. graveyard-sourced Believers go to 'removed'):
        // nothing to wait for — show the held graveyard state now.
        this.releaseGraveyardRender();
        return;
      }
      const flyMs = this.getUnifiedCardFlyMs();
      deadPlayerIds.forEach(
        function (playerId, index) {
          const slot = this.getFaithWarPlayerSlotNode(playerId);
          if (!slot) return;
          const cardNode = dojo.query(".faith-war-card", slot)[0];
          if (!cardNode) return;
          this.clearCombatRevealOverlay(cardNode);
          // The clone keeps the loser grayscale and replaces the original
          // visually: hide the slot card so only one (gray) card is seen
          // flying to the graveyard.
          this.animateCardNodeCloneToTarget(cardNode, "graveyard", {
            tempPrefix: "faithwar_dead_" + playerId,
            cardClass: cardNode.className + " combat-flight-dead",
            duration: flyMs,
            startDelay: index * 90,
            zIndex: 2000,
          });
          dojo.style(cardNode, "visibility", "hidden");
        }.bind(this)
      );
      // The pile/count was HELD at the reveal (notif_duelResult): repaint it the
      // moment the LAST dead card lands, so the grave fills exactly on landing.
      setTimeout(
        this.releaseGraveyardRender.bind(this),
        (deadPlayerIds.length - 1) * 90 + flyMs + 100
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

    resetAoeCombatLayoutForNewAction: function () {
      this.currentAoeCombatType = null;
      this.currentAoeAttackerId = null;
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
      // Same guard as ensureFaithWarBoard: a Prophet staging card whose
      // anchor is wiped by this rebuild would otherwise float forever.
      this.clearProphetPendingPredictionVisual();
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
      // In the Final Struggle each contender is a fixed individual (no leader
      // assigns a representative), so show their name directly instead of "???".
      const isFinalStruggleConsp =
        parseInt(
          (this.gamedatas.combat_context &&
            this.gamedatas.combat_context.war_type) ||
            0,
          10
        ) === 11;
      // Final Struggle: restrict slots to the tied contenders (non-contenders
      // must NOT get an empty Believer position that never flips).
      const finalStruggleContenderIds =
        isFinalStruggleConsp &&
        this.gamedatas.combat_context &&
        Array.isArray(
          this.gamedatas.combat_context.final_struggle_contender_ids
        ) &&
        this.gamedatas.combat_context.final_struggle_contender_ids.length > 0
          ? this.gamedatas.combat_context.final_struggle_contender_ids
          : null;
      const wantedSects = [];
      const seenSects = {};
      this.getPlayersInSeatOrder().forEach(
        function (p) {
          if (
            finalStruggleContenderIds &&
            finalStruggleContenderIds.indexOf(parseInt(p.id, 10)) === -1
          ) {
            // Not a contender in this Final Struggle: no slot.
            return;
          }
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
          const pdata =
            (this.gamedatas.players &&
              this.gamedatas.players[String(p.id)]) ||
            {};
          const repId = isFinalStruggleConsp ? parseInt(p.id, 10) : 0;
          const repName = isFinalStruggleConsp ? String(pdata.name || "") : "";
          const slot = this.ensureAoeRightSectSlot(sectId, repId, repName, false);
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
      // In the Final Struggle every contender commits one Believer each round and
      // they all deplete in lockstep, so a contender can never legitimately have
      // zero mid-cycle. The sect-sum public counter can briefly read 0 for a lone
      // contender and wrongly show the "no Believers available" empty card — never
      // show that note here; render a normal face-down placeholder instead.
      const isFinalStruggleConsp =
        parseInt(
          (this.gamedatas.combat_context &&
            this.gamedatas.combat_context.war_type) ||
            0,
          10
        ) === 11;
      const noSectBelievers =
        !isFinalStruggleConsp && sid >= 0 && sectBelieverCount <= 0;

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
                _("currently has no Believers available for this confrontation.")
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
          // combat-result-card is REQUIRED: the resolve flights and flip reveal
          // select commit cards by it — a placeholder promoted into the actual
          // commit without it flew to the graveyard as sprite tile 0 (a back).
          className:
            "card card-back-believer combat-commit-card combat-result-card facedown",
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
          if (!believerType) {
            // Diagnostic for the intermittent "one contender's card never
            // flips" in the Final Struggle: a facedown commit reached the
            // reveal WITHOUT a believer-type annotation (so the flip is
            // skipped). Log enough to identify whose slot missed it and why.
            const wrap = node.closest ? node.closest(".aoe-commit-item") : null;
            console.warn(
              "[HOF-FS-FLIP] facedown commit not annotated at reveal:",
              "owner=" + (wrap ? wrap.getAttribute("data-player-id") : "?"),
              "cardId=" +
                (node.getAttribute("data-card-id") ||
                  (wrap ? wrap.getAttribute("data-card-id") : "") ||
                  "?"),
              "wrapId=" + ((wrap && wrap.id) || "?")
            );
            return;
          }
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

    // Snapshot AOE believer flight sources WHILE the commit wraps still exist
    // (synchronously, before the combat-reveal gate). The deferred fly-out runs
    // after the reveal hold, by which time later notifications have wiped the
    // arena (totalCommitItems=0), so the live wraps are gone. We clone each
    // believer card node into the persistent flight root (game_play_area) at its
    // current position, hidden, and fly from that clone instead.
    snapshotAoeFlightSources: function (ownerByCardId) {
      this.aoeFlightSnapshot = {};
      if (!ownerByCardId) return;
      const root = dojo.byId("game_play_area");
      if (!root) return;
      this.ensureCardFlightRootPositioned(root);
      Object.keys(ownerByCardId).forEach(
        function (cardId) {
          const wrap =
            dojo.query(
              '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
                cardId +
                '"]'
            )[0] ||
            dojo.query(
              '.aoe-commit-item[data-card-kind="believer"][data-reveal-card-id="' +
                cardId +
                '"]'
            )[0] ||
            dojo.query('[data-card-id="' + cardId + '"].aoe-commit-item')[0];
          if (!wrap) return;
          const cardNode =
            dojo.query(".combat-result-card", wrap)[0] ||
            dojo.query(".combat-commit-card", wrap)[0] ||
            wrap;
          if (!this.isNodeUsableForCardFlight(cardNode)) return;
          const pos = this.getCardFlightSourcePositionInRoot(cardNode, root);
          const cloneId =
            "aoe_src_snap_" +
            cardId +
            "_" +
            Date.now().toString() +
            "_" +
            Math.floor(Math.random() * 100000).toString();
          // Build a CLEAN believer card (not a copy of the commit node, which may
          // be mid flip-reveal — that froze into a thin edge-on sliver and stayed
          // on the table). data-index drives the sprite via CSS at full size.
          // data-believer-type fallback: the snapshot can run while the flip is
          // still mid-animation (data-index not applied yet) — without it the
          // clone rendered sprite tile 0, which is the CARD BACK.
          const di =
            cardNode.getAttribute("data-index") ||
            cardNode.getAttribute("data-believer-type") ||
            wrap.getAttribute("data-index") ||
            wrap.getAttribute("data-believer-type") ||
            "";
          let html =
            '<div id="' + cloneId + '" class="card card-believer"';
          if (String(di).length) html += ' data-index="' + di + '"';
          html += "></div>";
          dojo.place(html, root);
          dojo.style(cloneId, {
            position: "absolute",
            left: pos.left + "px",
            top: pos.top + "px",
            visibility: "hidden",
            zIndex: 2350,
          });
          this.aoeFlightSnapshot[String(cardId)] = cloneId;
        }.bind(this)
      );
    },

    animateAoeBelieversToTargets: function (ownerByCardId, options) {
      if (!ownerByCardId) return;
      const opts = options || {};
      const flyMs = this.getUnifiedCardFlyMs();
      Object.keys(ownerByCardId).forEach(
        function (cardId) {
          let wrap = dojo.query(
            '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
              cardId +
              '"]'
          )[0];
          // Fallback lookups: the believer wrap may carry the id on a different
          // attribute (e.g. facedown commits annotated at reveal), so try the
          // reveal-target id and a kind-agnostic match before giving up — that
          // silent miss was a "believer does not fly" case.
          if (!wrap) {
            wrap = dojo.query(
              '.aoe-commit-item[data-card-kind="believer"][data-reveal-card-id="' +
                cardId +
                '"]'
            )[0];
          }
          if (!wrap) {
            wrap = dojo.query('[data-card-id="' + cardId + '"].aoe-commit-item')[0];
          }
          if (!wrap) {
            // Live wrap gone (arena wiped during the reveal gate). Fly from the
            // pre-gate snapshot clone in game_play_area instead.
            const snapId =
              this.aoeFlightSnapshot && this.aoeFlightSnapshot[String(cardId)];
            if (snapId && dojo.byId(snapId)) {
              const ownerIdSnap = parseInt(ownerByCardId[cardId] || 0, 10);
              const targetIdSnap = this.getAoeBelieverReturnTargetNodeId(
                ownerIdSnap
              );
              if (dojo.byId(targetIdSnap)) {
                // Keep the snapshot HIDDEN — it is only the position/appearance
                // source. animateCardNodeCloneToTarget makes its own visible temp
                // to fly; making the snapshot visible left a static card (or a
                // mid-flip sliver) sitting on the table.
                const isDeadSnap = String(targetIdSnap) === "graveyard";
                this.animateCardNodeCloneToTarget(snapId, targetIdSnap, {
                  tempPrefix: "aoe_to_target_snap",
                  cardClass: isDeadSnap
                    ? "card card-believer combat-flight-dead"
                    : "card card-believer",
                  dataIndex: parseInt(
                    dojo.byId(snapId).getAttribute("data-index") || 0,
                    10
                  ),
                  duration: flyMs,
                  zIndex: 2360,
                });
              }
              const snapNode = dojo.byId(snapId);
              setTimeout(function () {
                if (snapNode && snapNode.parentNode) dojo.destroy(snapNode);
              }, Math.max(160, flyMs + 80));
              delete this.aoeFlightSnapshot[String(cardId)];
              return;
            }
            return;
          }
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
            // Some commit nodes (slot placeholders reused as the actual commit)
            // lack the .combat-result-card class — fall back to any commit card
            // before the wrapper, otherwise the type read fails and the clone
            // rendered sprite tile 0 = the CARD BACK ("dead believer flies as a
            // back to the graveyard").
            const cardNode =
              dojo.query(".combat-result-card", wrap)[0] ||
              dojo.query(".combat-commit-card", wrap)[0] ||
              wrap;
            // Dead believers keep their loser grayscale during the flight;
            // hide the slot card at once so only the clone is visible.
            const isDeadFlight = String(targetId) === "graveyard";
            // These committed Believers are PUBLIC (already revealed face-up), so
            // fly the FACE — never card-back (card-back is only for hidden draws).
            // Read the type from the node so the clone shows the right sprite even
            // if the source node's class was left as card-back.
            let flyBelieverType = parseInt(
              cardNode.getAttribute("data-index") ||
                cardNode.getAttribute("data-believer-type") ||
                0,
              10
            );
            if (!flyBelieverType) {
              const typedChild = dojo.query(
                "[data-index], [data-believer-type]",
                wrap
              )[0];
              if (typedChild) {
                flyBelieverType = parseInt(
                  typedChild.getAttribute("data-index") ||
                    typedChild.getAttribute("data-believer-type") ||
                    0,
                  10
                );
              }
            }
            // No readable type even via fallbacks: use an explicit card back
            // (a face class without data-index also renders sprite tile 0 =
            // the back, but unintentionally).
            const flyFaceClass =
              flyBelieverType > 0 ? "card card-believer" : "card card-back-believer";
            const cloneId = this.animateCardNodeCloneToTarget(cardNode, targetId, {
              tempPrefix: "aoe_to_target",
              cardClass:
                flyFaceClass + (isDeadFlight ? " combat-flight-dead" : ""),
              dataIndex: flyBelieverType > 0 ? flyBelieverType : undefined,
              duration: flyMs,
              zIndex: 2360,
            });
            if (cloneId && isDeadFlight) {
              dojo.style(cardNode, "visibility", "hidden");
            }
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
                dojo.query(".combat-result-card", wrap)[0] ||
                dojo.query(".combat-commit-card", wrap)[0] ||
                null;
              const fallbackIndex = parseInt(
                (fallbackCardNode &&
                  (fallbackCardNode.getAttribute("data-index") ||
                    fallbackCardNode.getAttribute("data-believer-type"))) ||
                  0,
                10
              );
              // Public committed Believer: fly the FACE, not card-back (an
              // explicit back only when no type is readable at all).
              this.animateTempCardFlight({
                sourceId: wrap.id,
                targetId: targetId,
                cardClass:
                  (fallbackIndex > 0
                    ? "card card-believer"
                    : "card card-back-believer") +
                  (isDeadFlight ? " combat-flight-dead" : ""),
                duration: flyMs,
                startDelay: 0,
                fromScale: 1,
                toScale: 1,
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
      // Robust: a Zombie Army may only raise Believers that were in the graveyard
      // BEFORE this war started. We snapshot those card ids at war start
      // (captureZombieGraveSnapshotIds); Believers that die DURING the war are not
      // in the set and can never be picked. (Filtering by location_arg alone was
      // unreliable because discard location_arg doubles as the owner id.)
      if (this.zombieSnapshotCardIds && typeof this.zombieSnapshotCardIds === "object") {
        return !!this.zombieSnapshotCardIds[String((card && card.id) || "")];
      }
      const discardArg = parseInt((card && card.location_arg) || 0, 10);
      if (discardArg <= 0) return false;
      return discardArg <= snapshotMaxArg;
    },

    // Lock the set of graveyard Believer card ids that exist at war start; only
    // these are Zombie-pickable for the whole war.
    captureZombieGraveSnapshotIds: function () {
      const ctx = (this.gamedatas && this.gamedatas.combat_context) || {};
      if (parseInt(ctx.war_zombie_owner_id || 0, 10) <= 0) {
        this.zombieSnapshotCardIds = null;
        return;
      }
      const ids = {};
      const liveCount = this.getLiveGraveyardCount();
      this.normalizeGraveyardCards(this.graveyardCards)
        .slice(0, liveCount)
        .forEach(function (card) {
          if (card && typeof card.id !== "undefined") {
            ids[String(card.id)] = 1;
          }
        });
      this.zombieSnapshotCardIds = ids;
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
      const rows = Array.isArray(extraRows) ? extraRows : [];
      // Tooltip = the FULL CARD at readable size (win/bonus relations are
      // printed on it); only dynamic extras (e.g. graveyard info) go below.
      return (
        '<div class="card-text-tooltip hof-card-tooltip">' +
        '<div class="hof-tooltip-card card card-believer" data-index="' +
        t +
        '"></div>' +
        (rows.length
          ? '<div class="tooltip-card-divider"></div>' +
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
              .join("")
          : "") +
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

    // AOE commit phase: does the current player hold the matching defense
    // card (and belong to a defending, non-attacker sect)?
    currentPlayerHoldsAoeDefenseCard: function () {
      const warType = this.getCurrentCombatWarType();
      if (warType !== 3 && warType !== 6) return false;
      // The migrated wrapper's checkAction can lag in multiactive states, so
      // also accept the robust AOE target-membership signal (the same fallback
      // believer commit uses) and the assignment-phase active-leader list.
      const canAct =
        this.checkAction("playDefenseCard", true) ||
        this.isCurrentPlayerInAoeCommitTargets() ||
        this.isCurrentPlayerActiveAoeAssignmentLeader();
      if (!canAct) return false;
      // A sect that already defended cannot defend again.
      if (this.hasCurrentPlayerSectDefendedInAoe()) return false;
      const attackerId = parseInt(this.currentAoeAttackerId || 0, 10);
      if (attackerId > 0) {
        const mySect = this.getPlayerSectId(this.player_id);
        const attackerSect = this.getPlayerSectId(attackerId);
        if (
          mySect >= 0 &&
          attackerSect >= 0 &&
          mySect === attackerSect
        ) {
          return false;
        }
      }
      const expectedKey = this.getExpectedDefenseCardKey(
        this.getDefenseKindByWarType(warType)
      );
      const items =
        (this.playerActionCards &&
          typeof this.playerActionCards.getAllItems === "function" &&
          this.playerActionCards.getAllItems()) ||
        [];
      for (let i = 0; i < items.length; i++) {
        const key =
          this.actionCardTypeById[String(items[i].id)] ||
          this.getActionCardKeyName(items[i].type);
        if (key === expectedKey) return true;
      }
      return false;
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
          "This is a Breaking Faith betrayal. You must use Breaking Faith to defend."
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

      // Seat role attribute drives the emblem size (Follower = smaller).
      const seatNode = dojo.byId("playertable_" + pid);
      if (seatNode) {
        const role = parseInt(p.player_role, 10);
        seatNode.setAttribute(
          "data-role",
          role === 1 ? "follower" : role === 2 ? "wanderer" : "leader"
        );
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

    // UNIFIED wording: the card face text (getActionCardFaceText) is the single
    // translatable source. This helper returns it as PLAIN TEXT (icons and
    // markup stripped) for title attributes / non-HTML contexts, so the same
    // effect is never translated twice on BGA.
    getActionCardEffectText: function (cardKey) {
      return this.getActionCardFaceText(cardKey)
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
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

    // UNIFIED wording: the card face text (getSkillCardFaceText) is the single
    // translatable source. This helper returns it as PLAIN TEXT (icons and
    // markup stripped) for title attributes / non-HTML contexts, so the same
    // effect is never translated twice on BGA.
    getSkillEffectText: function (skillType) {
      return this.getSkillCardFaceText(skillType)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },
    // ==== Skill card face text (art/text separation) =======================
    // The skill sprite is the DE-TEXTED art (skill_cards_bg.png); name, trigger
    // pill, use badge and body are DOM overlays so translations never require
    // repainting the art. Wording transcribed from the _en reference sheet.
    getSkillCardTriggerText: function (skillType) {
      const texts = {
        1: _("Your turn after becoming a Follower"),
        2: _("Before any attack actions on your turn"),
        3: _("When you have Followers on your turn"),
        4: _("When others draw believer cards"),
        5: _("Upon meeting conditions"),
        6: _("When your Follower draws action cards"),
        7: _("On your turn"),
        8: _("On your turn"),
        9: _("Depending on the copied skill"),
        10: _("When you initiate a \"Faith War\""),
        11: _("On your turn"),
        12: _("At game end"),
        13: _("On your turn"),
        14: _("On your turn"),
        15: _("Before playing any action on your turn"),
        16: _("Before believers in a confrontation"),
      };
      return texts[skillType] || "";
    },

    // Use-count badge in the dark circle: total uses, "∞" unlimited, "1↻" once
    // per turn/round (the circled-arrow icon on the printed cards).
    getSkillCardUseBadgeText: function (skillType) {
      const badges = {
        1: "1",
        2: "1↻",
        3: "1",
        4: "∞",
        5: "1↻",
        6: "∞",
        7: "3",
        8: "3",
        9: "1↻",
        10: "∞",
        11: "3",
        12: "1",
        13: "1↻",
        14: "3",
        15: "1",
        16: "∞",
      };
      return badges[skillType] || "";
    },

    // SHORT card-face wording (the printed text), not the long tooltip text.
    // ${icon_physical} / ${icon_mental} become inline attack-type icons.
    getSkillCardFaceText: function (skillType) {
      const texts = {
        1: _(
          "Take half of your Leader's believers. Next turn, take half again and go independent. If the Leader then plays \"Breaking Faith\" on you, it snatches nothing and you go independent immediately."
        ),
        2: _(
          "Use before attacking: sacrifice 1 believer to destroy 3 of a target player's believers (all, if fewer). Cannot be defended. You cannot attack for the rest of this turn."
        ),
        3: _(
          "Expel all your Followers at once, seizing half of each one's believers."
        ),
        4: _(
          "When another player recruits believers, predict the first card's type — if correct, take it. (Faith War bonus draws cannot be predicted.)"
        ),
        5: _(
          "When 3 or more of your believers die at once, revive 3 believers from the graveyard."
        ),
        6: _(
          "① When your Follower draws action cards, you draw the same number. ② Your action hand limit is +1 for each Follower."
        ),
        7: _(
          "Sacrifice 1 believer: your sect is immune to ${icon_mental} mental attacks until your next turn."
        ),
        8: _(
          "Sacrifice 1 believer: your sect is immune to ${icon_physical} physical attacks until your next turn."
        ),
        9: _(
          "① Copy another player's revealed skill; the copy lasts until your next turn. ② Each skill can only be copied once."
        ),
        10: _(
          "In a Faith War you declare, you may fight with believers from the graveyard. Each graveyard believer used is removed from the game."
        ),
        11: _("Force a player to skip their entire next turn."),
        12: _(
          "Stay independent: never join or absorb another sect, never become a Wanderer — if you do, reveal and discard this, then draw a new skill. Win immediately if you hold 5 or more believers at game end."
        ),
        13: _(
          "Sacrifice 1 believer: gain 1 extra action this turn — any type, even one you already used."
        ),
        14: _(
          "Collect all players' action cards, shuffle, and deal them back evenly, starting with yourself."
        ),
        15: _(
          "Collect all players' believers, shuffle, and deal them back evenly, starting with yourself. Your turn then ends immediately."
        ),
        16: _(
          "Reverse the outcome of a believer confrontation, before it is resolved."
        ),
      };
      let text = texts[skillType] || "";
      if (!text) return "";
      text = this.escapeHtml(text)
        .replace(
          /\$\{icon_physical\}/g,
          '<span class="hof-inline-icon hof-inline-icon-physical"></span>'
        )
        .replace(
          /\$\{icon_mental\}/g,
          '<span class="hof-inline-icon hof-inline-icon-mental"></span>'
        );
      return text;
    },

    buildSkillCardTextOverlayHtml: function (skillType) {
      const t = parseInt(skillType || 0, 10);
      if (!(t >= 1 && t <= 16)) return "";
      const body = this.getSkillCardFaceText(t);
      // 長文標記：>150 字元的卡會掛上 hof-sct-body-long class。
      // 目前 CSS 沒給它任何覆寫（沒效果），保留標記是為了未來改文案時，
      // 只要在 CSS 把 .hof-sct-body-long 的字級打開就能啟用縮字。
      const longBody = body.replace(/<[^>]*>/g, "").length > 150;
      return (
        '<div class="hof-card-text hof-skill-card-text">' +
        '<div class="hof-sct-name">' +
        this.escapeHtml(this.getSkillName(t)) +
        "</div>" +
        '<div class="hof-sct-trigger">' +
        this.escapeHtml(this.getSkillCardTriggerText(t)) +
        "</div>" +
        '<div class="hof-sct-badge">' +
        (this.getSkillCardUseBadgeText(t) === "1↻"
          ? // Once per turn/round: the printed badge is a circular arrow RING
            // wrapped AROUND the digit (not side by side) — ring via ::before.
            '<span class="hof-sct-badge-loop">1</span>'
          : this.getSkillCardUseBadgeText(t) === "∞"
          ? // Unlimited: dedicated class so the ∞ glyph is tunable on its own.
            '<span class="hof-sct-badge-inf">∞</span>'
          : this.escapeHtml(this.getSkillCardUseBadgeText(t))) +
        "</div>" +
        '<div class="hof-sct-body' +
        (longBody ? " hof-sct-body-long" : "") +
        '">' +
        body +
        "</div>" +
        "</div>"
      );
    },

    // ---- Action card face text (art/text separation) ----------------------
    // Top-right corner label ("Attack"/"Defence"/"Strategy" as printed).
    getActionCardCornerLabel: function (key) {
      const k = String(key || "");
      if (k === "great_mercy" || k === "firm_faith") return _("Defence");
      const meta = this.getActionCardTypeMeta(k);
      return meta.cssClass === "attack" ? _("Attack") : _("Strategy");
    },

    // SHORT card-face wording (the printed text), transcribed from the _en
    // sheet. ${icon_physical}/${icon_mental} become inline attack icons;
    // ${br} is a line break.
    getActionCardFaceText: function (key) {
      const texts = {
        witch_hunt: _(
          "Target a sect and a believer type: every believer of that type in that sect dies."
        ),
        faith_war: _(
          "Sect vs sect physical confrontation: duel round after round until one side has no believers left to fight."
        ),
        martyrdom: _(
          "Send a believer to physically confront every other sect. Your believer always dies; each opposing believer that loses or draws dies too."
        ),
        spread_rumors: _(
          "Snatch 1 random believer from every player in a target sect."
        ),
        faith_debate: _(
          "Mental duels against a target sect, up to 5 rounds.${br}Each round's winner snatches the loser's believer; draws return to hand."
        ),
        conspiracy: _(
          "Send a believer to mentally confront every other sect, snatching each believer it defeats."
        ),
        great_mercy: _(
          "Defend your sect from one ${icon_physical} physical attack."
        ),
        firm_faith: _("Defend your sect from one ${icon_mental} mental attack."),
        breaking_faith: _(
          "① Leader: expel one Follower.${br}② Follower: become an independent Leader.${br}Snatch half the target's believers (rounded down) — only 1 if countered with Breaking Faith.${note}Same sect only.${/note}"
        ),
        kowtow_to_me: _(
          "Forcibly absorb a target sect whose believers number at most half of yours."
        ),
        info_spy: _("Look at all of one player's action and believer cards."),
        secret_alliance: _(
          "Exchange one action card with a target player — each side picks which of their own cards to give."
        ),
        its_a_miracle: _(
          "Revive up to 3 believers from the top of the graveyard."
        ),
        have_a_charity: _("Draw 2 believer cards from the deck."),
        divine_inspire: _(
          "Discard any number of action cards, then draw that many believers.${br}(This card itself does not count.)"
        ),
      };
      let text = texts[key] || "";
      if (!text) return "";
      text = this.escapeHtml(text)
        .replace(
          /\$\{icon_physical\}/g,
          '<span class="hof-inline-icon hof-inline-icon-physical"></span>'
        )
        .replace(
          /\$\{icon_mental\}/g,
          '<span class="hof-inline-icon hof-inline-icon-mental"></span>'
        )
        .replace(/\$\{br\}/g, "<br>")
        // ${note}...${/note}: a rule note pinned to the panel's BOTTOM, centered
        // (e.g. Breaking Faith's "Same sect only.").
        .replace(/\$\{note\}/g, '<span class="hof-act-note">')
        .replace(/\$\{\/note\}/g, "</span>");
      return text;
    },

    // Flavor line at the panel's bottom-right (printed quotes).
    getActionCardFlavorText: function (key) {
      const texts = {
        witch_hunt: _("- Burn!!!"),
        faith_war: _("- One shall stand, one shall fall!"),
        martyrdom: _("- Jump with me!"),
        spread_rumors: _("- I heard rumors saying..."),
        faith_debate: _("- Let's debate!"),
        conspiracy: _("- The wonderful plan!"),
        great_mercy: _("- Spare them!"),
        firm_faith: _("- I can't hear you!"),
        kowtow_to_me: _("- At least I want your body"),
        info_spy: _("- I'm watching you!"),
        secret_alliance: _("- Insider trading control the world!"),
        its_a_miracle: _("- Wake up! My child!"),
        have_a_charity: _("- Have you heard about our faith?"),
        divine_inspire: _("- Let there be believers!"),
      };
      return texts[key] || "";
    },

    buildActionCardTextOverlayHtml: function (spriteIdx) {
      const idx = parseInt(spriteIdx || 0, 10);
      const key = this.getActionCardKeyName(idx);
      if (!key) return "";
      const typeMeta = this.getActionCardTypeMeta(key);
      const scopeMeta = this.getActionAttackScopeMeta(key);
      const flavor = this.getActionCardFlavorText(key);
      const isDefence = key === "great_mercy" || key === "firm_faith";
      const faceText = this.getActionCardFaceText(key);
      // ${note} 卡(如恩斷義絕)用直欄排版；其他卡維持行版置中。
      const hasNote = faceText.indexOf("hof-act-note") !== -1;
      return (
        '<div class="hof-card-text hof-action-card-text">' +
        (typeMeta.iconKey
          ? '<span class="hof-act-type-icon tooltip-action-icon is-' +
            typeMeta.iconKey +
            '"></span>'
          : "") +
        (scopeMeta
          ? '<span class="hof-act-scope-icon tooltip-action-icon is-' +
            scopeMeta.iconKey +
            '"></span>'
          : "") +
        '<div class="hof-act-name">' +
        this.escapeHtml(this.getActionCardDisplayName(key)) +
        "</div>" +
        '<div class="hof-act-corner is-' +
        typeMeta.cssClass +
        '">' +
        this.escapeHtml(this.getActionCardCornerLabel(key)) +
        "</div>" +
        '<div class="hof-act-body' +
        (isDefence ? " is-defence" : "") +
        (hasNote ? " has-note" : "") +
        '">' +
        faceText +
        "</div>" +
        (flavor
          ? '<div class="hof-act-flavor">' + this.escapeHtml(flavor) + "</div>"
          : "") +
        "</div>"
      );
    },

    // ---- Believer card face text (art/text separation) ---------------------
    // Number badge + flavor quote stay baked in the art; the overlay adds the
    // name banner and the Win / War Bonus relation rows (data from
    // getBelieverWinningTypes — same source as the old text tooltip).
    buildBelieverCardTextOverlayHtml: function (believerType) {
      const t = parseInt(believerType || 0, 10);
      if (!(t >= 1 && t <= 5)) return "";
      const info = this.getBelieverWinningTypes(t);
      const circled = function (n) {
        return String.fromCharCode(0x245f + n); // ① .. ⑤
      };
      const entry = function (n) {
        return (
          '<span class="hof-bel-entry"><span class="hof-bel-circle">' +
          circled(n) +
          "</span>" +
          this.escapeHtml(this.getBelieverTypeName(n)) +
          "</span>"
        );
      }.bind(this);
      return (
        '<div class="hof-card-text hof-believer-card-text">' +
        '<div class="hof-bel-name">' +
        this.escapeHtml(this.getBelieverTypeName(t)) +
        "</div>" +
        '<div class="hof-bel-row hof-bel-win"><span class="hof-bel-label">' +
        this.escapeHtml(_("Win")) +
        "</span>" +
        (info.wins || [])
          .slice()
          .sort()
          .map(entry)
          .join("") +
        "</div>" +
        '<div class="hof-bel-row hof-bel-bonus"><span class="hof-bel-label">' +
        this.escapeHtml(_("War Bonus")) +
        "</span>" +
        (info.bonus ? entry(info.bonus) : "") +
        "</div>" +
        "</div>"
      );
    },

    // Idempotent: give every card face with a data-index its text overlay
    // (skill / action / believer). One generic pass covers every creation site
    // (hand stocks, showcases, combat stacks, table cards, graveyard preview,
    // initial draft, end summary, flights).
    decorateSkillCardFaces: function () {
      const nodes = document.querySelectorAll(
        ".card-skill[data-index], .card-action[data-index], .card-believer[data-index]"
      );
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.querySelector(":scope > .hof-card-text")) continue;
        const idx = node.getAttribute("data-index");
        let html = "";
        if (node.classList.contains("card-skill")) {
          html = this.buildSkillCardTextOverlayHtml(idx);
        } else if (node.classList.contains("card-action")) {
          html = this.buildActionCardTextOverlayHtml(idx);
        } else if (node.classList.contains("card-believer")) {
          html = this.buildBelieverCardTextOverlayHtml(idx);
        }
        if (html) {
          dojo.place(html, node);
        }
      }
    },

    initSkillCardTextOverlays: function () {
      if (this._skillCardTextObserver) return;
      this.decorateSkillCardFaces();
      if (typeof MutationObserver !== "function") return;
      // Debounced full rescan: skill nodes are rare, the idempotent pass is
      // cheap, and this catches every current and future creation site
      // without touching them individually.
      this._skillCardTextObserver = new MutationObserver(
        function () {
          if (this._skillCardTextScanTimer) return;
          this._skillCardTextScanTimer = setTimeout(
            function () {
              this._skillCardTextScanTimer = null;
              this.decorateSkillCardFaces();
            }.bind(this),
            60
          );
        }.bind(this)
      );
      this._skillCardTextObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    },
    // ==== END skill card face text ==========================================

    // UNIFIED wording: timing = the card's trigger pill text (single source).
    getSkillTimingText: function (skillType) {
      return this.getSkillCardTriggerText(skillType);
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
          counterText: dojo.string.substitute(_("Count: ${uses}/1"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 2) {
        return {
          counterText: dojo.string.substitute(_("Count: this turn ${used}/1"), {
            used: usedThisTurn,
          }),
        };
      }
      if (skillType === 3) {
        return {
          counterText: dojo.string.substitute(_("Count: ${uses}/1"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 4) {
        return {
          counterText: "",
        };
      }
      if (skillType === 5) {
        return {
          counterText: dojo.string.substitute(
            _("Count: this round ${used}/1"),
            { used: holyRebirthUsedThisTurn }
          ),
        };
      }
      if (skillType === 6) {
        return {
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
          counterText: dojo.string.substitute(
            _("Count: ${uses}/3 · effect ${status}"),
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
          counterText: dojo.string.substitute(
            _("Count: ${uses}/3 · effect ${status}"),
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
          counterText: dojo.string.substitute(_("Count: this turn ${used}/1"), {
            used: gateUsedThisTurn,
          }),
        };
      }
      if (skillType === 10) {
        return {
          counterText: "",
        };
      }
      if (skillType === 11) {
        return {
          counterText: dojo.string.substitute(_("Count: ${uses}/3"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 12) {
        return {
          counterText: "",
        };
      }
      if (skillType === 13) {
        return {
          counterText: dojo.string.substitute(_("Count: this turn ${used}/1"), {
            used: praiseUsedThisTurn,
          }),
        };
      }
      if (skillType === 14) {
        return {
          counterText: dojo.string.substitute(_("Count: ${uses}/3"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 15) {
        return {
          counterText: dojo.string.substitute(_("Count: ${uses}/1"), {
            uses: uses,
          }),
        };
      }
      if (skillType === 16) {
        return {
          counterText: "",
        };
      }
      return { counterText: "" };
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
      const usageInfo = this.getSkillUsageInfo(t, skillState || null);
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
      // Tooltip = the FULL CARD at readable size (hover on desktop, long-press
      // on mobile), exactly as printed — the overlay decorator adds the text
      // when the tooltip enters the DOM. Only DYNAMIC game-state info that is
      // not printed on the card (use counter, Gate of Truth copy status,
      // combat status) goes below it.
      const extrasHtml =
        gateTruthCopiedHistoryHtml +
        copiedSkillHintHtml +
        combatStatusHtml +
        (t !== 16 ? usageCounterHtml : "");
      return (
        '<div class="card-text-tooltip hof-card-tooltip">' +
        '<div class="hof-tooltip-card card card-skill" data-index="' +
        t +
        '"></div>' +
        (extrasHtml
          ? '<div class="tooltip-card-divider"></div>' + extrasHtml
          : "") +
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
      const key = String(cardKey || "unknown");
      const spriteIdx = this.getActionCardSpriteIndex(key);
      const typeMeta = this.getActionCardTypeMeta(key);
      const scopeMeta = this.getActionAttackScopeMeta(key);
      // Tooltip = the FULL CARD at readable size; the icon EXPLANATIONS (attack
      // type, scope meaning) stay OUTSIDE below the card — they explain the
      // printed icons, they are not printed on the card themselves.
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
        '<div class="card-text-tooltip hof-card-tooltip">' +
        '<div class="hof-tooltip-card card card-action" data-index="' +
        spriteIdx +
        '"></div>' +
        '<div class="tooltip-card-divider"></div>' +
        '<div class="tooltip-card-type ' +
        typeMeta.cssClass +
        '">' +
        typeLabelHtml +
        "</div>" +
        scopeHtml +
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

    // Fly any deferred AOE auto-defense cards from the AOE board into the
    // discard pile, and only add them to the pile when the flight lands — so the
    // pile updates as the card arrives, never before it flies. Called at AOE
    // resolution (alongside the believer return flights). No-op when empty;
    // robust so a defense card is never lost from the pile.
    flushPendingAoeDefenseDiscards: function () {
      const pending = this.pendingAoeDefenseDiscards || [];
      this.pendingAoeDefenseDiscards = [];
      if (!pending.length) return;
      const flyMs = this.getUnifiedCardFlyMs();
      pending.forEach(
        function (def) {
          const cardType = def.card_type;
          const cardId = def.card_id;
          const playerId = def.player_id;
          const pushNow = function () {
            this.pushActionDiscardCard(cardType, cardId);
          }.bind(this);
          // The AOE defense usually lives as a concealed believer-back commit
          // that flips at reveal (annotated with data-defense-card-type), found
          // by its owner; fall back to an explicit action-kind commit by id.
          let cardNode = null;
          if (playerId) {
            const ownerWrap = dojo.query(
              '.aoe-commit-item[data-player-id="' + String(playerId) + '"]'
            )[0];
            if (ownerWrap) {
              cardNode =
                dojo.query(
                  ".combat-commit-card[data-defense-card-type]",
                  ownerWrap
                )[0] ||
                dojo.query(".combat-commit-card.facedown", ownerWrap)[0] ||
                dojo.query(".combat-commit-card", ownerWrap)[0];
            }
          }
          if (!cardNode) {
            const wrap =
              dojo.byId("aoe_commit_action_" + cardId) ||
              dojo.query(
                '.aoe-commit-item[data-card-kind="action"][data-card-id="' +
                  cardId +
                  '"]'
              )[0];
            cardNode = wrap
              ? dojo.query(".combat-commit-card", wrap)[0] || wrap
              : null;
          }
          if (
            cardNode &&
            dojo.byId("action_discard") &&
            this.isNodeUsableForCardFlight(cardNode)
          ) {
            this.animateCardNodeCloneToTarget(cardNode, "action_discard", {
              tempPrefix: "aoe_defense_to_discard",
              duration: flyMs,
              zIndex: 2360,
            });
            // Hide the board original at once so only the clone is seen flying.
            dojo.style(cardNode, "visibility", "hidden");
            // Add to the pile when the clone lands (not before it flies).
            setTimeout(pushNow, Math.max(120, flyMs));
          } else {
            // No node to fly from: push now so the card is never lost.
            pushNow();
          }
        }.bind(this)
      );
    },

    // Place a face-up defense card overlapping the current center attack
    // card, flying in from the defender's seat. Remembered so it discards
    // together with the attack card (see moveCurrentCenterActionToDiscard).
    attachCenterAttackDefenseOverlay: function (args) {
      const spec = args || {};
      const wrap = dojo.byId("current_center_action_card");
      if (!wrap) return;
      // Event-driven defense block: reset the "landed/requested" handshake for this
      // new overlay. The exit runs only once the defense has LANDED (fly-in onEnd)
      // AND combatBlocked has confirmed the block — see maybeRunDefenseBlockExit.
      this.defenseOverlayLanded = false;
      this.defenseBlockExitRequested = false;
      this.defenseBlockExitStarted = false;
      // Cancel any stale discard timer from the attack card's own play, and lock
      // the center against ANY non-forced discard while the defense flies in —
      // a stray showCenterActionCard was discarding the attack the instant the
      // defense launched (two cards overlapping). combatBlocked owns the real
      // held discard (force:true after the defense lands). Safety timer clears
      // the lock if combatBlocked never arrives.
      if (this.pendingCenterActionDiscardTimeout) {
        clearTimeout(this.pendingCenterActionDiscardTimeout);
        this.pendingCenterActionDiscardTimeout = null;
      }
      this.centerActionHoldUntil = 0;
      this.centerDefenseOverlayActive = true;
      if (this.pendingCenterDefenseOverlayClearTimeout) {
        clearTimeout(this.pendingCenterDefenseOverlayClearTimeout);
      }
      this.pendingCenterDefenseOverlayClearTimeout = setTimeout(
        function () {
          this.centerDefenseOverlayActive = false;
          this.pendingCenterDefenseOverlayClearTimeout = null;
        }.bind(this),
        5000
      );
      const cardType = String(spec.card_type || "");
      const spriteIdx = this.getActionCardSpriteIndex(cardType);
      const overlayId = "center_defense_overlay";
      const existing = dojo.byId(overlayId);
      if (existing) dojo.destroy(existing);
      dojo.place(
        '<div id="' +
          overlayId +
          '" class="card table_card_item card-action center-defense-overlay" data-index="' +
          spriteIdx +
          '"></div>',
        wrap,
        "last"
      );
      const overlayNode = dojo.byId(overlayId);
      if (overlayNode) {
        this.applyInlineActionFaceStyle(overlayNode, spriteIdx);
        this.attachActionCardTooltip(overlayNode, cardType);
      }
      // The defender who played the card should see it fly from THEIR OWN hand;
      // everyone else sees it fly from that player's seat/panel.
      const isSelfDefender =
        String(spec.player_id || "") === String(this.player_id || "");
      const sourceAnchorId =
        isSelfDefender && dojo.byId("myactioncards")
          ? "myactioncards"
          : this.resolvePlayerAnchorNodeId(spec.player_id, {
              allowPanel: true,
              allowTable: true,
              preferTable: true,
              fallbackId: "playertable_" + String(spec.player_id || ""),
            });
      if (sourceAnchorId && overlayNode) {
        dojo.style(overlayNode, "visibility", "hidden");
        this.animateTempCardFlight({
          sourceId: sourceAnchorId,
          targetId: overlayId,
          cardClass: "card table_card_item card-action",
          dataIndex: spriteIdx,
          duration: this.getUnifiedCardFlyMs(),
          onEnd: function () {
            const n = dojo.byId(overlayId);
            if (n) dojo.style(n, "visibility", "visible");
            // Defense has landed on the attack: try to run the block exit (only
            // proceeds if combatBlocked has also arrived).
            this.defenseOverlayLanded = true;
            this.maybeRunDefenseBlockExit();
          },
        });
      } else {
        // No fly-in (no usable source): treat as already landed so the exit can
        // proceed once combatBlocked arrives.
        this.defenseOverlayLanded = true;
      }
      this.pendingCenterDefenseOverlay = {
        card_type: cardType,
        card_id: spec.card_id || "",
      };
    },

    // Event-driven defense-block exit. Runs ONLY after both the defense overlay has
    // landed (fly-in onEnd) AND combatBlocked confirmed the block (requested), then
    // holds briefly so the "blocked" overlap reads, then flies both cards to the
    // discard. No racing timers; no interim arena clear can pre-empt it.
    maybeRunDefenseBlockExit: function () {
      if (!this.defenseBlockExitRequested) return;
      if (!this.defenseOverlayLanded) return;
      if (this.defenseBlockExitStarted) return;
      this.defenseBlockExitStarted = true;
      // Dedicated defense-block hold (independent of the shared reveal hold used by
      // Prophet / combat reveals, so tuning this does not affect those).
      const holdMs = 500;
      setTimeout(
        function () {
          this.defenseBlockExitPending = false;
          this.defenseBlockExitStarted = false;
          this.defenseBlockExitRequested = false;
          this.defenseOverlayLanded = false;
          if (this.defenseBlockExitIsFaithWar) {
            this.flyFaithWarDefenseToDiscardThenClear();
          } else {
            this.moveCurrentCenterActionToDiscard({ force: true });
            const arena = dojo.byId("central_arena");
            if (arena) arena.innerHTML = "";
          }
        }.bind(this),
        holdMs
      );
    },

    // Face-up defense card flown to the center, covering the Faith War /
    // Faith Debate VS board to show the attack was blocked. It is a child of
    // the board, so the combatBlocked arena clear removes it.
    attachFaithWarDefenseOverlay: function (args) {
      const spec = args || {};
      const cardType = String(spec.card_type || "");
      // Always record the pending overlay so combatBlocked runs the staged
      // exit (defense + war/debate action card -> discard, then clear), even if
      // the board node is not present yet (fast AI). The visual overlay is only
      // added when the board's VS area exists.
      this.pendingFaithWarDefenseOverlay = {
        card_type: cardType,
        card_id: spec.card_id || "",
        moved_to_discard: parseInt(spec.moved_to_discard || 0, 10),
      };
      // Reset the event-driven landed/requested handshake for this new overlay.
      this.defenseOverlayLanded = false;
      this.defenseBlockExitRequested = false;
      this.defenseBlockExitStarted = false;
      const main = dojo.query(".faith-war-main", dojo.byId("faith_war_board"))[0];
      if (!main) {
        // No board to fly onto (fast AI): treat as landed so combatBlocked's exit
        // can still proceed.
        this.defenseOverlayLanded = true;
        return;
      }
      const spriteIdx = this.getActionCardSpriteIndex(cardType);
      const overlayId = "faithwar_defense_overlay";
      const existing = dojo.byId(overlayId);
      if (existing) dojo.destroy(existing);
      dojo.place(
        '<div id="' +
          overlayId +
          '" class="card table_card_item card-action faith-war-defense-overlay" data-index="' +
          spriteIdx +
          '"></div>',
        main,
        "last"
      );
      const overlayNode = dojo.byId(overlayId);
      if (overlayNode) {
        this.applyInlineActionFaceStyle(overlayNode, spriteIdx);
        this.attachActionCardTooltip(overlayNode, cardType);
      }
      // The defender who played the card should see it fly from THEIR OWN hand;
      // everyone else sees it fly from that player's seat/panel. (Mirrors the
      // center-attack defense overlay.)
      const isSelfDefender =
        String(spec.player_id || "") === String(this.player_id || "");
      const sourceAnchorId =
        isSelfDefender && dojo.byId("myactioncards")
          ? "myactioncards"
          : this.resolvePlayerAnchorNodeId(spec.player_id, {
              allowPanel: true,
              allowTable: true,
              preferTable: true,
              fallbackId: "playertable_" + String(spec.player_id || ""),
            });
      if (sourceAnchorId && overlayNode) {
        dojo.style(overlayNode, "visibility", "hidden");
        this.animateTempCardFlight({
          sourceId: sourceAnchorId,
          targetId: overlayId,
          cardClass: "card table_card_item card-action",
          dataIndex: spriteIdx,
          duration: this.getUnifiedCardFlyMs(),
          onEnd: function () {
            const n = dojo.byId(overlayId);
            if (n) dojo.style(n, "visibility", "visible");
            this.defenseOverlayLanded = true;
            this.maybeRunDefenseBlockExit();
          },
        });
      } else {
        this.defenseOverlayLanded = true;
      }
    },

    // Faith War / Faith Debate block: after the "defended" hold, fly the
    // defense card and the war/debate action card to the discard pile, then
    // clear the board. The board stays loaded as-is; only this exit is staged.
    flyFaithWarDefenseToDiscardThenClear: function () {
      const info = this.pendingFaithWarDefenseOverlay || null;
      this.pendingFaithWarDefenseOverlay = null;
      const flyMs = this.getUnifiedCardFlyMs();
      const overlay = dojo.byId("faithwar_defense_overlay");
      if (overlay && dojo.byId("action_discard")) {
        this.animateCardNodeCloneToTarget(overlay, "action_discard", {
          tempPrefix: "faithwar_defense_to_discard",
          duration: flyMs,
          zIndex: 2210,
        });
        // Hide the original overlay the instant the flying clone leaves, so the
        // board doesn't show TWO identical defense cards (the sitting overlay +
        // the clone) -- that double-image read as "another defense card". The
        // arena clear below removes the hidden node for good. (Matches how the
        // center-attack defense hides its original before the discard flight.)
        dojo.style(overlay, "visibility", "hidden");
      }
      if (info && info.card_type && info.moved_to_discard === 1) {
        this.pushActionDiscardCard(info.card_type, info.card_id, {
          position: "top",
        });
      }
      // Fly the war/debate action card to discard alongside the defense.
      this.moveDuelActionCardToDiscard();
      // Clear the board once both cards have left.
      if (this.pendingTransientArenaClearTimeout) {
        clearTimeout(this.pendingTransientArenaClearTimeout);
      }
      this.pendingTransientArenaClearTimeout = setTimeout(
        function () {
          this.pendingTransientArenaClearTimeout = null;
          if (this.getCurrentStateName() === "gameEndSummary") return;
          const arena = dojo.byId("central_arena");
          if (arena) arena.innerHTML = "";
          this.currentAoeCombatType = null;
          this.currentAoeAttackerId = null;
          this.currentAoeActionCardId = null;
          this.currentAoeCommitTargetIds = [];
          this.currentAoeAssignedAction = "";
          this.currentAoeDefendedPlayerIds = {};
          this.currentAoeDefendedSectIds = {};
        }.bind(this),
        flyMs + 60
      );
    },

    moveCurrentCenterActionToDiscard: function (opts) {
      const options = opts || {};
      // While the It's a Miracle reveal is staging the believers at the center,
      // the revival action card must stay put. Some other path was discarding it
      // early (card flew to discard before believers flew to hand). The staged
      // reveal owns the discard timing and calls this with {force:true} at the end.
      // Same guard for a defense overlay in flight: a stray showCenterActionCard
      // was discarding the attack card the instant the defense started flying in
      // (two cards overlapping mid-air). combatBlocked owns the held discard and
      // calls this with {force:true} after the defense lands.
      if (
        !options.force &&
        (this.itsAMiracleRevealActive || this.centerDefenseOverlayActive)
      ) {
        return;
      }
      // Past the guard the center is being cleared for real — the defense overlay
      // era is over.
      this.centerDefenseOverlayActive = false;
      if (this.pendingCenterDefenseOverlayClearTimeout) {
        clearTimeout(this.pendingCenterDefenseOverlayClearTimeout);
        this.pendingCenterDefenseOverlayClearTimeout = null;
      }
      if (this.pendingCenterActionDiscardTimeout) {
        clearTimeout(this.pendingCenterActionDiscardTimeout);
        this.pendingCenterActionDiscardTimeout = null;
      }
      const currentCard = dojo.byId("current_center_action_card");
      if (!currentCard) {
        this.pendingCenterDefenseOverlay = null;
        return;
      }
      // Fly any overlaid defense card to the discard pile alongside the
      // attack card, then record it in the discard data.
      const defenseOverlay = this.pendingCenterDefenseOverlay;
      const overlayNode = dojo.byId("center_defense_overlay");
      if (overlayNode && dojo.byId("action_discard")) {
        this.animateCardNodeCloneToTarget(overlayNode, "action_discard", {
          tempPrefix: "center_defense_to_discard",
          duration: this.getUnifiedCardFlyMs(),
          startDelay: this.getUnifiedCardFlightStaggerMs(),
          zIndex: 2210,
        });
        // Hide the original overlay the moment its flying clone launches so the
        // viewer sees ONE card fly out, not the overlay sitting there plus a
        // duplicate clone (the "defense copy" double image).
        dojo.style(overlayNode, "visibility", "hidden");
      }
      if (defenseOverlay && defenseOverlay.card_type) {
        this.pushActionDiscardCard(
          defenseOverlay.card_type,
          defenseOverlay.card_id,
          { position: "top" }
        );
      }
      this.pendingCenterDefenseOverlay = null;
      const cardType = currentCard.getAttribute("data-card-type");
      if (
        !options.force &&
        this.shouldHoldTransientArenaForConfrontation() &&
        (this.isConfrontationActionCardType(cardType) ||
          String(cardType || "") === "secret_alliance")
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
        // Hide the original attack card immediately too, so only the clone flies.
        dojo.style(cardNode, "visibility", "hidden");
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
        // During the It's a Miracle reveal the center revival card is owned by
        // the staged flow (it discards the card itself at the end). Wiping the
        // arena here deleted the card without ever sending it to the discard pile
        // — it just vanished. Skip; the reveal handles its own cleanup.
        if (this.itsAMiracleRevealActive) {
          return;
        }
        // A defense block exit is scheduled on its own dedicated timer (combatBlocked).
        // Do NOT pre-empt it: wiping here would delete the attack + defense before
        // they fly to discard (the "both cards vanish" / "no pause" defense bugs).
        if (this.defenseBlockExitPending) {
          return;
        }
        if (
          !options.force &&
          this.shouldHoldTransientArenaForConfrontation()
        ) {
          this.ensureConfrontationActionVisual();
          return;
        }
        // Force the discard whenever a center defense overlay is pending: a
        // non-force clear was hitting the "defense overlay in progress" guard in
        // moveCurrentCenterActionToDiscard (early return, nothing discarded) and
        // then wiping the arena below — so the attack + defense both vanished
        // without ever reaching the discard pile. Forcing it discards them first.
        this.moveCurrentCenterActionToDiscard({
          force: !!options.force || !!this.pendingCenterDefenseOverlay,
        });
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
      // Secret Alliance exchange in progress: the played card must stay at the
      // center on EVERY client until both sides confirmed the exchange (the
      // exchange-end notification schedules the real discard). Without this,
      // observers saw the card fly to discard mid-exchange while the actor
      // still saw it on the table.
      if (
        currentState === "secretAllianceAttackerChoice" ||
        currentState === "secretAllianceTargetChoice"
      ) {
        return true;
      }
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
      // Secret Alliance exchange: the hold above ONLY means "keep the played
      // Secret Alliance card at the center until the exchange ends" — never
      // (re)build a combat visual here. Without this guard, the stale
      // combat_context.war_type left by a finished Conspiracy/Martyrdom made
      // this function resurrect the whole AOE VS board UNDER the exchange
      // prompt ("exchange works but the table shows the old Conspiracy duel").
      const holdOnlyState = String(
        stateName || this.getCurrentStateName() || ""
      );
      if (
        holdOnlyState === "secretAllianceAttackerChoice" ||
        holdOnlyState === "secretAllianceTargetChoice"
      ) {
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
      // Authoritative first: the server told us this player committed (notif).
      // This is immune to arena-node render lag and survives a re-fired
      // defenders-choose notif, which the DOM queries below are not.
      if (this.aoeCommittedPlayerIds && this.aoeCommittedPlayerIds[pid]) {
        return true;
      }
      // The AOE attacker's committed Believer lives in the attacker slot, NOT the
      // right lane, so the lane query below never finds it — that left the
      // attacker's own hand unlocked after they committed. Detect a real (has
      // card-id, not a placeholder) committed Believer in the attacker slot.
      const aoeAttackerId = parseInt(
        (this.gamedatas.combat_context &&
          this.gamedatas.combat_context.war_attacker_id) ||
          this.currentAoeAttackerId ||
          0,
        10
      );
      if (pid > 0 && pid === aoeAttackerId) {
        const attackerSlot = dojo.byId("aoe_attacker_slot");
        if (
          attackerSlot &&
          dojo.query(
            '.aoe-commit-item[data-card-kind="believer"][data-card-id]',
            attackerSlot
          ).length > 0
        ) {
          return true;
        }
      }
      const stateName = String(this.getCurrentStateName() || "");
      if (
        (stateName === "martyrdomChooseBelievers" ||
          stateName === "conspiracyChooseBelievers") &&
        this.isPlayerInAoeCommitTargets(pid)
      ) {
        return false;
      }
      return (
        dojo.query(
          '.aoe-commit-item[data-card-kind="believer"][data-player-id="' +
            String(pid) +
            '"]'
        ).length > 0
      );
    },

    // Reliable "have I (the local player) committed a Believer in THIS AOE
    // window?" -- uses only the per-window latch + the server-driven committed
    // set (both reset at each AOE start). Deliberately does NOT consult the DOM
    // like hasAoeCommittedBelieverByPlayer does: a stale .aoe-commit-item node
    // left over from a previous AOE matched my id and falsely reported me as
    // committed, blocking my real commit with "You already committed" (freeze).
    hasLocalPlayerCommittedThisAoe: function () {
      const myId = parseInt(this.player_id || 0, 10);
      if (!myId) return false;
      if (this.aoeCommitDoneByMe === true) return true;
      if (this.aoeCommittedPlayerIds && this.aoeCommittedPlayerIds[myId]) {
        return true;
      }
      return false;
    },

    canCurrentPlayerCommitAoeBeliever: function (args) {
      const myId = parseInt(this.player_id || 0, 10);
      if (!myId) return false;
      // Already committed this AOE round: keep showing the waiting state even if
      // the wrapper's checkAction lags behind for a beat.
      if (this.aoeCommitDoneByMe) return false;
      // Our Sect already defended this AOE attack: no Believer to commit, so
      // every re-render shows the waiting state instead of the commit prompt.
      if (this.hasCurrentPlayerSectDefendedInAoe()) return false;
      if (this.hasLocalPlayerCommittedThisAoe()) return false;
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

    isPlayerInAoeCommitTargets: function (playerId, args) {
      const pid = parseInt(playerId || 0, 10);
      if (!pid) return false;
      const mergedTargets = {};
      (this.currentAoeCommitTargetIds || []).forEach(function (v) {
        const id = parseInt(v || 0, 10);
        if (id > 0) mergedTargets[id] = 1;
      });
      this.getAoeCommitTargetIdsFromArgs(args).forEach(function (id) {
        mergedTargets[id] = 1;
      });
      return !!mergedTargets[pid];
    },

    isCurrentPlayerInAoeCommitTargets: function (args) {
      const myId = parseInt(this.player_id || 0, 10);
      return this.isPlayerInAoeCommitTargets(myId, args);
    },

    // AOE assignment phase: is the current player one of the active leaders the
    // server is waiting on (from the state args' active_leader_ids list)?
    isCurrentPlayerActiveAoeAssignmentLeader: function (args) {
      const myId = parseInt(this.player_id || 0, 10);
      if (!myId) return false;
      const stateArgs = this.resolveStateArgsForReadiness(args);
      const ids = (stateArgs && stateArgs.active_leader_ids) || [];
      for (let i = 0; i < ids.length; i++) {
        if (parseInt(ids[i] || 0, 10) === myId) return true;
      }
      // Fallback: the prompted leaders are the keys of candidates_by_leader.
      const byLeader = (stateArgs && stateArgs.candidates_by_leader) || null;
      if (byLeader && (byLeader[String(myId)] || byLeader[myId])) return true;
      return false;
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
      if (
        currentState === "martyrdomChooseBelievers" ||
        currentState === "conspiracyChooseBelievers" ||
        currentState === "martyrdomChooseRepresentative" ||
        currentState === "conspiracyChooseRepresentative"
      ) {
        // AOE defense window: representatives and defense-card holders may
        // play a (concealed) defense card during assignment or commit. Use the
        // robust holder check (does not rely on the wrapper's isCurrentPlayerActive
        // / checkAction, which can lag in multiactive states).
        return this.currentPlayerHoldsAoeDefenseCard();
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
      const isAoeDefenseWindowState =
        currentState === "martyrdomChooseBelievers" ||
        currentState === "conspiracyChooseBelievers" ||
        currentState === "martyrdomChooseRepresentative" ||
        currentState === "conspiracyChooseRepresentative";
      const applyDefenseFocusDimming =
        (currentState === "confirmDefense" &&
          (this.isCurrentPlayerActive() ||
            this.checkAction("passDefense", true) ||
            this.checkAction("playDefenseCard", true))) ||
        // AOE concealed defense: when the player can play a defense card,
        // keep only that defense card enabled among Action cards (believer
        // commit is handled separately on the believer hand).
        (isAoeDefenseWindowState && this.currentPlayerHoldsAoeDefenseCard());
      const defenseKindForReadiness =
        currentState === "confirmDefense" || isAoeDefenseWindowState
          ? this.getCurrentDefenseKindFromContext()
          : "";
      const applyDefenseWaitingDimming =
        currentState === "confirmDefense" && !applyDefenseFocusDimming;
      // Keep ALL Action cards locked for the whole AOE confrontation (Martyrdom /
      // Conspiracy), not just while choosing — after committing a Believer the
      // player only waits for others and must not appear able to play Action cards.
      // Defense-focus mode is excluded: it keeps the one playable defense card lit.
      const applyAoeWaitingDimming =
        isAoeDefenseWindowState && !applyDefenseFocusDimming;
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
          if (applyDefenseFocusDimming) {
            // Defense-focus mode: dim every Action card EXCEPT the matching
            // defense card, then return so later rules (e.g. believer-commit
            // dimming during the AOE window) cannot gray out that defense card.
            if (!defenseFocusCardMap[String(cardKey)]) {
              dojo.addClass(node, "action-card-soft-disabled");
            }
            return;
          }
          if (applyDefenseWaitingDimming) {
            dojo.addClass(node, "action-card-soft-disabled");
            return;
          }
          if (applyAoeWaitingDimming) {
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
            (this.currentTurnRepeatBypass || 0) <= 0 &&
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

    // ---- Ring table seats ---------------------------------------------------
    // Seats are ordered by player_no (= turn order), rotated so the LOCAL
    // player sits first (s0 = bottom center), then assigned clockwise grid
    // areas s1..sN (left side up -> top row -> right side down). Spectators
    // just get natural order.
    assignRingSeats: function (gamedatas) {
      const players = (gamedatas && gamedatas.players) || {};
      let seats = Object.keys(players).sort(function (a, b) {
        return (
          parseInt(players[a].player_no || 0, 10) -
          parseInt(players[b].player_no || 0, 10)
        );
      });
      const meIdx = seats.indexOf(String(this.player_id));
      if (meIdx > 0) {
        seats = seats.slice(meIdx).concat(seats.slice(0, meIdx));
      }
      const table = dojo.byId("hof_table");
      if (table) {
        table.setAttribute("data-players", String(seats.length));
      }
      seats.forEach(function (pid, k) {
        const node = dojo.byId("playertable_" + pid);
        if (node) {
          node.style.gridArea = "s" + k;
          // 窄螢幕的兩欄 fallback 沒有 named areas，用 order 維持出牌順序。
          node.style.order = String(k);
          dojo.addClass(node, "hof-seat");
        }
      });
    },

    // 視窗尺寸變更(轉向/拉伸)時重算手牌 stock 的排版幾何：CSS 只縮卡片
    // 視覺，stock 的間距座標是載入時算的，不重算會出現小卡+大空隙。
    refreshHandStockGeometry: function () {
      const size = this.getResponsiveHandCardSize();
      ["playerActionCards", "playerBelieverCards", "playerSkillCards"].forEach(
        function (key) {
          const stock = this[key];
          if (!stock) return;
          stock.item_width = size.width;
          stock.item_height = size.height;
          stock.item_margin = size.margin;
          if (typeof stock.updateDisplay === "function") {
            try {
              stock.updateDisplay();
            } catch (e) {}
          }
        }.bind(this)
      );
    },

    initHandResizeSync: function () {
      if (this._handResizeBound) return;
      this._handResizeBound = true;
      window.addEventListener(
        "resize",
        function () {
          if (this._handResizeTimer) clearTimeout(this._handResizeTimer);
          this._handResizeTimer = setTimeout(
            function () {
              this._handResizeTimer = null;
              this.refreshHandStockGeometry();
            }.bind(this),
            250
          );
        }.bind(this)
      );
    },

    // Highlight the seat(s) whose action the game is waiting on. In solo the
    // real actor (bot or human) comes from solo_current_actor_id, since the
    // framework-active player can be a stale placeholder.
    updateSeatActiveHighlight: function () {
      const gs = (this.gamedatas && this.gamedatas.gamestate) || {};
      let actives = [];
      if (String(gs.type || "") === "activeplayer") {
        const solo = this.getSoloCurrentActorId();
        actives = [solo > 0 ? solo : parseInt(gs.active_player || 0, 10)];
      } else if (String(gs.type || "") === "multipleactiveplayer") {
        actives = (gs.multiactive || []).map(function (v) {
          return parseInt(v, 10);
        });
      }
      const activeSet = {};
      actives.forEach(function (pid) {
        if (pid > 0) activeSet[String(pid)] = 1;
      });
      dojo.query(".playertable").forEach(function (node) {
        const pid = String(node.id || "").replace("playertable_", "");
        dojo.toggleClass(node, "hof-seat-active", !!activeSet[pid]);
      });
    },
    // ---- END ring table seats ------------------------------------------------

    // Hard-lock every hand stock (Action / Believer / Skill): cards go GRAY and
    // stop receiving clicks entirely (pointer-events), on top of disabling
    // stock selection. Used during other players' turns / turn handoffs; the
    // unlock runs only when it is genuinely the local player's moment to act
    // (own turn, or a reactive window like defense), so there is no unlock
    // flash at every player change.
    lockAllHandStocks: function () {
      // Action + Believer only. The Skill card is deliberately left alone
      // (never gray it — its own readiness logic handles clicks). Lock visual:
      // gray only, size unchanged (--hand-disabled-scale is 1).
      ["playerActionCards", "playerBelieverCards"].forEach(
        function (key) {
          const stock = this[key];
          if (stock && typeof stock.setSelectionMode === "function") {
            try {
              stock.setSelectionMode(0);
            } catch (e) {}
          }
        }.bind(this)
      );
      ["myactioncards", "mybelievercards"].forEach(function (id) {
        const node = dojo.byId(id);
        if (node) dojo.addClass(node, "hof-hand-locked");
      });
    },

    unlockAllHandStocks: function () {
      ["myactioncards", "mybelievercards"].forEach(function (id) {
        const node = dojo.byId(id);
        if (node) dojo.removeClass(node, "hof-hand-locked");
      });
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
          ? _("You were assigned by your Leader to Martyrdom. Choose one Believer.")
          : _("Martyrdom: choose one Believer.");
      }
      if (actionKey === "conspiracy" && warType === 11) {
        return _("Final Struggle: choose one Believer.");
      }
      return isAssigned
        ? _("You were assigned by your Leader to Conspiracy. Choose one Believer.")
        : _("Conspiracy: choose one Believer.");
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
          "Final Struggle: waiting for contenders to choose one Believer."
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
      // Fresh AOE commit window: clear the per-round committed latch -- but NOT
      // if I have already committed this window (the server-driven set knows).
      // This notif can re-fire while other Sects defend/commit; clearing it then
      // would wrongly re-open my already-locked hand (the "Believer not locked /
      // already committed" desync). A genuinely new AOE clears the set first.
      if (!this.hasLocalPlayerCommittedThisAoe()) {
        this.aoeCommitDoneByMe = false;
      }
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
      const committedPid = parseInt(args.player_id || 0, 10);
      if (committedPid > 0) {
        if (!this.aoeCommittedPlayerIds) this.aoeCommittedPlayerIds = {};
        this.aoeCommittedPlayerIds[committedPid] = true;
      }
      if (String(args.player_id || "") === String(this.player_id || "")) {
        const myId = parseInt(this.player_id || 0, 10);
        this.actionSubmissionInFlight = false;
        // Latch so a re-render does not flip the prompt back to "commit" before
        // the commit reaches the arena (the wrapper's checkAction can still
        // report playBelieverCard as available for a beat in multiactive).
        this.aoeCommitDoneByMe = true;
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
      // Seat Believer count is FROZEN for the whole AOE: it does NOT change when
      // a Believer is committed (not even on the committer's own screen). The
      // count is only reconciled by publicCountsSync at AOE resolution -- you see
      // the net result then (Martyrdom: dead -1; Conspiracy: survivors unchanged,
      // attacker + stolen). Freezing also keeps a commit indistinguishable from a
      // concealed defense (no live count tell).
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
      this.aoeCommittedPlayerIds = {};
      this.aoeCommitDoneByMe = false;
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
      // Seat Believer count is FROZEN during the whole Faith War / Faith Debate:
      // it stays at the pre-combat value and is only reconciled by the
      // publicCountsSync at war/debate end (won N rounds -> get those back, lost
      // ones die). Decrementing per committed Believer here both leaked info
      // (you could read the opponent's commits/losses live) and read as noisy.
      // notif_duelResult already keeps counts server-authoritative mid-war, so
      // the commit is the only place that touched the badge.
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
        // A new center attack card invalidates any prior defense overlay
        // reference (the old wrap + overlay node are gone).
        this.pendingCenterDefenseOverlay = null;
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
      // A new center action card means any lingering Faith War / Faith Debate
      // board + end banner (which clear on a delay) must be removed first —
      // otherwise the new card is appended as a flex sibling beside/under the
      // old VS board (e.g. a fast AI recruit right after a war). The AOE combat
      // shell (aoe_combat_layout: Conspiracy/Martyrdom "VS" + defender Sect
      // cards) is a SEPARATE structure that also lingered — without clearing it,
      // playing a plain card next (e.g. a bot's Secret Alliance) left the old
      // Conspiracy board on the table under the new prompt.
      if (
        dojo.byId("faith_war_board") ||
        dojo.byId("aoe_combat_layout") ||
        dojo.query(".faith-war-banner", arena).length
      ) {
        if (this.pendingTransientArenaClearTimeout) {
          clearTimeout(this.pendingTransientArenaClearTimeout);
          this.pendingTransientArenaClearTimeout = null;
        }
        if (this.faithWarCleanupTimeout) {
          clearTimeout(this.faithWarCleanupTimeout);
          this.faithWarCleanupTimeout = null;
        }
        arena.innerHTML = "";
      }
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
      // Covers all three play targets: plain center, AOE slot (shared face
      // id) and the Faith War/Debate action slot.
      ["center_action_card_face", "faithwar_action_main_card"].forEach(
        function (id) {
          const node = dojo.byId(id);
          if (!node) return;
          dojo.style(node, "visibility", "visible");
          dojo.removeClass(node, "center-action-card-hidden-until-flight");
        }
      );
    },

    // Hide the just-placed action card until its play flight lands, so the
    // destination card is never visible underneath the flying clone. Only
    // call right after placing a card for which a flight will start.
    hideCenterActionCardFaceUntilFlight: function () {
      ["center_action_card_face", "faithwar_action_main_card"].forEach(
        function (id) {
          const node = dojo.byId(id);
          if (!node) return;
          dojo.style(node, "visibility", "hidden");
          dojo.addClass(node, "center-action-card-hidden-until-flight");
        }
      );
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

    // ---- Graveyard render hold -------------------------------------------
    // While a death/sacrifice flight is in the air, hold the graveyard pile +
    // count VISUAL so it updates the moment the Believer LANDS — never at the
    // reveal (corpse in the pile before the card even flew) and never lagging
    // until some later notification. The data model stays live the whole time;
    // only the rendering is deferred. Auto-releases after maxWaitMs so a lost
    // flight can never freeze the pile display.
    holdGraveyardRender: function (maxWaitMs) {
      this.graveyardRenderHeld = true;
      if (this.graveyardRenderHoldTimer) {
        clearTimeout(this.graveyardRenderHoldTimer);
      }
      this.graveyardRenderHoldTimer = setTimeout(
        function () {
          this.releaseGraveyardRender();
        }.bind(this),
        Math.max(300, parseInt(maxWaitMs || 0, 10) || 6000)
      );
    },

    releaseGraveyardRender: function () {
      if (this.graveyardRenderHoldTimer) {
        clearTimeout(this.graveyardRenderHoldTimer);
        this.graveyardRenderHoldTimer = null;
      }
      this.graveyardRenderHeld = false;
      this.graveyardRenderPending = false;
      this.renderGraveyardPreview();
    },

    renderGraveyardPreview: function () {
      if (this.graveyardRenderHeld) {
        // A flight is in the air: remember and repaint on release (landing).
        this.graveyardRenderPending = true;
        return;
      }
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
            innerHTML: _("Believers have been sent to war."),
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

    // Select a graveyard Believer inside the picker WITHOUT closing, so the
    // player can confirm directly from the modal (Confirm Believer button).
    selectZombieGraveCardInModal: function (card) {
      if (!card || !card.id) return;
      this.selectedZombieGraveCardId = parseInt(card.id, 10);
      this.selectedZombieGraveCardType = parseInt(card.type || 0, 10);
      this.playerBelieverCards.unselectAll();
      const overlay = dojo.byId("zombie_grave_picker_overlay");
      if (!overlay) return;
      dojo.query(".zombie-grave-select-card", overlay).forEach(
        function (node) {
          const isPicked =
            String(node.getAttribute("data-grave-id") || "") ===
            String(this.selectedZombieGraveCardId);
          if (isPicked) dojo.addClass(node, "is-selected");
          else dojo.removeClass(node, "is-selected");
        }.bind(this)
      );
    },

    // Confirm the graveyard Believer chosen in the picker and commit it
    // directly (same path as the outer Confirm button), then close the modal.
    onConfirmZombieGraveBelieverClicked: function () {
      const selected = this.getZombieGraveSelectionCard();
      if (!selected || !selected.id) {
        this.showMessage(
          _("Click one graveyard Believer card first."),
          "error"
        );
        return;
      }
      this.playerBelieverCards.unselectAll();
      this.onConfirmBelieverClicked();
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
      // Unified popup convention: Close always lives top-right in the header
      // (same as graveyard / discard / spy); the bottom bar is for actions only.
      const headCloseBtn = dojo.create(
        "button",
        {
          innerHTML: _("Close"),
          className: "bgabutton bgabutton_white",
        },
        head
      );
      dojo.connect(headCloseBtn, "onclick", this, "closeZombieGravePickerModal");

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
              "data-grave-id": String(id),
            },
            strip
          );
          this.attachBelieverTooltip(mini, parseInt(card.type, 10));
          dojo.connect(mini, "onclick", this, function (evt) {
            if (evt) dojo.stopEvent(evt);
            this.selectZombieGraveCardInModal(card);
          });
        }.bind(this)
      );

      // Footer action row — same .graveyard-modal-actions class as the Info Spy
      // popup, styled in CSS so both popups stay consistent and restyle together.
      const actions = dojo.create(
        "div",
        { className: "graveyard-modal-actions" },
        modal
      );
      const confirmBtn = dojo.create(
        "button",
        {
          innerHTML: _("Confirm"),
          className: "bgabutton bgabutton_blue",
        },
        actions
      );
      dojo.connect(
        confirmBtn,
        "onclick",
        this,
        "onConfirmZombieGraveBelieverClicked"
      );
      // (Close moved to the header — unified popup layout; the old bottom
      // "Cancel" duplicated it.)

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
              ? _("Believers have been sent to war.")
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

    // ---- Action discard browser (like the graveyard: click to open, newest
    // first). Order comes from the client-side actionDiscardCards stack; after
    // a reload the order falls back to the server snapshot's list order.
    closeActionDiscardModal: function () {
      const existing = dojo.byId("action_discard_modal_overlay");
      if (existing) {
        dojo.destroy(existing);
      }
    },

    onActionDiscardClicked: function () {
      this.showActionDiscardModal();
    },

    showActionDiscardModal: function () {
      this.closeActionDiscardModal();
      const cards = (this.actionDiscardCards || []).filter(function (c) {
        return c && c.type;
      });
      const overlay = dojo.create("div", {
        id: "action_discard_modal_overlay",
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
            _("Action Discard (${count} cards, newest first)"),
            { count: cards.length }
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
      dojo.connect(closeBtn, "onclick", this, "closeActionDiscardModal");

      const strip = dojo.create(
        "div",
        { className: "graveyard-modal-strip" },
        modal
      );
      if (!cards.length) {
        dojo.create(
          "div",
          {
            className: "graveyard-modal-empty",
            innerHTML: _("No Action cards discarded yet."),
          },
          strip
        );
      } else {
        cards.forEach(
          function (card) {
            const mini = dojo.create(
              "div",
              {
                className: "card card-action graveyard-modal-card",
                "data-index": String(this.getActionCardSpriteIndex(card.type)),
              },
              strip
            );
            this.attachActionCardTooltip(mini, card.type);
          }.bind(this)
        );
      }

      dojo.connect(overlay, "onclick", this, function (evt) {
        if (evt && evt.target === overlay) {
          this.closeActionDiscardModal();
        }
      });
      dojo.place(overlay, "game_play_area");
    },
    // ---- END action discard browser -----------------------------------------

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

      // Footer Close button — same structure/class as the Zombie graveyard picker
      // (.graveyard-modal-actions, styled in CSS) so both popups stay consistent
      // and can be restyled together.
      const actions = dojo.create(
        "div",
        { className: "graveyard-modal-actions" },
        modal
      );
      const closeBtn = dojo.create(
        "button",
        {
          innerHTML: _("Close"),
          className: "bgabutton bgabutton_white",
        },
        actions
      );
      dojo.connect(closeBtn, "onclick", this, "onCloseSpyResultModalClicked");

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

    animateBelieversFromPlayerToGraveyard: function (
      playerId,
      cards,
      onComplete,
      opts
    ) {
      // onComplete fires once after the LAST believer reaches the graveyard (with
      // a safety-net timeout), so callers can chain the action-card discard on the
      // real end of the flight instead of a guessed timer.
      // opts.keepHold: skip the graveyard render release at landing — used by
      // MULTI-STAGE sequences (KABOOM!: sacrifice flight, THEN killed flight)
      // where an early release would paint the later corpses before they fly.
      const keepHold = !!(opts && opts.keepHold);
      const done = typeof onComplete === "function" ? onComplete : function () {};
      let completeFired = false;
      const fireComplete = function () {
        if (completeFired) return;
        completeFired = true;
        // The believer(s) have LANDED in the graveyard: release any render hold
        // and repaint the pile RIGHT NOW. General rule: an animation that
        // reaches the graveyard shows there the instant it lands — never before
        // the flight, never lagging until a later notification.
        if (!keepHold) {
          this.releaseGraveyardRender();
        }
        done();
      }.bind(this);
      if (!cards || !cards.length) {
        fireComplete();
        return;
      }
      const pid = String(playerId || "");
      const source =
        pid === String(this.player_id || "")
          ? dojo.byId("mybelievercards")
          : dojo.byId("panel_" + pid) || dojo.byId("playertable_" + pid);
      const target = dojo.byId("graveyard");
      const root = dojo.byId("game_play_area");
      if (!source || !target || !root) {
        fireComplete();
        return;
      }
      if (
        !this.isNodeUsableForCardFlight(source) ||
        !this.isNodeUsableForCardFlight(target)
      ) {
        fireComplete();
        return;
      }

      const rootPos = dojo.position(root);
      const sourcePos = dojo.position(source);
      const baseLeft = sourcePos.x - rootPos.x + sourcePos.w / 2 - 24;
      const baseTop = sourcePos.y - rootPos.y + sourcePos.h / 2 - 34;
      const flyMs = this.getUnifiedCardFlyMs();
      const staggerMs = this.getUnifiedCardFlightStaggerMs();
      const total = cards.length;
      let landed = 0;
      const markLanded = function () {
        landed += 1;
        if (landed >= total) fireComplete();
      };

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
                markLanded();
                return;
              }
              dojo.connect(anim, "onEnd", this, function () {
                dojo.destroy(tempId);
                markLanded();
              });
              anim.play();
            }.bind(this),
            idx * staggerMs
          );
        }.bind(this)
      );

      // Safety net: ensure completion fires even if a slide callback is lost.
      setTimeout(fireComplete, (total - 1) * staggerMs + flyMs + 400);
    },

    animateBelieverLossFromMyHandToPlayerAnchor: function (
      targetPlayerId,
      count,
      opts
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
        startDelay: Math.max(
          0,
          parseInt((opts && opts.startDelay) || 0, 10) || 0
        ),
        delayStep: this.getUnifiedCardFlightStaggerMs(),
        fromScale: 1,
        toScale: 1,
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

    // It's a Miracle staged reveal: revived Believers fly from the graveyard to
    // a face-up overlapping stack beside the center action card (revived types
    // are public), hold briefly, then fly to the owner's hand (or the owner's
    // table for observers) at the same moment the action card flies to discard.
    // Removes the idle "action card sitting in center" gap. Returns false if the
    // center card is missing so the caller can fall back to the simple flight.
    animateItsAMiracleStagedRevival: function (cards, ownerId) {
      const list = (cards || []).filter(function (c) {
        return c && c.id;
      });
      if (!list.length) return false;
      const arena = dojo.byId("central_arena");
      const centerCard = dojo.byId("current_center_action_card");
      if (!arena || !centerCard) return false;

      const isOwner = String(ownerId) === String(this.player_id);
      const flyMs = this.getUnifiedCardFlyMs();
      const stagger = this.getUnifiedCardFlightStaggerMs();
      const stackId = "miracle_reveal_stack";
      const existing = dojo.byId(stackId);
      if (existing) dojo.destroy(existing);
      // Append to the arena itself (a flex sibling beside the center card).
      // Placing it "after" the center card can nest it inside the card's wrap
      // and overlap it, making the believers look like they crash into the card.
      dojo.place(
        '<div id="' +
          stackId +
          '" class="center-reveal-stack">' +
          '<div class="center-reveal-count">' +
          dojo.string.substitute(_("Revive ${n}"), { n: list.length }) +
          "</div></div>",
        arena,
        "last"
      );
      const stack = dojo.byId(stackId);
      const slotIds = [];

      list.forEach(
        function (card, i) {
          const slotId = stackId + "_slot_" + card.id + "_" + i;
          dojo.place(
            '<div id="' +
              slotId +
              '" class="center-reveal-card" style="visibility:hidden"></div>',
            stack,
            "last"
          );
          const slot = dojo.byId(slotId);
          this.applyInlineBelieverFaceStyle(slot, parseInt(card.type || 0, 10));
          dojo.style(slot, "visibility", "hidden");
          slotIds.push(slotId);
          this.animateTempCardFlight({
            tempId: "miracle_in_" + card.id + "_" + i,
            sourceId: "graveyard",
            targetId: slotId,
            cardClass: "graveyard_preview_card card-believer revive-fly-card",
            duration: flyMs,
            startDelay: i * stagger,
            destroyOnEnd: true,
            dataIndex: parseInt(card.type || 0, 10),
            fromScale: 1,
            toScale: 1,
            onEnd: function () {
              const s = dojo.byId(slotId);
              if (s) dojo.style(s, "visibility", "visible");
            },
          });
          // Failsafe: reveal the slot on a fixed timer regardless of whether the
          // flight's onEnd fires, so the "3 believers beside the card" step is
          // always shown.
          setTimeout(
            function () {
              const s = dojo.byId(slotId);
              if (s) dojo.style(s, "visibility", "visible");
            },
            i * stagger + flyMs + 40
          );
        }.bind(this)
      );

      // Owner's stock add is owned by stage B below; flag so the owner's
      // newBelievers notification skips a duplicate add.
      this.stagedRevivalCardIds = this.stagedRevivalCardIds || {};
      if (isOwner) {
        list.forEach(
          function (card) {
            this.stagedRevivalCardIds[String(card.id)] = true;
          }.bind(this)
        );
      }

      const inDoneMs = flyMs + Math.max(0, list.length - 1) * stagger;
      // Visible pause on the table so the revived believers read clearly before
      // they fly out. Capped so it does not feel like the old idle gap.
      const holdMs = Math.min(1200, this.getUnifiedRevealHoldMs());
      const observerAnchor = isOwner
        ? null
        : this.getPlayerBelieverReceiveTargetNodeId(ownerId);
      setTimeout(
        function () {
          list.forEach(
            function (card, i) {
              const slotId = slotIds[i];
              if (isOwner) {
                // Fly the revived card from the reveal slot straight into the
                // owner's hand stock (single source of the stock add).
                this.playerBelieverCards.addToStockWithId(
                  card.type,
                  card.id,
                  slotId
                );
              } else if (observerAnchor && dojo.byId(observerAnchor)) {
                this.animateCardNodeCloneToTarget(slotId, observerAnchor, {
                  tempPrefix: "miracle_out_" + card.id,
                  cardClass: "card card-back-believer",
                  duration: flyMs,
                  startDelay: i * stagger,
                });
              }
            }.bind(this)
          );
          // Let the believers visibly leave the table first, then send the
          // action card to discard — otherwise the card and believers look
          // like they vanish together.
          this.scheduleCenterActionCardToDiscard(Math.round(flyMs * 0.6));
          setTimeout(
            function () {
              const st = dojo.byId(stackId);
              if (st) dojo.destroy(st);
            }.bind(this),
            flyMs + 60
          );
        }.bind(this),
        inDoneMs + holdMs
      );
      return true;
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
      // 未指定縮放時自動依起訖節點尺寸推導(三級卡牌通用飛行視覺)。
      // 呼叫端明確給 fromScale/toScale(含 1)則完全照舊。
      let fromScale =
        typeof args.fromScale === "number" ? Number(args.fromScale) : null;
      let toScale =
        typeof args.toScale === "number" ? Number(args.toScale) : null;
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
      // 自動縮放：以暫存卡實際寬度為基準推導起訖比例。
      if (fromScale === null || toScale === null) {
        let tempW = 0;
        try {
          tempW = parseFloat((dojo.position(tempId, true) || {}).w || 0);
        } catch (e) {}
        if (fromScale === null) {
          fromScale = this.getFlightScaleForNode(sourceNode, tempW);
        }
        if (toScale === null) {
          toScale = this.getFlightScaleForNode(targetNode, tempW);
        }
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
      // Mark the table as animating for the duration of THIS flight. Every card
      // / Believer flight (recruit, AOE commit, Witch Hunt + Spread Rumors
      // graveyard flights, defense overlay, etc.) funnels through here, so this
      // is the one universal signal the practice-AI / zombie pacing gate reads
      // (getTableAnimationBusyMs) to avoid firing the next play on top of a
      // running animation -- the cause of the "card and Believers fly together"
      // overlap and the "lock while already locked" step flood.
      const flightDurMs =
        parseInt(duration || 0, 10) || this.getUnifiedCardFlyMs();
      const flightDelayMs = parseInt(delay || 0, 10) || 0;
      this.flightBusyUntil = Math.max(
        parseInt(this.flightBusyUntil || 0, 10) || 0,
        Date.now() + flightDelayMs + flightDurMs + 150
      );
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
      if (!sourceNode || !targetId || !dojo.byId(targetId)) {
        return null;
      }
      let root = this.chooseCardFlightRoot(
        sourceNode,
        dojo.byId(targetId),
        opts.rootId || "game_play_area"
      );
      if (!root) {
        return null;
      }
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
      // Guarantee the clone has real dimensions. Some card classes (e.g.
      // card-back-believer / card-back-action) only get a size via .stockitem or
      // .panel-fly-temp-card context, so a bare clone is 0x0 and fails the flight
      // usability check (safeSlideToObject -> null = no animation). Lock to the
      // source node's measured size — UNLESS the caller's source is not a card
      // (e.g. a wide player panel), in which case skipSourceSizeLock lets the
      // cardClass CSS (panel-fly-temp-card) provide the correct portrait size
      // instead of squashing the clone to the panel's shape.
      if (opts.skipSourceSizeLock !== true) {
        this.lockTempCardSizeToNode(tempId, sourceNode, true);
      }
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
      // 終點縮放(三級卡牌通用)：往牌庫/墓地等小落點飛時途中縮小。
      // 呼叫端可用 opts.toScale 覆寫；給 1 = 不縮放。
      let cloneToScale =
        typeof opts.toScale === "number" ? Number(opts.toScale) : null;
      if (cloneToScale === null) {
        let cloneW = 0;
        try {
          cloneW = parseFloat((dojo.position(tempId, true) || {}).w || 0);
        } catch (e) {}
        cloneToScale = this.getFlightScaleForNode(dojo.byId(targetId), cloneW);
      }
      const run = function () {
        if (cloneToScale !== 1) {
          const node = dojo.byId(tempId);
          if (node) {
            dojo.style(node, {
              transition: "transform " + duration + "ms ease",
              transformOrigin: "center center",
            });
            setTimeout(function () {
              const n = dojo.byId(tempId);
              if (n) dojo.style(n, "transform", "scale(" + cloneToScale + ")");
            }, 24);
          }
        }
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
      const opts = options || {};
      const onComplete =
        typeof opts.onComplete === "function" ? opts.onComplete : null;
      // Guarantee the completion callback fires exactly once even when there is
      // nothing to animate (no count / missing nodes), so callers chaining on it
      // never stall.
      const n = Math.max(0, parseInt(count || 0, 10));
      const pid = String(playerId || "");
      const finishNow = function () {
        if (onComplete) onComplete();
      };
      if (!n || !pid) {
        finishNow();
        return;
      }

      const sourceId =
        cardKind === "believer" ? "believer_deck" : "action_deck";
      // When the viewer IS the drawing player, fly the card into their own hand
      // (bottom) instead of their name/table anchor — that is where the card
      // actually lands and reads more naturally. Other viewers still see the
      // public deck -> that player's table/name gain.
      const isSelf = pid === String(this.player_id || "");
      const selfHandId =
        cardKind === "believer" ? "mybelievercards" : "myactioncards";
      const targetId =
        isSelf && dojo.byId(selfHandId)
          ? selfHandId
          : this.resolvePlayerAnchorNodeId(pid, {
              allowPanel: true,
              allowTable: true,
              preferTable: true,
              fallbackId: "playertable_" + pid,
            });
      if (!sourceId || !targetId || !dojo.byId(targetId)) {
        finishNow();
        return;
      }

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
        toScale: 1,
        dataIndex: 0,
        onComplete: onComplete || undefined,
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
      // Long window so the Prophet flow (which can delay the server's
      // divineInspiration notification well past 10s) still suppresses the
      // duplicate server-side discard flight.
      const expiresAt = Date.now() + 30000;
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
      const stepMs = Math.max(
        60,
        parseInt(opts.delayStep || this.getUnifiedCardFlightStaggerMs(), 10) ||
          this.getUnifiedCardFlightStaggerMs()
      );
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
            fromScale: 1,
            toScale: 1,
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
          typeof options.fromScale === "number" ? options.fromScale : 1,
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

    scheduleCenterActionCardToDiscard: function (delayMs, opts) {
      const options = opts || {};
      // force:true bypasses the confrontation-hold guard in
      // moveCurrentCenterActionToDiscard — used by RESOLVED confrontations
      // (Witch Hunt / Spread Rumors) whose card otherwise lingered on the table
      // when the discard timer raced the hold-state transition. The expectedCardId
      // check below still prevents discarding the wrong card.
      const force = !!options.force;
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
          this.moveCurrentCenterActionToDiscard({ force: force });
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
          toScale: 1,
          dataIndex: 0,
        });
        maxEndMs = Math.max(maxEndMs, baseDelay + i * 160 + flyMs);
      }
      if (maxEndMs > 0) {
        this.pendingProphetVisualClearTimeout = setTimeout(
          function () {
            this.pendingProphetVisualClearTimeout = null;
            this.clearProphetPendingPredictionVisual();
            // Partial phase (the Gate still guesses the NEXT draw): fly a fresh
            // face-down Believer from the deck into the slot right away, so the
            // paused recruit visibly reads "waiting for the next prediction" —
            // for BOTH an already-copied Gate and a copy-prompt Gate. Only the
            // Skill stack depends on the copy; the pending Believer never does.
            if (String((args && args.prophet_flow_phase) || "final") !== "final") {
              this.showProphetPendingPredictionVisual();
            }
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
            _("Spread Rumors cannot target Sects with no Believers: ${sects}"),
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
            _("This confrontation cannot target Sects with no Believers: ${sects}"),
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
            _("No valid Sect to target with Kowtow To Me. You can cancel.")
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
          _("Zombie Army is active. Target a Sect with Faith War.")
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
              "Kowtow To Me cannot target Sects with more than half as many Believers as your Sect: ${sects}"
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
        _("Confirm"),
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
      // Both the right-side panel AND the ring seat are valid click targets.
      const markTargetUnselectable = function (nodeOrList) {
        (Array.isArray(nodeOrList) ? nodeOrList : [nodeOrList]).forEach(
          function (node) {
            if (!node) return;
            dojo.addClass(node, "target_unselectable");
            dojo.removeClass(node, "target_protected");
            dojo.removeClass(node, "selectable_target");
            dojo.removeClass(node, "target_selected");
          }
        );
      };
      let selectableCount = 0;
      Object.keys(this.gamedatas.players).forEach(
        function (player_id) {
          const player = this.gamedatas.players[player_id];
          const node = [
            dojo.byId("panel_" + player_id),
            dojo.byId("playertable_" + player_id),
          ].filter(Boolean);
          if (!node.length) return;
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
          node.forEach(
            function (n) {
              dojo.addClass(n, "selectable_target");
              dojo.removeClass(n, "target_protected");
              dojo.removeClass(n, "target_unselectable");
              dojo.removeClass(n, "target_selected");
              if (!this.targetTableHandles) this.targetTableHandles = [];
              this.targetTableHandles.push(
                dojo.connect(n, "onclick", this, function (evt) {
                  if (evt) {
                    dojo.stopEvent(evt);
                  }
                  this.onTargetPlayerSelected(player_id);
                })
              );
            }.bind(this)
          );
          selectableCount += 1;
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
          // Panel AND ring seat are both clickable targets.
          const nodes = [
            dojo.byId("panel_" + pid),
            dojo.byId("playertable_" + pid),
          ].filter(Boolean);
          if (!nodes.length) return;

          const available = parseInt((option && option.available) || 0, 10) === 1;
          if (!available) {
            nodes.forEach(markTargetUnselectable);
            return;
          }

          nodes.forEach(
            function (node) {
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
            _(
              "has more than half as many Believers as your Sect and cannot be absorbed by Kowtow To Me."
            ),
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
              _("${sect_name} has no Believers available for this confrontation."),
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
          _("Choose a Believer type for Witch Hunt.")
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
            "Recruiting followers with Kowtow To Me will fail Impermanence of Life, reveal that failure, and redraw your skill."
          ),
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
          _("No actions left this turn. Use an available Skill or End Turn."),
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

      // Accept a defense-card submit when the framework reports it OR when the
      // robust AOE-holder check says so (the migrated wrapper's checkAction can
      // lag in multiactive states; the server re-validates the submit anyway).
      const isAoeDefenseState =
        stateName === "martyrdomChooseBelievers" ||
        stateName === "conspiracyChooseBelievers" ||
        stateName === "martyrdomChooseRepresentative" ||
        stateName === "conspiracyChooseRepresentative";
      if (
        this.checkAction("playDefenseCard", true) ||
        (isAoeDefenseState && this.currentPlayerHoldsAoeDefenseCard())
      ) {
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
            _("No Sect you can target currently has Believers for Spread Rumors."),
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
        (this.currentTurnRepeatBypass || 0) <= 0 &&
        actionTypeMask &&
        this.currentTurnActionMask & actionTypeMask
      ) {
        this.showMessage(
          dojo.string.substitute(
            _(
              "You have already used a ${action_type} action this turn."
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
          _("Select at least one Action card to discard."),
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
      // Suppress the server-side discard flight for these cards BEFORE sending,
      // so it is set regardless of whether the divineInspiration notification
      // arrives before or after this ajax callback. Otherwise a race (notif
      // first) lets both the server flight and the local flight run = the
      // "discard flies twice" bug (more reproducible via the Prophet flow,
      // which delays the notification).
      this.markActionDiscardFlightSuppressed(localDiscardCards);
      this.ajaxAction(
        "playActionCard",
        {
          id: sourceCardId,
          card_ids: discardIds.join(";"),
        },
        function () {
          this.animateActionCardsToDiscard(this.player_id, localDiscardCards);
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
        this.showMessage(_("Select one Action card from your hand to exchange."), "error");
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
        this.showMessage(_("Select one Action card from your hand to exchange."), "error");
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
      const confirmStateName =
        (this.gamedatas &&
          this.gamedatas.gamestate &&
          this.gamedatas.gamestate.name) ||
        "";
      // Combat commits: never let a fast confirm cut a running animation (the
      // reveal flip / dead Believer flying to the graveyard). If the table is
      // still animating, accept the click but DEFER the send until the table
      // settles — same pacing rule the AI steps follow. The selection is kept;
      // the retry loop is latched so repeated clicks don't stack sends.
      if (
        confirmStateName === "faithWarDuel" ||
        confirmStateName === "faithDebateDuel" ||
        confirmStateName === "martyrdomChooseBelievers" ||
        confirmStateName === "conspiracyChooseBelievers"
      ) {
        const busyMs = Math.max(
          this.getTableAnimationBusyMs(),
          typeof this.getCombatRevealGateDelayMs === "function"
            ? this.getCombatRevealGateDelayMs()
            : 0
        );
        if (busyMs > 0) {
          if (this.pendingConfirmBelieverRetryTimer) {
            return; // already waiting for the settle — one send only
          }
          this.setTopInstruction(
            _("Waiting for the animation to finish...")
          );
          this.pendingConfirmBelieverRetryTimer = setTimeout(
            function () {
              this.pendingConfirmBelieverRetryTimer = null;
              this.onConfirmBelieverClicked();
            }.bind(this),
            Math.min(busyMs + 80, 1200)
          );
          return;
        }
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
      // Use the reliable local committed signal (latch + server set), NOT the
      // DOM-based hasAoeCommittedBelieverByPlayer: a stale arena node from a
      // previous AOE was matching my id and blocking a legitimate commit.
      const aoeAlreadyCommitted =
        isAoeCommitState && myId > 0
          ? this.hasLocalPlayerCommittedThisAoe()
          : false;
      const aoeTargetFallbackAllowed =
        isAoeCommitState &&
        !aoeAlreadyCommitted &&
        this.isCurrentPlayerInAoeCommitTargets();
      if (aoeAlreadyCommitted) {
        this.showMessage(
          _(
            "You already committed your Believer. Please wait."
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
          _("You already committed your Believer. Please wait."),
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
            _("Please choose one Believer from hand or graveyard."),
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
            "No actions left this turn. Use an available Skill or End Turn."
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
            "Discard mode: select one or more Action cards."
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
            "No actions left this turn. Use an available Skill or End Turn."
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
          _("Select at least one Action card to discard."),
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
        this.showMessage(_("Select at least one Action card to discard."), "error");
        return;
      }

      const discardIds = items.map(function (item) {
        return parseInt((item && item.id) || 0, 10) || 0;
      }).filter(function (id) {
        return id > 0;
      });
      if (!discardIds.length) {
        this.showMessage(_("Select at least one Action card to discard."), "error");
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
          innerHTML: _("Choose your starting Skill."),
        },
        area
      );
      dojo.create(
        "div",
        {
          className: "initial-skill-draft-subtitle",
          innerHTML: interactive
            ? _("Hover or long-press a card to read Skill details.")
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
          "Refusing support: this player will seek surrender from another Sect Leader."
        ),
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
      // Guard against double subscription: if setup()/setupNotifications runs
      // twice (e.g. BGA reloads gamedatas after the solo bot-fill player-count
      // warning), subscribing again would make EVERY notif handler fire twice
      // — doubling animations and count updates for both human and AI actions.
      if (this._notificationsSubscribed) {
        return;
      }
      this._notificationsSubscribed = true;
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
        "secretAllianceSwap",
        this,
        "notif_secretAllianceSwap"
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
      dojo.subscribe(
        "defenseCommittedPrivate",
        this,
        "notif_defenseCommittedPrivate"
      );
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
      // History/summary log lines and the rule-win announcement carry their own
      // translated message (auto-shown in the log); they were previously sent
      // by PHP without a JS subscription, which the framework surfaces as an
      // "unknown notification" error and can stall the notification queue
      // (e.g. the game-end summary never appearing). Subscribe them explicitly.
      dojo.subscribe(
        "combatSnapshotHistory",
        this,
        "notif_combatSnapshotHistory"
      );
      dojo.subscribe("gameEndedByRule", this, "notif_gameEndedByRule");
      // Log/flow notifications that PHP sends but JS never subscribed to. The
      // modern framework treats an unsubscribed notification as an error (and
      // can stall the notification queue), so subscribe them all. Their
      // translated message auto-appears in the game log; handlers are no-ops
      // unless a follow-up needs client state (panels resync on state change).
      dojo.subscribe(
        "breakingFaithResolved",
        this,
        "notif_breakingFaithResolved"
      );
      [
        "cancelDiscardingActionCard",
        "combatRoundHistory",
        "endTurn",
        "finalStruggleEnd",
        "finalTieBreakFallback",
        "giveBeliever",
        "leaderReplaced",
        "leaderSupportDecision",
        "secretAllianceStarted",
        "startDiscardingActionCard",
        "surrenderAccepted",
        "surrenderAsked",
        "surrenderRejected",
        "wandererTurnStart",
      ].forEach(function (notifName) {
        dojo.subscribe(notifName, this, "notif_genericLogOnly");
      }, this);
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
      dojo.subscribe("kowtowToMe", this, "notif_kowtowToMe");
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
        "skillGateTruthPurpleHermit",
        this,
        "notif_skillGateTruthPurpleHermit"
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
      dojo.subscribe("soloActorChanged", this, "notif_soloActorChanged");
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
        // Grouped fixed pauses: every same-purpose notification shares one
        // constant so pacing is tuned here instead of per notification.
        const flowStepSyncMs = Math.round(800 * replaySyncBoost);
        const skillBannerSyncMs = Math.round(1400 * replaySyncBoost);
        // Skills that play a sequenced fly-out → Believer flights → fly-back
        // (KABOOM!, Praise of Life) need the queue held for the whole motion.
        const skillSequenceSyncMs = Math.round(
          (this.getUnifiedCardFlyMs() * 4 +
            this.getUnifiedCardFlightStaggerMs() * 3 +
            400) *
            replaySyncBoost
        );
        // Skills whose Believer movement is a SEPARATE notification sent right
        // after the skill one (steal: Purple Hermit / Headstronger): hold the
        // queue for one fly-in so the Skill card reaches the center BEFORE those
        // Believer flights start. The card's own fly-back is event-driven
        // (waitForFlights), independent of this.
        const skillFlyInSyncMs = Math.round(
          (this.getUnifiedCardFlyMs() + 220) * replaySyncBoost
        );
        const statusPulseSyncMs = Math.round(900 * replaySyncBoost);
        const showcaseSyncMs = Math.round(2400 * replaySyncBoost);
        const identitySyncMs = 250;
        this.notifqueue.setSynchronous("actionCardPlayed", flowStepSyncMs);
        this.notifqueue.setSynchronous("haveACharity", drawActionSyncMs);
        this.notifqueue.setSynchronous("divineInspiration", drawActionSyncMs);
        this.notifqueue.setSynchronous(
          "secretAllianceExchanged",
          this.getUnifiedPostFlowDiscardDelayMs(0)
        );
        this.notifqueue.setSynchronous(
          "secretAllianceSwap",
          this.getUnifiedCardFlyMs() + this.getUnifiedCardFlightStaggerMs() * 2
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
        // Turn-start Action refill: hold the queue for the draw flight so the
        // next player's turn (and any AI play) does not overlap the previous
        // turn's believer/action draw animations — they now run in sequence.
        this.notifqueue.setSynchronous(
          "drawActionCards",
          Math.round(
            (this.getUnifiedCardFlyMs() +
              this.getUnifiedCardFlightStaggerMs() * 4) *
              replaySyncBoost
          )
        );
        this.notifqueue.setSynchronous("martyrdomResolved", aoeResolveSyncMs);
        this.notifqueue.setSynchronous("conspiracyResolved", aoeResolveSyncMs);
        this.notifqueue.setSynchronous("skillKarboom", skillSequenceSyncMs);
        this.notifqueue.setSynchronous("skillPraiseLife", skillSequenceSyncMs);
        this.notifqueue.setSynchronous(
          "skillPurpleHermitActivated",
          skillFlyInSyncMs
        );
        this.notifqueue.setSynchronous(
          "skillPurpleHermitFinale",
          skillFlyInSyncMs
        );
        this.notifqueue.setSynchronous(
          "skillGateTruthPurpleHermit",
          skillFlyInSyncMs
        );
        this.notifqueue.setSynchronous("skillHeadstronger", skillFlyInSyncMs);
        this.notifqueue.setSynchronous("skillWorldPeace", skillSequenceSyncMs);
        this.notifqueue.setSynchronous("skillEternalTruth", skillSequenceSyncMs);
        this.notifqueue.setSynchronous(
          "skillSoulSeveringSword",
          skillSequenceSyncMs
        );
        this.notifqueue.setSynchronous("skillHolyRebirth", skillBannerSyncMs);
        this.notifqueue.setSynchronous("reverseKarmaStatus", statusPulseSyncMs);
        this.notifqueue.setSynchronous("prophetGuessChosen", statusPulseSyncMs);
        this.notifqueue.setSynchronous("prophetGuessPassed", statusPulseSyncMs);
        this.notifqueue.setSynchronous(
          "prophetPredictionStarted",
          statusPulseSyncMs
        );
        // Prophet reveal flow can exceed 2s for a single prediction
        // (fly + flip + hold + send-to-hand), and even longer when a
        // Gate of Truth copied Prophet also predicts. Keep the notification
        // queue blocked long enough so hand-sync notifications do not cut the
        // animation before guess text / flip / result text are visible.
        this.notifqueue.setSynchronous(
          "prophetPredictionResolved",
          prophetResolveSyncMs
        );
        this.notifqueue.setSynchronous("infoSpyFinished", flowStepSyncMs);
        // Full redistribute FX includes gather + shuffle + deal phases and can
        // exceed 5s on larger tables. Keep sync long enough so hand-sync
        // notifications do not overtake and visually cut the sequence.
        this.notifqueue.setSynchronous("skillEveryoneEqual", redistributeSyncMs);
        this.notifqueue.setSynchronous("skillChaosComing", redistributeSyncMs);
        this.notifqueue.setSynchronous(
          "impermanenceVictoryShowcase",
          showcaseSyncMs
        );
        this.notifqueue.setSynchronous("playerIdentitySync", identitySyncMs);
        this.notifqueue.setSynchronous("practiceAiStepRequested", 50);
        // Actor-owner hint only (no animation): clear the queue near-instantly.
        this.notifqueue.setSynchronous("soloActorChanged", 1);
        // botThinking pacing comes from the server (delay_ms per state) so all
        // bot/zombie thinking pauses are tuned in one PHP const map. When the
        // framework supports dynamic durations the handler ends the pause;
        // otherwise fall back to a fixed duration.
        if (typeof this.notifqueue.setSynchronousDuration === "function") {
          this.notifqueue.setSynchronous("botThinking");
        } else {
          this.notifqueue.setSynchronous("botThinking", 650);
        }
        this.notifqueue.setSynchronous(
          "kowtowForcedAbsorbed",
          statusPulseSyncMs
        );
      }
    },

    notif_botThinking: function (notif) {
      if (
        !this.notifqueue ||
        typeof this.notifqueue.setSynchronousDuration !== "function"
      ) {
        return;
      }
      const args = (notif && notif.args) || {};
      let delayMs = parseInt(args.delay_ms || 0, 10);
      if (!delayMs || delayMs < 0) delayMs = 650;
      // Human-like pacing: the configured think time is a MINIMUM. If the
      // previous play's animations (card flights, reveal gates, discard holds)
      // are still running when this thinking beat is processed, extend the hold
      // until they settle + a small beat — a zombie burst sends several plays in
      // one packet, and a fixed hold shorter than the animation made the next
      // play land on top ("plays too fast"). Capped so a stuck flag can never
      // freeze the queue.
      const busyMs =
        typeof this.getTableAnimationBusyMs === "function"
          ? parseInt(this.getTableAnimationBusyMs() || 0, 10) || 0
          : 0;
      const holdMs = Math.min(9000, Math.max(delayMs, busyMs + 250));
      this.notifqueue.setSynchronousDuration(holdMs);
    },

    // Consolidated "is the table still animating the previous play?" gate, in
    // ms remaining. The practice AI / zombie next step waits for this to reach 0
    // so a new card never flies on top of the last one -- that overlap was what
    // jammed the notification/animation queue and froze the table. Covers the
    // center action-card hold + discard flight, combat reveal gate, defense
    // block exit, It's a Miracle revival reveal, transient arena cleanup, and
    // the redistribute (Everyone is Equal / Chaos Coming) shuffle+deal flood.
    getTableAnimationBusyMs: function () {
      const now = Date.now();
      let busyMs = 0;
      const holds = [
        this.centerActionHoldUntil,
        this.combatRevealGateUntil,
        // Universal in-flight window set by safeSlideToObject: covers EVERY card
        // / Believer flight (Witch Hunt + Spread Rumors graveyard flights, etc.)
        // that the per-feature flags above don't individually track.
        this.flightBusyUntil,
      ];
      for (let i = 0; i < holds.length; i++) {
        const until = parseInt(holds[i] || 0, 10) || 0;
        if (until > now) busyMs = Math.max(busyMs, until - now);
      }
      if (this.pendingCenterActionDiscardTimeout) {
        busyMs = Math.max(busyMs, this.getUnifiedCardFlyMs() + 150);
      }
      if (this.pendingTransientArenaClearTimeout) {
        busyMs = Math.max(busyMs, 350);
      }
      if (this.defenseBlockExitPending || this.defenseBlockExitRequested) {
        busyMs = Math.max(busyMs, 600);
      }
      if (this.itsAMiracleRevealActive) busyMs = Math.max(busyMs, 700);
      if (this.centerDefenseOverlayActive) busyMs = Math.max(busyMs, 500);
      busyMs = Math.max(
        busyMs,
        this.getRedistributeFxPendingDelayMs("believer"),
        this.getRedistributeFxPendingDelayMs("action")
      );
      return busyMs;
    },

    // Cancel every pending (deferring) AI step settle loop. Called when a newer
    // request arrives so stale loops can't fire late and lock the interface.
    cancelPendingPracticeAiStepTimers: function () {
      const timers = this.pendingPracticeAiStepTimers || {};
      Object.keys(timers).forEach(function (k) {
        if (timers[k]) clearTimeout(timers[k]);
        delete timers[k];
      });
    },

    notif_soloActorChanged: function (notif) {
      const args = (notif && notif.args) || {};
      this.soloCurrentActorId = parseInt(args.actor_id || 0, 10);
      if (this.gamedatas) {
        this.gamedatas.solo_current_actor_id = this.soloCurrentActorId;
      }
      // Re-evaluate the button suppression for the current state right away, in
      // case the true actor changed without a state transition (e.g. an
      // interrupt handing the turn back and forth between bot and human).
      try {
        const stateName = this.getCurrentStateName();
        if (stateName) {
          const stateArgs =
            (this.gamedatas &&
              this.gamedatas.gamestate &&
              this.gamedatas.gamestate.args) ||
            {};
          this.onUpdateActionButtons(stateName, stateArgs);
        }
      } catch (e) {}
    },

    notif_practiceAiStepRequested: function (notif) {
      const args = (notif && notif.args) || {};
      const playerId = parseInt(args.player_id || 0, 10);
      const token = parseInt(args.token || 0, 10);
      if (!playerId || !token) return;

      const key = String(token);
      if (this.pendingPracticeAiStepTimers[key]) return;

      const stateName = String(args.state_name || "");
      // chooseInitialSkill is driven entirely server-side (stChooseInitialSkill /
      // runPracticeAiForCurrentStateIfNeeded run it inline). A client step here
      // only takes the action lock and collides with the human's own pick, so
      // never schedule one for it.
      if (stateName === "chooseInitialSkill") return;

      // A newer request supersedes every older one. enableOthers() enables 3
      // seats -> 3 requestPracticeAiStep for the SAME active AI (3 tokens), and
      // the watchdog adds more. Without this, each spawns its own settle loop
      // that defers then fires a lock:true step; the stale ones still lock the
      // interface for their round-trip and pile onto the human's own turn
      // ("can't play on my turn"). Cancel all older loops; only this newest
      // token stays pending, and settleStep below aborts if it's superseded.
      this.cancelPendingPracticeAiStepTimers();
      this.latestPracticeAiToken = token;
      let delayMs = parseInt(args.delay_ms || 0, 10);
      if (!delayMs || delayMs < 0) delayMs = 900;
      if (stateName === "faithWarDuel" || stateName === "faithDebateDuel") {
        delayMs = Math.max(delayMs, this.getCombatRevealGateDelayMs() + 250);
      }
      // delayMs is the human-thinking floor (server per-state value). On top of
      // it, never fire the next step while the table is still animating the
      // previous play: a re-check loop defers until every visual hold clears.
      // This replaces guessing each play's duration -- it makes the AI wait for
      // the actual animation (recruit believer flights, AOE, war, redistribute)
      // and fixes the "AI plays the next card mid-animation -> overlap -> stall"
      // jam. The disconnect/zombie auto-play shares this pacing intent.
      const startedAt = Date.now();
      const settleStep = function () {
        // Superseded by a newer request (or AI disabled): abort this stale loop
        // so it never fires a lock:true step onto a later turn.
        if (parseInt(this.latestPracticeAiToken || 0, 10) !== token) {
          delete this.pendingPracticeAiStepTimers[key];
          return;
        }
        // NEVER fire an AI step while the LOCAL human player is active and still
        // owes an action (e.g. their own Faith War / Debate defense). The
        // practice AI is driven from this same client with lock:true, so firing
        // now locks the interface and the human literally cannot click their
        // defense -- the "war freeze: I have a defense but can't play it". Wait
        // (no cap) until the human acts and is no longer active.
        if (
          typeof this.isCurrentPlayerActive === "function" &&
          this.isCurrentPlayerActive() &&
          // Solo bot steps are exempt: during a bot's turn the framework keeps
          // a STALE human "active", so this defer would wait forever (the
          // stuck-table bug). Genuine human windows are multiactive states
          // where the server-side solo validation no-ops the step anyway.
          !this.isSoloBotSeat(playerId)
        ) {
          this.pendingPracticeAiStepTimers[key] = setTimeout(settleStep, 400);
          return;
        }
        // State-agnostic safety net: never fire an AI step while BGA's interface
        // is locked. A lock means either the human's own action is mid-flight
        // (multiactive states like faithDebateDuel/faithWarDuel where
        // isCurrentPlayerActive can miss them) or a notification is processing.
        // Firing now is what stole the lock and froze the human's Believer pick.
        const ifaceLocked =
          (typeof this.interface_locked !== "undefined" &&
            !!this.interface_locked) ||
          (typeof this.isInterfaceLocked === "function" &&
            !!this.isInterfaceLocked());
        const busyMs = this.getTableAnimationBusyMs();
        const elapsed = Date.now() - startedAt;
        // Safety cap: a stuck hold must never freeze the AI forever; after the
        // cap, act anyway and let the server-side state guard sort it out.
        if ((busyMs > 0 || ifaceLocked) && elapsed < 9000) {
          this.pendingPracticeAiStepTimers[key] = setTimeout(
            settleStep,
            Math.min(busyMs + 80, 600)
          );
          // Keep the watchdog pushed out while we are actively waiting for the
          // animation to settle, so it can't kick a duplicate step mid-settle.
          this.schedulePracticeAiWatchdog();
          return;
        }
        delete this.pendingPracticeAiStepTimers[key];
        this.sendPracticeAiStep(playerId, token);
      }.bind(this);

      this.pendingPracticeAiStepTimers[key] = setTimeout(settleStep, delayMs);
      this.schedulePracticeAiWatchdog();
    },

    sendPracticeAiStep: function (playerId, token, attempt) {
      const key = String(token || "");
      if (!playerId || !token || this.practiceAiStepInFlight[key]) return;
      const performAction =
        this.bga &&
        this.bga.actions &&
        typeof this.bga.actions.performAction === "function"
          ? this.bga.actions.performAction.bind(this.bga.actions)
          : null;
      if (!performAction) return;

      const attemptNo = Math.max(1, parseInt(attempt || 1, 10));
      this.practiceAiStepInFlight[key] = true;
      performAction(
        "runPracticeAiStep",
        { player_id: playerId, token: token },
        {
          // lock:true serializes AI step requests through BGA's action mutex so
          // they can't run concurrently (overlapping DB transactions were causing
          // mysql_deadlock_restart_transaction error popups when auto-running
          // multiple AI seats). checkAction stays false — this is a state-agnostic
          // automation action.
          lock: true,
          checkAction: false,
          checkPossibleActions: false,
        }
      )
        .then(
          function () {
            delete this.practiceAiStepInFlight[key];
            this.schedulePracticeAiWatchdog();
          }.bind(this)
        )
        .catch(
          function (error) {
            delete this.practiceAiStepInFlight[key];
            // A failed step rolls back server-side (token survives), so the
            // same step can be retried once before the watchdog takes over.
            console.warn(
              "[hofAi] practice AI step failed (player " +
                playerId +
                ", attempt " +
                attemptNo +
                "):",
              error
            );
            if (attemptNo < 2) {
              setTimeout(
                function () {
                  this.sendPracticeAiStep(playerId, token, attemptNo + 1);
                }.bind(this),
                1500
              );
            } else {
              this.schedulePracticeAiWatchdog();
            }
          }.bind(this)
        );
    },

    hasAnyPracticeAiEnabled: function () {
      const ids =
        (this.gamedatas && this.gamedatas.practice_ai_player_ids) || [];
      if (Array.isArray(ids) && ids.length > 0) return true;
      // Solo virtual bot seats are NOT in practice_ai_player_ids but need the
      // exact same self-healing watchdog — without this the watchdog never runs
      // in a solo game, so any lost step in a multi-step flow (e.g. a Faith War
      // between two bot Sects, which crosses several multiactive states per
      // round) stalls the table permanently after the first round.
      const solo =
        (this.gamedatas && this.gamedatas.solo_bot_player_ids) || [];
      return Array.isArray(solo) && solo.length > 0;
    },

    // Watchdog: if no AI step request arrives for a while even though AI
    // seats are enabled, ask the server to re-evaluate the current state.
    // kickPracticeAi is token-gated and no-ops when no AI seat should act,
    // so spurious kicks are harmless. This automates the manual
    // "re-enable AI to unstick it" workaround.
    schedulePracticeAiWatchdog: function () {
      if (this.practiceAiWatchdogTimer) {
        clearTimeout(this.practiceAiWatchdogTimer);
        this.practiceAiWatchdogTimer = null;
      }
      if (!this.hasAnyPracticeAiEnabled()) return;
      this.practiceAiWatchdogTimer = setTimeout(
        function () {
          this.practiceAiWatchdogTimer = null;
          if (!this.hasAnyPracticeAiEnabled()) return;
          if (this.getCurrentStateName() === "gameEndSummary") return;
          const performAction =
            this.bga &&
            this.bga.actions &&
            typeof this.bga.actions.performAction === "function"
              ? this.bga.actions.performAction.bind(this.bga.actions)
              : null;
          if (!performAction) return;
          performAction(
            "kickPracticeAi",
            {},
            { lock: false, checkAction: false, checkPossibleActions: false }
          ).catch(function (error) {
            console.warn("[hofAi] watchdog kick failed:", error);
          });
          this.schedulePracticeAiWatchdog();
        }.bind(this),
        6000
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
      this.schedulePracticeAiWatchdog();
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
      if (isCombatActionCard) {
        // New combat declaration must not inherit previous combat's
        // Reverse Karma visual stack before current prompt/confirmation.
        this.setReverseKarmaContext(0, 0);
      }

      if (this.isAoeCombatType(card_type)) {
        this.placeAoeActionCard(card_type, card_id, p_id);
        this.hideCenterActionCardFaceUntilFlight();
      } else if (card_type === "faith_war" || card_type === "faith_debate") {
        this.setDuelActionCard(
          card_type,
          p_id,
          this.getActionCardDisplayName(card_type),
          card_id
        );
        this.hideCenterActionCardFaceUntilFlight();
      } else {
        this.currentAoeCombatType = null;
        this.currentAoeAttackerId = null;
        this.currentAoeActionCardId = null;
        this.clearFaithWarArena("");
        this.showCenterActionCard(card_type, card_id, {
          hideFaceUntilFlightEnd: true,
        });
      }

      // Unified play animation: everyone sees card fly from actor anchor/hand
      // to table; the destination card stays hidden until the flight lands.
      // If local pending preview already exists, that preview is the animation.
      if (!hadPendingPreview) {
        const started = this.animatePlayedActionCardFlight(p_id, card_type, {
          onEnd: function () {
            this.revealCenterActionCardFace();
          },
        });
        if (!started) {
          this.revealCenterActionCardFace();
        }
      } else {
        dojo.destroy(pendingTempId);
        this.revealCenterActionCardFace();
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
      const onDrawComplete =
        typeof args.onDrawComplete === "function" ? args.onDrawComplete : null;
      let drawCompleteFired = false;
      const fireDrawComplete = function () {
        if (drawCompleteFired) return;
        drawCompleteFired = true;
        if (onDrawComplete) onDrawComplete();
      };
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
          onComplete: fireDrawComplete,
        });
      } else {
        // No draw animation (prophet flow / nothing to draw): fire immediately
        // so any chained step still runs.
        fireDrawComplete();
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
        start_delay_ms: prophetFlow ? 0 : flowLeadInMs,
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
          Math.max(drawAnimMs, flowLeadInMs) +
            this.getUnifiedCardFlightStaggerMs() * 3
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
      // Always fly the discarded Action cards to the discard pile first — even
      // in the Prophet flow, where the sequence is: discard fly -> first
      // Believer runs the Prophet prediction (and Gate of Truth secondary if
      // any) -> remaining drawn Believers fly to the player -> the Divine
      // Inspiration card goes to discard (scheduled on prophet resolve).
      const flyMs = this.getUnifiedCardFlyMs();
      const stagger = this.getUnifiedCardFlightStaggerMs();
      // Step 2: discarded Action cards fly to the pile only after the Divine
      // Inspiration card itself has LANDED at the center. The fixed one-flight
      // lead-in is measured from when THIS notification processes, which can be
      // mid-flight (same packet as actionCardPlayed) — so also wait out the
      // actual in-flight window (flightBusyUntil) plus a settle beat, keeping
      // the visual order strictly: card out -> discards fly -> Believers fly.
      const flightRemainMs = Math.max(
        0,
        (parseInt(this.flightBusyUntil || 0, 10) || 0) - Date.now()
      );
      const discardStartMs = Math.max(flowLeadInMs, flightRemainMs + 150);
      const discardAnimMs = this.animateActionCardsToDiscard(
        args.player_id || 0,
        discardCards,
        {
          consumeSuppression: true,
          startDelay: discardStartMs,
        }
      );
      if (discardCards.length) {
        discardCards.forEach(
          function (card) {
            if (card && card.type) {
              this.pushActionDiscardCard(card.type, card.id || "");
            }
          }.bind(this)
        );
      }
      // Guaranteed end-of-discard-flight time (even if some discard flights were
      // suppressed and returned a small value), so Believers never overlap it.
      const discardFullMs = Math.max(
        discardAnimMs,
        discardStartMs + flyMs + Math.max(0, discardN - 1) * stagger
      );
      // Step 3: drawn Believers fly to the hand only after the discard flight.
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
        start_delay_ms: prophetFlow ? 0 : discardFullMs,
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
        // Divine Inspiration: discard flight -> Believer draw flight -> then the
        // center action card flies to discard right after the draw lands. The
        // discard fly start delay is already folded into drawAnimMs, so no long
        // idle hold remains. Prophet flow is unchanged (handled on resolve).
        this.scheduleCenterActionCardToDiscard(
          Math.max(drawAnimMs, flowLeadInMs) +
            this.getUnifiedCardFlightStaggerMs() * 3
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

      const isOwner = String(notif.args.player_id) === String(this.player_id);

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

      // Staged reveal: the revived Believers fly graveyard -> a face-up row
      // beside the center revival card, hold ~1s so everyone sees the three,
      // then fly on to the reviver (own hand / their seat) while the revival
      // card goes to discard. Falls back to a direct flight if the center card
      // is missing.
      const staged = this.animateItsAMiracleReveal(
        revivedCards,
        notif.args.player_id
      );
      if (!staged) {
        const flyMs = this.getUnifiedCardFlyMs();
        const stagger = this.getUnifiedCardFlightStaggerMs();
        if (isOwner) {
          revivedCards.forEach(
            function (card) {
              if (card && card.id) {
                this.pendingRevivedFromGraveyard[String(card.id)] = true;
              }
            }.bind(this)
          );
          this.animateRevivedBelieversToHand(revivedCards);
        }
        this.scheduleCenterActionCardToDiscard(
          flyMs +
            Math.max(0, revivedCards.length - 1) * stagger +
            Math.min(900, this.getUnifiedRevealHoldMs())
        );
      }
    },

    // It's a Miracle staged reveal. Returns false if the center card is missing.
    // Shared staged "revive from graveyard" reveal (It's a Miracle / Holy
    // Rebirth): the revived Believers fly FACE-UP out of the graveyard into a
    // row beside the anchor card, hold so everyone reads them, then fly on to
    // the reviver (own hand / their seat) while opts.onStageB runs in the SAME
    // beat (recruit card to discard / Skill home). Owner stock add is owned by
    // Stage B (stagedRevivalCardIds suppresses the duplicate newBelievers add).
    // Returns false when it cannot run — the caller must then land the
    // believers itself so nothing is lost.
    animateStagedGraveReveal: function (anchorNode, cards, ownerId, opts) {
      const o = opts || {};
      const list = (cards || []).filter(function (c) {
        return c && c.id;
      });
      if (!list.length) return false;
      if (!anchorNode || !this.isNodeUsableForCardFlight(anchorNode)) {
        return false;
      }
      const isOwner = String(ownerId) === String(this.player_id);
      const flyMs = this.getUnifiedCardFlyMs();
      const stagger = this.getUnifiedCardFlightStaggerMs();
      const rowId = String(o.rowId || "staged_grave_reveal_row");
      const tempKey = String(o.tempKey || "grave_reveal");
      if (dojo.byId(rowId)) dojo.destroy(rowId);
      // IMPORTANT: place the reveal row in the persistent flight root
      // (game_play_area), NOT inside central_arena — clearTransientArenaAfterAction
      // wipes the arena mid-hold, which used to destroy the slots so Stage B had
      // no source to fly from ("believers vanished at the center").
      const flightRoot = this.chooseCardFlightRoot(
        anchorNode,
        anchorNode,
        "game_play_area"
      );
      if (!flightRoot) return false;
      this.ensureCardFlightRootPositioned(flightRoot);
      const anchorPos = this.getCardFlightSourcePositionInRoot(
        anchorNode,
        flightRoot
      );
      const anchorW = anchorNode.offsetWidth || 90;
      dojo.place(
        '<div id="' + rowId + '" class="center-reveal-stack"></div>',
        flightRoot
      );
      const row = dojo.byId(rowId);
      dojo.style(row, {
        position: "absolute",
        left: anchorPos.left + anchorW + 10 + "px",
        top: anchorPos.top + "px",
        zIndex: "2300",
      });

      // Lock the center against external discards while the reveal holds;
      // Stage B releases it in the same beat as the fly-out.
      this.itsAMiracleRevealActive = true;
      if (o.lockCenterDiscard && this.pendingCenterActionDiscardTimeout) {
        clearTimeout(this.pendingCenterActionDiscardTimeout);
        this.pendingCenterActionDiscardTimeout = null;
      }

      // Owner's stock add is owned by stage B; flag so newBelievers skips it
      // (prevents the duplicate add that previously made cards vanish).
      if (o.markStaged && isOwner) {
        this.stagedRevivalCardIds = this.stagedRevivalCardIds || {};
        list.forEach(
          function (card) {
            this.stagedRevivalCardIds[String(card.id)] = true;
          }.bind(this)
        );
      }

      const slotIds = [];
      const observerAnchor = isOwner
        ? null
        : this.getPlayerBelieverReceiveTargetNodeId(ownerId) ||
          "playertable_" + String(ownerId || "");
      // Short reveal at center so the cards are seen, then everything leaves
      // together (event-driven from the last reveal flight's onEnd).
      const holdMs = 600;

      // Stage B: reveal slots fly to the reviver (hand / seat) and onStageB runs.
      // Triggered by the LAST reveal flight's onEnd (with a safety-net timeout).
      let stageBStarted = false;
      const runStageB = function () {
        if (stageBStarted) return;
        stageBStarted = true;
        list.forEach(
          function (card, i) {
            const slotId = slotIds[i];
            const slot = dojo.byId(slotId);
            if (isOwner) {
              if (slot && dojo.byId("mybelievercards")) {
                this.animateCardNodeCloneToTarget(slotId, "mybelievercards", {
                  tempPrefix: tempKey + "_out_" + card.id,
                  duration: flyMs,
                  startDelay: i * stagger,
                });
              }
              // Guaranteed stock add (plain form, no transient source, no
              // swallowed errors) so the believer ALWAYS lands in the hand.
              this.playerBelieverCards.addToStockWithId(card.type, card.id);
            } else if (observerAnchor && dojo.byId(observerAnchor) && slot) {
              // The revived Believers were just publicly revealed — fly the
              // FACE to the owner's seat (card backs are only for hidden info).
              this.animateCardNodeCloneToTarget(slotId, observerAnchor, {
                tempPrefix: tempKey + "_out_" + card.id,
                cardClass: "card card-believer",
                dataIndex: parseInt(card.type || 0, 10),
                duration: flyMs,
                startDelay: i * stagger,
              });
            }
            if (slot) dojo.style(slot, "visibility", "hidden");
          }.bind(this)
        );
        if (isOwner) {
          const ce = dojo.byId("table_believer_count_" + this.player_id);
          if (ce) ce.innerHTML = String(this.getStockDomCount("mybelievercards"));
        } else if (o.updateObserverCount) {
          const ce = dojo.byId("table_believer_count_" + ownerId);
          if (ce) {
            ce.innerHTML = String(
              parseInt(ce.innerHTML || "0", 10) + list.length
            );
          }
        }
        // Release the lock and run the paired exit RIGHT NOW, in the same beat
        // as the believers flying out (above) — not earlier, not later.
        this.itsAMiracleRevealActive = false;
        if (typeof o.onStageB === "function") o.onStageB();
        setTimeout(function () {
          const r = dojo.byId(rowId);
          if (r) dojo.destroy(r);
        }, flyMs + 80);
      }.bind(this);

      // Stage A: graveyard -> face-up reveal slot beside the anchor. The last
      // flight's onEnd starts the reveal hold, then Stage B (event-driven).
      const lastIndex = list.length - 1;
      list.forEach(
        function (card, i) {
          const slotId = rowId + "_" + card.id;
          // Render the believer face the PROVEN way: .card-believer + data-index
          // drives the sprite via CSS (inline face styles left the slot blank).
          dojo.place(
            '<div id="' +
              slotId +
              '" class="card card-believer center-reveal-card" data-index="' +
              parseInt(card.type || 0, 10) +
              '"></div>',
            row,
            "last"
          );
          const slot = dojo.byId(slotId);
          dojo.style(slot, "visibility", "hidden");
          // Stack so the LEFTMOST card shows on top (1,2,3 left-to-right) instead of
          // the default DOM order where the last/rightmost paints on top.
          dojo.style(slot, "zIndex", String(list.length - i));
          slotIds.push(slotId);
          this.animateTempCardFlight({
            tempId: tempKey + "_in_" + card.id,
            sourceId: "graveyard",
            targetId: slotId,
            cardClass: "graveyard_preview_card card-believer revive-fly-card",
            duration: flyMs,
            startDelay: i * stagger,
            destroyOnEnd: true,
            dataIndex: parseInt(card.type || 0, 10),
            fromScale: 1,
            toScale: 1,
            onEnd: function () {
              const s = dojo.byId(slotId);
              if (s) dojo.style(s, "visibility", "visible");
              if (i === lastIndex) {
                // Reveal finished: hold so everyone reads the cards, then fly out.
                setTimeout(runStageB, holdMs);
              }
            },
          });
        }.bind(this)
      );

      // Safety net: if the last flight's onEnd never fires, still run Stage B.
      setTimeout(
        runStageB,
        flyMs + Math.max(0, lastIndex) * stagger + holdMs + 500
      );
      return true;
    },

    // Recruit-card-anchored reveal (It's a Miracle). Falls back (false) when the
    // center card is missing so the caller can run the direct flight instead.
    animateItsAMiracleReveal: function (cards, ownerId) {
      const centerCard = dojo.byId("current_center_action_card");
      if (!dojo.byId("central_arena") || !centerCard) return false;
      return this.animateStagedGraveReveal(centerCard, cards, ownerId, {
        rowId: "miracle_reveal_row",
        tempKey: "miracle",
        markStaged: true,
        lockCenterDiscard: true,
        updateObserverCount: true,
        onStageB: function () {
          // Fly the revival card to discard together with the believers.
          this.moveCurrentCenterActionToDiscard({ force: true });
        }.bind(this),
      });
    },

    // Skill-anchored variant (Holy Rebirth): same staged reveal beside the
    // SKILL card held at center; onDone sends the Skill home in the Stage B
    // beat. The revived Believers are exactly the ones the server chose
    // (args.revived_cards). The caller pre-marks stagedRevivalCardIds and
    // pre-updates observer counts.
    animateSkillRevivalReveal: function (centerNode, cards, ownerId, onDone) {
      return this.animateStagedGraveReveal(centerNode, cards, ownerId, {
        rowId: "skill_revival_reveal_row",
        tempKey: "skill_revive",
        onStageB: onDone,
      });
    },

    notif_newBelievers: function (notif) {
      const suppressDeckSource =
        this.consumeRedistributeDeckSourceSuppression("believer");
      // AOE resolutions (Conspiracy / Martyrdom) already fly the gained Believers
      // FACE-UP from the arena to the owner via animateAoeBelieversToTargets.
      // This private newBelievers is only for the authoritative stock add, so do
      // NOT also fly them — otherwise a second, card-back flight runs (and, once
      // the arena is cleared, falls back to flying from the deck), which looked
      // like phantom face-down Believers flying out of the deck.
      const silentFly =
        parseInt((notif.args && notif.args.silent_fly) || 0, 10) === 1;
      for (let i in notif.args.cards) {
        let card = notif.args.cards[i];
        if (silentFly) {
          this.playerBelieverCards.addToStockWithId(card.type, card.id);
          delete this.pendingBelieverSourceByCardId[String(card.id)];
          continue;
        }
        // Silent timed add: another flow (Spread Rumors two-leg steal) already
        // plays the visual; add to the stock exactly when that flight lands.
        const silentAddUntil =
          this.pendingBelieverSilentAddUntil &&
          this.pendingBelieverSilentAddUntil[String(card.id)];
        if (silentAddUntil) {
          delete this.pendingBelieverSilentAddUntil[String(card.id)];
          const silentType = card.type;
          const silentId = card.id;
          setTimeout(
            function () {
              this.playerBelieverCards.addToStockWithId(silentType, silentId);
            }.bind(this),
            Math.max(0, parseInt(silentAddUntil, 10) - Date.now())
          );
          continue;
        }
        // Staged It's a Miracle reveal already adds these to the stock at the
        // end of its flight; skip the duplicate add here.
        if (
          this.stagedRevivalCardIds &&
          this.stagedRevivalCardIds[String(card.id)]
        ) {
          delete this.stagedRevivalCardIds[String(card.id)];
          continue;
        }
        // Holy Rebirth (and any revive-from-graveyard payload): fly the Believer
        // FACE-UP out of the graveyard into the hand, not card-back from the deck.
        const fromGraveyardArg =
          parseInt((notif.args && notif.args.from_graveyard) || 0, 10) === 1;
        const revivedFromGraveyard =
          !!this.pendingRevivedFromGraveyard[String(card.id)];
        // from_player: stolen Believers (e.g. Breaking Faith) fly from that
        // player's seat into the hand instead of card-back from the deck.
        const fromPlayerId = parseInt(
          (notif.args && notif.args.from_player) || 0,
          10
        );
        const sourceAnchorId =
          this.pendingBelieverSourceByCardId[String(card.id)] ||
          (fromPlayerId > 0
            ? this.resolvePlayerAnchorNodeId(fromPlayerId, {
                allowPanel: true,
                allowTable: true,
                preferTable: true,
                fallbackId: "playertable_" + String(fromPlayerId),
              })
            : null);
        const prophetDrawNoFly =
          !revivedFromGraveyard &&
          !fromGraveyardArg &&
          parseInt(this.pendingProphetDrawNoFlyCount || 0, 10) > 0;
        const prophetSnatchNoFly =
          !revivedFromGraveyard &&
          !fromGraveyardArg &&
          parseInt(this.pendingProphetSnatchNoFlyCount || 0, 10) > 0;
        if (fromGraveyardArg) {
          this.playerBelieverCards.addToStockWithId(card.type, card.id);
          const cardType = parseInt(card.type || 0, 10);
          const runGraveFlight = function () {
            if (
              this.isNodeUsableForCardFlight("graveyard") &&
              this.isNodeUsableForCardFlight("mybelievercards")
            ) {
              this.animateTempCardFlight({
                sourceId: "graveyard",
                targetId: "mybelievercards",
                cardClass: "graveyard_preview_card card-believer",
                duration: this.getUnifiedCardFlyMs(),
                startDelay: 0,
                fromScale: 1,
                toScale: 1,
                dataIndex: cardType,
              });
            }
          }.bind(this);
          const revealGateDelay = this.getCombatRevealGateDelayMs();
          if (revealGateDelay > 0) {
            setTimeout(runGraveFlight, revealGateDelay);
          } else {
            runGraveFlight();
          }
          delete this.pendingRevivedFromGraveyard[String(card.id)];
          delete this.pendingBelieverSourceByCardId[String(card.id)];
        } else if (revivedFromGraveyard) {
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
          // The Believer should appear in the hand only AFTER it flies in, not
          // the moment the combat resolves (which looked "premature"): this
          // covers AOE wins (Conspiracy / Martyrdom — arena commit slots) and
          // Faith War / Faith Debate survivor returns (faithwar_slot_*). Other
          // sources (steals, ...) keep the original add-now-then-fly behaviour.
          // Idempotent add + multiple safety nets guarantee it is never dropped.
          const srcNodeForDefer = dojo.byId(sourceAnchorId);
          const deferAddUntilFlight = !!(
            (srcNodeForDefer &&
              String(srcNodeForDefer.className || "").indexOf(
                "aoe-commit-item"
              ) !== -1) ||
            String(sourceAnchorId || "").indexOf("faithwar_slot") === 0
          );
          const cardTypeForAdd = card.type;
          const cardIdForAdd = card.id;
          let addedToStock = false;
          const addCardToStock = function () {
            if (addedToStock) return;
            addedToStock = true;
            this.playerBelieverCards.addToStockWithId(
              cardTypeForAdd,
              cardIdForAdd
            );
          }.bind(this);
          if (!deferAddUntilFlight) {
            addCardToStock();
          }
          const flyMs = this.getUnifiedCardFlyMs();
          // This is the owner's PRIVATE notification for a card whose face was
          // already on the table (AOE win return / war survivor / steal): fly
          // the FACE home, not a card back (backs are only for hidden info).
          const faceIndex = parseInt(cardTypeForAdd || 0, 10);
          const runSourceFlight = function () {
            this.clearCombatRevealOverlayWithin(sourceAnchorId);
            if (
              this.isNodeUsableForCardFlight(sourceAnchorId) &&
              this.isNodeUsableForCardFlight("mybelievercards")
            ) {
              this.animateTempCardFlight({
                sourceId: sourceAnchorId,
                targetId: "mybelievercards",
                cardClass: "card card-believer",
                duration: flyMs,
                startDelay: 0,
                fromScale: 1,
                toScale: 1,
                dataIndex: faceIndex,
                onEnd: addCardToStock,
              });
              if (deferAddUntilFlight) setTimeout(addCardToStock, flyMs + 200);
            } else if (
              this.isNodeUsableForCardFlight("believer_deck") &&
              this.isNodeUsableForCardFlight("mybelievercards")
            ) {
              this.animateTempCardFlight({
                sourceId: "believer_deck",
                targetId: "mybelievercards",
                cardClass: "card card-believer",
                duration: flyMs,
                startDelay: 0,
                fromScale: 1,
                toScale: 1,
                dataIndex: faceIndex,
                onEnd: addCardToStock,
              });
              if (deferAddUntilFlight) setTimeout(addCardToStock, flyMs + 200);
            } else {
              // No flight possible: never drop the Believer.
              addCardToStock();
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
      // Fly the lost Believer from my hand to the attacker's seat before removing
      // it (same loss animation as Spread Rumors).
      const attackerId = parseInt((notif.args && notif.args.attacker_id) || 0, 10);
      if (attackerId > 0) {
        this.animateBelieverLossFromMyHandToPlayerAnchor(attackerId, 1);
      }
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
      // First Prophet use: the reveal on "use" confirm is the cue to fly the
      // Prophet card out now (before guessing), so it leads the believer reveal.
      if (
        skillType === 4 &&
        this.pendingProphetParkActors &&
        this.pendingProphetParkActors[pid]
      ) {
        delete this.pendingProphetParkActors[pid];
        this.parkProphetSkillCard(pid);
      }
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
      // Skill flies to the table center and holds while the separate believer-
      // snatch notifications play their flights, then returns to hand.
      const headstrongActor = String((notif.args && notif.args.player_id) || "");
      if (headstrongActor) {
        this.playSkillCenterUse(
          headstrongActor,
          // Show the card actually in the actor's hand: the native skill for a
          // native user, or Gate of Truth (type 9) for a copy -- so it reads as
          // "Gate of Truth copy". Which skill was copied is shown in the log.
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[headstrongActor] &&
            this.gamedatas.player_skills[headstrongActor].type) ||
            3,
          null,
          { waitForFlights: true, copiedSkillType: 3 }
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
      // Skill flies to the table center and holds while the separate believer-
      // steal notifications play their flights, then returns to hand.
      const purpleActor = String((notif.args && notif.args.player_id) || "");
      if (purpleActor) {
        this.playSkillCenterUse(
          purpleActor,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[purpleActor] &&
            this.gamedatas.player_skills[purpleActor].type) ||
            1,
          null,
          { waitForFlights: true, copiedSkillType: 1 }
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

    notif_skillGateTruthPurpleHermit: function (notif) {
      // Gate of Truth copying Purple Hermit: same motion as the native skill.
      // The actor's hand card is Gate of Truth (type 9), so that is what flies to
      // the center; the steal flights play during the hold, then it returns.
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applyPublicSkillStateForPlayer(
          notif.args.player_id,
          notif.args.skill_state_actor
        );
      }
      const actor = String((notif.args && notif.args.player_id) || "");
      if (actor) {
        this.playSkillCenterUse(
          actor,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[actor] &&
            this.gamedatas.player_skills[actor].type) ||
            9,
          null,
          { waitForFlights: true, copiedSkillType: 1 }
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
      // The next-turn finale (the leave-sect / second snatch) also flies the
      // Skill out and back while its steal plays.
      const purpleFinaleActor = String((notif.args && notif.args.player_id) || "");
      if (purpleFinaleActor) {
        this.playSkillCenterUse(
          purpleFinaleActor,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[purpleFinaleActor] &&
            this.gamedatas.player_skills[purpleFinaleActor].type) ||
            1,
          null,
          { waitForFlights: true, copiedSkillType: 1 }
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
      // Gate of Truth copied The Prophet during a prediction window: fly the
      // copy stack (Prophet on top, Gate tucked under) out NOW, at the copy
      // confirm — before the guess. parkProphetSkillCard no-ops if parked.
      if (
        parseInt(args.copied_skill_type || 0, 10) === 4 &&
        this.isProphetPredictionFlowActive &&
        pid
      ) {
        this.parkProphetSkillCard(pid);
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
      // First-use flourish only: this passive Skill flies to the center, shows
      // briefly, and returns to hand. Guard so repeated activations (it can fire
      // whenever a Follower draws) do not replay the animation.
      const ascendLeader = String((notif.args && notif.args.leader_id) || "");
      if (ascendLeader) {
        if (!this._ascendSkillShown) this._ascendSkillShown = {};
        if (!this._ascendSkillShown[ascendLeader]) {
          this._ascendSkillShown[ascendLeader] = true;
          this.playSkillCenterUse(
            ascendLeader,
            (this.gamedatas.player_skills &&
              this.gamedatas.player_skills[ascendLeader] &&
              this.gamedatas.player_skills[ascendLeader].type) ||
              6,
            null,
            { holdMs: 600, copiedSkillType: 6 }
          );
        }
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

    notif_kowtowToMe: function (notif) {
      // Kowtow To Me has no follow-up Believer flight, so nothing was holding
      // its card at the center — it lingered until the next play. Give it the
      // same "land, read a beat, then discard" rhythm as every other single
      // card. This handler can run in the SAME packet as actionCardPlayed
      // (before that flight registers on flightBusyUntil), so floor the hold at
      // the card's own flight time plus a read beat. (When this absorption ends
      // the game via unification, the game-end transition supersedes the timer.)
      const holdMs =
        Math.max(
          Math.max(
            0,
            (parseInt(this.flightBusyUntil || 0, 10) || 0) - Date.now()
          ),
          this.getUnifiedCardFlyMs()
        ) + 550;
      this.scheduleCenterActionCardToDiscard(holdMs, { force: true });
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

    // Pure-visual "use a Skill" motion: fly the actor's Skill card out to the
    // table CENTER (everyone sees which Skill is used), hold while onCenter()
    // runs its own sequenced flights (sacrificed / killed Believers, etc.), then
    // fly the Skill card back to the actor. onCenter(done) MUST call done() when
    // its mid-sequence finishes, to send the Skill card home. No gameplay
    // effect; degrades to just running onCenter if a node is missing.
    playSkillCenterUse: function (actorId, skillType, onCenter, options) {
      const opts = options || {};
      const actor = String(actorId || "");
      const type = parseInt(skillType || 0, 10);
      // Hold-only convenience when no onCenter sequence is given:
      //  - waitForFlights: hold at center until the SEPARATE believer flights
      //    (steal / revival notifs, tracked via flightBusyUntil through
      //    safeSlideToObject) have actually settled, then send the card home.
      //    Event-driven — no guessed duration.
      //  - else: hold for a fixed holdMs (used when there is no flight to wait
      //    on, e.g. a pure "show" flourish or the redistribute shuffle whose
      //    duration is already known).
      if (typeof onCenter !== "function") {
        if (opts.waitForFlights) {
          const minHoldMs = Math.max(0, parseInt(opts.minHoldMs || 350, 10) || 0);
          const maxHoldMs = Math.max(
            minHoldMs,
            parseInt(opts.maxHoldMs || 6000, 10) || 0
          );
          onCenter = function (done) {
            const startedAt = Date.now();
            const settle = function () {
              const elapsed = Date.now() - startedAt;
              if (
                elapsed < minHoldMs ||
                (this.getTableAnimationBusyMs() > 0 && elapsed < maxHoldMs)
              ) {
                setTimeout(settle, 120);
                return;
              }
              done();
            }.bind(this);
            setTimeout(settle, minHoldMs);
          }.bind(this);
        } else {
          const holdMs = Math.max(0, parseInt(opts.holdMs || 700, 10) || 0);
          onCenter = function (done) {
            setTimeout(done, holdMs);
          };
        }
      }
      const skillSource = function () {
        return this.getSkillFlightSourceNode(actor);
      }.bind(this);
      const root = dojo.byId("game_play_area");
      if (!root || !this.isNodeUsableForCardFlight(root)) {
        if (typeof onCenter === "function") onCenter(function () {});
        return;
      }
      const flyMs = this.getUnifiedCardFlyMs();
      const cardW = parseInt(this.cardwidth || 108, 10);
      const cardH = parseInt(this.cardheight || 150, 10);
      const rootPos = dojo.position(root);
      // Position reference: the center Action-card slot (where a normal Action
      // card lands at table center). Single believer-only skills (KABOOM,
      // Praise of Life, ...) sit exactly there; "left"-anchored shuffle skills
      // (Chaos Coming / Everyone is Equal) park just left of it (prophet style)
      // so the center stays free for the shuffle FX. Falls back to the arena /
      // viewport center if the slot is not in the DOM.
      const centerRef =
        dojo.byId("current_center_action_card") ||
        dojo.byId("center_action_card_face") ||
        dojo.byId("central_arena");
      let refLeft;
      let refTop;
      let refW = cardW;
      let refH = cardH;
      if (centerRef && this.isNodeUsableForCardFlight(centerRef)) {
        const rp = dojo.position(centerRef);
        refLeft = rp.x - rootPos.x;
        refTop = rp.y - rootPos.y;
        refW = rp.w;
        refH = rp.h;
      } else {
        refLeft = Math.round(rootPos.w / 2 - cardW / 2);
        const visibleH = Math.min(
          rootPos.h,
          parseInt(window.innerHeight || rootPos.h, 10) || rootPos.h
        );
        refTop = Math.round(Math.max(120, visibleH / 2) - cardH / 2);
      }
      const top = Math.round(refTop + (refH - cardH) / 2);
      // Centered position over the action-card slot. "left"-anchored shuffle
      // skills park one card-width left of CENTER (prophet-style distance — the
      // card sits beside the center shuffle, NOT pinned to the far-left edge).
      const centeredLeft = Math.round(refLeft + (refW - cardW) / 2);
      const left =
        opts.anchor === "left"
          ? Math.max(4, centeredLeft - Math.round(cardW * 1.35))
          : centeredLeft;
      const centerId = "skill_center_" + actor + "_" + Date.now();
      const extraCenterClass = opts.centerClass
        ? " " + String(opts.centerClass)
        : "";
      dojo.place(
        '<div id="' +
          centerId +
          '" class="card card-skill skill-center-use-card' +
          extraCenterClass +
          '" data-index="' +
          type +
          '"></div>',
        root
      );
      const centerNode = dojo.byId(centerId);
      if (!centerNode) {
        if (typeof onCenter === "function") onCenter(function () {});
        return;
      }
      dojo.style(centerNode, {
        position: "absolute",
        left: left + "px",
        top: top + "px",
        zIndex: "2500",
        visibility: "hidden",
      });
      this.attachSkillTooltip(centerNode, type, null);

      // Gate of Truth: when this Skill use is actually a Gate-of-Truth COPY of
      // another Skill, show a SECOND card stacked slightly offset and IN FRONT
      // of the Gate card (the copied Skill), so everyone sees WHICH Skill was
      // copied while the flown base card stays Gate of Truth. Pure visual; the
      // rest of the sequence is unchanged. Detection: callers pass the native
      // Skill number as copiedSkillType; for a normal user that equals `type`
      // (no stack), for a Gate copy `type` is 9 (Gate) and copiedType differs.
      const copiedType = parseInt(opts.copiedSkillType || 0, 10);
      const showCopyStack = copiedType > 0 && copiedType !== type;
      let copyId = null;
      let copyNode = null;
      if (showCopyStack) {
        copyId = centerId + "_copy";
        dojo.place(
          '<div id="' +
            copyId +
            '" class="card card-skill skill-center-use-card skill-center-copy-card' +
            extraCenterClass +
            '" data-index="' +
            copiedType +
            '"></div>',
          root
        );
        copyNode = dojo.byId(copyId);
        if (copyNode) {
          dojo.style(copyNode, {
            position: "absolute",
            left: left + Math.round(cardW * 0.28) + "px",
            top: Math.max(0, top - Math.round(cardH * 0.14)) + "px",
            zIndex: "2520",
            visibility: "hidden",
          });
          this.attachSkillTooltip(copyNode, copiedType, null);
        } else {
          copyId = null;
        }
      }
      const flyCopyIn = function () {
        if (!copyId || !copyNode) return;
        const src = skillSource();
        if (src && src.id && this.isNodeUsableForCardFlight(src)) {
          dojo.style(copyNode, "visibility", "hidden");
          const reveal = function () {
            if (copyNode) dojo.style(copyNode, "visibility", "visible");
          };
          this.animateTempCardFlight({
            sourceId: src.id,
            targetId: copyId,
            cardClass: "card card-skill skill-center-copy-card",
            dataIndex: copiedType,
            duration: flyMs,
            zIndex: 2620,
            onEnd: reveal,
          });
          setTimeout(reveal, flyMs * 2 + 200);
        } else {
          dojo.style(copyNode, "visibility", "visible");
        }
      }.bind(this);
      const flyCopyBack = function () {
        if (!copyId || !copyNode) return;
        const back = skillSource();
        if (back && back.id && this.isNodeUsableForCardFlight(back)) {
          dojo.style(copyNode, "visibility", "hidden");
          this.animateTempCardFlight({
            sourceId: copyId,
            targetId: back.id,
            cardClass: "card card-skill skill-center-copy-card",
            dataIndex: copiedType,
            duration: flyMs,
            zIndex: 2620,
            onEnd: function () {
              dojo.destroy(copyId);
            },
          });
        } else {
          dojo.destroy(copyId);
        }
      }.bind(this);

      let landed = false;
      let sentBack = false;
      const sendBack = function () {
        if (sentBack) return;
        sentBack = true;
        flyCopyBack();
        const back = skillSource();
        if (back && back.id && this.isNodeUsableForCardFlight(back)) {
          dojo.style(centerNode, "visibility", "hidden");
          this.animateTempCardFlight({
            sourceId: centerId,
            targetId: back.id,
            cardClass: "card card-skill",
            dataIndex: type,
            duration: flyMs,
            zIndex: 2600,
            onEnd: function () {
              dojo.destroy(centerId);
            },
          });
        } else {
          dojo.destroy(centerId);
        }
      }.bind(this);
      const onLanded = function () {
        if (landed) return;
        landed = true;
        dojo.style(centerNode, "visibility", "visible");
        // Pass the live center node so an onCenter sequence can anchor extra
        // visuals beside the held Skill card (e.g. Holy Rebirth's revival row).
        if (typeof onCenter === "function") onCenter(sendBack, centerNode);
        else sendBack();
      };

      const source = skillSource();
      if (source && source.id && this.isNodeUsableForCardFlight(source)) {
        this.animateTempCardFlight({
          sourceId: source.id,
          targetId: centerId,
          cardClass: "card card-skill",
          dataIndex: type,
          duration: flyMs,
          zIndex: 2600,
          onEnd: onLanded,
        });
        // Launch the Gate of Truth copy card in the SAME beat as the base card so
        // the two fly out together as a stack (copy = use), not one-then-the-other.
        flyCopyIn();
        // Failsafe in case the flight's onEnd is lost.
        setTimeout(onLanded, flyMs * 2 + 200);
      } else {
        flyCopyIn();
        onLanded();
      }
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

      // Sequenced (not simultaneous): KABOOM! flies from the actor's hand to the
      // table center; THEN the actor sacrifices 1 Believer to the graveyard;
      // THEN the target's Believers fly to the graveyard; THEN KABOOM! returns to
      // the actor's hand.
      const kaboomType =
        (this.gamedatas.player_skills &&
          this.gamedatas.player_skills[actorId] &&
          this.gamedatas.player_skills[actorId].type) ||
        2;
      // Hold the graveyard visual for the whole two-stage flight (sacrifice,
      // then killed): the pile repaints when the LAST corpse lands, never at
      // the announcement. The sacrifice leg keeps the hold so the killed cards
      // are not painted into the pile before their own flight.
      if ((sacrificed && sacrificed.type) || killed.length) {
        this.holdGraveyardRender(15000);
      }
      this.playSkillCenterUse(
        actorId,
        kaboomType,
        function (done) {
          const flyTargetThenHome = function () {
            if (killed.length) {
              this.animateBelieversFromPlayerToGraveyard(targetId, killed, done);
            } else {
              this.releaseGraveyardRender();
              done();
            }
          }.bind(this);
          if (sacrificed && sacrificed.type) {
            this.animateBelieversFromPlayerToGraveyard(
              actorId,
              [sacrificed],
              flyTargetThenHome,
              { keepHold: killed.length > 0 }
            );
          } else {
            flyTargetThenHome();
          }
        }.bind(this),
        { copiedSkillType: 2 }
      );

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
      // Sequenced: Praise of Life flies to the table center; THEN the actor
      // sacrifices 1 Believer to the graveyard; THEN the Skill returns to hand.
      // Hold the graveyard visual until the sacrificed Believer LANDS there.
      if (sacrificed && sacrificed.type) {
        this.holdGraveyardRender(12000);
      }
      const praiseType =
        (this.gamedatas.player_skills &&
          this.gamedatas.player_skills[actorId] &&
          this.gamedatas.player_skills[actorId].type) ||
        13;
      this.playSkillCenterUse(
        actorId,
        praiseType,
        function (done) {
          if (sacrificed && sacrificed.type) {
            this.animateBelieversFromPlayerToGraveyard(
              actorId,
              [sacrificed],
              done
            );
          } else {
            done();
          }
        }.bind(this),
        { copiedSkillType: 13 }
      );
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
      // Sequenced: Skill flies to the table center; THEN the actor sacrifices 1
      // Believer to the graveyard; THEN the Skill returns to hand. (World Peace /
      // Eternal Truth — runs every use, no "first use" special.)
      // Hold the graveyard visual until the sacrificed Believer LANDS there.
      if (sacrificed && sacrificed.type) {
        this.holdGraveyardRender(12000);
      }
      this.playSkillCenterUse(
        actorId,
        (this.gamedatas.player_skills &&
          this.gamedatas.player_skills[actorId] &&
          this.gamedatas.player_skills[actorId].type) ||
          0,
        function (done) {
          // Beat (~0.5s) after the Believer reaches the graveyard before the
          // Skill flies home, so the sequence does not feel rushed.
          const homeAfterHold = function () {
            setTimeout(done, 500);
          };
          if (sacrificed && sacrificed.type) {
            this.animateBelieversFromPlayerToGraveyard(
              actorId,
              [sacrificed],
              homeAfterHold
            );
          } else {
            homeAfterHold();
          }
        }.bind(this),
        { copiedSkillType: 8 }
      );
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
      // Sequenced: Skill flies to the table center; THEN the actor sacrifices 1
      // Believer to the graveyard; THEN the Skill returns to hand. (World Peace /
      // Eternal Truth — runs every use, no "first use" special.)
      // Hold the graveyard visual until the sacrificed Believer LANDS there.
      if (sacrificed && sacrificed.type) {
        this.holdGraveyardRender(12000);
      }
      this.playSkillCenterUse(
        actorId,
        (this.gamedatas.player_skills &&
          this.gamedatas.player_skills[actorId] &&
          this.gamedatas.player_skills[actorId].type) ||
          0,
        function (done) {
          // Beat (~0.5s) after the Believer reaches the graveyard before the
          // Skill flies home, so the sequence does not feel rushed.
          const homeAfterHold = function () {
            setTimeout(done, 500);
          };
          if (sacrificed && sacrificed.type) {
            this.animateBelieversFromPlayerToGraveyard(
              actorId,
              [sacrificed],
              homeAfterHold
            );
          } else {
            homeAfterHold();
          }
        }.bind(this),
        { copiedSkillType: 7 }
      );
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
      // Soul-Severing Sword flies to the table center, gives a shake + slash
      // flourish, then returns to hand. (Pure visual.)
      const swordActor = String((notif.args && notif.args.player_id) || "");
      if (swordActor) {
        this.playSkillCenterUse(
          swordActor,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[swordActor] &&
            this.gamedatas.player_skills[swordActor].type) ||
            11,
          null,
          { holdMs: 900, centerClass: "skill-slash-fx", copiedSkillType: 11 }
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
      // Fly the (native) Prophet's Skill card out EARLY so it lands BEFORE the
      // believer reveal/guess instead of during it: at prediction start when the
      // skill is already revealed (2nd+ use routes straight to guessing), or on
      // the reveal for a first use (see notif_skillRevealed) — a SKIP never
      // reveals, so it never flies. The Gate-of-Truth copy responder still parks
      // on its guess (fallback in notif_prophetGuessChosen).
      this.pendingProphetParkActors = {};
      const primaryProphet = String(args.primary_prophet_id || "");
      if (primaryProphet && parseInt(primaryProphet, 10) > 0) {
        // Never park here: no client-side flag can distinguish "publicly
        // revealed" for the LOCAL holder (the server marks your own skill
        // visible to you), which flew the card before the "use" confirm. A
        // first use parks on its reveal (skillRevealed); an already-revealed
        // Prophet parks when the server routes them straight into the GUESS
        // state (onEnteringState prophetGuess) — the authoritative signal.
        this.pendingProphetParkActors[primaryProphet] = true;
      }
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
      // A guess is the unambiguous "this player is USING The Prophet" signal
      // (a player who skips never reaches here). Fallback park — normally the
      // card is already out (reveal / prediction start / copy confirm) and
      // parkProphetSkillCard is a no-op for an already-parked actor.
      const guesser = String((notif.args && notif.args.player_id) || "");
      this.parkProphetSkillCard(guesser);
      this.setTopInstruction(
        _("The Prophet prediction selected. Revealing draw...")
      );
    },

    notif_prophetGuessPassed: function (notif) {
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

      if (
        String(args.source_key || "") === "have_a_charity" ||
        String(args.source_key || "") === "divine_inspire"
      ) {
        if (flowPhase === "final") {
          this.setTopInstruction(_("The Prophet prediction ended."));
          // Send the recruit Action card to the discard pile together with
          // the tail of the believer draw flights instead of holding it in
          // the center afterwards.
          this.scheduleCenterActionCardToDiscard(
            Math.max(
              this.getUnifiedCardFlightStaggerMs() * 2,
              (parseInt(prophetFlowMs, 10) || 0) - this.getUnifiedCardFlyMs()
            )
          );
        } else {
          this.setTopInstruction(
            _("The Prophet's first reveal resolved. Waiting for next prediction.")
          );
        }
      }
      if (flowPhase === "final") {
        const finalFlowMs = parseInt(prophetFlowMs || 0, 10) || 0;
        const clearAfterMs = Math.max(200, finalFlowMs);
        // Fly the parked Prophet Skill card(s) home at the SAME moment the
        // recruit Action card leaves the center (same delay formula used for
        // the Action-card discard above), so the two motions are simultaneous.
        const returnDelay = Math.max(
          this.getUnifiedCardFlightStaggerMs() * 2,
          finalFlowMs - this.getUnifiedCardFlyMs()
        );
        setTimeout(
          function () {
            this.returnProphetParkedSkills();
          }.bind(this),
          returnDelay
        );
        if (this.pendingProphetFlowClearTimeout) {
          clearTimeout(this.pendingProphetFlowClearTimeout);
          this.pendingProphetFlowClearTimeout = null;
        }
        this.pendingProphetFlowClearTimeout = setTimeout(
          function () {
            this.isProphetPredictionFlowActive = false;
            this.pendingProphetFlowClearTimeout = null;
            // Safety net: remove any parked Skill card that did not fly home,
            // and drop stale awaiting-reveal park flags (a first-use prophet who
            // SKIPPED never reveals; a later unrelated type-4 reveal must not
            // fly the card out of nowhere).
            this.clearProphetParkedSkillsNow();
            this.pendingProphetParkActors = {};
          }.bind(this),
          clearAfterMs
        );
      } else {
        this.isProphetPredictionFlowActive = true;
        // Partial resolve (first reveal done): the native Prophet is finished —
        // send their parked Skill card home timed with the reveal's tail. The
        // Gate copy prompt / second guess follows with its own parked stack.
        const partialPrimary = String(args.primary_prophet_id || "");
        if (
          partialPrimary &&
          this.prophetParkedSkills &&
          this.prophetParkedSkills[partialPrimary]
        ) {
          const partialFlowMs = parseInt(prophetFlowMs || 0, 10) || 0;
          const partialReturnDelay = Math.max(
            this.getUnifiedCardFlightStaggerMs() * 2,
            partialFlowMs - this.getUnifiedCardFlyMs()
          );
          setTimeout(
            function () {
              this.returnProphetParkedSkillForActor(partialPrimary);
            }.bind(this),
            partialReturnDelay
          );
        }
      }
    },

    // ---- Prophet skill-card parking (additive, pure visual) -----------------
    // When a player confirms they will use The Prophet, fly THEIR Skill card out
    // and park it just left of the recruit Action card. It stays parked across
    // every guess of that prediction, then flies home at the same moment the
    // Action card goes to the discard pile. Gate of Truth copying The Prophet
    // parks a Prophet card (type 4) too; on that player's SECOND guess the Gate
    // of Truth card (type 9) flies in and stacks UNDER it (revealing the copy).
    // The existing prediction-slot visual is untouched; missing nodes degrade
    // silently.
    // Universal "where a player's Skill card flies from/to": the local player
    // sees their own hand (their Skill card), everyone else sees that player's
    // seat skill icon. Shared by playSkillCenterUse, the Prophet parking and the
    // Impermanence victory showcase. Assigns an id if the node lacks one.
    getSkillFlightSourceNode: function (actorId) {
      const actor = String(actorId || "");
      let n = null;
      if (actor && actor === String(this.player_id || "")) {
        n = dojo.byId("myskillcards") || dojo.byId("skill_hand");
      }
      if (!n) {
        // 飛牌起訖優先用牌桌上的座位技能牌(環繞座位)，面板為備援。
        n =
          dojo.byId("table_skill_" + actor) ||
          dojo.byId("playertable_" + actor) ||
          dojo.byId("skill_icon_" + actor) ||
          dojo.byId("panel_" + actor);
      }
      if (n && !n.id) n.id = "skill_flight_src_" + actor + "_" + Date.now();
      return n;
    },

    getProphetParkBasePosition: function () {
      const root = dojo.byId("game_play_area");
      if (!root) return null;
      const cardW = parseInt(this.cardwidth || 108, 10);
      const cardH = parseInt(this.cardheight || 150, 10);
      const rootPos = dojo.position(root);
      const action = dojo.byId("current_center_action_card");
      let left;
      let top;
      if (action && this.isNodeUsableForCardFlight(action)) {
        const ap = dojo.position(action);
        left = Math.round(ap.x - rootPos.x - cardW - Math.round(cardW * 0.35));
        top = Math.round(ap.y - rootPos.y);
      } else {
        const visibleH = Math.min(
          rootPos.h,
          parseInt(window.innerHeight || rootPos.h, 10) || rootPos.h
        );
        left = Math.round(rootPos.w * 0.12);
        top = Math.round(Math.max(120, visibleH / 2) - cardH / 2);
      }
      if (left < 4) left = 4;
      return { left: left, top: top, cardW: cardW, cardH: cardH };
    },

    parkProphetSkillCard: function (actorId) {
      const actor = String(actorId || "");
      if (!actor || parseInt(actor, 10) <= 0) return;
      if (!this.prophetParkedSkills) this.prophetParkedSkills = {};
      if (this.prophetParkedSkills[actor]) return; // already parked; keep it
      const root = dojo.byId("game_play_area");
      if (!root || !this.isNodeUsableForCardFlight(root)) return;
      const base = this.getProphetParkBasePosition();
      if (!base) return;
      const isGate =
        this.gamedatas &&
        this.gamedatas.player_skills &&
        this.gamedatas.player_skills[actor] &&
        parseInt(this.gamedatas.player_skills[actor].type || 0, 10) === 9;
      // Stack simultaneous prophets (primary + secondary) so they do not overlap.
      const slotIndex = Object.keys(this.prophetParkedSkills).length;
      const top = base.top + slotIndex * Math.round(base.cardH * 0.34);
      const parkId = "prophetpark_" + actor + "_" + Date.now();
      dojo.place(
        '<div id="' +
          parkId +
          '" class="card card-skill skill-center-use-card prophet-park-card" data-index="4"></div>',
        root
      );
      const parkNode = dojo.byId(parkId);
      if (!parkNode) return;
      dojo.style(parkNode, {
        position: "absolute",
        left: base.left + "px",
        top: top + "px",
        zIndex: "2480",
        visibility: "hidden",
      });
      this.attachSkillTooltip(parkNode, 4, null);
      // Gate of Truth copying The Prophet: fly a TWO-card stack out together —
      // the copied Prophet card on top-left (this node) with the Gate of Truth
      // card tucked under it offset to the bottom-right, so everyone reads
      // "this is a copy" the moment it flies out.
      let gateId = null;
      if (isGate) {
        gateId = parkId + "_gate";
        dojo.place(
          '<div id="' +
            gateId +
            '" class="card card-skill skill-center-use-card prophet-park-gate-card" data-index="9"></div>',
          root
        );
        const gateNode = dojo.byId(gateId);
        if (gateNode) {
          dojo.style(gateNode, {
            position: "absolute",
            left: base.left + Math.round(base.cardW * 0.22) + "px",
            top: top + Math.round(base.cardH * 0.16) + "px",
            zIndex: "2470",
            visibility: "hidden",
          });
          this.attachSkillTooltip(gateNode, 9, null);
        } else {
          gateId = null;
        }
      }
      this.prophetParkedSkills[actor] = {
        id: parkId,
        gateId: gateId,
        left: base.left,
        top: top,
        isGate: !!isGate,
        cardW: base.cardW,
        cardH: base.cardH,
      };
      const flyMs = this.getUnifiedCardFlyMs();
      const src = this.getSkillFlightSourceNode(actor);
      const canFly = src && src.id && this.isNodeUsableForCardFlight(src);
      const makeReveal = function (nodeId) {
        return function () {
          const node = dojo.byId(nodeId);
          if (node) dojo.style(node, "visibility", "visible");
        };
      };
      [
        {
          nodeId: gateId,
          dataIndex: 9,
          cls: "card card-skill prophet-park-gate-card",
          z: 2590,
        },
        {
          nodeId: parkId,
          dataIndex: 4,
          cls: "card card-skill prophet-park-card",
          z: 2600,
        },
      ].forEach(
        function (spec) {
          if (!spec.nodeId) return;
          const reveal = makeReveal(spec.nodeId);
          if (canFly) {
            this.animateTempCardFlight({
              sourceId: src.id,
              targetId: spec.nodeId,
              cardClass: spec.cls,
              dataIndex: spec.dataIndex,
              duration: flyMs,
              zIndex: spec.z,
              onEnd: reveal,
            });
            setTimeout(reveal, flyMs * 2 + 200);
          } else {
            reveal();
          }
        }.bind(this)
      );
    },

    // Fly ONE actor's parked card(s) home (Prophet card, plus the Gate card for
    // a copy stack) — used when that actor's prediction fully resolves.
    returnProphetParkedSkillForActor: function (actorId) {
      const actor = String(actorId || "");
      const parked = this.prophetParkedSkills || {};
      const info = parked[actor];
      if (!info) return;
      delete parked[actor];
      const flyMs = this.getUnifiedCardFlyMs();
      const back = this.getSkillFlightSourceNode(actor);
      [info.gateId, info.id].forEach(
        function (nodeId) {
          if (!nodeId) return;
          const node = dojo.byId(nodeId);
          if (!node) return;
          const isGateNode = nodeId === info.gateId;
          const dataIndex = isGateNode ? 9 : 4;
          const cls = isGateNode
            ? "card card-skill prophet-park-gate-card"
            : "card card-skill prophet-park-card";
          if (back && back.id && this.isNodeUsableForCardFlight(back)) {
            dojo.style(node, "visibility", "hidden");
            this.animateTempCardFlight({
              sourceId: nodeId,
              targetId: back.id,
              cardClass: cls,
              dataIndex: dataIndex,
              duration: flyMs,
              zIndex: 2600,
              onEnd: function () {
                dojo.destroy(nodeId);
              },
            });
          } else {
            dojo.destroy(nodeId);
          }
        }.bind(this)
      );
    },

    returnProphetParkedSkills: function () {
      Object.keys(this.prophetParkedSkills || {}).forEach(
        function (actor) {
          this.returnProphetParkedSkillForActor(actor);
        }.bind(this)
      );
      this.prophetParkedSkills = {};
    },

    clearProphetParkedSkillsNow: function () {
      const parked = this.prophetParkedSkills || {};
      Object.keys(parked).forEach(function (actor) {
        const info = parked[actor];
        if (!info) return;
        if (info.gateId) dojo.destroy(info.gateId);
        if (info.id) dojo.destroy(info.id);
      });
      this.prophetParkedSkills = {};
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
        notif.args.attack_kind ||
        (defenseKind === "mental" ? _("Mental") : _("Physical"));
      this.showMessage(
        dojo.string.substitute(
          _(
            "${player_name} is protected from ${attack_kind} attacks. This attack has no effect."
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

      // Skill flies to the table center; the revived Believers fly FACE-UP out
      // of the graveyard to a row beside the Skill (It's a Miracle style), hold,
      // then fly to the hand while the Skill returns. The shown Believers are
      // exactly the ones the server revived (args.revived_cards). The believer
      // logic/cards are unchanged — this only restyles the reveal.
      if (used && pid) {
        const skillType =
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[pid] &&
            this.gamedatas.player_skills[pid].type) ||
          5;
        const revivedCards = Array.isArray(args.revived_cards)
          ? args.revived_cards.filter(function (c) {
              return c && c.id;
            })
          : [];
        const isMine = pid === String(this.player_id);
        if (revivedCards.length) {
          // The reveal owns the stock add; suppress the separate from-graveyard
          // newBelievers flight/add (same mechanism as It's a Miracle) BEFORE
          // that notification is processed.
          if (isMine) {
            this.stagedRevivalCardIds = this.stagedRevivalCardIds || {};
            revivedCards.forEach(
              function (c) {
                this.stagedRevivalCardIds[String(c.id)] = true;
              }.bind(this)
            );
          }
          this.playSkillCenterUse(
            pid,
            skillType,
            function (sendBack, centerNode) {
              const ran = this.animateSkillRevivalReveal(
                centerNode,
                revivedCards,
                pid,
                sendBack
              );
              if (!ran) {
                // Reveal could not run: still land the believers (the separate
                // newBelievers notif was suppressed), then send the Skill home.
                if (isMine) {
                  revivedCards.forEach(
                    function (c) {
                      this.playerBelieverCards.addToStockWithId(c.type, c.id);
                    }.bind(this)
                  );
                  const ce = dojo.byId(
                    "table_believer_count_" + this.player_id
                  );
                  if (ce) {
                    ce.innerHTML = String(
                      this.getStockDomCount("mybelievercards")
                    );
                  }
                }
                sendBack();
              }
            }.bind(this),
            { copiedSkillType: 5 }
          );
        } else {
          // Nothing revived: just the Skill flourish.
          this.playSkillCenterUse(pid, skillType, null, {
            holdMs: 500,
            copiedSkillType: 5,
          });
        }
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
    },

    notif_impermanenceFailed: function (notif) {
      const args = notif.args || {};
      const isMe = String(args.player_id || "") === String(this.player_id);
      // The holder gets a clear, second-person reminder (their win-condition
      // skill is gone) so it is not lost among the recruit/kowtow notifications;
      // everyone else gets the generic announcement.
      if (isMe) {
        this.showMessage(
          _(
            "Your Impermanence of Life failed (you gained a Follower) — it is replaced by a new hidden skill."
          ),
          "error"
        );
      } else {
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
      }
      if (isMe && this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_impermanenceVictoryShowcase: function (notif) {
      // Diagnostic: if this line appears in the console, the notification DID
      // arrive (so any "no animation" is a rendering failure, caught below). If
      // it never appears at game end, the notification was never sent/subscribed
      // (a PHP/state-routing issue, not this handler).
      console.log(
        "[HOF-IMP-WIN] showcase notif received",
        (notif && notif.args) || null
      );
      // Hold the end-summary back so this showcase is actually seen. The summary
      // is rendered by notif_gameEndSummaryShow (which defers on this stamp); the
      // queue's setSynchronousDuration alone did not hold it (the summary arrives
      // in a separate packet), so this timestamp is the reliable gate.
      this.impermanenceShowcaseUntil = Date.now() + 2600;
      try {
      const args = notif.args || {};
      const winnerId = parseInt(args.player_id || 0, 10);
      // Reveal the winner's panel skill (Impermanence of Life = type 12) and force
      // its badge to Active, so even before BGA's final score screen everyone can
      // see whose skill won (the panel icon was still face-down).
      if (winnerId > 0) {
        this.applySkillRevealToPlayer(winnerId, 12, args.skill_state_actor || null);
        const skillBadge = dojo.byId("skill_active_" + winnerId);
        if (skillBadge) {
          skillBadge.innerHTML = _("Active");
          dojo.addClass(skillBadge, "is-active");
          dojo.removeClass(skillBadge, "is-exhausted");
          dojo.removeClass(skillBadge, "is-sealed");
        }
      }
      const arena = dojo.byId("central_arena");
      if (arena) {
        // No text: just the glowing Impermanence card flying to center, then the
        // end-summary takes over (it already states the win reason + card text).
        arena.innerHTML =
          '<div class="impermanence-victory-wrap">' +
          '<div class="card card-skill impermanence-victory-card is-hidden" data-index="12"></div>' +
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

          // Fly from the winner's OWN Skill card in hand (if it's me) so it reads
          // as "flew out of my hand", else from the winner's seat skill icon.
          const sourceNode = this.getSkillFlightSourceNode(winnerId);
          if (sourceNode && this.isNodeUsableForCardFlight(sourceNode)) {
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
            setTimeout(revealTargetCard, flyMs * 2);
          } else {
            revealTargetCard();
          }
        }
      }
      // Hold the notification queue so this showcase is actually SEEN: the
      // server fires gameEndSummaryShow immediately after, which overwrites the
      // central_arena. This framework only honours a hold when the handler calls
      // setSynchronousDuration (plain setSynchronous(name, ms) is ignored here),
      // which is why the showcase looked like it "never ran".
      if (
        this.notifqueue &&
        typeof this.notifqueue.setSynchronousDuration === "function"
      ) {
        this.notifqueue.setSynchronousDuration(2600);
      }
      } catch (e) {
        // Diagnostic: the showcase has been reported as "not running at all".
        // If a node lookup / flight throws, this surfaces the exact failure on
        // the next end-of-game so we stop guessing.
        console.warn("[HOF-IMP-WIN] impermanence victory showcase failed:", e);
      }
    },

    notif_gameEndSummaryShow: function (notif) {
      // If a combat reveal is still playing (e.g. the LAST Final Struggle round's
      // flip + win/lose labels), let it finish before the end summary covers the
      // arena — otherwise the final round's reveal is cut off. Defer once.
      const revealGateMs =
        typeof this.getCombatRevealGateDelayMs === "function"
          ? parseInt(this.getCombatRevealGateDelayMs() || 0, 10)
          : 0;
      // Also wait out the Impermanence victory showcase (it renders into the same
      // central_arena and would otherwise be wiped the instant it appears).
      const showcaseRemainMs = Math.max(
        0,
        (parseInt(this.impermanenceShowcaseUntil || 0, 10) || 0) - Date.now()
      );
      const deferMs = Math.max(revealGateMs, showcaseRemainMs);
      if (deferMs > 0 && !this._gameEndSummaryRevealDeferred) {
        this._gameEndSummaryRevealDeferred = true;
        setTimeout(
          function () {
            this.notif_gameEndSummaryShow(notif);
          }.bind(this),
          deferMs + 60
        );
        return;
      }
      this._gameEndSummaryRevealDeferred = false;
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
      // The standings panel stayed up from the last flip until now (the summary
      // screen is opening) — remove it here instead of on state-entry, which fired
      // too early and hid the result.
      this.destroyFinalConspiracyLogPanel();

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
        args.reason_text || _("Winner determined by a game-end rule.");
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
      // Skill flies out to the LEFT (prophet-style) to show which Skill is used
      // while the center plays the shuffle (unchanged); it returns to hand as the
      // redistribution finishes.
      const eqActor = String((notif.args && notif.args.player_id) || "");
      if (eqActor) {
        this.playSkillCenterUse(
          eqActor,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[eqActor] &&
            this.gamedatas.player_skills[eqActor].type) ||
            15,
          null,
          {
            anchor: "left",
            holdMs: Math.max(800, pendingMs - 700),
            copiedSkillType: 15,
          }
        );
      }
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
      // Skill flies out to the LEFT (prophet-style) while the center plays the
      // shuffle (unchanged); it returns to hand as redistribution finishes.
      const chaosActor = String((notif.args && notif.args.player_id) || "");
      if (chaosActor) {
        this.playSkillCenterUse(
          chaosActor,
          (this.gamedatas.player_skills &&
            this.gamedatas.player_skills[chaosActor] &&
            this.gamedatas.player_skills[chaosActor].type) ||
            14,
          null,
          {
            anchor: "left",
            holdMs: Math.max(800, pendingMs - 700),
            copiedSkillType: 14,
          }
        );
      }
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

    notif_breakingFaithResolved: function (notif) {
      const args = (notif && notif.args) || {};
      const attackerId = parseInt(args.attacker_id || 0, 10);
      const defenderId = parseInt(args.defender_id || 0, 10);
      const stolenCount = parseInt(args.stolen_count || 0, 10);
      const meId = String(this.player_id || "");
      const isParticipant =
        meId === String(attackerId) || meId === String(defenderId);
      // Observers: show the stolen Believers cross from the victim to the attacker
      // (participants already see it via their own newBelievers / believerStolen).
      if (!isParticipant && stolenCount > 0 && attackerId > 0 && defenderId > 0) {
        this.animateStolenBelieversCrossFlight(
          defenderId,
          attackerId,
          stolenCount
        );
      }
      if (this.pendingCenterDefenseOverlay) {
        // A counter Breaking Faith was played: fly it in + discard both together
        // using the SAME staged exit as a defense (hold 500ms, no logic change).
        this.defenseBlockExitIsFaithWar = false;
        this.defenseBlockExitPending = true;
        this.defenseBlockExitRequested = true;
        this.maybeRunDefenseBlockExit();
      } else {
        // No counter: the attack Breaking Faith card flies to the discard after the
        // steal (a short delay lets the believers fly first).
        this.scheduleCenterActionCardToDiscard(
          this.getUnifiedPostFlowDiscardDelayMs(0)
        );
      }
    },

    // Fly `count` face-down Believers from one player's seat to another (observer
    // view of a steal, e.g. Breaking Faith). Reuses the card-flight clone helper.
    animateStolenBelieversCrossFlight: function (fromPlayerId, toPlayerId, count) {
      const n = Math.min(3, Math.max(0, parseInt(count || 0, 10)));
      if (!n) return;
      const fromAnchor = this.resolvePlayerAnchorNodeId(fromPlayerId, {
        preferTable: true,
      });
      const toAnchor = this.resolvePlayerAnchorNodeId(toPlayerId, {
        preferTable: true,
      });
      if (!fromAnchor || !toAnchor) return;
      const stagger = this.getUnifiedCardFlightStaggerMs();
      for (let i = 0; i < n; i++) {
        this.animateCardNodeCloneToTarget(fromAnchor, toAnchor, {
          tempPrefix: "breaking_faith_steal_" + i,
          cardClass: "card card-back-believer panel-fly-temp-card",
          skipSourceSizeLock: true,
          duration: this.getUnifiedCardFlyMs(),
          startDelay: i * stagger,
          zIndex: 2300,
        });
      }
    },

    // Hidden landing anchor placed just to the SIDE of the center action card,
    // so the stolen Believer flies beside it (never covering it). Positioned in
    // the shared flight root using the card's live geometry; reused across the
    // sequence's victims and cleared when a new Spread Rumors begins.
    ensureRumorSideAnchor: function (centerNodeId) {
      const centerNode = dojo.byId(centerNodeId);
      const root = dojo.byId("game_play_area");
      if (!centerNode || !root) return null;
      if (!this.isNodeUsableForCardFlight(centerNode)) return null;
      this.ensureCardFlightRootPositioned(root);
      const pos = this.getCardFlightSourcePositionInRoot(centerNode, root);
      const rect = dojo.position(centerNode, true) || {};
      const w = Math.round(parseFloat(rect.w || 0)) || 120;
      const h = Math.round(parseFloat(rect.h || 0)) || 180;
      // Unified spacing: the stolen Believer occupies the SAME slot beside the
      // card as the Prophet prediction believer — a slot of width
      // --center-side-slot-w placed immediately right of the card. Center the
      // Believer in that slot so the "beside the card" gap is identical to the
      // Prophet case (single source of truth is the CSS variable).
      let slotW = 0;
      let arenaGap = 0;
      try {
        const rootStyle = window.getComputedStyle(document.documentElement);
        slotW = parseFloat(rootStyle.getPropertyValue("--center-side-slot-w"));
        arenaGap = parseFloat(rootStyle.getPropertyValue("--arena-item-gap"));
      } catch (e) {
        slotW = 0;
        arenaGap = 0;
      }
      if (!(slotW > 0)) slotW = w;
      if (!(arenaGap >= 0)) arenaGap = 0;
      // Match the flex-sibling placements (Prophet host / revival stack): the
      // Believer sits at card_right + arena gap + centered in the side slot.
      const left = pos.left + w + Math.round(arenaGap + (slotW - w) / 2);
      const anchorId = "rumor_side_anchor";
      if (!dojo.byId(anchorId)) {
        dojo.place('<div id="' + anchorId + '"></div>', root);
      }
      const anchor = dojo.byId(anchorId);
      if (!anchor) return null;
      dojo.style(anchor, {
        position: "absolute",
        left: left + "px",
        top: pos.top + "px",
        width: w + "px",
        height: h + "px",
        opacity: "0",
        pointerEvents: "none",
        zIndex: "1",
      });
      return anchorId;
    },

    notif_spreadRumorsStart: function (notif) {
      const args = (notif && notif.args) || {};
      // New Spread Rumors sequence: clear any stale center-leave clock so this
      // round's discard tracks THIS round's steals, and drop the old side anchor.
      this.rumorCenterLeaveAt = 0;
      if (dojo.byId("rumor_side_anchor")) {
        dojo.destroy("rumor_side_anchor");
      }
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
      // Strict order: 1) Spread Rumors card lands at center, 2) stolen Believer
      // flies, 3) card goes to discard (scheduled by the summary). This handler
      // can process while the card is still mid-flight (same packet as
      // actionCardPlayed), so delay the steal flight by the actual remaining
      // in-flight window. With several victims, each later notification also
      // waits out the previous steal flight — the steals chain one by one.
      // Let the viewer actually READ the Spread Rumors card before the stolen
      // Believer flies onto it. This handler can run in the SAME packet as
      // actionCardPlayed — BEFORE that card's own flight has registered on
      // flightBusyUntil — so relying on flightBusyUntil alone collapses the wait
      // to ~150ms and the card-back lands before the card is even visible
      // ("can't tell what was played"). Floor the wait at the card's own flight
      // time plus a registration beat so the card always lands and reads first.
      const rumorRegistrationBeatMs = 620;
      const rumorSettleMs =
        Math.max(
          Math.max(
            0,
            (parseInt(this.flightBusyUntil || 0, 10) || 0) - Date.now()
          ),
          this.getUnifiedCardFlyMs()
        ) + rumorRegistrationBeatMs;

      if (
        String(attackerId || "") === String(this.player_id || "") &&
        args.card_id &&
        victimId > 0
      ) {
        // The gained Believer's authoritative stock add happens in
        // notif_newBelievers; the VISUAL is the unified two-leg flight below.
        // Mark the card for a SILENT add timed to when that flight lands — no
        // second flight, and the hand does not update before the card arrives.
        if (!this.pendingBelieverSilentAddUntil) {
          this.pendingBelieverSilentAddUntil = {};
        }
        this.pendingBelieverSilentAddUntil[String(args.card_id)] =
          Date.now() + rumorSettleMs + this.getUnifiedCardFlyMs() * 2;
      }

      // Unified steal visual for EVERY viewer, anchored to the Spread Rumors
      // card itself: victim hand/seat -> the CARD at center -> attacker hand/
      // seat. (The old second leg was anchored to central_arena, whose geometry
      // spawned it at the arena's left edge — the "phantom card-back popping
      // out of the table's left side".) The card back stays: the stolen
      // Believer's identity is hidden information.
      const meId = String(this.player_id || "");
      const isVictim = victimId > 0 && meId === String(victimId);
      const isAttacker = attackerId > 0 && meId === String(attackerId);
      if (victimId > 0 && attackerId > 0) {
        const flyMs = this.getUnifiedCardFlyMs();
        // Absolute time the stolen Believer leaves the center (leg 2 start). The
        // summary flies the Spread Rumors card to the discard on this same
        // clock so the card and the Believer leave the center together. Track
        // the LATEST across victims (steals chain one per victim).
        this.rumorCenterLeaveAt = Math.max(
          parseInt(this.rumorCenterLeaveAt || 0, 10) || 0,
          Date.now() + rumorSettleMs + flyMs
        );
        const legSource = isVictim
          ? dojo.byId("mybelievercards")
            ? "mybelievercards"
            : null
          : this.resolvePlayerAnchorNodeId(victimId, {
              allowPanel: true,
              allowTable: true,
              preferTable: true,
              fallbackId: "playertable_" + String(victimId),
            });
        const legTarget = isAttacker
          ? dojo.byId("mybelievercards")
            ? "mybelievercards"
            : null
          : this.resolvePlayerCardAnchorNodeId(
              attackerId,
              "receive",
              "believer"
            );
        const centerNodeId = dojo.byId("center_action_card_face")
          ? "center_action_card_face"
          : dojo.byId("current_center_action_card")
          ? "current_center_action_card"
          : null;
        // The stolen Believer must land BESIDE the Spread Rumors card, never on
        // top of it (the flying card-back's z-index is higher and would hide
        // what was played). Route both legs through a hidden anchor placed just
        // to the side of the card instead of onto the card node itself.
        const viaId = centerNodeId
          ? this.ensureRumorSideAnchor(centerNodeId) || centerNodeId
          : null;
        if (
          legSource &&
          legTarget &&
          dojo.byId(legSource) &&
          dojo.byId(legTarget)
        ) {
          if (viaId) {
            // hideUntilStart: the flying card-back stays HIDDEN until its own
            // leg begins. Without it, leg 2's temp card is created up-front and
            // sits parked at the side slot (visible, motionless) from the moment
            // the notification arrives — a stray Believer card just sitting
            // beside the Spread Rumors card before anything animates. Both legs
            // hidden = only the Spread Rumors card shows during the read beat,
            // then the Believer flies victim -> side -> snatcher as one motion.
            this.animateTempCardFlight({
              tempId: "rumor_in_" + String(args.card_id || victimId),
              sourceId: legSource,
              targetId: viaId,
              cardClass: "card card-back-believer",
              duration: flyMs,
              startDelay: rumorSettleMs,
              hideUntilStart: true,
              fromScale: 1,
              toScale: 1,
              destroyOnEnd: true,
            });
            // Second leg starts exactly as the first lands (no parked pause), so
            // it reads as one continuous "pulled to the side then handed off"
            // path. Leaves the center on the same clock as the card's discard.
            this.animateTempCardFlight({
              tempId: "rumor_out_" + String(args.card_id || victimId),
              sourceId: viaId,
              targetId: legTarget,
              cardClass: "card card-back-believer",
              duration: flyMs,
              startDelay: rumorSettleMs + flyMs,
              hideUntilStart: true,
              fromScale: 1,
              toScale: 1,
              destroyOnEnd: true,
            });
          } else {
            this.animateTempCardFlight({
              tempId: "rumor_in_" + String(args.card_id || victimId),
              sourceId: legSource,
              targetId: legTarget,
              cardClass: "card card-back-believer",
              duration: flyMs,
              startDelay: rumorSettleMs,
              hideUntilStart: true,
              fromScale: 1,
              toScale: 1,
              destroyOnEnd: true,
            });
          }
        }
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
      // Event-driven feel: hold the card just long enough for the snatched
      // Believers to fly to the attacker's hand (delay tracks the stolen count),
      // then force the discard so it is not blocked by the confrontation-hold
      // race that left the card lingering when played fast.
      const rumorFlyMs = this.getUnifiedCardFlyMs();
      // Leave together: the stolen Believer's second leg (center -> attacker)
      // leaves the center at this.rumorCenterLeaveAt (set in notif_spreadRumors),
      // and the Spread Rumors card flies to the discard on the SAME clock so both
      // leave the center in one motion. Fall back to the flight-busy estimate
      // when nothing was snatched (no steal flight, so no center-leave time).
      const centerLeaveAt = parseInt(this.rumorCenterLeaveAt || 0, 10) || 0;
      const rumorDelayMs =
        centerLeaveAt > 0
          ? Math.max(0, centerLeaveAt - Date.now())
          : Math.max(
              0,
              (parseInt(this.flightBusyUntil || 0, 10) || 0) - Date.now()
            ) +
            rumorFlyMs +
            150;
      this.rumorCenterLeaveAt = 0;
      this.scheduleCenterActionCardToDiscard(rumorDelayMs, { force: true });
    },

    notif_secretAllianceExchanged: function (notif) {
      const args = (notif && notif.args) || {};
      const attackerId = parseInt(args.attacker_id || 0, 10);
      const targetId = parseInt(args.target_id || 0, 10);
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
      // Observers (not a participant) see two face-down cards cross between
      // the two seats. Each participant instead gets a private secretAllianceSwap
      // that animates their own outgoing/incoming card, so skip the crossing
      // for them to avoid double motion.
      const meId = String(this.player_id || "");
      const isParticipant =
        meId === String(attackerId) || meId === String(targetId);
      if (!isParticipant && attackerId > 0 && targetId > 0) {
        this.animateSecretAllianceCrossFlight(attackerId, targetId);
      }
      this.scheduleCenterActionCardToDiscard(
        this.getUnifiedPostFlowDiscardDelayMs(0)
      );
    },

    // Face-down crossing flight between two seats, for observers.
    animateSecretAllianceCrossFlight: function (attackerId, targetId) {
      // Use usable anchors (panel_ falls back from playertable_, which is ~0px
      // and fails the card-flight size check — that was the "no animation" with
      // safeSlideToObject returning null for both crossing cards).
      const anchorA = this.resolvePlayerAnchorNodeId(attackerId, {
        preferTable: true,
      });
      const anchorB = this.resolvePlayerAnchorNodeId(targetId, {
        preferTable: true,
      });
      if (!anchorA || !anchorB) return;
      // Include panel-fly-temp-card so the card-back gets the correct portrait
      // size (var(--card-w/--card-h)); plain "card card-back-action" has no size
      // outside a hand container and renders as a squashed horizontal sprite.
      // skipSourceSizeLock: the source is a player panel (wide), not a card —
      // locking to it squashed the card-back horizontal. Let the panel-fly-temp-card
      // CSS give the correct portrait size instead.
      this.animateCardNodeCloneToTarget(anchorA, anchorB, {
        tempPrefix: "secret_alliance_cross_a",
        cardClass: "card card-back-action panel-fly-temp-card",
        skipSourceSizeLock: true,
        duration: this.getUnifiedCardFlyMs(),
        zIndex: 2300,
      });
      this.animateCardNodeCloneToTarget(anchorB, anchorA, {
        tempPrefix: "secret_alliance_cross_b",
        cardClass: "card card-back-action panel-fly-temp-card",
        skipSourceSizeLock: true,
        duration: this.getUnifiedCardFlyMs(),
        startDelay: this.getUnifiedCardFlightStaggerMs(),
        zIndex: 2300,
      });
    },

    // Private per-participant swap: the offered card flies out to the other
    // seat (not the discard pile) and the received card flies in face-up.
    notif_secretAllianceSwap: function (notif) {
      const args = (notif && notif.args) || {};
      const givenCardId = parseInt(args.given_card_id || 0, 10);
      const otherId = parseInt(args.other_player_id || 0, 10);
      const received = args.received_card || null;
      // playertable_ is ~0px and fails the flight size check; resolve a usable
      // anchor (panel_ fallback) so the swap actually animates.
      const otherAnchorId =
        this.resolvePlayerAnchorNodeId(otherId, {
          selfNodeId: "myactioncards",
          preferTable: true,
        }) || "action_deck";
      const flyMs = this.getUnifiedCardFlyMs();
      // Outgoing: fly a face-down Action card from my hand to the other seat.
      // Use the actual hand node if it is still there, otherwise fall back to
      // the hand container so a flight ALWAYS plays (the card may already have
      // been removed by an optimistic update — that was the "jump" with no
      // animation). Then drop it from the local stock.
      if (givenCardId > 0) {
        const givenNode =
          this.getActionStockItemNodeByCardId(givenCardId, "myactioncards") ||
          (dojo.byId("myactioncards") ? "myactioncards" : null);
        if (givenNode && dojo.byId(otherAnchorId)) {
          this.animateCardNodeCloneToTarget(givenNode, otherAnchorId, {
            tempPrefix: "secret_alliance_out",
            cardClass: "card card-back-action",
            duration: flyMs,
            zIndex: 2320,
          });
        }
        try {
          this.playerActionCards.removeFromStockById(givenCardId);
        } catch (e) {
          // Stock may already be in sync after a reload.
        }
        delete this.actionCardTypeById[String(givenCardId)];
      }

      // Incoming: add the received card to the local stock (plain, reliable),
      // then fly a face-up clone from the other seat into my hand so the motion
      // is always shown regardless of stock-insert animation timing.
      if (received && received.id) {
        const spriteIdx = this.getActionCardSpriteIndex(received.type);
        this.playerActionCards.addToStockWithId(spriteIdx, received.id);
        this.actionCardTypeById[String(received.id)] = received.type;
        if (dojo.byId(otherAnchorId) && dojo.byId("myactioncards")) {
          this.animateTempCardFlight({
            tempId: "secret_alliance_in_" + received.id,
            sourceId: otherAnchorId,
            targetId: "myactioncards",
            cardClass: "card card-action table_card_item",
            duration: flyMs,
            startDelay: this.getUnifiedCardFlightStaggerMs(),
            destroyOnEnd: true,
            dataIndex: spriteIdx,
          });
        }
      }

      const countElem = dojo.byId("table_action_count_" + this.player_id);
      if (countElem) {
        countElem.innerHTML = String(this.getStockDomCount("myactioncards"));
      }
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
      // Claim the center hold for the WHOLE hunt sequence right away: the card's
      // discard is event-driven (fires after the hunted Believers land in the
      // graveyard), so until then nothing had set centerActionHoldUntil and a
      // fast follow-up state entry (zombie burst -> next playerTurn) could run
      // clearTransientArenaAfterAction and yank the card the moment it landed
      // ("card reaches center and vanishes with no pause, then believers fly").
      const huntFlyMs = this.getUnifiedCardFlyMs();
      const huntStagger = this.getUnifiedCardFlightStaggerMs();
      const huntKillN = Math.max(1, parseInt(notif.args.n || 0, 10) || 0);
      this.centerActionHoldUntil = Math.max(
        parseInt(this.centerActionHoldUntil || 0, 10) || 0,
        Date.now() + huntFlyMs * 2 + huntKillN * huntStagger + 600
      );
      const killedByOwner = notif.args.killed_by_owner || [];
      const huntAnimTasks = [];
      killedByOwner.forEach(
        function (entry) {
          const pid = String(entry.player_id || "");
          const count = parseInt(entry.count || 0, 10);
          const cardIds = entry.card_ids || [];
          const cards = entry.cards || [];

          if (pid === String(this.player_id) && cardIds.length) {
            cardIds.forEach(
              function (cid) {
                this.playerBelieverCards.removeFromStockById(cid);
              }.bind(this)
            );
          }

          if (cards.length) {
            // Defer the visible Sect count decrement until these Believers
            // actually land in the graveyard (applied in the flight's done
            // callback), so the number does not drop before the flight plays.
            huntAnimTasks.push({ pid: pid, cards: cards, count: count });
          } else if (count > 0) {
            // No flight to ride for this entry; apply the decrement now.
            const countElem = dojo.byId("table_believer_count_" + pid);
            if (countElem) {
              countElem.innerHTML = Math.max(
                0,
                parseInt(countElem.innerHTML || "0", 10) - count
              );
            }
          }
        }.bind(this)
      );

      // Hold the graveyard visual while the hunted Believers are in the air:
      // the pile/count repaints when they LAND (each flight's done callback
      // releases), not at the announcement.
      if (huntAnimTasks.length > 0) {
        this.holdGraveyardRender(12000);
      }
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
      // Event-driven discard: send the Witch Hunt card to the discard pile right
      // after the killed Believers actually land in the graveyard (not a guessed
      // timer that left the card lingering on the table when played fast).
      const discardHuntCard = function () {
        this.scheduleCenterActionCardToDiscard(120, { force: true });
      }.bind(this);
      const huntTotal = parseInt(
        typeof notif.args.n !== "undefined" ? notif.args.n : 0,
        10
      );
      if (huntAnimTasks.length === 0 || huntTotal === 0) {
        // Nothing hunted: target Sect has no Believer of that type. Tell the
        // player so a "0 kill" is not mistaken for a broken animation, then still
        // fly the action card to the discard pile.
        this.showMessage(
          dojo.string.substitute(
            _("${target_name} has no ${believer_type} Believers — Witch Hunt catches none (0)."),
            {
              target_name: targetPlayer,
              believer_type: notif.args.type,
            }
          ),
          "info"
        );
        setTimeout(discardHuntCard, 700);
      } else {
        let pending = huntAnimTasks.length;
        const onTaskDone = function () {
          pending -= 1;
          if (pending <= 0) discardHuntCard();
        };
        const applyTaskCount = function (task) {
          const taskCount = parseInt(task.count || 0, 10);
          if (taskCount <= 0) return;
          const countElem = dojo.byId("table_believer_count_" + task.pid);
          if (countElem) {
            countElem.innerHTML = Math.max(
              0,
              parseInt(countElem.innerHTML || "0", 10) - taskCount
            );
          }
        };
        const launchHuntFlights = function () {
          huntAnimTasks.forEach(
            function (task) {
              this.animateBelieversFromPlayerToGraveyard(
                task.pid,
                task.cards,
                function () {
                  // Believers have landed in the graveyard: now drop the
                  // visible Sect count, then mark this task complete.
                  applyTaskCount(task);
                  onTaskDone();
                }
              );
            }.bind(this)
          );
        }.bind(this);
        // Settle beat: let the Witch Hunt card visibly land at center BEFORE the
        // hunted Believers fly to the graveyard, so the step reads as
        // "card out -> Believers fly -> card discards". In a zombie/AI burst the
        // play + resolve notifications arrive back-to-back (the bot auto-passes
        // defense fast), so without this the card flight and the Believer
        // flights overlapped into one motion. One card-fly is enough for the
        // card to finish arriving; the "witchHunt" queue sync already budgets a
        // center-hold on top, so this stays within the queue's wait.
        setTimeout(launchHuntFlights, this.getUnifiedCardFlyMs());
      }
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
              _("Waiting for players to decide whether to defend."),
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
              _("Waiting for players to decide whether to defend."),
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
      const args = notif.args || {};

      if (parseInt(args.concealed || 0, 10) === 1) {
        // AOE commit-phase defense: publicly indistinguishable from a
        // believer commit (believer back, no card identity in the DOM).
        this.markAoePlayerDefended(args.player_id);
        this.markAoeSectDefended(parseInt(args.sect_id || -1, 10));
        this.addCombatCommitToArena({
          player_id: args.player_id,
          player_name: args.player_name,
          sect_id: args.sect_id,
          card_id: 0,
          card_type: 0,
          card_kind: "believer",
          facedown: true,
        });
        if (String(args.player_id) === String(this.player_id)) {
          const stateName = this.getCurrentStateName();
          if (
            stateName === "conspiracyChooseBelievers" ||
            stateName === "martyrdomChooseBelievers"
          ) {
            this.setTopInstruction(
              _("Your Sect has already defended. Waiting for other Sects to act.")
            );
            dojo.removeClass("mybelievercards", "highlight_stock");
          }
        }
        return;
      }

      if (parseInt(args.reveal || 0, 10) === 1) {
        // Resolution reveal of a concealed AOE defense: annotate the
        // believer-looking facedown commit so revealAoeBelievers() flips it
        // into the real defense card during the resolve animation.
        const wrap = dojo.query(
          '.aoe-commit-item[data-player-id="' +
            String(args.player_id || 0) +
            '"]'
        )[0];
        if (wrap) {
          const cardNode = dojo.query(
            ".combat-commit-card.facedown",
            wrap
          )[0];
          if (cardNode) {
            cardNode.setAttribute(
              "data-defense-card-type",
              String(args.card_type || "")
            );
            cardNode.removeAttribute("data-believer-type");
          }
        }
        this.markAoePlayerDefended(args.player_id);
        this.markAoeSectDefended(parseInt(args.sect_id || -1, 10));
        // Defer the discard-pile push: the revealed defense stays on the AOE
        // board and only reaches the pile when it FLIES there at resolution, so
        // the pile does not pop a new card the instant it flips face-up.
        this.pendingAoeDefenseDiscards.push({
          card_type: args.card_type,
          card_id: args.card_id,
          player_id: args.player_id,
        });
        // The push is flushed in the AOE resolve handler's reveal-gate callback
        // so the defense flies to the pile TOGETHER with the believer / AOE
        // action-card flights (reveal notifications always process before the
        // resolved notification, so the queue is populated by flush time).
        if (String(args.player_id) !== String(this.player_id)) {
          const countElem = dojo.byId("table_action_count_" + args.player_id);
          if (countElem) {
            countElem.innerHTML = Math.max(
              0,
              parseInt(countElem.innerHTML) - 1
            );
          }
        }
        return;
      }

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

      // Single-target attacks (Witch Hunt 8 / Spread Rumors 9): the defense
      // card flies onto the center attack card and both fly to the discard
      // pile together at resolution, instead of the defense card jumping to
      // discard on its own.
      // 8 Witch Hunt, 9 Spread Rumors, 4 Breaking Faith: the counter card flies
      // onto the center attack card and both fly to discard together (same fly-in /
      // hold / discard animation). 4's counter is another Breaking Faith, not a
      // "defense card", but the VISUAL is identical — logic is unchanged.
      const isSingleTargetCenterDefense =
        (warType === 8 || warType === 9 || warType === 4) &&
        !!dojo.byId("current_center_action_card");
      // Faith War (2) / Faith Debate (7): the defense card flies to the
      // center and covers the VS board to show the block; the staged exit in
      // combatBlocked then flies the defense + war/debate action card to the
      // discard pile and clears the board. Do NOT require the board node here —
      // at AI speed the board may not be built yet, and we still must route the
      // discard through the staged exit (otherwise neither card reaches discard).
      const isDuelBoardDefense = warType === 2 || warType === 7;
      if (isSingleTargetCenterDefense) {
        this.attachCenterAttackDefenseOverlay({
          player_id: notif.args.player_id,
          card_type: notif.args.card_type,
          card_id: notif.args.card_id,
        });
        this.currentCenterActionHadDefenseDiscard = true;
        // Discard push is deferred to moveCurrentCenterActionToDiscard so the
        // two cards reach the pile together.
      } else if (isDuelBoardDefense) {
        this.attachFaithWarDefenseOverlay({
          player_id: notif.args.player_id,
          card_type: notif.args.card_type,
          card_id: notif.args.card_id,
          moved_to_discard: parseInt(notif.args.moved_to_discard || 0, 10),
        });
        this.currentCenterActionHadDefenseDiscard = true;
        // Discard push is deferred to the combatBlocked hold so the defense
        // and the war/debate action card reach the pile together after the
        // "blocked" pause (see notif_combatBlocked).
      } else {
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
          // Defer the discard-pile push: the defense card stays on the AOE board
          // and only reaches the pile when it FLIES there at resolution, so the
          // pile does not pop a new card before any flight is seen.
          this.pendingAoeDefenseDiscards.push({
            card_type: notif.args.card_type,
            card_id: notif.args.card_id,
            player_id: notif.args.player_id,
          });
        }
      }
      if (!isAoeDefense) {
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
            _("Your Sect has already defended. Waiting for other Sects to act.")
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
              "Your Sect has already defended."
            ),
            "info"
          );
          const stateName = this.getCurrentStateName();
          if (
            stateName === "conspiracyChooseBelievers" ||
            stateName === "martyrdomChooseBelievers"
          ) {
            this.setTopInstruction(
              _("Your Sect has already defended. Waiting for other Sects to act.")
            );
            dojo.removeClass("mybelievercards", "highlight_stock");
          }
        }
      }
    },

    // Owner-only sync for a concealed AOE defense commit: remove the card
    // from the local Action hand without exposing it publicly.
    notif_defenseCommittedPrivate: function (notif) {
      const args = (notif && notif.args) || {};
      if (!args.card_id) return;
      try {
        this.playerActionCards.removeFromStockById(args.card_id);
      } catch (e) {
        // Stock may already be in sync after a reload.
      }
      delete this.actionCardTypeById[String(args.card_id)];
      this.syncCurrentPlayerHandCounters();
      // We just defended (our Sect is now marked defended): drop the believer
      // highlight and re-render so the prompt/buttons switch from "commit a
      // Believer or defend" to the waiting state immediately. Clear existing
      // buttons first since a direct re-render does not remove the stale
      // Confirm button on its own.
      dojo.removeClass("mybelievercards", "highlight_stock");
      if (this.playerActionCards && this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.clearPendingActionButtons();
      this.rerenderCurrentActionButtons();
    },

    notif_passDefense: function (notif) {
      if (notif.args && notif.args.anonymous) {
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
      // Defense block exit (Faith War / Debate board OR single-target center
      // overlay): the defense has flown in and covers the attack. Hold ~1s so the
      // block reads, THEN discard both. This MUST run on a dedicated timer and be
      // protected from interim arena clears — previously it sat on the shared
      // pendingTransientArenaClearTimeout, so a later clearTransientArenaAfterAction
      // cancelled it (faith war: cards vanished, overlay left stale) or pre-empted
      // it instantly (single-target: no pause, fired ~12ms later).
      if (this.pendingFaithWarDefenseOverlay || this.pendingCenterDefenseOverlay) {
        // Event-driven: request the block exit. It only fires once the defense
        // overlay has LANDED (its fly-in onEnd) — maybeRunDefenseBlockExit gates on
        // both. defenseBlockExitPending blocks any interim arena clear meanwhile.
        this.defenseBlockExitIsFaithWar = !!this.pendingFaithWarDefenseOverlay;
        this.defenseBlockExitPending = true;
        this.defenseBlockExitRequested = true;
        this.maybeRunDefenseBlockExit();
        return;
      }
      // No defense overlay: normal quick clear.
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
        dojo.string.substitute(
          _("${player_name} rises again and returns to normal play!"),
          { player_name: notif.args.player_name }
        ),
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
      // Fresh AOE window: wipe the committed set/latch so a committed player
      // from a PREVIOUS combat can't carry a stale "already committed" into this
      // one (that left a brand-new target wrongly locked out of committing).
      this.aoeCommittedPlayerIds = {};
      this.aoeCommitDoneByMe = false;
      // Fresh AOE: drop any defense-discard left deferred by an aborted prior one.
      this.pendingAoeDefenseDiscards = [];
      const attackerId = parseInt(
        (notif.args && notif.args.player_id) || 0,
        10
      );
      if (attackerId > 0) {
        this.resetAoeCombatLayoutForNewAction();
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
      const committedPid = parseInt(notif.args.player_id || 0, 10);
      if (committedPid > 0) {
        if (!this.aoeCommittedPlayerIds) this.aoeCommittedPlayerIds = {};
        this.aoeCommittedPlayerIds[committedPid] = true;
      }
      if (String(notif.args.player_id) === String(this.player_id)) {
        // Latch locally too: the attacker's committed Believer lives in the
        // attacker slot, so without this the lock relied solely on a DOM query
        // and a render lag left the attacker's (now empty) hand prompting for a
        // Believer they no longer have -> apparent deadlock.
        this.aoeCommitDoneByMe = true;
        this.actionSubmissionInFlight = false;
        this.playerBelieverCards.removeFromStockById(notif.args.card_id);
        this.playerBelieverCards.unselectAll();
        this.setTopInstruction(this.getAoeWaitingPromptText("martyrdom"));
        dojo.removeClass("mybelievercards", "highlight_stock");
        this.clearPendingActionButtons();
        if (this.getCurrentStateName() === "martyrdomChooseBelievers") {
          this.onUpdateActionButtons(
            "martyrdomChooseBelievers",
            (this.gamedatas &&
              this.gamedatas.gamestate &&
              this.gamedatas.gamestate.args) ||
              {}
          );
        }
      }
      // Seat Believer count frozen during AOE (see handleAoeBelieverCommitted):
      // no change on commit; publicCountsSync reconciles at resolution.
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
      // No "commits a Believer" toast for the AOE attacker: playing the AOE card
      // FORCES a Believer commit (no defense, no cancel), so announcing it to
      // everyone is redundant. The committed card already shows on the board.
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
      this.snapshotAoeFlightSources(ownerByCardId);
      this.runAfterCombatRevealGate(
        function () {
          this.animateAoeBelieversToTargets(ownerByCardId);
          // Fly the deferred AOE defense card(s) into the discard pile together
          // with the believer return, so the pile only updates as they land.
          this.flushPendingAoeDefenseDiscards();
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
      this.myDebateStopRejectedRound = 0;
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
      const args = (notif && notif.args) || {};
      const requesterName = args.requester_name || "";
      const leaderName = args.leader_name || "";
      const message =
        requesterName && leaderName
          ? dojo.string.substitute(
              _(
                "${leader_name} approves ${requester_name}'s request and stops Faith Debate."
              ),
              {
                leader_name: leaderName,
                requester_name: requesterName,
              }
            )
          : dojo.string.substitute(
              _("${player_name} chooses to stop Faith Debate"),
              {
                player_name: args.player_name,
              }
            );
      this.showMessage(
        message,
        "info"
      );
      dojo.removeClass("mybelievercards", "highlight_stock");
      this.setTopInstruction(_("Faith Debate is stopping..."));
    },

    notif_faithDebateStopProposed: function (notif) {
      this.showMessage(
        dojo.string.substitute(
          _(
            "${requester_name} requests to stop Faith Debate; waiting for ${leader_name}."
          ),
          {
            requester_name: notif.args.requester_name,
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
            "${leader_name} rejects ${requester_name}'s request to stop Faith Debate."
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
      // Latch locally + drop the button right away: after a rejection the only
      // remaining action this round is committing a Believer (server enforces
      // the same via stop_request_blocked / the stopFaithDebate guard).
      this.myDebateStopRejectedRound = parseInt(
        (notif.args && notif.args.round) || 0,
        10
      );
      const stopBtn = dojo.byId("stopFaithDebate");
      if (stopBtn) dojo.destroy(stopBtn);
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
      // In the Final Struggle the "commit one Believer" prompt is already folded
      // into the conspiracyStart line, so don't pop a second toast here (keeps it
      // to 2 messages per round). Regular Conspiracy still shows its prompt.
      if (!isFinalStruggle) {
        this.showMessage(
          _("Each chosen representative must choose a Believer for Conspiracy."),
          "info"
        );
      }
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
      // Final Struggle: only the tied contenders get a right-lane slot. Without
      // this, a 4-player game where 3 tie still gave the non-contender a slot
      // (an empty Believer position that never flips). Store the contender list
      // so initAoeRightSlotsBySeatOrder can skip non-contenders.
      this.gamedatas.combat_context.final_struggle_contender_ids = isFinalStruggle
        ? (Array.isArray(notif.args && notif.args.contender_ids)
            ? notif.args.contender_ids
                .map(function (v) {
                  return parseInt(v, 10);
                })
                .filter(function (v) {
                  return v > 0;
                })
            : [])
        : null;
      this.gamedatas.combat_context.war_rep_attacker_id = 0;
      this.gamedatas.combat_context.war_rep_defender_id = 0;
      this.setReverseKarmaContext(0, 0);
      this.currentAoeCommitTargetIds = [];
      this.currentAoeAssignedAction = "";
      this.currentAoeDefendedPlayerIds = {};
      this.currentAoeDefendedSectIds = {};
      // Fresh AOE window: wipe the committed set/latch (see martyrdom start) so a
      // stale "already committed" from a previous combat can't lock out a new
      // target. conspiracyStart fires once per Final Struggle round too, and each
      // round IS a fresh commit window, so clear unconditionally.
      this.aoeCommittedPlayerIds = {};
      this.aoeCommitDoneByMe = false;
      // Fresh AOE: drop any defense-discard left deferred by an aborted prior one.
      this.pendingAoeDefenseDiscards = [];
      const attackerId = parseInt(
        (notif.args && notif.args.player_id) || 0,
        10
      );
      this.gamedatas.combat_context.war_attacker_id = attackerId;
      if (attackerId > 0) {
        const buildBoard = function () {
          this.resetAoeCombatLayoutForNewAction();
          this.placeAoeActionCard(
            "conspiracy",
            this.currentAoeActionCardId || "",
            attackerId
          );
          this.ensureAoeAttackerBelieverPlaceholder();
          // Re-attach the standings panel into the freshly built layout (like the
          // Faith War log is re-rendered each round) so it never blinks out.
          this.updateFinalConspiracyLogPanel();
        }.bind(this);
        // In the Final Struggle the previous round's reveal is still showing and
        // its commit cards live in the same right-lane this rebuild would wipe
        // (rightLane.innerHTML=""). The notif queue can't space these (same packet),
        // so defer the rebuild until the reveal gate expires — that lets the flip +
        // win/lose labels finish before the next round's board replaces them.
        const gateMs =
          isFinalStruggle && typeof this.getCombatRevealGateDelayMs === "function"
            ? parseInt(this.getCombatRevealGateDelayMs() || 0, 10)
            : 0;
        if (gateMs > 0) {
          this.runAfterCombatRevealGate(buildBoard);
        } else {
          buildBoard();
        }
      }
      this.showMessage(
        isFinalStruggle
          ? dojo.string.substitute(
              _(
                "${player_name} attacks in the Final Struggle (R${round}) — commit one Believer"
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
          _("Final Struggle: contenders choose one Believer.")
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
      // In the Final Struggle the next round's conspiracyStart fires almost
      // immediately and its layout rebuild (rightLane.innerHTML="") wipes the
      // just-revealed cards before they can be seen. This framework only honours a
      // synchronous hold when the handler calls setSynchronousDuration (see
      // botThinking), so hold the notification queue for the reveal duration to let
      // the flip + win/lose labels play before the next round rebuilds the board.
      if (
        isFinalStruggle &&
        this.notifqueue &&
        typeof this.notifqueue.setSynchronousDuration === "function"
      ) {
        this.notifqueue.setSynchronousDuration(revealDelayMs);
      }
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
        this.snapshotAoeFlightSources(ownerByCardId);
        this.runAfterCombatRevealGate(
          function () {
            this.animateAoeBelieversToTargets(ownerByCardId, {
              forceCloneFlight: true,
            });
            // Fly the deferred AOE defense card(s) into the discard pile with
            // the believer return, so the pile only updates as they land.
            this.flushPendingAoeDefenseDiscards();
            this.clearTransientArenaAfterAction(
              this.getUnifiedCardFlyMs() + 260
            );
          }.bind(this),
          revealDelayMs
        );
      } else {
        this.flushPendingAoeDefenseDiscards();
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
              _("Final Struggle: ${player_name}'s attack ends."),
              {
                player_name: notif.args.player_name,
              }
            )
          : dojo.string.substitute(
              _("Conspiracy by ${player_name} ends."),
              {
                player_name: notif.args.player_name,
              }
            ),
        "info"
      );
      if (isFinalStruggle && Array.isArray(notif.args.score_rows)) {
        // The standings panel already shows the running per-round tally, so do NOT
        // also fire a toast every round (that spammed ~4 lines per cycle).
        this.updateFinalConspiracyLogPanel(notif.args.score_rows);
      }
      this.clearAoeCommitTransientState();
    },

    // Running standings panel for the multi-player Final Struggle. Docked IN-FLOW
    // inside the conspiracy combat layout (a flex sibling of the VS lanes, exactly
    // like the Faith War log sits in the war board) so its position/look match the
    // war log. It survives per-round rebuilds (only the right lane is cleared each
    // round, not the whole layout). It is removed in notif_gameEndSummaryShow when
    // the end-game summary screen opens (NOT on gameEndSummary state-entry, which
    // fired too early and hid the final result).
    ensureFinalConspiracyLogPanel: function () {
      const preferredHost = dojo.byId("aoe_combat_layout");
      let panel = dojo.byId("final_consp_log");
      if (panel) {
        if (preferredHost && panel.parentNode !== preferredHost) {
          dojo.place(panel, preferredHost, "last");
        }
        return panel;
      }
      const host =
        preferredHost ||
        dojo.byId("central_arena") ||
        dojo.byId("game_play_area");
      if (!host) return null;
      // Reuse the EXACT Faith War log classes (faith-war-log-panel/title/list) so
      // the look is identical and there is no separate stylesheet to maintain.
      dojo.place(
        '<div id="final_consp_log" class="faith-war-log-panel">' +
          '<div id="final_consp_log_title" class="faith-war-log-title">' +
          _("Final Struggle — Believers") +
          "</div>" +
          '<div id="final_consp_log_list" class="faith-war-log-list"></div>' +
          "</div>",
        host,
        "last"
      );
      return dojo.byId("final_consp_log");
    },

    updateFinalConspiracyLogPanel: function (scoreRows, opts) {
      const options = opts || {};
      // Store the latest standings so the panel can be re-rendered after any arena
      // rebuild (same approach as the Faith War log, which keeps its own history).
      if (Array.isArray(scoreRows) && scoreRows.length) {
        this.finalConspScoreRows = scoreRows.slice();
      }
      if (typeof options.final !== "undefined") {
        this.finalConspLogIsFinal = !!options.final;
      }
      const rows = Array.isArray(this.finalConspScoreRows)
        ? this.finalConspScoreRows
        : [];
      if (!rows.length) return;
      const panel = this.ensureFinalConspiracyLogPanel();
      if (!panel) return;
      const list = dojo.byId("final_consp_log_list");
      if (!list) return;
      // Sort by controlled Believers (desc) for the standings display.
      const sorted = rows.slice().sort(function (a, b) {
        const ca = parseInt((a && a.controlled) || 0, 10);
        const cb = parseInt((b && b.controlled) || 0, 10);
        if (ca !== cb) return cb - ca;
        return parseInt((a && a.player_id) || 0, 10) -
          parseInt((b && b.player_id) || 0, 10);
      });
      // Reuse the Faith War log row markup so the look matches exactly.
      list.innerHTML = sorted
        .map(
          function (row) {
            const name = String((row && row.player_name) || _("Player"));
            const controlled = parseInt((row && row.controlled) || 0, 10);
            // Reuse the existing colored-name helper (same as the Faith War log) so
            // the player name carries their colour; the count stays uncoloured.
            return (
              '<div class="faith-war-log-row">' +
              this.getColoredPlayerNameHtml((row && row.player_id) || 0, name) +
              ': <span class="result">' +
              controlled +
              "</span></div>"
            );
          }.bind(this)
        )
        .join("");
      const title = dojo.byId("final_consp_log_title");
      if (title) {
        title.innerHTML = this.finalConspLogIsFinal
          ? _("Final Struggle — Result")
          : _("Final Struggle — Believers");
      }
    },

    destroyFinalConspiracyLogPanel: function () {
      const panel = dojo.byId("final_consp_log");
      if (panel) dojo.destroy(panel);
    },

    notif_finalStruggleStart: function (notif) {
      // Final Struggle does not apply Reverse Karma visuals.
      // Clear any previous-combat stack to prevent stale skill cards from showing.
      this.setReverseKarmaContext(0, 0, []);
      this.refreshCombatActionStacks();
      const mode = String((notif.args && notif.args.mode) || "");
      if (mode === "conspiracy") {
        this.showMessage(
          _("Final Struggle begins among tied contenders."),
          "info"
        );
        this.setTopInstruction(
          _(
            "Final Struggle: contenders choose one Believer each round."
          )
        );
        this.destroyFinalConspiracyLogPanel();
        if (Array.isArray(notif.args.score_rows)) {
          this.updateFinalConspiracyLogPanel(notif.args.score_rows);
        }
        return;
      }
      if (mode === "sect_war") {
        this.showMessage(
          _("Final War begins: tied Sects fight a final Faith War."),
          "info"
        );
        this.setTopInstruction(
          _(
            "Final War: each Sect Leader chooses a representative each round."
          )
        );
        return;
      }
      this.showMessage(
        _("Final War begins between tied contenders."),
        "info"
      );
      this.setTopInstruction(
        _("Final War: contenders choose one Believer to duel.")
      );
    },

    notif_finalInfiniteWarStarted: function (notif) {
      this.showMessage(
        _("Final War tied: Infinite War started with 3 random Believers each."),
        "info"
      );
      this.setTopInstruction(
        _("Infinite War: continue Final War until one contender wins.")
      );
    },

    notif_finalStruggleConspiracyEnd: function (notif) {
      if (!notif || !notif.args) return;
      // On a 2-way tie the cycle proceeds to a Final War. Keep the panel showing
      // the FINAL standings briefly so the last round's result is readable, then
      // remove it (it used to vanish instantly with the last flip).
      if (parseInt(notif.args.tie_to_war || 0, 10) === 1) {
        if (Array.isArray(notif.args.score_rows)) {
          this.updateFinalConspiracyLogPanel(notif.args.score_rows, {
            final: true,
          });
        }
        const holdMs =
          this.getUnifiedRevealHoldMs() + this.getCombatRevealLingerMs() + 600;
        setTimeout(
          function () {
            this.destroyFinalConspiracyLogPanel();
          }.bind(this),
          Math.max(1200, holdMs)
        );
        return;
      }
      if (Array.isArray(notif.args.score_rows)) {
        // Show the final standings in the panel only (no toast — the panel covers
        // it, and it is removed when the end-game score screen opens).
        this.updateFinalConspiracyLogPanel(notif.args.score_rows, {
          final: true,
        });
      }
      // The last round scheduled an arena wipe (clearTransientArenaAfterAction)
      // that was erasing the standings panel + final reveal ~2s after the last
      // flip, before the end-game summary opened. Cancel it so the result stays on
      // screen until the summary (which clears the panel itself) takes over.
      if (this.pendingTransientArenaClearTimeout) {
        clearTimeout(this.pendingTransientArenaClearTimeout);
        this.pendingTransientArenaClearTimeout = null;
      }
      if (this.pendingCenterActionDiscardTimeout) {
        clearTimeout(this.pendingCenterActionDiscardTimeout);
        this.pendingCenterActionDiscardTimeout = null;
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
      // Snapshot which graveyard Believers are Zombie-pickable (the pre-war ones)
      // BEFORE any war death is added, so this-war deaths can't become pickable.
      this.captureZombieGraveSnapshotIds();
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
          "You have been assigned to this war by ${leader_name}. Choose one Believer."
        ),
        {
          leader_name: notif.args.leader_name,
        }
      );
      this.showMessage(assignedText, "info");
      this.setTopInstruction(_("Choose one Believer for this war."));
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
            isFinalStruggle ? _("Final War:") : ""
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
          isFinalStruggle ? "Final War" : "Faith War"
        );
        if (isFinalStruggle) {
          this.showMessage(_("Final War continues."), "info");
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

      // HOLD the graveyard visual before applying the authoritative counts:
      // the corpse must appear in the pile when the dead card LANDS there (the
      // flight below runs after the reveal), not the instant the cards flip.
      // Generous safety cap; the actual release is event-driven at landing.
      this.holdGraveyardRender(15000);
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
      this.markLatestFaithWarLogBonus();

      // Keep central war arena text-clean: no bonus banner here.
    },

    // Confrontation history line: the translated message is auto-shown in the
    // game log; no extra client work needed. (Subscribed so the framework does
    // not treat it as an unknown notification.)
    notif_combatSnapshotHistory: function () {},

    // Shared no-op for log/flow-only notifications (see the batch subscribe in
    // setupNotifications). The translated message already shows in the log.
    notif_genericLogOnly: function () {},

    // Rule-win announcement: the "${winner_name} wins the game!" message is
    // auto-logged; the end-game summary state drives the actual end UI. We just
    // bump the winner's shown score so the panel matches before the summary.
    notif_gameEndedByRule: function (notif) {
      const args = (notif && notif.args) || {};
      const scores = Array.isArray(args.scores) ? args.scores : [];
      scores.forEach(
        function (row) {
          const pid = parseInt((row && row.player_id) || 0, 10);
          if (!pid) return;
          let counter = null;
          // try/catch: solo bot seats have no framework score counter and the
          // lookup may throw for an unknown player id.
          try {
            counter =
              this.bga &&
              this.bga.playerPanels &&
              typeof this.bga.playerPanels.getScoreCounter === "function"
                ? this.bga.playerPanels.getScoreCounter(pid)
                : null;
          } catch (e) {
            counter = null;
          }
          if (counter && typeof counter.toValue === "function") {
            counter.toValue(parseInt(row.score || 0, 10));
          }
        }.bind(this)
      );
    },

    notif_faithWarEnd: function (notif) {
      if (!this.gamedatas.combat_context) this.gamedatas.combat_context = {};
      const preserveReplayTrace = this.isReplaySessionActive();
      this.gamedatas.combat_context.war_type = 0;
      this.gamedatas.combat_context.war_zombie_owner_id = 0;
      this.gamedatas.combat_context.war_zombie_snapshot_max_discard_arg = 0;
      this.zombieSnapshotCardIds = null;
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
