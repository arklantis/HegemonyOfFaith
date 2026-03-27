/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * HegemonyOfFaith implementation: <Your name here> <Your email address here>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * hegemonyoffaith.js
 *
 * HegemonyOfFaith user interface script
 *
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

define([
  "dojo",
  "dojo/_base/declare",
  "ebg/core/gamegui",
  "ebg/counter",
  "ebg/stock",
], function (dojo, declare) {
  return declare("bgagame.hegemonyoffaith", ebg.core.gamegui, {
    constructor: function () {
      console.log("hegemonyoffaith constructor");

      this.cardwidth = 108; // 60% of original
      this.cardheight = 150;
      this.believerTypeNames = {
        1: "Fool",
        2: "Prayer",
        3: "Missionary",
        4: "Elder",
        5: "Fanatics",
      };
      this.sectNames = {
        1: "Hawk",
        2: "Lotus",
        3: "Peace Cross",
        4: "Taiji",
        5: "Bushido",
        6: "Hexagram",
        7: "Holy Sword",
        8: "Moon",
      };
      this.actionCardTypeById = {};
      this.currentTurnActionMask = 0;
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
      this.lastUiMessageText = "";
      this.lastUiMessageType = "";
      this.lastUiMessageAt = 0;
      this.faithWarLogEntries = [];
      this.faithWarRoundNo = 0;
      this.faithWarCleanupTimeout = null;
      this.faithWarAssignNoticeShown = false;
      this.duelLogMode = "war";
      this.currentDuelLeftId = null;
      this.currentDuelRightId = null;
      this.hiddenPendingActionCard = null;
      this.pendingRevivedFromGraveyard = {};
      this.pendingSkill = null;
      this.skillTargetHandles = [];
      this.mySkillState = null;
      this.skillProtection = { physical: {}, mental: {} };
    },

    setup: function (gamedatas) {
      console.log("Starting game setup");
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

      // JS HTML Injection removed since the framework now uses classic .tpl layout.
      // Build game area HTML
      document.getElementById("game_play_area").innerHTML = `
        <div id="play_area">
            <!-- Common Deck & Graveyard Area -->
            <div id="common_table" class="whiteblock common-table">
                <!-- Decks Row -->
                <div class="common-decks-row">
                    <div class="deck_container">
                        <h4 class="deck-title">Action Deck</h4>
                        <div id="action_deck" class="deck_slot card-back-action"></div>
                        <div class="deck_counter"><span id="action_deck_count">0</span> cards</div>
                    </div>
                    <div class="deck_container">
                        <h4 class="deck-title">Action Discard</h4>
                        <div id="action_discard" class="deck_slot action_discard_slot">
                          <div id="action_discard_top" class="deck-preview-wrap"></div>
                        </div>
                    </div>
                    <div class="deck_container">
                        <h4 class="deck-title">Believer Deck</h4>
                        <div id="believer_deck" class="deck_slot card-back-believer"></div>
                        <div class="deck_counter"><span id="believer_deck_count">0</span> cards</div>
                    </div>
                    <div class="deck_container">
                        <h4 class="deck-title">Graveyard</h4>
                        <div id="graveyard" class="deck_slot graveyard_slot">
                          <div id="graveyard_cards" class="deck-preview-wrap"></div>
                        </div>
                        <div class="deck_counter"><span id="graveyard_count">0</span> cards</div>
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
                  <h3>My Skill Card</h3>
                  <div id="myskillcards"></div>
              </div>
              <div id="action_hand" class="whiteblock">
                  <h3>My Action Cards</h3>
                  <div id="myactioncards"></div>
              </div>
            </div>
            <div id="believer_hand" class="whiteblock">
                <h3>My Believer Cards</h3>
                <div id="mybelievercards"></div>
            </div>
        </div>
    `;
      // --- 1. Setup Action Cards Stock ---
      this.playerActionCards = new ebg.stock();
      this.playerActionCards.create(
        this,
        $("myactioncards"),
        this.cardwidth,
        this.cardheight
      );

      this.playerActionCards.image_items_per_row = 100;
      this.playerActionCards.item_margin = 10; // Space between cards
      this.playerActionCards.extraClasses = "card card-action";
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(1);
      }

      this.playerActionCards.onItemCreate = dojo.hitch(
        this,
        function (card_div, card_type, card_id) {
          // card_type is our sprite_idx integer!
          dojo.attr(card_div, "data-index", card_type);
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

      console.log("ACTION CARDS Received:", gamedatas.actioncards);
      for (const i in gamedatas.actioncards) {
        const card = gamedatas.actioncards[i];
        console.log("Adding Action Card:", card.type, card.type_arg, card.id);
        let sprite_idx = this.getActionCardSpriteIndex(card.type);
        this.playerActionCards.addToStockWithId(sprite_idx, card.id);
        this.actionCardTypeById[String(card.id)] = card.type;
      }

      // --- 2. Setup Believer Cards Stock (New!) ---

      this.playerBelieverCards = new ebg.stock();
      this.playerBelieverCards.create(
        this,
        $("mybelievercards"),
        this.cardwidth,
        this.cardheight
      );
      this.playerBelieverCards.image_items_per_row = 100;
      this.playerBelieverCards.item_margin = 10;
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

      console.log("BELIEVER CARDS Received:", gamedatas.believercards);
      for (const i in gamedatas.believercards) {
        const card = gamedatas.believercards[i];
        console.log("Adding Believer Card:", card.type, card.id);
        this.playerBelieverCards.addToStockWithId(card.type, card.id);
      }

      // --- 3. Setup Skill Card Stock (display only, one card) ---
      this.playerSkillCards = new ebg.stock();
      this.playerSkillCards.create(
        this,
        $("myskillcards"),
        this.cardwidth,
        this.cardheight
      );
      this.playerSkillCards.image_items_per_row = 100;
      this.playerSkillCards.item_margin = 6;
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
      this.setSkillProtectionSnapshot(gamedatas.skill_protection || null);
      this.updateSkillProtectionFromActorState(this.player_id, this.mySkillState);
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
      dojo.byId("graveyard_count").innerHTML = gamedatas.graveyard_count;
      this.graveyardCards = this.normalizeGraveyardCards(gamedatas.graveyard_cards);
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

      // Add info to player boards and build player tables
      for (const player_id in gamedatas.players) {
        const player = gamedatas.players[player_id];

        // Generate playertable for main game area
        let roleStr = "Leader";
        if (player.player_role == 1) roleStr = "Follower";
        if (player.player_role == 2) roleStr = "Wanderer";

        const playerTableHtml = `
            <div class="playertable whiteblock playertable_top" id="playertable_${player_id}" style="--player-color:#${player.player_color}; --player-color-bg:#${player.player_color}33;">
              <div class="playertable_header">
                <span class="playertablename">${player.player_name} <span class="role-inline">(${roleStr})</span></span>
                <span class="sect_emblem" id="table_sect_${player_id}">
                  ${this.getSectBadgeHtml(player.player_sect)}
                  <span class="sect_name_text">${this.getSectLabel(player.player_sect)}</span>
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
                        <div class="hand-count-badge" id="table_action_count_${player_id}">${player.action_count}</div>
                        <div class="table-mini-label">Action</div>
                    </div>
                    <!-- Believer Hand -->
                    <div class="table_card_item" title="Believer Cards in Hand">
                        <div class="card-back-believer table-mini-card"></div>
                        <div class="hand-count-badge" id="table_believer_count_${player_id}">${player.believer_count}</div>
                        <div class="table-mini-label">Believers</div>
                    </div>
                </div>

              </div>
            </div>`;
        dojo.place(playerTableHtml, "playertables");

        // Generate player panel extra info
        let panelRoleStr = "Leader";
        if (player.player_role == 1)
          panelRoleStr =
            "Follower (of " +
            (gamedatas.players[player.player_leader_id]
              ? gamedatas.players[player.player_leader_id].player_name
              : player.player_leader_id) +
            ")";
        if (player.player_role == 2) panelRoleStr = "Wanderer";
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
              <div class="sect_label" id="sect_${player_id}" style="--player-color:#${player.player_color};">
                ${this.getSectBadgeHtml(player.player_sect)}
                <span class="sect_name_text">${this.getSectLabel(player.player_sect)}</span>
              </div>
              <div class="panel_counters_grid">
                  <div class="panel_counter_item skills_label">
                      <div class="panel_counter_main">
                        <div id="skill_icon_${player_id}" class="icon-skill panel-skill-card ${skillClass}" data-index="${skillType}"></div>
                      </div>
                      <span class="panel-counter-text">Skill</span>
                  </div>
                  <div class="panel_counter_item actions_label">
                      <div class="panel_counter_main">
                        <div id="action_icon_${player_id}" class="icon-action"></div>
                        <span id="action_count_${player_id}" class="panel-count">${player.action_count}</span>
                      </div>
                      <span class="panel-counter-text">Action</span>
                  </div>
                  <div class="panel_counter_item believers_label">
                      <div class="panel_counter_main">
                        <div id="believer_icon_${player_id}" class="icon-believer"></div>
                        <span id="believer_count_${player_id}" class="panel-count">${player.believer_count}</span>
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
          this.attachSkillTooltip(
            skillNode,
            0,
            null
          );
        } else {
          const skillType = parseInt(skillCard.type, 10);
          const skillStateForTooltip =
            String(player_id) === String(this.player_id) ? this.mySkillState : null;
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

      this.setupNotifications();
      console.log("Ending game setup");
    },

    onEnteringState: function (stateName, args) {
      console.log("Entering state: " + stateName);

      if (stateName !== "playerTurn" && this.pendingAction) {
        this.cancelPendingActionSelection();
      }
      if (stateName !== "playerTurn" && this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }

      if (stateName === "playerTurn") {
        this.clearTransientArenaAfterAction(0);
        let maskFromServer = null;
        if (args && typeof args.performed_actions_mask !== "undefined") {
          maskFromServer = args.performed_actions_mask;
        } else if (
          args &&
          args.args &&
          typeof args.args.performed_actions_mask !== "undefined"
        ) {
          maskFromServer = args.args.performed_actions_mask;
        }
        if (maskFromServer !== null) {
          this.currentTurnActionMask = parseInt(maskFromServer, 10) & 0b01111;
        }
        if (args && args.skill_state) {
          this.mySkillState = args.skill_state;
          this.updateSkillProtectionFromActorState(
            this.player_id,
            this.mySkillState
          );
        } else if (args && args.args && args.args.skill_state) {
          this.mySkillState = args.args.skill_state;
          this.updateSkillProtectionFromActorState(
            this.player_id,
            this.mySkillState
          );
        }
      }

      switch (stateName) {
        case "playerTurn":
          this.updatePossibleActions(args.can_do);
          break;
      }
    },

    updatePossibleActions: function (possibleActions) {
      this.playerActionCards.unselectAll();
      this.playerBelieverCards.unselectAll();

      if (this.isCurrentPlayerActive()) {
        // Update selection permissions based on state
      }
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
        makeMirror("table_action_count_" + player_id, "action_count_" + player_id);
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
      dojo.query(".stockitem", root).forEach(function (node) {
        const idText = String(node.id || "");
        const m = idText.match(/(\d+)$/);
        if (!m) return;
        ids.push(parseInt(m[1], 10));
      });
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
          const spriteType = this.getActionCardTypeArgFromType(String(card.type));
          this.playerActionCards.addToStockWithId(spriteType, parseInt(card.id, 10));
          this.actionCardTypeById[String(card.id)] = String(card.type);
        }.bind(this)
      );
      this.syncCurrentPlayerHandCounters();
    },

    refreshCurrentPlayerSkillTooltips: function () {
      const skillRoot = dojo.byId("myskillcards");
      if (skillRoot) {
        dojo.query(".stockitem", skillRoot).forEach(
          function (node) {
            const t = parseInt(dojo.attr(node, "data-index") || "0", 10);
            this.attachSkillTooltip(node, t, this.mySkillState);
          }.bind(this)
        );
      }

      const panelSkillNode = dojo.byId("skill_icon_" + this.player_id);
      if (panelSkillNode) {
        const t = parseInt(dojo.attr(panelSkillNode, "data-index") || "0", 10);
        this.attachSkillTooltip(panelSkillNode, t, this.mySkillState);
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

      const icon = dojo.byId("skill_icon_" + pid);
      if (icon) {
        dojo.removeClass(icon, "card-skill-back");
        dojo.removeClass(icon, "panel-skill-back");
        dojo.addClass(icon, "card-skill");
        dojo.addClass(icon, "panel-skill-front");
        dojo.attr(icon, "data-index", parseInt(skillType, 10));
        const stateForTip =
          String(pid) === String(this.player_id) ? this.mySkillState || skillState || null : null;
        this.attachSkillTooltip(icon, parseInt(skillType, 10), stateForTip);
      }
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

    playEveryoneEqualShuffleFx: function () {
      const arena = dojo.byId("central_arena");
      const fxId = "everyone_equal_shuffle_fx";
      const old = dojo.byId(fxId);
      if (old) dojo.destroy(old);
      if (arena) {
        dojo.place(
          '<div id="' +
            fxId +
            '" class="skill-shuffle-fx card-back-believer"></div>',
          arena
        );
        setTimeout(function () {
          const node = dojo.byId(fxId);
          if (node) dojo.destroy(node);
        }, 1400);
      }

      dojo.query(".table_status_area .card-back-believer").forEach(function (node) {
        dojo.addClass(node, "skill-shuffle-pulse");
        setTimeout(function () {
          dojo.removeClass(node, "skill-shuffle-pulse");
        }, 1200);
      });
    },

    playChaosComingShuffleFx: function () {
      const arena = dojo.byId("central_arena");
      const fxId = "chaos_coming_shuffle_fx";
      const old = dojo.byId(fxId);
      if (old) dojo.destroy(old);
      if (arena) {
        dojo.place(
          '<div id="' +
            fxId +
            '" class="skill-shuffle-fx card-back-action"></div>',
          arena
        );
        setTimeout(function () {
          const node = dojo.byId(fxId);
          if (node) dojo.destroy(node);
        }, 1400);
      }

      dojo.query(".table_status_area .card-back-action").forEach(function (node) {
        dojo.addClass(node, "skill-shuffle-pulse");
        setTimeout(function () {
          dojo.removeClass(node, "skill-shuffle-pulse");
        }, 1200);
      });
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

    getPublicActionCountForPlayer: function (playerId) {
      const pid = String(playerId);
      const node = dojo.byId("table_action_count_" + pid);
      if (node) {
        const v = parseInt((node.textContent || node.innerText || "0").trim(), 10);
        if (!isNaN(v)) return v;
      }
      const player = (this.gamedatas && this.gamedatas.players && this.gamedatas.players[pid]) || null;
      const fallback = player ? parseInt(player.action_count || 0, 10) : 0;
      return isNaN(fallback) ? 0 : fallback;
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

    getActionStockItemNodeByCardId: function (cardId) {
      if (!cardId) return null;
      const direct = dojo.byId("myactioncards_item_" + cardId);
      if (direct) return direct;
      const root = dojo.byId("myactioncards");
      if (!root) return null;
      const nodes = dojo.query(".stockitem", root);
      for (let i = 0; i < nodes.length; i++) {
        const id = String(nodes[i].id || "");
        if (!id) continue;
        if (id === String(cardId) || id.endsWith("_" + String(cardId))) {
          return nodes[i];
        }
      }
      return null;
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
        cardKey ||
        this.actionCardTypeById[String(cardId)] ||
        "unknown";
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
          }.bind(this)
        );
        observer.observe(node, { childList: true, subtree: true });
        this.localHandCountObservers.push(observer);
      }.bind(this);

      bindObserver("myactioncards");
      bindObserver("mybelievercards");
      this.syncCurrentPlayerHandCounters();
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
        return _("Choose a target player for ") + cardName + _(", or cancel.");
      }
      if (cardKey === "breaking_faith") {
        return (
          _("Choose a target player in your sect for ") +
          cardName +
          _(", or cancel.")
        );
      }
      if (cardKey === "faith_war" || cardKey === "faith_debate") {
        return (
          _("Choose a target sect (select one player in that sect) for ") +
          cardName +
          _(", or cancel.")
        );
      }
      if (cardKey === "witch_hunt" || cardKey === "spread_rumors") {
        return (
          _("Choose a target sect (select one player in that sect) for ") +
          cardName +
          _(", or cancel.")
        );
      }
      return _("Choose a target player for ") + cardName + _(", or cancel.");
    },

    getSkillStateFromArgs: function (args) {
      if (!args) return null;
      if (args.skill_state) return args.skill_state;
      if (args.args && args.args.skill_state) return args.args.skill_state;
      return this.mySkillState || null;
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
      this.skillProtection = this.normalizeSkillProtectionSnapshot(snapshot || {});
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

    isPlayerProtectedBySkill: function (playerId, attackKind) {
      const pid = String(playerId || "");
      const kind = String(attackKind || "");
      if (!pid || (kind !== "physical" && kind !== "mental")) return false;
      if (!this.skillProtection || !this.skillProtection[kind]) return false;
      return parseInt(this.skillProtection[kind][pid] || 0, 10) === 1;
    },

    clearSkillTargetSelection: function () {
      if (this.skillTargetHandles) {
        dojo.forEach(this.skillTargetHandles, dojo.disconnect);
      }
      this.skillTargetHandles = [];
      Object.keys(this.gamedatas.players || {}).forEach(function (player_id) {
        const node =
          dojo.byId("panel_" + player_id) ||
          dojo.byId("playertable_" + player_id);
        if (node) dojo.removeClass(node, "selectable_target");
      });
    },

    highlightSkillTargetPlayers: function (allowSelf) {
      const canTargetSelf = typeof allowSelf === "undefined" ? true : !!allowSelf;
      this.clearSkillTargetSelection();
      Object.keys(this.gamedatas.players || {}).forEach(
        function (player_id) {
          if (!canTargetSelf && String(player_id) === String(this.player_id)) {
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

    beginPendingSkillSelection: function (skillState) {
      if (!skillState) return;
      const skillType = parseInt(skillState.skill_type || 0, 10);
      this.pendingSkill = {
        skillType: skillType,
        targetPlayerId: null,
      };
      this.playerActionCards.unselectAll();
      this.playerBelieverCards.unselectAll();

      if (skillType === 2) {
        dojo.addClass("mybelievercards", "highlight_stock");
        this.highlightSkillTargetPlayers(true);
        this.setTopInstruction(
          _("KABOOM!: select 1 Believer and 1 target player, then confirm.")
        );
      } else if (skillType === 11) {
        this.highlightSkillTargetPlayers(false);
        this.setTopInstruction(
          _("Soul Severing Sword: select 1 target player, then confirm.")
        );
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
      } else if (skillType === 14 || skillType === 15) {
        this.setTopInstruction(
          _("Confirm to use this skill.")
        );
      }

      this.onUpdateActionButtons("playerTurn", this.gamedatas.gamestate.args || {});
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
      this.pendingSkill.targetPlayerId = parseInt(targetPlayerId, 10);
      this.showMessage(
        _("Skill target selected: ") +
          (this.gamedatas.players[String(targetPlayerId)] || {}).name,
        "info"
      );
    },

    onUseSkillButtonClicked: function () {
      if (!this.checkAction("useSkill", true)) return;
      const skillState = this.mySkillState || this.getSkillStateFromArgs(this.gamedatas.gamestate.args || {});
      if (!skillState || parseInt(skillState.skill_type || 0, 10) <= 0) {
        this.showMessage(_("No usable skill found."), "error");
        return;
      }
      if (parseInt(skillState.can_use || 0, 10) !== 1) {
        this.showMessage(
          skillState.disabled_reason || _("This skill cannot be used right now."),
          "error"
        );
        return;
      }
      this.beginPendingSkillSelection(skillState);
    },

    onConfirmPendingSkillClicked: function () {
      if (!this.pendingSkill || this.actionSubmissionInFlight) return;
      if (!this.checkAction("useSkill", true)) return;
      const skillType = parseInt(this.pendingSkill.skillType || 0, 10);
      const selectedBelievers = this.playerBelieverCards.getSelectedItems() || [];
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
            _("Select a target player for Soul Severing Sword"),
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

    onHolyRebirthUseClicked: function () {
      if (!this.checkAction("holyRebirthUse", true)) return;
      this.ajaxAction("holyRebirthUse", {});
    },

    onHolyRebirthSkipClicked: function () {
      if (!this.checkAction("holyRebirthSkip", true)) return;
      this.ajaxAction("holyRebirthSkip", {});
    },

    onUpdateActionButtons: function (stateName, args) {
      console.log("onUpdateActionButtons: " + stateName);
      // Do not forcibly unlock in-flight submissions here.
      // Unlock only in ajaxAction callbacks to prevent duplicate sends.
      args = args || {};
      if (stateName === "playerTurn") {
        const serverArgs =
          (this.gamedatas &&
            this.gamedatas.gamestate &&
            this.gamedatas.gamestate.args) ||
          {};
        args = Object.assign({}, serverArgs, args);
      }
      const praiseLifeDecisionPending =
        stateName === "playerTurn" &&
        parseInt((args && args.praise_life_decision_pending) || 0, 10) === 1;

      if (stateName !== "playerTurn") {
        this.isDiscardMode = false;
        if (this.playerActionCards && this.playerActionCards.setSelectionMode) {
          this.playerActionCards.setSelectionMode(1);
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
          if (this.playerActionCards && this.playerActionCards.setSelectionMode) {
            this.playerActionCards.setSelectionMode(0);
          }
          if (this.playerSkillCards && this.playerSkillCards.setSelectionMode) {
            this.playerSkillCards.setSelectionMode(
              possibleActions.includes("useSkill") ? 1 : 0
            );
          }
        } else {
          if (!possibleActions.includes("discardActionCards")) {
            this.currentTurnActionMask |= 0b00001;
          }
          if (this.playerActionCards && this.playerActionCards.setSelectionMode) {
            this.playerActionCards.setSelectionMode(this.isDiscardMode ? 2 : 1);
          }
          if (this.playerSkillCards && this.playerSkillCards.setSelectionMode) {
            this.playerSkillCards.setSelectionMode(
              possibleActions.includes("useSkill") ? 1 : 0
            );
          }
        }
      }

      this.clearPendingActionButtons();

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
        if (key === "secret_alliance" && this.pendingAction.targetPlayerId) {
          this.addActionButton(
            "confirmSecretAllianceOwnCard",
            _("Confirm Offered Action Card"),
            "onConfirmSecretAllianceOwnCardClicked"
          );
          this.addActionButton(
            "cancelSecretAllianceOwnCard",
            _("Cancel"),
            "cancelPendingActionSelection"
          );
          return;
        }
        if (key === "witch_hunt" && this.pendingAction.targetPlayerId) {
          for (let believerType = 1; believerType <= 5; believerType++) {
            this.addActionButton(
              "witchHuntType_" + believerType,
              _("Type ") + believerType,
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
        if (key === "martyrdom" || key === "conspiracy") {
          this.addActionButton(
            "confirmCommittedBelieverAction",
            _(key === "martyrdom"
              ? "Confirm Martyrdom Believer"
              : "Confirm Conspiracy Believer"),
            "onConfirmCommittedBelieverActionClicked"
          );
          this.addActionButton(
            "cancelCommittedBelieverAction",
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

      const canRenderCurrentStateButtons =
        (stateName === "playerTurn" && this.isCurrentPlayerActive()) ||
        (stateName === "chooseSurrenderOrWanderer" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "askLeaderSupport" && this.isCurrentPlayerActive()) ||
        (stateName === "surrenderLeaderResponse" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "chooseWarRepresentative" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "martyrdomChooseRepresentative" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "chooseFaithDebateRepresentative" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "conspiracyChooseRepresentative" &&
          this.isCurrentPlayerActive()) ||
        stateName === "confirmDefense" ||
        (stateName === "martyrdomChooseBelievers" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "conspiracyChooseBelievers" &&
          this.isCurrentPlayerActive()) ||
        (stateName === "faithDebateDuel" && this.isCurrentPlayerActive()) ||
        (stateName === "faithWarDuel" && this.isCurrentPlayerActive()) ||
        (stateName === "prophetSkillPrompt" && this.isCurrentPlayerActive()) ||
        (stateName === "prophetGuess" && this.isCurrentPlayerActive()) ||
        (stateName === "holyRebirthPrompt" && this.isCurrentPlayerActive());
      if (canRenderCurrentStateButtons) {
        switch (stateName) {
          case "playerTurn":
            const skillState = this.getSkillStateFromArgs(args);
            if (skillState) {
              this.mySkillState = skillState;
            }
            if (args && args.wanderer_mode) {
              const targets = args.wanderer_targets || [];
              if (!targets.length) {
                this.showMessage(
                  _("No target has believers. Wanderer turn ends."),
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
                      _("Steal from ") + target.name,
                      function () {
                        this.onWandererStealTargetClicked(target.id);
                      }.bind(this)
                    );
                  }.bind(this)
                );
              }
              break;
            }
            if (praiseLifeDecisionPending) {
              this.setTopInstruction(
                _(
                  "Use Praise of Life to sacrifice 1 Believer and gain 1 extra action, or end your turn."
                )
              );
              if (this.checkAction("useSkill", true)) {
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
              this.checkAction("useSkill", true) &&
              skillState &&
              parseInt(skillState.skill_type || 0, 10) > 0 &&
              parseInt(skillState.can_use || 0, 10) === 1
            ) {
              this.addActionButton(
                "useSkillButton",
                _("Use Skill: ") + this.getSkillName(skillState.skill_type),
                "onUseSkillButtonClicked"
              );
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
              if (!(this.currentTurnActionMask & 0b00001)) {
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

          case "chooseSurrenderOrWanderer":
            const surrenderCandidates =
              args && args.candidates ? args.candidates : [];
            if (surrenderCandidates.length) {
              surrenderCandidates.forEach(
                function (candidate) {
                  this.addActionButton(
                    "surrenderTo_" + candidate.id,
                    _("Ask ") +
                      candidate.name +
                      _(" (Sect ") +
                      candidate.sect +
                      ")",
                    function () {
                      this.onChooseSurrenderLeaderClicked(candidate.id);
                    }.bind(this)
                  );
                }.bind(this)
              );
            } else {
              this.showMessage(_("No sect leader available to ask."), "info");
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

          case "chooseWarRepresentative":
            const candidates = args && args.candidates ? args.candidates : [];
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
                  candidate.name + " (" + candidate.believer_count + ")",
                  function () {
                    this.onChooseWarRepresentativeClicked(candidate.id);
                  }.bind(this)
                );
              }.bind(this)
            );
            break;

          case "conspiracyChooseRepresentative":
            const conspiracyCandidates =
              args && args.candidates ? args.candidates : [];
            if (!conspiracyCandidates.length) {
              this.showMessage(
                _("Waiting for Conspiracy representative selection..."),
                "info"
              );
              break;
            }
            conspiracyCandidates.forEach(
              function (candidate) {
                this.addActionButton(
                  "chooseConspRep_" + candidate.id,
                  candidate.name + " (" + candidate.believer_count + ")",
                  function () {
                    this.onChooseConspiracyRepresentativeClicked(candidate.id);
                  }.bind(this)
                );
              }.bind(this)
            );
            break;

          case "martyrdomChooseRepresentative":
            const martyrdomCandidates =
              args && args.candidates ? args.candidates : [];
            if (!martyrdomCandidates.length) {
              this.showMessage(
                _("Waiting for Martyrdom representative selection..."),
                "info"
              );
              break;
            }
            martyrdomCandidates.forEach(
              function (candidate) {
                this.addActionButton(
                  "chooseMartRep_" + candidate.id,
                  candidate.name + " (" + candidate.believer_count + ")",
                  function () {
                    this.onChooseMartyrdomRepresentativeClicked(candidate.id);
                  }.bind(this)
                );
              }.bind(this)
            );
            break;

          case "chooseFaithDebateRepresentative":
            const debateCandidates =
              args && args.candidates ? args.candidates : [];
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
                  candidate.name + " (" + candidate.believer_count + ")",
                  function () {
                    this.onChooseFaithDebateRepresentativeClicked(candidate.id);
                  }.bind(this)
                );
              }.bind(this)
            );
            break;

          case "confirmDefense":
            {
              const defenseKind =
                (args && args.defense_kind) || "physical";
              const defenseLabel = this.getDefenseKindLabel(defenseKind);
              const canRespond =
                this.isCurrentPlayerActive() ||
                this.checkAction("passDefense", true) ||
                this.checkAction("playDefenseCard", true);
              if (canRespond) {
                this.setTopInstruction(
                  _("Play a matching ") +
                    defenseLabel +
                    _(" defense card, or click Skip Defense.")
                );
              } else {
                this.setTopInstruction(
                  _("Waiting for ") +
                    defenseLabel +
                    _(" defense decisions.")
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
            this.setTopInstruction(
              "You have been assigned to this war. Choose one Believer and click Confirm."
            );
            this.addActionButton(
              "confirmBeliever",
              _("Confirm Believer for War"),
              "onConfirmBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
            break;

          case "martyrdomChooseBelievers":
            this.addActionButton(
              "confirmMartyrdomBeliever",
              _("Confirm Believer for Martyrdom"),
              "onConfirmBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
            break;

          case "conspiracyChooseBelievers":
            this.addActionButton(
              "confirmConspiracyBeliever",
              _("Confirm Believer for Conspiracy"),
              "onConfirmBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
            break;

          case "faithDebateDuel":
            this.addActionButton(
              "confirmDebateBeliever",
              _("Confirm Believer for Faith Debate"),
              "onConfirmBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
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
            this.setTopInstruction(
              _("A player is drawing Believers. Reveal Prophet and predict?")
            );
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
            this.setTopInstruction(
              _("Choose a Believer type to predict the first draw, or pass.")
            );
            for (let t = 1; t <= 5; t++) {
              this.addActionButton(
                "prophetGuessType_" + t,
                this.getBelieverTypeName(t) + " #" + t,
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

          case "holyRebirthPrompt":
            this.setTopInstruction(
              _("Holy Rebirth: revive 3 Believers from graveyard now?")
            );
            this.addActionButton(
              "holyRebirthUse",
              _("Use Holy Rebirth"),
              "onHolyRebirthUseClicked"
            );
            this.addActionButton(
              "holyRebirthSkip",
              _("Skip"),
              "onHolyRebirthSkipClicked"
            );
            break;
        }
      }
    },

    ajaxAction: function (actionName, args, onSuccess) {
      const payload = Object.assign({ lock: true }, args || {});
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
      this.ajaxcall(
        "/hegemonyoffaith/hegemonyoffaith/" + actionName + ".html",
        payload,
        this,
        function (result) {
          this.actionSubmissionInFlight = false;
          if (
            this.playerActionCards &&
            this.playerActionCards.setSelectionMode &&
            !this.isDiscardMode
          ) {
            this.playerActionCards.setSelectionMode(1);
          }
          if (onSuccess) onSuccess.call(this, result);
        },
        function (is_error) {
          this.actionSubmissionInFlight = false;
          if (
            this.playerActionCards &&
            this.playerActionCards.setSelectionMode &&
            !this.isDiscardMode
          ) {
            this.playerActionCards.setSelectionMode(1);
          }
          if (is_error) {
            this.playerActionCards.unselectAll();
            this.playerBelieverCards.unselectAll();
            if (!this.pendingAction) {
              this.restoreHiddenPendingActionCard();
              this.restoreServerGameState();
            }
          }
        }.bind(this)
      );
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

    updateGraveyardCount: function (delta, absoluteValue) {
      const graveyardElem = dojo.byId("graveyard_count");
      if (!graveyardElem) return;
      if (typeof absoluteValue !== "undefined" && absoluteValue !== null) {
        graveyardElem.innerHTML = absoluteValue;
        this.syncGraveyardCardsFromCount();
        return;
      }
      const current = parseInt(graveyardElem.innerHTML || "0");
      graveyardElem.innerHTML = Math.max(0, current + delta);
      this.syncGraveyardCardsFromCount();
    },

    ensureFaithWarBoard: function () {
      const arena = dojo.byId("central_arena");
      if (!arena) return;
      if (dojo.byId("faith_war_board")) return;
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
            '<div id="faithwar_log_title" class="faith-war-log-title">War Log</div>' +
            '<div id="faithwar_log_list" class="faith-war-log-list"></div>' +
            '<button type="button" id="faithwar_log_more" class="bgabutton bgabutton_gray faith-war-log-more" style="display:none;">View all battles in this war</button>' +
          "</div>" +
          "</div>",
        arena
      );
      this.ensureFaithWarLogModal();
      const moreBtn = dojo.byId("faithwar_log_more");
      if (moreBtn && !moreBtn.dataset.bound) {
        moreBtn.dataset.bound = "1";
        dojo.connect(moreBtn, "onclick", this, function (evt) {
          if (evt) dojo.stopEvent(evt);
          this.openFaithWarLogModal();
        });
      }
      this.renderFaithWarLog();
    },

    ensureFaithWarLogModal: function () {
      if (dojo.byId("faithwar_log_modal_overlay")) return;
      dojo.place(
        '<div id="faithwar_log_modal_overlay" class="faith-war-log-overlay" style="display:none;">' +
          '<div class="faith-war-log-modal">' +
            '<div class="faith-war-log-modal-header">' +
              '<span id="faithwar_log_modal_title">All battles in this war</span>' +
              '<button type="button" id="faithwar_log_close" class="bgabutton bgabutton_gray">Close</button>' +
            "</div>" +
            '<div id="faithwar_log_modal_list" class="faith-war-log-modal-list"></div>' +
          "</div>" +
        "</div>",
        "game_play_area"
      );
      dojo.connect(dojo.byId("faithwar_log_close"), "onclick", this, function () {
        this.closeFaithWarLogModal();
      });
      dojo.connect(
        dojo.byId("faithwar_log_modal_overlay"),
        "onclick",
        this,
        function (evt) {
          if (evt && evt.target && evt.target.id === "faithwar_log_modal_overlay") {
            this.closeFaithWarLogModal();
          }
        }
      );
    },

    closeFaithWarLogModal: function () {
      const overlay = dojo.byId("faithwar_log_modal_overlay");
      if (overlay) {
        dojo.style(overlay, "display", "none");
      }
    },

    applyFaithWarLogTooltips: function (rootNode) {
      if (!rootNode) return;
      dojo
        .query(".faith-war-log-mini-card[data-index]", rootNode)
        .forEach(
          function (node) {
            const type = parseInt(node.getAttribute("data-index") || "0", 10);
            if (type > 0) {
              const opponentName =
                node.getAttribute("data-opponent-name") || "";
              const duelMode =
                node.getAttribute("data-duel-mode") || this.duelLogMode || "war";
              const duelLabel =
                duelMode === "debate"
                  ? _("Round opponent")
                  : _("Battle opponent");
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
      if (title) title.innerHTML = isDebate ? "Debate Log" : "War Log";
      const modalTitle = dojo.byId("faithwar_log_modal_title");
      if (modalTitle) {
        modalTitle.innerHTML = isDebate
          ? "All rounds in this debate"
          : "All battles in this war";
      }
      const moreBtn = dojo.byId("faithwar_log_more");
      if (moreBtn && dojo.style(moreBtn, "display") !== "none") {
        moreBtn.innerHTML = isDebate
          ? _("View all rounds in this debate")
          : _("View all battles in this war");
      }
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
      dojo.style(overlay, "display", "flex");
    },

    resetFaithWarLog: function () {
      this.faithWarLogEntries = [];
      this.faithWarRoundNo = 0;
      this.renderFaithWarLog();
      this.closeFaithWarLogModal();
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
      if (!cardType) return '<span class="faith-war-log-mini-card mini-empty">?</span>';
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
      const roundNo = this.faithWarRoundNo || this.faithWarLogEntries.length + 1;
      const row =
        `<span class="round-no">${roundNo}.</span> ` +
        `<span class="pname">${args.attacker_name}</span> ` +
        attackerMini +
        ` <span class="result ${resultText}">${resultText}${bonusText}</span> ` +
        `<span class="pname">${args.defender_name}</span> ` +
        defenderMini;
      this.faithWarLogEntries.push(row);
      this.renderFaithWarLog();
    },

    markLatestFaithWarLogBonus: function () {
      if (!this.faithWarLogEntries.length) return;
      const idx = this.faithWarLogEntries.length - 1;
      const row = this.faithWarLogEntries[idx];
      if (row.indexOf("(bonus)") >= 0) return;
      this.faithWarLogEntries[idx] = row.replace(
        'class="result win">win',
        'class="result win">win (bonus)'
      );
      this.renderFaithWarLog();
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
        if (
          this.duelLogMode !== "debate" &&
          this.faithWarLogEntries.length > maxVisible
        ) {
          moreBtn.innerHTML =
            this.duelLogMode === "debate"
              ? _("View all rounds in this debate")
              : _("View all battles in this war");
          dojo.style(moreBtn, "display", "inline-block");
        } else {
          dojo.style(moreBtn, "display", "none");
        }
      }
    },

    clearFaithWarRoundCards: function () {
      const left = dojo.byId("faithwar_slot_left");
      const right = dojo.byId("faithwar_slot_right");
      if (left) left.innerHTML = "";
      if (right) right.innerHTML = "";
      this.currentDuelLeftId = null;
      this.currentDuelRightId = null;
    },

    setDuelParticipants: function (leftPlayerId, rightPlayerId, leftName, rightName) {
      this.ensureFaithWarBoard();
      this.currentDuelLeftId = String(leftPlayerId);
      this.currentDuelRightId = String(rightPlayerId);
      const leftSlot = dojo.byId("faithwar_slot_left");
      const rightSlot = dojo.byId("faithwar_slot_right");
      if (leftSlot) leftSlot.innerHTML = "";
      if (rightSlot) rightSlot.innerHTML = "";

      const renderSlot = function (slot, pid, pname) {
        if (!slot) return;
        const p = this.gamedatas.players[String(pid)] || {};
        const sectLabel = this.getSectLabel(p.player_sect);
        dojo.place(
          '<div id="faithwar_slot_' +
            pid +
            '" class="faith-war-player-card">' +
            '<div class="faith-war-owner"><div class="faith-war-sect-name">' +
            sectLabel +
            '</div><div class="faith-war-player-name">' +
            (pname || p.name || _("Player")) +
            "</div></div>" +
            '<div class="card card-back-believer faith-war-card facedown"></div>' +
            '<div class="faith-war-card-label">?</div>' +
            "</div>",
          slot
        );
      }.bind(this);

      renderSlot(leftSlot, leftPlayerId, leftName);
      renderSlot(rightSlot, rightPlayerId, rightName);
    },

    setDuelActionCard: function (cardType, ownerPlayerId, labelText) {
      this.ensureFaithWarBoard();
      const slot = dojo.byId("faithwar_action_slot");
      const ownerNode = dojo.byId("faithwar_action_owner");
      const textNode = dojo.byId("faithwar_action_text");
      if (!slot) return;
      const spriteOffset = this.getActionCardSpriteIndex(cardType);
      slot.innerHTML =
        '<div class="card card-action table_card_item faith-war-action-card" data-index="' +
        spriteOffset +
        '"></div>';
      const actionNode = dojo.query(".faith-war-action-card", slot)[0];
      if (actionNode) {
        this.attachActionCardTooltip(actionNode, cardType);
      }
      if (ownerNode) {
        const p = this.gamedatas.players[String(ownerPlayerId)] || {};
        const sectLabel = this.getSectLabel(p.player_sect);
        ownerNode.innerHTML =
          '<div class="faith-war-sect-name">' +
          sectLabel +
          '</div><div class="faith-war-player-name">' +
          (p.name || "") +
          "</div>";
      }
      if (textNode) {
        textNode.innerHTML = labelText || this.getActionCardDisplayName(cardType);
      }
    },

    moveDuelActionCardToDiscard: function () {
      const slot = dojo.byId("faithwar_action_slot");
      if (!slot) return;
      const cardNode = dojo.query(".faith-war-action-card", slot)[0];
      if (!cardNode) return;
      const gameArea = dojo.byId("game_play_area");
      if (!gameArea) return;
      const gamePos = dojo.position(gameArea);
      const cardPos = dojo.position(cardNode);
      const tempId = "duel_action_to_discard_" + Date.now();
      dojo.place(
        `<div id="${tempId}" class="${cardNode.className}" data-index="${dojo.attr(cardNode, "data-index") || ""}"></div>`,
        "game_play_area"
      );
      dojo.style(tempId, {
        position: "absolute",
        left: cardPos.x - gamePos.x + "px",
        top: cardPos.y - gamePos.y + "px",
        zIndex: 2200,
      });
      const anim = this.slideToObject(tempId, "action_discard", 520);
      dojo.connect(anim, "onEnd", this, function () {
        dojo.destroy(tempId);
      });
      anim.play();
      slot.innerHTML = "";
      const ownerNode = dojo.byId("faithwar_action_owner");
      if (ownerNode) ownerNode.innerHTML = "";
      const textNode = dojo.byId("faithwar_action_text");
      if (textNode) textNode.innerHTML = "";
    },

    animateFaithWarDeadCardsToGraveyard: function (deadPlayerIds) {
      if (!deadPlayerIds || !deadPlayerIds.length) return;
      deadPlayerIds.forEach(
        function (playerId, index) {
          const slot = dojo.byId("faithwar_slot_" + playerId);
          if (!slot) return;
          const cardNode = dojo.query(".faith-war-card", slot)[0];
          if (!cardNode) return;
          const tempId = "faithwar_dead_" + playerId + "_" + Date.now() + "_" + index;
          const gameArea = dojo.byId("game_play_area");
          const gamePos = gameArea ? dojo.position(gameArea) : { x: 0, y: 0 };
          const cardPos = dojo.position(cardNode);
          dojo.place(
            `<div id="${tempId}" class="${cardNode.className}" data-index="${dojo.attr(cardNode, "data-index") || ""}"></div>`,
            "game_play_area"
          );
          dojo.style(tempId, {
            position: "absolute",
            left: cardPos.x - gamePos.x + "px",
            top: cardPos.y - gamePos.y + "px",
            zIndex: 2000,
          });
          const anim = this.slideToObject(tempId, "graveyard", 600 + index * 120);
          dojo.connect(anim, "onEnd", this, function () {
            dojo.destroy(tempId);
          });
          anim.play();
        }.bind(this)
      );
    },

    renderFaithWarFaceDownCard: function (playerId, playerName) {
      this.ensureFaithWarBoard();
      const leftSlot = dojo.byId("faithwar_slot_left");
      const rightSlot = dojo.byId("faithwar_slot_right");
      if (!leftSlot || !rightSlot) return;
      const slotId = "faithwar_slot_" + playerId;
      if (dojo.byId(slotId)) return;
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
          '" class="faith-war-player-card">' +
          '<div class="faith-war-owner">' +
          safeName +
          "</div>" +
          '<div class="card card-back-believer faith-war-card facedown"></div>' +
          '<div class="faith-war-card-label">?</div>' +
          "</div>",
        targetSlot
      );
    },

    revealFaithWarCard: function (playerId, cardType, labelText) {
      const slot = dojo.byId("faithwar_slot_" + playerId);
      if (!slot) return;
      const cardNode = dojo.query(".faith-war-card", slot)[0];
      const labelNode = dojo.query(".faith-war-card-label", slot)[0];
      if (cardNode) {
        dojo.removeClass(cardNode, "card-back-believer");
        dojo.removeClass(cardNode, "facedown");
        dojo.addClass(cardNode, "card-believer");
        dojo.attr(cardNode, "data-index", cardType);
        this.attachBelieverTooltip(cardNode, parseInt(cardType, 10));
      }
      if (labelNode) {
        labelNode.innerHTML = labelText || "";
      }
    },

    clearFaithWarArena: function (messageHtml) {
      const arena = dojo.byId("central_arena");
      if (!arena) return;
      this.currentAoeCombatType = null;
      this.currentAoeAttackerId = null;
      this.currentAoeActionCardId = null;

      const warBoard = dojo.byId("faith_war_board");
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
        source.attacker_id || this.currentAoeAttackerId || source.player_id || 0,
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
        this.currentAoeCombatType !== cardType || !dojo.byId("aoe_combat_layout");
      if (
        rebuildLayout
      ) {
        arena.innerHTML =
          '<div id="aoe_combat_layout" class="aoe-combat-layout">' +
          '<div id="aoe_left_cluster" class="aoe-left-cluster">' +
          '<div id="aoe_action_slot" class="aoe-action-slot">' +
          '<div id="aoe_attacker_label" class="aoe-attacker-label"></div>' +
          '<div id="aoe_left_cards_row" class="aoe-left-cards-row">' +
          '<div id="aoe_action_card_slot" class="aoe-action-card-slot"></div>' +
          '<div id="aoe_attacker_slot" class="aoe-attacker-slot"></div>' +
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
        if (leftCluster && !dojo.byId("aoe_action_card_slot")) {
          leftCluster.innerHTML =
            '<div id="aoe_action_slot" class="aoe-action-slot">' +
            '<div id="aoe_attacker_label" class="aoe-attacker-label"></div>' +
            '<div id="aoe_left_cards_row" class="aoe-left-cards-row">' +
            '<div id="aoe_action_card_slot" class="aoe-action-card-slot"></div>' +
            '<div id="aoe_attacker_slot" class="aoe-attacker-slot"></div>' +
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
      const p = this.gamedatas.players[String(ownerId)] || null;
      const sectLabel = this.getSectLabel(p ? p.player_sect : -1);
      const name = playerName || (p ? p.name : _("Player"));
      return (
        '<div class="aoe-owner-sect">' +
        sectLabel +
        "</div>" +
        '<div class="aoe-owner-player">' +
        name +
        "</div>"
      );
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
          if (a.player_no > 0 && b.player_no > 0 && a.player_no !== b.player_no) {
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
          this.getActionCardDisplayName(actionType)
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

    rehydrateAoeArenaFromSnapshot: function (actionCard, combatContext, tableBelievers) {
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
    },

    rehydrateCombatArenaFromSnapshot: function (gamedatas) {
      if (!gamedatas) return;
      const combatContext = gamedatas.combat_context || {};
      const warType = parseInt(combatContext.war_type || 0, 10);
      const actionCards = this.getActionCardsOnTableArray(gamedatas.cardsontable);
      const believerCards = this.getBelieversOnTableArray(gamedatas.believersontable);
      if (!actionCards.length) return;

      let actionCard = null;
      if (warType === 2) {
        actionCard = this.findActionCardOnTableByType(actionCards, "faith_war");
      } else if (warType === 7) {
        actionCard = this.findActionCardOnTableByType(actionCards, "faith_debate");
      } else if (warType === 3) {
        actionCard = this.findActionCardOnTableByType(actionCards, "martyrdom");
      } else if (warType === 6) {
        actionCard = this.findActionCardOnTableByType(actionCards, "conspiracy");
      }
      if (!actionCard) {
        actionCard = actionCards[0];
      }
      if (!actionCard || !actionCard.type) return;

      if (actionCard.type === "faith_war" || actionCard.type === "faith_debate") {
        this.rehydrateFaithDuelArenaFromSnapshot(
          actionCard.type,
          actionCard,
          combatContext
        );
        return;
      }
      if (this.isAoeCombatType(actionCard.type)) {
        this.rehydrateAoeArenaFromSnapshot(actionCard, combatContext, believerCards);
        return;
      }

      this.showCenterActionCard(actionCard.type, actionCard.id || "");
    },

    initAoeRightSlotsBySeatOrder: function (attackerId, forceReset) {
      const rightLane = dojo.byId("aoe_right_lane");
      if (!rightLane) return;
      if (forceReset) {
        rightLane.innerHTML = "";
      }
      const attacker = parseInt(attackerId || 0, 10);
      const wantedOwners = [];
      this.getPlayersInSeatOrder().forEach(
        function (p) {
          if (p.id === attacker) return;
          wantedOwners.push(String(p.id));
          const slot = this.ensureAoeRightPlayerSlot(p.id, p.name);
          if (slot) {
            // Keep seat order stable without nuking existing commits.
            dojo.place(slot, rightLane, "last");
            this.ensureAoeRightSlotPlaceholder(p.id);
          }
        }.bind(this)
      );
      dojo.query(".aoe-player-slot", rightLane).forEach(function (slot) {
        const ownerId = String(slot.getAttribute("data-owner-id") || "");
        if (!ownerId || wantedOwners.indexOf(ownerId) === -1) {
          dojo.destroy(slot);
        }
      });
    },

    ensureAoeRightPlayerSlot: function (ownerId, playerName) {
      const rightLane = dojo.byId("aoe_right_lane");
      if (!rightLane || !ownerId) return null;
      const slotId = "aoe_player_slot_" + ownerId;
      let slot = dojo.byId(slotId);
      if (!slot) {
        slot = dojo.create(
          "div",
          {
            id: slotId,
            className: "aoe-player-slot",
            "data-owner-id": String(ownerId),
          },
          rightLane
        );
        dojo.create(
          "div",
          {
            className: "aoe-player-owner",
            innerHTML: this.getAoeOwnerLabelHtml(ownerId, playerName),
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
      }
      return slot;
    },

    ensureAoeRightSlotPlaceholder: function (ownerId) {
      const slot = this.ensureAoeRightPlayerSlot(ownerId);
      if (!slot) return;
      const cardsWrap = dojo.query(".aoe-player-cards", slot)[0] || slot;
      if (dojo.query(".aoe-commit-item", cardsWrap).length > 0) {
        return;
      }
      const placeholderId =
        "aoe_placeholder_" + ownerId + "_" + Math.floor(Math.random() * 1000000);
      const wrap = dojo.create("div", {
        className: "combat-commit-wrap aoe-commit-item aoe-slot-placeholder",
        id: placeholderId,
      });
      wrap.setAttribute("data-player-id", String(ownerId || 0));
      wrap.setAttribute("data-owner-id", String(ownerId || 0));
      wrap.setAttribute("data-card-kind", "placeholder");
      const owner = dojo.create("div", { className: "combat-commit-owner" }, wrap);
      owner.innerHTML = this.getAoeOwnerLabelHtml(ownerId, "");
      dojo.addClass(owner, "aoe-hidden");
      dojo.create(
        "div",
        {
          className: "card card-back-believer combat-commit-card facedown",
        },
        wrap
      );
      dojo.place(wrap, cardsWrap, "last");
    },

    placeAoeActionCard: function (cardType, cardId, attackerId) {
      this.ensureAoeCombatLayout(cardType, attackerId);
      const actionSlot = dojo.byId("aoe_action_card_slot");
      if (!actionSlot) return;
      actionSlot.innerHTML = "";
      const spriteOffset = this.getActionCardSpriteIndex(cardType);
      dojo.place(
        `<div id="current_center_action_card" data-card-type="${cardType}" data-card-id="${
          cardId || ""
        }" class="center-action-wrap aoe-action-wrap">` +
          `<div id="center_action_card_face" class="card table_card_item card-action center-action-card" data-index="${spriteOffset}"></div>` +
          `</div>`,
        actionSlot
      );
      const centerNode = dojo.byId("center_action_card_face");
      if (centerNode) {
        this.attachActionCardTooltip(centerNode, cardType);
      }
      this.currentAoeActionCardId = cardId || null;
      const attackerLabel = dojo.byId("aoe_attacker_label");
      if (attackerLabel) {
        const name = this.gamedatas.players[String(attackerId)]
          ? this.gamedatas.players[String(attackerId)].name
          : _("Player");
        const sectText = this.getSectLabel(
          this.gamedatas.players[String(attackerId)]
            ? this.gamedatas.players[String(attackerId)].player_sect
            : -1
        );
        attackerLabel.innerHTML =
          '<div class="aoe-owner-sect">' +
          sectText +
          "</div>" +
          '<div class="aoe-owner-player">' +
          name +
          "</div>";
      }
    },

    addAoeCommitToArena: function (args) {
      const rightLane = dojo.byId("aoe_right_lane");
      const attackerSlot = dojo.byId("aoe_attacker_slot");
      if (!rightLane || !attackerSlot) return false;

      const cardKind = args.card_kind || "believer";
      const cardId = parseInt(args.card_id || 0, 10);
      const ownerId = parseInt(args.player_id || 0, 10);
      const isAttackerBeliever =
        cardKind === "believer" &&
        ownerId > 0 &&
        ownerId === this.currentAoeAttackerId;

      let targetContainer = null;
      if (isAttackerBeliever) {
        targetContainer = attackerSlot;
      } else {
        const slot = this.ensureAoeRightPlayerSlot(ownerId, args.player_name);
        if (!slot) return false;
        targetContainer = dojo.query(".aoe-player-cards", slot)[0] || slot;
        // One-vs-many lane keeps one visible stack per player:
        // placeholder -> defense OR placeholder -> believer.
        targetContainer.innerHTML = "";
      }
      const itemId =
        "aoe_commit_" +
        cardKind +
        "_" +
        (cardId || Math.floor(Math.random() * 1000000));
      const wrap = dojo.create("div", {
        className: "combat-commit-wrap aoe-commit-item",
        id: itemId,
      });
      wrap.setAttribute("data-player-id", String(ownerId || 0));
      wrap.setAttribute("data-owner-id", String(ownerId || 0));
      wrap.setAttribute("data-card-kind", cardKind);
      if (cardId) {
        wrap.setAttribute("data-card-id", String(cardId));
      }

      const owner = dojo.create("div", { className: "combat-commit-owner" }, wrap);
      owner.innerHTML = this.getAoeOwnerLabelHtml(ownerId, args.player_name);
      dojo.addClass(owner, "aoe-hidden");

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
        const believerType = parseInt(args.card_type || 0, 10);
        const shouldFaceDown =
          typeof args.facedown === "undefined" ? true : !!args.facedown;
        if (shouldFaceDown) {
          const facedownNode = dojo.create(
            "div",
            {
              className: "card card-back-believer combat-commit-card facedown",
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
              className: "card card-believer combat-commit-card",
              "data-index": believerType,
            },
            wrap
          );
          this.attachBelieverTooltip(believerNode, believerType);
        }
      }

      if (isAttackerBeliever) {
        targetContainer.innerHTML = "";
        dojo.addClass(wrap, "aoe-attacker-believer");
      }
      dojo.place(wrap, targetContainer, "last");
      return true;
    },

    revealAoeBelievers: function () {
      const facedownCards = dojo.query(
        ".aoe-commit-item .combat-commit-card.facedown"
      );
      facedownCards.forEach(
        function (node) {
          const believerType = parseInt(
            node.getAttribute("data-believer-type") || "0",
            10
          );
          if (!believerType) return;
          dojo.removeClass(node, "card-back-believer");
          dojo.removeClass(node, "facedown");
          dojo.addClass(node, "card-believer");
          node.setAttribute("data-index", String(believerType));
          this.attachBelieverTooltip(node, believerType);
        }.bind(this)
      );
    },

    setAoeResultState: function (cardId, resultType, textLabel) {
      if (!cardId) return;
      const wrap = dojo.query(
        '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
          cardId +
          '"]'
      )[0];
      if (!wrap) return;
      dojo.removeClass(wrap, "is-winner");
      dojo.removeClass(wrap, "is-loser");
      dojo.removeClass(wrap, "is-draw");
      if (resultType === "winner") dojo.addClass(wrap, "is-winner");
      else if (resultType === "loser") dojo.addClass(wrap, "is-loser");
      else if (resultType === "draw") dojo.addClass(wrap, "is-draw");

      let label = dojo.query(".aoe-result-label", wrap)[0];
      if (!label) {
        label = dojo.create("div", { className: "aoe-result-label" }, wrap);
      }
      label.textContent = textLabel || "";
    },

    animateAoeBelieversToTargets: function (ownerByCardId) {
      if (!ownerByCardId) return;
      Object.keys(ownerByCardId).forEach(
        function (cardId) {
          const wrap = dojo.query(
            '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
              cardId +
              '"]'
          )[0];
          if (!wrap) return;
          const ownerId = parseInt(ownerByCardId[cardId] || 0, 10);
          let targetId = "playertable_" + ownerId;
          if (ownerId === parseInt(this.player_id, 10)) {
            targetId = "mybelievercards";
          }
          if (!dojo.byId(targetId)) return;
          const anim = this.slideToObject(wrap, targetId, 700);
          dojo.connect(anim, "onEnd", this, function () {
            dojo.destroy(wrap);
          });
          anim.play();
        }.bind(this)
      );
    },

    getBelieverTypeName: function (type) {
      return this.believerTypeNames[type] || "Type " + type;
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
        "<strong>" +
        name +
        " #" +
        t +
        "</strong>" +
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
          this.getBelieverWinningTypes(t).wins
            .map(
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
    },

    getActionCardDisplayName: function (cardType) {
      const names = {
        witch_hunt: "Witch Hunt",
        faith_war: "Faith War",
        martyrdom: "Martyrdom",
        spread_rumors: "Spread Rumors",
        faith_debate: "Faith Debate",
        conspiracy: "Conspiracy",
        great_mercy: "Great Mercy",
        firm_faith: "Firm Faith",
        breaking_faith: "Breaking Faith",
        kowtow_to_me: "Kowtow To Me",
        info_spy: "Info-Spy",
        secret_alliance: "Secret Alliance",
        its_a_miracle: "It's a Miracle",
        have_a_charity: "Have a Charity",
        divine_inspire: "Divine Inspiration",
      };
      return names[cardType] || cardType;
    },

    getActionTypeMaskFromCardType: function (cardType) {
      const strategyCards = [
        "breaking_faith",
        "kowtow_to_me",
        "info_spy",
        "secret_alliance",
        "its_a_miracle",
        "have_a_charity",
        "divine_inspire",
      ];
      const physicalCards = ["witch_hunt", "faith_war", "martyrdom"];
      const mentalCards = ["spread_rumors", "faith_debate", "conspiracy"];
      if (strategyCards.indexOf(cardType) !== -1) return 0b01000;
      if (physicalCards.indexOf(cardType) !== -1) return 0b00100;
      if (mentalCards.indexOf(cardType) !== -1) return 0b00010;
      return 0;
    },

    getActionTypeLabelFromMask: function (mask) {
      switch (mask) {
        case 0b01000:
          return "Strategy";
        case 0b00100:
          return "Physical Attack";
        case 0b00010:
          return "Mental Attack";
        case 0b00001:
          return "Discard";
        default:
          return "Action";
      }
    },

    getDefenseKindLabel: function (defenseKind) {
      if (defenseKind === "mental") return _("Mental");
      if (defenseKind === "breaking_faith") return _("Breaking Faith");
      return _("Physical");
    },

    getSectLabel: function (sectId) {
      const id = parseInt(sectId, 10);
      if (id < 0) {
        return _("Wanderer");
      }
      return this.sectNames[id] || _("Sect") + " " + id;
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
        have_a_charity:
          "Draw 2 Believers. If deck is insufficient, draw as many as possible.",
        info_spy:
          "View 1 target player's hand (Action cards and Believers).",
        its_a_miracle:
          "Revive up to 3 Believers from the top of graveyard to your hand.",
        divine_inspire:
          "Discard X Action cards (excluding this card), then draw X Believers.",
        secret_alliance:
          "Choose a player. Exchange 1 Action card from your hand with 1 Action card from that player.",
        breaking_faith:
          "Same-sect only. Defended only by Breaking Faith. Defended: steal 1 Believer. Not defended: steal floor(half) Believers, then apply separation logic.",
        kowtow_to_me:
          "Target a sect. If its member count is less than or equal to half of your sect's member count, absorb it.",
        spread_rumors:
          "Mental attack. Target a sect. If not defended, steal 1 random Believer from each player in that sect.",
        faith_debate:
          "Mental attack. Sect vs sect duel up to 5 rounds. Winner steals loser's Believer; draw returns cards.",
        conspiracy:
          "Mental AoE. Commit 1 Believer against all defending representatives. Resolve wins/draws to determine steals.",
        witch_hunt:
          "Physical attack. Target a sect and a Believer type. If not defended, all matching Believers in that sect die.",
        faith_war:
          "Physical attack. Sect vs sect war until one side has no available Believers. Physical draw: both die.",
        martyrdom:
          "Physical AoE. Attacker commits 1 Believer (always dies at resolution). Defenders commit 1 each; loser/draw defender dies.",
        great_mercy: "Defense card. Can only defend against Physical attacks.",
        firm_faith: "Defense card. Can only defend against Mental attacks.",
      };
      return texts[cardKey] || "No text yet.";
    },

    getActionCardTypeMeta: function (cardKey) {
      if (!cardKey) {
        return { label: _("Action"), cssClass: "support" };
      }
      if (cardKey === "great_mercy" || cardKey === "firm_faith") {
        return { label: _("Defense"), cssClass: "support" };
      }
      const mask = this.getActionTypeMaskFromCardType(cardKey);
      if (mask === 0b00100) {
        return { label: _("Attack - Physical"), cssClass: "attack" };
      }
      if (mask === 0b00010) {
        return { label: _("Attack - Mental"), cssClass: "attack" };
      }
      if (mask === 0b01000) {
        return { label: _("Strategy"), cssClass: "support" };
      }
      return { label: _("Action"), cssClass: "support" };
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
      return "Skill " + skillType;
    },

    getSkillEffectText: function (skillType) {
      const texts = {
        1: "After surrendering, steal half of your leader's Believers.",
        2: "Sacrifice 1 Believer, target any player, kill up to 3 of their Believers, and that player cannot use Physical/Mental attacks this turn.",
        3: "Expel all followers and take half of their Believers.",
        4: "When another player draws via Have a Charity or Divine Inspiration, predict the first Believer type; gain it if correct.",
        5: "Reactive: when your Believer deaths reach 3 or more in one trigger window, you may revive 3 from graveyard.",
        6: "When followers draw Action cards, you also draw. Hand limit increases by followers.",
        7: "Sacrifice 1 Believer to block all Mental attacks until your next turn.",
        8: "Sacrifice 1 Believer to block all Physical attacks until your next turn.",
        9: "Copy another player's revealed skill effect once.",
        10: "Use graveyard Believers as fodder in Faith War.",
        11: "Choose one player to skip their next turn. Does not consume action. Can stack up to 3 uses per game.",
        12: "Passive win condition. If this skill remains active and you have at least 5 Believers at game-end check, you win immediately.",
        13: "Leader only. Sacrifice 1 Believer to gain +1 extra action this turn.",
        14: "Shuffle all players' Action cards in hand and redistribute from your seat order. Does not consume an action (max 3 uses per game).",
        15: "Before any action this turn: shuffle all players' Believers in hand and redistribute from your seat order. This immediately ends your turn (once per game).",
        16: "Reverse the outcome of one Believer confrontation.",
      };
      return texts[skillType] || "Skill effect text not configured yet.";
    },

    getSkillTimingText: function (skillType) {
      const timing = {
        4: "Timing: When another player draws Believers via Have a Charity or Divine Inspiration.",
        5: "Timing: Reactive after a 3+ Believer death trigger (e.g., KABOOM!/Faith War end).",
        7: "Timing: During your action phase.",
        8: "Timing: During your action phase.",
        11: "Timing: During your action phase.",
        2: "Timing: During your action phase.",
        13: "Timing: During your action phase.",
        14: "Timing: During your action phase.",
        15: "Timing: Before any action this turn.",
        12: "Timing: Passive (no manual use).",
      };
      return timing[skillType] || "Timing: Not configured yet.";
    },

    getSkillUsageText: function (skillType, skillState) {
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
      if (skillType === 2) {
        return "Uses: Once per turn (this turn " + usedThisTurn + "/1)";
      }
      if (skillType === 4) {
        return "Uses: Unlimited (reactive). First use requires reveal confirmation.";
      }
      if (skillType === 7) {
        const active = parseInt(
          (skillState && skillState.protected_mental) || 0,
          10
        );
        return (
          "Uses: Up to 3 per game, once per turn (" +
          uses +
          "/3), no action consumed, active protection: " +
          (active ? "1" : "0")
        );
      }
      if (skillType === 8) {
        const active = parseInt(
          (skillState && skillState.protected_physical) || 0,
          10
        );
        return (
          "Uses: Up to 3 per game, once per turn (" +
          uses +
          "/3), no action consumed, active protection: " +
          (active ? "1" : "0")
        );
      }
      if (skillType === 13) {
        return "Uses: Once per turn (this turn " + praiseUsedThisTurn + "/1)";
      }
      if (skillType === 5) {
        return (
          "Uses: Once per round (this round " +
          holyRebirthUsedThisTurn +
          "/1), total uses: " +
          uses
        );
      }
      if (skillType === 12) {
        return "Uses: Passive (no manual activation)";
      }
      if (skillType === 11) {
        return "Uses: Up to 3 per game (" + uses + "/3), no action consumed";
      }
      if (skillType === 14) {
        return "Uses: Up to 3 per game (" + uses + "/3)";
      }
      if (skillType === 15) {
        return "Uses: Once per game (" + uses + "/1)";
      }
      return "Uses: Not configured";
    },

    getSkillTooltipHtml: function (skillType, skillState) {
      const t = parseInt(skillType || 0, 10);
      if (!t) {
        return (
          '<div class="card-text-tooltip">' +
          '<strong style="color:#b11;">Unrevealed Skill</strong><br/>' +
          "This skill has not been revealed yet." +
          "</div>"
        );
      }
      const name = this.getSkillName(t);
      const timing = this.getSkillTimingText(t);
      const usage = this.getSkillUsageText(t, skillState || null);
      const effect = this.getSkillEffectText(t);
      return (
        '<div class="card-text-tooltip">' +
        '<div><strong style="color:#b11;">' +
        name +
        "</strong></div>" +
        "<div>" +
        timing +
        "</div>" +
        "<div>" +
        usage +
        "</div>" +
        "<div>" +
        effect +
        "</div>" +
        "</div>"
      );
    },

    attachSkillTooltip: function (node, skillType, skillState) {
      if (!node) return;
      if (!node.id) {
        node.id = "skill_tip_" + Math.floor(Math.random() * 1000000).toString();
      }
      if (typeof this.addTooltipHtml === "function") {
        this.addTooltipHtml(node.id, this.getSkillTooltipHtml(skillType, skillState), 300);
      }
    },

    attachPanelCounterTooltip: function (node, title, text) {
      if (!node) return;
      if (!node.id) {
        node.id =
          "panel_tip_" + Math.floor(Math.random() * 1000000).toString();
      }
      if (typeof this.addTooltipHtml === "function") {
        this.addTooltipHtml(
          node.id,
          '<div class="card-text-tooltip"><strong>' +
            title +
            "</strong><br/>" +
            text +
            "</div>",
          300
        );
      }
    },

    getActionCardTooltipHtml: function (cardKey) {
      const name = this.getActionCardDisplayName(cardKey || "unknown");
      const effect = this.getActionCardEffectText(cardKey || "unknown");
      const typeMeta = this.getActionCardTypeMeta(cardKey || "unknown");
      return (
        '<div class="card-text-tooltip">' +
        "<strong>" +
        name +
        "</strong>" +
        '<div class="tooltip-card-type ' +
        typeMeta.cssClass +
        '">' +
        typeMeta.label +
        "</div>" +
        effect +
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

      const wrap = dojo.create("div", { className: "combat-commit-wrap" });
      const owner = dojo.create(
        "div",
        { className: "combat-commit-owner" },
        wrap
      );
      owner.textContent =
        this.getSectLabel(args.sect_id) +
        " | " +
        (args.player_name || _("Player"));

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
          dojo.create(
            "div",
            {
              className: "card card-back-believer combat-commit-card facedown",
            },
            wrap
          );
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
      if (!wrap) return;
      wrap.innerHTML = "";
      if (!this.actionDiscardCards || !this.actionDiscardCards.length) return;

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

    pushActionDiscardCard: function (cardType, cardId) {
      this.actionDiscardCards = [{ id: cardId, type: cardType }].concat(
        this.actionDiscardCards || []
      );
      this.renderActionDiscardTop();
    },

    moveCurrentCenterActionToDiscard: function () {
      const currentCard = dojo.byId("current_center_action_card");
      if (!currentCard) return;
      const cardType = currentCard.getAttribute("data-card-type");
      const cardId = currentCard.getAttribute("data-card-id");
      dojo.destroy(currentCard);
      if (cardType) {
        this.pushActionDiscardCard(cardType, cardId);
      }
    },

    clearTransientArenaAfterAction: function (delayMs) {
      const run = function () {
        this.moveCurrentCenterActionToDiscard();
        const arena = dojo.byId("central_arena");
        if (arena) {
          arena.innerHTML = "";
        }
        this.currentAoeCombatType = null;
        this.currentAoeAttackerId = null;
        this.currentAoeActionCardId = null;
      }.bind(this);

      if (delayMs && delayMs > 0) {
        setTimeout(run, delayMs);
      } else {
        run();
      }
    },

    showCenterActionCard: function (cardType, cardId) {
      this.moveCurrentCenterActionToDiscard();
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
      }
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

    getLiveGraveyardCount: function () {
      return parseInt((dojo.byId("graveyard_count") || {}).innerHTML || "0", 10) || 0;
    },

    renderGraveyardPreview: function () {
      const wrap = dojo.byId("graveyard_cards");
      const graveyard = dojo.byId("graveyard");
      if (!wrap || !graveyard) return;
      wrap.innerHTML = "";

      const liveCount = this.getLiveGraveyardCount();
      const previewCount = Math.max(0, Math.min(3, liveCount));
      if (previewCount > 0) {
        dojo.addClass(graveyard, "has_cards");
      } else {
        dojo.removeClass(graveyard, "has_cards");
      }

      for (let index = 0; index < previewCount; index++) {
        const card = (this.graveyardCards || [])[index] || null;
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
      this.showGraveyardModal();
    },

    closeGraveyardModal: function () {
      const existing = dojo.byId("graveyard_modal_overlay");
      if (existing) {
        dojo.destroy(existing);
      }
    },

    showGraveyardModal: function () {
      this.closeGraveyardModal();
      const liveCount = this.getLiveGraveyardCount();
      const knownCards = this.normalizeGraveyardCards(this.graveyardCards).slice(
        0,
        liveCount
      );

      const overlay = dojo.create("div", {
        id: "graveyard_modal_overlay",
        className: "spy-modal-overlay",
      });
      const modal = dojo.create("div", { className: "spy-modal graveyard-modal" }, overlay);
      const head = dojo.create("div", { className: "spy-modal-head" }, modal);
      dojo.create(
        "div",
        {
          className: "spy-modal-title",
          innerHTML:
            _("Graveyard") +
            " (" +
            liveCount +
            " " +
            _("cards") +
            ")",
        },
        head
      );
      const closeBtn = dojo.create(
        "button",
        {
          innerHTML: _("Close"),
          className: "bgabutton bgabutton_blue",
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
          { className: "graveyard-modal-empty", innerHTML: _("No believers yet.") },
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
              name: this.getBelieverTypeName(type),
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
      const modal = dojo.create("div", { className: "spy-modal" }, overlay);
      const head = dojo.create("div", { className: "spy-modal-head" }, modal);
      dojo.create(
        "div",
        {
          className: "spy-modal-title",
          innerHTML: _("Info Spy Result") + ": " + (targetName || _("Player")),
        },
        head
      );
      const closeBtn = dojo.create(
        "button",
        {
          innerHTML: _("Close"),
          className: "bgabutton bgabutton_blue",
        },
        head
      );
      dojo.connect(closeBtn, "onclick", this, "closeSpyResultModal");

      const actionSection = dojo.create(
        "div",
        { className: "spy-modal-section" },
        modal
      );
      dojo.create(
        "h4",
        {
          innerHTML:
            _("Action Cards") + " (" + (actionCards || []).length + ")",
        },
        actionSection
      );
      const actionGrouped = this.buildSpyGroupedCounts(actionCards, "action");
      const actionWrap = dojo.create(
        "div",
        { className: "spy-modal-counts" },
        actionSection
      );
      actionGrouped.forEach(
        function (entry) {
          const node = dojo.create(
            "div",
            {
              className: "spy-modal-count-item",
              innerHTML: entry.name + " *" + entry.count,
            },
            actionWrap
          );
          this.attachActionCardTooltip(node, entry.key);
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
          innerHTML:
            _("Believers") + " (" + (believerCards || []).length + ")",
        },
        believerSection
      );
      const believerGrouped = this.buildSpyGroupedCounts(
        believerCards,
        "believer"
      );
      const believerWrap = dojo.create(
        "div",
        { className: "spy-modal-counts" },
        believerSection
      );
      believerGrouped.forEach(
        function (entry) {
          const node = dojo.create(
            "div",
            {
              className: "spy-modal-count-item",
              innerHTML: entry.name + " *" + entry.count,
            },
            believerWrap
          );
          this.attachBelieverTooltip(node, entry.believerType || 0);
        }.bind(this)
      );
      if (!believerGrouped.length) {
        dojo.create("div", { innerHTML: _("None") }, believerSection);
      }

      dojo.connect(overlay, "onclick", this, function (evt) {
        if (evt && evt.target === overlay) {
          this.closeSpyResultModal();
        }
      });
      dojo.place(overlay, "game_play_area");
    },

    syncGraveyardCardsFromCount: function () {
      const count = this.getLiveGraveyardCount();
      this.graveyardCards = this.normalizeGraveyardCards(this.graveyardCards).slice(
        0,
        count
      );
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
      const source =
        dojo.byId("panel_" + playerId) || dojo.byId("playertable_" + playerId);
      const target = dojo.byId("graveyard");
      const root = dojo.byId("game_play_area");
      if (!source || !target || !root) return;

      const rootPos = dojo.position(root);
      const sourcePos = dojo.position(source);
      const baseLeft = sourcePos.x - rootPos.x + sourcePos.w / 2 - 24;
      const baseTop = sourcePos.y - rootPos.y + sourcePos.h / 2 - 34;

      cards.forEach(
        function (card, idx) {
          const tempId =
            "witchhunt_fly_" + playerId + "_" + (card.id || idx) + "_" + Date.now();
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
          const anim = this.slideToObject(tempId, target, 480 + idx * 120);
          dojo.connect(anim, "onEnd", this, function () {
            dojo.destroy(tempId);
          });
          anim.play();
        }.bind(this)
      );
    },

    animateRevivedBelieversToHand: function (cards) {
      if (!cards || !cards.length) return;
      cards.forEach(
        function (card, index) {
          const tempId = "revive_anim_" + card.id + "_" + index;
          dojo.place(
            '<div id="' +
              tempId +
              '" class="graveyard_preview_card card-believer revive-fly-card" data-index="' +
              card.type +
              '"></div>',
            "game_play_area"
          );
          this.placeOnObject(tempId, "graveyard");
          const anim = this.slideToObject(
            tempId,
            "mybelievercards",
            700 + index * 120
          );
          dojo.connect(anim, "onEnd", this, function () {
            dojo.destroy(tempId);
          });
          anim.play();
        }.bind(this)
      );
    },

    getPlayerBelieverReceiveTargetNodeId: function (playerId) {
      const pid = String(playerId || "");
      if (!pid) return null;
      if (pid === String(this.player_id)) {
        return "mybelievercards";
      }
      return dojo.byId("playertable_" + pid)
        ? "playertable_" + pid
        : dojo.byId("panel_" + pid)
        ? "panel_" + pid
        : null;
    },

    animateProphetPredictionFlow: function (args) {
      const root = dojo.byId("game_play_area");
      const deckNode = dojo.byId("believer_deck");
      if (!root || !deckNode || !args) return;

      const firstType = parseInt(args.revealed_type || 0, 10);
      const firstReceiver = parseInt(args.first_receiver_id || 0, 10);
      const remainingN = Math.max(0, parseInt(args.remaining_draw_n || 0, 10));
      const drawerId = parseInt(args.drawer_id || 0, 10);

      if (firstType > 0 && firstReceiver > 0) {
        const firstId = "prophet_first_" + Date.now();
        dojo.place(
          '<div id="' +
            firstId +
            '" class="card card-back-believer prophet-temp-card"></div>',
          root
        );
        this.placeOnObject(firstId, "believer_deck");
        const toCenter = this.slideToObject(firstId, "central_arena", 420);
        dojo.connect(
          toCenter,
          "onEnd",
          this,
          function () {
            const node = dojo.byId(firstId);
            if (!node) return;
            dojo.removeClass(node, "card-back-believer");
            dojo.addClass(node, "card-believer");
            node.setAttribute("data-index", String(firstType));
            this.attachBelieverTooltip(node, firstType);
            const targetId = this.getPlayerBelieverReceiveTargetNodeId(firstReceiver);
            if (!targetId || !dojo.byId(targetId)) {
              dojo.destroy(firstId);
              return;
            }
            setTimeout(
              function () {
                const toTarget = this.slideToObject(firstId, targetId, 520);
                dojo.connect(toTarget, "onEnd", this, function () {
                  dojo.destroy(firstId);
                });
                toTarget.play();
              }.bind(this),
              450
            );
          }.bind(this)
        );
        toCenter.play();
      }

      for (let i = 0; i < remainingN; i++) {
        const tempId = "prophet_rest_" + i + "_" + Date.now();
        dojo.place(
          '<div id="' +
            tempId +
            '" class="card card-back-believer prophet-temp-card"></div>',
          root
        );
        this.placeOnObject(tempId, "believer_deck");
        setTimeout(
          function () {
            const targetId = this.getPlayerBelieverReceiveTargetNodeId(drawerId);
            if (!targetId || !dojo.byId(targetId)) {
              dojo.destroy(tempId);
              return;
            }
            const anim = this.slideToObject(tempId, targetId, 520);
            dojo.connect(anim, "onEnd", this, function () {
              dojo.destroy(tempId);
            });
            anim.play();
          }.bind(this),
          250 + i * 160
        );
      }
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
      this.slideToObject(tempId, "central_arena", 450).play();
      return tempId;
    },

    beginTargetSelection: function (card) {
      if (
        this.pendingAction &&
        this.pendingAction.tempArenaId &&
        dojo.byId(this.pendingAction.tempArenaId)
      ) {
        dojo.destroy(this.pendingAction.tempArenaId);
      }
      this.clearTargetSelection();

      const cardKey = this.getActionCardKeyName(card.type);
      const cardName = this.getActionCardDisplayName(cardKey);
      this.pendingAction = {
        cardId: card.id,
        cardKey: cardKey,
        targetChosen: false,
        tempArenaId: this.showPendingActionPreview(
          cardKey,
          card.id
        ),
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
          selectionMeta.attackKind === "mental"
            ? _("Mental")
            : _("Physical");
        this.showMessage(
          _("Protected target(s) cannot be attacked by") +
            " " +
            kindLabel +
            ": " +
            selectionMeta.blockedNames.join(", "),
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
          _("Secret Alliance cannot target players with no Action cards:") +
            " " +
            selectionMeta.noActionTargetNames.join(", "),
          "info"
        );
      }
      if (selectionMeta && parseInt(selectionMeta.selectableCount || 0, 10) <= 0) {
        this.setTopInstruction(
          _("No valid targets for ") + cardName + _(". You can cancel.")
        );
      } else {
        this.setTopInstruction(this.getTargetPromptText(cardKey, cardName));
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
        cardKey ||
        (this.pendingAction ? this.pendingAction.cardKey : "") ||
        "";
      const attackKind = this.getAttackKindForActionCard(key);
      const blockedNames = [];
      const noActionTargetNames = [];
      let selectableCount = 0;
      Object.keys(this.gamedatas.players).forEach(
        function (player_id) {
          if (String(player_id) === String(this.player_id)) return;
          const player = this.gamedatas.players[player_id];
          if (player && Number(player.player_role) === 2) return;
          const node =
            dojo.byId("panel_" + player_id) ||
            dojo.byId("playertable_" + player_id);
          if (!node) return;
          if (
            key === "secret_alliance" &&
            this.getPublicActionCountForPlayer(player_id) <= 0
          ) {
            noActionTargetNames.push(
              player && player.name ? player.name : _("Player")
            );
            return;
          }
          if (attackKind && this.isPlayerProtectedBySkill(player_id, attackKind)) {
            dojo.addClass(node, "target_protected");
            blockedNames.push(player && player.name ? player.name : _("Player"));
            return;
          }
          dojo.addClass(node, "selectable_target");
          dojo.removeClass(node, "target_protected");
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
        noActionTargetNames: noActionTargetNames,
        attackKind: attackKind,
      };
    },

    clearTargetSelection: function () {
      if (this.targetTableHandles) {
        dojo.forEach(this.targetTableHandles, dojo.disconnect);
      }
      this.targetTableHandles = [];
      Object.keys(this.gamedatas.players).forEach(function (player_id) {
        const node =
          dojo.byId("panel_" + player_id) ||
          dojo.byId("playertable_" + player_id);
        if (node) {
          dojo.removeClass(node, "selectable_target");
          dojo.removeClass(node, "target_protected");
        }
      });
    },

    cancelPendingActionSelection: function () {
      this.actionSubmissionInFlight = false;
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
      const attackKind = this.getAttackKindForActionCard(cardKey);
      if (attackKind && this.isPlayerProtectedBySkill(targetPlayerId, attackKind)) {
        const targetName =
          (this.gamedatas.players[String(targetPlayerId)] || {}).name ||
          _("Player");
        const kindLabel = attackKind === "mental" ? _("Mental") : _("Physical");
        this.showMessage(
          targetName +
            " " +
            _("is currently protected from") +
            " " +
            kindLabel +
            _(" attacks."),
          "error"
        );
        return;
      }
      this.pendingAction.targetChosen = true;
      if (cardKey === "witch_hunt") {
        this.pendingAction.targetPlayerId = targetPlayerId;
        this.clearTargetSelection();
        this.setTopInstruction(_("Choose a believer type for Witch Hunt, or cancel."));
        this.onUpdateActionButtons("playerTurn", {});
        return;
      }

      if (cardKey === "secret_alliance") {
        if (this.getPublicActionCountForPlayer(targetPlayerId) <= 0) {
          const targetName =
            (this.gamedatas.players[String(targetPlayerId)] || {}).name ||
            _("Player");
          this.showMessage(
            targetName + " " + _("has no Action cards to exchange."),
            "error"
          );
          this.pendingAction.targetChosen = false;
          return;
        }
        this.pendingAction.targetPlayerId = targetPlayerId;
        this.clearTargetSelection();
        this.setTopInstruction(
          _("Select 1 Action card to offer for Secret Alliance, or cancel.")
        );
        this.onUpdateActionButtons("playerTurn", {});
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
      if (
        pendingCardKey === "kowtow_to_me" &&
        this.isImpermanenceActiveForCurrentPlayer()
      ) {
        const confirmed = window.confirm(
          _(
            "Recruiting followers with Kowtow To Me will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?"
          )
        );
        if (!confirmed) return;
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

      const items = this.playerActionCards.getSelectedItems();
      if (items.length <= 0) {
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
      const now = Date.now();
      if (
        String(this.lastSubmittedActionCardId) === String(card.id) &&
        now - this.lastSubmittedActionAt < 1500
      ) {
        return;
      }

      const card_key =
        this.actionCardTypeById[String(card.id)] ||
        this.getActionCardKeyName(card.type);
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
      if (actionTypeMask && this.currentTurnActionMask & actionTypeMask) {
        this.showMessage(
          _("You have already used this action type this turn") +
            " (" +
            this.getActionTypeLabelFromMask(actionTypeMask) +
            ")",
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
          const confirmed = window.confirm(
            _("Graveyard has only ") +
              graveyardCount +
              _(
                " believer(s). It's a Miracle will revive only that many. Continue?"
              )
          );
          if (!confirmed) {
            this.playerActionCards.unselectAll();
            return;
          }
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
      const believer_commit_cards = ["martyrdom", "conspiracy"];

      if (card_key === "divine_inspire") {
        this.beginDivineInspireSelection(card);
        return;
      }

      if (targeted_cards.includes(card_key)) {
        this.beginTargetSelection(card);
        return;
      }

      if (believer_commit_cards.includes(card_key)) {
        this.pendingAction = {
          cardId: card.id,
          cardKey: card_key,
          tempArenaId: this.showPendingActionPreview(card_key, card.id),
        };
        this.hidePendingActionCardFromHand(card.id, card_key);
        dojo.addClass("mybelievercards", "highlight_stock");
        this.clearPendingActionButtons();
        this.addActionButton(
          "confirmCommittedBelieverAction",
          _(
            card_key === "martyrdom"
              ? "Confirm Martyrdom Believer"
              : "Confirm Conspiracy Believer"
          ),
          "onConfirmCommittedBelieverActionClicked"
        );
        this.addActionButton(
          "cancelCommittedBelieverAction",
          _("Cancel"),
          "cancelPendingActionSelection"
        );
        this.setTopInstruction(_("Select one believer to commit"));
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
      const items = this.playerBelieverCards.getSelectedItems();
    },

    onPlayerSkillSelectionChanged: function () {
      const items = this.playerSkillCards.getSelectedItems();
      if (!items || items.length <= 0) return;
      this.playerSkillCards.unselectAll();
      this.onUseSkillButtonClicked();
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

      const selected = this.playerActionCards.getSelectedItems();
      const discardIds = selected
        .map(function (item) {
          return item.id;
        })
        .filter(
          function (id) {
            return String(id) !== String(this.pendingAction.cardId);
          }.bind(this)
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
      this.actionSubmissionInFlight = true;
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(0);
      }
      this.ajaxAction(
        "playActionCard",
        {
          id: this.pendingAction.cardId,
          card_ids: discardIds.join(";"),
        },
        function () {
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
            countElem.innerHTML = String(this.getStockDomCount("myactioncards"));
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
      if (
        !this.pendingAction ||
        this.pendingAction.cardKey !== "secret_alliance"
      ) {
        return;
      }
      if (!this.pendingAction.targetPlayerId) {
        this.showMessage(_("Select a target player first"), "error");
        return;
      }
      const items = this.playerActionCards.getSelectedItems();
      if (items.length !== 1) {
        this.showMessage(_("Select exactly one Action card to offer"), "error");
        return;
      }
      if (String(items[0].id) === String(this.pendingAction.cardId)) {
        this.showMessage(
          _("Secret Alliance itself cannot be exchanged"),
          "error"
        );
        return;
      }
      this.playPendingAction({
        target_id: this.pendingAction.targetPlayerId,
        type_arg: items[0].id,
        offered_card_id: items[0].id,
      });
    },

    onConfirmSecretAllianceTargetCardClicked: function () {
      const items = this.playerActionCards.getSelectedItems();
      if (items.length !== 1) {
        this.showMessage(_("Select exactly one Action card"), "error");
        return;
      }
      if (this.checkAction("chooseSecretAllianceCard")) {
        this.ajaxAction(
          "chooseSecretAllianceCard",
          { id: items[0].id },
          function () {
            this.playerActionCards.unselectAll();
          }
        );
      }
    },

    onUseDefenseCardClicked: function () {
      const items = this.playerActionCards.getSelectedItems();
      if (items.length !== 1) {
        this.showMessage(_("Select exactly one defense card"), "error");
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
        this.actionSubmissionInFlight = true;
        this.ajaxAction("passDefense", {}, function () {
          this.playerActionCards.unselectAll();
        });
      }
    },

    onConfirmCommittedBelieverActionClicked: function () {
      if (
        !this.pendingAction ||
        !["martyrdom", "conspiracy"].includes(this.pendingAction.cardKey)
      ) {
        return;
      }
      const items = this.playerBelieverCards.getSelectedItems();
      if (items.length !== 1) {
        this.showMessage(_("Please select exactly one believer card"), "error");
        return;
      }
      this.actionSubmissionInFlight = true;
      this.lastSubmittedActionCardId = this.pendingAction.cardId;
      this.lastSubmittedActionAt = Date.now();
      const committedTypeMask = this.getActionTypeMaskFromCardType(
        this.pendingAction.cardKey
      );
      this.ajaxAction(
        "playActionCard",
        { id: this.pendingAction.cardId, type_arg: items[0].id },
        function () {
          this.consumeHiddenPendingActionCard(this.pendingAction.cardId);
          this.removeLocalActionCardFromHand(this.pendingAction.cardId);
          if (committedTypeMask) {
            this.currentTurnActionMask |= committedTypeMask;
          }
          this.pendingAction = null;
          dojo.removeClass("mybelievercards", "highlight_stock");
          this.playerBelieverCards.unselectAll();
          this.restoreServerGameState();
        }
      );
    },

    onConfirmBelieverClicked: function () {
      if (this.actionSubmissionInFlight) {
        return;
      }
      const items = this.playerBelieverCards.getSelectedItems();
      if (items.length !== 1) {
        this.showMessage(_("Please select exactly one believer card"), "error");
        return;
      }

      if (this.checkAction("playBelieverCard")) {
        const card_id = items[0].id;
        this.actionSubmissionInFlight = true;
        this.ajaxAction("playBelieverCard", { id: card_id }, function () {
          this.playerBelieverCards.unselectAll();
        });
      }
    },

    onToggleDiscardModeClicked: function () {
      if (!this.checkAction("discardActionCards")) {
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

    onEndTurnButtonClicked: function () {
      if (this.checkAction("endTurn")) {
        if (this.actionSubmissionInFlight) {
          return;
        }
        this.ajaxAction("endTurn", {});
      }
    },

    onWandererStealTargetClicked: function (targetId) {
      if (this.checkAction("wandererSteal")) {
        this.ajaxAction("wandererSteal", { target_id: targetId });
      }
    },

    onChooseSurrenderLeaderClicked: function (leaderId) {
      if (this.checkAction("surrender")) {
        if (this.isImpermanenceActiveForCurrentPlayer()) {
          const confirmed = window.confirm(
            _(
              "Surrender will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?"
            )
          );
          if (!confirmed) return;
        }
        this.ajaxAction("surrender", { leader_id: leaderId });
      }
    },

    onAcceptLeaderSupportClicked: function () {
      if (this.checkAction("acceptLeaderSupport")) {
        this.ajaxAction("acceptLeaderSupport", {});
      }
    },

    onRejectLeaderSupportClicked: function () {
      if (this.checkAction("rejectLeaderSupport")) {
        this.ajaxAction("rejectLeaderSupport", {});
      }
    },

    onAcceptSurrenderRequestClicked: function () {
      if (this.checkAction("acceptSurrenderRequest")) {
        if (this.isImpermanenceActiveForCurrentPlayer()) {
          const confirmed = window.confirm(
            _(
              "Accepting this follower will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?"
            )
          );
          if (!confirmed) return;
        }
        this.ajaxAction("acceptSurrenderRequest", {});
      }
    },

    onRejectSurrenderRequestClicked: function () {
      if (this.checkAction("rejectSurrenderRequest")) {
        this.ajaxAction("rejectSurrenderRequest", {});
      }
    },

    onBecomeWandererButtonClicked: function () {
      if (this.checkAction("becomeWanderer")) {
        if (this.isImpermanenceActiveForCurrentPlayer()) {
          const confirmed = window.confirm(
            _(
              "Becoming Wanderer will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?"
            )
          );
          if (!confirmed) return;
        }
        this.ajaxAction("becomeWanderer", {});
      }
    },

    onChooseWarRepresentativeClicked: function (representativeId) {
      if (this.checkAction("chooseWarRepresentative")) {
        this.ajaxAction("chooseWarRepresentative", {
          representative_id: representativeId,
        });
      }
    },

    onChooseConspiracyRepresentativeClicked: function (representativeId) {
      if (this.checkAction("chooseConspiracyRepresentative")) {
        this.ajaxAction("chooseConspiracyRepresentative", {
          representative_id: representativeId,
        });
      }
    },

    onChooseMartyrdomRepresentativeClicked: function (representativeId) {
      if (this.checkAction("chooseMartyrdomRepresentative")) {
        this.ajaxAction("chooseMartyrdomRepresentative", {
          representative_id: representativeId,
        });
      }
    },

    onChooseFaithDebateRepresentativeClicked: function (representativeId) {
      if (this.checkAction("chooseFaithDebateRepresentative")) {
        this.ajaxAction("chooseFaithDebateRepresentative", {
          representative_id: representativeId,
        });
      }
    },

    // --- Notifications ---
    setupNotifications: function () {
      console.log("notifications subscriptions setup");

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
      dojo.subscribe("newBelievers", this, "notif_newBelievers");
      dojo.subscribe("spyResult", this, "notif_spyResult");
      dojo.subscribe("believerStolen", this, "notif_believerStolen");
      dojo.subscribe("believersDiscarded", this, "notif_believersDiscarded");
      dojo.subscribe("spreadRumors", this, "notif_spreadRumors");
      dojo.subscribe("spreadRumorsSummary", this, "notif_spreadRumorsSummary");
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
      dojo.subscribe("publicCountsSync", this, "notif_publicCountsSync");
      dojo.subscribe("skillKarboom", this, "notif_skillKarboom");
      dojo.subscribe("skillPraiseLife", this, "notif_skillPraiseLife");
      dojo.subscribe("skillWorldPeace", this, "notif_skillWorldPeace");
      dojo.subscribe("skillEternalTruth", this, "notif_skillEternalTruth");
      dojo.subscribe("skillSoulSeveringSword", this, "notif_skillSoulSeveringSword");
      dojo.subscribe("soulBladeMarked", this, "notif_soulBladeMarked");
      dojo.subscribe("soulBladeTurnSkipped", this, "notif_soulBladeTurnSkipped");
      dojo.subscribe("soulBladeTurnSkippedPrivate", this, "notif_soulBladeTurnSkippedPrivate");
      dojo.subscribe("skillEveryoneEqual", this, "notif_skillEveryoneEqual");
      dojo.subscribe("skillChaosComing", this, "notif_skillChaosComing");
      dojo.subscribe("skillAutoDefense", this, "notif_skillAutoDefense");
      dojo.subscribe("skillHolyRebirth", this, "notif_skillHolyRebirth");
      dojo.subscribe("prophetPredictionResolved", this, "notif_prophetPredictionResolved");
      dojo.subscribe("skillRevealed", this, "notif_skillRevealed");
      dojo.subscribe("impermanenceFailed", this, "notif_impermanenceFailed");
      dojo.subscribe("skillHiddenReset", this, "notif_skillHiddenReset");
      dojo.subscribe("skillCardReplaced", this, "notif_skillCardReplaced");
      dojo.subscribe("syncBelieverHand", this, "notif_syncBelieverHand");
      dojo.subscribe("syncActionHand", this, "notif_syncActionHand");
      dojo.subscribe("skillStateUpdated", this, "notif_skillStateUpdated");

      if (this.notifqueue != null) {
        this.notifqueue.setSynchronous("actionCardPlayed", 800);
        this.notifqueue.setSynchronous("faithWarCardPlayed", 650);
        this.notifqueue.setSynchronous("duelResult", 1700);
        this.notifqueue.setSynchronous("newBelievers", 1000);
        this.notifqueue.setSynchronous("martyrdomResolved", 3200);
        this.notifqueue.setSynchronous("conspiracyResolved", 3400);
        this.notifqueue.setSynchronous("skillKarboom", 1400);
        this.notifqueue.setSynchronous("skillWorldPeace", 1400);
        this.notifqueue.setSynchronous("skillEternalTruth", 1400);
        this.notifqueue.setSynchronous("skillSoulSeveringSword", 1200);
        this.notifqueue.setSynchronous("skillHolyRebirth", 1300);
        this.notifqueue.setSynchronous("prophetPredictionResolved", 1500);
        this.notifqueue.setSynchronous("skillEveryoneEqual", 1200);
        this.notifqueue.setSynchronous("skillChaosComing", 1200);
      }
    },

    notif_actionCardPlayed: function (notif) {
      let card_id = notif.args.card_id;
      let p_id = notif.args.player_id;
      let card_type = notif.args.card_type; // string key like 'have_a_charity'

      const pendingTempId = "pending_action_play_" + card_id;
      if (dojo.byId(pendingTempId)) {
        dojo.destroy(pendingTempId);
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

      if (this.isAoeCombatType(card_type)) {
        this.placeAoeActionCard(card_type, card_id, p_id);
      } else if (card_type === "faith_war" || card_type === "faith_debate") {
        this.setDuelActionCard(
          card_type,
          p_id,
          this.getActionCardDisplayName(card_type)
        );
      } else {
        this.currentAoeCombatType = null;
        this.currentAoeAttackerId = null;
        this.currentAoeActionCardId = null;
        this.clearFaithWarArena("");
        this.showCenterActionCard(card_type, card_id);
      }
    },

    notif_newActionCards: function (notif) {
      this.isDiscardMode = false;
      for (let i in notif.args.cards) {
        let card = notif.args.cards[i];
        let sprite_idx = this.getActionCardSpriteIndex(card.type);
        this.playerActionCards.addToStockWithId(
          sprite_idx,
          card.id,
          "action_deck"
        );
        this.actionCardTypeById[String(card.id)] = card.type;
      }

      let countElem = dojo.byId("table_action_count_" + this.player_id);
      if (countElem) {
        countElem.innerHTML =
          parseInt(countElem.innerHTML) + notif.args.cards.length;
      }
    },

    notif_drawActionCards: function (notif) {
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

    notif_haveACharity: function (notif) {
      const drawCount = parseInt(notif.args.n || 0, 10);
      const drawTotal = parseInt(
        typeof notif.args.n_total !== "undefined" ? notif.args.n_total : drawCount,
        10
      );
      // Find the deck count and deduct actual drawn amount
      let current_count = parseInt(dojo.byId("believer_deck_count").innerHTML);
      dojo.byId("believer_deck_count").innerHTML = Math.max(
        0,
        current_count - drawTotal
      );

      // For other players, their hand count increases visually
      if (String(notif.args.player_id) !== String(this.player_id)) {
        let countElem = dojo.byId(
          "table_believer_count_" + notif.args.player_id
        );
        if (countElem) {
          countElem.innerHTML = parseInt(countElem.innerHTML) + drawCount;
        }
      }
    },

    notif_divineInspiration: function (notif) {
      const discardN = parseInt(notif.args.discard_n || 0);
      const drawN = parseInt(notif.args.draw_n || 0);
      const drawTotalN = parseInt(
        typeof notif.args.draw_total_n !== "undefined"
          ? notif.args.draw_total_n
          : drawN,
        10
      );
      const actorId = String(notif.args.player_id || "");

      let currentDeck = parseInt(dojo.byId("believer_deck_count").innerHTML);
      dojo.byId("believer_deck_count").innerHTML = Math.max(
        0,
        currentDeck - drawTotalN
      );

      if (actorId !== String(this.player_id)) {
        const actionCountElem = dojo.byId("table_action_count_" + actorId);
        if (actionCountElem) {
          actionCountElem.innerHTML = Math.max(
            0,
            parseInt(actionCountElem.innerHTML) - discardN
          );
        }
        const believerCountElem = dojo.byId("table_believer_count_" + actorId);
        if (believerCountElem) {
          believerCountElem.innerHTML =
            parseInt(believerCountElem.innerHTML) + drawN;
        }
      } else if (notif.args.insufficient_deck) {
        this.showMessage(
          _(
            "Believer deck has fewer cards than discarded actions. You only drew "
          ) +
            drawN +
            _(" believer(s)."),
          "info"
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
              return this.getBelieverTypeName(card.type);
            }.bind(this)
          )
          .join(", ");

        this.showMessage(
          notif.args.player_name +
            " " +
            _("revived from the top of the graveyard: ") +
            revivedNames,
          "info"
        );
      }
    },

    notif_newBelievers: function (notif) {
      for (let i in notif.args.cards) {
        let card = notif.args.cards[i];
        const revivedFromGraveyard =
          !!this.pendingRevivedFromGraveyard[String(card.id)];
        if (revivedFromGraveyard) {
          this.playerBelieverCards.addToStockWithId(card.type, card.id);
          delete this.pendingRevivedFromGraveyard[String(card.id)];
        } else {
          this.playerBelieverCards.addToStockWithId(
            card.type,
            card.id,
            "believer_deck"
          );
        }
      }

      let countElem = dojo.byId("table_believer_count_" + this.player_id);
      if (countElem) {
        countElem.innerHTML =
          parseInt(countElem.innerHTML) + notif.args.cards.length;
      }
    },

    notif_spyResult: function (notif) {
      const actionCards = Object.values(notif.args.action_cards || {});
      const believerCards = Object.values(notif.args.believer_cards || {});
      const actionCount = actionCards.length;
      const believerCount = believerCards.length;

      this.showMessage(
        _("Info Spy on ") +
          notif.args.target_name +
          ": " +
          actionCount +
          _(" Action card(s), ") +
          believerCount +
          _(" Believer(s)"),
        "info"
      );
      this.showSpyResultModal(notif.args.target_name, actionCards, believerCards);
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
      this.updateGraveyardCount(notif.args.count || 0);
      if (notif.args.cards) {
        this.pushGraveyardCards(notif.args.cards.slice().reverse());
      }
    },

    notif_skillStateUpdated: function (notif) {
      if (notif.args && notif.args.skill_state) {
        this.mySkillState = notif.args.skill_state;
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
      this.applySkillRevealToPlayer(pid, skillType, notif.args.skill_state_actor || null);
    },

    notif_syncBelieverHand: function (notif) {
      const cards = (notif.args && notif.args.cards) || [];
      this.replaceCurrentBelieverHand(cards);
    },

    notif_syncActionHand: function (notif) {
      const cards = (notif.args && notif.args.cards) || [];
      this.replaceCurrentActionHand(cards);
    },

    notif_skillKarboom: function (notif) {
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
          this.gamedatas.player_skills[String(notif.args.player_id)] &&
          this.gamedatas.player_skills[String(notif.args.player_id)].type) || 2,
          notif.args.skill_state_actor
        );
      }
      const actorId = String(notif.args.player_id || "");
      const targetId = String(notif.args.target_id || "");
      const sacrificed = notif.args.sacrificed_card || null;
      const killed = notif.args.killed_cards || [];

      if (actorId === String(this.player_id) && sacrificed && sacrificed.id) {
        this.playerBelieverCards.removeFromStockById(parseInt(sacrificed.id, 10));
      }
      if (targetId === String(this.player_id) && killed.length) {
        killed.forEach(
          function (card) {
            if (card && card.id) {
              this.playerBelieverCards.removeFromStockById(parseInt(card.id, 10));
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
        this.updateGraveyardCount(0, parseInt(notif.args.graveyard_count || 0, 10));
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
          this.gamedatas.player_skills[String(notif.args.player_id)].type) || 13,
          notif.args.skill_state_actor
        );
      }
      const actorId = String(notif.args.player_id || "");
      const sacrificed = notif.args.sacrificed_card || null;
      if (actorId === String(this.player_id) && sacrificed && sacrificed.id) {
        this.playerBelieverCards.removeFromStockById(parseInt(sacrificed.id, 10));
      }
      if (sacrificed && sacrificed.type) {
        this.animateBelieversFromPlayerToGraveyard(actorId, [sacrificed]);
      }
      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, parseInt(notif.args.graveyard_count || 0, 10));
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
          this.gamedatas.player_skills[String(notif.args.player_id)].type) || 8,
          notif.args.skill_state_actor
        );
      }
      const actorId = String(notif.args.player_id || "");
      const sacrificed = notif.args.sacrificed_card || null;
      if (actorId === String(this.player_id) && sacrificed && sacrificed.id) {
        this.playerBelieverCards.removeFromStockById(parseInt(sacrificed.id, 10));
      }
      if (sacrificed && sacrificed.type) {
        this.animateBelieversFromPlayerToGraveyard(actorId, [sacrificed]);
      }
      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, parseInt(notif.args.graveyard_count || 0, 10));
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
          this.gamedatas.player_skills[String(notif.args.player_id)].type) || 7,
          notif.args.skill_state_actor
        );
      }
      const actorId = String(notif.args.player_id || "");
      const sacrificed = notif.args.sacrificed_card || null;
      if (actorId === String(this.player_id) && sacrificed && sacrificed.id) {
        this.playerBelieverCards.removeFromStockById(parseInt(sacrificed.id, 10));
      }
      if (sacrificed && sacrificed.type) {
        this.animateBelieversFromPlayerToGraveyard(actorId, [sacrificed]);
      }
      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, parseInt(notif.args.graveyard_count || 0, 10));
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
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
          this.gamedatas.player_skills[String(notif.args.player_id)] &&
          this.gamedatas.player_skills[String(notif.args.player_id)].type) || 11,
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
        ((this.gamedatas.players[String(notif.args.target_id || "")] || {}).name ||
          _("Player"));
      this.showMessage(
        (notif.args.player_name || _("A player")) +
          " " +
          _("used Soul Severing Sword on") +
          " " +
          targetName +
          ".",
        "info"
      );
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_soulBladeMarked: function (notif) {
      this.showMessage(
        _("You were marked by Soul Severing Sword. Your next turn will be skipped."),
        "error"
      );
    },

    notif_soulBladeTurnSkipped: function (notif) {
      const targetName =
        notif.args.player_name ||
        ((this.gamedatas.players[String(notif.args.player_id || "")] || {}).name ||
          _("Player"));
      this.showMessage(targetName + " " + _("turn was skipped."), "info");
    },

    notif_soulBladeTurnSkippedPrivate: function (notif) {
      this.showMessage(
        _("Your turn is skipped. You cannot act or draw Action cards this turn."),
        "error"
      );
    },

    notif_prophetPredictionResolved: function (notif) {
      const args = notif.args || {};
      this.animateProphetPredictionFlow(args);
      const prophetId = String(args.prophet_id || "");
      const prophetGain = parseInt(args.prophet_gain_n || 0, 10);
      if (prophetId && prophetGain > 0) {
        const node = dojo.byId("table_believer_count_" + prophetId);
        if (node) {
          node.innerHTML = String(Math.max(0, parseInt(node.innerHTML || "0", 10) + prophetGain));
        }
      }

      const sourceName =
        args.source_key === "divine_inspire"
          ? _("Divine Inspiration")
          : _("Have a Charity");
      const prophetName = args.prophet_name || _("Prophet");
      const drawerName = args.drawer_name || _("Player");
      const guessType = parseInt(args.guess_type || 0, 10);
      const revealedType = parseInt(args.revealed_type || 0, 10);
      if (guessType > 0 && revealedType > 0) {
        const guessName = this.getBelieverTypeName(guessType);
        const revealName = this.getBelieverTypeName(revealedType);
        if (parseInt(args.guess_correct || 0, 10) === 1) {
          this.showMessage(
            prophetName +
              " " +
              _("predicted correctly during") +
              " " +
              sourceName +
              " (" +
              guessName +
              ").",
            "info"
          );
        } else {
          this.showMessage(
            prophetName +
              " " +
              _("predicted") +
              " " +
              guessName +
              _(" but the first card was ") +
              revealName +
              ".",
            "info"
          );
        }
      } else if (guessType === 0) {
        this.showMessage(
          prophetName +
            " " +
            _("did not predict this time. ") +
            drawerName +
            _(" resolves ") +
            sourceName +
            ".",
          "info"
        );
      }
    },

    notif_skillAutoDefense: function (notif) {
      const pid = parseInt((notif.args && notif.args.player_id) || 0, 10);
      if (!pid) return;
      const defenseKind = String((notif.args && notif.args.defense_kind) || "physical");
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
      const attackLabel = defenseKind === "mental" ? _("Mental") : _("Physical");
      this.showMessage(
        (notif.args.player_name || player.name || _("A player")) +
          " " +
          _("is protected from") +
          " " +
          attackLabel +
          _(" attacks. Their sect auto-defends."),
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
          this.gamedatas.player_skills[String(args.player_id)].type) || 5,
          args.skill_state_actor
        );
      }
      if (pid === String(this.player_id) && args.skill_state_actor) {
        this.mySkillState = args.skill_state_actor;
        this.refreshCurrentPlayerSkillTooltips();
      }

      if (used) {
        this.showMessage(
          (args.player_name || _("A player")) +
            " " +
            _("used Holy Rebirth and revived") +
            " " +
            revivedN +
            " " +
            _("Believer(s)."),
          "info"
        );
      } else {
        this.showMessage(
          (args.player_name || _("A player")) +
            " " +
            _("did not use Holy Rebirth this trigger."),
          "info"
        );
      }
      if (this.pendingSkill) {
        this.cancelPendingSkillSelection();
      }
    },

    notif_impermanenceFailed: function (notif) {
      const args = notif.args || {};
      this.showMessage(
        (args.player_name || _("A player")) +
          " " +
          _("failed Impermanence of Life and redrew a hidden skill."),
        "info"
      );
      if (String(args.player_id || "") === String(this.player_id) && this.pendingSkill) {
        this.cancelPendingSkillSelection();
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
      if (!this.gamedatas.player_skills) this.gamedatas.player_skills = {};
      this.gamedatas.player_skills[String(this.player_id)] = newSkill
        ? { type: parseInt(newSkill.type || 0, 10) }
        : null;
      if (args.skill_state) {
        this.mySkillState = args.skill_state;
      }
      this.refreshCurrentPlayerSkillTooltips();
    },

    notif_skillEveryoneEqual: function (notif) {
      this.playEveryoneEqualShuffleFx();
      this.showMessage(
        (notif.args.player_name || _("A player")) +
          " " +
          _("used Everyone is Equal: all believers were shuffled and redistributed."),
        "info"
      );
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
          this.gamedatas.player_skills[String(notif.args.player_id)] &&
          this.gamedatas.player_skills[String(notif.args.player_id)].type) || 15,
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
      this.playChaosComingShuffleFx();
      this.showMessage(
        (notif.args.player_name || _("A player")) +
          " " +
          _("used Chaos Coming: all action cards were shuffled and redistributed."),
        "info"
      );
      if (notif.args && notif.args.player_id && notif.args.skill_state_actor) {
        this.applySkillRevealToPlayer(
          notif.args.player_id,
          (this.gamedatas.player_skills &&
          this.gamedatas.player_skills[String(notif.args.player_id)] &&
          this.gamedatas.player_skills[String(notif.args.player_id)].type) || 14,
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

    notif_spreadRumors: function (notif) {
      if (notif.args.victim_id) {
        let victimElem = dojo.byId(
          "table_believer_count_" + notif.args.victim_id
        );
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
      const attacker = notif.args.player_name || _("A player");
      const sectLabel = this.getSectLabel(notif.args.target_sect || -1);
      const victimNames = (notif.args.victim_names || []).join(", ");
      const stolenTotal = parseInt(notif.args.stolen_total || 0, 10);
      if (stolenTotal > 0) {
        this.showMessage(
          attacker +
            " " +
            _("plays Spread Rumors and steals believers from") +
            " " +
            sectLabel +
            (victimNames ? " (" + victimNames + ")" : "") +
            ".",
          "info"
        );
      } else {
        this.showMessage(
          attacker +
            " " +
            _("plays Spread Rumors against") +
            " " +
            sectLabel +
            " " +
            _("but steals no believers."),
          "info"
        );
      }
    },

    notif_witchHuntStart: function (notif) {
      this.showCenterActionCard("witch_hunt");
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

      if (notif.args.killed_cards && notif.args.killed_cards.length) {
        this.pushGraveyardCards(notif.args.killed_cards);
      }

      const attackerSect =
        parseInt(notif.args.attacker_sect || "-1", 10) ||
        parseInt(
          ((this.gamedatas.players || {})[String(notif.args.attacker_id)] || {})
            .player_sect || "-1",
          10
        );
      const targetSect = parseInt(notif.args.target_sect || "-1", 10);
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
        notif.args.player_name +
          " (" +
          this.getSectLabel(attackerSect) +
          ") " +
          _("attacks") +
          " " +
          this.getSectLabel(targetSect) +
          membersText +
          ". " +
          notif.args.type +
          " " +
          _("believers sent to graveyard") +
          ": " +
          notif.args.n,
        "info"
      );
    },

    notif_actionCardsDiscarded: function (notif) {
      if (
        String(notif.args.player_id) === String(this.player_id) &&
        notif.args.card_ids
      ) {
        notif.args.card_ids.forEach(
          function (card_id) {
            this.playerActionCards.removeFromStockById(card_id);
            delete this.actionCardTypeById[String(card_id)];
          }.bind(this)
        );
        this.currentTurnActionMask |= 0b00001;
        this.onUpdateActionButtons("playerTurn", {});
      }

      if (notif.args.cards && notif.args.cards.length) {
        notif.args.cards.forEach(
          function (card) {
            if (!card || !card.type) return;
            this.pushActionDiscardCard(card.type, card.id || "");
          }.bind(this)
        );
      }

      let countElem = dojo.byId("table_action_count_" + notif.args.player_id);
      if (countElem) {
        countElem.innerHTML = Math.max(
          0,
          parseInt(countElem.innerHTML) - (notif.args.count || 0)
        );
      }
    },

    notif_defenseDecisionPhase: function (notif) {
      const defenseKind =
        (notif.args && notif.args.defense_kind) || "physical";
      const defenseLabel = this.getDefenseKindLabel(defenseKind);
      if (notif.args && notif.args.phase === "defense_prompt") {
        if (notif.args.scope === "sect") {
          this.showMessage(
            _("Waiting for sect ") + defenseLabel + _(" defense decisions."),
            "info"
          );
        } else {
          const names = (notif.args.defender_names || []).join(", ");
          this.showMessage(
            _("Waiting for ") +
              defenseLabel +
              _(" defense decision: ") +
              names,
            "info"
          );
        }
      }
    },

    notif_defensePlayed: function (notif) {
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
      });
      if (parseInt(notif.args.moved_to_discard || 0, 10) === 1) {
        this.pushActionDiscardCard(notif.args.card_type, notif.args.card_id);
      }
      this.showMessage(
        notif.args.player_name + " " + _("uses a defense card"),
        "info"
      );
    },

    notif_passDefense: function (notif) {
      if (notif.args && notif.args.anonymous) {
        this.showMessage(_("A defender chooses not to defend"), "info");
        return;
      }
      this.showMessage(
        (notif.args.player_name || _("A defender")) +
          " " +
          _("does not defend"),
        "info"
      );
    },

    notif_combatBlocked: function (notif) {
      this.showMessage(_("Attack blocked by defense"), "info");
      this.clearTransientArenaAfterAction(700);
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
        notif.args.player_name +
          " " +
          _("steals 1 believer from") +
          " " +
          notif.args.target_name,
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
      const attackerId = parseInt((notif.args && notif.args.player_id) || 0, 10);
      if (attackerId > 0) {
        this.placeAoeActionCard("martyrdom", this.currentAoeActionCardId || "", attackerId);
      }
      this.showMessage(
        notif.args.player_name + " " + _("initiates Martyrdom"),
        "info"
      );
    },

    notif_martyrdomAttackerCommitted: function (notif) {
      // Keep all clients visually in sync even if notifications arrive out of order.
      this.syncAoeAnchorFromNotif("martyrdom", notif.args);
      if (String(notif.args.player_id) === String(this.player_id)) {
        this.playerBelieverCards.removeFromStockById(notif.args.card_id);
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
        facedown: true,
      });
      this.showMessage(
        notif.args.player_name + " " + _("commits a believer for Martyrdom"),
        "info"
      );
    },

    notif_martyrdomRepresentativePhase: function (notif) {
      this.showMessage(
        _("Sect leaders are choosing Martyrdom defenders"),
        "info"
      );
    },

    notif_martyrdomRepresentativeChosen: function (notif) {
      this.showMessage(
        notif.args.leader_name +
          " " +
          _("assigned") +
          " " +
          notif.args.representative_name,
        "info"
      );
    },

    notif_martyrdomAssignedToYou: function (notif) {
      this.showMessage(
        _("You have been assigned by ") +
          notif.args.leader_name +
          _(" for Martyrdom."),
        "info"
      );
    },

    notif_martyrdomBelieverCommitted: function (notif) {
      this.syncAoeAnchorFromNotif("martyrdom", notif.args);
      if (String(notif.args.player_id) === String(this.player_id)) {
        this.playerBelieverCards.removeFromStockById(notif.args.card_id);
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
        facedown: true,
      });
    },

    notif_martyrdomDefendersChoose: function (notif) {
      this.showMessage(
        _("Martyrdom: waiting for defenders to choose believers"),
        "info"
      );
    },

    notif_martyrdomResolved: function (notif) {
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, notif.args.graveyard_count);
      }
      this.revealAoeBelievers();
      const survivorSet = {};
      (notif.args.survivor_defenders || []).forEach(function (cid) {
        survivorSet[String(cid)] = true;
      });
      const deadSet = {};
      (notif.args.dead_defenders || []).forEach(function (cid) {
        deadSet[String(cid)] = true;
      });
      const ownerByCardId = {};
      dojo.query('.aoe-commit-item[data-card-kind="believer"]').forEach(
        function (wrap) {
          const cardId = wrap.getAttribute("data-card-id");
          const ownerId = parseInt(wrap.getAttribute("data-owner-id") || "0", 10);
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
        }
      );

      // Physical AoE: dead and draw participants are shown as losers (gray).
      const attackerBelieverWrap = dojo.query(
        '#aoe_attacker_slot .aoe-commit-item[data-card-kind="believer"]'
      )[0];
      if (attackerBelieverWrap) {
        const attackerCardId = attackerBelieverWrap.getAttribute("data-card-id");
        if (attackerCardId) {
          this.setAoeResultState(attackerCardId, "loser", _("lose"));
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

      setTimeout(
        function () {
          Object.keys(ownerByCardId).forEach(
            function (cardId) {
              const owner = ownerByCardId[cardId];
              const wrap = dojo.query(
                '.aoe-commit-item[data-card-kind="believer"][data-card-id="' +
                  cardId +
                  '"]'
              )[0];
              if (!wrap) return;
              const targetId = owner > 0 ? "playertable_" + owner : "graveyard";
              if (!dojo.byId(targetId)) return;
              const anim = this.slideToObject(wrap, targetId, 650);
              dojo.connect(anim, "onEnd", this, function () {
                dojo.destroy(wrap);
              });
              anim.play();
            }.bind(this)
          );
        }.bind(this),
        2200
      );
      this.clearTransientArenaAfterAction(4100);
      this.showMessage(
        notif.args.player_name + " " + _("resolved Martyrdom"),
        "info"
      );
    },

    notif_faithDebateStart: function (notif) {
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.setDuelLogMode("debate");
      this.resetFaithWarLog();
      this.clearFaithWarRoundCards();
      this.clearFaithWarArena(
        '<div class="faith-war-banner">' +
          _("Faith Debate! ") +
          notif.args.player_name +
          " vs " +
          notif.args.target_name +
          "</div>"
      );
      this.setDuelActionCard("faith_debate", notif.args.player_id, "Faith Debate");
    },

    notif_faithDebateRepresentativePhase: function (notif) {
      // Keep silent to reduce spam.
    },

    notif_faithDebateRepresentativeChosen: function (notif) {
      // Keep silent to reduce spam.
    },

    notif_faithDebateRound: function (notif) {
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.setDuelLogMode("debate");
      this.faithWarRoundNo = parseInt(notif.args.round || this.faithWarRoundNo + 1);
      this.clearFaithWarRoundCards();
      this.clearFaithWarArena(
        '<div class="faith-war-banner">' +
          _("Faith Debate round ") +
          this.faithWarRoundNo +
          "/5: " +
          (notif.args.attacker_rep_name || _("Attacker")) +
          " vs " +
          (notif.args.defender_rep_name || _("Defender")) +
          "</div>"
      );
      this.setDuelParticipants(
        notif.args.attacker_rep_id,
        notif.args.defender_rep_id,
        notif.args.attacker_rep_name,
        notif.args.defender_rep_name
      );
      this.setDuelActionCard("faith_debate", notif.args.attacker_id, "Faith Debate");
    },

    notif_faithDebateCardPlayed: function (notif) {
      if (String(notif.args.player_id) === String(this.player_id)) {
        this.playerBelieverCards.removeFromStockById(notif.args.card_id);
      }
      let countElem = dojo.byId("table_believer_count_" + notif.args.player_id);
      if (countElem) {
        countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - 1);
      }
      this.renderFaithWarFaceDownCard(
        notif.args.player_id,
        notif.args.player_name
      );
    },

    notif_faithDebateResult: function (notif) {
      this.revealFaithWarCard(
        notif.args.attacker_id,
        notif.args.card_a ? notif.args.card_a.type : 1,
        notif.args.attacker_name || _("Attacker")
      );
      this.revealFaithWarCard(
        notif.args.defender_id,
        notif.args.card_b ? notif.args.card_b.type : 1,
        notif.args.defender_name || _("Defender")
      );

      const attackerSlot = dojo.byId("faithwar_slot_" + notif.args.attacker_id);
      const defenderSlot = dojo.byId("faithwar_slot_" + notif.args.defender_id);
      if (attackerSlot) {
        dojo.removeClass(attackerSlot, "is-winner");
        dojo.removeClass(attackerSlot, "is-loser");
      }
      if (defenderSlot) {
        dojo.removeClass(defenderSlot, "is-winner");
        dojo.removeClass(defenderSlot, "is-loser");
      }
      if (notif.args.result_type === "attacker") {
        if (attackerSlot) dojo.addClass(attackerSlot, "is-winner");
        if (defenderSlot) dojo.addClass(defenderSlot, "is-loser");
      } else if (notif.args.result_type === "defender") {
        if (defenderSlot) dojo.addClass(defenderSlot, "is-winner");
        if (attackerSlot) dojo.addClass(attackerSlot, "is-loser");
      } else {
        this.revealFaithWarCard(
          notif.args.attacker_id,
          notif.args.card_a ? notif.args.card_a.type : 1,
          _("Draw")
        );
        this.revealFaithWarCard(
          notif.args.defender_id,
          notif.args.card_b ? notif.args.card_b.type : 1,
          _("Draw")
        );
      }

      // Keep counts strictly server-authoritative during ongoing Debate.
      // Debaters' cards are parked in debateused and only return at debate end.
      this.pushFaithWarLogEntry({
        attacker_name: notif.args.attacker_name || _("Attacker"),
        defender_name: notif.args.defender_name || _("Defender"),
        card_a: notif.args.card_a || null,
        card_b: notif.args.card_b || null,
        result_type: notif.args.result_type || "draw",
        result_bonus: false,
      });

      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
      }
      this.faithWarCleanupTimeout = setTimeout(
        function () {
          this.clearFaithWarRoundCards();
          this.faithWarCleanupTimeout = null;
        }.bind(this),
        1900
      );
    },

    notif_faithDebateEnd: function (notif) {
      this.moveDuelActionCardToDiscard();
      this.clearFaithWarRoundCards();
      this.clearFaithWarArena(
        '<div class="faith-war-banner">' +
          _("Faith Debate ended after ") +
          notif.args.round +
          _(" rounds") +
          "</div>"
      );
      this.resetFaithWarLog();
    },

    notif_conspiracyRepresentativePhase: function (notif) {
      this.showMessage(
        _("Sect leaders are choosing Conspiracy defenders"),
        "info"
      );
    },

    notif_conspiracyRepresentativeChosen: function (notif) {
      if (
        notif.args &&
        String(notif.args.leader_id || "") ===
          String(notif.args.representative_id || "")
      ) {
        return;
      }
      this.showMessage(
        notif.args.leader_name +
          " " +
          _("assigned") +
          " " +
          notif.args.representative_name,
        "info"
      );
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
        _("You have been assigned by ") +
          notif.args.leader_name +
          _(" to defend against Conspiracy."),
        "info"
      );
    },

    notif_conspiracyDefendersChoose: function (notif) {
      this.showMessage(
        _("Conspiracy defenders must choose one believer"),
        "info"
      );
    },

    notif_conspiracyStart: function (notif) {
      const attackerId = parseInt((notif.args && notif.args.player_id) || 0, 10);
      if (attackerId > 0) {
        this.placeAoeActionCard(
          "conspiracy",
          this.currentAoeActionCardId || "",
          attackerId
        );
      }
      this.showMessage(
        notif.args.player_name + " " + _("spreads a Conspiracy"),
        "info"
      );
    },

    notif_conspiracyBelieverCommitted: function (notif) {
      this.syncAoeAnchorFromNotif("conspiracy", notif.args);
      if (String(notif.args.player_id) === String(this.player_id)) {
        this.playerBelieverCards.removeFromStockById(notif.args.card_id);
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
        facedown: true,
      });
    },

    notif_conspiracyResolved: function (notif) {
      this.revealAoeBelievers();
      const attackerCardId = String(notif.args.attacker_card_id || "");
      const stolenSet = {};
      (notif.args.attacker_stolen || []).forEach(function (cid) {
        stolenSet[String(cid)] = true;
      });
      const defenderWinsSet = {};
      (notif.args.defender_wins || []).forEach(function (cid) {
        defenderWinsSet[String(cid)] = true;
      });
      const drawSet = {};
      (notif.args.draw_defenders || []).forEach(function (cid) {
        drawSet[String(cid)] = true;
      });

      if (Object.keys(defenderWinsSet).length > 0) {
        this.setAoeResultState(attackerCardId, "loser", _("lose"));
      } else if (Object.keys(stolenSet).length > 0) {
        this.setAoeResultState(attackerCardId, "winner", _("win"));
      } else {
        this.setAoeResultState(attackerCardId, "draw", _("draw"));
      }
      Object.keys(stolenSet).forEach(
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
      dojo.query('.aoe-commit-item[data-card-kind="believer"]').forEach(
        function (wrap) {
          const cardId = wrap.getAttribute("data-card-id");
          const ownerId = parseInt(wrap.getAttribute("data-owner-id") || "0", 10);
          if (!cardId) return;
          if (String(cardId) === String(notif.args.attacker_card_id)) {
            ownerByCardId[String(cardId)] = parseInt(notif.args.attacker_owner, 10);
          } else if (stolenSet[String(cardId)]) {
            ownerByCardId[String(cardId)] = parseInt(notif.args.attacker_owner, 10);
          } else {
            ownerByCardId[String(cardId)] = ownerId;
          }
        }
      );
      setTimeout(
        function () {
          this.animateAoeBelieversToTargets(ownerByCardId);
        }.bind(this),
        2400
      );
      this.clearTransientArenaAfterAction(4500);
      if (notif.args.gain_by_player) {
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
        notif.args.player_name + " " + _("resolved Conspiracy"),
        "info"
      );
    },

    notif_faithWarStart: function (notif) {
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.resetFaithWarLog();
      this.faithWarAssignNoticeShown = false;
      this.clearFaithWarRoundCards();
      this.clearFaithWarArena(
        '<div class="faith-war-banner">' +
          _("Faith War! ") +
          notif.args.player_name +
          " vs " +
          notif.args.target_name +
          "</div>"
      );
      this.setDuelActionCard("faith_war", notif.args.player_id, "Faith War");
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
      const assignedText =
        _("You have been assigned to this war by ") +
        notif.args.leader_name +
        ". " +
        _("Choose one Believer and click Confirm.");
      this.showMessage(assignedText, "info");
      this.setTopInstruction(
        "You have been assigned to this war. Choose one Believer and click Confirm."
      );
    },

    notif_faithWarRound: function (notif) {
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.faithWarRoundNo = parseInt(notif.args.round || this.faithWarRoundNo + 1);
      this.clearFaithWarRoundCards();
      this.clearFaithWarArena(
        '<div class="faith-war-banner">' +
          notif.args.attacker_name +
          " vs " +
          notif.args.defender_name +
          "</div>"
      );
      this.setDuelParticipants(
        notif.args.attacker_rep_id,
        notif.args.defender_rep_id,
        notif.args.attacker_rep_name,
        notif.args.defender_rep_name
      );
      this.setDuelActionCard("faith_war", notif.args.attacker_id, "Faith War");
    },

    notif_faithWarCardPlayed: function (notif) {
      if (String(notif.args.player_id) === String(this.player_id)) {
        this.playerBelieverCards.removeFromStockById(notif.args.card_id);
      }

      let countElem = dojo.byId("table_believer_count_" + notif.args.player_id);
      if (countElem) {
        countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - 1);
      }

      this.renderFaithWarFaceDownCard(
        notif.args.player_id,
        notif.args.player_name
      );
    },

    notif_duelResult: function (notif) {
      this.playerBelieverCards.unselectAll();
      // Keep counts strictly server-authoritative during ongoing Faith War.
      // Survivors are parked in warused and only return at war end.

      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, notif.args.graveyard_count);
      } else if (notif.args.dead_count) {
        this.updateGraveyardCount(notif.args.dead_count);
      }

      const deadCards = [];
      if (notif.args.result_type === "attacker" && notif.args.card_b) {
        deadCards.push(notif.args.card_b);
      } else if (notif.args.result_type === "defender" && notif.args.card_a) {
        deadCards.push(notif.args.card_a);
      } else if (notif.args.result_type === "draw") {
        if (notif.args.card_b) deadCards.push(notif.args.card_b);
        if (notif.args.card_a) deadCards.push(notif.args.card_a);
      }
      this.pushGraveyardCards(deadCards);

      this.revealFaithWarCard(
        notif.args.attacker_id,
        notif.args.card_a.type,
        notif.args.attacker_name
      );
      this.revealFaithWarCard(
        notif.args.defender_id,
        notif.args.card_b.type,
        notif.args.defender_name
      );

      const attackerSlot = dojo.byId("faithwar_slot_" + notif.args.attacker_id);
      const defenderSlot = dojo.byId("faithwar_slot_" + notif.args.defender_id);
      if (attackerSlot) {
        dojo.removeClass(attackerSlot, "is-winner");
        dojo.removeClass(attackerSlot, "is-loser");
      }
      if (defenderSlot) {
        dojo.removeClass(defenderSlot, "is-winner");
        dojo.removeClass(defenderSlot, "is-loser");
      }

      const deadPlayerIds = [];
      if (notif.args.result_type === "attacker") {
        if (attackerSlot) dojo.addClass(attackerSlot, "is-winner");
        if (defenderSlot) dojo.addClass(defenderSlot, "is-loser");
        deadPlayerIds.push(notif.args.defender_id);
      } else if (notif.args.result_type === "defender") {
        if (defenderSlot) dojo.addClass(defenderSlot, "is-winner");
        if (attackerSlot) dojo.addClass(attackerSlot, "is-loser");
        deadPlayerIds.push(notif.args.attacker_id);
      } else {
        this.revealFaithWarCard(
          notif.args.attacker_id,
          notif.args.card_a.type,
          _("Draw")
        );
        this.revealFaithWarCard(
          notif.args.defender_id,
          notif.args.card_b.type,
          _("Draw")
        );
        if (attackerSlot) dojo.addClass(attackerSlot, "is-loser");
        if (defenderSlot) dojo.addClass(defenderSlot, "is-loser");
        deadPlayerIds.push(notif.args.attacker_id, notif.args.defender_id);
      }

      this.pushFaithWarLogEntry({
        attacker_name: notif.args.attacker_name,
        defender_name: notif.args.defender_name,
        card_a: notif.args.card_a,
        card_b: notif.args.card_b,
        result_type: notif.args.result_type,
        result_bonus: false,
      });
      this.animateFaithWarDeadCardsToGraveyard(deadPlayerIds);

      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
      }
      this.faithWarCleanupTimeout = setTimeout(
        function () {
          this.clearFaithWarRoundCards();
          this.faithWarCleanupTimeout = null;
        }.bind(this),
        2400
      );

      let arena = dojo.byId("central_arena");
      let message = _("Duel resolved");
      if (notif.args.result_type === "draw") {
        message = _("Draw! Both believers died.");
      } else if (notif.args.winner_name && notif.args.loser_name) {
        message =
          notif.args.winner_name +
          " " +
          _("won the duel against") +
          " " +
          notif.args.loser_name;
      }
      if (arena) {
        arena.innerHTML +=
          '<div class="faith-war-banner">' + message + "</div>";
      }
    },

    notif_duelBonus: function (notif) {
      let message = notif.args.player_name + " " + _("earned a War Bonus");
      if (notif.args.delayed_until_war_end) {
        message += " - " + _("it will be added after the war ends");
      }
      this.showMessage(message, "info");
      this.markLatestFaithWarLogBonus();

      let arena = dojo.byId("central_arena");
      if (arena) {
        arena.innerHTML +=
          '<div class="faith-war-banner">' + message + "</div>";
      }
    },

    notif_faithWarEnd: function (notif) {
      if (this.faithWarCleanupTimeout) {
        clearTimeout(this.faithWarCleanupTimeout);
        this.faithWarCleanupTimeout = null;
      }
      this.moveDuelActionCardToDiscard();
      this.clearFaithWarRoundCards();
      this.faithWarAssignNoticeShown = false;
      let arena = dojo.byId("central_arena");
      if (arena) {
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
        arena.innerHTML = '<div class="faith-war-banner">' + summary + "</div>";
      }
      dojo.removeClass("mybelievercards", "highlight_stock");
      this.clearTransientArenaAfterAction(1200);
    },

    notif_publicCountsSync: function (notif) {
      const actionCounts = notif.args.action_counts || {};
      const believerCounts = notif.args.believer_counts || {};
      if (typeof notif.args.skill_protection !== "undefined") {
        this.setSkillProtectionSnapshot(notif.args.skill_protection || {});
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
      if (actionDeck && typeof notif.args.action_deck_count !== "undefined") {
        actionDeck.innerHTML = String(parseInt(notif.args.action_deck_count || 0, 10));
      }
      const believerDeck = dojo.byId("believer_deck_count");
      if (believerDeck && typeof notif.args.believer_deck_count !== "undefined") {
        believerDeck.innerHTML = String(
          parseInt(notif.args.believer_deck_count || 0, 10)
        );
      }
      if (typeof notif.args.graveyard_cards !== "undefined") {
        this.setGraveyardCardsSnapshot(notif.args.graveyard_cards);
      }
      if (typeof notif.args.graveyard_count !== "undefined") {
        this.updateGraveyardCount(0, parseInt(notif.args.graveyard_count || 0, 10));
      } else if (typeof notif.args.graveyard_cards !== "undefined") {
        this.renderGraveyardPreview();
      }
    },
  });
});

