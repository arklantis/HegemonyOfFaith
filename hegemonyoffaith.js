/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * HegemonyOfFaith implementation : © <Your name here> <Your email address here>
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
    },

    setup: function (gamedatas) {
      console.log("Starting game setup");

      // JS HTML Injection removed since the framework now uses classic .tpl layout.
      // 建立遊戲區域 HTML
      document.getElementById("game_play_area").innerHTML = `
        <div id="play_area">
            <!-- Common Deck & Graveyard Area -->
            <div id="common_table" class="whiteblock" style="display:flex; flex-direction:column; align-items:center; margin-bottom: 20px; padding: 20px;">
                <!-- Decks Row -->
                <div style="display:flex; gap: 60px; text-align:center;">
                    <div class="deck_container">
                        <h4 style="margin-top: 0;">行動牌庫</h4>
                        <div id="action_deck" class="deck_slot card-back-action"></div>
                        <div class="deck_counter"><span id="action_deck_count">0</span> 張</div>
                    </div>
                    <div class="deck_container">
                        <h4 style="margin-top: 0;">信徒牌庫</h4>
                        <div id="believer_deck" class="deck_slot card-back-believer"></div>
                        <div class="deck_counter"><span id="believer_deck_count">0</span> 張</div>
                    </div>
                    <div class="deck_container">
                        <h4 style="margin-top: 0;">墓地</h4>
                        <div id="graveyard" class="deck_slot graveyard_slot">
                          <div id="graveyard_cards" style="position:relative; width:100%; height:100%;"></div>
                        </div>
                        <div class="deck_counter"><span id="graveyard_count">0</span> 張</div>
                    </div>
                </div>

                <!-- Central Arena Row -->
                <div id="central_arena" style="width: 100%; min-height: 180px; margin-top: 20px; border-top: 2px dashed #ccc; padding-top: 20px; display: flex; justify-content: center; gap: 20px; align-items: center;">
                    <!-- Cards will be dynamically placed here during combat/resolution -->
                </div>
            </div>

            <!-- Player Tables -->
            <div id="table_area" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;">
                <div id="playertables" style="display: contents;"></div>
            </div>
        </div>
        <div id="myhand_wrap">
            <div id="action_hand" class="whiteblock">
                <h3>我的行動牌</h3>
                <div id="myactioncards"></div>
            </div>
            <div id="believer_hand" class="whiteblock">
                <h3>我的信徒牌</h3>
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

      // Set common board counts
      dojo.byId('action_deck_count').innerHTML = gamedatas.action_deck_count;
      dojo.byId('believer_deck_count').innerHTML = gamedatas.believer_deck_count;
      dojo.byId('graveyard_count').innerHTML = gamedatas.graveyard_count;

      // Add info to player boards and build player tables
      for (const player_id in gamedatas.players) {
        const player = gamedatas.players[player_id];

        // Generate playertable for main game area
        let roleStr = "Leader";
        if (player.player_role == 1) roleStr = "Follower";
        if (player.player_role == 2) roleStr = "Wanderer";

        const playerTableHtml = `
            <div class="playertable whiteblock playertable_top" id="playertable_${player_id}" style="border-color:#${player.player_color}; min-width: 320px;">
              <div class="playertable_header" style="background-color:#${player.player_color}33; display:flex; justify-content:space-between; align-items:center; padding: 5px; border-bottom: 1px solid rgba(0,0,0,0.2); margin-bottom: 15px;">
                <span class="playertablename" style="color: #${player.player_color}; font-weight:bold; font-size: 16px;">${player.player_name} <span style="font-size:12px; color:#555;">(${roleStr})</span></span>
                <span class="sect_emblem" id="table_sect_${player_id}" style="font-size: 12px; font-weight:bold;">[Sector Badge]</span>
              </div>
              <div class="playertablecard" id="playertablecard_${player_id}" style="display:flex; justify-content:space-around; align-items:flex-start;">
                
                <!-- Player Status / Hand Counters -->
                <div class="table_status_area" style="display:flex; justify-content: space-around; width: 100%; padding: 10px 0;">
                    <!-- Skill Card (Hidden) -->
                    <div class="table_card_item">
                        <div class="card card-skill-back table-mini-card" style="background-image:url('${g_gamethemeurl}img/skill_cards_en.png'); background-size:500% 400%; background-position:0% 0%;"></div>
                        <div style="font-size:12px; margin-top:5px; color:#666; font-weight:bold;">技能牌</div>
                    </div>
                    <!-- Action Hand -->
                    <div class="table_card_item" title="Action Cards in Hand">
                        <div class="card-back-action table-mini-card"></div>
                        <div class="hand-count-badge" id="table_action_count_${player_id}">${player.action_count}</div>
                        <div style="font-size:12px; margin-top:5px; color:#666; font-weight:bold;">行動手牌</div>
                    </div>
                    <!-- Believer Hand -->
                    <div class="table_card_item" title="Believer Cards in Hand">
                        <div class="card-back-believer table-mini-card"></div>
                        <div class="hand-count-badge" id="table_believer_count_${player_id}">${player.believer_count}</div>
                        <div style="font-size:12px; margin-top:5px; color:#666; font-weight:bold;">信徒手牌</div>
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

        const playerPanelHtml = `
            <div class="hegemony_player_panel" id="panel_${player_id}">
              <div class="role_label" id="role_${player_id}">${panelRoleStr}</div>
              <div class="sect_label" id="sect_${player_id}" style="font-weight:bold; color:#${player.player_color}; margin-top:2px;">[Sector Name]</div>
              <div class="hand_counters" style="display:flex; justify-content:space-around; margin-top:8px;">
                  <div class="believers_label" style="color:darkred; display:flex; align-items:center;" title="Believer Cards in Hand">
                      <div class="icon-believer" style="display:inline-block; width:22px; height:32px; background-image:url('${g_gamethemeurl}img/believer_cards_en.png'); background-size:600% 100%; background-position:0% 0%; border-radius:3px; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"></div>
                      <span id="believer_count_${player_id}" style="margin-left:5px; font-weight:bold; font-size:16px;">${player.believer_count}</span>
                  </div>
                  <div class="actions_label" style="color:darkblue; display:flex; align-items:center;" title="Action Cards in Hand">
                      <div class="icon-action" style="display:inline-block; width:22px; height:32px; background-image:url('${g_gamethemeurl}img/action_cards_en.png'); background-size:400% 400%; background-position:0% 0%; border-radius:3px; box-shadow: 1px 1px 3px rgba(0,0,0,0.5);"></div>
                      <span id="action_count_${player_id}" style="margin-left:5px; font-weight:bold; font-size:16px;">${player.action_count}</span>
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

      this.setupNotifications();
      console.log("Ending game setup");
    },

    onEnteringState: function (stateName, args) {
      console.log("Entering state: " + stateName);

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

    onUpdateActionButtons: function (stateName, args) {
      console.log("onUpdateActionButtons: " + stateName);

      if (this.isCurrentPlayerActive()) {
        switch (stateName) {
          case "playerTurn":
            this.addActionButton(
              "endTurn",
              _("End Turn"),
              "onEndTurnButtonClicked"
            );
            break;

          case "chooseSurrenderOrWanderer":
            this.addActionButton(
              "surrender",
              _("Surrender to a Leader"),
              "onSurrenderButtonClicked"
            );
            this.addActionButton(
              "becomeWanderer",
              _("Become a Wanderer"),
              "onBecomeWandererButtonClicked"
            );
            break;

          case "faithWarDuel":
            this.addActionButton(
              "confirmBeliever",
              _("Confirm Believer for War"),
              "onConfirmBelieverClicked"
            );
            dojo.addClass("mybelievercards", "highlight_stock");
            break;
        }
      }
    },

    ajaxAction: function (actionName, args, onSuccess) {
      const payload = Object.assign({ lock: true }, args || {});
      this.ajaxcall(
        "/hegemonyoffaith/hegemonyoffaith/" + actionName + ".html",
        payload,
        this,
        function (result) {
          if (onSuccess) onSuccess.call(this, result);
        },
        function (is_error) {
          if (is_error) {
            this.playerActionCards.unselectAll();
            this.playerBelieverCards.unselectAll();
          }
        }.bind(this)
      );
    },

    beginTargetSelection: function (card) {
      this.pendingAction = {
        cardId: card.id,
        cardKey: this.getActionCardKeyName(card.type),
      };

      this.playerActionCards.unselectAll();
      this.clearPossibleActions();
      this.addActionButton(
        "cancelTargetSelection",
        _("Cancel"),
        "cancelPendingActionSelection"
      );

      this.highlightSelectablePlayers();
      this.showMessage(_("Select a target player for ") + this.pendingAction.cardKey, "info");
    },

    beginDivineInspireSelection: function (card) {
      this.pendingAction = {
        cardId: card.id,
        cardKey: "divine_inspire",
      };

      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(2);
      }
      this.playerActionCards.selectItem(card.id);
      this.clearPossibleActions();
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
      this.showMessage(_("Select one or more other Action cards to discard for Divine Inspiration"), "info");
    },

    highlightSelectablePlayers: function () {
      Object.keys(this.gamedatas.players).forEach(
        function (player_id) {
          if (String(player_id) === String(this.player_id)) return;
          const node = dojo.byId("playertable_" + player_id);
          if (!node) return;
          dojo.addClass(node, "selectable_target");
          if (!this.targetTableHandles) this.targetTableHandles = [];
          this.targetTableHandles.push(
            dojo.connect(node, "onclick", this, function () {
              this.onTargetPlayerSelected(player_id);
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
        const node = dojo.byId("playertable_" + player_id);
        if (node) dojo.removeClass(node, "selectable_target");
      });
    },

    cancelPendingActionSelection: function () {
      this.pendingAction = null;
      this.clearTargetSelection();
      this.playerActionCards.unselectAll();
      if (this.playerActionCards.setSelectionMode) {
        this.playerActionCards.setSelectionMode(1);
      }
      this.restoreServerGameState();
    },

    onTargetPlayerSelected: function (targetPlayerId) {
      if (!this.pendingAction) return;

      const cardKey = this.pendingAction.cardKey;
      if (cardKey === "witch_hunt") {
        this.pendingAction.targetPlayerId = targetPlayerId;
        this.clearTargetSelection();
        this.clearPossibleActions();
        for (let believerType = 1; believerType <= 5; believerType++) {
          this.addActionButton(
            "witchHuntType_" + believerType,
            _("Type ") + believerType,
            function () {
              this.playPendingAction({
                target_id: targetPlayerId,
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
        this.showMessage(_("Choose the Believer type to hunt"), "info");
        return;
      }

      this.playPendingAction({ target_id: targetPlayerId });
    },

    playPendingAction: function (extraArgs) {
      if (!this.pendingAction) return;
      const args = Object.assign({ id: this.pendingAction.cardId }, extraArgs || {});
      this.clearTargetSelection();
      this.ajaxAction("playActionCard", args, function () {
        this.pendingAction = null;
        if (this.playerActionCards.setSelectionMode) {
          this.playerActionCards.setSelectionMode(1);
        }
        this.restoreServerGameState();
      });
    },

    // --- Action Handlers ---

    onPlayerActionCardsSelectionChanged: function () {
      const items = this.playerActionCards.getSelectedItems();
      if (items.length <= 0) {
        return;
      }

      if (this.pendingAction && this.pendingAction.cardKey === "divine_inspire") {
        return;
      }

      if (!this.checkAction("playActionCard")) {
        this.playerActionCards.unselectAll();
        return;
      }

      const card = items[0];
      const card_key = this.getActionCardKeyName(card.type);
      const targeted_cards = [
        "witch_hunt",
        "faith_war",
        "spread_rumors",
        "info_spy",
      ];

      if (card_key === "divine_inspire") {
        this.beginDivineInspireSelection(card);
        return;
      }

      if (targeted_cards.includes(card_key)) {
        this.beginTargetSelection(card);
        return;
      }

      this.ajaxAction("playActionCard", { id: card.id }, function () {
        this.playerActionCards.unselectAll();
      });
    },

    onPlayerBelieverSelectionChanged: function () {
      const items = this.playerBelieverCards.getSelectedItems();
    },

    onConfirmDivineInspireClicked: function () {
      if (!this.pendingAction || this.pendingAction.cardKey !== "divine_inspire") {
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
        this.showMessage(_("Select at least one other Action card to discard"), "error");
        return;
      }

      this.ajaxAction(
        "playActionCard",
        {
          id: this.pendingAction.cardId,
          card_ids: discardIds.join(";"),
        },
        function () {
          this.pendingAction = null;
          this.playerActionCards.unselectAll();
          if (this.playerActionCards.setSelectionMode) {
            this.playerActionCards.setSelectionMode(1);
          }
          this.restoreServerGameState();
        }
      );
    },

    onConfirmBelieverClicked: function () {
      const items = this.playerBelieverCards.getSelectedItems();
      if (items.length !== 1) {
        this.showMessage(_("Please select exactly one believer card"), "error");
        return;
      }

      if (this.checkAction("playBelieverCard")) {
        const card_id = items[0].id;
        this.ajaxAction("playBelieverCard", { id: card_id });
      }
    },

    onEndTurnButtonClicked: function () {
      if (this.checkAction("endTurn")) {
        this.ajaxAction("endTurn", {});
      }
    },

    onSurrenderButtonClicked: function () {
      if (this.checkAction("surrender")) {
        let leader_id = Object.keys(this.gamedatas.players).find(
          (id) => id != this.player_id
        );
        this.ajaxAction("surrender", { leader_id: leader_id });
      }
    },

    onBecomeWandererButtonClicked: function () {
      if (this.checkAction("becomeWanderer")) {
        this.ajaxAction("becomeWanderer", {});
      }
    },

    // --- Notifications ---
    setupNotifications: function () {
      console.log("notifications subscriptions setup");
      
      dojo.subscribe('actionCardPlayed', this, "notif_actionCardPlayed");
      dojo.subscribe('haveACharity', this, "notif_haveACharity");
      dojo.subscribe('newBelievers', this, "notif_newBelievers");
      dojo.subscribe('spyResult', this, "notif_spyResult");
      dojo.subscribe('believerStolen', this, "notif_believerStolen");
      dojo.subscribe('believersDiscarded', this, "notif_believersDiscarded");
      dojo.subscribe('spreadRumors', this, "notif_spreadRumors");
      dojo.subscribe('spreadRumorsSummary', this, "notif_spreadRumorsSummary");
      dojo.subscribe('faithWarStart', this, "notif_faithWarStart");
      dojo.subscribe('duelResult', this, "notif_duelResult");
      dojo.subscribe('duelBonus', this, "notif_duelBonus");
      dojo.subscribe('faithWarEnd', this, "notif_faithWarEnd");
      
      if (this.notifqueue != null) {
          this.notifqueue.setSynchronous('actionCardPlayed', 800);
          this.notifqueue.setSynchronous('newBelievers', 1000);
      }
    },

    notif_actionCardPlayed: function (notif) {
        let card_id = notif.args.card_id;
        let p_id = notif.args.player_id;
        let card_type = notif.args.card_type; // string key like 'have_a_charity'

        // 1. Remove card from player hand if it's the active player
        if (p_id == this.player_id) {
            this.playerActionCards.removeFromStockById(card_id);
        }

        // 2. Reduce the hand count on the tabletop
        let countElem = dojo.byId('table_action_count_' + p_id);
        if (countElem) {
            countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - 1);
        }

        // 3. Create a physical card in the Central Arena for everyone to see!
        let sprite_offset = this.getActionCardSpriteIndex(card_type);
        
        // Setup BGA standard slide animation
        let card_html = `<div id="arena_action_${card_id}" class="card table_card_item" style="width:108px; height:150px; background-image:url('${g_gamethemeurl}img/action_cards_en.png'); background-size:400% 400%; background-position:${(sprite_offset % 4) * 33.333333}% ${Math.floor(sprite_offset / 4) * 33.333333}%; border-radius:10px; box-shadow: 2px 2px 5px rgba(0,0,0,0.5);"></div>`;
        
        dojo.place(card_html, 'central_arena');
        
        // Attempt to slide it from the player's table panel to the arena
        let source_id = 'playertable_' + p_id;
        this.placeOnObject("arena_action_" + card_id, source_id); // Instant warp to source
        this.slideToObject("arena_action_" + card_id, 'central_arena', 800).play(); // Slide home
    },

    notif_haveACharity: function (notif) {
        // Find the deck count and deduct 2
        let current_count = parseInt(dojo.byId('believer_deck_count').innerHTML);
        dojo.byId('believer_deck_count').innerHTML = Math.max(0, current_count - 2);

        // For other players, their hand count increases visually
        if (notif.args.player_id != this.player_id) {
            let countElem = dojo.byId('table_believer_count_' + notif.args.player_id);
            if (countElem) {
                countElem.innerHTML = parseInt(countElem.innerHTML) + 2;
            }
        }
    },

    notif_newBelievers: function (notif) {
        for (let i in notif.args.cards) {
            let card = notif.args.cards[i];
            this.playerBelieverCards.addToStockWithId(card.type, card.id, "believer_deck");
        }
        
        let countElem = dojo.byId('table_believer_count_' + this.player_id);
        if (countElem) {
            countElem.innerHTML = parseInt(countElem.innerHTML) + notif.args.cards.length;
        }
    },

    notif_spyResult: function (notif) {
        const actionCount = notif.args.action_cards ? notif.args.action_cards.length : 0;
        const believerCount = notif.args.believer_cards ? notif.args.believer_cards.length : 0;
        this.showMessage(
          _("Info-Spy on ") + notif.args.target_name + ": " +
          actionCount + _(" Action cards, ") + believerCount + _(" Believers"),
          "info"
        );
        window.alert(
          notif.args.target_name + "\n" +
          "Action cards: " + actionCount + "\n" +
          "Believers: " + believerCount
        );
    },

    notif_believerStolen: function (notif) {
        this.playerBelieverCards.removeFromStockById(notif.args.card_id);
        let countElem = dojo.byId('table_believer_count_' + this.player_id);
        if (countElem) {
            countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - 1);
        }
    },

    notif_believersDiscarded: function (notif) {
        if (notif.args.card_ids) {
          notif.args.card_ids.forEach(function(card_id) {
            this.playerBelieverCards.removeFromStockById(card_id);
          }.bind(this));
        }
        let countElem = dojo.byId('table_believer_count_' + this.player_id);
        if (countElem) {
            countElem.innerHTML = Math.max(0, parseInt(countElem.innerHTML) - (notif.args.count || 0));
        }
    },

    notif_spreadRumors: function (notif) {
        if (notif.args.victim_id) {
          let victimElem = dojo.byId('table_believer_count_' + notif.args.victim_id);
          if (victimElem) {
            victimElem.innerHTML = Math.max(0, parseInt(victimElem.innerHTML) - 1);
          }
        }
    },

    notif_spreadRumorsSummary: function (notif) {
        if (notif.args.player_id) {
          let attackerElem = dojo.byId('table_believer_count_' + notif.args.player_id);
          if (attackerElem) {
            attackerElem.innerHTML = parseInt(attackerElem.innerHTML) + (notif.args.stolen_total || 0);
          }
        }
    },

    notif_faithWarStart: function (notif) {
        dojo.byId('central_arena').innerHTML = '<div class="faith-war-banner">Faith War!</div>';
    },

    notif_duelResult: function (notif) {
        this.playerBelieverCards.unselectAll();
        let arena = dojo.byId('central_arena');
        if (arena) {
          arena.innerHTML = '<div class="faith-war-banner">Duel resolved</div>';
        }
    },

    notif_duelBonus: function (notif) {
        this.showMessage(_("War Bonus awarded"), 'info');
    },

    notif_faithWarEnd: function (notif) {
        let arena = dojo.byId('central_arena');
        if (arena) {
          arena.innerHTML = '<div class="faith-war-banner">Faith War Ended</div>';
        }
        dojo.removeClass('mybelievercards', 'highlight_stock');
    }
  });
});
