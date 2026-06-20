<?php

namespace {

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
 * modules/php/Game.php
 *
 * This is the main file for your game logic.
 *
 * In this PHP file, you are going to defines the rules of the game.
 *
 */


use Bga\GameFramework\Table;

class HegemonyOfFaith extends Table
{
  private $action_cards, $believer_cards;

  // see material.inc.php
  protected $type_arg_labels, $type_labels, $action_cards_count, $skill_labels;

  private const ACTION_BIT_DISCARD = 0b0001;
  private const ACTION_BIT_MENTAL = 0b0010;
  private const ACTION_BIT_PHYSICAL = 0b0100;
  private const ACTION_BIT_STRATEGY = 0b1000;
  private const ACTION_BITS_ALL = 0b1111;
  private const ACTION_BITS_NON_DISCARD = 0b1110;
  private const BOT_MODE_ZOMBIE = 'zombie';
  private const BOT_MODE_PRACTICE_AI = 'practice_ai';

  // >0 while a bot/practice-AI turn is executing. Practice-AI actions arrive as
  // an AJAX from a human client, so getCurrentPlayerId() is that human, not the
  // AI seat — session-bound guards must treat the call as a bot action instead
  // of throwing "It is not your turn." Nesting-safe counter.
  private int $bot_automation_depth = 0;

  // Single source of truth for bot pacing. Client honors delay_ms from
  // practiceAiStepRequested / botThinking notifications, so every bot wait
  // (practice AI step gap and zombie thinking pause) is tuned here only.
  private const BOT_STEP_DELAY_MS_DEFAULT = 800;
  private const BOT_STEP_DELAY_MS_BY_STATE = [
    'playerTurn' => 900,
    // Defense passes/plays resolve fast: a slow AI here reads as a frozen
    // table to the attacker (AOE notifications are anonymous, so speed
    // does not leak who actually held a defense card).
    'confirmDefense' => 250,
    'faithWarDuel' => 1000,
    'faithDebateDuel' => 1000,
    'chooseWarRepresentative' => 1200,
    'chooseFaithDebateRepresentative' => 1200,
    'martyrdomChooseRepresentative' => 1200,
    'conspiracyChooseRepresentative' => 1200,
    'martyrdomChooseBelievers' => 1000,
    'conspiracyChooseBelievers' => 1000,
  ];
  private const BOT_THINKING_MS_DEFAULT = 650;
  private const BOT_THINKING_MS_BY_STATE = [
    'playerTurn' => 1100,
    'discardingActionCard' => 800,
    'confirmDefense' => 300,
    'faithWarDuel' => 1000,
    'faithDebateDuel' => 1000,
    'chooseWarRepresentative' => 1100,
    'chooseFaithDebateRepresentative' => 1100,
    'martyrdomChooseRepresentative' => 1100,
    'conspiracyChooseRepresentative' => 1100,
    'martyrdomChooseBelievers' => 1000,
    'conspiracyChooseBelievers' => 1000,
  ];

  function __construct()
  {
    // Your global variables labels:
    //  Here, you can assign labels to global variables you are using for this game.
    //  You can use any number of global variables with IDs between 10 and 99.
    //  If your game has options (variants), you also have to associate here a label to
    //  the corresponding ID in gameoptions.inc.php.
    // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
    parent::__construct();

    $this->game_materials = include(__DIR__ . '/../../material.inc.php');  // Load game materials

    self::initGameStateLabels(array(
      // 0b0000 denotes none of 'strategy', 'physical', 'mental', or 'discard' has been performed
      "performedActions" => 10,
      "actions_performed_count" => 11, // Track number of actions (0, 1, 2)
      "war_reverse_karma_stack_owner_a" => 12,
      "war_reverse_karma_stack_owner_b" => 13,
      "war_zombie_snapshot_max_discard_arg" => 14,
      "turn_owner_player_id" => 15,
      "initial_believer_deck_count" => 16,
      "final_duel_player_a_id" => 17,
      "final_duel_player_b_id" => 18,
      "final_duel_pre_counts_pack" => 19,
      "final_struggle_contender_mask" => 100,
      "final_struggle_pre_counts_pack_1" => 101,
      "final_struggle_pre_counts_pack_2" => 102,
      "practice_ai_player_mask" => 103,
      "practice_ai_request_token" => 104,

      // Combat Globals
      "war_attacker_id" => 20,
      "war_defender_id" => 21,
      "war_card_attacker" => 22, // ID of believer card played by attacker
      "war_card_defender" => 23, // ID of believer card played by defender
      "war_type" => 24, // 1=FaithWar, 2=Debate, 3=Martyrdom...
      "follower_id_waiting" => 25, // Follower waiting to receive a believer
      "war_attack_blocked" => 26,
      "war_rep_attacker_id" => 27,
      "war_rep_defender_id" => 28,
      "debate_round" => 29,
      "secret_alliance_attacker_id" => 30,
      "secret_alliance_target_id" => 31,
      "secret_alliance_attacker_card_id" => 32,
      "breaking_faith_defended" => 33,
      "surrender_bankrupt_id" => 34,
      "surrender_target_leader_id" => 35,
      "surrender_reject_mask" => 36,
      "surrender_support_mode" => 37,
      "karboom_turn_used_mask" => 38,
      "karboom_attack_lock_mask" => 39,
      "extra_action_slots" => 40,
      "skill_revealed_mask" => 41,
      "praise_life_turn_used_mask" => 42,
      "skill_physical_protect_mask" => 43,
      "skill_mental_protect_mask" => 44,
      "skip_turn_counter_pack" => 45,
      "prophet_pending_drawer_id" => 46,
      "prophet_pending_draw_count" => 47,
      "prophet_pending_source" => 48,
      "prophet_pending_prophet_id" => 49,
      "prophet_pending_guess_type" => 50,
      "prophet_pending_extra" => 51,
      "holy_rebirth_turn_used_mask" => 52,
      "holy_rebirth_pending_player_id" => 53,
      "holy_rebirth_pending_deaths" => 54,
      "holy_rebirth_pending_source" => 55,
      "holy_rebirth_pending_resume_player" => 56,
      "holy_rebirth_pending_resume_mode" => 57,
      "holy_rebirth_pending_use" => 58,
      "holy_rebirth_pending_card_1" => 87,
      "holy_rebirth_pending_card_2" => 88,
      "holy_rebirth_pending_card_3" => 89,
      "war_death_counter_pack" => 59,
      "praise_life_decision_player_id" => 60,
      "reverse_karma_pending_player_id" => 61,
      "reverse_karma_pending_war_type" => 62,
      "reverse_karma_pending_resume_mode" => 63,
      "reverse_karma_pending_use" => 64,
      "war_reverse_karma_checked" => 65,
      "war_reverse_karma_active" => 66,
      "war_reverse_karma_owner_id" => 67,
      "war_zombie_owner_id" => 68,
      "war_card_source_flags" => 69,
      "reverse_karma_pending_resume_player" => 70,
      "impermanence_showcase_player_id" => 71,
      "game_end_winner_id" => 72,
      "game_end_reason_code" => 73,
      "aoe_defended_sect_mask" => 74,
      "debate_stop_requested" => 75,
      "surrender_prev_role" => 76,
      "surrender_prev_leader_id" => 77,
      "surrender_prev_sect" => 78,
      "surrender_prev_skill_sealed" => 79,
      "surrender_prev_snapshot_ready" => 80,
      "forced_next_turn_anchor_id" => 81,
      "purple_hermit_ready_mask" => 82,
      "purple_hermit_pending_split_mask" => 83,
      "info_spy_pending_player_id" => 84,
      "war_participant_mask" => 85,
      "secret_alliance_target_card_id" => 86,
      "gate_truth_copied_skill_type" => 92,
      "gate_truth_copied_source_player_id" => 93,
      "gate_truth_turn_used_mask" => 94,
      "gate_truth_copied_skill_mask" => 95,
      "prophet_pending_primary_player_id" => 96,
      "prophet_pending_secondary_player_id" => 97,
      "prophet_pending_primary_guess_type" => 98,
      "prophet_pending_secondary_guess_type" => 99,
      "debate_stop_requester_id" => 90,
      "debate_stop_leader_id" => 91
    ));

    $this->action_cards = $this->bga->deckFactory->createDeck("action_cards");
    $this->action_cards->init("action_cards");

    $this->believer_cards = $this->bga->deckFactory->createDeck("believer_cards");
    $this->believer_cards->init("believer_cards");

    $this->skill_cards = $this->bga->deckFactory->createDeck("skill_cards");
    $this->skill_cards->init("skill_cards");
  }

  private function enrichI18nArgs(array $args): array
  {
    $whitelist = [
      'combat_name',
      'card_name',
      'skill_name',
      'source_name',
      'type_name',
      'type',
      'guess_type_name',
      'revealed_type_name',
      'winner_card',
      'loser_card',
      'attacker_card',
      'defender_card',
      'attacker_sect_name',
      'defender_sect_name',
      'target_sect_name',
      'sect_a_name',
      'sect_b_name',
      'reason_text'
    ];

    $existing = [];
    if (isset($args['i18n']) && is_array($args['i18n'])) {
      $existing = array_values(array_map('strval', $args['i18n']));
    }
    $merged = $existing;
    foreach ($whitelist as $key) {
      if (!array_key_exists($key, $args)) continue;
      if (is_string($args[$key]) || is_array($args[$key])) {
        $merged[] = (string) $key;
      }
    }
    $merged = array_values(array_unique(array_map('strval', $merged)));
    if (!empty($merged)) {
      $args['i18n'] = $merged;
    }
    return $args;
  }

  private function notifyAllPlayersTr(string $event, string $log, array $args = []): void
  {
    self::notifyAllPlayers($event, $log, $this->enrichI18nArgs($args));
  }

  private function notifyPlayerTr(int $player_id, string $event, string $log, array $args = []): void
  {
    self::notifyPlayer($player_id, $event, $log, $this->enrichI18nArgs($args));
  }

  private function buildAoeVisualBelieverCards(array $cards, int $attacker_card_id = 0): array
  {
    return array_values(array_map(function ($card) use ($attacker_card_id) {
      $owner_id = (int) ($card['location_arg'] ?? 0);
      return [
        'card_id' => (int) ($card['id'] ?? 0),
        'card_type' => (int) ($card['type'] ?? 0),
        'owner_id' => $owner_id,
        'owner_name' => $owner_id > 0 ? self::getPlayerNameById($owner_id) : '',
        'sect_id' => $owner_id > 0 ? (int) $this->getPlayerSect($owner_id) : -1,
        'is_attacker_representative' => ((int) ($card['id'] ?? 0) === (int) $attacker_card_id) ? 1 : 0
      ];
    }, $cards));
  }



  /*
        setupNewGame:
        
        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
  protected function setupNewGame($players, $options = array())
  {
    $setup_stage = 'boot';
    try {
    // Set the colors of the players with HTML color code
    // The default below is red/green/blue/orange/brown
    // The number of colors defined here must correspond to the maximum number of players allowed for the gams
    $setup_stage = 'gameinfos';
    $gameinfos = self::getGameinfos();
    $default_colors = $gameinfos['player_colors'];

    // Create players
    // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
    // $players = self::getCollectionFromDb($sql);
    $setup_stage = 'create_players';
    $values = array();
    $sect_pool = range(1, 8);
    shuffle($sect_pool);
    foreach ($players as $player_id => $player) {
      $color = array_shift($default_colors);
      $player_canal = $player['player_canal'];
      $player_name = addslashes($player['player_name']);
      $player_avatar = addslashes($player['player_avatar']);
      $player_sect = (int) array_shift($sect_pool);
      $values[] = "('$player_id','$color','0','$player_sect','$player_canal','$player_name','$player_avatar')";
    }
    $sql = "INSERT INTO player (player_id, player_color, player_role, player_sect, player_canal, player_name, player_avatar) VALUES " . implode(',', $values);
    self::DbQuery($sql);
    self::reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);

    // --- Practice AI: auto-fill an under-filled table with bot seats ---
    // The real game is 4 humans. Fewer than 4 humans is inherently a
    // practice/test table, so it is ALWAYS filled with practice-AI bots up to
    // 4 (no option needed). 4+ humans = a normal real game, never filled.
    // Bot player_ids are (max real id + i) so they stay unique within this
    // table; player_no continues after the humans; bots have no notification
    // channel (empty player_canal). All seats read from the player table, so
    // getAllDatas / loadPlayersBasicInfos / turn order include them
    // automatically. (BGA has no native bot API — this is the standard custom
    // fake-player approach, which is why an under-filled table shows BGA's
    // "player count not coherent" warning; acceptable for practice/testing.)
    $bot_player_ids = array();
    $human_count = count($players);
    $target_seats = 4;
    if ($human_count < $target_seats) {
      $real_ids = array_map('intval', array_keys($players));
      $next_bot_id = (empty($real_ids) ? 0 : max($real_ids)) + 1;
      $next_player_no = $human_count + 1;
      $bot_values = array();
      for ($i = 1; $i <= ($target_seats - $human_count); $i++) {
        $bot_id = (int) $next_bot_id++;
        $bot_color = array_shift($default_colors);
        $bot_sect = (int) array_shift($sect_pool);
        $bot_name = addslashes('AI ' . $i);
        $bot_player_no = (int) $next_player_no++;
        $bot_values[] = "('$bot_id','$bot_color','0','$bot_sect','','$bot_name','','$bot_player_no')";
        $bot_player_ids[] = (int) $bot_id;
      }
      if (!empty($bot_values)) {
        self::DbQuery(
          "INSERT INTO player (player_id, player_color, player_role, player_sect, player_canal, player_name, player_avatar, player_no) VALUES " . implode(',', $bot_values)
        );
      }
    }

    self::reloadPlayersBasicInfos();

    /************ Start the game initialization *****/

    // Init global values with their initial values
    $setup_stage = 'init_globals';

    // Set current performed actions to init val (= no perfomed action)
    self::setGameStateInitialValue('performedActions', 0b0000);
    self::setGameStateInitialValue('actions_performed_count', 0);
    self::setGameStateInitialValue('war_reverse_karma_stack_owner_a', 0);
    self::setGameStateInitialValue('war_reverse_karma_stack_owner_b', 0);
    self::setGameStateInitialValue('war_zombie_snapshot_max_discard_arg', 0);
    self::setGameStateInitialValue('turn_owner_player_id', 0);
    self::setGameStateInitialValue('initial_believer_deck_count', 0);
    self::setGameStateInitialValue('final_duel_player_a_id', 0);
    self::setGameStateInitialValue('final_duel_player_b_id', 0);
    self::setGameStateInitialValue('final_duel_pre_counts_pack', 0);
    self::setGameStateInitialValue('final_struggle_contender_mask', 0);
    self::setGameStateInitialValue('final_struggle_pre_counts_pack_1', 0);
    self::setGameStateInitialValue('final_struggle_pre_counts_pack_2', 0);
    // The bot seats that filled an under-filled table are the practice-AI
    // players (4 real humans = a normal game with no AI).
    $initial_practice_ai_mask = 0;
    foreach ($bot_player_ids as $bot_id) {
      $bit = $this->getPlayerBit((int) $bot_id);
      if ($bit > 0) {
        $initial_practice_ai_mask |= (int) $bit;
      }
    }
    self::setGameStateInitialValue('practice_ai_player_mask', (int) $initial_practice_ai_mask);
    self::setGameStateInitialValue('practice_ai_request_token', 0);
    self::setGameStateInitialValue('war_attack_blocked', 0);
    self::setGameStateInitialValue('war_rep_attacker_id', 0);
    self::setGameStateInitialValue('war_rep_defender_id', 0);
    self::setGameStateInitialValue('debate_round', 0);
    self::setGameStateInitialValue('secret_alliance_attacker_id', 0);
    self::setGameStateInitialValue('secret_alliance_target_id', 0);
    self::setGameStateInitialValue('secret_alliance_attacker_card_id', 0);
    self::setGameStateInitialValue('secret_alliance_target_card_id', 0);
    self::setGameStateInitialValue('breaking_faith_defended', 0);
    self::setGameStateInitialValue('surrender_bankrupt_id', 0);
    self::setGameStateInitialValue('surrender_target_leader_id', 0);
    self::setGameStateInitialValue('surrender_reject_mask', 0);
    self::setGameStateInitialValue('surrender_support_mode', 0);
    self::setGameStateInitialValue('forced_next_turn_anchor_id', 0);
    self::setGameStateInitialValue('karboom_turn_used_mask', 0);
    self::setGameStateInitialValue('karboom_attack_lock_mask', 0);
    self::setGameStateInitialValue('extra_action_slots', 0);
    self::setGameStateInitialValue('skill_revealed_mask', 0);
    self::setGameStateInitialValue('praise_life_turn_used_mask', 0);
    self::setGameStateInitialValue('skill_physical_protect_mask', 0);
    self::setGameStateInitialValue('skill_mental_protect_mask', 0);
    self::setGameStateInitialValue('skip_turn_counter_pack', 0);
    self::setGameStateInitialValue('prophet_pending_drawer_id', 0);
    self::setGameStateInitialValue('prophet_pending_draw_count', 0);
    self::setGameStateInitialValue('prophet_pending_source', 0);
    self::setGameStateInitialValue('prophet_pending_prophet_id', 0);
    self::setGameStateInitialValue('prophet_pending_guess_type', 0);
    self::setGameStateInitialValue('prophet_pending_extra', 0);
    self::setGameStateInitialValue('holy_rebirth_turn_used_mask', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_player_id', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_deaths', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_source', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_resume_player', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_resume_mode', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_use', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_card_1', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_card_2', 0);
    self::setGameStateInitialValue('holy_rebirth_pending_card_3', 0);
    self::setGameStateInitialValue('war_death_counter_pack', 0);
    self::setGameStateInitialValue('praise_life_decision_player_id', 0);
    self::setGameStateInitialValue('reverse_karma_pending_player_id', 0);
    self::setGameStateInitialValue('reverse_karma_pending_war_type', 0);
    self::setGameStateInitialValue('reverse_karma_pending_resume_mode', 0);
    self::setGameStateInitialValue('reverse_karma_pending_use', 0);
    self::setGameStateInitialValue('war_reverse_karma_checked', 0);
    self::setGameStateInitialValue('war_reverse_karma_active', 0);
    self::setGameStateInitialValue('war_reverse_karma_owner_id', 0);
    self::setGameStateInitialValue('war_zombie_owner_id', 0);
    self::setGameStateInitialValue('war_card_source_flags', 0);
    self::setGameStateInitialValue('reverse_karma_pending_resume_player', 0);
    self::setGameStateInitialValue('impermanence_showcase_player_id', 0);
    self::setGameStateInitialValue('game_end_winner_id', 0);
    self::setGameStateInitialValue('game_end_reason_code', 0);
    self::setGameStateInitialValue('aoe_defended_sect_mask', 0);
    self::setGameStateInitialValue('debate_stop_requested', 0);
    self::setGameStateInitialValue('surrender_prev_role', 0);
    self::setGameStateInitialValue('surrender_prev_leader_id', 0);
    self::setGameStateInitialValue('surrender_prev_sect', 0);
    self::setGameStateInitialValue('surrender_prev_skill_sealed', 0);
    self::setGameStateInitialValue('surrender_prev_snapshot_ready', 0);
    self::setGameStateInitialValue('purple_hermit_ready_mask', 0);
    self::setGameStateInitialValue('purple_hermit_pending_split_mask', 0);
    self::setGameStateInitialValue('info_spy_pending_player_id', 0);
    self::setGameStateInitialValue('war_participant_mask', 0);
    self::setGameStateInitialValue('gate_truth_copied_skill_type', 0);
    self::setGameStateInitialValue('gate_truth_copied_source_player_id', 0);
    self::setGameStateInitialValue('gate_truth_turn_used_mask', 0);
    self::setGameStateInitialValue('gate_truth_copied_skill_mask', 0);
    self::setGameStateInitialValue('prophet_pending_primary_player_id', 0);
    self::setGameStateInitialValue('prophet_pending_secondary_player_id', 0);
    self::setGameStateInitialValue('prophet_pending_primary_guess_type', 0);
    self::setGameStateInitialValue('prophet_pending_secondary_guess_type', 0);
    self::setGameStateInitialValue('debate_stop_requester_id', 0);
    self::setGameStateInitialValue('debate_stop_leader_id', 0);

    // Initialize BGA stats.
    $setup_stage = 'init_stats';
    $this->initStat('table', 'turns_number', 0);
    $this->initStat('table', 'faith_wars_started', 0);
    $this->initStat('table', 'faith_debates_started', 0);
    $this->initStat('table', 'skills_used', 0);
    $this->initStat('table', 'final_struggles_started', 0);

    $this->initStat('player', 'turns_played', 0);
    $this->initStat('player', 'faith_wars_declared', 0);
    $this->initStat('player', 'faith_debates_declared', 0);
    $this->initStat('player', 'defense_cards_played', 0);
    $this->initStat('player', 'skills_used', 0);
    $this->initStat('player', 'believers_endgame', 0);

    // Create action cards
    $setup_stage = 'create_action_deck';
    $action_cards = array();
    foreach ($this->action_cards_count as $type => $info)
      $action_cards[] = array('type' => $type, 'type_arg' => $info['type_arg'], 'nbr' => $info['nbr']);

    $this->action_cards->createCards($action_cards, 'deck');

    // Create believer cards
    $setup_stage = 'create_believer_deck';
    // Option 100: total Believer cards.
    // 1 = recommended by player count, 2..7 = fixed total (30..80).
    // Count ALL seats (humans + AI-filled bots), not just the humans, so the
    // deck is sized for the real table size.
    $all_player_ids = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
    $player_count = count($all_player_ids);
    $recommended_total_believers = ($player_count <= 4) ? 30 : (($player_count <= 6) ? 45 : 60);
    // Prevent custom totals that are too small to keep larger-player tables playable.
    $minimum_custom_total_believers = ($player_count <= 4) ? 30 : (($player_count <= 6) ? 50 : 60);
    $option_to_total_believers = [
      2 => 30,
      3 => 40,
      4 => 50,
      5 => 60,
      6 => 70,
      7 => 80
    ];
    $believer_total_option = 1;
    if (isset($options[100])) {
      $believer_total_option = (int) $options[100];
    } elseif (isset($options['100'])) {
      $believer_total_option = (int) $options['100'];
    }
    $total_believers = (int) $recommended_total_believers;
    if ($believer_total_option !== 1 && isset($option_to_total_believers[$believer_total_option])) {
      $total_believers = (int) $option_to_total_believers[$believer_total_option];
      if ($total_believers < $minimum_custom_total_believers) {
        $total_believers = (int) $minimum_custom_total_believers;
      }
    }
    // Believers are always distributed evenly across 5 types.
    if ($total_believers % 5 !== 0) {
      $total_believers = max(5, (int) (floor($total_believers / 5) * 5));
    }
    $believers_per_type = max(1, (int) ($total_believers / 5));

    $believer_cards = array();
    for ($value = 1; $value < 6; $value++)
      // Fool, Prayer, Missionary, Elder, Fanatic
      $believer_cards[] = array('type' => $value, 'type_arg' => 0b10000, 'nbr' => $believers_per_type);

    $this->believer_cards->createCards($believer_cards, 'deck');

    // Create skill cards (1 copy each), then deal 2 starting options to each player.
    $setup_stage = 'create_skill_deck';
    $skill_cards = array();
    foreach ($this->skill_labels as $skill_id => $label) {
      $skill_cards[] = array('type' => (int) $skill_id, 'type_arg' => 0, 'nbr' => 1);
    }
    $this->skill_cards->createCards($skill_cards, 'deck');

    $this->action_cards->shuffle('deck');
    $this->believer_cards->shuffle('deck');
    $this->skill_cards->shuffle('deck');

    $setup_stage = 'deal_opening_hands';
    // Deal to ALL seats (humans + AI-filled bots).
    foreach ($all_player_ids as $player_id) {
      $this->action_cards->pickCards(6, 'deck', $player_id);
      $this->believer_cards->pickCards(3, 'deck', $player_id);
      $this->skill_cards->pickCards(1, 'deck', $player_id);
    }

    self::setGameStateValue('initial_believer_deck_count', (int) $this->believer_cards->countCardInLocation('deck'));

    // Activate first player
    $setup_stage = 'activate_first_player';
    $this->activeNextPlayer();
    $first_player_id = (int) self::getActivePlayerId();
    if ($first_player_id > 0) {
      self::setGameStateValue('turn_owner_player_id', (int) $first_player_id);
      $this->incStat(1, 'turns_number');
      $this->incStat(1, 'turns_played', (int) $first_player_id);
    }

    /************ End of the game initialization *****/

    return 2;
    } catch (\Throwable $e) {
      throw new \Exception(sprintf(clienttranslate('Setup failed at [%s]: %s'), (string) $setup_stage, (string) $e->getMessage()));
    }
  }

  /*
        getAllDatas: 
        
        Gather all informations about current game situation (visible by the current player).
        
        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)
    */
  protected function getAllDatas()
  {
    $result = array();

    $current_player_id = self::getCurrentPlayerId();    // !! We must only return informations visible by this player !!

    // Get information about players
    $sql = "SELECT player_id id, player_score score, player_role, player_sect, player_leader_id, player_is_skill_sealed, player_wanderer_turns, player_name, player_color FROM player ";
    $result['players'] = self::getCollectionFromDb($sql);

    foreach ($result['players'] as $player_id => &$player) {
      $player['believer_count'] = $this->believer_cards->countCardInLocation('hand', $player_id);
      $player['action_count'] = $this->action_cards->countCardInLocation('hand', $player_id);
      $player['player_skip_turn_count'] = (int) $this->getSkipTurnCounter((int) $player_id);
    }

    // Action cards const
    $result['const']['actioncards'] = $this->action_cards_count;

    // Player action cards
    $result['actioncards'] = $this->action_cards->getCardsInLocation('hand', $current_player_id);

    // Action draw pile
    $result['actiondrawpile'] = $this->action_cards->getCardsInLocation('deck');

    // Action discard pile
    $result['actiondiscardpile'] = $this->action_cards->getCardsInLocation('discard');

    // Player believer cards
    $result['believercards'] = $this->believer_cards->getCardsInLocation('hand', $current_player_id);
    $result['skillcards'] = $this->skill_cards->getCardsInLocation('hand', $current_player_id);
    $result['const']['skill_labels'] = $this->skill_labels;

    $result['player_skills'] = array();
    $result['player_skills_revealed'] = array();
    $result['player_skill_public_state'] = array();
    foreach ($result['players'] as $player_id => &$player) {
      $player_skill_cards = array_values($this->skill_cards->getCardsInLocation('hand', (int) $player_id));
      $is_self = ((int) $player_id === (int) $current_player_id);
      $revealed = $this->isSkillRevealed((int) $player_id);
      $visible = $is_self || $revealed;
      $result['player_skills_revealed'][$player_id] = $visible ? 1 : 0;
      $result['player_skills'][$player_id] = ($visible && !empty($player_skill_cards)) ? $player_skill_cards[0] : null;
      $result['player_skill_public_state'][$player_id] = null;
      if ($visible && !empty($player_skill_cards)) {
        $skill_type = (int) $player_skill_cards[0]['type'];
        if ($is_self) {
          $state = $this->getSkillStateForPlayer((int) $player_id);
        } else {
          $uses = (int) $this->getSkillUseCountFromCard($player_skill_cards[0]);
          $state = [
            'skill_type' => (int) $skill_type,
            'uses' => (int) $uses,
            'action_hand_limit' => (int) $this->getActionHandLimitForPlayer((int) $player_id),
            'purple_hermit_ready' => 0,
            'purple_hermit_pending_split' => 0
          ];
          if ((int) $skill_type === 1) {
            $state['purple_hermit_ready'] = $this->isPurpleHermitReady((int) $player_id) ? 1 : 0;
            $state['purple_hermit_pending_split'] = $this->isPurpleHermitPendingSplit((int) $player_id) ? 1 : 0;
          }
          if ((int) $skill_type === 9) {
            $state['gate_truth_copied_skill_type'] = (int) $this->getGateTruthCopiedSkillTypeForPlayer((int) $player_id);
            $state['gate_truth_copied_source_player_id'] = (int) $this->getGateTruthCopiedSourcePlayerIdForPlayer((int) $player_id);
            $state['gate_truth_copied_skill_types'] = $this->getGateTruthCopiedSkillTypeList();
          }
        }
        $cap = (int) $this->getSkillUsageCap((int) $skill_type);
        $uses_now = (int) ($state['uses'] ?? 0);
        $state['usage_cap'] = (int) $cap;
        $state['exhausted'] = ($cap > 0 && $uses_now >= $cap) ? 1 : 0;
        $result['player_skill_public_state'][$player_id] = $state;
      }
    }

    // Cards played on the table
    $result['cardsontable'] = $this->action_cards->getCardsInLocation('cardsontable');
    $result['believersontable'] = array_values($this->believer_cards->getCardsInLocation('cardsontable'));
    $result['combat_context'] = $this->getCombatContextSnapshot();
    $result['initial_skill_choices'] = $this->getInitialSkillChoicesForPlayer((int) $current_player_id);

    // Counts for UI decks
    $result['action_deck_count'] = $this->action_cards->countCardInLocation('deck');
    $result['believer_deck_count'] = $this->believer_cards->countCardInLocation('deck');
    $result['graveyard_count'] = $this->believer_cards->countCardInLocation('discard');
    $result['graveyard_cards'] = $this->getGraveyardCardsNewestFirst();
    $result['performed_actions_mask'] = $this->getPerformedActionsMask();
    $result['my_skill_state'] = $this->getSkillStateForPlayer((int) $current_player_id);
    $result['skill_protection'] = $this->getSkillProtectionSnapshot();
    $result['practice_ai_player_ids'] = $this->getPracticeAiPlayerIds();

    return $result;
  }

  /*
        getGameProgression:
        
        Compute and return the current game progression.
        The number returned must be an integer beween 0 (=the game just started) and
        100 (= the game is finished or almost finished).
    
        This method is called each time we are in a game state with the "updateGameProgression" property set to true 
        (see states.inc.php)
    */
  function getGameProgression()
  {
    $initial_deck_count = (int) self::getGameStateValue('initial_believer_deck_count');
    if ($initial_deck_count <= 0) {
      $initial_deck_count = max(1, (int) $this->believer_cards->countCardInLocation('deck'));
    }

    $remaining = max(0, (int) $this->believer_cards->countCardInLocation('deck'));
    $spent = max(0, $initial_deck_count - $remaining);
    $progress = (int) floor(($spent * 100) / max(1, $initial_deck_count));
    return max(0, min(100, $progress));
  }

  function getSkillUsageCap(int $skill_type): int
  {
    $skill_type = (int) $skill_type;
    $caps = [
      1 => 1, // Purple Hermit
      3 => 1, // Headstronger
      7 => 3, // Eternal Truth
      8 => 3, // World Peace
      11 => 3, // Soul-Cutting Sword
      14 => 3, // Chaos Coming
      15 => 1, // Everyone is Equal
    ];
    return isset($caps[$skill_type]) ? (int) $caps[$skill_type] : 0;
  }


  //////////////////////////////////////////////////////////////////////////////
  //////////// Utility functions
  ////////////    

  function checkPlayableActionCards($player_id): array
  {
    // Get all data needed to check playable action cards at the moment
    $hand = $this->action_cards->getPlayerHand($player_id);

    $playable_action_cards = [];
    foreach ($hand as $card) {
      $action_type_mask = $this->getActionTypeMaskFromCardType($card['type']);
      if ($this->isTrackedActionTypeMask($action_type_mask) && !$this->hasPerformedActionBit($action_type_mask)) {
        switch ($action_type_mask) {
          case self::ACTION_BIT_STRATEGY:
            switch ($card['type']) {
              case 'have_a_charity':
                if ($this->believer_cards->countCardInLocation('deck'))
                  $playable_action_cards[] = $card['id'];
                break;

              case 'info_spy':
                $player_ids = array_keys($this->loadPlayersBasicInfos());
                foreach ($player_ids as $id) {
                  if ($id == $player_id) continue;
                  if ($this->isPlayerWanderer((int) $id)) continue;
                  if ($this->action_cards->countCardInLocation('hand', $id) + $this->believer_cards->countCardInLocation('hand', $id)) {
                    $playable_action_cards[] = $card['id'];
                    break;
                  }
                }
                break;

              case 'its_a_miracle':
                if ($this->believer_cards->countCardInLocation('discard'))
                  $playable_action_cards[] = $card['id'];
                break;

              case 'divine_inspire':
                if (count($hand) > 1)
                  $playable_action_cards[] = $card['id'];
                break;

              case 'secret_alliance':
                if (count($hand) <= 1) {
                  break;
                }
                $player_ids = array_keys($this->loadPlayersBasicInfos());
                foreach ($player_ids as $id) {
                  if ((int) $id === (int) $player_id) continue;
                  if ($this->isPlayerWanderer((int) $id)) continue;
                  if ($this->action_cards->countCardInLocation('hand', (int) $id) > 0) {
                    $playable_action_cards[] = $card['id'];
                    break;
                  }
                }
                break;

              case 'breaking_faith':
                $player_sect = self::getUniqueValueFromDB("SELECT player_sect FROM player WHERE player_id='$player_id'");
                if ($player_sect != -1) { // is not a wanderer
                  $player_sect_member_count = self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_sect='$player_sect' AND player_role != 2");
                  if ($player_sect_member_count > 1) $playable_action_cards[] = $card['id'];
                }
                break;

              case 'kowtow_to_me':
                $player_sect = self::getUniqueValueFromDB("SELECT player_sect FROM player WHERE player_id='$player_id'");
                if ((int) $player_sect < 0) {
                  break;
                }
                $player_sect_believer_count = (int) $this->countSectHandBelievers((int) $player_sect);
                $threshold = intdiv($player_sect_believer_count, 2);
                if ($threshold <= 0) {
                  break;
                }

                $other_sects = self::getObjectListFromDB("SELECT DISTINCT player_sect FROM player WHERE player_sect!='$player_sect' AND player_sect != -1", true);
                foreach ($other_sects as $sect) {
                  $sect_believer_count = (int) $this->countSectHandBelievers((int) $sect);
                  if ($sect_believer_count <= $threshold) {
                    $playable_action_cards[] = $card['id'];
                    break;
                  }
                }
                break;

              default:
                break;
            }
            break;

          case self::ACTION_BIT_PHYSICAL:
          case self::ACTION_BIT_MENTAL:
            if ($this->isPlayerAttackLockedByKarboom((int) $player_id)) {
              break;
            }
            switch ($card['type']) {
              case 'faith_war':
                if ($this->believer_cards->countCardInLocation('hand', $player_id) <= 0) {
                  $can_zombie_war = ((int) $this->getZombieArmyLeaderForAttacker((int) $player_id) > 0)
                    && ((int) $this->believer_cards->countCardInLocation('discard') > 0);
                  if (!$can_zombie_war) {
                    break 2;
                  }
                }
                break;
              case 'martyrdom':

              case 'faith_debate':
              case 'conspiracy':
                if (!($this->believer_cards->countCardInLocation('hand', $player_id))) break;

              default: // all above + witch_hunt, spread_rumors
                $player_ids = array_keys($this->loadPlayersBasicInfos());
                foreach ($player_ids as $id) {
                  if ($id == $player_id) continue;
                  if ($this->isPlayerWanderer((int) $id)) continue;
                  if ($this->believer_cards->countCardInLocation('hand', $id)) {
                    $playable_action_cards[] = $card['id'];
                    break;
                  }
                }
                break;
            }
            break;

          default:
            break;
        }
      }
    }

    return $playable_action_cards;
  }

  function countSectBelievers($sect, $believers_count): int
  {
    if ((int) $sect < 0) {
      return 0;
    }

    return array_reduce(
      self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect='$sect' AND player_role != 2", true),
      fn($sect_believers_count, $id) => $sect_believers_count + $believers_count[$id],
      0
    );
  }

  function getPlayerSect($player_id): int
  {
    return (int) self::getUniqueValueFromDB("SELECT player_sect FROM player WHERE player_id='$player_id'");
  }

  function getSectDisplayName(int $sect): string
  {
    $sid = (int) $sect;
    if ($sid < 0) {
      return (string) clienttranslate("Wanderer");
    }
    $sect_names = [
      1 => clienttranslate("Hawk"),
      2 => clienttranslate("Lotus"),
      3 => clienttranslate("Peace Cross"),
      4 => clienttranslate("Taiji"),
      5 => clienttranslate("Bushido"),
      6 => clienttranslate("Hexagram"),
      7 => clienttranslate("Holy Sword"),
      8 => clienttranslate("Moon"),
    ];
    if (isset($sect_names[$sid])) {
      return (string) $sect_names[$sid];
    }
    return 'Sect ' . $sid;
  }

  function isPlayerWanderer($player_id): bool
  {
    return (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id='$player_id'") === 2;
  }

  function assertTargetIsNotWanderer($target_player_id): void
  {
    if ($this->isPlayerWanderer((int) $target_player_id)) {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer cannot be targeted."));
    }
  }

  function getSectPlayerIds($sect): array
  {
    if ((int) $sect < 0) {
      return [];
    }
    return array_map(
      'intval',
      self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect='$sect' AND player_role != 2", true)
    );
  }

  function getSectCombatReadyPlayerIds($sect): array
  {
    $player_ids = $this->getSectPlayerIds($sect);
    return array_values(array_filter($player_ids, function ($pid) {
      return $this->believer_cards->countCardInLocation('hand', $pid) > 0;
    }));
  }

  function shouldPromptLeaderForAoeRepresentative(int $leader_id, int $sect, array $candidates): bool
  {
    if (empty($candidates)) return false;
    if (count($candidates) > 1) return true;
    if ((int) $leader_id <= 0 || (int) $sect < 0) return false;

    // If a leader has followers, keep AOE representative assignment explicit.
    // This lets the leader confirm whether the leader or a follower represents the sect,
    // even in edge cases where only one member currently has a Believer to commit.
    $followers = self::getObjectListFromDB(
      "SELECT player_id FROM player WHERE player_sect = " . (int) $sect .
        " AND player_role = 1 AND player_leader_id = " . (int) $leader_id,
      true
    );
    return !empty($followers);
  }

  function isValidSectCombatRepresentative(int $sect, int $player_id): bool
  {
    $sect = (int) $sect;
    $player_id = (int) $player_id;
    if ($sect < 0 || $player_id <= 0) return false;

    $row = self::getObjectFromDB("SELECT player_sect, player_role FROM player WHERE player_id = $player_id");
    if (!$row) return false;
    if ((int) ($row['player_sect'] ?? -999) !== $sect) return false;
    if ((int) ($row['player_role'] ?? 2) === 2) return false; // Wanderer cannot represent sect.
    if ((int) $this->believer_cards->countCardInLocation('hand', (int) $player_id) <= 0) return false;

    return true;
  }

  /**
   * Assign an independent sect id within the fixed 1..8 sect namespace.
   * Used when a player splits out (e.g., Breaking Faith) or returns from Wanderer.
   */
  function allocateIndependentSectId(int $player_id): int
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) {
      return 1;
    }

    $occupied_rows = self::getObjectListFromDB(
      "SELECT DISTINCT player_sect
       FROM player
       WHERE player_role != 2
         AND player_id != $player_id
         AND player_sect BETWEEN 1 AND 8",
      true
    );
    $occupied = [];
    foreach ($occupied_rows as $sid) {
      $sid = (int) $sid;
      if ($sid >= 1 && $sid <= 8) {
        $occupied[$sid] = 1;
      }
    }
    for ($sid = 1; $sid <= 8; $sid++) {
      if (!isset($occupied[$sid])) {
        return (int) $sid;
      }
    }

    // Safety fallback for impossible/full edge-cases.
    $current = (int) $this->getPlayerSect($player_id);
    if ($current >= 1 && $current <= 8) {
      return $current;
    }
    $mapped = $player_id % 8;
    return ($mapped === 0) ? 8 : (int) $mapped;
  }

  /**
   * Batch allocator used by Headstronger to reduce repeated player-table scans
   * inside a single transaction.
   */
  function allocateIndependentSectIdsForPlayers(array $player_ids): array
  {
    $normalized_ids = array_values(array_unique(array_filter(array_map('intval', $player_ids), function ($pid) {
      return (int) $pid > 0;
    })));
    if (empty($normalized_ids)) {
      return [];
    }

    $id_sql = implode(',', $normalized_ids);
    $occupied_rows = self::getObjectListFromDB(
      "SELECT DISTINCT player_sect
       FROM player
       WHERE player_role != 2
         AND player_id NOT IN ($id_sql)
         AND player_sect BETWEEN 1 AND 8",
      true
    );
    $occupied = [];
    foreach ($occupied_rows as $sid) {
      $sid = (int) $sid;
      if ($sid >= 1 && $sid <= 8) {
        $occupied[$sid] = 1;
      }
    }

    $free = [];
    for ($sid = 1; $sid <= 8; $sid++) {
      if (!isset($occupied[$sid])) {
        $free[] = (int) $sid;
      }
    }

    $allocated = [];
    $cursor = 0;
    foreach ($normalized_ids as $pid) {
      if ($cursor < count($free)) {
        $allocated[(int) $pid] = (int) $free[$cursor];
        $cursor++;
        continue;
      }

      $current = (int) $this->getPlayerSect((int) $pid);
      if ($current >= 1 && $current <= 8) {
        $allocated[(int) $pid] = (int) $current;
      } else {
        $mapped = ((int) $pid) % 8;
        $allocated[(int) $pid] = ($mapped === 0) ? 8 : (int) $mapped;
      }
    }

    return $allocated;
  }

  function stealRandomBelieversBetweenPlayers(int $from_player_id, int $to_player_id, int $count): array
  {
    $from_player_id = (int) $from_player_id;
    $to_player_id = (int) $to_player_id;
    $count = max(0, (int) $count);
    if ($from_player_id <= 0 || $to_player_id <= 0 || $count <= 0) {
      return [];
    }

    $from_hand = array_values($this->believer_cards->getCardsInLocation('hand', $from_player_id));
    if (empty($from_hand)) {
      return [];
    }

    $max_take = min((int) $count, (int) count($from_hand));
    $stolen_cards = [];
    for ($i = 0; $i < $max_take; $i++) {
      if (empty($from_hand)) {
        break;
      }
      $idx = array_rand($from_hand);
      $card = $from_hand[$idx];
      unset($from_hand[$idx]);
      $from_hand = array_values($from_hand);
      $this->believer_cards->moveCard((int) $card['id'], 'hand', $to_player_id);
      $stolen_cards[] = $card;
    }

    return array_values($stolen_cards);
  }

  function notifyBelieverStealPrivate(int $receiver_id, int $loser_id, array $cards): void
  {
    $receiver_id = (int) $receiver_id;
    $loser_id = (int) $loser_id;
    if ($receiver_id <= 0 || $loser_id <= 0 || empty($cards)) {
      return;
    }

    $this->notifyPlayerTr($receiver_id, 'newBelievers', '', ['cards' => array_values($cards)]);
    foreach ($cards as $card) {
      $card_id = (int) ($card['id'] ?? 0);
      if ($card_id <= 0) continue;
      $this->notifyPlayerTr($loser_id, 'believerStolen', '', ['card_id' => $card_id]);
    }
  }

  function armPurpleHermitAfterSurrender(int $follower_id, int $leader_id): bool
  {
    $follower_id = (int) $follower_id;
    $leader_id = (int) $leader_id;
    if ($follower_id <= 0 || $leader_id <= 0 || $follower_id === $leader_id) {
      return false;
    }

    $skill_card = $this->getPlayerSkillCard($follower_id);
    if (!$skill_card || (int) $skill_card['type'] !== 1 || (int) $this->getSkillUseCountFromCard($skill_card) >= 1) {
      return false;
    }

    $this->setPurpleHermitReady((int) $follower_id, true);
    $this->setPurpleHermitPendingSplit((int) $follower_id, false);

    $this->notifyPlayerTr((int) $follower_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer((int) $follower_id)
    ]);

    return true;
  }

  function resolvePurpleHermitPendingSplitOnTurnStart(int $player_id): bool
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0 || !$this->isPurpleHermitPendingSplit((int) $player_id)) {
      return false;
    }

    $row = self::getObjectFromDB("SELECT player_role, player_leader_id FROM player WHERE player_id = $player_id");
    $role = (int) (($row && isset($row['player_role'])) ? $row['player_role'] : -1);
    $leader_id = (int) (($row && isset($row['player_leader_id'])) ? $row['player_leader_id'] : 0);

    $stolen_n = 0;
    if ($role === 1 && $leader_id > 0) {
      $leader_count = (int) $this->believer_cards->countCardInLocation('hand', (int) $leader_id);
      $steal_count = intdiv($leader_count, 2);
      $stolen_cards = $this->stealRandomBelieversBetweenPlayers((int) $leader_id, (int) $player_id, (int) $steal_count);
      $stolen_n = (int) count($stolen_cards);
      if ($stolen_n > 0) {
        $this->notifyBelieverStealPrivate((int) $player_id, (int) $leader_id, $stolen_cards);
      }
    }

    $new_sect = (int) $this->allocateIndependentSectId((int) $player_id);
    self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_sect = $new_sect, player_is_skill_sealed = 0 WHERE player_id = $player_id");
    $this->clearPurpleHermitStatus((int) $player_id);

    $this->notifyAllPlayersTr(
      'skillPurpleHermitFinale',
      clienttranslate('${player_name}\'s Purple Hermit second-round effect takes effect: snatches ${n} Believers from ${leader_name} and becomes independent.'),
      [
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById((int) $player_id),
        'leader_id' => (int) $leader_id,
        'leader_name' => self::getPlayerNameById((int) $leader_id),
        'n' => (int) $stolen_n,
        'new_sect' => (int) $new_sect,
        'skill_state_actor' => $this->getSkillStateForPlayer((int) $player_id)
      ]
    );

    $sync_ids = [(int) $player_id];
    if ($leader_id > 0) {
      $sync_ids[] = (int) $leader_id;
    }
    $this->notifyPlayerIdentitySync($sync_ids, 'purple_hermit_split');
    $this->notifyPlayerTr((int) $player_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer((int) $player_id)
    ]);
    $this->notifyPublicCountsSync();
    return true;
  }

  function countSectHandBelievers($sect): int
  {
    $count = 0;
    foreach ($this->getSectPlayerIds($sect) as $pid) {
      $count += $this->believer_cards->countCardInLocation('hand', $pid);
    }
    return $count;
  }

  function isReverseKarmaCombatType(int $war_type): bool
  {
    return in_array((int) $war_type, [2, 3, 6, 7], true);
  }

  function clearReverseKarmaPendingContext(): void
  {
    self::setGameStateValue('reverse_karma_pending_player_id', 0);
    self::setGameStateValue('reverse_karma_pending_war_type', 0);
    self::setGameStateValue('reverse_karma_pending_resume_mode', 0);
    self::setGameStateValue('reverse_karma_pending_use', 0);
    self::setGameStateValue('reverse_karma_pending_resume_player', 0);
  }

  function getReverseKarmaStackOwnerIds(): array
  {
    $owner_a = (int) self::getGameStateValue('war_reverse_karma_stack_owner_a');
    $owner_b = (int) self::getGameStateValue('war_reverse_karma_stack_owner_b');
    $out = [];
    if ($owner_a > 0) $out[] = (int) $owner_a;
    if ($owner_b > 0 && $owner_b !== $owner_a) $out[] = (int) $owner_b;
    return array_values($out);
  }

  function setReverseKarmaStackOwnerIds(array $owner_ids): void
  {
    $seen = [];
    $norm = [];
    foreach ($owner_ids as $owner_id) {
      $pid = (int) $owner_id;
      if ($pid <= 0) continue;
      if (isset($seen[$pid])) continue;
      $seen[$pid] = 1;
      $norm[] = (int) $pid;
      if (count($norm) >= 2) break;
    }
    self::setGameStateValue('war_reverse_karma_stack_owner_a', (int) ($norm[0] ?? 0));
    self::setGameStateValue('war_reverse_karma_stack_owner_b', (int) ($norm[1] ?? 0));
  }

  function clearReverseKarmaStackOwners(): void
  {
    $this->setReverseKarmaStackOwnerIds([]);
  }

  // Return any Believers left on the combat table to their owners' hands.
  // Safe to call at the start of a new action: outside an active confrontation
  // no Believer should be on 'cardsontable', so anything found is a stale
  // leftover from a prior round that did not clean up.
  function returnStrayCombatBelieversToHands(): void
  {
    $stray = $this->believer_cards->getCardsInLocation('cardsontable');
    foreach ($stray as $card) {
      $cid = (int) ($card['id'] ?? 0);
      $owner = (int) ($card['location_arg'] ?? 0);
      if ($cid <= 0 || $owner <= 0) continue;
      $this->believer_cards->moveCard($cid, 'hand', $owner);
    }
  }

  function clearCombatSkillState(): void
  {
    $this->clearReverseKarmaPendingContext();
    $this->clearReverseKarmaStackOwners();
    self::setGameStateValue('war_reverse_karma_checked', 0);
    self::setGameStateValue('war_reverse_karma_active', 0);
    self::setGameStateValue('war_reverse_karma_owner_id', 0);
    self::setGameStateValue('war_zombie_owner_id', 0);
    self::setGameStateValue('war_zombie_snapshot_max_discard_arg', 0);
    self::setGameStateValue('war_card_source_flags', 0);
  }

  function clearAoeDefendedSectMask(): void
  {
    self::setGameStateValue('aoe_defended_sect_mask', 0);
  }

  function markAoeSectDefended(int $sect): void
  {
    $sect = (int) $sect;
    if ($sect < 0 || $sect > 30) return;
    $mask = (int) self::getGameStateValue('aoe_defended_sect_mask');
    $mask |= (1 << $sect);
    self::setGameStateValue('aoe_defended_sect_mask', (int) $mask);
  }

  function getAoeDefendedSectsForCurrentCombat(int $war_type, int $attacker_sect): array
  {
    $defended = [];

    $mask = (int) self::getGameStateValue('aoe_defended_sect_mask');
    for ($sect = 0; $sect <= 30; $sect++) {
      if (($mask & (1 << $sect)) !== 0) {
        $defended[$sect] = true;
      }
    }

    // Fallback from marker cards for compatibility with older running games.
    $marker_loc = null;
    if ((int) $war_type === 3) $marker_loc = 'martyrdef';
    if ((int) $war_type === 6) $marker_loc = 'conspdef';
    if ($marker_loc !== null) {
      foreach ($this->action_cards->getCardsInLocation($marker_loc) as $def_card) {
        $owner_id = (int) ($def_card['location_arg'] ?? 0);
        if ($owner_id <= 0) continue;
        $sect = (int) $this->getPlayerSect($owner_id);
        if ($sect >= 0) {
          $defended[$sect] = true;
        }
      }
    }

    foreach ($this->getSkillDefendedSectsForAoe((int) $war_type, (int) $attacker_sect) as $sect_id) {
      $defended[(int) $sect_id] = true;
    }

    return array_values(array_map('intval', array_keys($defended)));
  }

  function getWarCardSourceFlag(bool $is_attacker): bool
  {
    $mask = (int) self::getGameStateValue('war_card_source_flags');
    $bit = $is_attacker ? 1 : 2;
    return (($mask & $bit) !== 0);
  }

  function setWarCardSourceFlag(bool $is_attacker, bool $from_graveyard): void
  {
    $mask = (int) self::getGameStateValue('war_card_source_flags');
    $bit = $is_attacker ? 1 : 2;
    if ($from_graveyard) {
      $mask |= $bit;
    } else {
      $mask &= (~$bit);
    }
    self::setGameStateValue('war_card_source_flags', (int) $mask);
  }

  function clearWarCardSourceFlags(): void
  {
    self::setGameStateValue('war_card_source_flags', 0);
  }

  function getReverseKarmaResponderIds(): array
  {
    $responders = [];
    $native = (int) $this->getPlayerIdHoldingSkillType(16);
    if ($native > 0) {
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $native");
      $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $native");
      if ($role === 0 && $sealed === 0) {
        $responders[] = (int) $native;
      }
    }

    $gate_owner = (int) $this->getGateTruthOwnerId();
    if (
      $gate_owner > 0 &&
      $gate_owner !== $native &&
      $this->canPlayerUseCopiedSkillAbility((int) $gate_owner, 16)
    ) {
      $responders[] = (int) $gate_owner;
    }
    return array_values(array_unique(array_map('intval', $responders)));
  }

  function getReverseKarmaEligibleLeaderId(): int
  {
    $responders = $this->getReverseKarmaResponderIds();
    return empty($responders) ? 0 : (int) $responders[0];
  }

  function getReactiveGateTruthResponderForReverseKarma(int $native_karma_player_id): int
  {
    $native_karma_player_id = (int) $native_karma_player_id;
    if ($native_karma_player_id <= 0) return 0;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $native_karma_player_id) !== 16) return 0;
    if (!$this->isSkillRevealed((int) $native_karma_player_id)) return 0;

    $gate_owner = (int) $this->getGateTruthOwnerId();
    if ($gate_owner <= 0 || $gate_owner === (int) $native_karma_player_id) return 0;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $gate_owner) !== 9) return 0;
    if (!$this->canPlayerMirrorCopiedSkillIdentity((int) $gate_owner, 16)) return 0;
    if ($this->canPlayerUseCopiedSkillAbility((int) $gate_owner, 16)) return 0;
    if ($this->isGateTruthUsedThisTurn((int) $gate_owner)) return 0;
    if ($this->isGateTruthSkillTypeAlreadyCopied(16)) return 0;

    return (int) $gate_owner;
  }

  function tryActivateReactiveGateTruthCopyForReverseKarma(int $gate_owner_id, int $native_karma_player_id): bool
  {
    $gate_owner_id = (int) $gate_owner_id;
    $native_karma_player_id = (int) $native_karma_player_id;
    if ($gate_owner_id <= 0 || $native_karma_player_id <= 0) return false;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $gate_owner_id) !== 9) return false;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $native_karma_player_id) !== 16) return false;
    if (!$this->isSkillRevealed((int) $native_karma_player_id)) return false;
    if (!$this->canPlayerMirrorCopiedSkillIdentity((int) $gate_owner_id, 16)) return false;

    if ($this->canPlayerUseCopiedSkillAbility((int) $gate_owner_id, 16)) {
      return true;
    }
    if ($this->isGateTruthUsedThisTurn((int) $gate_owner_id)) return false;
    if ($this->isGateTruthSkillTypeAlreadyCopied(16)) return false;

    $skill_card = $this->getPlayerSkillCard((int) $gate_owner_id);
    if (!$skill_card || (int) ($skill_card['type'] ?? 0) !== 9) return false;

    $new_uses = (int) $this->incrementSkillUseCount($skill_card, 1);
    $this->setGateTruthCopiedSkillContext((int) $gate_owner_id, 16, (int) $native_karma_player_id);
    $this->markGateTruthSkillTypeCopied(16);
    $this->markGateTruthUsedThisTurn((int) $gate_owner_id);
    $this->revealSkillAndNotifyIfNeeded((int) $gate_owner_id, 9);

    $copied_skill_name = isset($this->skill_labels[16]['name'])
      ? (string) $this->skill_labels[16]['name']
      : clienttranslate('Karma Reversed');

    $this->notifyAllPlayersTr(
      'skillGateTruthCopied',
      clienttranslate('${player_name} uses Gate of Truth and copies ${target_name}\'s skill ${skill_name}.'),
      [
        'player_id' => (int) $gate_owner_id,
        'player_name' => self::getPlayerNameById((int) $gate_owner_id),
        'target_id' => (int) $native_karma_player_id,
        'target_name' => self::getPlayerNameById((int) $native_karma_player_id),
        'copied_skill_type' => 16,
        'skill_name' => (string) $copied_skill_name,
        'uses' => (int) $new_uses,
        'skill_state_actor' => $this->getSkillStateForPlayer((int) $gate_owner_id)
      ]
    );
    $this->notifyPlayerTr((int) $gate_owner_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer((int) $gate_owner_id)
    ]);
    return $this->canPlayerUseCopiedSkillAbility((int) $gate_owner_id, 16);
  }

  function getReactiveGateTruthSourceForHolyRebirth(int $gate_owner_id): int
  {
    $gate_owner_id = (int) $gate_owner_id;
    if ($gate_owner_id <= 0) return 0;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $gate_owner_id) !== 9) return 0;
    if (!$this->canPlayerMirrorCopiedSkillIdentity((int) $gate_owner_id, 5)) return 0;
    if ($this->canPlayerUseCopiedSkillAbility((int) $gate_owner_id, 5)) return 0;
    if ($this->isGateTruthUsedThisTurn((int) $gate_owner_id)) return 0;
    if ($this->isGateTruthSkillTypeAlreadyCopied(5)) return 0;

    $native_holy_owner = (int) $this->getPlayerIdHoldingSkillType(5);
    if ($native_holy_owner <= 0 || $native_holy_owner === (int) $gate_owner_id) return 0;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $native_holy_owner) !== 5) return 0;
    if (!$this->isSkillRevealed((int) $native_holy_owner)) return 0;

    return (int) $native_holy_owner;
  }

  function tryActivateReactiveGateTruthCopyForHolyRebirth(int $gate_owner_id, int $native_holy_owner_id): bool
  {
    $gate_owner_id = (int) $gate_owner_id;
    $native_holy_owner_id = (int) $native_holy_owner_id;
    if ($gate_owner_id <= 0 || $native_holy_owner_id <= 0) return false;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $gate_owner_id) !== 9) return false;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $native_holy_owner_id) !== 5) return false;
    if (!$this->isSkillRevealed((int) $native_holy_owner_id)) return false;
    if (!$this->canPlayerMirrorCopiedSkillIdentity((int) $gate_owner_id, 5)) return false;

    if ($this->canPlayerUseCopiedSkillAbility((int) $gate_owner_id, 5)) {
      return true;
    }
    if ($this->isGateTruthUsedThisTurn((int) $gate_owner_id)) return false;
    if ($this->isGateTruthSkillTypeAlreadyCopied(5)) return false;

    $skill_card = $this->getPlayerSkillCard((int) $gate_owner_id);
    if (!$skill_card || (int) ($skill_card['type'] ?? 0) !== 9) return false;

    $new_uses = (int) $this->incrementSkillUseCount($skill_card, 1);
    $this->setGateTruthCopiedSkillContext((int) $gate_owner_id, 5, (int) $native_holy_owner_id);
    $this->markGateTruthSkillTypeCopied(5);
    $this->markGateTruthUsedThisTurn((int) $gate_owner_id);
    $this->revealSkillAndNotifyIfNeeded((int) $gate_owner_id, 9);

    $copied_skill_name = isset($this->skill_labels[5]['name'])
      ? (string) $this->skill_labels[5]['name']
      : clienttranslate('Holy Rebirth');

    $this->notifyAllPlayersTr(
      'skillGateTruthCopied',
      clienttranslate('${player_name} uses Gate of Truth and copies ${target_name}\'s skill ${skill_name}.'),
      [
        'player_id' => (int) $gate_owner_id,
        'player_name' => self::getPlayerNameById((int) $gate_owner_id),
        'target_id' => (int) $native_holy_owner_id,
        'target_name' => self::getPlayerNameById((int) $native_holy_owner_id),
        'copied_skill_type' => 5,
        'skill_name' => (string) $copied_skill_name,
        'uses' => (int) $new_uses,
        'skill_state_actor' => $this->getSkillStateForPlayer((int) $gate_owner_id)
      ]
    );
    $this->notifyPlayerTr((int) $gate_owner_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer((int) $gate_owner_id)
    ]);
    return $this->canPlayerUseCopiedSkillAbility((int) $gate_owner_id, 5);
  }

  function queueReverseKarmaPromptIfNeeded(int $resume_mode): bool
  {
    $war_type = (int) self::getGameStateValue('war_type');
    if (!$this->isReverseKarmaCombatType($war_type)) {
      self::setGameStateValue('war_reverse_karma_checked', 1);
      self::setGameStateValue('war_reverse_karma_active', 0);
      self::setGameStateValue('war_reverse_karma_owner_id', 0);
      $this->clearReverseKarmaStackOwners();
      $this->clearReverseKarmaPendingContext();
      return false;
    }

    if ((int) self::getGameStateValue('war_reverse_karma_checked') >= 1) {
      return false;
    }

    $owner_id = $this->getReverseKarmaEligibleLeaderId();
    if ($owner_id <= 0) {
      self::setGameStateValue('war_reverse_karma_checked', 1);
      self::setGameStateValue('war_reverse_karma_active', 0);
      self::setGameStateValue('war_reverse_karma_owner_id', 0);
      $this->clearReverseKarmaStackOwners();
      $this->clearReverseKarmaPendingContext();
      return false;
    }

    // Prompt phase must be visually/state-wise inactive until responder confirms use.
    self::setGameStateValue('war_reverse_karma_active', 0);
    self::setGameStateValue('war_reverse_karma_owner_id', 0);
    $this->clearReverseKarmaStackOwners();

    self::setGameStateValue('reverse_karma_pending_player_id', (int) $owner_id);
    self::setGameStateValue('reverse_karma_pending_war_type', (int) $war_type);
    self::setGameStateValue('reverse_karma_pending_resume_mode', max(0, (int) $resume_mode));
    self::setGameStateValue('reverse_karma_pending_use', 0);
    self::setGameStateValue('reverse_karma_pending_resume_player', (int) self::getActivePlayerId());
    // Avoid direct changeActivePlayer here: in edge timing/state drift this can
    // throw "Impossible to change active player during activeplayer type state".
    $this->switchActivePlayerSafely((int) $owner_id);
    $this->gamestate->nextState('reverseKarmaPrompt');
    return true;
  }

  function getCurrentCombatComparisonResult(int $card_a_type, int $card_b_type, bool $is_faith_war): array
  {
    $result = $this->compareBelievers((int) $card_a_type, (int) $card_b_type, $is_faith_war);
    $war_type = (int) self::getGameStateValue('war_type');
    $reverse_active = ((int) self::getGameStateValue('war_reverse_karma_active') === 1);
    if ($reverse_active && $this->isReverseKarmaCombatType((int) $war_type) && (int) $result['winner'] !== 0) {
      $result['winner'] = (int) $result['winner'] * -1;
    }
    return $result;
  }

  function getZombieArmyLeaderForAttacker(int $attacker_id): int
  {
    if ((int) $attacker_id <= 0) return 0;
    $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $attacker_id");
    $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $attacker_id");
    if ($role !== 0 || $sealed === 1) return 0;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $attacker_id) === 10) {
      return (int) $attacker_id;
    }
    if ($this->canPlayerUseCopiedSkillAbility((int) $attacker_id, 10)) {
      return (int) $attacker_id;
    }
    return 0;
  }

  function isWarZombieArmyEnabledForSect(int $sect): bool
  {
    $owner_id = (int) self::getGameStateValue('war_zombie_owner_id');
    if ($owner_id <= 0) return false;
    return ((int) $this->getPlayerSect($owner_id) === (int) $sect);
  }

  function getFaithWarZombieSnapshotMaxDiscardArg(): int
  {
    return (int) self::getGameStateValue('war_zombie_snapshot_max_discard_arg');
  }

  function isCardEligibleForFaithWarZombieSnapshot(array $card): bool
  {
    if ((string) ($card['location'] ?? '') !== 'discard') return false;
    $snapshot_max_arg = (int) $this->getFaithWarZombieSnapshotMaxDiscardArg();
    $discard_arg = (int) ($card['location_arg'] ?? 0);
    return ((int) $discard_arg <= (int) $snapshot_max_arg);
  }

  function getFaithWarZombieSnapshotDiscardCards(): array
  {
    $discard_cards = array_values($this->believer_cards->getCardsInLocation('discard'));
    if (empty($discard_cards)) return [];
    return array_values(array_filter($discard_cards, function ($card) {
      return $this->isCardEligibleForFaithWarZombieSnapshot((array) $card);
    }));
  }

  function countFaithWarZombieSnapshotDiscardCards(): int
  {
    if ((int) self::getGameStateValue('war_zombie_owner_id') <= 0) return 0;
    return (int) count($this->getFaithWarZombieSnapshotDiscardCards());
  }

  function getFaithWarAvailableBelieversForSect(int $sect): int
  {
    $count = (int) $this->countSectHandBelievers((int) $sect);
    if ($this->isWarZombieArmyEnabledForSect((int) $sect)) {
      $count += (int) $this->countFaithWarZombieSnapshotDiscardCards();
    }
    return (int) $count;
  }

  function getFaithWarCombatReadyPlayerIds(int $sect): array
  {
    $player_ids = $this->getSectPlayerIds((int) $sect);
    $can_use_graveyard = $this->isWarZombieArmyEnabledForSect((int) $sect) && ((int) $this->countFaithWarZombieSnapshotDiscardCards() > 0);
    return array_values(array_filter($player_ids, function ($pid) use ($can_use_graveyard) {
      if ($this->believer_cards->countCardInLocation('hand', (int) $pid) > 0) return true;
      return $can_use_graveyard;
    }));
  }

  function canRepresentativeUseZombieFromGraveyard(int $player_id, bool $is_attacker): bool
  {
    $war_type = (int) self::getGameStateValue('war_type');
    if ($war_type !== 2) return false;
    if ((int) self::getGameStateValue('war_zombie_owner_id') <= 0) return false;

    $rep_id = $is_attacker
      ? (int) self::getGameStateValue('war_rep_attacker_id')
      : (int) self::getGameStateValue('war_rep_defender_id');
    if ((int) $player_id !== (int) $rep_id) return false;

    $sect = (int) $this->getPlayerSect((int) $player_id);
    if (!$this->isWarZombieArmyEnabledForSect((int) $sect)) return false;
    return ((int) $this->countFaithWarZombieSnapshotDiscardCards() > 0);
  }

  function getSectLeaderId($sect, $fallback_player_id = 0): int
  {
    if ((int) $sect < 0) {
      return (int) $fallback_player_id;
    }

    $leader_id = (int) self::getUniqueValueFromDB("SELECT player_id FROM player WHERE player_sect='$sect' AND player_role=0 LIMIT 1");
    if ($leader_id > 0) {
      return $leader_id;
    }

    $sect_players = $this->getSectPlayerIds($sect);
    if (!empty($sect_players)) {
      return (int) $sect_players[0];
    }

    return (int) $fallback_player_id;
  }

  function getPublicCountsSnapshot(): array
  {
    $players = self::loadPlayersBasicInfos();
    $action_counts = [];
    $believer_counts = [];
    foreach ($players as $pid => $_p) {
      $player_id = (int) $pid;
      $action_counts[$player_id] = (int) $this->action_cards->countCardInLocation('hand', $player_id);
      $believer_counts[$player_id] = (int) $this->believer_cards->countCardInLocation('hand', $player_id);
    }

    return [
      'action_counts' => $action_counts,
      'believer_counts' => $believer_counts,
      'action_deck_count' => (int) $this->action_cards->countCardInLocation('deck'),
      'believer_deck_count' => (int) $this->believer_cards->countCardInLocation('deck'),
      'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
      // Keep graveyard sequence authoritative across clients/reconnects.
      'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
      'skill_protection' => $this->getSkillProtectionSnapshot()
    ];
  }

  function getGraveyardCardsNewestFirst(): array
  {
    return array_values($this->believer_cards->getCardsInLocation('discard', null, 'location_arg DESC'));
  }

  function getCombatContextSnapshot(): array
  {
    return [
      'war_type' => (int) self::getGameStateValue('war_type'),
      'war_attacker_id' => (int) self::getGameStateValue('war_attacker_id'),
      'war_defender_id' => (int) self::getGameStateValue('war_defender_id'),
      'war_card_attacker' => (int) self::getGameStateValue('war_card_attacker'),
      'war_card_defender' => (int) self::getGameStateValue('war_card_defender'),
      'war_rep_attacker_id' => (int) self::getGameStateValue('war_rep_attacker_id'),
      'war_rep_defender_id' => (int) self::getGameStateValue('war_rep_defender_id'),
      'debate_round' => (int) self::getGameStateValue('debate_round'),
      'war_reverse_karma_checked' => (int) self::getGameStateValue('war_reverse_karma_checked'),
      'war_reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
      'war_reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
      'war_reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds(),
      'war_zombie_snapshot_max_discard_arg' => (int) self::getGameStateValue('war_zombie_snapshot_max_discard_arg'),
      'war_zombie_owner_id' => (int) self::getGameStateValue('war_zombie_owner_id')
    ];
  }

  function notifyPublicCountsSync(): void
  {
    $this->notifyAllPlayersTr('publicCountsSync', '', $this->getPublicCountsSnapshot());
  }

  function getBelieverTypeLabel(int $type): string
  {
    $t = (int) $type;
    if (isset($this->type_labels[$t]) && isset($this->type_labels[$t]['name'])) {
      return (string) $this->type_labels[$t]['name'] . ' #' . $t;
    }
    return str_replace('${index}', (string) $t, clienttranslate('Believer #${index}'));
  }

  function notifyCombatRoundHistory(
    string $combat_key,
    string $result_type,
    int $attacker_player_id,
    int $defender_player_id,
    int $attacker_card_type,
    int $defender_card_type,
    int $round_no = 0
  ): void {
    $combat_name = ($combat_key === 'faith_debate') ? clienttranslate('Faith Debate') : clienttranslate('Faith War');
    $round_tag = ((int) $round_no > 0) ? ('R' . (int) $round_no . ' ') : '';
    $attacker_name = self::getPlayerNameById((int) $attacker_player_id);
    $defender_name = self::getPlayerNameById((int) $defender_player_id);
    $attacker_card = $this->getBelieverTypeLabel((int) $attacker_card_type);
    $defender_card = $this->getBelieverTypeLabel((int) $defender_card_type);

    if ($result_type === 'attacker') {
      $this->notifyAllPlayersTr('combatRoundHistory', clienttranslate('[${combat_name}] ${round_tag}${winner_name} (${winner_card}) defeats ${loser_name} (${loser_card}).'), [
        'combat_name' => $combat_name,
        'round_tag' => $round_tag,
        'winner_name' => $attacker_name,
        'winner_card' => $attacker_card,
        'loser_name' => $defender_name,
        'loser_card' => $defender_card
      ]);
      return;
    }

    if ($result_type === 'defender') {
      $this->notifyAllPlayersTr('combatRoundHistory', clienttranslate('[${combat_name}] ${round_tag}${winner_name} (${winner_card}) defeats ${loser_name} (${loser_card}).'), [
        'combat_name' => $combat_name,
        'round_tag' => $round_tag,
        'winner_name' => $defender_name,
        'winner_card' => $defender_card,
        'loser_name' => $attacker_name,
        'loser_card' => $attacker_card
      ]);
      return;
    }

    $this->notifyAllPlayersTr('combatRoundHistory', clienttranslate('[${combat_name}] ${round_tag}${attacker_name} (${attacker_card}) draws with ${defender_name} (${defender_card}).'), [
      'combat_name' => $combat_name,
      'round_tag' => $round_tag,
      'attacker_name' => $attacker_name,
      'attacker_card' => $attacker_card,
      'defender_name' => $defender_name,
      'defender_card' => $defender_card
    ]);
  }

  function getSortedPlayerIds(): array
  {
    $ids = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
    sort($ids, SORT_NUMERIC);
    return $ids;
  }

  function getInitialSkillChoicesForPlayer(int $player_id): array
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return [];
    $cards = array_values($this->skill_cards->getCardsInLocation('initialchoice', (int) $player_id));
    usort($cards, function ($a, $b) {
      return ((int) ($a['id'] ?? 0)) <=> ((int) ($b['id'] ?? 0));
    });
    return array_values($cards);
  }

  function getPlayersPendingInitialSkillChoice(): array
  {
    $pending = [];
    foreach ($this->getSortedPlayerIds() as $pid) {
      if ($this->skill_cards->countCardInLocation('initialchoice', (int) $pid) > 0) {
        $pending[] = (int) $pid;
      }
    }
    return array_values($pending);
  }

  private function prepareInitialSkillDraftIfNeeded(): void
  {
    if (!empty($this->getPlayersPendingInitialSkillChoice())) {
      return;
    }

    $all_choice_cards = array_values($this->skill_cards->getCardsInLocation('initialchoice'));
    if (!empty($all_choice_cards)) {
      $all_choice_ids = array_values(array_map(function ($card) {
        return (int) ($card['id'] ?? 0);
      }, $all_choice_cards));
      $all_choice_ids = array_values(array_filter($all_choice_ids, function ($id) {
        return (int) $id > 0;
      }));
      if (!empty($all_choice_ids)) {
        $this->skill_cards->moveCards($all_choice_ids, 'deck');
      }
    }

    foreach ($this->getSortedPlayerIds() as $pid) {
      $pid = (int) $pid;
      $hand_cards = array_values($this->skill_cards->getCardsInLocation('hand', (int) $pid));
      if (empty($hand_cards)) continue;
      $hand_ids = array_values(array_map(function ($card) {
        return (int) ($card['id'] ?? 0);
      }, $hand_cards));
      $hand_ids = array_values(array_filter($hand_ids, function ($id) {
        return (int) $id > 0;
      }));
      if (!empty($hand_ids)) {
        $this->skill_cards->moveCards($hand_ids, 'deck');
      }
    }

    $this->skill_cards->shuffle('deck');
    foreach ($this->getSortedPlayerIds() as $pid) {
      $pid = (int) $pid;
      $picked = array_values($this->skill_cards->pickCards(2, 'deck', (int) $pid));
      $picked_ids = array_values(array_map(function ($card) {
        return (int) ($card['id'] ?? 0);
      }, $picked));
      $picked_ids = array_values(array_filter($picked_ids, function ($id) {
        return (int) $id > 0;
      }));
      if (count($picked_ids) < 2) {
        throw new BgaVisibleSystemException(clienttranslate("Not enough Skill cards to prepare starting choices."));
      }
      $this->skill_cards->moveCards($picked_ids, 'initialchoice', (int) $pid);
    }
  }

  function getLeaderIdsForSurrender(int $bankrupt_id): array
  {
    $bankrupt_sect = $this->getPlayerSect($bankrupt_id);
    $leaders = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_role = 0", true));
    return array_values(array_filter($leaders, function ($leader_id) use ($bankrupt_id, $bankrupt_sect) {
      if ((int) $leader_id === (int) $bankrupt_id) return false;
      return $this->getPlayerSect((int) $leader_id) !== (int) $bankrupt_sect;
    }));
  }

  function getRejectedMask(): int
  {
    return (int) self::getGameStateValue('surrender_reject_mask');
  }

  function setRejectedMask(int $mask): void
  {
    self::setGameStateValue('surrender_reject_mask', $mask);
  }

  function getPlayerBit(int $player_id): int
  {
    $ids = $this->getSortedPlayerIds();
    $index = array_search((int) $player_id, $ids, true);
    if ($index === false) return 0;
    return (1 << (int) $index);
  }

  function isPlayerFlagSetByMaskKey(string $mask_key, int $player_id): bool
  {
    $bit = $this->getPlayerBit((int) $player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue($mask_key);
    return (($mask & $bit) !== 0);
  }

  function setPlayerFlagByMaskKey(string $mask_key, int $player_id, bool $enabled): void
  {
    $bit = $this->getPlayerBit((int) $player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue($mask_key);
    $mask = $enabled ? ($mask | $bit) : ($mask & (~$bit));
    self::setGameStateValue($mask_key, (int) $mask);
  }

  function isPracticeAiPlayer(int $player_id): bool
  {
    return $this->isPlayerFlagSetByMaskKey('practice_ai_player_mask', (int) $player_id);
  }

  function getPracticeAiPlayerIds(): array
  {
    return array_values(array_filter($this->getSortedPlayerIds(), function ($player_id) {
      return $this->isPracticeAiPlayer((int) $player_id);
    }));
  }

  function setPracticeAiPlayer(int $player_id, bool $enabled): void
  {
    $players = self::loadPlayersBasicInfos();
    if (!isset($players[(int) $player_id])) {
      throw new BgaVisibleSystemException(clienttranslate("Unknown player."));
    }
    $this->setPlayerFlagByMaskKey('practice_ai_player_mask', (int) $player_id, (bool) $enabled);
    $ids = $this->getPracticeAiPlayerIds();
    $this->notifyAllPlayersTr('practiceAiPlayersChanged', '', [
      'player_id' => (int) $player_id,
      'enabled' => $enabled ? 1 : 0,
      'practice_ai_player_ids' => $ids
    ]);
    if ($enabled) {
      $this->runPracticeAiForCurrentStateIfNeeded();
    }
  }

  function togglePracticeAiPlayer(int $player_id): void
  {
    $enabled = !$this->isPracticeAiPlayer((int) $player_id);
    $this->setPracticeAiPlayer((int) $player_id, (bool) $enabled);
  }

  function clearPracticeAiPlayers(): void
  {
    self::setGameStateValue('practice_ai_player_mask', 0);
    self::setGameStateValue('practice_ai_request_token', 0);
    $this->notifyAllPlayersTr('practiceAiPlayersChanged', '', [
      'player_id' => 0,
      'enabled' => 0,
      'practice_ai_player_ids' => []
    ]);
  }

  function kickPracticeAi(): void
  {
    // Watchdog recovery only. If a step request is already pending
    // (token != 0), a step is scheduled/in-flight on some client — do NOT
    // issue another request, or two runPracticeAiStep calls can execute
    // concurrently and deadlock the DB (and re-run actions like a duplicate
    // Prophet guess). Only re-drive the AI when the chain has gone idle.
    if ((int) self::getGameStateValue('practice_ai_request_token') !== 0) {
      return;
    }
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function runPracticeAiStep(int $player_id, int $token): void
  {
    $player_id = (int) $player_id;
    $token = (int) $token;
    if ($player_id <= 0 || $token <= 0) {
      return;
    }
    if ((int) self::getGameStateValue('practice_ai_request_token') !== $token) {
      return;
    }
    // Consume the token immediately so a duplicate/stale request carrying the
    // same token (e.g. a watchdog re-issue or a double-fired client timer) can
    // never run the AI turn a second time concurrently — that race deadlocks
    // the DB and re-executes actions ("not your turn", duplicate Prophet guess).
    self::setGameStateValue('practice_ai_request_token', 0);

    $state = $this->getCurrentStateSnapshotSafe();
    $state_name = (string) ($state['name'] ?? '');
    $state_type = (string) ($state['type'] ?? '');
    if ($state_name === '' || $state_type === '' || !$this->isPracticeAiPlayer((int) $player_id)) {
      return;
    }

    if ($state_type === 'activeplayer') {
      if ((int) self::getActivePlayerId() !== (int) $player_id) {
        return;
      }
    } elseif ($state_type === 'multipleactiveplayer') {
      $active_players = array_values(array_map('intval', $this->gamestate->getActivePlayerList()));
      if (!in_array((int) $player_id, $active_players, true)) {
        return;
      }
    } else {
      return;
    }

    $this->runPracticeAiTurn((array) $state, (int) $player_id);
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function clearFaithWarParticipants(): void
  {
    self::setGameStateValue('war_participant_mask', 0);
  }

  function markFaithWarParticipant(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('war_participant_mask', (int) $player_id, true);
  }

  function getFaithWarParticipantNamesForSect(int $sect): array
  {
    $sect = (int) $sect;
    if ($sect < 0) return [];
    $rows = self::getObjectListFromDB(
      "SELECT player_id, player_name
       FROM player
       WHERE player_sect = $sect
         AND player_role != 2
       ORDER BY player_no ASC"
    );
    $names = [];
    foreach ($rows as $row) {
      $pid = (int) ($row['player_id'] ?? 0);
      if ($pid <= 0) continue;
      if (!$this->isPlayerFlagSetByMaskKey('war_participant_mask', $pid)) continue;
      $name = trim((string) ($row['player_name'] ?? ''));
      if ($name === '') continue;
      $names[] = $name;
    }
    return array_values($names);
  }

  function getPlayersMarkedByMaskKey(string $mask_key): array
  {
    $ids = [];
    foreach ($this->getSortedPlayerIds() as $pid) {
      if ($this->isPlayerFlagSetByMaskKey($mask_key, (int) $pid)) {
        $ids[] = (int) $pid;
      }
    }
    return array_values($ids);
  }

  function setPlayersMarkedByMaskKey(string $mask_key, array $player_ids): void
  {
    self::setGameStateValue($mask_key, 0);
    foreach (array_values(array_unique(array_map('intval', $player_ids))) as $pid) {
      if ($pid <= 0) continue;
      $this->setPlayerFlagByMaskKey($mask_key, (int) $pid, true);
    }
  }

  function getFinalConspiracyContenders(): array
  {
    return $this->getPlayersMarkedByMaskKey('war_participant_mask');
  }

  function getFinalConspiracyPlayableContenders(array $contenders = []): array
  {
    $ids = !empty($contenders) ? $contenders : $this->getFinalConspiracyContenders();
    return array_values(array_filter(array_map('intval', $ids), function ($pid) {
      return (int) $this->believer_cards->countCardInLocation('hand', (int) $pid) > 0;
    }));
  }

  function getFinalConspiracyScoreRows(array $contenders = []): array
  {
    $ids = !empty($contenders) ? array_values(array_unique(array_map('intval', $contenders))) : $this->getFinalConspiracyContenders();
    $rows = [];
    foreach ($ids as $pid) {
      if ($pid <= 0) continue;
      $rows[] = [
        'player_id' => (int) $pid,
        'player_name' => self::getPlayerNameById((int) $pid),
        'stolen' => (int) $this->believer_cards->countCardInLocation('finalconspcap', (int) $pid)
      ];
    }
    usort($rows, function ($a, $b) {
      if ((int) $a['stolen'] !== (int) $b['stolen']) {
        return ((int) $b['stolen'] <=> (int) $a['stolen']);
      }
      return ((int) $a['player_id'] <=> (int) $b['player_id']);
    });
    return array_values($rows);
  }

  function pickNextFinalConspiracyAttacker(int $current_attacker_id, array $playable): int
  {
    $playable = array_values(array_unique(array_map('intval', $playable)));
    if (empty($playable)) return 0;
    if (count($playable) === 1) return (int) $playable[0];

    if ($current_attacker_id > 0) {
      $order = $this->getPlayerOrderStartingFrom((int) $current_attacker_id);
      $seen_current = false;
      foreach ($order as $pid) {
        $pid = (int) $pid;
        if (!$seen_current) {
          if ($pid === (int) $current_attacker_id) {
            $seen_current = true;
          }
          continue;
        }
        if (in_array($pid, $playable, true)) {
          return (int) $pid;
        }
      }
    }

    $order = $this->getPlayerOrderStartingFrom((int) $playable[0]);
    foreach ($order as $pid) {
      $pid = (int) $pid;
      if (in_array($pid, $playable, true)) {
        return (int) $pid;
      }
    }
    return (int) $playable[0];
  }

  function getPerformedActionsMask(): int
  {
    return ((int) self::getGameStateValue('performedActions')) & self::ACTION_BITS_ALL;
  }

  function hasPerformedActionBit(int $action_bit_mask): bool
  {
    $mask = ((int) $action_bit_mask) & self::ACTION_BITS_ALL;
    if ($mask <= 0) return false;
    return (($this->getPerformedActionsMask() & $mask) !== 0);
  }

  function markPerformedActionBits(int $action_bit_mask): void
  {
    $mask = ((int) $action_bit_mask) & self::ACTION_BITS_ALL;
    if ($mask <= 0) return;
    $next = $this->getPerformedActionsMask() | $mask;
    self::setGameStateValue('performedActions', (int) $next);
  }

  function clearPerformedActionsMask(): void
  {
    self::setGameStateValue('performedActions', 0);
  }

  function isTrackedActionTypeMask(int $action_type_mask): bool
  {
    return ((((int) $action_type_mask) & self::ACTION_BITS_NON_DISCARD) !== 0);
  }

  function getActionTypeNameByMask(int $action_type_mask): string
  {
    $mask = ((int) $action_type_mask) & self::ACTION_BITS_ALL;
    if ($mask === self::ACTION_BIT_STRATEGY) return clienttranslate('Strategy');
    if ($mask === self::ACTION_BIT_PHYSICAL) return clienttranslate('Physical Attack');
    if ($mask === self::ACTION_BIT_MENTAL) return clienttranslate('Mental Attack');
    if ($mask === self::ACTION_BIT_DISCARD) return clienttranslate('Discard');
    return clienttranslate("Action");
  }

  function resetActionWindowState(bool $clear_praise_life_decision = true): void
  {
    $this->clearPerformedActionsMask();
    self::setGameStateValue('actions_performed_count', 0);
    self::setGameStateValue('extra_action_slots', 0);
    if ($clear_praise_life_decision) {
      $this->clearPraiseLifeDecisionPending();
    }
  }

  function isPurpleHermitReady(int $player_id): bool
  {
    return $this->isPlayerFlagSetByMaskKey('purple_hermit_ready_mask', (int) $player_id);
  }

  function setPurpleHermitReady(int $player_id, bool $enabled): void
  {
    $this->setPlayerFlagByMaskKey('purple_hermit_ready_mask', (int) $player_id, (bool) $enabled);
  }

  function isPurpleHermitPendingSplit(int $player_id): bool
  {
    return $this->isPlayerFlagSetByMaskKey('purple_hermit_pending_split_mask', (int) $player_id);
  }

  function setPurpleHermitPendingSplit(int $player_id, bool $enabled): void
  {
    $this->setPlayerFlagByMaskKey('purple_hermit_pending_split_mask', (int) $player_id, (bool) $enabled);
  }

  function clearPurpleHermitStatus(int $player_id): void
  {
    $this->setPurpleHermitReady((int) $player_id, false);
    $this->setPurpleHermitPendingSplit((int) $player_id, false);
  }

  function isLeaderRejected(int $leader_id): bool
  {
    $bit = $this->getPlayerBit($leader_id);
    if ($bit === 0) return false;
    return (($this->getRejectedMask() & $bit) !== 0);
  }

  function markLeaderRejected(int $leader_id): void
  {
    $bit = $this->getPlayerBit($leader_id);
    if ($bit === 0) return;
    $this->setRejectedMask($this->getRejectedMask() | $bit);
  }

  function getAvailableSurrenderLeaders(int $bankrupt_id): array
  {
    return array_values(array_filter($this->getLeaderIdsForSurrender($bankrupt_id), function ($leader_id) {
      return !$this->isLeaderRejected((int) $leader_id);
    }));
  }

  function isSkillRevealed(int $player_id): bool
  {
    return $this->isPlayerFlagSetByMaskKey('skill_revealed_mask', (int) $player_id);
  }

  function revealSkill(int $player_id): bool
  {
    if ($this->isSkillRevealed((int) $player_id)) {
      return false;
    }
    $this->setPlayerFlagByMaskKey('skill_revealed_mask', (int) $player_id, true);
    return true;
  }

  function revealSkillAndNotifyIfNeeded(int $player_id, ?int $skill_type_hint = null): bool
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return false;

    $just_revealed = $this->revealSkill($player_id);
    if (!$just_revealed) return false;

    $skill_type = (int) ($skill_type_hint ?? 0);
    if ($skill_type <= 0) {
      $skill_card = $this->getPlayerSkillCard($player_id);
      $skill_type = $skill_card ? (int) $skill_card['type'] : 0;
    }
    if ($skill_type <= 0) {
      return false;
    }

    $skill_name = isset($this->skill_labels[$skill_type]['name'])
      ? (string) $this->skill_labels[$skill_type]['name']
      : ('Skill ' . $skill_type);
    $this->notifyAllPlayersTr('skillRevealed', clienttranslate('${player_name} reveals skill: ${skill_name}.'), [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById($player_id),
      'skill_type' => (int) $skill_type,
      'skill_name' => $skill_name,
      'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
    ]);
    return true;
  }

  function getPlayerSkillCard(int $player_id): ?array
  {
    $cards = array_values($this->skill_cards->getCardsInLocation('hand', $player_id));
    if (empty($cards)) {
      return null;
    }
    return $cards[0];
  }

  function getSkillUseCountFromCard(array $skill_card): int
  {
    return (int) ($skill_card['type_arg'] ?? 0);
  }

  function setSkillUseCount(int $skill_card_id, int $use_count): void
  {
    $skill_card_id = (int) $skill_card_id;
    $use_count = max(0, (int) $use_count);
    self::DbQuery("UPDATE skill_cards SET card_type_arg = $use_count WHERE card_id = $skill_card_id");
  }

  function incrementSkillUseCount(array $skill_card, int $delta = 1): int
  {
    $current = $this->getSkillUseCountFromCard($skill_card);
    $delta = (int) $delta;
    $next = max(0, $current + $delta);
    $this->setSkillUseCount((int) $skill_card['id'], $next);
    if ($delta > 0) {
      $owner_id = (int) ($skill_card['location_arg'] ?? 0);
      $this->incStat($delta, 'skills_used');
      if ($owner_id > 0) {
        $this->incStat($delta, 'skills_used', (int) $owner_id);
      }
    }
    return $next;
  }

  function isKarboomUsedThisTurn(int $player_id): bool
  {
    return $this->isPlayerFlagSetByMaskKey('karboom_turn_used_mask', (int) $player_id);
  }

  function markKarboomUsedThisTurn(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('karboom_turn_used_mask', (int) $player_id, true);
  }

  function clearKarboomUsedThisTurn(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('karboom_turn_used_mask', (int) $player_id, false);
  }

  function isPraiseLifeUsedThisTurn(int $player_id): bool
  {
    return $this->isPlayerFlagSetByMaskKey('praise_life_turn_used_mask', (int) $player_id);
  }

  function markPraiseLifeUsedThisTurn(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('praise_life_turn_used_mask', (int) $player_id, true);
  }

  function clearPraiseLifeUsedThisTurn(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('praise_life_turn_used_mask', (int) $player_id, false);
  }

  function isPlayerProtectedFromPhysicalSkill(int $player_id): bool
  {
    if ($this->isPlayerSkillSealed((int) $player_id)) {
      return false;
    }
    return $this->isPlayerFlagSetByMaskKey('skill_physical_protect_mask', (int) $player_id);
  }

  function isPlayerProtectedFromMentalSkill(int $player_id): bool
  {
    if ($this->isPlayerSkillSealed((int) $player_id)) {
      return false;
    }
    return $this->isPlayerFlagSetByMaskKey('skill_mental_protect_mask', (int) $player_id);
  }

  function isPlayerSkillSealed(int $player_id): bool
  {
    $pid = (int) $player_id;
    if ($pid <= 0) return false;
    $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $pid");
    return ($sealed === 1);
  }

  function setPlayerSkillProtection(int $player_id, string $kind, bool $enabled): void
  {
    if ((bool) $enabled && $this->isPlayerSkillSealed((int) $player_id)) {
      return;
    }
    if ($kind === 'physical') {
      $this->setPlayerFlagByMaskKey('skill_physical_protect_mask', (int) $player_id, (bool) $enabled);
      return;
    }
    if ($kind === 'mental') {
      $this->setPlayerFlagByMaskKey('skill_mental_protect_mask', (int) $player_id, (bool) $enabled);
    }
  }

  function applySkillSealEffectsForPlayers(array $player_ids): void
  {
    $seen = [];
    foreach ($player_ids as $raw_id) {
      $pid = (int) $raw_id;
      if ($pid <= 0 || isset($seen[$pid])) continue;
      $seen[$pid] = 1;

      if (!$this->isPlayerSkillSealed((int) $pid)) {
        continue;
      }

      // When a player becomes sealed (forced follower), all ongoing self-protection
      // effects must stop immediately.
      $this->setPlayerSkillProtection((int) $pid, 'physical', false);
      $this->setPlayerSkillProtection((int) $pid, 'mental', false);

      // Gate of Truth copy context is inactive while sealed.
      if ((int) $this->getGateTruthOwnerId() === (int) $pid) {
        $this->clearGateTruthCopiedSkillContext();
        $this->clearGateTruthUsedThisTurn((int) $pid);
      }

      $this->notifyPlayerTr((int) $pid, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer((int) $pid)
      ]);
    }
  }

  function getSkillTypeBit(int $skill_type): int
  {
    $skill_type = (int) $skill_type;
    if ($skill_type < 1 || $skill_type > 16) return 0;
    return (1 << ((int) $skill_type - 1));
  }

  function isGateTruthSkillTypeCopyableTarget(int $skill_type): bool
  {
    $skill_type = (int) $skill_type;
    if ($skill_type < 1 || $skill_type > 16) return false;
    // Impermanence is intentionally excluded from copy.
    if ($skill_type === 12) return false;
    return true;
  }

  function isGateTruthSkillTypeAlreadyCopied(int $skill_type): bool
  {
    $bit = (int) $this->getSkillTypeBit((int) $skill_type);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('gate_truth_copied_skill_mask');
    return (($mask & $bit) !== 0);
  }

  function markGateTruthSkillTypeCopied(int $skill_type): void
  {
    $bit = (int) $this->getSkillTypeBit((int) $skill_type);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('gate_truth_copied_skill_mask');
    $mask |= $bit;
    self::setGameStateValue('gate_truth_copied_skill_mask', (int) $mask);
  }

  function getGateTruthCopiedSkillTypeList(): array
  {
    $mask = (int) self::getGameStateValue('gate_truth_copied_skill_mask');
    if ($mask <= 0) return [];
    $types = [];
    for ($skill_type = 1; $skill_type <= 16; $skill_type++) {
      $bit = (int) $this->getSkillTypeBit((int) $skill_type);
      if ($bit > 0 && (($mask & $bit) !== 0)) {
        $types[] = (int) $skill_type;
      }
    }
    return array_values($types);
  }

  function getGateTruthOwnerId(): int
  {
    $players = self::loadPlayersBasicInfos();
    foreach ($players as $pid => $_p) {
      $player_id = (int) $pid;
      if ($this->getSkillTypeInPlayerHandByPlayer((int) $player_id) === 9) {
        return (int) $player_id;
      }
    }
    return 0;
  }

  function clearGateTruthCopiedSkillContext(): void
  {
    self::setGameStateValue('gate_truth_copied_skill_type', 0);
    self::setGameStateValue('gate_truth_copied_source_player_id', 0);
  }

  function setGateTruthCopiedSkillContext(int $owner_id, int $skill_type, int $source_player_id): void
  {
    $owner_id = (int) $owner_id;
    $skill_type = (int) $skill_type;
    $source_player_id = (int) $source_player_id;
    if (
      $owner_id <= 0 ||
      $this->getSkillTypeInPlayerHandByPlayer((int) $owner_id) !== 9 ||
      !$this->isGateTruthSkillTypeCopyableTarget((int) $skill_type)
    ) {
      $this->clearGateTruthCopiedSkillContext();
      return;
    }
    self::setGameStateValue('gate_truth_copied_skill_type', (int) $skill_type);
    self::setGameStateValue('gate_truth_copied_source_player_id', max(0, (int) $source_player_id));
  }

  function getGateTruthCopiedSkillTypeForPlayer(int $player_id): int
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return 0;
    $owner_id = (int) $this->getGateTruthOwnerId();
    if ($owner_id <= 0 || $owner_id !== (int) $player_id) {
      if ($owner_id <= 0) {
        $this->clearGateTruthCopiedSkillContext();
      }
      return 0;
    }
    $skill_type = (int) self::getGameStateValue('gate_truth_copied_skill_type');
    if (!$this->isGateTruthSkillTypeCopyableTarget((int) $skill_type)) {
      return 0;
    }
    return (int) $skill_type;
  }

  function getGateTruthCopiedSourcePlayerIdForPlayer(int $player_id): int
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return 0;
    if ((int) $this->getGateTruthOwnerId() !== (int) $player_id) return 0;
    if ((int) $this->getGateTruthCopiedSkillTypeForPlayer((int) $player_id) <= 0) return 0;
    return (int) self::getGameStateValue('gate_truth_copied_source_player_id');
  }

  function isGateTruthUsedThisTurn(int $player_id): bool
  {
    return $this->isPlayerFlagSetByMaskKey('gate_truth_turn_used_mask', (int) $player_id);
  }

  function markGateTruthUsedThisTurn(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('gate_truth_turn_used_mask', (int) $player_id, true);
  }

  function clearGateTruthUsedThisTurn(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('gate_truth_turn_used_mask', (int) $player_id, false);
  }

  function canPlayerUseCopiedSkillAbility(int $player_id, int $skill_type): bool
  {
    $player_id = (int) $player_id;
    $skill_type = (int) $skill_type;
    if ($player_id <= 0 || $skill_type <= 0) return false;
    if ($this->getSkillTypeInPlayerHandByPlayer((int) $player_id) !== 9) return false;
    if ((int) $this->getGateTruthCopiedSkillTypeForPlayer((int) $player_id) !== (int) $skill_type) return false;
    $row = self::getObjectFromDB("SELECT player_role, player_is_skill_sealed FROM player WHERE player_id = $player_id");
    if (!$row) return false;
    $role = (int) ($row['player_role'] ?? -1);
    $sealed = (int) ($row['player_is_skill_sealed'] ?? 0);
    if ((int) $skill_type === 1) {
      // Copied Purple Hermit mirrors follower requirement and is not blocked by sealed state.
      return ($role === 1);
    }
    if ($role !== 0) return false;
    if ($sealed === 1) return false;
    return true;
  }

  function canPlayerMirrorCopiedSkillIdentity(int $player_id, int $copied_skill_type): bool
  {
    $player_id = (int) $player_id;
    $copied_skill_type = (int) $copied_skill_type;
    if ($player_id <= 0 || $copied_skill_type <= 0) return false;
    $row = self::getObjectFromDB("SELECT player_role, player_is_skill_sealed FROM player WHERE player_id = $player_id");
    if (!$row) return false;
    $role = (int) ($row['player_role'] ?? -1);
    $sealed = (int) ($row['player_is_skill_sealed'] ?? 0);

    if ((int) $copied_skill_type === 1) {
      return ($role === 1);
    }
    if ($role !== 0) return false;
    if ($sealed === 1) return false;
    return true;
  }

  function getGateTruthCopyableTargets(int $player_id): array
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return [];
    if ($this->getSkillTypeInPlayerHandByPlayer((int) $player_id) !== 9) return [];

    $targets = [];
    $players = self::loadPlayersBasicInfos();
    foreach ($players as $pid => $_p) {
      $target_id = (int) $pid;
      if ($target_id <= 0 || $target_id === (int) $player_id) continue;
      if (!$this->isSkillRevealed((int) $target_id)) continue;
      $target_skill_card = $this->getPlayerSkillCard((int) $target_id);
      if (!$target_skill_card) continue;
      $target_skill_type = (int) ($target_skill_card['type'] ?? 0);
      if (!$this->isGateTruthSkillTypeCopyableTarget((int) $target_skill_type)) continue;
      if (!$this->canPlayerMirrorCopiedSkillIdentity((int) $player_id, (int) $target_skill_type)) continue;
      if ($this->isGateTruthSkillTypeAlreadyCopied((int) $target_skill_type)) continue;
      if ((int) $target_skill_type === 2) {
        // Do not offer copied KABOOM when the current turn state guarantees it is unusable.
        if ($this->isPlayerAttackLockedByKarboom((int) $player_id)) continue;
        if (!$this->hasRemainingActionSlots()) continue;
        if ($this->isKarboomUsedThisTurn((int) $player_id)) continue;
        if ((int) $this->believer_cards->countCardInLocation('hand', (int) $player_id) <= 0) continue;
      }

      $skill_name = isset($this->skill_labels[$target_skill_type]['name'])
        ? (string) $this->skill_labels[$target_skill_type]['name']
        : ('Skill ' . $target_skill_type);
      $targets[] = [
        'id' => (int) $target_id,
        'name' => self::getPlayerNameById((int) $target_id),
        'skill_type' => (int) $target_skill_type,
        'skill_name' => (string) $skill_name
      ];
    }
    return array_values($targets);
  }

  function getGateTruthCopiedSkillUseCountFromSource(int $owner_player_id, int $copied_skill_type): int
  {
    $owner_player_id = (int) $owner_player_id;
    $copied_skill_type = (int) $copied_skill_type;
    if ($owner_player_id <= 0 || $copied_skill_type <= 0) return 0;
    $source_player_id = (int) $this->getGateTruthCopiedSourcePlayerIdForPlayer((int) $owner_player_id);
    if ($source_player_id <= 0) return 0;
    $source_card = $this->getPlayerSkillCard((int) $source_player_id);
    if (!$source_card) return 0;
    if ((int) ($source_card['type'] ?? 0) !== (int) $copied_skill_type) return 0;
    return (int) $this->getSkillUseCountFromCard($source_card);
  }

  function getGateTruthEffectiveSkillTypeForUse(int $player_id): int
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return 0;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $player_id) !== 9) return 0;
    if (!$this->isGateTruthUsedThisTurn((int) $player_id)) return 9; // copy mode
    return (int) $this->getGateTruthCopiedSkillTypeForPlayer((int) $player_id);
  }

  function canPlayerUseGateTruthCopiedSkillNow(int $player_id, int $copied_skill_type): array
  {
    $player_id = (int) $player_id;
    $copied_skill_type = (int) $copied_skill_type;
    if ($player_id <= 0 || $copied_skill_type <= 0) {
      return [false, clienttranslate("No copied skill is active right now.")];
    }
    if (!$this->canPlayerUseCopiedSkillAbility((int) $player_id, (int) $copied_skill_type)) {
      return [false, clienttranslate("No copied skill is active right now.")];
    }

    if ($copied_skill_type === 1) {
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
      if ($role !== 1) {
        return [false, clienttranslate("Copied Purple Hermit can only be used while you are a Follower.")];
      }
      $leader_id = (int) self::getUniqueValueFromDB("SELECT player_leader_id FROM player WHERE player_id = $player_id");
      if ($leader_id <= 0) {
        return [false, clienttranslate("Copied Purple Hermit can only be used after you join another Sect as a Follower.")];
      }
      if ((int) $this->believer_cards->countCardInLocation('hand', (int) $leader_id) <= 0) {
        return [false, clienttranslate("Your current Leader has no Believers right now.")];
      }
      return [true, ''];
    }

    if ($copied_skill_type === 2) {
      if (!$this->hasRemainingActionSlots()) {
        return [false, clienttranslate("No action slots left this turn for copied KABOOM!.")];
      }
      if (
        $this->hasPerformedActionBit(self::ACTION_BIT_PHYSICAL) ||
        $this->hasPerformedActionBit(self::ACTION_BIT_MENTAL)
      ) {
        return [false, clienttranslate("Copied KABOOM! cannot be used after you have already performed an attack this turn.")];
      }
      if ($this->isKarboomUsedThisTurn((int) $player_id)) {
        return [false, clienttranslate("Copied KABOOM! can only be used once per turn.")];
      }
      if ((int) $this->believer_cards->countCardInLocation('hand', (int) $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use copied KABOOM!.")];
      }
      return [true, ''];
    }

    if ($copied_skill_type === 3) {
      $sect = (int) $this->getPlayerSect((int) $player_id);
      if ($sect < 0) {
        return [false, clienttranslate("No Sect Followers can be expelled right now.")];
      }
      $followers = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect = $sect AND player_role = 1", true));
      if (empty($followers)) {
        return [false, clienttranslate("You currently have no Followers to expel.")];
      }
      return [true, ''];
    }

    if ($copied_skill_type === 7) {
      if ($this->isPlayerProtectedFromMentalSkill((int) $player_id)) {
        return [false, clienttranslate("You are already protected from Mental attacks until your next turn.")];
      }
      if ((int) $this->believer_cards->countCardInLocation('hand', (int) $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use copied Eternal Truth.")];
      }
      return [true, ''];
    }

    if ($copied_skill_type === 8) {
      if ($this->isPlayerProtectedFromPhysicalSkill((int) $player_id)) {
        return [false, clienttranslate("You are already protected from Physical attacks until your next turn.")];
      }
      if ((int) $this->believer_cards->countCardInLocation('hand', (int) $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use copied World Peace.")];
      }
      return [true, ''];
    }

    if ($copied_skill_type === 10) {
      return [false, clienttranslate("Copied Zombie Army can only be chosen when you declare Faith War.")];
    }

    if ($copied_skill_type === 11) {
      return [true, ''];
    }

    if ($copied_skill_type === 13) {
      if ($this->isPraiseLifeUsedThisTurn((int) $player_id)) {
        return [false, clienttranslate("Copied Praise of Life can only be used once per turn.")];
      }
      if ((int) $this->believer_cards->countCardInLocation('hand', (int) $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use copied Praise of Life.")];
      }
      return [true, ''];
    }

    if ($copied_skill_type === 14) {
      return [true, ''];
    }

    if ($copied_skill_type === 15) {
      if ($this->getPerformedActionCount() > 0) {
        return [false, clienttranslate("Copied Everyone is Equal can only be used before any action this turn.")];
      }
      return [true, ''];
    }

    if ($copied_skill_type === 4) {
      return [false, clienttranslate("Copied The Prophet is reactive and triggers before Believer draws.")];
    }
    if ($copied_skill_type === 5) {
      return [false, clienttranslate("Copied Holy Rebirth is reactive and triggers automatically.")];
    }
    if ($copied_skill_type === 6) {
      return [false, clienttranslate("Copied Ascend with Me is passive.")];
    }
    if ($copied_skill_type === 16) {
      return [false, clienttranslate("Copied Karma Reversed is reactive and will prompt during confrontation.")];
    }

    return [false, clienttranslate("This copied skill cannot be manually used right now.")];
  }

  function getSkipTurnCounter(int $player_id): int
  {
    $ids = $this->getSortedPlayerIds();
    $index = array_search((int) $player_id, $ids, true);
    if ($index === false) return 0;
    $base = 8;
    $pack = (int) self::getGameStateValue('skip_turn_counter_pack');
    for ($i = 0; $i < (int) $index; $i++) {
      $pack = intdiv($pack, $base);
    }
    return (int) ($pack % $base);
  }

  function setSkipTurnCounter(int $player_id, int $count): void
  {
    $ids = $this->getSortedPlayerIds();
    $index = array_search((int) $player_id, $ids, true);
    if ($index === false) return;
    $base = 8;
    $count = max(0, min(7, (int) $count));

    $factor = 1;
    for ($i = 0; $i < (int) $index; $i++) {
      $factor *= $base;
    }
    $pack = (int) self::getGameStateValue('skip_turn_counter_pack');
    $current = (int) (intdiv($pack, $factor) % $base);
    $pack -= $current * $factor;
    $pack += $count * $factor;
    self::setGameStateValue('skip_turn_counter_pack', (int) $pack);
  }

  function addSkipTurnCounter(int $player_id, int $delta = 1): int
  {
    $current = $this->getSkipTurnCounter($player_id);
    $next = max(0, min(7, $current + (int) $delta));
    $this->setSkipTurnCounter($player_id, $next);
    return (int) $next;
  }

  function consumeSkipTurnCounter(int $player_id): int
  {
    $current = $this->getSkipTurnCounter($player_id);
    if ($current <= 0) return 0;
    $next = max(0, $current - 1);
    $this->setSkipTurnCounter($player_id, $next);
    return (int) $next;
  }

  function getProphetPendingSourceKey(int $source_code): string
  {
    $code = (int) $source_code;
    if ($code === 2) return 'divine_inspire';
    return 'have_a_charity';
  }

  function clearProphetPendingContext(): void
  {
    self::setGameStateValue('prophet_pending_drawer_id', 0);
    self::setGameStateValue('prophet_pending_draw_count', 0);
    self::setGameStateValue('prophet_pending_source', 0);
    self::setGameStateValue('prophet_pending_prophet_id', 0);
    self::setGameStateValue('prophet_pending_guess_type', 0);
    self::setGameStateValue('prophet_pending_extra', 0);
    self::setGameStateValue('prophet_pending_primary_player_id', 0);
    self::setGameStateValue('prophet_pending_secondary_player_id', 0);
    self::setGameStateValue('prophet_pending_primary_guess_type', 0);
    self::setGameStateValue('prophet_pending_secondary_guess_type', 0);
  }

  function normalizeProphetStoredGuessType(int $stored_guess): int
  {
    $decoded = $this->decodeProphetStoredGuess((int) $stored_guess);
    return (int) ($decoded['guess_type'] ?? 0);
  }

  function decodeProphetStoredGuess(int $stored_guess): array
  {
    $stored_guess = (int) $stored_guess;
    $resolved = 0;
    $guess_correct = 0;
    if ($stored_guess >= 200) {
      $resolved = 1;
      $guess_correct = 1;
      $stored_guess -= 200;
    } else if ($stored_guess >= 100) {
      $resolved = 1;
      $stored_guess -= 100;
    }
    $base = (int) $stored_guess;
    $guess_type = 0;
    if ($base >= 1 && $base <= 5) $guess_type = (int) $base;
    return [
      'raw' => (int) $stored_guess,
      'base' => (int) $base,
      'guess_type' => (int) $guess_type,
      'resolved' => (int) $resolved,
      'guess_correct' => (int) $guess_correct
    ];
  }

  function encodeResolvedProphetStoredGuess(int $stored_guess, int $guess_correct = 0): int
  {
    $decoded = $this->decodeProphetStoredGuess((int) $stored_guess);
    $base = (int) ($decoded['base'] ?? 0);
    if ($base !== 7 && ($base < 1 || $base > 5)) {
      $base = 0;
    }
    return ($guess_correct === 1 ? 200 : 100) + (int) $base;
  }

  function getProphetStoredGuessBase(int $stored_guess): int
  {
    $decoded = $this->decodeProphetStoredGuess((int) $stored_guess);
    return (int) ($decoded['base'] ?? 0);
  }

  function isProphetStoredGuessResolved(int $stored_guess): bool
  {
    $decoded = $this->decodeProphetStoredGuess((int) $stored_guess);
    return ((int) ($decoded['resolved'] ?? 0) === 1);
  }

  function isProphetStoredGuessCorrect(int $stored_guess): bool
  {
    $decoded = $this->decodeProphetStoredGuess((int) $stored_guess);
    return ((int) ($decoded['guess_correct'] ?? 0) === 1);
  }

  function getProphetPredictionResolveLog(array $event, int $prophet_visible, string $prophet_name, string $drawer_name): string
  {
    $guess_type = (int) ($event['guess_type'] ?? 0);
    $revealed_type = (int) ($event['revealed_type'] ?? 0);
    $guess_correct = (int) ($event['guess_correct'] ?? 0);
    if ($prophet_visible === 1 && $guess_type > 0 && $revealed_type > 0) {
      if ($guess_correct === 1) {
        return clienttranslate('${prophet_name} predicts correctly. ${prophet_name} snatches ${prophet_gain_n} Believers.');
      }
      return clienttranslate('${prophet_name} predicts wrong. No Believers are snatched.');
    }
    if ($prophet_visible === 1 && $guess_type === 0) {
      return clienttranslate('${prophet_name} skips prediction.');
    }
    return clienttranslate('The Prophet prediction is checked; ${drawer_name} draws ${drawer_gain_n} Believers.');
  }

  function notifyProphetPredictionResolvedEvent(
    int $drawer_id,
    string $source_key,
    string $source_name,
    int $requested_draw_n,
    int $drawer_gain_n,
    int $primary_id,
    int $primary_visible,
    int $primary_guess_type,
    int $primary_gain_n,
    int $secondary_id,
    int $secondary_visible,
    int $secondary_guess_type,
    int $secondary_gain_n,
    int $secondary_target_index,
    array $prediction_events,
    int $remaining_draw_n,
    string $phase = 'final',
    int $clear_previous_prediction = 0
  ): void {
    $public_primary_id = ($primary_visible === 1) ? (int) $primary_id : 0;
    $public_primary_name = ($primary_visible === 1) ? self::getPlayerNameById((int) $primary_id) : '';
    $public_secondary_id = ($secondary_visible === 1) ? (int) $secondary_id : 0;
    $public_secondary_name = ($secondary_visible === 1) ? self::getPlayerNameById((int) $secondary_id) : '';

    $public_events = array_map(function ($event) use ($primary_id, $secondary_id, $primary_visible, $secondary_visible) {
      $predictor_id = (int) ($event['predictor_id'] ?? 0);
      $visible = 0;
      if ($predictor_id > 0 && $predictor_id === (int) $primary_id) $visible = (int) $primary_visible;
      if ($predictor_id > 0 && $predictor_id === (int) $secondary_id) $visible = (int) $secondary_visible;
      $public_predictor_id = ($visible === 1) ? (int) $predictor_id : 0;
      return [
        'predictor_id' => (int) $public_predictor_id,
        'predictor_visible' => (int) $visible,
        'ability_source' => (string) ($event['ability_source'] ?? ''),
        'draw_index' => (int) ($event['draw_index'] ?? 0),
        'guess_type' => (int) ($event['guess_type'] ?? 0),
        'revealed_type' => (int) ($event['revealed_type'] ?? 0),
        'guess_correct' => (int) ($event['guess_correct'] ?? 0),
        'receiver_id' => (int) ($event['receiver_id'] ?? 0)
      ];
    }, array_values($prediction_events));

    $legacy_event = !empty($public_events) ? $public_events[0] : null;
    $legacy_prophet_id = $legacy_event ? (int) ($legacy_event['predictor_id'] ?? 0) : 0;
    $legacy_prophet_visible = $legacy_event ? (int) ($legacy_event['predictor_visible'] ?? 0) : 0;
    $legacy_prophet_name = '';
    if ($legacy_prophet_visible === 1 && $legacy_prophet_id > 0) {
      $legacy_prophet_name = self::getPlayerNameById((int) $legacy_prophet_id);
    }
    $legacy_guess_type = $legacy_event ? (int) ($legacy_event['guess_type'] ?? 0) : 0;
    $legacy_revealed_type = $legacy_event ? (int) ($legacy_event['revealed_type'] ?? 0) : 0;
    $legacy_guess_correct = $legacy_event ? (int) ($legacy_event['guess_correct'] ?? 0) : 0;
    $legacy_first_receiver_id = $legacy_event ? (int) ($legacy_event['receiver_id'] ?? 0) : 0;
    $legacy_prophet_gain = 0;
    if ($legacy_prophet_id > 0 && $legacy_prophet_id === (int) $primary_id) {
      $legacy_prophet_gain = (int) $primary_gain_n;
    } else if ($legacy_prophet_id > 0 && $legacy_prophet_id === (int) $secondary_id) {
      $legacy_prophet_gain = (int) $secondary_gain_n;
    }
    $legacy_guess_type_name = ($legacy_guess_type > 0) ? $this->getBelieverTypeLabel((int) $legacy_guess_type) : '';
    $legacy_revealed_type_name = ($legacy_revealed_type > 0) ? $this->getBelieverTypeLabel((int) $legacy_revealed_type) : '';
    $resolved_log = $this->getProphetPredictionResolveLog((array) ($legacy_event ?: []), (int) $legacy_prophet_visible, (string) $legacy_prophet_name, self::getPlayerNameById((int) $drawer_id));

    $this->notifyAllPlayersTr('prophetPredictionResolved', $resolved_log, [
      'drawer_id' => (int) $drawer_id,
      'drawer_name' => self::getPlayerNameById((int) $drawer_id),
      'prophet_id' => (int) $legacy_prophet_id,
      'prophet_name' => (string) $legacy_prophet_name,
      'prophet_visible' => (int) $legacy_prophet_visible,
      'source_key' => $source_key,
      'source_name' => $source_name,
      'requested_draw_n' => (int) $requested_draw_n,
      'drawer_gain_n' => (int) $drawer_gain_n,
      'prophet_gain_n' => (int) $legacy_prophet_gain,
      'guess_type' => (int) $legacy_guess_type,
      'guess_type_name' => $legacy_guess_type_name,
      'revealed_type' => (int) $legacy_revealed_type,
      'revealed_type_name' => $legacy_revealed_type_name,
      'guess_correct' => (int) $legacy_guess_correct,
      'first_receiver_id' => (int) $legacy_first_receiver_id,
      'remaining_draw_n' => (int) $remaining_draw_n,
      'primary_prophet_id' => (int) $public_primary_id,
      'primary_prophet_name' => (string) $public_primary_name,
      'primary_prophet_visible' => (int) $primary_visible,
      'primary_guess_type' => (int) $primary_guess_type,
      'primary_gain_n' => (int) $primary_gain_n,
      'secondary_prophet_id' => (int) $public_secondary_id,
      'secondary_prophet_name' => (string) $public_secondary_name,
      'secondary_prophet_visible' => (int) $secondary_visible,
      'secondary_guess_type' => (int) $secondary_guess_type,
      'secondary_gain_n' => (int) $secondary_gain_n,
      'secondary_target_index' => (int) $secondary_target_index,
      'prediction_events' => array_values($public_events),
      'prophet_flow_phase' => (string) $phase,
      'clear_previous_prediction' => (int) $clear_previous_prediction
    ]);
  }

  function notifyProphetPredictionPrivateHands(int $drawer_id, int $primary_id, int $secondary_id, array $drawer_cards, array $primary_cards, array $secondary_cards): void
  {
    if (!empty($drawer_cards)) {
      $this->notifyPlayerTr($drawer_id, 'newBelievers', '', array('cards' => array_values($drawer_cards)));
    }
    if ($primary_id > 0 && !empty($primary_cards)) {
      $this->notifyPlayerTr($primary_id, 'newBelievers', '', array('cards' => array_values($primary_cards)));
    }
    if ($secondary_id > 0 && !empty($secondary_cards)) {
      $this->notifyPlayerTr($secondary_id, 'newBelievers', '', array('cards' => array_values($secondary_cards)));
    }
  }

  function resolveAndRouteSecondaryProphetPromptIfPending(
    int $drawer_id,
    int $draw_count,
    int $primary_id,
    int $primary_guess_stored,
    int $primary_guess_type,
    int $primary_visible,
    int $secondary_id,
    int $secondary_visible,
    int $source_code
  ): bool {
    if ($drawer_id <= 0 || $primary_id <= 0 || $secondary_id <= 0) return false;
    if ($draw_count <= 0 || $primary_guess_type <= 0) return false;
    if ($this->isProphetStoredGuessResolved((int) $primary_guess_stored)) return false;
    $secondary_guess_stored = (int) self::getGameStateValue('prophet_pending_secondary_guess_type');
    if ((int) $this->getProphetStoredGuessBase((int) $secondary_guess_stored) !== 0) return false;

    $source_key = $this->getProphetPendingSourceKey((int) $source_code);
    $source_name = ($source_key === 'divine_inspire') ? clienttranslate('Divine Inspiration') : clienttranslate('Have a Charity');
    $drawn_cards = array_values($this->believer_cards->pickCards(1, 'deck', (int) $drawer_id));
    $drawn_total = (int) count($drawn_cards);
    $first_event = null;
    $drawer_cards = [];
    $primary_cards = [];
    $guess_correct = 0;

    if ($drawn_total > 0) {
      $card = $drawn_cards[0];
      $revealed_type = (int) ($card['type'] ?? 0);
      $guess_correct = ($revealed_type === (int) $primary_guess_type) ? 1 : 0;
      $receiver_id = (int) $drawer_id;
      if ($guess_correct === 1) {
        $this->believer_cards->moveCard((int) $card['id'], 'hand', (int) $primary_id);
        $moved = $this->believer_cards->getCard((int) $card['id']);
        $primary_cards[] = $moved ? $moved : $card;
        $receiver_id = (int) $primary_id;
      } else {
        $drawer_cards[] = $card;
      }
      $first_event = [
        'predictor_id' => (int) $primary_id,
        'ability_source' => 'prophet',
        'draw_index' => 1,
        'guess_type' => (int) $primary_guess_type,
        'revealed_type' => (int) $revealed_type,
        'guess_correct' => (int) $guess_correct,
        'receiver_id' => (int) $receiver_id
      ];
    }

    self::setGameStateValue('prophet_pending_primary_guess_type', (int) $this->encodeResolvedProphetStoredGuess((int) $primary_guess_stored, (int) $guess_correct));
    $remaining_after_primary = max(0, (int) $draw_count - (int) $drawn_total);
    self::setGameStateValue('prophet_pending_draw_count', (int) $remaining_after_primary);

    if ($first_event !== null) {
      $this->notifyProphetPredictionResolvedEvent(
        (int) $drawer_id,
        $source_key,
        $source_name,
        (int) $draw_count,
        (int) count($drawer_cards),
        (int) $primary_id,
        (int) $primary_visible,
        (int) $primary_guess_type,
        (int) count($primary_cards),
        (int) $secondary_id,
        (int) $secondary_visible,
        0,
        0,
        2,
        [$first_event],
        0,
        'partial',
        0
      );
      $this->notifyProphetPredictionPrivateHands((int) $drawer_id, (int) $primary_id, (int) $secondary_id, $drawer_cards, $primary_cards, []);
    }

    if ($remaining_after_primary <= 0) {
      self::setGameStateValue('prophet_pending_secondary_guess_type', 7);
      return false;
    }

    $this->routeProphetResponderToPromptOrGuess((int) $secondary_id, (int) $primary_id);
    return true;
  }

  function getPrimaryProphetPlayerForDrawer(int $drawer_id): int
  {
    $players = $this->getSortedPlayerIds();
    foreach ($players as $pid) {
      $pid = (int) $pid;
      if ($pid === (int) $drawer_id) continue;
      $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $pid");
      // Prophet reactions should not depend on current leader/follower role.
      // If a player's native Prophet exists and is not sealed, they remain the
      // primary Prophet responder for draw interrupts.
      if ($sealed === 1) continue;
      $skill_card = $this->getPlayerSkillCard($pid);
      if ($skill_card && (int) $skill_card['type'] === 4) {
        return (int) $pid;
      }
    }
    return 0;
  }

  function getReactiveNativeProphetSourceForDrawer(int $drawer_id, int $primary_id = 0): int
  {
    $drawer_id = (int) $drawer_id;
    $primary_id = (int) $primary_id;

    if (
      $primary_id > 0 &&
      (int) $this->getSkillTypeInPlayerHandByPlayer((int) $primary_id) === 4 &&
      $this->isSkillRevealed((int) $primary_id)
    ) {
      return (int) $primary_id;
    }

    if (
      $drawer_id > 0 &&
      (int) $this->getSkillTypeInPlayerHandByPlayer((int) $drawer_id) === 4 &&
      $this->isSkillRevealed((int) $drawer_id)
    ) {
      return (int) $drawer_id;
    }

    $players = $this->getSortedPlayerIds();
    foreach ($players as $pid) {
      $pid = (int) $pid;
      if ($pid <= 0 || $pid === (int) $primary_id) continue;
      $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $pid");
      if ($sealed === 1) continue;
      if (
        (int) $this->getSkillTypeInPlayerHandByPlayer((int) $pid) === 4 &&
        $this->isSkillRevealed((int) $pid)
      ) {
        return (int) $pid;
      }
    }

    return 0;
  }

  function getSecondaryProphetCopyPlayerForDrawer(int $drawer_id, int $primary_id = 0): int
  {
    $drawer_id = (int) $drawer_id;
    $primary_id = (int) $primary_id;
    $gate_owner = (int) $this->getGateTruthOwnerId();
    if ($gate_owner <= 0 || $gate_owner === $drawer_id || $gate_owner === $primary_id) return 0;
    $drawer_is_native_prophet = (
      $drawer_id > 0 &&
      (int) $this->getSkillTypeInPlayerHandByPlayer((int) $drawer_id) === 4
    );
    // UX/rules lock: when Prophet draws for themselves, do not interrupt draw flow
    // if Gate of Truth has already copied Prophet. Only allow the reactive "copy now"
    // window in this self-draw case.
    if ($drawer_is_native_prophet && $this->canPlayerUseCopiedSkillAbility((int) $gate_owner, 4)) {
      return 0;
    }
    if ($this->canPlayerUseCopiedSkillAbility((int) $gate_owner, 4)) return (int) $gate_owner;
    $native_prophet_source_id = (int) $this->getReactiveNativeProphetSourceForDrawer((int) $drawer_id, (int) $primary_id);
    if (
      $native_prophet_source_id > 0 &&
      (int) $this->getReactiveGateTruthSourceForProphet((int) $gate_owner, (int) $native_prophet_source_id) > 0
    ) {
      return (int) $gate_owner;
    }
    return 0;
  }

  function getReactiveGateTruthSourceForProphet(int $gate_owner_id, int $native_prophet_player_id): int
  {
    $gate_owner_id = (int) $gate_owner_id;
    $native_prophet_player_id = (int) $native_prophet_player_id;
    if ($gate_owner_id <= 0 || $native_prophet_player_id <= 0) return 0;
    if ($gate_owner_id === (int) $native_prophet_player_id) return 0;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $gate_owner_id) !== 9) return 0;
    if (!$this->canPlayerMirrorCopiedSkillIdentity((int) $gate_owner_id, 4)) return 0;
    if ($this->canPlayerUseCopiedSkillAbility((int) $gate_owner_id, 4)) return 0;
    if ($this->isGateTruthUsedThisTurn((int) $gate_owner_id)) return 0;
    if ($this->isGateTruthSkillTypeAlreadyCopied(4)) return 0;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $native_prophet_player_id) !== 4) return 0;
    if (!$this->isSkillRevealed((int) $native_prophet_player_id)) return 0;

    return (int) $native_prophet_player_id;
  }

  function tryActivateReactiveGateTruthCopyForProphet(int $gate_owner_id, int $native_prophet_player_id): bool
  {
    $gate_owner_id = (int) $gate_owner_id;
    $native_prophet_player_id = (int) $native_prophet_player_id;
    if ($gate_owner_id <= 0 || $native_prophet_player_id <= 0) return false;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $gate_owner_id) !== 9) return false;
    if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $native_prophet_player_id) !== 4) return false;
    if (!$this->isSkillRevealed((int) $native_prophet_player_id)) return false;
    if (!$this->canPlayerMirrorCopiedSkillIdentity((int) $gate_owner_id, 4)) return false;

    if ($this->canPlayerUseCopiedSkillAbility((int) $gate_owner_id, 4)) {
      return true;
    }
    if ($this->isGateTruthUsedThisTurn((int) $gate_owner_id)) return false;
    if ($this->isGateTruthSkillTypeAlreadyCopied(4)) return false;

    $skill_card = $this->getPlayerSkillCard((int) $gate_owner_id);
    if (!$skill_card || (int) ($skill_card['type'] ?? 0) !== 9) return false;

    $new_uses = (int) $this->incrementSkillUseCount($skill_card, 1);
    $this->setGateTruthCopiedSkillContext((int) $gate_owner_id, 4, (int) $native_prophet_player_id);
    $this->markGateTruthSkillTypeCopied(4);
    $this->markGateTruthUsedThisTurn((int) $gate_owner_id);
    $this->revealSkillAndNotifyIfNeeded((int) $gate_owner_id, 9);

    $copied_skill_name = isset($this->skill_labels[4]['name'])
      ? (string) $this->skill_labels[4]['name']
      : clienttranslate('The Prophet');

    $this->notifyAllPlayersTr(
      'skillGateTruthCopied',
      clienttranslate('${player_name} uses Gate of Truth and copies ${target_name}\'s skill ${skill_name}.'),
      [
        'player_id' => (int) $gate_owner_id,
        'player_name' => self::getPlayerNameById((int) $gate_owner_id),
        'target_id' => (int) $native_prophet_player_id,
        'target_name' => self::getPlayerNameById((int) $native_prophet_player_id),
        'copied_skill_type' => 4,
        'skill_name' => (string) $copied_skill_name,
        'uses' => (int) $new_uses,
        'skill_state_actor' => $this->getSkillStateForPlayer((int) $gate_owner_id)
      ]
    );
    $this->notifyPlayerTr((int) $gate_owner_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer((int) $gate_owner_id)
    ]);
    return $this->canPlayerUseCopiedSkillAbility((int) $gate_owner_id, 4);
  }

  function getProphetPredictTargetIndexForResponder(int $responder_id): int
  {
    $responder_id = (int) $responder_id;
    $primary_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
    $secondary_id = (int) self::getGameStateValue('prophet_pending_secondary_player_id');
    if ($responder_id > 0 && $responder_id === $primary_id) {
      return 1;
    }
    if ($responder_id > 0 && $responder_id === $secondary_id) {
      $primary_guess = (int) $this->normalizeProphetStoredGuessType((int) self::getGameStateValue('prophet_pending_primary_guess_type'));
      // If real Prophet predicts, Gate-copied Prophet targets draw #2; otherwise it targets draw #1.
      return ($primary_id > 0 && $primary_guess > 0) ? 2 : 1;
    }
    return 1;
  }

  function queueProphetPredictionIfNeeded(int $drawer_id, int $draw_count, string $source_card, int $source_extra = 0): bool
  {
    $draw_count = max(0, (int) $draw_count);
    $deck_count = (int) $this->believer_cards->countCardInLocation('deck');
    if ($deck_count <= 0) return false;
    $draw_count = min((int) $draw_count, (int) $deck_count);
    if ($draw_count <= 0) return false;

    $primary_id = (int) $this->getPrimaryProphetPlayerForDrawer((int) $drawer_id);
    $secondary_id = (int) $this->getSecondaryProphetCopyPlayerForDrawer((int) $drawer_id, (int) $primary_id);
    if ($primary_id <= 0 && $secondary_id <= 0) return false;

    $first_responder_id = ($primary_id > 0) ? (int) $primary_id : (int) $secondary_id;
    $source_code = ((string) $source_card === 'divine_inspire') ? 2 : 1;
    self::setGameStateValue('prophet_pending_drawer_id', (int) $drawer_id);
    self::setGameStateValue('prophet_pending_draw_count', (int) $draw_count);
    self::setGameStateValue('prophet_pending_source', (int) $source_code);
    self::setGameStateValue('prophet_pending_prophet_id', (int) $first_responder_id);
    self::setGameStateValue('prophet_pending_guess_type', 0);
    self::setGameStateValue('prophet_pending_extra', max(0, (int) $source_extra));
    self::setGameStateValue('prophet_pending_primary_player_id', (int) $primary_id);
    self::setGameStateValue('prophet_pending_secondary_player_id', (int) $secondary_id);
    self::setGameStateValue('prophet_pending_primary_guess_type', 0);
    self::setGameStateValue('prophet_pending_secondary_guess_type', 0);

    $this->notifyProphetPredictionStarted();
    // Important: do not switch active player directly inside activeplayer state.
    // Route through a game state handoff first, then enter Prophet prompt/guess.
    $this->gamestate->nextState('prophetInterrupt');
    return true;
  }

  function stRouteProphetInterrupt()
  {
    $drawer_id = (int) self::getGameStateValue('prophet_pending_drawer_id');
    $responder_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    $primary_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
    if ($drawer_id <= 0 || $responder_id <= 0) {
      $this->clearProphetPendingContext();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    // Game-state context: safe place to switch active player to responder.
    $this->switchActivePlayerSafely((int) $responder_id);
    if ((int) self::getActivePlayerId() !== (int) $responder_id) {
      throw new feException("Prophet interrupt handoff failed: unable to activate responder player.");
    }

    $is_primary_prophet = ($responder_id > 0 && $responder_id === $primary_id);
    if ($is_primary_prophet && $this->isSkillRevealed((int) $responder_id)) {
      $this->gamestate->nextState('prophetGuess');
      return;
    }
    $this->gamestate->nextState('prophetPrompt');
  }

  function notifyProphetPredictionStarted(): void
  {
    $drawer_id = (int) self::getGameStateValue('prophet_pending_drawer_id');
    $draw_count = max(0, (int) self::getGameStateValue('prophet_pending_draw_count'));
    $source_code = (int) self::getGameStateValue('prophet_pending_source');
    $source_key = $this->getProphetPendingSourceKey($source_code);
    $primary_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
    $secondary_id = (int) self::getGameStateValue('prophet_pending_secondary_player_id');
    $this->notifyAllPlayersTr('prophetPredictionStarted', clienttranslate('The Prophet prediction starts before draw continues.'), [
      'drawer_id' => (int) $drawer_id,
      'drawer_name' => self::getPlayerNameById((int) $drawer_id),
      'draw_count' => (int) $draw_count,
      'source_key' => $source_key,
      'primary_prophet_id' => (int) $primary_id,
      'secondary_prophet_id' => (int) $secondary_id
    ]);
  }

  function isHolyRebirthUsedThisTurn(int $player_id): bool
  {
    return $this->isPlayerFlagSetByMaskKey('holy_rebirth_turn_used_mask', (int) $player_id);
  }

  function markHolyRebirthUsedThisTurn(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('holy_rebirth_turn_used_mask', (int) $player_id, true);
  }

  function clearHolyRebirthUsedThisTurn(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('holy_rebirth_turn_used_mask', (int) $player_id, false);
  }

  function getWarDeathCounter(int $player_id): int
  {
    $ids = $this->getSortedPlayerIds();
    $index = array_search((int) $player_id, $ids, true);
    if ($index === false) return 0;
    $base = 8;
    $pack = (int) self::getGameStateValue('war_death_counter_pack');
    for ($i = 0; $i < (int) $index; $i++) {
      $pack = intdiv($pack, $base);
    }
    return (int) ($pack % $base);
  }

  function setWarDeathCounter(int $player_id, int $count): void
  {
    $ids = $this->getSortedPlayerIds();
    $index = array_search((int) $player_id, $ids, true);
    if ($index === false) return;
    $base = 8;
    $count = max(0, min(7, (int) $count));

    $factor = 1;
    for ($i = 0; $i < (int) $index; $i++) {
      $factor *= $base;
    }
    $pack = (int) self::getGameStateValue('war_death_counter_pack');
    $current = (int) (intdiv($pack, $factor) % $base);
    $pack -= $current * $factor;
    $pack += $count * $factor;
    self::setGameStateValue('war_death_counter_pack', (int) $pack);
  }

  function resetAllWarDeathCounters(): void
  {
    self::setGameStateValue('war_death_counter_pack', 0);
  }

  function addWarDeathCounter(int $player_id, int $delta = 1): int
  {
    $current = $this->getWarDeathCounter($player_id);
    $next = max(0, min(7, $current + (int) $delta));
    $this->setWarDeathCounter($player_id, $next);
    return (int) $next;
  }

  function rememberHolyRebirthRoundDeathBurst(int $player_id, int $deaths_in_one_resolution): int
  {
    // For Holy Rebirth memory, accumulate deaths within this round window
    // (until this player's next turn starts), capped by packed counter capacity.
    return (int) $this->addWarDeathCounter((int) $player_id, (int) $deaths_in_one_resolution);
  }

  function getNextBelieverDiscardOrderArg(): int
  {
    return 1 + (int) self::getUniqueValueFromDB(
      "SELECT COALESCE(MAX(card_location_arg), 0) FROM believer_cards WHERE card_location = 'discard'"
    );
  }

  function normalizeBelieverDiscardOrderArgs(): int
  {
    $discard_order_sql = 'location_arg DESC, ' . 'card_id DESC';
    $discard_cards_newest_first = array_values(
      $this->believer_cards->getCardsInLocation('discard', null, $discard_order_sql)
    );
    if (empty($discard_cards_newest_first)) {
      return 0;
    }

    // Keep visible top order stable: reindex from oldest -> newest so newest keeps highest arg.
    $discard_cards_oldest_first = array_reverse($discard_cards_newest_first);
    $next_arg = 0;
    foreach ($discard_cards_oldest_first as $card) {
      $card_id = (int) ($card['id'] ?? 0);
      if ($card_id <= 0) continue;
      $next_arg += 1;
      $this->believer_cards->moveCard((int) $card_id, 'discard', (int) $next_arg);
    }

    return (int) $next_arg;
  }

  function moveBelieverCardToDiscardWithOwnerMeta(int $card_id, int $owner_id): void
  {
    $card_id = (int) $card_id;
    $owner_id = (int) $owner_id;
    if ($card_id <= 0 || $owner_id <= 0) return;

    $next_arg = (int) $this->getNextBelieverDiscardOrderArg();
    $this->believer_cards->moveCard((int) $card_id, 'discard', (int) $next_arg);
    // Store last owner id in type_arg for owner-specific Holy Rebirth restore.
    self::DbQuery("UPDATE believer_cards SET card_type_arg = $owner_id WHERE card_id = $card_id");
  }

  function moveBelieverCardsToDiscardWithOwnerMeta(array $card_ids): void
  {
    foreach ($card_ids as $raw_id) {
      $card_id = (int) $raw_id;
      if ($card_id <= 0) continue;
      $card = $this->believer_cards->getCard((int) $card_id);
      if (!$card) continue;
      $owner_id = (int) ($card['location_arg'] ?? 0);
      if ($owner_id <= 0) {
        $owner_id = (int) ($card['type_arg'] ?? 0);
      }
      if ($owner_id > 0) {
        $this->moveBelieverCardToDiscardWithOwnerMeta((int) $card_id, (int) $owner_id);
        continue;
      }
      $next_arg = (int) $this->getNextBelieverDiscardOrderArg();
      $this->believer_cards->moveCard((int) $card_id, 'discard', (int) $next_arg);
    }
  }

  function setHolyRebirthPendingCardIds(array $card_ids): void
  {
    $ids = array_values(array_filter(array_map('intval', $card_ids), function ($v) {
      return (int) $v > 0;
    }));
    self::setGameStateValue('holy_rebirth_pending_card_1', (int) ($ids[0] ?? 0));
    self::setGameStateValue('holy_rebirth_pending_card_2', (int) ($ids[1] ?? 0));
    self::setGameStateValue('holy_rebirth_pending_card_3', (int) ($ids[2] ?? 0));
  }

  function getHolyRebirthPendingCardIds(): array
  {
    $ids = [
      (int) self::getGameStateValue('holy_rebirth_pending_card_1'),
      (int) self::getGameStateValue('holy_rebirth_pending_card_2'),
      (int) self::getGameStateValue('holy_rebirth_pending_card_3')
    ];
    return array_values(array_filter($ids, function ($v) {
      return (int) $v > 0;
    }));
  }

  function getRecentDiscardedBelieversByOwner(int $owner_id, int $limit = 3): array
  {
    $owner_id = (int) $owner_id;
    $limit = max(1, (int) $limit);
    if ($owner_id <= 0) return [];

    $discard_cards = array_values($this->believer_cards->getCardsInLocation('discard', null, 'location_arg DESC'));
    $owned_cards = array_values(array_filter($discard_cards, function ($card) use ($owner_id) {
      return (int) ($card['type_arg'] ?? 0) === (int) $owner_id;
    }));
    if (count($owned_cards) > $limit) {
      $owned_cards = array_slice($owned_cards, 0, $limit);
    }
    return array_values($owned_cards);
  }

  function getHolyRebirthSourceKey(int $code): string
  {
    if ((int) $code === 2) return 'faith_war';
    if ((int) $code === 3) return 'witch_hunt';
    return 'karboom';
  }

  function getHolyRebirthSourceName(string $source_key): string
  {
    if ((string) $source_key === 'faith_war') return clienttranslate('Faith War');
    if ((string) $source_key === 'witch_hunt') return clienttranslate('Witch Hunt');
    return clienttranslate('KABOOM!');
  }

  function clearHolyRebirthPendingContext(): void
  {
    self::setGameStateValue('holy_rebirth_pending_player_id', 0);
    self::setGameStateValue('holy_rebirth_pending_deaths', 0);
    self::setGameStateValue('holy_rebirth_pending_source', 0);
    self::setGameStateValue('holy_rebirth_pending_resume_player', 0);
    self::setGameStateValue('holy_rebirth_pending_resume_mode', 0);
    self::setGameStateValue('holy_rebirth_pending_use', 0);
    $this->setHolyRebirthPendingCardIds([]);
  }

  function queueHolyRebirthPromptIfEligible(int $candidate_player_id, int $deaths, string $source_key, int $resume_player_id, int $resume_mode): bool
  {
    if ((int) $deaths < 3) return false;
    if ((int) $candidate_player_id <= 0) return false;

    $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $candidate_player_id");
    $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $candidate_player_id");
    if ($role !== 0 || $sealed === 1) return false;
    if ($this->isHolyRebirthUsedThisTurn((int) $candidate_player_id)) return false;

    $skill_card = $this->getPlayerSkillCard((int) $candidate_player_id);
    $has_native_holy_rebirth = ($skill_card && (int) $skill_card['type'] === 5);
    $has_copied_holy_rebirth = $this->canPlayerUseCopiedSkillAbility((int) $candidate_player_id, 5);
    if (!$has_native_holy_rebirth && !$has_copied_holy_rebirth) {
      // Reactive Gate of Truth: if a revealed native Holy Rebirth exists,
      // Gate owner can choose to copy+trigger immediately in this interrupt window.
      if ((int) $this->getReactiveGateTruthSourceForHolyRebirth((int) $candidate_player_id) <= 0) {
        return false;
      }
    }
    if ((int) $this->believer_cards->countCardInLocation('discard') <= 0) return false;

    $candidate_cards = $this->getRecentDiscardedBelieversByOwner((int) $candidate_player_id, 3);
    if (empty($candidate_cards)) return false;

    $normalized_source = (string) $source_key;
    $source_code = 1;
    if ($normalized_source === 'faith_war') {
      $source_code = 2;
    } elseif ($normalized_source === 'witch_hunt') {
      $source_code = 3;
    }
    self::setGameStateValue('holy_rebirth_pending_player_id', (int) $candidate_player_id);
    self::setGameStateValue('holy_rebirth_pending_deaths', (int) $deaths);
    self::setGameStateValue('holy_rebirth_pending_source', (int) $source_code);
    self::setGameStateValue('holy_rebirth_pending_resume_player', (int) $resume_player_id);
    self::setGameStateValue('holy_rebirth_pending_resume_mode', (int) $resume_mode);
    self::setGameStateValue('holy_rebirth_pending_use', 0);
    $this->setHolyRebirthPendingCardIds(array_map(function ($card) {
      return (int) ($card['id'] ?? 0);
    }, $candidate_cards));

    // Route through a dedicated handoff game state before entering activeplayer prompt.
    // This avoids active-player switching inside action handlers and prevents state errors.
    $this->gamestate->nextState('holyRebirthPrompt');
    return true;
  }

  function stRouteHolyRebirthInterrupt()
  {
    $candidate_player_id = (int) self::getGameStateValue('holy_rebirth_pending_player_id');
    if ($candidate_player_id <= 0) {
      $this->gamestate->nextState('playActionCard');
      return;
    }
    $this->switchActivePlayerSafely((int) $candidate_player_id);
    $this->gamestate->nextState('holyRebirthPrompt');
  }

  function getSkillTypeInPlayerHandByPlayer(int $player_id): int
  {
    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card) return 0;
    return (int) $skill_card['type'];
  }

  function getPlayerIdHoldingSkillType(int $skill_type): int
  {
    $skill_type = (int) $skill_type;
    $players = self::loadPlayersBasicInfos();
    foreach ($players as $pid => $_p) {
      $player_id = (int) $pid;
      if ($this->getSkillTypeInPlayerHandByPlayer($player_id) === $skill_type) {
        return $player_id;
      }
    }
    return 0;
  }

  function isImpermanenceActiveOnPlayer(int $player_id): bool
  {
    return $this->getSkillTypeInPlayerHandByPlayer((int) $player_id) === 12;
  }

  function chooseReplacementSkillCardForImpermanence(int $player_id): ?array
  {
    $players = self::loadPlayersBasicInfos();
    $used_types = [];
    foreach ($players as $pid => $_p) {
      $pid = (int) $pid;
      $card = $this->getPlayerSkillCard($pid);
      if (!$card) continue;
      if ($pid === (int) $player_id) continue;
      $used_types[(int) $card['type']] = true;
    }

    $deck_cards = array_values($this->skill_cards->getCardsInLocation('deck'));
    $eligible = array_values(array_filter($deck_cards, function ($card) use ($used_types) {
      $t = (int) $card['type'];
      return $t !== 12 && !isset($used_types[$t]);
    }));
    if (empty($eligible)) {
      $eligible = array_values(array_filter($deck_cards, function ($card) {
        return (int) $card['type'] !== 12;
      }));
    }
    if (empty($eligible)) {
      $discard_cards = array_values($this->skill_cards->getCardsInLocation('discard'));
      $eligible = array_values(array_filter($discard_cards, function ($card) use ($used_types) {
        $t = (int) $card['type'];
        return $t !== 12 && !isset($used_types[$t]);
      }));
      if (empty($eligible)) {
        $eligible = array_values(array_filter($discard_cards, function ($card) {
          return (int) $card['type'] !== 12;
        }));
      }
      if (empty($eligible)) return null;
    }

    $pick = $eligible[bga_rand(0, count($eligible) - 1)];
    return $this->skill_cards->getCard((int) $pick['id']);
  }

  function clearSkillRevealForPlayer(int $player_id): void
  {
    $this->setPlayerFlagByMaskKey('skill_revealed_mask', (int) $player_id, false);
  }

  function failImpermanenceAndRedrawSkill(int $player_id, string $trigger_key): bool
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return false;
    if (!$this->isImpermanenceActiveOnPlayer($player_id)) return false;

    $old_skill = $this->getPlayerSkillCard($player_id);
    if (!$old_skill || (int) $old_skill['type'] !== 12) return false;
    $new_skill = $this->chooseReplacementSkillCardForImpermanence($player_id);
    if (!$new_skill) {
      throw new BgaVisibleSystemException(clienttranslate("No replacement skill card is available."));
    }

    $old_skill_id = (int) $old_skill['id'];
    $new_skill_id = (int) $new_skill['id'];
    $new_skill_type = (int) $new_skill['type'];
    $old_skill_name = isset($this->skill_labels[12]['name']) ? (string) $this->skill_labels[12]['name'] : clienttranslate('Impermanence of Life');

    if ((string) $old_skill['location'] !== 'hand') return false;
    $this->skill_cards->moveCard($old_skill_id, 'discard');
    $this->skill_cards->moveCard($new_skill_id, 'hand', $player_id);
    $this->clearSkillRevealForPlayer($player_id);

    $this->notifyAllPlayersTr('impermanenceFailed', clienttranslate('${player_name} fails ${skill_name} and redraws a new hidden skill.'), [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById($player_id),
      'skill_name' => $old_skill_name,
      'trigger_key' => (string) $trigger_key
    ]);
    $this->notifyAllPlayersTr('skillHiddenReset', '', [
      'player_id' => (int) $player_id
    ]);
    $this->notifyPlayerTr($player_id, 'skillCardReplaced', '', [
      'old_skill_card_id' => (int) $old_skill_id,
      'new_skill_card' => [
        'id' => (int) $new_skill_id,
        'type' => (int) $new_skill_type
      ],
      'skill_state' => $this->getSkillStateForPlayer($player_id)
    ]);
    return true;
  }

  function getSkillProtectionSnapshot(): array
  {
    $players = self::loadPlayersBasicInfos();
    $physical = [];
    $mental = [];
    foreach ($players as $pid => $_p) {
      $player_id = (int) $pid;
      $physical[$player_id] = $this->isPlayerProtectedFromPhysicalSkill($player_id) ? 1 : 0;
      $mental[$player_id] = $this->isPlayerProtectedFromMentalSkill($player_id) ? 1 : 0;
    }
    return [
      'physical' => $physical,
      'mental' => $mental
    ];
  }

  function assertTargetNotProtectedByAttackKind(int $target_player_id, string $attack_kind): void
  {
    if ($attack_kind === 'physical' && $this->isPlayerProtectedFromPhysicalSkill($target_player_id)) {
      throw new BgaVisibleSystemException(clienttranslate("Target is protected from Physical attacks until their next turn."));
    }
    if ($attack_kind === 'mental' && $this->isPlayerProtectedFromMentalSkill($target_player_id)) {
      throw new BgaVisibleSystemException(clienttranslate("Target is protected from Mental attacks until their next turn."));
    }
  }

  function getSkillDefendedSectsForAoe(int $war_type, int $attacker_sect): array
  {
    if ($war_type !== 3 && $war_type !== 6) {
      return [];
    }
    $sects = [];
    $players = self::loadPlayersBasicInfos();
    foreach ($players as $pid => $_p) {
      $player_id = (int) $pid;
      $sect = (int) $this->getPlayerSect($player_id);
      if ($sect < 0 || $sect === (int) $attacker_sect) continue;
      if ($war_type === 3 && $this->isPlayerProtectedFromPhysicalSkill($player_id)) {
        $sects[$sect] = true;
      }
      if ($war_type === 6 && $this->isPlayerProtectedFromMentalSkill($player_id)) {
        $sects[$sect] = true;
      }
    }
    return array_values(array_map('intval', array_keys($sects)));
  }

  function isPlayerAttackLockedByKarboom(int $player_id): bool
  {
    $pid = (int) $player_id;
    $locked = $this->isPlayerFlagSetByMaskKey('karboom_attack_lock_mask', $pid);
    if (!$locked) return false;

    // KABOOM lock is strictly same-turn/self-turn scoped. If the per-turn
    // usage flag is no longer active, treat any remaining lock bit as stale
    // residue and clear it.
    if (!$this->isKarboomUsedThisTurn((int) $pid)) {
      $this->setPlayerFlagByMaskKey('karboom_attack_lock_mask', (int) $pid, false);
      return false;
    }
    return true;
  }

  function setPlayerAttackLockByKarboom(int $player_id, bool $locked): void
  {
    $this->setPlayerFlagByMaskKey('karboom_attack_lock_mask', (int) $player_id, (bool) $locked);
  }

  function getMaxActionsThisTurn(): int
  {
    $extra = max(0, (int) self::getGameStateValue('extra_action_slots'));
    return 2 + $extra;
  }

  function getPraiseLifeDecisionPendingPlayerId(): int
  {
    return max(0, (int) self::getGameStateValue('praise_life_decision_player_id'));
  }

  function isPraiseLifeDecisionPendingForPlayer(int $player_id): bool
  {
    return ($player_id > 0 && $this->getPraiseLifeDecisionPendingPlayerId() === (int) $player_id);
  }

  function setPraiseLifeDecisionPendingForPlayer(int $player_id): void
  {
    self::setGameStateValue('praise_life_decision_player_id', max(0, (int) $player_id));
  }

  function clearPraiseLifeDecisionPending(): void
  {
    self::setGameStateValue('praise_life_decision_player_id', 0);
  }

  function canOfferPraiseLifeDecisionNow(int $player_id): bool
  {
    if ($player_id <= 0) return false;
    if ($this->getPerformedActionCount() < $this->getMaxActionsThisTurn()) return false;

    $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($role !== 0) return false;
    $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");
    if ($sealed === 1) return false;
    if ($this->isPraiseLifeUsedThisTurn($player_id)) return false;

    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card || (int) $skill_card['type'] !== 13) return false;
    if ($this->believer_cards->countCardInLocation('hand', $player_id) <= 0) return false;

    return true;
  }

  function assertNoPendingPraiseLifeDecision(int $player_id): void
  {
    if ($this->isPraiseLifeDecisionPendingForPlayer($player_id)) {
      throw new BgaVisibleSystemException(clienttranslate("Resolve the Praise of Life decision first."));
    }
  }

  function routeAfterActionWindowCheck(string $continue_transition = 'playActionCard', string $end_transition = 'endTurn'): void
  {
    $player_id = (int) self::getActivePlayerId();
    if ($this->getPerformedActionCount() >= $this->getMaxActionsThisTurn()) {
      if ($this->canOfferPraiseLifeDecisionNow($player_id)) {
        $this->setPraiseLifeDecisionPendingForPlayer($player_id);
        $this->gamestate->nextState($continue_transition);
        return;
      }
      $this->clearPraiseLifeDecisionPending();
      // Keep turn manual: player can still use non-action skills, then choose End Turn.
      $this->gamestate->nextState($continue_transition);
      return;
    }
    $this->clearPraiseLifeDecisionPending();
    $this->gamestate->nextState($continue_transition);
  }

  function hasRemainingActionSlots(): bool
  {
    return $this->getPerformedActionCount() < $this->getMaxActionsThisTurn();
  }

  function assertCanSpendActionSlot(): void
  {
    if (!$this->hasRemainingActionSlots()) {
      throw new BgaVisibleSystemException(clienttranslate("No actions left this turn. Use an available Skill or End Turn."));
    }
  }

  function incrementPerformedActionCount(int $delta = 1): void
  {
    $current = (int) self::getGameStateValue('actions_performed_count');
    $next = max(0, $current + (int) $delta);
    self::setGameStateValue('actions_performed_count', $next);
  }

  function getPlayerOrderStartingFrom(int $start_player_id): array
  {
    $rows = self::getObjectListFromDB("SELECT player_id id FROM player ORDER BY player_no ASC");
    $order = array_map(function ($row) {
      return (int) $row['id'];
    }, $rows);
    if (empty($order)) return [];

    $idx = array_search((int) $start_player_id, $order, true);
    if ($idx === false) return $order;
    return array_merge(array_slice($order, $idx), array_slice($order, 0, $idx));
  }

  function switchActivePlayerSafely(int $target_player_id): void
  {
    $target_player_id = (int) $target_player_id;
    if ($target_player_id <= 0) return;
    $players = self::loadPlayersBasicInfos();
    if (!isset($players[$target_player_id])) return;
    if ((int) self::getActivePlayerId() === $target_player_id) return;

    $rotate_to_target = function () use ($players, $target_player_id) {
      $guard = count($players) + 1;
      while ((int) self::getActivePlayerId() !== $target_player_id && $guard-- > 0) {
        try {
          self::activeNextPlayer();
        } catch (\Throwable $e) {
          $msg = (string) $e->getMessage();
          $transition_error_hint = 'Impossible to change active player during ' . 'activeplayer type state';
          if (stripos($msg, $transition_error_hint) !== false) {
            // Keep flow resilient under transient state timing drift.
            return;
          }
          throw $e;
        }
      }
    };

    $state = $this->getCurrentStateSnapshotSafe();
    $state_type_raw = (is_array($state) && isset($state['type'])) ? $state['type'] : '';
    $state_type = is_string($state_type_raw) ? strtolower(trim($state_type_raw)) : strtolower(trim((string) $state_type_raw));

    // In activeplayer/private contexts, use turn-order rotation only.
    if (
      strpos($state_type, 'activeplayer') !== false ||
      strpos($state_type, 'private') !== false
    ) {
      $rotate_to_target();
      return;
    }

    // In multipleactive contexts, do not force a single active player here.
    if (strpos($state_type, 'multipleactive') !== false) {
      return;
    }

    // In game/manager (and unknown) contexts, also prefer turn-order rotation
    // to avoid intermittent changeActivePlayer timing errors.
    $rotate_to_target();
  }

  function setForcedNextTurnAnchor(int $player_id): void
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return;
    self::setGameStateValue('forced_next_turn_anchor_id', $player_id);
  }

  function consumeForcedNextTurnAnchor(): int
  {
    $player_id = (int) self::getGameStateValue('forced_next_turn_anchor_id');
    self::setGameStateValue('forced_next_turn_anchor_id', 0);
    return (int) $player_id;
  }

  function canPlayerUseSkillNow(int $player_id, int $skill_type, int $uses): array
  {
    $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");

    // Only explicitly implemented skills are usable.
    if (!in_array($skill_type, [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], true)) {
      return [false, clienttranslate("This skill is not available right now.")];
    }

    if ($role === 2) {
      return [false, clienttranslate("Wanderer must snatch a Believer first.")];
    }

    // Purple Hermit is a follower-controlled one-time skill after surrender is finalized.
    if ($skill_type === 1) {
      if ($uses >= 1) {
        return [false, clienttranslate("Purple Hermit can only be used once per game.")];
      }
      if ($role !== 1) {
        return [false, clienttranslate("Purple Hermit can only be used while you are a Follower.")];
      }
      $leader_id = (int) self::getUniqueValueFromDB("SELECT player_leader_id FROM player WHERE player_id = $player_id");
      if ($leader_id <= 0) {
        return [false, clienttranslate("Purple Hermit can only be used after you join another Sect as a Follower.")];
      }
      if (!$this->isPurpleHermitReady((int) $player_id)) {
        return [false, clienttranslate("Purple Hermit becomes available after you join a Sect as a Follower.")];
      }
      if ($this->isPurpleHermitPendingSplit((int) $player_id)) {
        return [false, clienttranslate("Purple Hermit is already active and waiting for your next-turn split resolution.")];
      }
      return [true, ''];
    }

    if ($skill_type === 9) {
      if ($sealed === 1) {
        return [false, clienttranslate("Your skill is sealed right now.")];
      }
      if ($role !== 0) {
        return [false, clienttranslate("You must be a Leader to use this skill.")];
      }
      if (!$this->isGateTruthUsedThisTurn((int) $player_id)) {
        $targets = $this->getGateTruthCopyableTargets((int) $player_id);
        if (empty($targets)) {
          return [false, clienttranslate("No revealed skill can be copied right now.")];
        }
        return [true, ''];
      }
      $copied_skill_type = (int) $this->getGateTruthCopiedSkillTypeForPlayer((int) $player_id);
      if ($copied_skill_type <= 0) {
        return [false, clienttranslate("Gate of Truth copy was already used this turn.")];
      }
      return $this->canPlayerUseGateTruthCopiedSkillNow((int) $player_id, (int) $copied_skill_type);
    }

    if ($sealed === 1) {
      return [false, clienttranslate("Your skill is sealed right now.")];
    }
    if ($role !== 0) {
      return [false, clienttranslate("You must be a Leader to use this skill.")];
    }

    if ($skill_type === 12) {
      return [false, clienttranslate("Impermanence of Life is a passive skill and cannot be manually used.")];
    }

    if ($skill_type === 5) {
      return [false, clienttranslate("Holy Rebirth is a reactive skill and is triggered automatically.")];
    }

    if ($skill_type === 6) {
      return [false, clienttranslate("Ascend with Me is not an active skill and triggers when your Followers draw Action cards.")];
    }

    if ($skill_type === 10) {
      $grave_count = (int) $this->believer_cards->countCardInLocation('discard');
      if ($grave_count <= 0) {
        return [false, clienttranslate("Zombie Army can be chosen when you declare Faith War. Graveyard has no Believers right now.")];
      }
      return [false, clienttranslate("Zombie Army can be chosen when you declare Faith War.")];
    }

    if ($skill_type === 16) {
      return [false, clienttranslate("Karma Reversed is reactive and will prompt during confrontation.")];
    }

    if ($skill_type === 2) {
      if (!$this->hasRemainingActionSlots()) {
        return [false, clienttranslate("No action slots left this turn for KABOOM!.")];
      }
      if (
        $this->hasPerformedActionBit(self::ACTION_BIT_PHYSICAL) ||
        $this->hasPerformedActionBit(self::ACTION_BIT_MENTAL)
      ) {
        return [false, clienttranslate("KABOOM! cannot be used after you have already performed an attack this turn.")];
      }
      if ($this->isKarboomUsedThisTurn($player_id)) {
        return [false, clienttranslate("KABOOM! can only be used once per turn.")];
      }
      if ($this->believer_cards->countCardInLocation('hand', $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use KABOOM!.")];
      }
      return [true, ''];
    }

    if ($skill_type === 3) {
      if ($uses >= 1) {
        return [false, clienttranslate("Headstronger can only be used once per game.")];
      }
      $sect = (int) $this->getPlayerSect((int) $player_id);
      if ($sect < 0) {
        return [false, clienttranslate("No Sect Followers can be expelled right now.")];
      }
      $followers = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect = $sect AND player_role = 1", true));
      if (empty($followers)) {
        return [false, clienttranslate("You currently have no Followers to expel.")];
      }
      return [true, ''];
    }

    if ($skill_type === 13) {
      if ($role !== 0) {
        return [false, clienttranslate("Praise of Life can only be used by a Leader.")];
      }
      if ($this->isPraiseLifeUsedThisTurn($player_id)) {
        return [false, clienttranslate("Praise of Life can only be used once per turn.")];
      }
      if ($this->believer_cards->countCardInLocation('hand', $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use Praise of Life.")];
      }
      return [true, ''];
    }

    if ($skill_type === 8) {
      if ($uses >= 3) {
        return [false, clienttranslate("World Peace can only be used up to 3 times per game.")];
      }
      if ($this->isPlayerProtectedFromPhysicalSkill($player_id)) {
        return [false, clienttranslate("You are already protected from Physical attacks until your next turn.")];
      }
      if ($this->believer_cards->countCardInLocation('hand', $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use World Peace.")];
      }
      return [true, ''];
    }

    if ($skill_type === 7) {
      if ($uses >= 3) {
        return [false, clienttranslate("Eternal Truth can only be used up to 3 times per game.")];
      }
      if ($this->isPlayerProtectedFromMentalSkill($player_id)) {
        return [false, clienttranslate("You are already protected from Mental attacks until your next turn.")];
      }
      if ($this->believer_cards->countCardInLocation('hand', $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use Eternal Truth.")];
      }
      return [true, ''];
    }

    if ($skill_type === 15) {
      if ($uses >= 1) {
        return [false, clienttranslate("Everyone is Equal can only be used once per game.")];
      }
      if ($this->getPerformedActionCount() > 0) {
        return [false, clienttranslate("Everyone is Equal can only be used before any action this turn.")];
      }
      return [true, ''];
    }

    if ($skill_type === 14) {
      if ($uses >= 3) {
        return [false, clienttranslate("Chaos Coming can only be used up to 3 times per game.")];
      }
      return [true, ''];
    }

    if ($skill_type === 11) {
      if ($uses >= 3) {
        return [false, clienttranslate("Soul-Cutting Sword can only be used up to 3 times per game.")];
      }
      return [true, ''];
    }

    return [false, clienttranslate("This skill is not available right now.")];
  }

  function getSkillStateForPlayer(int $player_id): array
  {
    $sealed_now = $this->isPlayerSkillSealed((int) $player_id) ? 1 : 0;
    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card) {
      return [
        'skill_type' => 0,
        'skill_card_id' => 0,
        'is_sealed' => (int) $sealed_now,
        'uses' => 0,
        'can_use' => 0,
        'disabled_reason' => '',
        'karboom_used_this_turn' => 0,
        'attack_locked_by_karboom' => $this->isPlayerAttackLockedByKarboom($player_id) ? 1 : 0,
        'action_hand_limit' => (int) $this->getActionHandLimitForPlayer((int) $player_id),
        'purple_hermit_ready' => 0,
        'purple_hermit_pending_split' => 0,
        'gate_truth_copied_skill_type' => 0,
        'gate_truth_copied_source_player_id' => 0,
        'gate_truth_copied_skill_types' => [],
        'gate_truth_used_this_turn' => 0,
        'gate_truth_copyable_targets' => [],
        'gate_truth_effective_skill_type' => 0
      ];
    }

    $skill_type = (int) $skill_card['type'];
    $uses = $this->getSkillUseCountFromCard($skill_card);
    $can_reason = $this->canPlayerUseSkillNow($player_id, $skill_type, $uses);
    $gate_truth_copied_skill_type = 0;
    $gate_truth_copied_source_player_id = 0;
    $gate_truth_used_this_turn = 0;
    $gate_truth_copyable_targets = [];
    $gate_truth_effective_skill_type = 0;
    if ((int) $skill_type === 9) {
      $gate_truth_copied_skill_type = (int) $this->getGateTruthCopiedSkillTypeForPlayer((int) $player_id);
      $gate_truth_copied_source_player_id = (int) $this->getGateTruthCopiedSourcePlayerIdForPlayer((int) $player_id);
      $gate_truth_used_this_turn = $this->isGateTruthUsedThisTurn((int) $player_id) ? 1 : 0;
      $gate_truth_copyable_targets = $this->getGateTruthCopyableTargets((int) $player_id);
      $gate_truth_effective_skill_type = (int) $this->getGateTruthEffectiveSkillTypeForUse((int) $player_id);
    }

    return [
      'skill_type' => $skill_type,
      'skill_card_id' => (int) $skill_card['id'],
      'is_sealed' => (int) $sealed_now,
      'uses' => (int) $uses,
      'can_use' => $can_reason[0] ? 1 : 0,
      'disabled_reason' => (string) $can_reason[1],
      'karboom_used_this_turn' => $this->isKarboomUsedThisTurn($player_id) ? 1 : 0,
      'praise_life_used_this_turn' => $this->isPraiseLifeUsedThisTurn($player_id) ? 1 : 0,
      'holy_rebirth_used_this_turn' => $this->isHolyRebirthUsedThisTurn($player_id) ? 1 : 0,
      'attack_locked_by_karboom' => $this->isPlayerAttackLockedByKarboom($player_id) ? 1 : 0,
      'protected_physical' => $this->isPlayerProtectedFromPhysicalSkill($player_id) ? 1 : 0,
      'protected_mental' => $this->isPlayerProtectedFromMentalSkill($player_id) ? 1 : 0,
      'action_hand_limit' => (int) $this->getActionHandLimitForPlayer((int) $player_id),
      'purple_hermit_ready' => $this->isPurpleHermitReady((int) $player_id) ? 1 : 0,
      'purple_hermit_pending_split' => $this->isPurpleHermitPendingSplit((int) $player_id) ? 1 : 0,
      'gate_truth_copied_skill_type' => (int) $gate_truth_copied_skill_type,
      'gate_truth_copied_source_player_id' => (int) $gate_truth_copied_source_player_id,
      'gate_truth_copied_skill_types' => ((int) $skill_type === 9) ? $this->getGateTruthCopiedSkillTypeList() : [],
      'gate_truth_used_this_turn' => (int) $gate_truth_used_this_turn,
      'gate_truth_copyable_targets' => array_values($gate_truth_copyable_targets),
      'gate_truth_effective_skill_type' => (int) $gate_truth_effective_skill_type
    ];
  }

  function getBelieverHandTypesForPlayer(int $player_id): array
  {
    $cards = array_values($this->believer_cards->getCardsInLocation('hand', $player_id));
    return array_values(array_map(function ($card) {
      return (int) $card['type'];
    }, $cards));
  }

  function drawRandomBelieverType(array &$pool): int
  {
    $idx = array_rand($pool);
    $type = (int) $pool[$idx];
    unset($pool[$idx]);
    $pool = array_values($pool);
    return $type;
  }

  function randomBelieverPack(int $count = 3): array
  {
    $pack = [];
    for ($i = 0; $i < $count; $i++) {
      $pack[] = (int) mt_rand(1, 5);
    }
    return $pack;
  }

  function resolveFinalWarTieBetweenTwo(int $player_a, int $player_b): int
  {
    $pool_a = $this->getBelieverHandTypesForPlayer($player_a);
    $pool_b = $this->getBelieverHandTypesForPlayer($player_b);
    $entered_infinite_war = false;

    for ($round = 0; $round < 600; $round++) {
      if (empty($pool_a) && empty($pool_b)) {
        $pool_a = $this->randomBelieverPack(3);
        $pool_b = $this->randomBelieverPack(3);
        $entered_infinite_war = true;
      }

      if (empty($pool_a)) return $player_b;
      if (empty($pool_b)) return $player_a;

      $type_a = $this->drawRandomBelieverType($pool_a);
      $type_b = $this->drawRandomBelieverType($pool_b);
      $result = $this->compareBelievers($type_a, $type_b, false); // no bonus in final war

      if ($result['winner'] === 1) {
        $pool_a[] = $type_a; // winner keeps own believer
      } elseif ($result['winner'] === -1) {
        $pool_b[] = $type_b; // winner keeps own believer
      }
      // draw: both believers are lost
    }

    $count_a = count($pool_a);
    $count_b = count($pool_b);
    if ($count_a > $count_b) return $player_a;
    if ($count_b > $count_a) return $player_b;

    // Safety fallback (extremely unlikely): deterministic random tie break
    $winner = (mt_rand(0, 1) === 0) ? $player_a : $player_b;
    $this->notifyAllPlayersTr('finalTieBreakFallback', clienttranslate('Final tie-break reached safety limit; random winner is chosen.'), [
      'winner_id' => (int) $winner,
      'winner_name' => self::getPlayerNameById($winner),
      'entered_infinite_war' => $entered_infinite_war ? 1 : 0
    ]);
    return $winner;
  }

  function getTieBreakerOrder(array $contenders, int $anchor_player_id): array
  {
    $ordered = array_values(array_map('intval', $contenders));
    sort($ordered, SORT_NUMERIC);
    if (empty($ordered)) return [];

    $start_index = 0;
    foreach ($ordered as $i => $pid) {
      if ($pid > $anchor_player_id) {
        $start_index = $i;
        break;
      }
    }

    // If no player id is greater than anchor, start from first one.
    if ($ordered[$start_index] <= $anchor_player_id) {
      $has_greater = false;
      foreach ($ordered as $pid) {
        if ($pid > $anchor_player_id) {
          $has_greater = true;
          break;
        }
      }
      if (!$has_greater) $start_index = 0;
    }

    return array_merge(array_slice($ordered, $start_index), array_slice($ordered, 0, $start_index));
  }

  function resolveFinalConspiracyTie(array $contenders, int $anchor_player_id): int
  {
    $contenders = array_values(array_unique(array_map('intval', $contenders)));
    if (count($contenders) <= 1) return (int) ($contenders[0] ?? 0);
    if (count($contenders) === 2) return $this->resolveFinalWarTieBetweenTwo($contenders[0], $contenders[1]);

    $pools = [];
    foreach ($contenders as $pid) {
      $pools[$pid] = $this->getBelieverHandTypesForPlayer($pid);
    }

    $order = $this->getTieBreakerOrder($contenders, $anchor_player_id);

    for ($cycle = 0; $cycle < 60; $cycle++) {
      $all_empty = true;
      foreach ($contenders as $pid) {
        if (!empty($pools[$pid])) {
          $all_empty = false;
          break;
        }
      }
      if ($all_empty) {
        foreach ($contenders as $pid) {
          $pools[$pid] = $this->randomBelieverPack(3);
        }
      }

      $next_pools = [];
      foreach ($contenders as $pid) $next_pools[$pid] = [];

      $has_cards = true;
      while ($has_cards) {
        $has_cards = false;
        foreach ($order as $attacker_id) {
          if (!in_array($attacker_id, $contenders, true)) continue;
          if (empty($pools[$attacker_id])) continue;
          $has_cards = true;

          $attacker_type = $this->drawRandomBelieverType($pools[$attacker_id]);
          $next_pools[$attacker_id][] = $attacker_type; // attacker always keeps own believer

          foreach ($contenders as $defender_id) {
            if ($defender_id === $attacker_id) continue;
            if (empty($pools[$defender_id])) continue;

            $defender_type = $this->drawRandomBelieverType($pools[$defender_id]);
            $result = $this->compareBelievers($attacker_type, $defender_type, false);

            if ($result['winner'] === 1) {
              $next_pools[$attacker_id][] = $defender_type;
            } else {
              $next_pools[$defender_id][] = $defender_type; // draw or defender win => defender keeps
            }
          }
        }
      }

      $pools = $next_pools;
      $max_count = 0;
      foreach ($contenders as $pid) {
        $max_count = max($max_count, count($pools[$pid]));
      }
      $leaders = array_values(array_filter($contenders, function ($pid) use ($pools, $max_count) {
        return count($pools[$pid]) === $max_count;
      }));

      if (count($leaders) === 1) return (int) $leaders[0];
      if (count($leaders) === 2) return $this->resolveFinalWarTieBetweenTwo((int) $leaders[0], (int) $leaders[1]);

      $contenders = $leaders;
      $order = $this->getTieBreakerOrder($contenders, $anchor_player_id);
    }

    // Safety fallback for extremely long loops.
    $winner = (int) $contenders[array_rand($contenders)];
    $this->notifyAllPlayersTr('finalTieBreakFallback', clienttranslate('Final tie-break reached safety limit; random winner is chosen.'), [
      'winner_id' => (int) $winner,
      'winner_name' => self::getPlayerNameById($winner),
      'entered_infinite_war' => 1
    ]);
    return $winner;
  }

  private function getSectInternalTopBelieverPlayers(int $sect): array
  {
    $members = array_values(array_map('intval', $this->getSectPlayerIds((int) $sect)));
    if (empty($members)) return [];

    $best_count = -1;
    $best_players = [];
    foreach ($members as $pid) {
      $cnt = (int) $this->believer_cards->countCardInLocation('hand', (int) $pid);
      if ($cnt > $best_count) {
        $best_count = $cnt;
        $best_players = [(int) $pid];
      } elseif ($cnt === $best_count) {
        $best_players[] = (int) $pid;
      }
    }
    return array_values(array_unique(array_map('intval', $best_players)));
  }

  private function getSectInternalWinnerByBelievers(int $sect, int $anchor_player_id): int
  {
    $best_players = $this->getSectInternalTopBelieverPlayers((int) $sect);
    if (empty($best_players)) return 0;
    if (count($best_players) === 1) return (int) $best_players[0];

    // Same-sect tie: Leader has priority, then table-order tie-break.
    foreach ($best_players as $pid) {
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $pid");
      if ($role === 0) return (int) $pid;
    }
    $ordered = $this->getTieBreakerOrder($best_players, (int) $anchor_player_id);
    return (int) ($ordered[0] ?? $best_players[0] ?? 0);
  }

  private function getOrderedSectsByLeaderTieBreak(array $sects, int $anchor_player_id): array
  {
    $sects = array_values(array_unique(array_map('intval', $sects)));
    if (empty($sects)) return [];

    $leader_by_sect = [];
    foreach ($sects as $sect) {
      $leader_by_sect[(int) $sect] = (int) $this->getSectLeaderId((int) $sect, 0);
    }
    $leader_ids = array_values(array_filter(array_map('intval', $leader_by_sect), function ($pid) {
      return $pid > 0;
    }));
    if (empty($leader_ids)) return $sects;

    $ordered_leaders = $this->getTieBreakerOrder($leader_ids, (int) $anchor_player_id);
    $ordered_sects = [];
    foreach ($ordered_leaders as $leader_id) {
      foreach ($leader_by_sect as $sect => $mapped_leader_id) {
        if ((int) $mapped_leader_id !== (int) $leader_id) continue;
        $ordered_sects[] = (int) $sect;
      }
    }
    foreach ($sects as $sect) {
      if (!in_array((int) $sect, $ordered_sects, true)) {
        $ordered_sects[] = (int) $sect;
      }
    }
    return array_values(array_unique(array_map('intval', $ordered_sects)));
  }

  function computeWinnerWhenBelieverDeckEmpty(int $anchor_player_id): array
  {
    $rows = self::getObjectListFromDB("SELECT player_id, player_role, player_sect FROM player");
    $sect_members = [];
    $sect_totals = [];

    foreach ($rows as $row) {
      $pid = (int) $row['player_id'];
      $role = (int) $row['player_role'];
      $sect = (int) $row['player_sect'];
      if ($role === 2 || $sect < 0) continue; // skip Wanderers

      if (!isset($sect_members[$sect])) $sect_members[$sect] = [];
      $sect_members[$sect][] = $pid;
      if (!isset($sect_totals[$sect])) $sect_totals[$sect] = 0;
      $sect_totals[$sect] += (int) $this->believer_cards->countCardInLocation('hand', $pid);
    }

    if (empty($sect_totals)) {
      $all_players = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
      return [
        'winner_id' => (int) $all_players[array_rand($all_players)],
        'tie_break_used' => false
      ];
    }

    // 1) Compare Sect total Believers.
    $max_sect_total = max($sect_totals);
    $top_sects = array_values(array_filter(array_keys($sect_totals), function ($sect) use ($sect_totals, $max_sect_total) {
      return (int) $sect_totals[$sect] === (int) $max_sect_total;
    }));

    // 2) If totals tie, Sect with more active members (Leader/Follower) wins tie-break.
    if (count($top_sects) > 1) {
      $max_member_count = -1;
      foreach ($top_sects as $sect) {
        $member_n = (int) count($sect_members[(int) $sect] ?? []);
        if ($member_n > $max_member_count) $max_member_count = $member_n;
      }
      $top_sects = array_values(array_filter($top_sects, function ($sect) use ($sect_members, $max_member_count) {
        return (int) count($sect_members[(int) $sect] ?? []) === (int) $max_member_count;
      }));
    }

    // Single winning Sect -> resolve by personal Believers inside that Sect.
    // Internal ties enter manual final struggle flow; they are not auto-awarded.
    if (count($top_sects) === 1) {
      $winner_sect = (int) ($top_sects[0] ?? 0);
      $sect_top_players = $this->getSectInternalTopBelieverPlayers((int) $winner_sect);
      if (count($sect_top_players) === 1) {
        return [
          'winner_id' => (int) $sect_top_players[0],
          'tie_break_used' => false
        ];
      }
      if (count($sect_top_players) === 2) {
        $ordered = $this->getTieBreakerOrder($sect_top_players, (int) $anchor_player_id);
        return [
          'winner_id' => 0,
          'tie_break_used' => true,
          'manual_final_war' => 1,
          'final_war_player_a' => (int) ($ordered[0] ?? $sect_top_players[0]),
          'final_war_player_b' => (int) ($ordered[1] ?? $sect_top_players[1])
        ];
      }
      if (count($sect_top_players) >= 3) {
        $ordered = $this->getTieBreakerOrder($sect_top_players, (int) $anchor_player_id);
        return [
          'winner_id' => 0,
          'tie_break_used' => true,
          'manual_final_conspiracy' => 1,
          'final_conspiracy_players' => array_values(array_map('intval', $ordered))
        ];
      }
      $winner_id = (int) $this->getSectInternalWinnerByBelievers((int) $winner_sect, (int) $anchor_player_id);
      return [
        'winner_id' => (int) $winner_id,
        'tie_break_used' => false
      ];
    }

    // Two tied Sects -> manual final Sect-vs-Sect war (representatives can be reassigned each round).
    if (count($top_sects) === 2) {
      $ordered_sects = $this->getOrderedSectsByLeaderTieBreak($top_sects, (int) $anchor_player_id);
      $sect_a = (int) ($ordered_sects[0] ?? $top_sects[0]);
      $sect_b = (int) ($ordered_sects[1] ?? $top_sects[1]);
      return [
        'winner_id' => 0,
        'tie_break_used' => true,
        'manual_final_sect_war' => 1,
        'final_war_sect_a' => (int) $sect_a,
        'final_war_sect_b' => (int) $sect_b
      ];
    }

    // 3+ tied Sects -> one contender per Sect enters Final Conspiracy cycle.
    $candidate_players = [];
    foreach ($top_sects as $sect) {
      $pid = (int) $this->getSectInternalWinnerByBelievers((int) $sect, (int) $anchor_player_id);
      if ($pid > 0) $candidate_players[] = (int) $pid;
    }
    $candidate_players = array_values(array_unique(array_map('intval', $candidate_players)));
    if (count($candidate_players) >= 3) {
      $ordered = $this->getTieBreakerOrder($candidate_players, (int) $anchor_player_id);
      $manual_candidates = array_values(array_filter($ordered, function ($pid) {
        return (int) $this->believer_cards->countCardInLocation('hand', (int) $pid) > 0;
      }));
      if (count($manual_candidates) >= 3) {
        return [
          'winner_id' => 0,
          'tie_break_used' => true,
          'manual_final_conspiracy' => 1,
          'final_conspiracy_players' => array_values(array_map('intval', $manual_candidates))
        ];
      }
    }

    return [
      'winner_id' => $this->resolveFinalConspiracyTie($candidate_players, (int) $anchor_player_id),
      'tie_break_used' => true
    ];
  }

  function getGameEndReasonCode(string $reason): int
  {
    if ($reason === 'unification') return 1;
    if ($reason === 'believer_deck_empty') return 2;
    if ($reason === 'impermanence') return 3;
    if ($reason === 'final_struggle') return 4;
    if ($reason === 'follower_usurp') return 5;
    if ($reason === 'sect_internal_most_believers') return 6;
    return 0;
  }

  private function clearFinalDuelSummarySnapshot(): void
  {
    self::setGameStateValue('final_duel_player_a_id', 0);
    self::setGameStateValue('final_duel_player_b_id', 0);
    self::setGameStateValue('final_duel_pre_counts_pack', 0);
  }

  private function clearFinalStruggleSummarySnapshot(): void
  {
    self::setGameStateValue('final_struggle_contender_mask', 0);
    self::setGameStateValue('final_struggle_pre_counts_pack_1', 0);
    self::setGameStateValue('final_struggle_pre_counts_pack_2', 0);
  }

  private function captureFinalStruggleSummarySnapshot(array $contender_ids): void
  {
    $contender_ids = array_values(array_unique(array_filter(array_map('intval', $contender_ids), function ($pid) {
      return (int) $pid > 0;
    })));
    if (empty($contender_ids)) {
      $this->clearFinalStruggleSummarySnapshot();
      return;
    }

    $contender_set = array_fill_keys($contender_ids, true);
    $ordered_players = array_values(array_map('intval', $this->getSortedPlayerIds()));
    $mask = 0;
    $pack_1 = 0;
    $pack_2 = 0;

    foreach ($ordered_players as $index => $pid) {
      $pid = (int) $pid;
      if ($pid <= 0 || !isset($contender_set[$pid])) continue;
      $bit = (int) $this->getPlayerBit((int) $pid);
      if ($bit > 0) {
        $mask |= (int) $bit;
      }

      // Keep 7 bits per player slot (0..127) to preserve realistic believer counts.
      $count = (int) $this->believer_cards->countCardInLocation('hand', (int) $pid);
      $count = max(0, min(127, (int) $count));
      $shift = ((int) $index % 4) * 7;
      if ((int) $index < 4) {
        $pack_1 |= ((int) $count << (int) $shift);
      } elseif ((int) $index < 8) {
        $pack_2 |= ((int) $count << (int) $shift);
      }
    }

    self::setGameStateValue('final_struggle_contender_mask', (int) $mask);
    self::setGameStateValue('final_struggle_pre_counts_pack_1', (int) $pack_1);
    self::setGameStateValue('final_struggle_pre_counts_pack_2', (int) $pack_2);
  }

  private function getFinalStruggleSummarySnapshot(): array
  {
    $mask = (int) self::getGameStateValue('final_struggle_contender_mask');
    $pack_1 = (int) self::getGameStateValue('final_struggle_pre_counts_pack_1');
    $pack_2 = (int) self::getGameStateValue('final_struggle_pre_counts_pack_2');
    $ordered_players = array_values(array_map('intval', $this->getSortedPlayerIds()));
    $contender_ids = [];
    $pre_counts_by_player = [];

    foreach ($ordered_players as $index => $pid) {
      $pid = (int) $pid;
      if ($pid <= 0) continue;
      $bit = (int) $this->getPlayerBit((int) $pid);
      if ($bit <= 0 || (($mask & $bit) === 0)) continue;
      $contender_ids[] = (int) $pid;
      if ((int) $index < 8) {
        $shift = ((int) $index % 4) * 7;
        $pack = ((int) $index < 4) ? (int) $pack_1 : (int) $pack_2;
        $pre_counts_by_player[(int) $pid] = (int) (($pack >> (int) $shift) & 0x7F);
      }
    }

    return [
      'contender_ids' => array_values(array_unique(array_map('intval', $contender_ids))),
      'pre_counts_by_player' => $pre_counts_by_player
    ];
  }

  private function captureFinalDuelSummarySnapshot(int $player_a, int $player_b): void
  {
    $player_a = (int) $player_a;
    $player_b = (int) $player_b;
    if ($player_a <= 0 || $player_b <= 0 || $player_a === $player_b) {
      $this->clearFinalDuelSummarySnapshot();
      return;
    }

    $count_a = (int) $this->believer_cards->countCardInLocation('hand', (int) $player_a);
    $count_b = (int) $this->believer_cards->countCardInLocation('hand', (int) $player_b);
    $count_a = max(0, min(255, (int) $count_a));
    $count_b = max(0, min(255, (int) $count_b));

    self::setGameStateValue('final_duel_player_a_id', (int) $player_a);
    self::setGameStateValue('final_duel_player_b_id', (int) $player_b);
    self::setGameStateValue('final_duel_pre_counts_pack', (int) ($count_a + ($count_b << 8)));
  }

  private function getFinalDuelSummarySnapshot(): array
  {
    $player_a = (int) self::getGameStateValue('final_duel_player_a_id');
    $player_b = (int) self::getGameStateValue('final_duel_player_b_id');
    $packed = (int) self::getGameStateValue('final_duel_pre_counts_pack');
    return [
      'player_a_id' => (int) $player_a,
      'player_b_id' => (int) $player_b,
      'pre_count_a' => (int) ($packed & 0xFF),
      'pre_count_b' => (int) (($packed >> 8) & 0xFF)
    ];
  }

  function concludeGameWithWinner(int $winner_id, string $reason): bool
  {
    $winner_id = (int) $winner_id;
    if ($winner_id <= 0) return false;

    $players = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
    $final_contender_set = [];
    if ($reason === 'final_struggle') {
      $final_struggle_summary = $this->getFinalStruggleSummarySnapshot();
      foreach (array_values(array_map('intval', $final_struggle_summary['contender_ids'] ?? [])) as $pid) {
        if ((int) $pid > 0) {
          $final_contender_set[(int) $pid] = true;
        }
      }
    }
    $score_snapshot = [];
    foreach ($players as $pid) {
      $base_score = (int) $this->believer_cards->countCardInLocation('hand', (int) $pid);
      $final_score = $base_score
        + (((int) $pid === (int) $winner_id) ? 1000 : 0)
        + (isset($final_contender_set[(int) $pid]) ? 100 : 0);
      $this->bga->playerScore->set((int) $pid, (int) $final_score);
      $this->setStat((int) $base_score, 'believers_endgame', (int) $pid);
      $score_snapshot[] = ['player_id' => (int) $pid, 'score' => (int) $final_score, 'believers' => (int) $base_score];
    }

    $this->notifyAllPlayersTr('gameEndedByRule', clienttranslate('${winner_name} wins the game!'), [
      'winner_id' => (int) $winner_id,
      'winner_name' => self::getPlayerNameById((int) $winner_id),
      'reason' => (string) $reason,
      'scores' => $score_snapshot
    ]);

    self::setGameStateValue('game_end_winner_id', (int) $winner_id);
    self::setGameStateValue('game_end_reason_code', (int) $this->getGameEndReasonCode((string) $reason));
    self::setGameStateValue('impermanence_showcase_player_id', ($reason === 'impermanence') ? (int) $winner_id : 0);
    $this->gamestate->nextState('endHand');
    return true;
  }

  function startManualFinalStruggle(int $player_a, int $player_b): void
  {
    $player_a = (int) $player_a;
    $player_b = (int) $player_b;
    if ($player_a <= 0 || $player_b <= 0 || $player_a === $player_b) {
      $players = array_values(array_map('intval', array_keys(self::loadPlayersBasicInfos())));
      $fallback = (int) ($players[0] ?? 0);
      if ($fallback > 0) {
        $this->concludeGameWithWinner((int) $fallback, 'final_struggle');
      }
      return;
    }

    $this->captureFinalDuelSummarySnapshot((int) $player_a, (int) $player_b);
    $this->captureFinalStruggleSummarySnapshot([(int) $player_a, (int) $player_b]);
    self::setGameStateValue('war_attacker_id', (int) $player_a);
    self::setGameStateValue('war_defender_id', (int) $player_b);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 10); // 10 = Final War (manual 1v1 duel)
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', (int) $player_a);
    self::setGameStateValue('war_rep_defender_id', (int) $player_b);
    self::setGameStateValue('debate_round', 0);
    $this->incStat(1, 'final_struggles_started');
    $this->clearFaithWarParticipants();
    $this->clearCombatSkillState();
    $this->clearWarCardSourceFlags();

    $this->notifyAllPlayersTr(
      'finalStruggleStart',
      clienttranslate('Believer deck is empty. ${player_a_name} and ${player_b_name} enter Final War.'),
      [
        'mode' => 'duel',
        'player_a_id' => (int) $player_a,
        'player_b_id' => (int) $player_b,
        'player_a_name' => self::getPlayerNameById((int) $player_a),
        'player_b_name' => self::getPlayerNameById((int) $player_b)
      ]
    );

    $this->gamestate->nextState('finalStruggleDuel');
  }

  function startManualFinalSectWar(int $sect_a, int $sect_b, int $anchor_player_id): void
  {
    $sect_a = (int) $sect_a;
    $sect_b = (int) $sect_b;
    if ($sect_a < 0 || $sect_b < 0 || $sect_a === $sect_b) {
      $fallback_players = array_values(array_map('intval', array_keys(self::loadPlayersBasicInfos())));
      $fallback = (int) ($fallback_players[0] ?? 0);
      if ($fallback > 0) {
        $this->concludeGameWithWinner((int) $fallback, 'final_struggle');
      }
      return;
    }
    $this->clearFinalDuelSummarySnapshot();
    $sect_a_players = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_role != 2 AND player_sect = $sect_a", true));
    $sect_b_players = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_role != 2 AND player_sect = $sect_b", true));
    $this->captureFinalStruggleSummarySnapshot(array_values(array_unique(array_merge($sect_a_players, $sect_b_players))));

    $leader_a = (int) $this->getSectLeaderId((int) $sect_a, (int) $anchor_player_id);
    $leader_b = (int) $this->getSectLeaderId((int) $sect_b, (int) $anchor_player_id);
    if ($leader_a <= 0 || $leader_b <= 0 || $leader_a === $leader_b) {
      $winner_id = 0;
      if ($leader_a > 0 && $leader_b <= 0) $winner_id = (int) $this->getSectInternalWinnerByBelievers((int) $sect_a, (int) $anchor_player_id);
      if ($leader_b > 0 && $leader_a <= 0) $winner_id = (int) $this->getSectInternalWinnerByBelievers((int) $sect_b, (int) $anchor_player_id);
      if ($winner_id <= 0) {
        $contenders = array_values(array_filter(array_map('intval', [
          $this->getSectInternalWinnerByBelievers((int) $sect_a, (int) $anchor_player_id),
          $this->getSectInternalWinnerByBelievers((int) $sect_b, (int) $anchor_player_id)
        ]), function ($pid) {
          return $pid > 0;
        }));
        if (count($contenders) >= 2) {
          $winner_id = (int) $this->resolveFinalWarTieBetweenTwo((int) $contenders[0], (int) $contenders[1]);
        } elseif (count($contenders) === 1) {
          $winner_id = (int) $contenders[0];
        }
      }
      if ($winner_id > 0) {
        $this->concludeGameWithWinner((int) $winner_id, 'final_struggle');
      }
      return;
    }

    self::setGameStateValue('war_attacker_id', (int) $leader_a);
    self::setGameStateValue('war_defender_id', (int) $leader_b);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 12); // 12 = Final War (Sect vs Sect war)
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('debate_round', 0);
    $this->incStat(1, 'final_struggles_started');
    $this->clearFaithWarParticipants();
    $this->clearCombatSkillState();
    $this->clearWarCardSourceFlags();

    $this->notifyAllPlayersTr(
      'finalStruggleStart',
      clienttranslate('Believer deck is empty. ${sect_a_name} and ${sect_b_name} enter Final War.'),
      [
        'mode' => 'sect_war',
        'sect_a' => (int) $sect_a,
        'sect_b' => (int) $sect_b,
        'sect_a_name' => (string) $this->getSectDisplayName((int) $sect_a),
        'sect_b_name' => (string) $this->getSectDisplayName((int) $sect_b),
        'player_a_id' => (int) $leader_a,
        'player_b_id' => (int) $leader_b,
        'player_a_name' => self::getPlayerNameById((int) $leader_a),
        'player_b_name' => self::getPlayerNameById((int) $leader_b)
      ]
    );

    $this->gamestate->nextState('finalStruggleSectWar');
  }

  function startManualFinalConspiracy(array $contenders, int $anchor_player_id): void
  {
    $this->clearFinalDuelSummarySnapshot();
    $this->clearFinalStruggleSummarySnapshot();
    $contenders = array_values(array_unique(array_map('intval', $contenders)));
    if (count($contenders) < 3) {
      $winner = (int) $this->resolveFinalConspiracyTie($contenders, (int) $anchor_player_id);
      $this->concludeGameWithWinner((int) $winner, 'final_struggle');
      return;
    }

    $ordered = $this->getTieBreakerOrder($contenders, (int) $anchor_player_id);
    $this->captureFinalStruggleSummarySnapshot($ordered);
    $playable = $this->getFinalConspiracyPlayableContenders($ordered);
    if (count($playable) < 3) {
      $winner = (int) $this->resolveFinalConspiracyTie($contenders, (int) $anchor_player_id);
      $this->concludeGameWithWinner((int) $winner, 'final_struggle');
      return;
    }

    $first_attacker = (int) $playable[0];

    $this->setPlayersMarkedByMaskKey('war_participant_mask', $ordered);
    self::setGameStateValue('war_type', 11); // 11 = Final Struggle Conspiracy Loop
    self::setGameStateValue('war_attacker_id', (int) $first_attacker);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', (int) $first_attacker);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('debate_round', 0);
    $this->incStat(1, 'final_struggles_started');
    $this->clearAoeDefendedSectMask();
    $this->clearCombatSkillState();
    $this->clearWarCardSourceFlags();

    $this->notifyAllPlayersTr(
      'finalStruggleStart',
      clienttranslate('Believer deck is empty. ${n} contenders enter Final Struggle (Conspiracy cycle).'),
      [
        'mode' => 'conspiracy',
        'n' => (int) count($ordered),
        'contender_ids' => array_values(array_map('intval', $ordered)),
        'score_rows' => $this->getFinalConspiracyScoreRows($ordered)
      ]
    );
    $this->gamestate->nextState('finalConspiracyBattle');
  }

  function moveAllFinalConspiracyPoolsToDiscard(): void
  {
    $pool_cards = array_merge(
      $this->believer_cards->getCardsInLocation('finalconspcap'),
      $this->believer_cards->getCardsInLocation('finalconspused'),
      $this->believer_cards->getCardsInLocation('finalconspdraw')
    );
    if (!empty($pool_cards)) {
      $this->believer_cards->moveCards(array_map(function ($card) {
        return (int) $card['id'];
      }, $pool_cards), 'discard');
    }
  }

  function startFinalWarFromConspiracyTie(int $player_a, int $player_b, array $contenders, array $score_rows): void
  {
    $player_a = (int) $player_a;
    $player_b = (int) $player_b;
    $contenders = array_values(array_unique(array_map('intval', $contenders)));

    // Clear remaining contender hand cards first: Final War should be based on
    // surviving "captured winners" from the final Conspiracy cycle.
    foreach ($contenders as $pid) {
      if ($pid <= 0) continue;
      $hand_cards = $this->believer_cards->getCardsInLocation('hand', (int) $pid);
      if (empty($hand_cards)) continue;
      $this->believer_cards->moveCards(array_map(function ($card) {
        return (int) $card['id'];
      }, $hand_cards), 'discard');
    }

    $captured_cards = $this->believer_cards->getCardsInLocation('finalconspcap');
    $cards_to_discard = [];
    foreach ($captured_cards as $card) {
      $cid = (int) ($card['id'] ?? 0);
      $owner = (int) ($card['location_arg'] ?? 0);
      if ($cid <= 0) continue;
      if ($owner === $player_a || $owner === $player_b) {
        $this->believer_cards->moveCard($cid, 'hand', (int) $owner);
      } else {
        $cards_to_discard[] = (int) $cid;
      }
    }
    if (!empty($cards_to_discard)) {
      $this->believer_cards->moveCards(array_values(array_unique($cards_to_discard)), 'discard');
    }

    $other_pool_cards = array_merge(
      $this->believer_cards->getCardsInLocation('finalconspused'),
      $this->believer_cards->getCardsInLocation('finalconspdraw')
    );
    if (!empty($other_pool_cards)) {
      $this->believer_cards->moveCards(array_map(function ($card) {
        return (int) $card['id'];
      }, $other_pool_cards), 'discard');
    }

    $this->captureFinalDuelSummarySnapshot((int) $player_a, (int) $player_b);
    $existing_final_summary = $this->getFinalStruggleSummarySnapshot();
    if (empty($existing_final_summary['contender_ids'])) {
      $this->captureFinalStruggleSummarySnapshot(!empty($contenders) ? $contenders : [(int) $player_a, (int) $player_b]);
    }
    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0");
    self::setGameStateValue('war_attacker_id', (int) $player_a);
    self::setGameStateValue('war_defender_id', (int) $player_b);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 10); // Final War
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', (int) $player_a);
    self::setGameStateValue('war_rep_defender_id', (int) $player_b);
    self::setGameStateValue('debate_round', 0);
    $this->setPlayersMarkedByMaskKey('war_participant_mask', []);
    $this->clearAoeDefendedSectMask();
    $this->clearCombatSkillState();
    $this->clearWarCardSourceFlags();

    $this->notifyAllPlayersTr(
      'finalStruggleConspiracyEnd',
      clienttranslate('Final Struggle Conspiracy ends tied. ${player_a_name} and ${player_b_name} proceed to Final War.'),
      [
        'winner_id' => 0,
        'winner_name' => '',
        'score_rows' => array_values($score_rows),
        'tie_to_war' => 1,
        'player_a_id' => (int) $player_a,
        'player_b_id' => (int) $player_b,
        'player_a_name' => self::getPlayerNameById((int) $player_a),
        'player_b_name' => self::getPlayerNameById((int) $player_b)
      ]
    );
    $this->notifyAllPlayersTr(
      'finalStruggleStart',
      clienttranslate('${player_a_name} and ${player_b_name} enter Final War.'),
      [
        'mode' => 'duel',
        'from_conspiracy' => 1,
        'player_a_id' => (int) $player_a,
        'player_b_id' => (int) $player_b,
        'player_a_name' => self::getPlayerNameById((int) $player_a),
        'player_b_name' => self::getPlayerNameById((int) $player_b)
      ]
    );

    $this->notifyPublicCountsSync();
    $this->gamestate->nextState('finalStruggleDuel');
  }

  function startFinalInfiniteWar(int $player_a, int $player_b): bool
  {
    $player_a = (int) $player_a;
    $player_b = (int) $player_b;
    if ($player_a <= 0 || $player_b <= 0 || $player_a === $player_b) return false;

    $removed_cards = $this->believer_cards->getCardsInLocation('removed');
    if (!empty($removed_cards)) {
      $this->believer_cards->moveCards(array_map(function ($card) {
        return (int) $card['id'];
      }, $removed_cards), 'discard');
    }
    $discard_cards = array_values($this->believer_cards->getCardsInLocation('discard'));
    if (count($discard_cards) < 6) return false;

    $pool = array_values($discard_cards);
    $picked = [];
    for ($i = 0; $i < 6; $i++) {
      if (empty($pool)) break;
      $idx = bga_rand(0, count($pool) - 1);
      $picked[] = $pool[$idx];
      array_splice($pool, $idx, 1);
    }
    if (count($picked) < 6) return false;

    $ids_a = array_map(function ($card) {
      return (int) $card['id'];
    }, array_slice($picked, 0, 3));
    $ids_b = array_map(function ($card) {
      return (int) $card['id'];
    }, array_slice($picked, 3, 3));
    $this->believer_cards->moveCards($ids_a, 'hand', (int) $player_a);
    $this->believer_cards->moveCards($ids_b, 'hand', (int) $player_b);

    $cards_a = array_values(array_filter(array_map(function ($cid) {
      return $this->believer_cards->getCard((int) $cid);
    }, $ids_a)));
    $cards_b = array_values(array_filter(array_map(function ($cid) {
      return $this->believer_cards->getCard((int) $cid);
    }, $ids_b)));
    if (!empty($cards_a)) {
      $this->notifyPlayerTr((int) $player_a, 'newBelievers', '', ['cards' => $cards_a]);
    }
    if (!empty($cards_b)) {
      $this->notifyPlayerTr((int) $player_b, 'newBelievers', '', ['cards' => $cards_b]);
    }

    $this->notifyAllPlayersTr(
      'finalInfiniteWarStarted',
      clienttranslate('Final War is tied. ${player_a_name} and ${player_b_name} receive 3 random Believers each for Infinite War.'),
      [
        'player_a_id' => (int) $player_a,
        'player_b_id' => (int) $player_b,
        'player_a_name' => self::getPlayerNameById((int) $player_a),
        'player_b_name' => self::getPlayerNameById((int) $player_b)
      ]
    );
    $this->notifyPublicCountsSync();
    return true;
  }

  function finalizeFinalConspiracyContest(bool $is_incomplete): void
  {
    $contenders = $this->getFinalConspiracyContenders();
    if (empty($contenders)) {
      $contenders = array_values(array_map('intval', array_keys(self::loadPlayersBasicInfos())));
    }
    $score_rows = $this->getFinalConspiracyScoreRows($contenders);
    $max_stolen = -1;
    foreach ($score_rows as $row) {
      $max_stolen = max($max_stolen, (int) ($row['stolen'] ?? 0));
    }
    $leaders = [];
    foreach ($score_rows as $row) {
      if ((int) ($row['stolen'] ?? 0) !== (int) $max_stolen) continue;
      $leaders[] = (int) ($row['player_id'] ?? 0);
    }
    $leaders = array_values(array_filter(array_values(array_unique(array_map('intval', $leaders))), function ($pid) {
      return $pid > 0;
    }));

    $winner_id = 0;
    if (count($leaders) === 1) {
      $winner_id = (int) $leaders[0];
    } elseif (count($leaders) === 2) {
      $this->startFinalWarFromConspiracyTie((int) $leaders[0], (int) $leaders[1], $contenders, $score_rows);
      return;
    } elseif (count($leaders) > 2) {
      $winner_id = (int) $this->resolveFinalConspiracyTie($leaders, (int) self::getGameStateValue('war_attacker_id'));
    }
    if ($winner_id <= 0) {
      $fallback = array_values(array_filter(array_map('intval', $contenders), function ($pid) {
        return $pid > 0;
      }));
      if (empty($fallback)) {
        $fallback = array_values(array_map('intval', array_keys(self::loadPlayersBasicInfos())));
      }
      $winner_id = (int) ($fallback[array_rand($fallback)] ?? 0);
    }

    $this->moveAllFinalConspiracyPoolsToDiscard();

    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0");
    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('debate_round', 0);
    $this->setPlayersMarkedByMaskKey('war_participant_mask', []);
    $this->clearAoeDefendedSectMask();
    $this->clearCombatSkillState();
    $this->clearWarCardSourceFlags();

    $this->notifyAllPlayersTr(
      'finalStruggleConspiracyEnd',
      $is_incomplete
        ? clienttranslate('Final Struggle (Conspiracy cycle) ends early.')
        : clienttranslate('Final Struggle (Conspiracy cycle) ends.'),
      [
        'winner_id' => (int) $winner_id,
        'winner_name' => self::getPlayerNameById((int) $winner_id),
        'score_rows' => array_values($score_rows)
      ]
    );
    $this->notifyPublicCountsSync();
    $this->concludeGameWithWinner((int) $winner_id, 'final_struggle');
  }

  function checkAndResolveGameEnd(int $anchor_player_id): bool
  {
    $leader_ids = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_role = 0", true));
    $wanderer_count = (int) self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_role = 2");
    $winner_id = 0;
    $reason = '';
    $end_triggered = false;
    $manual_final_war_pending = false;
    $manual_final_war_a = 0;
    $manual_final_war_b = 0;
    $manual_final_sect_war_pending = false;
    $manual_final_sect_war_a = 0;
    $manual_final_sect_war_b = 0;
    $manual_final_conspiracy_pending = false;
    $manual_final_conspiracy_players = [];

    // Base end triggers.
    if ($wanderer_count === 0 && count($leader_ids) === 1) {
      // Special instant-unification victory: only one leader remains and no wanderer exists.
      $winner_id = (int) $leader_ids[0];
      $reason = 'unification';
      $end_triggered = true;
    } elseif ($this->believer_cards->countCardInLocation('deck') <= 0) {
      // Standard end: believer deck is empty.
      $winner_result = $this->computeWinnerWhenBelieverDeckEmpty($anchor_player_id);
      $winner_id = (int) ($winner_result['winner_id'] ?? 0);
      $reason = 'believer_deck_empty';
      if (!empty($winner_result['manual_final_war'])) {
        $manual_final_war_pending = true;
        $manual_final_war_a = (int) ($winner_result['final_war_player_a'] ?? 0);
        $manual_final_war_b = (int) ($winner_result['final_war_player_b'] ?? 0);
        $reason = 'final_struggle';
      } elseif (!empty($winner_result['manual_final_sect_war'])) {
        $manual_final_sect_war_pending = true;
        $manual_final_sect_war_a = (int) ($winner_result['final_war_sect_a'] ?? 0);
        $manual_final_sect_war_b = (int) ($winner_result['final_war_sect_b'] ?? 0);
        $reason = 'final_struggle';
      } elseif (!empty($winner_result['manual_final_conspiracy'])) {
        $manual_final_conspiracy_pending = true;
        $manual_final_conspiracy_players = array_values(array_map('intval', $winner_result['final_conspiracy_players'] ?? []));
        $reason = 'final_struggle';
      } elseif (!empty($winner_result['tie_break_used'])) {
        $reason = 'final_struggle';
      } else {
        $winner_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $winner_id");
        $winner_sect = (int) $this->getPlayerSect((int) $winner_id);
        $winner_sect_member_count = 0;
        if ($winner_sect >= 0) {
          $winner_sect_member_count = (int) self::getUniqueValueFromDB(
            "SELECT COUNT(*) FROM player WHERE player_role != 2 AND player_sect = $winner_sect"
          );
        }
        if ($winner_sect_member_count >= 2) {
          $reason = 'sect_internal_most_believers';
        } elseif ($winner_role === 1) {
          $reason = 'follower_usurp';
        }
      }
      $end_triggered = true;
    }

    if (!$end_triggered) return false;

    // Impermanence of Life special win applies only when a base end trigger is reached.
    $players = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
    foreach ($players as $pid) {
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $pid");
      if ($role !== 0) continue;
      if (!$this->isImpermanenceActiveOnPlayer((int) $pid)) continue;
      $cnt = (int) $this->believer_cards->countCardInLocation('hand', (int) $pid);
      if ($cnt >= 5) {
        $winner_id = (int) $pid;
        $reason = 'impermanence';
        break;
      }
    }

    if ($winner_id <= 0 && $manual_final_war_pending && $reason !== 'impermanence') {
      $this->startManualFinalStruggle((int) $manual_final_war_a, (int) $manual_final_war_b);
      return true;
    }
    if ($winner_id <= 0 && $manual_final_sect_war_pending && $reason !== 'impermanence') {
      $this->startManualFinalSectWar((int) $manual_final_sect_war_a, (int) $manual_final_sect_war_b, (int) $anchor_player_id);
      return true;
    }
    if ($winner_id <= 0 && $manual_final_conspiracy_pending && $reason !== 'impermanence') {
      $this->startManualFinalConspiracy($manual_final_conspiracy_players, (int) $anchor_player_id);
      return true;
    }

    return $this->concludeGameWithWinner((int) $winner_id, (string) $reason);
  }

  function startSurrenderFlowFor(int $bankrupt_id, bool $reset_rejected = true): void
  {
    $this->clearSurrenderAcceptanceSnapshot();
    self::setGameStateValue('surrender_bankrupt_id', (int) $bankrupt_id);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);
    if ($reset_rejected) {
      $this->setRejectedMask(0);
    }
    $this->gamestate->nextState('routeSurrenderBankrupt');
  }

  function clearSurrenderAcceptanceSnapshot(): void
  {
    self::setGameStateValue('surrender_prev_role', 0);
    self::setGameStateValue('surrender_prev_leader_id', 0);
    self::setGameStateValue('surrender_prev_sect', 0);
    self::setGameStateValue('surrender_prev_skill_sealed', 0);
    self::setGameStateValue('surrender_prev_snapshot_ready', 0);
  }

  function storeSurrenderAcceptanceSnapshot(int $player_id): void
  {
    $player_id = (int) $player_id;
    $row = self::getObjectFromDB(
      "SELECT player_role, player_leader_id, player_sect, player_is_skill_sealed FROM player WHERE player_id = $player_id"
    );
    if (!$row) {
      $this->clearSurrenderAcceptanceSnapshot();
      return;
    }
    self::setGameStateValue('surrender_prev_role', (int) $row['player_role']);
    self::setGameStateValue('surrender_prev_leader_id', (int) $row['player_leader_id']);
    self::setGameStateValue('surrender_prev_sect', (int) $row['player_sect']);
    self::setGameStateValue('surrender_prev_skill_sealed', (int) $row['player_is_skill_sealed']);
    self::setGameStateValue('surrender_prev_snapshot_ready', 1);
  }

  function restoreSurrenderAcceptanceSnapshot(int $player_id): void
  {
    if ((int) self::getGameStateValue('surrender_prev_snapshot_ready') !== 1) {
      throw new BgaVisibleSystemException(clienttranslate("Surrender rollback snapshot is missing."));
    }

    $player_id = (int) $player_id;
    $prev_role = (int) self::getGameStateValue('surrender_prev_role');
    $prev_leader_id = (int) self::getGameStateValue('surrender_prev_leader_id');
    $prev_sect = (int) self::getGameStateValue('surrender_prev_sect');
    $prev_sealed = (int) self::getGameStateValue('surrender_prev_skill_sealed');

    $leader_sql = ($prev_leader_id > 0) ? (string) $prev_leader_id : 'NULL';
    self::DbQuery(
      "UPDATE player
       SET player_role = $prev_role,
           player_leader_id = $leader_sql,
           player_sect = $prev_sect,
           player_is_skill_sealed = $prev_sealed
       WHERE player_id = $player_id"
    );
    $this->clearSurrenderAcceptanceSnapshot();
  }

  function getPlayerIdentitySyncRow(int $player_id): ?array
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) {
      return null;
    }
    $row = self::getObjectFromDB(
      "SELECT player_id, player_name, player_role, player_sect, player_leader_id, player_is_skill_sealed
       FROM player
       WHERE player_id = $player_id"
    );
    if (!$row) {
      return null;
    }
    return [
      'player_id' => (int) $row['player_id'],
      'player_name' => (string) $row['player_name'],
      'player_role' => (int) $row['player_role'],
      'player_sect' => (int) $row['player_sect'],
      'player_leader_id' => (int) $row['player_leader_id'],
      'player_is_skill_sealed' => (int) $row['player_is_skill_sealed'],
      'player_skip_turn_count' => (int) $this->getSkipTurnCounter((int) $row['player_id']),
    ];
  }

  function notifyPlayerIdentitySync(array $player_ids, string $reason = ''): void
  {
    $rows = [];
    $seen = [];
    foreach ($player_ids as $pid) {
      $pid = (int) $pid;
      if ($pid <= 0 || isset($seen[$pid])) {
        continue;
      }
      $seen[$pid] = 1;
      $row = $this->getPlayerIdentitySyncRow($pid);
      if ($row !== null) {
        $rows[] = $row;
      }
    }
    if (empty($rows)) {
      return;
    }
    $args = ['players' => $rows];
    if ($reason !== '') {
      $args['reason'] = $reason;
    }
    $this->notifyAllPlayersTr('playerIdentitySync', '', $args);
  }

  function stRouteSurrenderBankrupt()
  {
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    if ($bankrupt_id > 0) {
      $this->switchActivePlayerSafely((int) $bankrupt_id);
      if (empty($this->getAvailableSurrenderLeaders((int) $bankrupt_id))) {
        $this->doBecomeWanderer((int) $bankrupt_id);
        self::setGameStateValue('surrender_bankrupt_id', 0);
        self::setGameStateValue('surrender_target_leader_id', 0);
        self::setGameStateValue('surrender_support_mode', 0);
        $this->setRejectedMask(0);
        $this->setForcedNextTurnAnchor((int) $bankrupt_id);
        $this->gamestate->nextState('nextPlayer');
        return;
      }
    }
    $this->gamestate->nextState('surrenderOrWanderer');
  }

  function stRouteSurrenderLeaderResponse()
  {
    $leader_id = (int) self::getGameStateValue('surrender_target_leader_id');
    if ($leader_id > 0) {
      $this->switchActivePlayerSafely((int) $leader_id);
    }
    $this->gamestate->nextState('surrenderLeaderResponse');
  }

  function doBecomeWanderer(int $player_id): void
  {
    $this->failImpermanenceAndRedrawSkill((int) $player_id, 'become_wanderer');
    $this->clearPurpleHermitStatus((int) $player_id);

    $cards = $this->action_cards->getCardsInLocation('hand', $player_id);
    $card_ids = array_map(function ($c) {
      return $c['id'];
    }, $cards);
    $discard_cards = [];
    foreach ($cards as $card) {
      if (!$card) continue;
      $discard_cards[] = [
        'id' => (int) ($card['id'] ?? 0),
        'type' => (string) ($card['type'] ?? ''),
      ];
    }
    if (!empty($card_ids)) {
      $this->action_cards->moveCards($card_ids, 'discard');
      $this->notifyAllPlayersTr(
        'actionCardsDiscarded',
        clienttranslate('${player_name} discards ${count} action card(s).'),
        [
          'player_name' => self::getPlayerNameById($player_id),
          'player_id' => (int) $player_id,
          'n' => (int) count($card_ids),
          'count' => (int) count($card_ids),
          'card_ids' => array_values(array_map('intval', $card_ids)),
          'cards' => array_values($discard_cards),
          'consume_discard_action' => 0,
        ]
      );
    }
    $this->notifyPlayerTr((int) $player_id, 'syncActionHand', '', [
      'cards' => []
    ]);

    $sql = "UPDATE player SET player_role = 2, player_leader_id = NULL, player_sect = -1, player_wanderer_turns = 0 WHERE player_id = $player_id";
    self::DbQuery($sql);
    $this->notifyPlayerIdentitySync([(int) $player_id], 'become_wanderer');
    $this->notifyPublicCountsSync();

    $this->notifyAllPlayersTr(
      'becomeWanderer',
      clienttranslate('${player_name} is rejected by all Sects and becomes a Wanderer.'),
      [
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById($player_id),
      ]
    );
  }

  function argChooseSurrenderOrWanderer()
  {
    // Always anchor surrender args on the active player flow, not the requesting viewer.
    // This avoids occasional cross-client arg desync after leader rejects a surrender request.
    $active_player_id = (int) self::getActivePlayerId();
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    if ($bankrupt_id <= 0) {
      $bankrupt_id = $active_player_id;
      self::setGameStateValue('surrender_bankrupt_id', $bankrupt_id);
      $this->setRejectedMask(0);
    }

    $all_leaders = $this->getLeaderIdsForSurrender($bankrupt_id);
    $available = $this->getAvailableSurrenderLeaders($bankrupt_id);
    $available_map = [];
    foreach ($available as $leader_id) {
      $available_map[(int) $leader_id] = true;
    }

    $leader_options = array_map(function ($leader_id) use ($available_map) {
      $leader_id = (int) $leader_id;
      $is_available = !empty($available_map[$leader_id]);
      $is_rejected = $this->isLeaderRejected((int) $leader_id);
      return [
        'id' => (int) $leader_id,
        'name' => self::getPlayerNameById((int) $leader_id),
        'sect' => (int) $this->getPlayerSect((int) $leader_id),
        'available' => $is_available ? 1 : 0,
        'rejected' => $is_rejected ? 1 : 0
      ];
    }, $all_leaders);

    $candidates = array_values(array_filter($leader_options, function ($row) {
      return (int) ($row['available'] ?? 0) === 1;
    }));

    return [
      'leader_options' => array_values($leader_options),
      'candidates' => $candidates,
      'can_become_wanderer' => empty($available)
    ];
  }

  function argAskLeaderSupport()
  {
    $leader_id = (int) self::getActivePlayerId();
    $leader_sect = (int) $this->getPlayerSect((int) $leader_id);
    $sect_name = (string) $this->getSectDisplayName((int) $leader_sect);
    return [
      'leader_id' => (int) $leader_id,
      'sect_id' => (int) $leader_sect,
      'sect_name' => (string) $sect_name,
      'i18n' => ['sect_name']
    ];
  }

  function argChooseWarRepresentative()
  {
    $current_player_id = (int) self::getCurrentPlayerId();
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_leader = $this->getSectLeaderId($attacker_sect, $attacker_id);
    $defender_leader = $this->getSectLeaderId($defender_sect, $defender_id);
    $war_type = (int) self::getGameStateValue('war_type');

    $candidates = [];
    $attacker_candidates = ($war_type === 2)
      ? $this->getFaithWarCombatReadyPlayerIds($attacker_sect)
      : $this->getSectCombatReadyPlayerIds($attacker_sect);
    $defender_candidates = ($war_type === 2)
      ? $this->getFaithWarCombatReadyPlayerIds($defender_sect)
      : $this->getSectCombatReadyPlayerIds($defender_sect);
    if ($current_player_id === $attacker_leader) {
      foreach ($attacker_candidates as $pid) {
        $candidates[] = [
          'id' => (int) $pid,
          'name' => self::getPlayerNameById((int) $pid),
          'believer_count' => $this->believer_cards->countCardInLocation('hand', (int) $pid)
        ];
      }
    } elseif ($current_player_id === $defender_leader) {
      foreach ($defender_candidates as $pid) {
        $candidates[] = [
          'id' => (int) $pid,
          'name' => self::getPlayerNameById((int) $pid),
          'believer_count' => $this->believer_cards->countCardInLocation('hand', (int) $pid)
        ];
      }
    }

    $attacker_candidate_rows = array_map(function ($pid) {
      return [
        'id' => (int) $pid,
        'name' => self::getPlayerNameById((int) $pid),
        'believer_count' => $this->believer_cards->countCardInLocation('hand', (int) $pid)
      ];
    }, $attacker_candidates);
    $defender_candidate_rows = array_map(function ($pid) {
      return [
        'id' => (int) $pid,
        'name' => self::getPlayerNameById((int) $pid),
        'believer_count' => $this->believer_cards->countCardInLocation('hand', (int) $pid)
      ];
    }, $defender_candidates);

    return [
      // Keep legacy single-view candidates for compatibility.
      'candidates' => $candidates,
      // Multi-active safety: frontend can deterministically pick by its own player_id.
      'attacker_leader_id' => (int) $attacker_leader,
      'defender_leader_id' => (int) $defender_leader,
      'attacker_candidates' => $attacker_candidate_rows,
      'defender_candidates' => $defender_candidate_rows
    ];
  }

  private function getDefenseKindByWarType(int $war_type): string
  {
    if ($war_type === 4) {
      return 'breaking_faith';
    }
    // Mental: Faith Debate / Conspiracy / Spread Rumors
    if ($war_type === 6 || $war_type === 7 || $war_type === 9) {
      return 'mental';
    }
    // Physical: Witch Hunt / Faith War / Martyrdom / default physical attacks
    return 'physical';
  }

  private function getDefensePromptText(string $defense_kind): string
  {
    if ($defense_kind === 'mental') {
      return clienttranslate('Play a matching defense card for this attack.');
    }
    if ($defense_kind === 'breaking_faith') {
      return clienttranslate('Play Breaking Faith.');
    }
    return clienttranslate('Play a matching defense card for this attack.');
  }

  private function getDefenseAttackKindLabel(string $defense_kind): string
  {
    if ($defense_kind === 'mental') {
      return clienttranslate('Mental');
    }
    if ($defense_kind === 'breaking_faith') {
      return clienttranslate('Breaking Faith');
    }
    return clienttranslate('Physical');
  }

  function argConfirmDefense()
  {
    $war_type = (int) self::getGameStateValue('war_type');
    $defense_kind = $this->getDefenseKindByWarType($war_type);
    return [
      'defense_kind' => $defense_kind,
      'defense_prompt' => $this->getDefensePromptText($defense_kind),
      'defense_attack_kind' => $this->getDefenseAttackKindLabel($defense_kind),
      'war_type' => $war_type,
      'war_attacker_id' => (int) self::getGameStateValue('war_attacker_id'),
      'war_defender_id' => (int) self::getGameStateValue('war_defender_id'),
      'i18n' => ['defense_attack_kind']
    ];
  }

  /*
   * Compare two believer cards to determine the winner based on RPS-5 logic.
   * Returns:
   *   1: Card A wins
   *  -1: Card B wins
   *   0: Draw
   * 
   * Also returns 'bonus' (bool) if it's a "Crushing Victory" (difference of 1 in cycle)
   * AND it is a Faith War ($is_faith_war = true).
   */
  function compareBelievers($card_a_type, $card_b_type, $is_faith_war)
  {
    if ($card_a_type == $card_b_type) {
      return array('winner' => 0, 'bonus' => false);
    }

    // Calculate cyclic difference: (A - B + 5) % 5
    // Result 1 or 2 => A wins
    // Result 3 or 4 => B wins (which means B is 2 or 1 steps ahead of A)
    $diff = ($card_a_type - $card_b_type + 5) % 5;

    if ($diff == 1 || $diff == 2) {
      // A wins
      // Bonus only applies if diff == 1 (Direct counter / Crushing Victory)
      $bonus = ($diff == 1 && $is_faith_war);
      return array('winner' => 1, 'bonus' => $bonus);
    } else {
      // B wins (diff is 3 or 4)
      // Bonus only applies if diff == 4 (which means B is 1 step ahead of A in cycle)
      $bonus = ($diff == 4 && $is_faith_war);
      return array('winner' => -1, 'bonus' => $bonus);
    }
  }


  function getActionTypeMaskFromCardType(string $card_type): int
  {
    static $mask_by_card_type = array(
      'breaking_faith' => self::ACTION_BIT_STRATEGY,
      'kowtow_to_me' => self::ACTION_BIT_STRATEGY,
      'info_spy' => self::ACTION_BIT_STRATEGY,
      'secret_alliance' => self::ACTION_BIT_STRATEGY,
      'its_a_miracle' => self::ACTION_BIT_STRATEGY,
      'have_a_charity' => self::ACTION_BIT_STRATEGY,
      'divine_inspire' => self::ACTION_BIT_STRATEGY,
      'witch_hunt' => self::ACTION_BIT_PHYSICAL,
      'faith_war' => self::ACTION_BIT_PHYSICAL,
      'martyrdom' => self::ACTION_BIT_PHYSICAL,
      'spread_rumors' => self::ACTION_BIT_MENTAL,
      'faith_debate' => self::ACTION_BIT_MENTAL,
      'conspiracy' => self::ACTION_BIT_MENTAL,
    );

    return $mask_by_card_type[$card_type] ?? 0;
  }

  function getPerformedActionCount(): int
  {
    $count = (int) self::getGameStateValue('actions_performed_count');
    if ($count > 0) {
      return $count;
    }
    // Backward-compatible fallback for older in-flight states that only used bitmask.
    $mask = $this->getPerformedActionsMask();
    $fallback = 0;
    while ($mask > 0) {
      $fallback += $mask & 1;
      $mask >>= 1;
    }
    return $fallback;
  }

  function finishPlayerAction()
  {
    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('playActionCard');
  }

  function canPlayerDiscardActionNow(int $player_id): bool
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return false;
    if (!$this->hasRemainingActionSlots()) return false;
    if ($this->action_cards->countCardInLocation('hand', $player_id) <= 0) return false;
    if ($this->hasPerformedActionBit(self::ACTION_BIT_DISCARD) && !$this->isPraiseLifeUsedThisTurn((int) $player_id)) {
      return false;
    }
    return true;
  }

  function argPlayerTurn()
  {
    $player_id = (int) self::getActivePlayerId();
    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    // Safety net: ensure normal players always refill to 6 at turn start.
    // We only do this when no action has been consumed this turn.
    if ($player_role !== 2 && $this->getPerformedActionCount() === 0) {
      $this->drawActionCardsToLimit($player_id, (int) $this->getActionHandLimitForPlayer((int) $player_id));
    }
    $result = [
      'performed_actions_mask' => (int) $this->getPerformedActionsMask(),
      'performed_actions_count' => (int) $this->getPerformedActionCount(),
      'max_actions_this_turn' => (int) $this->getMaxActionsThisTurn(),
      'can_discard_now' => $this->canPlayerDiscardActionNow((int) $player_id) ? 1 : 0,
      'praise_life_decision_pending' => $this->isPraiseLifeDecisionPendingForPlayer($player_id) ? 1 : 0,
      'wanderer_mode' => ($player_role === 2),
      'wanderer_targets' => [],
      'wanderer_turns' => (int) self::getUniqueValueFromDB("SELECT player_wanderer_turns FROM player WHERE player_id = $player_id"),
      'skill_state' => $this->getSkillStateForPlayer($player_id)
    ];

    if ($player_role === 2) {
      $players = self::loadPlayersBasicInfos();
      foreach ($players as $pid => $_p) {
        $pid = (int) $pid;
        if ($pid === $player_id) continue;
        if ($this->believer_cards->countCardInLocation('hand', $pid) <= 0) continue;
        $result['wanderer_targets'][] = [
          'id' => $pid,
          'name' => self::getPlayerNameById($pid)
        ];
      }
    }
    return $result;
  }

  function argDiscardingActionCard()
  {
    $player_id = (int) self::getActivePlayerId();
    $hand_limit = (int) $this->getActionHandLimitForPlayer((int) $player_id);
    $hand_count = (int) $this->action_cards->countCardInLocation('hand', (int) $player_id);
    return [
      'hand_limit' => (int) $hand_limit,
      'hand_count' => (int) $hand_count,
      'required_discard_count' => max(0, (int) $hand_count - (int) $hand_limit)
    ];
  }

  function argChooseInitialSkill()
  {
    $active_player_id = (int) self::getActivePlayerId();
    $viewer_player_id = 0;
    try {
      $viewer_player_id = (int) self::getCurrentPlayerId();
    } catch (\Throwable $e) {
      // During createGame / server-side bootstrap there may be no logged-in viewer.
      $viewer_player_id = 0;
    }
    $viewer_choices = [];
    if ($viewer_player_id > 0) {
      $viewer_choices = $this->getInitialSkillChoicesForPlayer((int) $viewer_player_id);
    }
    return [
      'active_player_id' => (int) $active_player_id,
      // Return viewer's own hidden starting choices regardless of active player.
      // This avoids stale empty args when active player changes within the same state.
      'choices' => $viewer_choices
    ];
  }

  function getActionHandLimitForPlayer(int $player_id): int
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return 6;

    $row = self::getObjectFromDB(
      "SELECT player_role, player_is_skill_sealed FROM player WHERE player_id = $player_id"
    );
    if (!$row) return 6;

    $role = (int) ($row['player_role'] ?? -1);
    $sealed = (int) ($row['player_is_skill_sealed'] ?? 0);
    if ($role !== 0 || $sealed === 1) {
      return 6;
    }

    $skill_card = $this->getPlayerSkillCard((int) $player_id);
    if (!$skill_card || (int) $skill_card['type'] !== 6) {
      return 6;
    }

    $follower_count = (int) self::getUniqueValueFromDB(
      "SELECT COUNT(*) FROM player WHERE player_role = 1 AND player_leader_id = $player_id"
    );
    return 6 + max(0, (int) $follower_count);
  }

  function revealAscendWithMeIfLeaderHasFollowers(int $leader_id): void
  {
    $leader_id = (int) $leader_id;
    if ($leader_id <= 0) return;

    $row = self::getObjectFromDB("SELECT player_role, player_is_skill_sealed FROM player WHERE player_id = $leader_id");
    if (!$row || (int) $row['player_role'] !== 0 || (int) $row['player_is_skill_sealed'] === 1) {
      return;
    }
    $skill_card = $this->getPlayerSkillCard((int) $leader_id);
    if (!$skill_card || (int) $skill_card['type'] !== 6) {
      return;
    }

    $follower_count = (int) self::getUniqueValueFromDB("SELECT COUNT(*) FROM player WHERE player_role = 1 AND player_leader_id = $leader_id");
    if ($follower_count <= 0) {
      return;
    }

    if ($this->revealSkillAndNotifyIfNeeded((int) $leader_id, 6)) {
      $this->notifyPlayerTr((int) $leader_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer((int) $leader_id)
      ]);
    }
  }

  function drawActionCardsExact(int $player_id, int $draw_count, string $public_message): array
  {
    $player_id = (int) $player_id;
    $draw_count = max(0, (int) $draw_count);
    if ($player_id <= 0 || $draw_count <= 0) {
      return [];
    }

    $drawn_cards = array_values($this->action_cards->pickCards($draw_count, 'deck', $player_id));
    if (count($drawn_cards) < $draw_count) {
      $discard_before_shuffle = array_values($this->action_cards->getCardsInLocation('discard'));
      if (!empty($discard_before_shuffle)) {
        $this->notifyAllPlayersTr('reshuffleActionDiscard', clienttranslate('The Action discard pile is reshuffled into the deck.'), array(
          'count' => count($discard_before_shuffle)
        ));
      }
      $this->action_cards->moveAllCardsInLocation('discard', 'deck');
      $this->action_cards->shuffle('deck');
      $remaining = $draw_count - count($drawn_cards);
      if ($remaining > 0) {
        $more_cards = array_values($this->action_cards->pickCards($remaining, 'deck', $player_id));
        $drawn_cards = array_merge($drawn_cards, $more_cards);
      }
    }

    if (!empty($drawn_cards)) {
      $this->notifyPlayerTr($player_id, 'newActionCards', '', array('cards' => array_values($drawn_cards)));
      $this->notifyAllPlayersTr('drawActionCards', $public_message, array(
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'count' => count($drawn_cards),
        'deck_count' => $this->action_cards->countCardInLocation('deck')
      ));
    }

    return array_values($drawn_cards);
  }

  function triggerAscendWithMeFollowerDrawBonus(int $follower_id, int $follower_draw_count): array
  {
    $follower_id = (int) $follower_id;
    $follower_draw_count = max(0, (int) $follower_draw_count);
    if ($follower_id <= 0 || $follower_draw_count <= 0) {
      return [];
    }

    $follower_row = self::getObjectFromDB("SELECT player_role, player_leader_id FROM player WHERE player_id = $follower_id");
    if (!$follower_row || (int) $follower_row['player_role'] !== 1) {
      return [];
    }
    $leader_id = (int) ($follower_row['player_leader_id'] ?? 0);
    if ($leader_id <= 0 || $leader_id === $follower_id) {
      return [];
    }

    $leader_row = self::getObjectFromDB("SELECT player_role, player_is_skill_sealed FROM player WHERE player_id = $leader_id");
    if (!$leader_row || (int) $leader_row['player_role'] !== 0 || (int) $leader_row['player_is_skill_sealed'] === 1) {
      return [];
    }
    $skill_card = $this->getPlayerSkillCard((int) $leader_id);
    $has_native_ascend = ($skill_card && (int) $skill_card['type'] === 6);
    $has_copied_ascend = $this->canPlayerUseCopiedSkillAbility((int) $leader_id, 6);
    if (!$has_native_ascend && !$has_copied_ascend) {
      return [];
    }

    if ($has_native_ascend) {
      $this->revealSkillAndNotifyIfNeeded((int) $leader_id, 6);
    } else if ($has_copied_ascend) {
      $this->revealSkillAndNotifyIfNeeded((int) $leader_id, 9);
    }
    $leader_drawn = $this->drawActionCardsExact(
      (int) $leader_id,
      (int) $follower_draw_count,
      clienttranslate('${player_name} draws ${count} Action card(s) from Ascend with Me.')
    );
    $draw_n = (int) count($leader_drawn);
    if ($draw_n > 0) {
      $this->notifyAllPlayersTr(
        'skillAscendWithMe',
        clienttranslate('${leader_name} triggers Ascend with Me and draws ${n} Action card(s) because Follower ${follower_name} drew Action cards.'),
        [
          'leader_id' => (int) $leader_id,
          'leader_name' => self::getPlayerNameById((int) $leader_id),
          'follower_id' => (int) $follower_id,
          'follower_name' => self::getPlayerNameById((int) $follower_id),
          'n' => (int) $draw_n,
          'ability_source' => $has_native_ascend ? 'ascend_with_me' : 'gate_truth_copy',
          'skill_state_actor' => $this->getSkillStateForPlayer((int) $leader_id)
        ]
      );
      $this->notifyPlayerTr((int) $leader_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer((int) $leader_id)
      ]);
    }

    return array_values($leader_drawn);
  }

  function drawActionCardsToLimit(int $player_id, int $hand_limit = 6): array
  {
    $player_id = (int) $player_id;
    $action_cards_count = $this->action_cards->countCardInLocation('hand', $player_id);
    if ($action_cards_count >= $hand_limit) {
      return [];
    }

    $cards_to_draw = $hand_limit - $action_cards_count;
    $drawn_cards = $this->drawActionCardsExact(
      (int) $player_id,
      (int) $cards_to_draw,
      clienttranslate('${player_name} draws action cards until hand limit')
    );
    if (!empty($drawn_cards)) {
      $this->triggerAscendWithMeFollowerDrawBonus((int) $player_id, (int) count($drawn_cards));
    }
    return array_values($drawn_cards);
  }

  function forceTrimActionHandToLimit(int $player_id, string $reason = 'end_turn'): int
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return 0;
    $hand_limit = (int) $this->getActionHandLimitForPlayer((int) $player_id);
    $hand_cards = array_values($this->action_cards->getCardsInLocation('hand', $player_id, 'location_arg DESC'));
    $excess = count($hand_cards) - $hand_limit;
    if ($excess <= 0) return 0;

    $to_discard = array_slice($hand_cards, 0, (int) $excess);
    $card_ids = array_values(array_map(function ($card) {
      return (int) ($card['id'] ?? 0);
    }, $to_discard));
    $discard_cards = array_values(array_map(function ($card) {
      return [
        'id' => (int) ($card['id'] ?? 0),
        'type' => (string) ($card['type'] ?? ''),
      ];
    }, $to_discard));

    if (!empty($card_ids)) {
      $this->action_cards->moveCards($card_ids, 'discard');
      $public_msg = ($reason === 'end_turn')
        ? clienttranslate('${player_name} exceeds Action hand limit and discards ${count} Action card(s).')
        : clienttranslate('${player_name} discards ${count} action card(s).');
      $this->notifyAllPlayersTr('actionCardsDiscarded', $public_msg, [
        'player_name' => self::getPlayerNameById((int) $player_id),
        'player_id' => (int) $player_id,
        'n' => (int) count($card_ids),
        'count' => (int) count($card_ids),
        'card_ids' => $card_ids,
        'cards' => $discard_cards,
        'consume_discard_action' => 0,
      ]);
    }

    return max(0, (int) $excess);
  }

  function validateSecretAllianceOffer(int $player_id, int $played_card_id, int $target_id, int $offer_card_id): void
  {
    if ($target_id === $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose another player."));
    }

    if ($offer_card_id === $played_card_id) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance itself cannot be the exchanged card."));
    }

    $offer_card = $this->action_cards->getCard($offer_card_id);
    if (
      !$offer_card ||
      $offer_card['location'] !== 'hand' ||
      (int) $offer_card['location_arg'] !== $player_id
    ) {
      throw new BgaVisibleSystemException(clienttranslate("Select one Action card from your hand to exchange."));
    }

    // Allowed: another copy of Secret Alliance in hand can be exchanged.
    // Only the already-played card instance is forbidden (checked by card id).

    if ($this->action_cards->countCardInLocation('hand', $target_id) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target player has no Action cards to exchange."));
    }
  }

  function validateSecretAllianceStart(int $player_id, int $target_id): void
  {
    if ($target_id === $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose another player."));
    }

    // At play time, Secret Alliance itself is still in hand, so requiring >=2
    // ensures at least one other Action card remains available to offer.
    if ($this->action_cards->countCardInLocation('hand', $player_id) <= 1) {
      throw new BgaVisibleSystemException(clienttranslate("You must have another Action card in hand to offer."));
    }

    if ($this->action_cards->countCardInLocation('hand', $target_id) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target player has no Action cards to exchange."));
    }
  }

  private function resolveStartingSkillChoice(int $player_id, int $selected_card_id): array
  {
    $player_id = (int) $player_id;
    $selected_card_id = (int) $selected_card_id;
    if ($player_id <= 0 || $selected_card_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid starting Skill selection."));
    }

    $choices = $this->getInitialSkillChoicesForPlayer((int) $player_id);
    if (empty($choices)) {
      throw new BgaVisibleSystemException(clienttranslate("You have no starting Skill choices."));
    }

    $selected_card = null;
    $other_ids = [];
    $all_choice_ids = [];
    foreach ($choices as $card) {
      $cid = (int) ($card['id'] ?? 0);
      if ($cid <= 0) continue;
      $all_choice_ids[] = (int) $cid;
      if ((int) $cid === (int) $selected_card_id) {
        $selected_card = $card;
      } else {
        $other_ids[] = (int) $cid;
      }
    }

    if (!$selected_card) {
      throw new BgaVisibleSystemException(clienttranslate("Choose your starting Skill."));
    }

    $this->skill_cards->moveCard((int) $selected_card_id, 'hand', (int) $player_id);
    if (!empty($other_ids)) {
      $this->skill_cards->moveCards(array_values($other_ids), 'deck');
      $this->skill_cards->shuffle('deck');
    }

    return [
      'selected_card' => $selected_card,
      'choice_card_ids' => array_values(array_unique(array_map('intval', $all_choice_ids)))
    ];
  }

  public function chooseInitialSkill($card_id)
  {
    self::checkAction("chooseInitialSkill");
    $player_id = (int) self::getActivePlayerId();
    $result = $this->resolveStartingSkillChoice((int) $player_id, (int) $card_id);
    $selected_card = $result['selected_card'];

    $this->notifyPlayerTr((int) $player_id, 'skillCardReplaced', '', [
      'old_skill_card_id' => 0,
      'old_skill_card_ids' => $result['choice_card_ids'],
      'new_skill_card' => [
        'id' => (int) ($selected_card['id'] ?? 0),
        'type' => (int) ($selected_card['type'] ?? 0),
        'type_arg' => (int) ($selected_card['type_arg'] ?? 0),
      ],
      'skill_state' => $this->getSkillStateForPlayer((int) $player_id)
    ]);
    $this->notifyPlayerTr((int) $player_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer((int) $player_id)
    ]);

    $this->notifyAllPlayersTr(
      'initialSkillChosen',
      clienttranslate('${player_name} chooses a starting Skill.'),
      [
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById((int) $player_id)
      ]
    );

    $pending = $this->getPlayersPendingInitialSkillChoice();
    if (empty($pending)) {
      $turn_owner_player_id = (int) self::getGameStateValue('turn_owner_player_id');
      if ($turn_owner_player_id > 0) {
        $this->switchActivePlayerSafely((int) $turn_owner_player_id);
      }
      $this->gamestate->nextState('nextPlayer');
      return;
    }

    $this->gamestate->nextState('chooseDone');
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Strategy Actions
  ////////////

  public function playActionCard($card_id, $target_player_id = null, $type_arg = null, $card_ids = array(), $use_zombie = null)
  {
    self::checkAction("playActionCard");
    $this->playActionCardInternal((int) self::getActivePlayerId(), $card_id, $target_player_id, $type_arg, $card_ids, $use_zombie);
  }

  private function playActionCardInternal(int $player_id, $card_id, $target_player_id = null, $type_arg = null, $card_ids = array(), $use_zombie = null): void
  {
    $player_id = (int) $player_id;
    $this->assertNoPendingPraiseLifeDecision((int) $player_id);
    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($player_role === 2) {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer must snatch a Believer first."));
    }
    $this->assertCanSpendActionSlot();
    $praise_life_used_this_turn = $this->isPraiseLifeUsedThisTurn((int) $player_id);

    // Defensive cleanup: no Believer should sit on the combat table when a new
    // Action card is played on a player's turn. If a previous confrontation
    // left a stray committed Believer there (e.g. an edge-case war end), return
    // it to its owner's hand so the next attack's commit guard does not trip
    // and deadlock (was: "You already committed a Believer for Conspiracy").
    $this->returnStrayCombatBelieversToHands();

    // 1. Validate Card Ownership
    $card = $this->action_cards->getCard($card_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You do not have this card in hand."));
    }

    // 1.5 Validate per-turn action category usage
    $type_str = $card['type'];
    $action_type_mask = $this->getActionTypeMaskFromCardType($type_str);
    if (
      !$praise_life_used_this_turn &&
      $this->isTrackedActionTypeMask($action_type_mask) &&
      $this->hasPerformedActionBit($action_type_mask)
    ) {
      throw new BgaVisibleSystemException(clienttranslate("You have already performed this action type this turn."));
    }
    if (
      ($action_type_mask === self::ACTION_BIT_PHYSICAL || $action_type_mask === self::ACTION_BIT_MENTAL) &&
      $this->isPlayerAttackLockedByKarboom((int) $player_id)
    ) {
      // Defensive self-heal: if a stale lock survives but this player has not
      // used KABOOM this turn, clear it and continue.
      if (!$this->isKarboomUsedThisTurn((int) $player_id)) {
        $this->setPlayerAttackLockByKarboom((int) $player_id, false);
      } else {
        throw new BgaVisibleSystemException(clienttranslate("Your attacks are locked this turn."));
      }
    }
    $targeted_cards = ['info_spy', 'secret_alliance', 'kowtow_to_me', 'breaking_faith', 'witch_hunt', 'spread_rumors', 'faith_debate', 'faith_war'];
    if ($target_player_id && in_array($type_str, $targeted_cards, true)) {
      $this->assertTargetIsNotWanderer((int) $target_player_id);
      if (in_array($type_str, ['witch_hunt', 'faith_war'], true)) {
        $this->assertTargetNotProtectedByAttackKind((int) $target_player_id, 'physical');
      }
      if (in_array($type_str, ['spread_rumors', 'faith_debate'], true)) {
        $this->assertTargetNotProtectedByAttackKind((int) $target_player_id, 'mental');
      }
    }
    if ($type_str === 'its_a_miracle' && $this->believer_cards->countCardInLocation('discard') <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("You cannot play It's a Miracle when the graveyard is empty"));
    }
    if ($type_str === 'secret_alliance') {
      if (!$target_player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Select a target."));
      }
      $this->validateSecretAllianceStart((int) $player_id, (int) $target_player_id);
    }

    // 2. Broadcast Action to JS for slide animation (from hand to Arena)
    $this->notifyAllPlayersTr('actionCardPlayed', '', array(
      'card_id' => $card_id,
      'player_id' => $player_id,
      'card_type' => $type_str
    ));

    // 3. Move Card to the Common Arena (cardsontable)
    $this->action_cards->moveCard($card_id, 'cardsontable', $player_id);
    $this->notifyPlayerTr((int) $player_id, 'syncActionHand', '', [
      'cards' => array_values($this->action_cards->getCardsInLocation('hand', (int) $player_id))
    ]);

    // 3.5 Consume the corresponding action slot for this turn BEFORE resolving subflows
    $this->markPerformedActionBits((int) $action_type_mask);
    $this->incrementPerformedActionCount(1);

    // 4. Dispatch to Specific Logic Based on Card Type String
    switch ($type_str) {
      case 'have_a_charity':
        $this->playHaveACharity($player_id);
        break;
      case 'great_mercy':
        throw new BgaVisibleSystemException(clienttranslate("Great Mercy is a defense card and can only be played when defending against a Physical Attack."));
      case 'firm_faith':
        throw new BgaVisibleSystemException(clienttranslate("Firm Faith is a defense card and can only be played when defending against a Mental Attack."));
      case 'its_a_miracle':
        $this->playItsAMiracle($player_id);
        break;
      case 'divine_inspire':
        $this->playDivineInspiration($card_ids, $player_id);
        break;
      case 'info_spy':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playInfoSpy($target_player_id, $player_id);
        break;
      case 'secret_alliance':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playSecretAlliance($target_player_id, $player_id);
        break;
      case 'kowtow_to_me':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Target the Sect you want to absorb."));
        $this->playKowtowToMe($target_player_id, $player_id);
        break;
      case 'breaking_faith':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playBreakingFaith($target_player_id, $player_id);
        break;
      case 'witch_hunt':
        // Temporarily ignore missing type_arg to prevent hard crash, we can add a sub-state later
        $this->playWitchHunt($target_player_id, $type_arg, $player_id);
        break;
      case 'spread_rumors':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playSpreadRumors($target_player_id, $player_id);
        break;
      case 'faith_debate':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playFaithDebate($target_player_id, $player_id);
        break;
      case 'faith_war':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playFaithWar($target_player_id, ((int) $use_zombie) === 1, $player_id);
        break;
      case 'martyrdom':
        $this->playMartyrdom($player_id);
        break;
      case 'conspiracy':
        $this->playConspiracy($player_id);
        break;
      default:
        throw new BgaVisibleSystemException(clienttranslate("Card action is not fully implemented yet."));
    }

    // 5. Discard Strategy Cards immediately after resolution
    $instant_cards = ['have_a_charity', 'its_a_miracle', 'divine_inspire'];
    if (in_array($type_str, $instant_cards)) {
      $this->action_cards->moveCard($card_id, 'discard');
    }
  }

  private function getActionActingPlayerId(?int $acting_player_id = null): int
  {
    return $acting_player_id !== null && (int) $acting_player_id > 0
      ? (int) $acting_player_id
      : (int) self::getActivePlayerId();
  }

  function redistributeBelieversFromAllHands(int $starter_player_id): array
  {
    $order = $this->getPlayerOrderStartingFrom($starter_player_id);
    $pool_cards = [];
    $source_counts = [];
    foreach ($order as $pid) {
      $cards = array_values($this->believer_cards->getCardsInLocation('hand', (int) $pid));
      $source_counts[(int) $pid] = count($cards);
      foreach ($cards as $card) {
        $pool_cards[] = $card;
      }
    }

    $pool_ids = array_map(function ($card) {
      return (int) $card['id'];
    }, $pool_cards);
    $total = count($pool_ids);
    $distribution = [];

    if ($total > 0) {
      $this->believer_cards->moveCards($pool_ids, 'skill_equal_pool');
      $this->believer_cards->shuffle('skill_equal_pool');

      $player_count = max(1, count($order));
      $base = intdiv($total, $player_count);
      $rem = $total % $player_count;

      foreach ($order as $index => $pid) {
        $take = $base + (($index < $rem) ? 1 : 0);
        $picked = ($take > 0)
          ? array_values($this->believer_cards->pickCards((int) $take, 'skill_equal_pool', (int) $pid))
          : [];
        $distribution[(int) $pid] = count($picked);
      }
    } else {
      foreach ($order as $pid) {
        $distribution[(int) $pid] = 0;
      }
    }

    $hands = [];
    foreach ($order as $pid) {
      $hands[(int) $pid] = array_values($this->believer_cards->getCardsInLocation('hand', (int) $pid));
    }

    return [
      'total' => $total,
      'source_counts' => $source_counts,
      'distribution' => $distribution,
      'hands' => $hands
    ];
  }

  function redistributeActionCardsFromAllHands(int $starter_player_id): array
  {
    $order = $this->getPlayerOrderStartingFrom($starter_player_id);
    $pool_cards = [];
    $source_counts = [];
    foreach ($order as $pid) {
      $cards = array_values($this->action_cards->getCardsInLocation('hand', (int) $pid));
      $source_counts[(int) $pid] = count($cards);
      foreach ($cards as $card) {
        $pool_cards[] = $card;
      }
    }

    $pool_ids = array_map(function ($card) {
      return (int) $card['id'];
    }, $pool_cards);
    $total = count($pool_ids);
    $distribution = [];

    if ($total > 0) {
      $this->action_cards->moveCards($pool_ids, 'skill_chaos_pool');
      $this->action_cards->shuffle('skill_chaos_pool');

      $player_count = max(1, count($order));
      $base = intdiv($total, $player_count);
      $rem = $total % $player_count;

      foreach ($order as $index => $pid) {
        $take = $base + (($index < $rem) ? 1 : 0);
        $picked = ($take > 0)
          ? array_values($this->action_cards->pickCards((int) $take, 'skill_chaos_pool', (int) $pid))
          : [];
        $distribution[(int) $pid] = count($picked);
      }
    } else {
      foreach ($order as $pid) {
        $distribution[(int) $pid] = 0;
      }
    }

    $hands = [];
    foreach ($order as $pid) {
      $hands[(int) $pid] = array_values($this->action_cards->getCardsInLocation('hand', (int) $pid));
    }

    return [
      'total' => $total,
      'source_counts' => $source_counts,
      'distribution' => $distribution,
      'hands' => $hands
    ];
  }

  function useSkill($target_player_id = null, $believer_id = null)
  {
    self::checkAction("useSkill");
    $this->useSkillInternal((int) self::getActivePlayerId(), $target_player_id, $believer_id);
  }

  // Session-safe core shared by the player action and bot automation
  // (same pattern as playActionCardInternal).
  private function useSkillInternal(int $player_id, $target_player_id = null, $believer_id = null): void
  {
    $player_id = (int) $player_id;
    $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($role === 2) {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer must snatch a Believer first."));
    }

    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card) {
      throw new BgaVisibleSystemException(clienttranslate("No skill card found."));
    }
    $skill_type = (int) $skill_card['type'];
    if ($this->isPraiseLifeDecisionPendingForPlayer($player_id) && $skill_type !== 13) {
      throw new BgaVisibleSystemException(clienttranslate("Resolve the Praise of Life decision first."));
    }
    $uses = $this->getSkillUseCountFromCard($skill_card);
    $can_reason = $this->canPlayerUseSkillNow($player_id, $skill_type, $uses);
    if (!$can_reason[0]) {
      throw new BgaVisibleSystemException((string) $can_reason[1]);
    }

    $this->revealSkillAndNotifyIfNeeded((int) $player_id, (int) $skill_type);
    $is_gate_copied_use = false;
    $effective_skill_type = (int) $skill_type;
    if ((int) $skill_type === 9 && $this->isGateTruthUsedThisTurn((int) $player_id)) {
      $copied_skill_type = (int) $this->getGateTruthCopiedSkillTypeForPlayer((int) $player_id);
      if ($copied_skill_type > 0) {
        $is_gate_copied_use = true;
        $effective_skill_type = (int) $copied_skill_type;
      }
    }

    if ($effective_skill_type === 1) {
      if ($is_gate_copied_use) {
        if ((int) $role !== 1) {
          throw new BgaVisibleSystemException(clienttranslate("Copied Purple Hermit can only be used while you are a Follower."));
        }
        $leader_id = (int) self::getUniqueValueFromDB("SELECT player_leader_id FROM player WHERE player_id = $player_id");
        if ($leader_id <= 0) {
          throw new BgaVisibleSystemException(clienttranslate("Copied Purple Hermit can only be used after you join another Sect as a Follower."));
        }

        $leader_count = (int) $this->believer_cards->countCardInLocation('hand', (int) $leader_id);
        if ($leader_count <= 0) {
          throw new BgaVisibleSystemException(clienttranslate("Your current Leader has no Believers right now."));
        }

        $steal_count = intdiv($leader_count, 2);
        $stolen_cards = $this->stealRandomBelieversBetweenPlayers((int) $leader_id, (int) $player_id, (int) $steal_count);
        $stolen_n = (int) count($stolen_cards);
        if ($stolen_n > 0) {
          $this->notifyBelieverStealPrivate((int) $player_id, (int) $leader_id, $stolen_cards);
        }

        $this->incrementSkillUseCount($skill_card, 1);
        $this->clearGateTruthCopiedSkillContext();

        $this->notifyAllPlayersTr(
          'skillGateTruthPurpleHermit',
          clienttranslate('${player_name} uses copied Purple Hermit (Gate of Truth) and snatches ${n} Believers from ${target_name}.'),
          [
            'player_id' => (int) $player_id,
            'player_name' => self::getPlayerNameById((int) $player_id),
            'target_id' => (int) $leader_id,
            'target_name' => self::getPlayerNameById((int) $leader_id),
            'n' => (int) $stolen_n,
            'skill_state_actor' => $this->getSkillStateForPlayer((int) $player_id)
          ]
        );

        $this->notifyPlayerTr((int) $player_id, 'skillStateUpdated', '', [
          'skill_state' => $this->getSkillStateForPlayer((int) $player_id)
        ]);
        $this->notifyPublicCountsSync();
        $this->gamestate->nextState('playActionCard');
        return;
      }

      if ($role !== 1) {
        throw new BgaVisibleSystemException(clienttranslate("Purple Hermit can only be used while you are a Follower."));
      }
      $leader_id = (int) self::getUniqueValueFromDB("SELECT player_leader_id FROM player WHERE player_id = $player_id");
      if ($leader_id <= 0) {
        throw new BgaVisibleSystemException(clienttranslate("Purple Hermit can only be used after you join another Sect as a Follower."));
      }

      $leader_count = (int) $this->believer_cards->countCardInLocation('hand', $leader_id);
      $steal_count = intdiv($leader_count, 2);
      $stolen_cards = $this->stealRandomBelieversBetweenPlayers((int) $leader_id, (int) $player_id, (int) $steal_count);
      $stolen_n = (int) count($stolen_cards);
      if ($stolen_n > 0) {
        $this->notifyBelieverStealPrivate((int) $player_id, (int) $leader_id, $stolen_cards);
      }

      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      $this->setPurpleHermitReady((int) $player_id, false);
      $this->setPurpleHermitPendingSplit((int) $player_id, true);

      $this->notifyAllPlayersTr(
        'skillPurpleHermitActivated',
        clienttranslate('${player_name} activates Purple Hermit and snatches ${n} Believers from ${leader_name}.'),
        [
          'player_id' => (int) $player_id,
          'player_name' => self::getPlayerNameById((int) $player_id),
          'leader_id' => (int) $leader_id,
          'leader_name' => self::getPlayerNameById((int) $leader_id),
          'n' => (int) $stolen_n,
          'uses' => (int) $new_uses,
          'skill_state_actor' => $this->getSkillStateForPlayer((int) $player_id)
        ]
      );

      $this->notifyPlayerTr((int) $player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer((int) $player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($skill_type === 9 && !$is_gate_copied_use) {
      $target_player_id = (int) $target_player_id;
      if ($target_player_id <= 0) {
        throw new BgaVisibleSystemException(clienttranslate("Choose a player whose revealed skill you want to copy."));
      }
      if ($target_player_id === (int) $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Gate of Truth must copy another player's revealed skill."));
      }
      if (!$this->isSkillRevealed((int) $target_player_id)) {
        throw new BgaVisibleSystemException(clienttranslate("Target skill must be revealed before it can be copied."));
      }
      $target_skill_card = $this->getPlayerSkillCard((int) $target_player_id);
      if (!$target_skill_card) {
        throw new BgaVisibleSystemException(clienttranslate("Target player has no skill to copy."));
      }
      $copied_skill_type = (int) ($target_skill_card['type'] ?? 0);
      if (!$this->isGateTruthSkillTypeCopyableTarget((int) $copied_skill_type)) {
        throw new BgaVisibleSystemException(clienttranslate("This skill cannot be copied by Gate of Truth."));
      }
      if (!$this->canPlayerMirrorCopiedSkillIdentity((int) $player_id, (int) $copied_skill_type)) {
        throw new BgaVisibleSystemException(clienttranslate("You do not meet the identity condition to mirror this skill right now."));
      }
      if ($this->isGateTruthSkillTypeAlreadyCopied((int) $copied_skill_type)) {
        throw new BgaVisibleSystemException(clienttranslate("This revealed skill has already been copied once this game."));
      }

      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      $this->setGateTruthCopiedSkillContext((int) $player_id, (int) $copied_skill_type, (int) $target_player_id);
      $this->markGateTruthSkillTypeCopied((int) $copied_skill_type);
      $this->markGateTruthUsedThisTurn((int) $player_id);

      $copied_skill_name = isset($this->skill_labels[$copied_skill_type]['name'])
        ? (string) $this->skill_labels[$copied_skill_type]['name']
        : ('Skill ' . $copied_skill_type);

      $this->notifyAllPlayersTr(
        'skillGateTruthCopied',
        clienttranslate('${player_name} uses Gate of Truth and copies ${target_name}\'s skill ${skill_name}.'),
        [
          'player_id' => (int) $player_id,
          'player_name' => self::getPlayerNameById((int) $player_id),
          'target_id' => (int) $target_player_id,
          'target_name' => self::getPlayerNameById((int) $target_player_id),
          'copied_skill_type' => (int) $copied_skill_type,
          'skill_name' => (string) $copied_skill_name,
          'uses' => (int) $new_uses,
          'skill_state_actor' => $this->getSkillStateForPlayer((int) $player_id)
        ]
      );

      $this->notifyPlayerTr((int) $player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer((int) $player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($effective_skill_type === 2) {
      $target_player_id = (int) $target_player_id;
      $believer_id = (int) $believer_id;
      if ($target_player_id <= 0) {
        throw new BgaVisibleSystemException(clienttranslate("Target a player with KABOOM!"));
      }
      if ($target_player_id === (int) $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("KABOOM! cannot target yourself."));
      }
      if (!array_key_exists((int) $target_player_id, self::loadPlayersBasicInfos())) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid KABOOM! target."));
      }
      $believer = $this->believer_cards->getCard($believer_id);
      if (!$believer || $believer['location'] !== 'hand' || (int) $believer['location_arg'] !== $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Choose one of your Believers to sacrifice."));
      }

      $this->moveBelieverCardToDiscardWithOwnerMeta((int) $believer_id, (int) $player_id);
      $sacrificed = $this->believer_cards->getCard($believer_id);

      $target_hand = array_values($this->believer_cards->getCardsInLocation('hand', $target_player_id));
      shuffle($target_hand);
      $kill_n = min(3, count($target_hand));
      $killed = array_slice($target_hand, 0, $kill_n);
      $killed_ids = array_map(function ($card) {
        return (int) $card['id'];
      }, $killed);
      if (!empty($killed_ids)) {
        foreach ($killed_ids as $killed_card_id) {
          $this->moveBelieverCardToDiscardWithOwnerMeta((int) $killed_card_id, (int) $target_player_id);
        }
      }
      $this->rememberHolyRebirthRoundDeathBurst((int) $target_player_id, (int) $kill_n);

      $this->markKarboomUsedThisTurn($player_id);
      // KABOOM! self-locks the user from launching Physical/Mental attacks
      // for the remainder of this turn.
      $this->setPlayerAttackLockByKarboom($player_id, true);
      $this->incrementSkillUseCount($skill_card, 1);
      if ($is_gate_copied_use) {
        $this->clearGateTruthCopiedSkillContext();
      }
      $this->incrementPerformedActionCount(1);

      $this->notifyAllPlayersTr('skillKarboom', clienttranslate('${player_name} uses KABOOM!: sacrifices 1 Believer and ${target_name} loses ${n} Believers.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'target_name' => self::getPlayerNameById($target_player_id),
        'target_id' => (int) $target_player_id,
        'n' => (int) $kill_n,
        'sacrificed_card' => $sacrificed,
        'killed_cards' => array_values($killed),
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);

      if ($this->queueHolyRebirthPromptIfEligible((int) $target_player_id, (int) $kill_n, 'karboom', (int) $player_id, 1)) {
        return;
      }

      $this->finishPlayerAction();
      return;
    }

    if ($effective_skill_type === 3) {
      $sect = (int) $this->getPlayerSect((int) $player_id);
      $followers = array_map(
        'intval',
        self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect = $sect AND player_role = 1 ORDER BY player_no ASC", true)
      );
      if (empty($followers)) {
        throw new BgaVisibleSystemException(clienttranslate("You currently have no Followers to expel."));
      }
      $new_sect_by_follower = $this->allocateIndependentSectIdsForPlayers($followers);

      $expelled_rows = [];
      $total_stolen = 0;
      foreach ($followers as $follower_id) {
        $follower_id = (int) $follower_id;
        if ($follower_id <= 0) continue;

        $follower_count = (int) $this->believer_cards->countCardInLocation('hand', (int) $follower_id);
        $steal_count = intdiv($follower_count, 2);
        $stolen_cards = $this->stealRandomBelieversBetweenPlayers((int) $follower_id, (int) $player_id, (int) $steal_count);
        $stolen_n = (int) count($stolen_cards);
        if ($stolen_n > 0) {
          $this->notifyBelieverStealPrivate((int) $player_id, (int) $follower_id, $stolen_cards);
          $total_stolen += (int) $stolen_n;
        }

        $new_sect = (int) ($new_sect_by_follower[(int) $follower_id] ?? $this->allocateIndependentSectId((int) $follower_id));
        $this->clearPurpleHermitStatus((int) $follower_id);

        $expelled_rows[] = [
          'player_id' => (int) $follower_id,
          'player_name' => self::getPlayerNameById((int) $follower_id),
          'new_sect' => (int) $new_sect,
          'stolen_n' => (int) $stolen_n
        ];
      }
      if (!empty($expelled_rows)) {
        $case_parts = [];
        $ids = [];
        foreach ($expelled_rows as $row) {
          $pid = (int) ($row['player_id'] ?? 0);
          $sid = (int) ($row['new_sect'] ?? 0);
          if ($pid <= 0) continue;
          $ids[] = (int) $pid;
          $case_parts[] = "WHEN $pid THEN $sid";
        }
        if (!empty($ids) && !empty($case_parts)) {
          $ids_sql = implode(',', $ids);
          $case_sql = implode(' ', $case_parts);
          self::DbQuery(
            "UPDATE player
             SET player_role = 0,
                 player_leader_id = NULL,
                 player_is_skill_sealed = 0,
                 player_sect = CASE player_id $case_sql ELSE player_sect END
             WHERE player_id IN ($ids_sql)"
          );
        }
      }

      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      if ($is_gate_copied_use) {
        $this->clearGateTruthCopiedSkillContext();
      }
      $this->notifyAllPlayersTr(
        'skillHeadstronger',
        clienttranslate('${player_name} uses Headstronger: expels ${follower_n} Follower(s) and snatches ${stolen_n} Believers.'),
        [
          'player_name' => self::getPlayerNameById($player_id),
          'player_id' => (int) $player_id,
          'follower_n' => (int) count($expelled_rows),
          'stolen_n' => (int) $total_stolen,
          'uses' => (int) $new_uses,
          'expelled_followers' => array_values($expelled_rows),
          'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
        ]
      );

      $sync_ids = array_merge([(int) $player_id], array_map(function ($row) {
        return (int) ($row['player_id'] ?? 0);
      }, $expelled_rows));
      $this->notifyPlayerIdentitySync(array_values(array_unique(array_filter($sync_ids, function ($pid) {
        return (int) $pid > 0;
      }))), 'headstronger_expel');

      $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($effective_skill_type === 13) {
      $believer_id = (int) $believer_id;
      $believer = $this->believer_cards->getCard($believer_id);
      if (!$believer || $believer['location'] !== 'hand' || (int) $believer['location_arg'] !== $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Choose one of your Believers to sacrifice."));
      }

      $this->moveBelieverCardToDiscardWithOwnerMeta((int) $believer_id, (int) $player_id);
      $sacrificed = $this->believer_cards->getCard($believer_id);
      $this->markPraiseLifeUsedThisTurn($player_id);
      $this->clearPraiseLifeDecisionPending();
      $this->incrementSkillUseCount($skill_card, 1);
      if ($is_gate_copied_use) {
        $this->clearGateTruthCopiedSkillContext();
      }
      $extra = (int) self::getGameStateValue('extra_action_slots');
      self::setGameStateValue('extra_action_slots', $extra + 1);

      $this->notifyAllPlayersTr('skillPraiseLife', clienttranslate('${player_name} uses Praise of Life: sacrifices 1 Believer to gain 1 extra action this turn.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'sacrificed_card' => $sacrificed,
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'extra_action_slots' => (int) self::getGameStateValue('extra_action_slots'),
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);

      $this->finishPlayerAction();
      return;
    }

    if ($effective_skill_type === 8) {
      $believer_id = (int) $believer_id;
      $believer = $this->believer_cards->getCard($believer_id);
      if (!$believer || $believer['location'] !== 'hand' || (int) $believer['location_arg'] !== $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Choose one of your Believers to sacrifice."));
      }

      $this->moveBelieverCardToDiscardWithOwnerMeta((int) $believer_id, (int) $player_id);
      $sacrificed = $this->believer_cards->getCard($believer_id);
      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      // Keep Gate of Truth copied-skill context write order aligned with
      // per-turn reset flow to reduce rare deadlock windows on globals.
      if ($is_gate_copied_use) {
        $this->clearGateTruthCopiedSkillContext();
      }
      $this->setPlayerSkillProtection($player_id, 'physical', true);

      $this->notifyAllPlayersTr('skillWorldPeace', clienttranslate('${player_name} uses World Peace: sacrifices 1 Believer to gain protection from Physical attacks until their next turn.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'sacrificed_card' => $sacrificed,
        'uses' => (int) $new_uses,
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($effective_skill_type === 7) {
      $believer_id = (int) $believer_id;
      $believer = $this->believer_cards->getCard($believer_id);
      if (!$believer || $believer['location'] !== 'hand' || (int) $believer['location_arg'] !== $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Choose one of your Believers to sacrifice."));
      }

      $this->moveBelieverCardToDiscardWithOwnerMeta((int) $believer_id, (int) $player_id);
      $sacrificed = $this->believer_cards->getCard($believer_id);
      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      // Keep Gate of Truth copied-skill context write order aligned with
      // per-turn reset flow to reduce rare deadlock windows on globals.
      if ($is_gate_copied_use) {
        $this->clearGateTruthCopiedSkillContext();
      }
      $this->setPlayerSkillProtection($player_id, 'mental', true);

      $this->notifyAllPlayersTr('skillEternalTruth', clienttranslate('${player_name} uses Eternal Truth: sacrifices 1 Believer to gain protection from Mental attacks until their next turn.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'sacrificed_card' => $sacrificed,
        'uses' => (int) $new_uses,
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($effective_skill_type === 11) {
      $target_player_id = (int) $target_player_id;
      if ($target_player_id <= 0 || !array_key_exists((int) $target_player_id, self::loadPlayersBasicInfos())) {
        throw new BgaVisibleSystemException(clienttranslate("Target a player with Soul-Cutting Sword."));
      }
      if ($target_player_id === $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Soul-Cutting Sword cannot target yourself."));
      }

      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      $target_skip_count = $this->addSkipTurnCounter((int) $target_player_id, 1);
      if ($is_gate_copied_use) {
        $this->clearGateTruthCopiedSkillContext();
      }

      $this->notifyAllPlayersTr('skillSoulSeveringSword', clienttranslate('${player_name} uses Soul-Cutting Sword on ${target_name}. ${target_name} will skip ${target_skip_count} upcoming turn(s).'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'target_name' => self::getPlayerNameById($target_player_id),
        'target_id' => (int) $target_player_id,
        'n' => (int) $target_skip_count,
        'target_skip_count' => (int) $target_skip_count,
        'uses' => (int) $new_uses,
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      $this->notifyPlayerTr((int) $target_player_id, 'soulBladeMarked', clienttranslate('${player_name} uses Soul-Cutting Sword on you. Your next turn will be skipped.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'target_skip_count' => (int) $target_skip_count
      ]);

      $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($effective_skill_type === 15) {
      $redistributed = $this->redistributeBelieversFromAllHands($player_id);
      if ($is_gate_copied_use) {
        $this->incrementSkillUseCount($skill_card, 1);
      } else {
        $this->setSkillUseCount((int) $skill_card['id'], 1);
      }
      if ($is_gate_copied_use) {
        $this->clearGateTruthCopiedSkillContext();
      }

      $this->notifyAllPlayersTr('skillEveryoneEqual', clienttranslate('${player_name} uses Everyone is Equal. All Believers in hand are shuffled and redistributed from ${player_name} seat order.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'total' => (int) $redistributed['total'],
        'source_counts' => $redistributed['source_counts'],
        'distribution' => $redistributed['distribution'],
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      foreach ($redistributed['hands'] as $pid => $cards) {
        $this->notifyPlayerTr((int) $pid, 'syncBelieverHand', '', [
          'cards' => array_values($cards)
        ]);
      }

      self::setGameStateValue('actions_performed_count', (int) $this->getMaxActionsThisTurn());
      $this->notifyPublicCountsSync();
      $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->gamestate->nextState('endTurn');
      return;
    }

    if ($effective_skill_type === 14) {
      $redistributed = $this->redistributeActionCardsFromAllHands($player_id);
      $this->incrementSkillUseCount($skill_card, 1);
      if ($is_gate_copied_use) {
        $this->clearGateTruthCopiedSkillContext();
      }

      $this->notifyAllPlayersTr('skillChaosComing', clienttranslate('${player_name} uses Chaos Coming. All Action cards in hand are shuffled and redistributed from ${player_name} seat order.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'total' => (int) $redistributed['total'],
        'source_counts' => $redistributed['source_counts'],
        'distribution' => $redistributed['distribution'],
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      foreach ($redistributed['hands'] as $pid => $cards) {
        $this->notifyPlayerTr((int) $pid, 'syncActionHand', '', [
          'cards' => array_values($cards)
        ]);
      }

      $this->notifyPublicCountsSync();
      $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->gamestate->nextState('playActionCard');
      return;
    }

    throw new BgaVisibleSystemException(clienttranslate("This skill is not available right now."));
  }

  function discardActionCards($card_ids)
  {
    self::checkAction("discardActionCards");
    $player_id = self::getActivePlayerId();
    $this->assertNoPendingPraiseLifeDecision((int) $player_id);
    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($player_role === 2) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid state: Wanderer has no Action cards to discard."));
    }
    $this->assertCanSpendActionSlot();

    if (count($card_ids) < 1) {
      throw new BgaVisibleSystemException(clienttranslate("Select at least one Action card to discard."));
    }

    $hand_cards = $this->action_cards->getCardsInLocation('hand', $player_id);
    $hand_card_ids = array_map('strval', array_keys($hand_cards));

    foreach ($card_ids as $card_id) {
      if (!in_array((string) $card_id, $hand_card_ids, true)) {
        throw new BgaVisibleSystemException(clienttranslate("You can only discard Action cards from your own hand"));
      }
    }

    $discard_map = $this->action_cards->getCards($card_ids);
    $discard_cards = [];
    foreach ($card_ids as $cid) {
      $cid = (int) $cid;
      $entry = $discard_map[$cid] ?? $discard_map[(string) $cid] ?? null;
      if (!$entry) continue;
      $discard_cards[] = [
        'id' => (int) $entry['id'],
        'type' => (string) $entry['type'],
      ];
    }

    $this->action_cards->moveCards($card_ids, 'discard');

    $discard_count = count($card_ids);
    $this->markPerformedActionBits(self::ACTION_BIT_DISCARD);
    $this->incrementPerformedActionCount(1);

    $this->notifyAllPlayersTr('actionCardsDiscarded', clienttranslate('${player_name} discards ${count} action card(s).'), array(
      'player_name' => self::getActivePlayerName(),
      'player_id' => $player_id,
      'n' => $discard_count,
      'count' => $discard_count,
      'card_ids' => $card_ids,
      'cards' => $discard_cards
    ));

    $this->finishPlayerAction();
  }

  /*
   * Divine Inspiration
   * Discard X Action Cards (excluding this one) -> Draw X Believer Cards.
   * Note: This is a Strategy Action, NOT a standard Discard Action.
   */
  function playDivineInspiration($card_ids_to_discard, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);

    if (count($card_ids_to_discard) < 1) {
      throw new BgaVisibleSystemException(clienttranslate("Select at least one Action card to discard."));
    }

    // Check if cards to discard are valid (must be Action Cards in hand)
    $cards = $this->action_cards->getCards($card_ids_to_discard);
    if (count($cards) !== count($card_ids_to_discard)) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid card selection for Divine Inspiration"));
    }
    foreach ($cards as $card) {
      if ($card['location'] != 'hand' || $card['location_arg'] != $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid card selection for Divine Inspiration"));
      }
      // Note: "this one" (Divine Inspiration itself) is already moved to 'cardsontable' by playActionCard logic
      // so we don't need to worry about discarding it again here.
    }
    $discard_map = [];
    foreach ($cards as $card) {
      $discard_map[(int) $card['id']] = $card;
      $discard_map[(string) $card['id']] = $card;
    }
    $discard_cards = [];
    foreach ($card_ids_to_discard as $cid) {
      $entry = $discard_map[(int) $cid] ?? $discard_map[(string) $cid] ?? null;
      if (!$entry) continue;
      $discard_cards[] = [
        'id' => (int) $entry['id'],
        'type' => (string) $entry['type'],
      ];
    }

    // Discard chosen cards
    $this->action_cards->moveCards($card_ids_to_discard, 'discard');
    // Network jitter/reconnect safety: immediately push authoritative Action
    // hand snapshot after Divine Inspiration discard, so client hand cannot keep
    // stale discarded cards if an earlier local animation/update is dropped.
    $this->notifyPlayerTr((int) $player_id, 'syncActionHand', '', [
      'cards' => array_values($this->action_cards->getCardsInLocation('hand', (int) $player_id))
    ]);

    // Draw X Believer Cards
    $discard_count = count($card_ids_to_discard);
    if ($this->queueProphetPredictionIfNeeded((int) $player_id, (int) $discard_count, 'divine_inspire', (int) $discard_count)) {
      return;
    }

    $deck_before = (int) $this->believer_cards->countCardInLocation('deck');
    $new_believers = array_values($this->believer_cards->pickCards($discard_count, 'deck', $player_id));
    $draw_count = count($new_believers);
    $insufficient_deck = $draw_count < $discard_count;

    $this->notifyAllPlayersTr('divineInspiration', clienttranslate('${player_name} uses Divine Inspiration: discards ${discard_n} Action card(s) to draw ${draw_n} Believers.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'player_id' => (int) $player_id,
      'discard_n' => (int) $discard_count,
      'draw_n' => (int) $draw_count,
      'draw_total_n' => (int) $draw_count,
      'deck_before' => (int) $deck_before,
      'insufficient_deck' => $insufficient_deck ? 1 : 0,
      'discard_card_ids' => array_values(array_map('intval', $card_ids_to_discard)),
      'discard_cards' => array_values($discard_cards),
      'prophet_flow' => 0
    ));
    $this->notifyPlayerTr($player_id, 'newBelievers', '', array('cards' => array_values($new_believers)));

    $this->finishPlayerAction();
  }

  /*
   * Info Spy
   * Reveal target player's Hand (Action + Believer). NOT Skills.
   * UI should show a modal with timer.
   */
  function playInfoSpy($target_player_id, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }

    // Get target's hand
    $action_hand = $this->action_cards->getCardsInLocation('hand', $target_player_id);
    $believer_hand = $this->believer_cards->getCardsInLocation('hand', $target_player_id);

    // Notify all players (public info)
    $target_name = self::getPlayerNameById($target_player_id);
    $this->notifyAllPlayersTr('infoSpy', clienttranslate('${player_name} spies on ${target_name}'), array(
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById($player_id),
      'target_id' => (int) $target_player_id,
      'target_name' => $target_name
    ));

    // Send private info to spy (Action + Believer only)
    $this->notifyPlayerTr($player_id, 'spyResult', '', array(
      'target_name' => $target_name,
      'action_cards' => $action_hand,
      'believer_cards' => $believer_hand
    ));

    self::setGameStateValue('info_spy_pending_player_id', (int) $player_id);
    $this->gamestate->nextState('infoSpyReview');
  }

  function completeInfoSpy(bool $from_zombie = false, ?int $zombie_player_id = null)
  {
    if (!$from_zombie) {
      self::checkAction('completeInfoSpy');
    }
    $player_id = $from_zombie ? (int) $zombie_player_id : (int) self::getCurrentPlayerId();
    $pending_player_id = (int) self::getGameStateValue('info_spy_pending_player_id');
    if ($pending_player_id <= 0 || $player_id !== $pending_player_id) {
      throw new BgaVisibleSystemException(clienttranslate("No pending Info Spy review to complete."));
    }

    $spy_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) use ($player_id) {
      return ((string) ($card['type'] ?? '')) === 'info_spy' && (int) ($card['location_arg'] ?? 0) === (int) $player_id;
    });
    $spy_cards = array_values($spy_cards);
    $card_id = !empty($spy_cards) ? (int) ($spy_cards[0]['id'] ?? 0) : 0;
    if ($card_id > 0) {
      $this->action_cards->moveCard($card_id, 'discard');
    }

    self::setGameStateValue('info_spy_pending_player_id', 0);
    $this->notifyAllPlayersTr('infoSpyFinished', clienttranslate('${player_name} finishes Info Spy.'), array(
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById($player_id),
      'card_id' => (int) $card_id
    ));
    $this->finishPlayerAction();
  }

  /*
   * Kowtow To Me
   * Force target player (Sect Leader) to join your Sect as Follower.
   * Condition: Your Sect Believers >= 2 * Target Sect Believers.
   * (Already checked in checkPlayableActionCards, but double check here for safety)
   */
  function playKowtowToMe($target_player_id, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $this->assertTargetIsNotWanderer($target_player_id);
    $attacker_sect = $this->getPlayerSect($player_id);
    $target_sect = $this->getPlayerSect($target_player_id);
    if ($attacker_sect < 0) {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer cannot use Kowtow To Me."));
    }
    if ($target_sect < 0 || $target_sect === $attacker_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Choose a different Sect."));
    }

    $attacker_believer_count = (int) $this->countSectHandBelievers((int) $attacker_sect);
    $target_believer_count = (int) $this->countSectHandBelievers((int) $target_sect);
    $threshold = intdiv($attacker_believer_count, 2);
    if ($target_believer_count > $threshold) {
      throw new BgaVisibleSystemException(clienttranslate("Target Sect is too large to be absorbed."));
    }

    $target_member_rows = self::getObjectListFromDB(
      "SELECT player_id, player_name FROM player WHERE player_sect = $target_sect AND player_role != 2 ORDER BY player_no ASC"
    );
    $target_member_names = array_values(array_map(function ($row) {
      return (string) ($row['player_name'] ?? '');
    }, $target_member_rows));
    $target_member_names = array_values(array_filter($target_member_names, function ($name) {
      return $name !== '';
    }));
    $target_member_names_text = empty($target_member_names) ? '-' : implode(', ', $target_member_names);
    $absorbed_player_ids = array_values(array_map(function ($row) {
      return (int) ($row['player_id'] ?? 0);
    }, $target_member_rows));
    $absorbed_player_ids = array_values(array_filter($absorbed_player_ids, function ($pid) {
      return (int) $pid > 0;
    }));

    $attacker_leader = $this->getSectLeaderId($attacker_sect, $player_id);
    $this->failImpermanenceAndRedrawSkill((int) $attacker_leader, 'recruit_follower');
    self::DbQuery("UPDATE player SET player_sect = $attacker_sect, player_role = 1, player_leader_id = $attacker_leader, player_is_skill_sealed = 1 WHERE player_sect = $target_sect AND player_role != 2");
    $this->applySkillSealEffectsForPlayers($absorbed_player_ids);
    foreach ($absorbed_player_ids as $absorbed_pid) {
      $this->failImpermanenceAndRedrawSkill((int) $absorbed_pid, 'kowtow_absorbed');
    }

    // Keep the original leader of attacker's sect as leader.
    self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_is_skill_sealed = 0 WHERE player_id = $attacker_leader");
    // Purple Hermit should be armed for any player who has just become a follower
    // by forced sect absorption as well (not only surrender flow).
    foreach ($absorbed_player_ids as $absorbed_pid) {
      $this->armPurpleHermitAfterSurrender((int) $absorbed_pid, (int) $attacker_leader);
    }
    $this->revealAscendWithMeIfLeaderHasFollowers((int) $attacker_leader);

    $this->notifyAllPlayersTr('kowtowToMe', clienttranslate('${player_name} absorbs ${target_sect_name} (${target_member_names}) into ${attacker_sect_name}.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'player_id' => (int) $player_id,
      'attacker_sect' => (int) $attacker_sect,
      'target_sect' => (int) $target_sect,
      'attacker_leader_id' => (int) $attacker_leader,
      'attacker_sect_name' => $this->getSectDisplayName((int) $attacker_sect),
      'target_sect_name' => $this->getSectDisplayName((int) $target_sect),
      'target_member_names' => $target_member_names_text,
      'target_member_names_list' => $target_member_names
    ));
    foreach ($absorbed_player_ids as $absorbed_pid) {
      $this->notifyPlayerTr(
        (int) $absorbed_pid,
        'kowtowForcedAbsorbed',
        clienttranslate('Your Sect ${target_sect_name} is absorbed by ${player_name}. You are now a Follower in ${attacker_sect_name}.'),
        [
          'player_id' => (int) $absorbed_pid,
          'absorber_id' => (int) $player_id,
          'player_name' => self::getPlayerNameById($player_id),
          'attacker_leader_id' => (int) $attacker_leader,
          'attacker_leader_name' => self::getPlayerNameById((int) $attacker_leader),
          'attacker_sect' => (int) $attacker_sect,
          'attacker_sect_name' => $this->getSectDisplayName((int) $attacker_sect),
          'target_sect' => (int) $target_sect,
          'target_sect_name' => $this->getSectDisplayName((int) $target_sect)
        ]
      );
    }
    $sync_ids = array_merge($absorbed_player_ids, [(int) $attacker_leader]);
    $this->notifyPlayerIdentitySync($sync_ids, 'kowtow_absorb');

    $this->finishPlayerAction();
  }

  /*
   * Have a Charity
   * Draw 2 Believer cards from deck.
   */
  function playHaveACharity(?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    if ($this->queueProphetPredictionIfNeeded((int) $player_id, 2, 'have_a_charity', 0)) {
      return;
    }

    $cards = array_values($this->believer_cards->pickCards(2, 'deck', $player_id));
    $draw_count = count($cards);

    $this->notifyAllPlayersTr('haveACharity', clienttranslate('${player_name} plays Have a Charity to draw ${n} Believers.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'player_id' => (int) $player_id,
      'n' => (int) $draw_count,
      'n_total' => (int) $draw_count,
      'prophet_flow' => 0
    ));
    $this->notifyPlayerTr($player_id, 'newBelievers', '', array('cards' => array_values($cards)));

    $this->finishPlayerAction();
  }

  /*
   * Great Mercy / It's a Miracle
   * Revive top 3 Believer cards from discard pile (Graveyard).
   */
  function playItsAMiracle(?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);

    // Get cards from discard
    // Note: BGA deck module 'pickCardsForLocation' picks from deck, not discard.
    // We need to manually move from 'discard' to 'hand'.
    // Logic: Get all cards in discard, sort by location_arg (order), take top 3.
    // However, simplified logic: just take any 3 (or top 3 if tracked).
    // Deck module doesn't strictly track order in discard unless we use location_arg.
    // Assuming standard "shuffle" pile behavior or LIFO.

    // Check if there are cards in discard
    $discard_count = $this->believer_cards->countCardInLocation('discard');
    $count = min(3, $discard_count);

    if ($count > 0) {
      $discarded_cards = array_values($this->believer_cards->getCardsInLocation('discard', null, 'location_arg DESC')); // newest first
      $cards_to_revive = array_slice($discarded_cards, 0, $count);
      $ids = array_map(function ($c) {
        return $c['id'];
      }, $cards_to_revive);

      $this->believer_cards->moveCards($ids, 'hand', $player_id);

      $this->notifyAllPlayersTr('greatMercy', clienttranslate('${player_name} uses It\'s a Miracle and revives the top ${n} Believers from the graveyard'), array(
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => $player_id,
        'n' => $count,
        'cards' => array_values($cards_to_revive),
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst()
      ));
      $this->notifyPlayerTr($player_id, 'newBelievers', '', array('cards' => $cards_to_revive));
    } else {
      $this->notifyAllPlayersTr('greatMercy', clienttranslate('${player_name} tries to use It\'s a Miracle, but the graveyard is empty!'), array(
        'player_name' => self::getPlayerNameById($player_id)
      ));
    }

    $this->finishPlayerAction();
  }

  /*
   * Secret Alliance flow:
   * 1) Active player plays Secret Alliance and chooses target.
   * 2) Active player chooses one Action card to offer.
   * 3) Target player chooses one Action card.
   * 4) Exchange those cards.
   */
  function playSecretAlliance($target_id, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $target_id = (int) $target_id;
    $this->assertTargetIsNotWanderer($target_id);

    if ($target_id === $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose another player."));
    }

    // Secret Alliance itself is already moved to table at this point.
    if ($this->action_cards->countCardInLocation('hand', $player_id) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("You must have another Action card in hand to offer."));
    }
    if ($this->action_cards->countCardInLocation('hand', $target_id) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target player has no Action cards to exchange."));
    }

    self::setGameStateValue('secret_alliance_attacker_id', $player_id);
    self::setGameStateValue('secret_alliance_target_id', $target_id);
    self::setGameStateValue('secret_alliance_attacker_card_id', 0);
    self::setGameStateValue('secret_alliance_target_card_id', 0);

    $this->notifyAllPlayersTr('secretAllianceStarted', clienttranslate('${player_name} starts Secret Alliance with ${target_name}.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'target_name' => self::getPlayerNameById($target_id),
      'target_id' => (int) $target_id
    ));

    $this->gamestate->nextState('secretAllianceAttackerChoice');
  }

  function playBreakingFaith($target_player_id, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $target_player_id = (int) $target_player_id;
    $this->assertTargetIsNotWanderer($target_player_id);
    if ($target_player_id === $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose another player."));
    }

    $attacker_sect = $this->getPlayerSect($player_id);
    $target_sect = $this->getPlayerSect($target_player_id);
    if ($attacker_sect < 0 || $attacker_sect !== $target_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Breaking Faith can only target players in your own Sect."));
    }

    $attacker_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    $target_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $target_player_id");
    $sect_leader = $this->getSectLeaderId($attacker_sect, $player_id);

    if ($attacker_role === 1) {
      if ($target_player_id !== $sect_leader) {
        throw new BgaVisibleSystemException(clienttranslate("Follower can only target Sect Leader with Breaking Faith."));
      }
    } elseif ($attacker_role === 0) {
      if ($target_role !== 1) {
        throw new BgaVisibleSystemException(clienttranslate("Leader can only target a Follower with Breaking Faith."));
      }
    } else {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer cannot use Breaking Faith."));
    }

    $this->clearCombatSkillState();
    self::setGameStateValue('war_attacker_id', (int) $player_id);
    self::setGameStateValue('war_defender_id', (int) $target_player_id);
    self::setGameStateValue('war_type', 4);
    self::setGameStateValue('breaking_faith_defended', 0);
    self::setGameStateValue('war_attack_blocked', 0);

    $this->notifyAllPlayersTr('breakingFaithStart', clienttranslate('${player_name} uses Breaking Faith on ${target_name}.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'player_id' => (int) $player_id,
      'target_name' => self::getPlayerNameById($target_player_id),
      'target_id' => (int) $target_player_id
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Physical Attacks
  ////////////

  /*
   * Witch Hunt
   * Target Sect -> Specific Believer Type -> Discard ALL matching.
   */
  function playWitchHunt($target_player_id, $believer_type, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    if ($believer_type === null || $believer_type < 1 || $believer_type > 5) {
      throw new BgaVisibleSystemException(clienttranslate("Choose a Believer type for Witch Hunt."));
    }

    $target_sect = $this->getPlayerSect($target_player_id);
    $attacker_sect = $this->getPlayerSect($player_id);
    if ($target_sect < 0 || $target_sect === $attacker_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Witch Hunt must target another Sect"));
    }

    // Store Witch Hunt context and resolve via defense flow.
    $this->clearCombatSkillState();
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id); // used to infer sect
    self::setGameStateValue('war_type', 8); // 8 = Witch Hunt
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_card_defender', (int) $believer_type); // reuse as targeted believer type

    // Keep selected believer type hidden until defense window closes.
    $this->notifyAllPlayersTr('witchHuntStart', clienttranslate('${player_name} launches Witch Hunt against ${target_sect_name}.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'player_id' => (int) $player_id,
      'target_name' => self::getPlayerNameById($target_player_id),
      'target_player_id' => $target_player_id,
      'target_sect' => $target_sect,
      'target_sect_name' => $this->getSectDisplayName((int) $target_sect)
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Mental Attacks
  ////////////

  /*
   * Spread Rumors
   * Temporary live-test implementation: target 1 player and steal 1 random Believer.
   * This avoids the unfinished sect/follower DB model while keeping the card playable.
   */
  function playSpreadRumors($target_player_id, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    $attacker_sect = $this->getPlayerSect($player_id);
    $target_sect = $this->getPlayerSect($target_player_id);
    if ($target_sect < 0 || $target_sect === $attacker_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Spread Rumors must target another Sect"));
    }
    if ($this->countSectHandBelievers((int) $target_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target Sect has no Believers for Spread Rumors."));
    }

    $this->clearCombatSkillState();
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id);
    self::setGameStateValue('war_type', 9); // 9 = Spread Rumors
    self::setGameStateValue('war_attack_blocked', 0);

    $this->notifyAllPlayersTr('spreadRumorsStart', clienttranslate('${player_name} plays Spread Rumors targeting ${target_sect_name}.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'player_id' => $player_id,
      'target_player_id' => $target_player_id,
      'target_sect' => $target_sect,
      'target_sect_name' => $this->getSectDisplayName((int) $target_sect)
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Faith Debate
   * Current implementation: target one player and steal 1 random Believer.
   * This keeps the card functional in live testing until the full duel/max-5 logic is added.
   */
  function playFaithDebate($target_player_id, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    $attacker_sect = $this->getPlayerSect($player_id);
    $defender_sect = $this->getPlayerSect($target_player_id);
    if ($attacker_sect < 0 || $defender_sect < 0 || $attacker_sect === $defender_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Faith Debate must target another Sect"));
    }
    if ($this->countSectHandBelievers($attacker_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Your Sect has no Believers available for Faith Debate."));
    }
    if ($this->countSectHandBelievers($defender_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target Sect has no Believers available for this confrontation."));
    }

    $this->clearCombatSkillState();
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id);
    self::setGameStateValue('war_type', 7); // 7 = Faith Debate (mental)
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('debate_round', 0);
    self::setGameStateValue('debate_stop_requested', 0);
    $this->incStat(1, 'faith_debates_started');
    $this->incStat(1, 'faith_debates_declared', (int) $player_id);

    $this->notifyAllPlayersTr('faithDebateStart', clienttranslate('${player_name} starts a Faith Debate: ${attacker_sect_name} vs ${defender_sect_name} (max 5 rounds).'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'target_name' => self::getPlayerNameById($target_player_id),
      'player_id' => $player_id,
      'target_player_id' => $target_player_id,
      'attacker_sect' => $attacker_sect,
      'defender_sect' => $defender_sect,
      'attacker_sect_name' => $this->getSectDisplayName((int) $attacker_sect),
      'defender_sect_name' => $this->getSectDisplayName((int) $defender_sect)
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Faith War
   * Declare war on a target Sect. Initiates a multi-active state where
   * all members of both Sects select a Believer card for combat.
   */
  function playFaithWar($target_player_id, $use_zombie_army = false, ?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    $attacker_sect = $this->getPlayerSect($player_id);
    $defender_sect = $this->getPlayerSect($target_player_id);
    if ($attacker_sect < 0 || $defender_sect < 0 || $attacker_sect === $defender_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Faith War must target another Sect"));
    }
    $zombie_owner_id = 0;
    $graveyard_count = (int) $this->believer_cards->countCardInLocation('discard');
    // Normalize discard ordering before snapshot so Zombie Army snapshot boundary
    // is monotonic and never includes cards that die after war start.
    $graveyard_snapshot_max_arg = (int) $this->normalizeBelieverDiscardOrderArgs();
    if ((bool) $use_zombie_army) {
      $zombie_owner_id = (int) $this->getZombieArmyLeaderForAttacker((int) $player_id);
      if ($zombie_owner_id <= 0) {
        throw new BgaVisibleSystemException(clienttranslate("Zombie Army is not available for this Faith War."));
      }
      if ($graveyard_count <= 0) {
        throw new BgaVisibleSystemException(clienttranslate("Zombie Army cannot be used because the graveyard has no Believers."));
      }
    }
    $attacker_available = (int) $this->countSectHandBelievers($attacker_sect);
    if ($zombie_owner_id > 0) {
      $attacker_available += (int) $graveyard_count;
    }

    if ($attacker_available <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Your Sect has no Believers available for Faith War."));
    }
    if ($this->countSectHandBelievers($defender_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target Sect has no Believers available for this confrontation."));
    }

    // Using Zombie Army is an active skill use and must reveal the skill owner.
    // If Zombie Army is mirrored by Gate of Truth, reveal Gate instead.
    if ($zombie_owner_id > 0) {
      if ((int) $this->getSkillTypeInPlayerHandByPlayer((int) $zombie_owner_id) === 10) {
        $this->revealSkillAndNotifyIfNeeded((int) $zombie_owner_id, 10);
      } elseif ($this->canPlayerUseCopiedSkillAbility((int) $zombie_owner_id, 10)) {
        $this->revealSkillAndNotifyIfNeeded((int) $zombie_owner_id, 9);
      }
      $this->notifyPlayerTr((int) $zombie_owner_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer((int) $zombie_owner_id)
      ]);
    }

    // Store state context (current flow is a 1v1 duel loop)
    $this->clearCombatSkillState();
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id);
    self::setGameStateValue('war_type', 2); // 2 = Faith War (physical attack)
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_zombie_owner_id', (int) $zombie_owner_id);
    self::setGameStateValue('war_zombie_snapshot_max_discard_arg', ($zombie_owner_id > 0) ? (int) $graveyard_snapshot_max_arg : 0);
    $this->incStat(1, 'faith_wars_started');
    $this->incStat(1, 'faith_wars_declared', (int) $player_id);
    $this->clearFaithWarParticipants();

    $this->notifyAllPlayersTr('faithWarStart', clienttranslate('${player_name} declares a Faith War: ${attacker_sect_name} vs ${defender_sect_name}!'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'target_name' => self::getPlayerNameById($target_player_id),
      'player_id' => $player_id,
      'target_player_id' => $target_player_id,
      'attacker_sect' => $attacker_sect,
      'defender_sect' => $defender_sect,
      'attacker_sect_name' => $this->getSectDisplayName((int) $attacker_sect),
      'defender_sect_name' => $this->getSectDisplayName((int) $defender_sect),
      'zombie_owner_id' => (int) $zombie_owner_id,
      'graveyard_count' => (int) $graveyard_count,
      'war_zombie_snapshot_max_discard_arg' => (int) (($zombie_owner_id > 0) ? $graveyard_snapshot_max_arg : 0)
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Martyrdom
   * AoE Physical Attack. Attacker sacrifices 1 believer.
   * All others choose 1 believer. Draw/Lose = Death for defender.
   */
  function playMartyrdom(?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $attacker_sect = (int) $this->getPlayerSect($player_id);
    if ($this->countSectHandBelievers($attacker_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Your Sect has no Believers for Martyrdom."));
    }

    // Store context
    $this->clearCombatSkillState();
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 3); // 3 = Martyrdom
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    $this->clearAoeDefendedSectMask();
    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0");

    $this->notifyAllPlayersTr('martyrdomStart', clienttranslate('${player_name} initiates Martyrdom! Everyone else must defend.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'player_id' => (int) $player_id
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Conspiracy
   * AoE Mental Attack. Attacker sends 1 believer to snatch others.
   */
  function playConspiracy(?int $acting_player_id = null)
  {
    $player_id = $this->getActionActingPlayerId($acting_player_id);
    $attacker_sect = (int) $this->getPlayerSect($player_id);
    if ($this->countSectHandBelievers($attacker_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Your Sect has no Believers for Conspiracy."));
    }

    // Store context
    $this->clearCombatSkillState();
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 6); // 6 = Conspiracy
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    $this->clearAoeDefendedSectMask();
    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0");

    $this->notifyAllPlayersTr('conspiracyStart', clienttranslate('${player_name} spreads a Conspiracy! Other Sects must defend.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'player_id' => (int) $player_id
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Generic Defense Confirmation Logic (State 50)
   */
  function stConfirmDefense()
  {
    $attacker_id = self::getGameStateValue('war_attacker_id');
    $defender_id = self::getGameStateValue('war_defender_id');
    $war_type = self::getGameStateValue('war_type');
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_sect = $this->getPlayerSect($attacker_id);

    // Determine targets
    $targets = [];
    $players = self::loadPlayersBasicInfos();
    $target_sects_with_defense = [];
    $target_sects_without_defense = [];
    $defense_kind = $this->getDefenseKindByWarType((int) $war_type);

    // For Martyrdom/Conspiracy, evaluate defense on a sect basis first:
    // if a sect has no defender card at all, skip defense prompt for that sect.
    if ($war_type == 3 || $war_type == 6) {
      $candidate_by_sect = [];
      $skill_auto_defended_sects = array_fill_keys(
        $this->getSkillDefendedSectsForAoe((int) $war_type, (int) $attacker_sect),
        true
      );
      foreach ($players as $pid => $_p) {
        $pid = (int) $pid;
        if ($pid === (int) $attacker_id) continue;
        $sect = (int) $this->getPlayerSect($pid);
        if ($sect < 0 || $sect === (int) $attacker_sect) continue;
        if (!isset($candidate_by_sect[$sect])) $candidate_by_sect[$sect] = [];
        $candidate_by_sect[$sect][] = $pid;
      }

      foreach ($candidate_by_sect as $sect => $member_ids) {
        if (isset($skill_auto_defended_sects[(int) $sect])) {
          $target_sects_with_defense[] = (int) $sect;
          $auto_defender_pid = 0;
          foreach ($member_ids as $pid) {
            if ($war_type == 3 && $this->isPlayerProtectedFromPhysicalSkill((int) $pid)) {
              $auto_defender_pid = (int) $pid;
              break;
            }
            if ($war_type == 6 && $this->isPlayerProtectedFromMentalSkill((int) $pid)) {
              $auto_defender_pid = (int) $pid;
              break;
            }
          }
          if ($auto_defender_pid > 0) {
            $this->notifyAllPlayersTr('skillAutoDefense', clienttranslate('${player_name} is protected from ${attack_kind} attacks. This attack has no effect.'), [
              'player_id' => $auto_defender_pid,
              'player_name' => self::getPlayerNameById($auto_defender_pid),
              'sect_id' => (int) $sect,
              'defense_kind' => $defense_kind,
              'attack_kind' => $this->getDefenseAttackKindLabel($defense_kind)
            ]);
          }
          continue;
        }

        // AOE defense is no longer a separate window: representatives choose
        // "Believer or defense card" concealed during the commit phase, so
        // the attacker cannot tell who defended until resolution. Only the
        // skill auto-defense above is resolved here.
      }
    } else {
      foreach ($players as $pid => $_p) {
        if ($pid == $attacker_id) continue;

        // Faith War/Faith Debate/Witch Hunt/Spread Rumors are sect vs sect:
        // only players in defending sect may respond.
        if (($war_type == 2 || $war_type == 7 || $war_type == 8 || $war_type == 9) && $this->getPlayerSect((int) $pid) !== $defender_sect) {
          continue;
        }
        if ($war_type == 4 && (int) $pid !== (int) $defender_id) {
          continue;
        }

        // Check if player has a valid defense card for this attack.
        $has_defense = false;
        if ($war_type == 1 || $war_type == 2 || $war_type == 3 || $war_type == 8) { // Physical
          foreach ($this->action_cards->getCardsInLocation('hand', $pid) as $c) {
            if ($c['type'] == 'great_mercy') {
              $has_defense = true;
              break;
            }
          }
        } elseif ($war_type == 4) { // Breaking Faith
          foreach ($this->action_cards->getCardsInLocation('hand', $pid) as $c) {
            if ($c['type'] == 'breaking_faith') {
              $has_defense = true;
              break;
            }
          }
        } else { // Mental (Faith Debate / Spread Rumors)
          foreach ($this->action_cards->getCardsInLocation('hand', $pid) as $c) {
            if ($c['type'] == 'firm_faith') {
              $has_defense = true;
              break;
            }
          }
        }

        if ($has_defense) {
          $targets[] = (int) $pid;
        }
      }
    }

    if (empty($targets)) {
      // No one can defend: skip extra notification noise and resolve immediately.
      $this->gamestate->nextState('resolveAttack');
    } else {
      if ($war_type == 3 || $war_type == 6) {
        $this->notifyAllPlayersTr('defenseDecisionPhase', clienttranslate('Waiting for players to decide whether to defend.'), [
          'phase' => 'defense_prompt',
          'defense_kind' => $defense_kind,
          'scope' => 'sect',
          'sect_ids' => array_values(array_unique(array_map('intval', $target_sects_with_defense))),
          'sects_without_defense' => array_values(array_unique(array_map('intval', $target_sects_without_defense)))
        ]);
      } else {
        $target_names = array_map(function ($pid) {
          return self::getPlayerNameById((int) $pid);
        }, $targets);
        $this->notifyAllPlayersTr('defenseDecisionPhase', clienttranslate('Waiting for players to decide whether to defend.'), [
          'phase' => 'defense_prompt',
          'defense_kind' => $defense_kind,
          'scope' => 'player',
          'defender_ids' => $targets,
          'defender_names' => $target_names
        ]);
      }
      $this->gamestate->setPlayersMultiactive($targets, 'nextDefenseStep');
      $this->runPracticeAiForCurrentStateIfNeeded();
    }
  }
  //////////// 

  function playDefenseCard($card_id)
  {
    self::checkAction("playDefenseCard");
    $player_id = self::getCurrentPlayerId();
    if ($player_id == 0) {
      $player_id = self::getActivePlayerId();
    }
    $this->playDefenseCardInternal((int) $player_id, $card_id);
  }

  // Session-safe core shared by the player action and bot automation.
  // In the AOE believer-commit states (Martyrdom/Conspiracy) the defense is
  // committed CONCEALED: publicly it looks exactly like a believer commit
  // and is revealed only at resolution.
  private function playDefenseCardInternal(int $player_id, $card_id): void
  {
    $player_id = (int) $player_id;
    $card = $this->action_cards->getCard($card_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You do not have this defense card in hand"));
    }

    $war_type = (int) self::getGameStateValue('war_type');
    $state_name = (string) $this->getCurrentStateNameSafe();
    // AOE defense window spans representative choice AND believer commit;
    // it closes per sect once that sect's representative commits a believer.
    $aoe_phase_exits = [
      'martyrdomChooseRepresentative' => 'chooseDone',
      'conspiracyChooseRepresentative' => 'chooseDone',
      'martyrdomChooseBelievers' => 'nextStep',
      'conspiracyChooseBelievers' => 'nextStep',
    ];
    $in_aoe_commit = isset($aoe_phase_exits[$state_name]);
    if ($in_aoe_commit && $war_type != 3 && $war_type != 6) {
      // conspiracyChooseBelievers is shared by Final Struggle (war 11).
      throw new BgaVisibleSystemException(clienttranslate("Defense cards cannot be played right now."));
    }
    if ($war_type == 3 || $war_type == 6) {
      $attacker_sect = (int) $this->getPlayerSect((int) self::getGameStateValue('war_attacker_id'));
      if ((int) $this->getPlayerSect($player_id) === $attacker_sect) {
        throw new BgaVisibleSystemException(clienttranslate("You cannot defend against your own Sect's attack."));
      }
    }
    $defense_kind = $this->getDefenseKindByWarType($war_type);
    if ($defense_kind === 'physical') {
      $valid_types = ['great_mercy'];
    } elseif ($defense_kind === 'breaking_faith') {
      $valid_types = ['breaking_faith'];
    } else {
      $valid_types = ['firm_faith'];
    }
    if (!in_array($card['type'], $valid_types)) {
      if ($defense_kind === 'mental') {
        throw new BgaVisibleSystemException(clienttranslate("This is a Mental Attack. You must use a Mental defense card (Firm Faith)."));
      }
      if ($defense_kind === 'breaking_faith') {
        throw new BgaVisibleSystemException(clienttranslate("This is a Breaking Faith betrayal. You must use Breaking Faith to defend."));
      }
      throw new BgaVisibleSystemException(clienttranslate("This is a Physical Attack. You must use a Physical defense card (Great Mercy)."));
    }

    $moved_to_discard = 1;
    if ($war_type == 3 && $card['type'] === 'great_mercy') {
      // Keep a temporary marker so Martyrdom resolution can skip this defender.
      $this->action_cards->moveCard($card_id, 'martyrdef', $player_id);
      $moved_to_discard = 0;
    } elseif ($war_type == 6 && $card['type'] === 'firm_faith') {
      // One Firm Faith can defend the entire sect during Conspiracy.
      $this->action_cards->moveCard($card_id, 'conspdef', $player_id);
      $moved_to_discard = 0;
    } else {
      $this->action_cards->moveCard($card_id, 'discard');
    }
    if (($war_type == 2 || $war_type == 8) && $card['type'] === 'great_mercy') {
      self::setGameStateValue('war_attack_blocked', 1);
    }
    if (($war_type == 7 || $war_type == 9) && $card['type'] === 'firm_faith') {
      self::setGameStateValue('war_attack_blocked', 1);
    }
    if ($war_type == 4 && $card['type'] === 'breaking_faith') {
      self::setGameStateValue('breaking_faith_defended', 1);
    }
    if ($war_type == 3 || $war_type == 6) {
      $this->markAoeSectDefended((int) $this->getPlayerSect((int) $player_id));
    }
    $this->incStat(1, 'defense_cards_played', (int) $player_id);
    if ($in_aoe_commit) {
      // Concealed commit: release the whole sect's representative duty so
      // resolution does not auto-commit a Believer for the defended sect,
      // publish only a believer-looking facedown commit, and release every
      // same-sect waiting player (leader still assigning, representative,
      // or other defense holders).
      $defender_sect = (int) $this->getPlayerSect((int) $player_id);
      $rep_flag = ($war_type == 3) ? 'player_is_martyrdom_rep' : 'player_is_conspiracy_rep';
      self::DbQuery("UPDATE player SET $rep_flag = 0 WHERE player_sect = $defender_sect");
      $this->notifyAllPlayersTr('defensePlayed', '', [
        'anonymous' => true,
        'concealed' => 1,
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'sect_id' => (int) $defender_sect
      ]);
      $this->notifyPlayerTr((int) $player_id, 'defenseCommittedPrivate', '', [
        'player_id' => (int) $player_id,
        'card_id' => (int) $card_id,
        'card_type' => (string) $card['type']
      ]);
      $exit_transition = (string) $aoe_phase_exits[$state_name];
      $this->releaseSameSectActivePlayers((int) $defender_sect, (int) $player_id, $exit_transition);
      $this->gamestate->setPlayerNonMultiactive($player_id, $exit_transition);
      return;
    }
    if ($war_type == 3 || $war_type == 6) {
      // AoE defense should stay hidden until reveal phase.
      $this->notifyAllPlayersTr('defensePlayed', '', array(
        'anonymous' => true,
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => (int) $card_id,
        'card_type' => (string) $card['type'],
        'moved_to_discard' => (int) $moved_to_discard,
        'sect_id' => (int) $this->getPlayerSect((int) $player_id)
      ));
    } else {
      $this->notifyAllPlayersTr('defensePlayed', clienttranslate('${player_name} uses a defense card'), array(
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => (int) $card_id,
        'card_type' => (string) $card['type'],
        'moved_to_discard' => (int) $moved_to_discard,
        'sect_id' => (int) $this->getPlayerSect((int) $player_id)
      ));
    }

    // Martyrdom/Conspiracy use sect-wide defense. Once one member defends, other
    // active defenders in the same sect are auto-finished to avoid double spending.
    if ($war_type == 3 || $war_type == 6) {
      $defender_sect = (int) $this->getPlayerSect((int) $player_id);
      foreach ($this->gamestate->getActivePlayerList() as $active_pid) {
        $active_pid = (int) $active_pid;
        if ($active_pid !== (int) $player_id && (int) $this->getPlayerSect($active_pid) === $defender_sect) {
          $this->gamestate->setPlayerNonMultiactive($active_pid, 'nextDefenseStep');
        }
      }
    }

    // Faith War / Faith Debate are 1v1 Sect-vs-Sect: a single Great Mercy /
    // Firm Faith blocks the whole attack. Once it is blocked, the defense
    // window is over for the entire defending Sect, so auto-finish every other
    // active defender (e.g. the Sect Leader who also holds a defense card) —
    // otherwise they keep getting prompted after a Follower already blocked.
    if (($war_type == 2 || $war_type == 7) && (int) self::getGameStateValue('war_attack_blocked') === 1) {
      foreach ($this->gamestate->getActivePlayerList() as $active_pid) {
        $active_pid = (int) $active_pid;
        if ($active_pid !== (int) $player_id) {
          $this->gamestate->setPlayerNonMultiactive($active_pid, 'nextDefenseStep');
        }
      }
    }

    $this->gamestate->setPlayerNonMultiactive($player_id, 'nextDefenseStep');
  }

  private function releaseSameSectActivePlayers(int $sect, int $except_player_id, string $transition): void
  {
    foreach ($this->gamestate->getActivePlayerList() as $active_pid) {
      $active_pid = (int) $active_pid;
      if ($active_pid !== (int) $except_player_id && (int) $this->getPlayerSect($active_pid) === (int) $sect) {
        $this->gamestate->setPlayerNonMultiactive($active_pid, $transition);
      }
    }
  }

  // Sect members holding the matching defense card, for sects that have an
  // active believer-committing representative this commit phase.
  private function getAoeCommitPhaseDefenseHolderIds(int $war_type, array $rep_ids): array
  {
    $needed_type = ($war_type === 3) ? 'great_mercy' : 'firm_faith';
    $attacker_sect = (int) $this->getPlayerSect((int) self::getGameStateValue('war_attacker_id'));
    $holders = [];
    foreach ($rep_ids as $rep_id) {
      $sect = (int) $this->getPlayerSect((int) $rep_id);
      if ($sect < 0 || $sect === $attacker_sect) continue;
      foreach ($this->getSectPlayerIds($sect) as $member_id) {
        $member_id = (int) $member_id;
        foreach ($this->action_cards->getCardsInLocation('hand', $member_id) as $card) {
          if ((string) ($card['type'] ?? '') === $needed_type) {
            $holders[] = $member_id;
            break;
          }
        }
      }
    }
    return array_values(array_unique($holders));
  }

  // Reveal concealed AOE defenses at resolution: each marker card flips the
  // believer-looking facedown commit into the actual defense card.
  private function notifyAoeDefenseReveals(array $marker_cards): void
  {
    foreach ($marker_cards as $def_card) {
      $def_owner = (int) ($def_card['location_arg'] ?? 0);
      if ($def_owner <= 0) continue;
      $card_type = (string) ($def_card['type'] ?? '');
      $this->notifyAllPlayersTr(
        'defensePlayed',
        clienttranslate('${player_name} reveals ${card_name}: their Sect is defended.'),
        [
          'reveal' => 1,
          'player_id' => (int) $def_owner,
          'player_name' => self::getPlayerNameById((int) $def_owner),
          'card_id' => (int) ($def_card['id'] ?? 0),
          'card_type' => $card_type,
          'card_name' => isset($this->type_labels[$card_type]['name'])
            ? (string) $this->type_labels[$card_type]['name']
            : $card_type,
          'i18n' => ['card_name'],
          'moved_to_discard' => 1,
          'sect_id' => (int) $this->getPlayerSect((int) $def_owner)
        ]
      );
    }
  }

  function passDefense()
  {
    self::checkAction("passDefense");
    $player_id = self::getCurrentPlayerId();
    if ($player_id == 0) {
      $player_id = self::getActivePlayerId();
    }
    $war_type = (int) self::getGameStateValue('war_type');
    if ($war_type == 3 || $war_type == 6) {
      $this->notifyAllPlayersTr('passDefense', '', array(
        'anonymous' => true
      ));
    } else {
      $this->notifyAllPlayersTr('passDefense', clienttranslate('${player_name} does not defend'), array(
        'player_name' => self::getPlayerNameById($player_id),
        'anonymous' => false
      ));
    }
    $this->gamestate->setPlayerNonMultiactive($player_id, 'nextDefenseStep');
  }

  function stAfterDefenseResponses()
  {
    if (self::getGameStateValue('war_attack_blocked')) {
      $war_type = (int) self::getGameStateValue('war_type');
      $blocked_card_types = [];
      $blocked_message = clienttranslate('Attack is blocked by defense and ends immediately.');
      if ($war_type === 2) {
        $blocked_card_types = ['faith_war'];
        $blocked_message = clienttranslate('Faith War is blocked by defense and ends immediately.');
      } elseif ($war_type === 7) {
        $blocked_card_types = ['faith_debate'];
        $blocked_message = clienttranslate('Faith Debate is blocked by defense and ends immediately.');
      } elseif ($war_type === 8) {
        $blocked_card_types = ['witch_hunt'];
        $blocked_message = clienttranslate('Witch Hunt is blocked by defense and ends immediately.');
      } elseif ($war_type === 9) {
        $blocked_card_types = ['spread_rumors'];
        $blocked_message = clienttranslate('Spread Rumors is defended and has no effect.');
      }
      if (!empty($blocked_card_types)) {
        $blocked_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) use ($blocked_card_types) {
          return in_array($card['type'], $blocked_card_types, true);
        });
        if (!empty($blocked_cards)) {
          $this->action_cards->moveCards(array_keys($blocked_cards), 'discard');
        }
      }

      self::setGameStateValue('war_attacker_id', 0);
      self::setGameStateValue('war_defender_id', 0);
      self::setGameStateValue('war_card_attacker', 0);
      self::setGameStateValue('war_card_defender', 0);
      self::setGameStateValue('war_type', 0);
      self::setGameStateValue('war_attack_blocked', 0);
      self::setGameStateValue('breaking_faith_defended', 0);
      self::setGameStateValue('war_rep_attacker_id', 0);
      self::setGameStateValue('war_rep_defender_id', 0);
      self::setGameStateValue('debate_round', 0);
      self::setGameStateValue('debate_stop_requested', 0);
      $this->clearAoeDefendedSectMask();
      $this->clearCombatSkillState();
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0, player_is_martyrdom_rep = 0");

      $this->notifyAllPlayersTr('combatBlocked', $blocked_message, [
        'war_type' => $war_type,
        'zombie_owner_id' => 0,
        'war_zombie_snapshot_max_discard_arg' => 0,
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst()
      ]);
      $this->routeAfterActionWindowCheck('cancelAttack', 'cancelAttackEndTurn');
      return;
    }
    $this->gamestate->nextState('resolveAttack');
  }

  function stChooseWarRepresentative()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $war_type = (int) self::getGameStateValue('war_type');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_leader = $this->getSectLeaderId($attacker_sect, $attacker_id);
    $defender_leader = $this->getSectLeaderId($defender_sect, $defender_id);
    $attacker_remaining = $this->getFaithWarAvailableBelieversForSect($attacker_sect);
    $defender_remaining = $this->getFaithWarAvailableBelieversForSect($defender_sect);

    if ($attacker_remaining <= 0 || $defender_remaining <= 0) {
      if ($war_type === 12) {
        $this->finalizeFaithWar($attacker_id, $defender_id, $attacker_sect, $defender_sect, true);
        return;
      }
      $this->endFaithWarForDepletedSect((int) $attacker_sect, (int) $defender_sect, (int) $attacker_remaining, (int) $defender_remaining);
      return;
    }

    $next_attacker_rep = 0;
    $next_defender_rep = 0;

    $leaders_to_activate = [];
    $attacker_choices = $this->getFaithWarCombatReadyPlayerIds($attacker_sect);
    $defender_choices = $this->getFaithWarCombatReadyPlayerIds($defender_sect);

    if (count($attacker_choices) === 1) {
      $next_attacker_rep = (int) $attacker_choices[0];
      $this->notifyAllPlayersTr('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their Sect.'), [
        'leader_id' => $attacker_leader,
        'leader_name' => self::getPlayerNameById($attacker_leader),
        'representative_id' => (int) $attacker_choices[0],
        'representative_name' => self::getPlayerNameById((int) $attacker_choices[0])
      ]);
      $this->notifyPlayerTr((int) $attacker_choices[0], 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
        'leader_id' => $attacker_leader,
        'leader_name' => self::getPlayerNameById($attacker_leader),
        'representative_id' => (int) $attacker_choices[0]
      ]);
    } else {
      $leaders_to_activate[] = (int) $attacker_leader;
    }

    if (count($defender_choices) === 1) {
      $next_defender_rep = (int) $defender_choices[0];
      $this->notifyAllPlayersTr('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their Sect.'), [
        'leader_id' => $defender_leader,
        'leader_name' => self::getPlayerNameById($defender_leader),
        'representative_id' => (int) $defender_choices[0],
        'representative_name' => self::getPlayerNameById((int) $defender_choices[0])
      ]);
      $this->notifyPlayerTr((int) $defender_choices[0], 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
        'leader_id' => $defender_leader,
        'leader_name' => self::getPlayerNameById($defender_leader),
        'representative_id' => (int) $defender_choices[0]
      ]);
    } else {
      $leaders_to_activate[] = (int) $defender_leader;
    }

    $this->setWarRepresentativeIdsStable((int) $next_attacker_rep, (int) $next_defender_rep);
    $leaders_to_activate = array_values(array_unique($leaders_to_activate));

    $this->notifyAllPlayersTr('faithWarRepresentativePhase', clienttranslate('Sect Leaders choose who represents their Sect this round.'), [
      'attacker_leader_id' => $attacker_leader,
      'defender_leader_id' => $defender_leader,
      'attacker_sect' => $attacker_sect,
      'defender_sect' => $defender_sect
    ]);

    if (empty($leaders_to_activate)) {
      $this->gamestate->nextState('chooseDone');
      return;
    }

    $this->gamestate->setPlayersMultiactive($leaders_to_activate, 'chooseDone');
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function chooseWarRepresentative($representative_id)
  {
    self::checkAction("chooseWarRepresentative");
    $player_id = (int) self::getCurrentPlayerId();
    $representative_id = (int) $representative_id;
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_leader = $this->getSectLeaderId($attacker_sect, $attacker_id);
    $defender_leader = $this->getSectLeaderId($defender_sect, $defender_id);

    $this->lockRepresentativeLeaderRows((int) $attacker_leader, (int) $defender_leader);
    $allowed = [];
    if ($player_id === $attacker_leader) {
      $allowed = $this->getFaithWarCombatReadyPlayerIds($attacker_sect);
      if (!in_array($representative_id, $allowed, true)) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid representative for your Sect"));
      }
      self::setGameStateValue('war_rep_attacker_id', (int) $representative_id);
    } elseif ($player_id === $defender_leader) {
      $allowed = $this->getFaithWarCombatReadyPlayerIds($defender_sect);
      if (!in_array($representative_id, $allowed, true)) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid representative for your Sect"));
      }
      self::setGameStateValue('war_rep_defender_id', (int) $representative_id);
    } else {
      throw new BgaVisibleSystemException(clienttranslate("Only Sect Leaders can choose a representative"));
    }

    $this->notifyAllPlayersTr('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their Sect.'), [
      'leader_id' => $player_id,
      'leader_name' => self::getPlayerNameById($player_id),
      'representative_id' => $representative_id,
      'representative_name' => self::getPlayerNameById($representative_id)
    ]);
    $this->notifyPlayerTr($representative_id, 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
      'leader_id' => $player_id,
      'leader_name' => self::getPlayerNameById($player_id),
      'representative_id' => $representative_id
    ]);

    $this->gamestate->setPlayerNonMultiactive($player_id, 'chooseDone');
  }

  function argChooseFaithDebateRepresentative()
  {
    return $this->argChooseWarRepresentative();
  }

  function stChooseFaithDebateRepresentative()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_leader = $this->getSectLeaderId($attacker_sect, $attacker_id);
    $defender_leader = $this->getSectLeaderId($defender_sect, $defender_id);

    if ($this->countSectHandBelievers($attacker_sect) <= 0 || $this->countSectHandBelievers($defender_sect) <= 0) {
      $this->gamestate->nextState('endDebate');
      return;
    }

    $next_attacker_rep = 0;
    $next_defender_rep = 0;

    $leaders_to_activate = [];
    $attacker_choices = $this->getSectCombatReadyPlayerIds($attacker_sect);
    $defender_choices = $this->getSectCombatReadyPlayerIds($defender_sect);

    if (count($attacker_choices) === 1) {
      $next_attacker_rep = (int) $attacker_choices[0];
      $this->notifyAllPlayersTr('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Faith Debate.'), [
        'leader_name' => self::getPlayerNameById($attacker_leader),
        'representative_name' => self::getPlayerNameById((int) $attacker_choices[0]),
        'representative_id' => (int) $attacker_choices[0]
      ]);
    } else {
      $leaders_to_activate[] = (int) $attacker_leader;
    }

    if (count($defender_choices) === 1) {
      $next_defender_rep = (int) $defender_choices[0];
      $this->notifyAllPlayersTr('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Faith Debate.'), [
        'leader_name' => self::getPlayerNameById($defender_leader),
        'representative_name' => self::getPlayerNameById((int) $defender_choices[0]),
        'representative_id' => (int) $defender_choices[0]
      ]);
    } else {
      $leaders_to_activate[] = (int) $defender_leader;
    }

    $this->setWarRepresentativeIdsStable((int) $next_attacker_rep, (int) $next_defender_rep);
    if (empty($leaders_to_activate)) {
      $this->gamestate->nextState('chooseDone');
      return;
    }

    $this->notifyAllPlayersTr('faithDebateRepresentativePhase', clienttranslate('Each Sect Leader chooses a representative for Faith Debate.'), []);
    $this->gamestate->setPlayersMultiactive(array_values(array_unique($leaders_to_activate)), 'chooseDone');
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function chooseFaithDebateRepresentative($representative_id)
  {
    self::checkAction("chooseFaithDebateRepresentative");
    $player_id = (int) self::getCurrentPlayerId();
    $representative_id = (int) $representative_id;

    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_leader = $this->getSectLeaderId($attacker_sect, $attacker_id);
    $defender_leader = $this->getSectLeaderId($defender_sect, $defender_id);

    $this->lockRepresentativeLeaderRows((int) $attacker_leader, (int) $defender_leader);
    if ($player_id === $attacker_leader) {
      $allowed = $this->getSectCombatReadyPlayerIds($attacker_sect);
      if (!in_array($representative_id, $allowed, true)) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid representative for your Sect"));
      }
      self::setGameStateValue('war_rep_attacker_id', (int) $representative_id);
    } elseif ($player_id === $defender_leader) {
      $allowed = $this->getSectCombatReadyPlayerIds($defender_sect);
      if (!in_array($representative_id, $allowed, true)) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid representative for your Sect"));
      }
      self::setGameStateValue('war_rep_defender_id', (int) $representative_id);
    } else {
      throw new BgaVisibleSystemException(clienttranslate("Only Sect Leaders can choose a representative"));
    }

    $this->notifyAllPlayersTr('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Faith Debate.'), [
      'leader_name' => self::getPlayerNameById($player_id),
      'representative_name' => self::getPlayerNameById($representative_id),
      'representative_id' => $representative_id
    ]);
    $this->gamestate->setPlayerNonMultiactive($player_id, 'chooseDone');
  }

  /**
   * Keep both representative globals updated from a single call site.
   */
  private function setWarRepresentativeIdsStable(int $attacker_rep_id, int $defender_rep_id): void
  {
    self::setGameStateValue('war_rep_attacker_id', (int) $attacker_rep_id);
    self::setGameStateValue('war_rep_defender_id', (int) $defender_rep_id);
  }

  /**
   * Deadlock mitigation for multi-active representative selection:
   * lock both sect leaders in deterministic order before writing globals.
   */
  private function lockRepresentativeLeaderRows(int $attacker_leader_id, int $defender_leader_id): void
  {
    $attacker_leader_id = (int) $attacker_leader_id;
    $defender_leader_id = (int) $defender_leader_id;
    $leader_ids = [];
    if ($attacker_leader_id > 0) {
      $leader_ids[$attacker_leader_id] = 1;
    }
    if ($defender_leader_id > 0) {
      $leader_ids[$defender_leader_id] = 1;
    }
    if (empty($leader_ids)) {
      return;
    }
    $ids = array_keys($leader_ids);
    sort($ids, SORT_NUMERIC);
    $ids_sql = implode(',', array_map('intval', $ids));
    self::getObjectListFromDB(
      "SELECT player_id FROM player WHERE player_id IN ($ids_sql) ORDER BY player_id FOR UPDATE",
      true
    );
  }

  function stopFaithDebate()
  {
    self::checkAction("stopFaithDebate");
    $state = $this->getCurrentStateSnapshotSafe();
    $state_name = isset($state['name']) ? (string) $state['name'] : '';
    if ($state_name !== 'faithDebateDuel') {
      throw new BgaVisibleSystemException(clienttranslate("Faith Debate cannot be stopped right now."));
    }
    $player_id = (int) self::getCurrentPlayerId();
    if ($player_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid player."));
    }
    $war_type = (int) self::getGameStateValue('war_type');
    if ($war_type !== 7) {
      throw new BgaVisibleSystemException(clienttranslate("Faith Debate cannot be stopped right now."));
    }

    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    if ($player_id !== $attacker_rep_id) {
      throw new BgaVisibleSystemException(clienttranslate("Only the attacking representative can request to stop Faith Debate."));
    }
    if ((int) self::getGameStateValue('war_card_attacker') > 0) {
      throw new BgaVisibleSystemException(clienttranslate("Stop request must be made before the attacking representative commits a Believer this round."));
    }

    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = (int) $this->getPlayerSect((int) $attacker_id);
    $attacker_leader_id = (int) $this->getSectLeaderId((int) $attacker_sect, (int) $attacker_id);
    if ($attacker_leader_id <= 0) {
      $attacker_leader_id = (int) $attacker_id;
    }

    if ($player_id === $attacker_leader_id) {
      // Representative is also leader: leader can stop immediately.
      self::setGameStateValue('debate_stop_requested', 1);
      $this->notifyAllPlayersTr('faithDebateStopped', clienttranslate('${player_name} chooses to stop Faith Debate'), [
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById((int) $player_id),
        'round' => (int) self::getGameStateValue('debate_round')
      ]);
      $this->clearFaithDebateStopApprovalContext();
      foreach ($this->gamestate->getActivePlayerList() as $active_pid) {
        $this->gamestate->setPlayerNonMultiactive((int) $active_pid, 'nextDebateStep');
      }
      return;
    }

    // Representative is a follower: ask leader for approval.
    self::setGameStateValue('debate_stop_requester_id', (int) $player_id);
    self::setGameStateValue('debate_stop_leader_id', (int) $attacker_leader_id);
    $this->notifyAllPlayersTr('faithDebateStopProposed', clienttranslate('${requester_name} requests to stop Faith Debate. Waiting for ${leader_name} to decide.'), [
      'player_id' => (int) $player_id,
      'requester_name' => self::getPlayerNameById((int) $player_id),
      'leader_id' => (int) $attacker_leader_id,
      'leader_name' => self::getPlayerNameById((int) $attacker_leader_id),
      'round' => (int) self::getGameStateValue('debate_round')
    ]);
    $this->switchActivePlayerSafely((int) $attacker_leader_id);
    $this->gamestate->nextState('leaderStopApproval');
  }

  function clearFaithDebateStopApprovalContext(): void
  {
    self::setGameStateValue('debate_stop_requester_id', 0);
    self::setGameStateValue('debate_stop_leader_id', 0);
  }

  function argFaithDebateStopLeaderApproval()
  {
    $requester_id = (int) self::getGameStateValue('debate_stop_requester_id');
    $leader_id = (int) self::getGameStateValue('debate_stop_leader_id');
    return [
      'requester_id' => (int) $requester_id,
      'requester_name' => self::getPlayerNameById((int) $requester_id),
      'leader_id' => (int) $leader_id,
      'leader_name' => self::getPlayerNameById((int) $leader_id),
      'debate_round' => (int) self::getGameStateValue('debate_round')
    ];
  }

  function approveFaithDebateStop()
  {
    self::checkAction("approveFaithDebateStop");
    $player_id = (int) self::getCurrentPlayerId();
    $leader_id = (int) self::getGameStateValue('debate_stop_leader_id');
    $requester_id = (int) self::getGameStateValue('debate_stop_requester_id');
    if ($player_id <= 0 || $leader_id <= 0 || $player_id !== $leader_id) {
      throw new BgaVisibleSystemException(clienttranslate("Only the attacker Leader can decide this stop request."));
    }

    self::setGameStateValue('debate_stop_requested', 1);
    $this->notifyAllPlayersTr('faithDebateStopped', clienttranslate('${leader_name} approves ${requester_name}\'s request and stops Faith Debate.'), [
      'player_id' => (int) $leader_id,
      'leader_id' => (int) $leader_id,
      'leader_name' => self::getPlayerNameById((int) $leader_id),
      'requester_id' => (int) $requester_id,
      'requester_name' => self::getPlayerNameById((int) $requester_id),
      'round' => (int) self::getGameStateValue('debate_round')
    ]);
    $this->clearFaithDebateStopApprovalContext();
    $this->gamestate->nextState('approved');
  }

  function rejectFaithDebateStop()
  {
    self::checkAction("rejectFaithDebateStop");
    $player_id = (int) self::getCurrentPlayerId();
    $leader_id = (int) self::getGameStateValue('debate_stop_leader_id');
    $requester_id = (int) self::getGameStateValue('debate_stop_requester_id');
    if ($player_id <= 0 || $leader_id <= 0 || $player_id !== $leader_id) {
      throw new BgaVisibleSystemException(clienttranslate("Only the attacker Leader can decide this stop request."));
    }

    self::setGameStateValue('debate_stop_requested', 0);
    $this->notifyAllPlayersTr('faithDebateStopRejected', clienttranslate('${leader_name} rejects ${requester_name}\'s request to stop Faith Debate.'), [
      'leader_id' => (int) $leader_id,
      'leader_name' => self::getPlayerNameById((int) $leader_id),
      'requester_id' => (int) $requester_id,
      'requester_name' => self::getPlayerNameById((int) $requester_id),
      'round' => (int) self::getGameStateValue('debate_round')
    ]);
    if ($requester_id > 0) {
      $this->notifyPlayerTr((int) $requester_id, 'faithDebateStopRejectedPrivate', clienttranslate('Your Leader refuses to stop Faith Debate. You must continue this round.'), [
        'leader_id' => (int) $leader_id,
        'leader_name' => self::getPlayerNameById((int) $leader_id),
        'requester_id' => (int) $requester_id,
        'round' => (int) self::getGameStateValue('debate_round')
      ]);
    }
    $this->clearFaithDebateStopApprovalContext();
    $this->gamestate->nextState('rejected');
  }

  function argFaithWarDuel()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = (int) $this->getPlayerSect((int) $attacker_id);
    $defender_sect = (int) $this->getPlayerSect((int) $defender_id);
    return [
      'attacker_id' => (int) $attacker_id,
      'defender_id' => (int) $defender_id,
      'attacker_rep_id' => (int) self::getGameStateValue('war_rep_attacker_id'),
      'defender_rep_id' => (int) self::getGameStateValue('war_rep_defender_id'),
      'attacker_sect_name' => (string) $this->getSectDisplayName((int) $attacker_sect),
      'defender_sect_name' => (string) $this->getSectDisplayName((int) $defender_sect),
      'i18n' => ['attacker_sect_name', 'defender_sect_name']
    ];
  }

  function argFaithDebateDuel()
  {
    $current_player_id = (int) self::getCurrentPlayerId();
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = (int) $this->getPlayerSect((int) $attacker_id);
    $defender_sect = (int) $this->getPlayerSect((int) $defender_id);
    $can_stop = (
      (int) self::getGameStateValue('war_type') === 7 &&
      $current_player_id > 0 &&
      $current_player_id === $attacker_rep_id
    ) ? 1 : 0;

    return [
      'attacker_id' => (int) $attacker_id,
      'defender_id' => (int) $defender_id,
      'attacker_rep_id' => $attacker_rep_id,
      'defender_rep_id' => (int) self::getGameStateValue('war_rep_defender_id'),
      'debate_round' => (int) self::getGameStateValue('debate_round'),
      'can_stop_faith_debate' => (int) $can_stop,
      'attacker_sect_name' => (string) $this->getSectDisplayName((int) $attacker_sect),
      'defender_sect_name' => (string) $this->getSectDisplayName((int) $defender_sect),
      'i18n' => ['attacker_sect_name', 'defender_sect_name']
    ];
  }

  function stSecretAllianceSwitchToTarget()
  {
    $target_id = (int) self::getGameStateValue('secret_alliance_target_id');
    if ($target_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance state is invalid."));
    }

    $this->switchActivePlayerSafely((int) $target_id);
    $this->gamestate->nextState('secretAllianceTargetChoice');
  }

  function stSecretAllianceReturnToAttacker()
  {
    $attacker_id = (int) self::getGameStateValue('secret_alliance_attacker_id');
    if ($attacker_id > 0) {
      $this->switchActivePlayerSafely((int) $attacker_id);
    }

    self::setGameStateValue('secret_alliance_attacker_id', 0);
    self::setGameStateValue('secret_alliance_target_id', 0);
    self::setGameStateValue('secret_alliance_attacker_card_id', 0);
    self::setGameStateValue('secret_alliance_target_card_id', 0);

    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function chooseSecretAllianceCard($card_id)
  {
    self::checkAction("chooseSecretAllianceCard");
    $this->chooseSecretAllianceCardInternal((int) self::getCurrentPlayerId(), (int) $card_id);
  }

  private function chooseSecretAllianceCardInternal(int $acting_player_id, int $card_id): void
  {
    $active_player_id = (int) $acting_player_id;
    $attacker_id = (int) self::getGameStateValue('secret_alliance_attacker_id');
    $target_id = (int) self::getGameStateValue('secret_alliance_target_id');
    $card_id = (int) $card_id;
    $state = $this->getCurrentStateSnapshotSafe();
    $state_name = isset($state['name']) ? (string) $state['name'] : '';

    if ($attacker_id <= 0 || $target_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance state is invalid."));
    }
    if ($active_player_id <= 0 || (int) self::getActivePlayerId() !== $active_player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance state is invalid."));
    }

    $selected_card = $this->action_cards->getCard($card_id);
    if (
      !$selected_card ||
      $selected_card['location'] !== 'hand' ||
      (int) $selected_card['location_arg'] !== $active_player_id
    ) {
      throw new BgaVisibleSystemException(clienttranslate("Select one Action card from your hand to exchange."));
    }

    if ($state_name === 'secretAllianceAttackerChoice') {
      if ($active_player_id !== $attacker_id) {
        throw new BgaVisibleSystemException(clienttranslate("Secret Alliance state is invalid."));
      }
      // Allowed: attacker may offer another Secret Alliance copy from hand.
      // The played card is already on table, so hand selection is safe by card instance.

      self::setGameStateValue('secret_alliance_attacker_card_id', (int) $card_id);
      $this->gamestate->nextState('secretAllianceSwitchToTarget');
      return;
    }

    if ($state_name !== 'secretAllianceTargetChoice' || $active_player_id !== $target_id) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance state is invalid."));
    }

    $attacker_card_id = (int) self::getGameStateValue('secret_alliance_attacker_card_id');
    if ($attacker_card_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance offered card is not selected yet."));
    }

    $attacker_card = $this->action_cards->getCard($attacker_card_id);
    if (!$attacker_card || $attacker_card['location'] !== 'hand' || (int) $attacker_card['location_arg'] !== $attacker_id) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance offered card is no longer available."));
    }

    self::setGameStateValue('secret_alliance_target_card_id', (int) $card_id);

    $this->action_cards->moveCard($attacker_card_id, 'hand', $target_id);
    $this->action_cards->moveCard($card_id, 'hand', $attacker_id);

    // Private swap per participant: the offered card flies to the other
    // player (NOT the discard pile) and the received card flies in face-up.
    // Card identities stay private to each recipient.
    $this->notifyPlayerTr($attacker_id, 'secretAllianceSwap', '', [
      'player_id' => (int) $attacker_id,
      'other_player_id' => (int) $target_id,
      'given_card_id' => (int) $attacker_card_id,
      'received_card' => ['id' => (int) $selected_card['id'], 'type' => (string) $selected_card['type']]
    ]);
    $this->notifyPlayerTr($target_id, 'secretAllianceSwap', '', [
      'player_id' => (int) $target_id,
      'other_player_id' => (int) $attacker_id,
      'given_card_id' => (int) $card_id,
      'received_card' => ['id' => (int) $attacker_card['id'], 'type' => (string) $attacker_card['type']]
    ]);

    // Public: observers see two face-down cards cross between the two seats.
    $this->notifyAllPlayersTr('secretAllianceExchanged', clienttranslate('${player_name} and ${target_name} exchange one Action card each.'), [
      'player_name' => self::getPlayerNameById($attacker_id),
      'target_name' => self::getPlayerNameById($target_id),
      'attacker_id' => (int) $attacker_id,
      'target_id' => (int) $target_id
    ]);
    $this->gamestate->nextState('secretAllianceReturnToAttacker');
  }

  function argProphetSkillPrompt()
  {
    $drawer_id = (int) self::getGameStateValue('prophet_pending_drawer_id');
    $draw_count = (int) self::getGameStateValue('prophet_pending_draw_count');
    $source_code = (int) self::getGameStateValue('prophet_pending_source');
    $source_key = $this->getProphetPendingSourceKey($source_code);
    $source_name = ($source_key === 'divine_inspire') ? clienttranslate('Divine Inspiration') : clienttranslate('Have a Charity');
    $responder_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    $primary_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
    $predict_target_index = (int) $this->getProphetPredictTargetIndexForResponder((int) $responder_id);
    $ability_source = ($responder_id > 0 && $responder_id === $primary_id) ? 'prophet' : 'gate_truth_copy';
    return [
      'drawer_id' => (int) $drawer_id,
      'drawer_name' => self::getPlayerNameById((int) $drawer_id),
      'draw_count' => (int) $draw_count,
      'source_key' => $source_key,
      'source_name' => $source_name,
      'responder_id' => (int) $responder_id,
      'ability_source' => $ability_source,
      'predict_target_index' => (int) $predict_target_index
    ];
  }

  function argProphetGuess()
  {
    $args = $this->argProphetSkillPrompt();
    $args['believer_types'] = $this->type_labels;
    return $args;
  }

  function routeProphetResponderToPromptOrGuess(int $responder_id, int $primary_id): void
  {
    $responder_id = (int) $responder_id;
    $primary_id = (int) $primary_id;
    if ($responder_id <= 0) {
      $this->gamestate->nextState('resolve');
      return;
    }

    self::setGameStateValue('prophet_pending_prophet_id', (int) $responder_id);
    self::setGameStateValue('prophet_pending_guess_type', 0);
    $this->switchActivePlayerSafely((int) $responder_id);

    $can_guess_now = false;
    if ($responder_id === $primary_id) {
      $can_guess_now = $this->isSkillRevealed((int) $responder_id);
    } else {
      // Gate of Truth copied Prophet: once copied and available in this window,
      // do not ask "Use Skill" repeatedly; jump straight to guess/pass.
      $can_guess_now = $this->canPlayerUseCopiedSkillAbility((int) $responder_id, 4);
    }

    $this->gamestate->nextState($can_guess_now ? 'prophetGuess' : 'prophetPrompt');
  }

  function prophetEnableSkill()
  {
    self::checkAction('prophetEnableSkill');
    $player_id = (int) self::getCurrentPlayerId();
    $responder_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    $primary_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
    if ($player_id <= 0 || $player_id !== $responder_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the responder for The Prophet."));
    }

    $is_primary = ($player_id > 0 && $player_id === $primary_id);
    if ($is_primary) {
      $skill_card = $this->getPlayerSkillCard($player_id);
      if (!$skill_card || (int) $skill_card['type'] !== 4) {
        throw new BgaVisibleSystemException(clienttranslate("The Prophet skill is not available."));
      }
      $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");
      if ($sealed === 1) {
        throw new BgaVisibleSystemException(clienttranslate("Your skill is sealed right now."));
      }
      $this->revealSkillAndNotifyIfNeeded((int) $player_id, 4);
    } else {
      if (!$this->canPlayerUseCopiedSkillAbility((int) $player_id, 4)) {
        $native_prophet_player_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
        if ($native_prophet_player_id <= 0) {
          $drawer_id = (int) self::getGameStateValue('prophet_pending_drawer_id');
          $native_prophet_player_id = (int) $this->getReactiveNativeProphetSourceForDrawer((int) $drawer_id, 0);
        }
        if ($native_prophet_player_id > 0) {
          $this->tryActivateReactiveGateTruthCopyForProphet((int) $player_id, (int) $native_prophet_player_id);
        }
      }
      if (!$this->canPlayerUseCopiedSkillAbility((int) $player_id, 4)) {
        throw new BgaVisibleSystemException(clienttranslate("Copied The Prophet is not available right now."));
      }
      $this->revealSkillAndNotifyIfNeeded((int) $player_id, 9);
    }

    $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer($player_id)
    ]);
    // When secondary (Gate of Truth) chooses to copy Prophet while native
    // Prophet's first guess is still pending, defer secondary guess until
    // after first reveal resolves (prevents stacked dual reveal on same beat).
    if (!$is_primary) {
      $primary_guess_stored = (int) self::getGameStateValue('prophet_pending_primary_guess_type');
      $primary_guess_type = (int) $this->normalizeProphetStoredGuessType((int) $primary_guess_stored);
      $primary_guess_resolved = $this->isProphetStoredGuessResolved((int) $primary_guess_stored);
      if ($primary_id > 0 && $primary_guess_type > 0 && !$primary_guess_resolved) {
        // Keep pending guess unset for now; stResolve will reveal first card,
        // then route this responder into prophetGuess for draw #2.
        self::setGameStateValue('prophet_pending_guess_type', 0);
        $this->gamestate->nextState('resolve');
        return;
      }
    }
    $this->gamestate->nextState('toGuess');
  }

  function prophetSkipSkill()
  {
    self::checkAction('prophetSkipSkill');
    $player_id = (int) self::getCurrentPlayerId();
    $responder_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    if ($player_id <= 0 || $player_id !== $responder_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the responder for The Prophet."));
    }
    // 7 is a sentinel for "explicitly skipped by responder".
    self::setGameStateValue('prophet_pending_guess_type', 7);
    $this->gamestate->nextState('resolve');
  }

  function prophetGuessBelieverType($believer_type)
  {
    self::checkAction('prophetGuessBelieverType');
    $player_id = (int) self::getCurrentPlayerId();
    $responder_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    $primary_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
    if ($player_id <= 0 || $player_id !== $responder_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the responder for The Prophet."));
    }
    $is_primary = ($player_id > 0 && $player_id === $primary_id);
    if ($is_primary) {
      $skill_card = $this->getPlayerSkillCard($player_id);
      if (!$skill_card || (int) $skill_card['type'] !== 4 || !$this->isSkillRevealed($player_id)) {
        throw new BgaVisibleSystemException(clienttranslate("The Prophet is not active."));
      }
    } else {
      if (!$this->canPlayerUseCopiedSkillAbility((int) $player_id, 4)) {
        throw new BgaVisibleSystemException(clienttranslate("Copied The Prophet is not active."));
      }
    }
    $believer_type = (int) $believer_type;
    if ($believer_type < 1 || $believer_type > 5) {
      throw new BgaVisibleSystemException(clienttranslate("Choose a valid Believer type."));
    }
    $target_index = (int) $this->getProphetPredictTargetIndexForResponder((int) $player_id);
    self::setGameStateValue('prophet_pending_guess_type', (int) $believer_type);
    $this->notifyAllPlayersTr('prophetGuessChosen', clienttranslate('${player_name} predicts ${type_name} with The Prophet for draw #${draw_index}.'), [
      'player_name' => self::getPlayerNameById((int) $player_id),
      'player_id' => (int) $player_id,
      'type_name' => $this->getBelieverTypeLabel((int) $believer_type),
      'type' => (int) $believer_type,
      'draw_index' => (int) $target_index
    ]);
    $this->gamestate->nextState('resolve');
  }

  function prophetPassGuess()
  {
    self::checkAction('prophetPassGuess');
    $player_id = (int) self::getCurrentPlayerId();
    $responder_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    if ($player_id <= 0 || $player_id !== $responder_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the responder for The Prophet."));
    }
    self::setGameStateValue('prophet_pending_guess_type', 7);
    $this->notifyAllPlayersTr('prophetGuessPassed', clienttranslate('${player_name} chooses not to predict with The Prophet.'), [
      'player_name' => self::getPlayerNameById((int) $player_id),
      'player_id' => (int) $player_id
    ]);
    $this->gamestate->nextState('resolve');
  }

  function stResolveProphetPrediction()
  {
    $drawer_id = (int) self::getGameStateValue('prophet_pending_drawer_id');
    $draw_count = max(0, (int) self::getGameStateValue('prophet_pending_draw_count'));
    $source_code = (int) self::getGameStateValue('prophet_pending_source');
    $responder_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    $guess_type_stored = (int) self::getGameStateValue('prophet_pending_guess_type');
    $source_extra = max(0, (int) self::getGameStateValue('prophet_pending_extra'));
    $primary_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
    $secondary_id = (int) self::getGameStateValue('prophet_pending_secondary_player_id');

    if ($drawer_id <= 0) {
      $this->clearProphetPendingContext();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($responder_id > 0) {
      if ($primary_id > 0 && $responder_id === $primary_id) {
        self::setGameStateValue('prophet_pending_primary_guess_type', (int) $guess_type_stored);
      } else if ($secondary_id > 0 && $responder_id === $secondary_id) {
        self::setGameStateValue('prophet_pending_secondary_guess_type', (int) $guess_type_stored);
      }
    }

    $primary_guess_stored = (int) self::getGameStateValue('prophet_pending_primary_guess_type');
    $secondary_guess_stored = (int) self::getGameStateValue('prophet_pending_secondary_guess_type');
    $primary_guess_type = (int) $this->normalizeProphetStoredGuessType((int) $primary_guess_stored);
    $secondary_guess_type = (int) $this->normalizeProphetStoredGuessType((int) $secondary_guess_stored);
    $primary_guess_base = (int) $this->getProphetStoredGuessBase((int) $primary_guess_stored);
    $secondary_guess_base = (int) $this->getProphetStoredGuessBase((int) $secondary_guess_stored);
    $primary_guess_resolved = $this->isProphetStoredGuessResolved((int) $primary_guess_stored) ? 1 : 0;

    if ($secondary_id > 0 && $secondary_guess_base === 0) {
      $secondary_slot_offset = ($primary_guess_resolved === 0 && $primary_id > 0 && $primary_guess_type > 0) ? 1 : 0;
      if ($draw_count <= $secondary_slot_offset) {
        self::setGameStateValue('prophet_pending_secondary_guess_type', 7);
        $secondary_guess_stored = 7;
        $secondary_guess_base = 7;
        $secondary_guess_type = 0;
      }
    }

    $primary_done = ($primary_id <= 0) || ($primary_guess_base !== 0);
    $secondary_done = ($secondary_id <= 0) || ($secondary_guess_base !== 0);

    if (!$primary_done) {
      $this->routeProphetResponderToPromptOrGuess((int) $primary_id, (int) $primary_id);
      return;
    }

    // Late-bind secondary Gate-of-Truth responder after native Prophet has
    // answered once. This covers the first Prophet trigger when native Prophet
    // was still hidden at queue-time, so reactive copy target was not yet
    // detectable then.
    if ($secondary_id <= 0 && $drawer_id > 0 && $primary_id > 0) {
      $late_secondary_id = (int) $this->getSecondaryProphetCopyPlayerForDrawer((int) $drawer_id, (int) $primary_id);
      if ($late_secondary_id > 0) {
        $secondary_id = (int) $late_secondary_id;
        self::setGameStateValue('prophet_pending_secondary_player_id', (int) $secondary_id);
        self::setGameStateValue('prophet_pending_secondary_guess_type', 0);
        $secondary_guess_stored = 0;
        $secondary_guess_base = 0;
        $secondary_done = false;
      }
    }

    // If native Prophet has already chosen for this interrupt, ask Gate of Truth
    // copy responder immediately before revealing any draw result. This keeps
    // the UX aligned with the intended flow:
    // 1. Prophet decides whether/how to guess.
    // 2. Gate of Truth decides whether to copy Prophet.
    // 3. Then draw reveal animation starts.
    if (
      $primary_id > 0 &&
      $secondary_id > 0 &&
      $responder_id > 0 &&
      $responder_id === $primary_id &&
      !$secondary_done
    ) {
      $secondary_slot_offset = ($primary_guess_type > 0) ? 1 : 0;
      if ($draw_count <= $secondary_slot_offset) {
        self::setGameStateValue('prophet_pending_secondary_guess_type', 7);
        $secondary_guess_stored = 7;
        $secondary_guess_base = 7;
        $secondary_done = true;
      } else if ($primary_guess_type > 0 && $primary_guess_resolved === 0) {
        // Desired sequence:
        // 1) native Prophet picks guess
        // 2) Gate chooses copy/skip
        // 3) first reveal resolves
        // 4) Gate guesses second draw (if copied)
        if (!$this->canPlayerUseCopiedSkillAbility((int) $secondary_id, 4)) {
          // Not copied yet: ask copy/skip now.
          self::setGameStateValue('prophet_pending_prophet_id', (int) $secondary_id);
          self::setGameStateValue('prophet_pending_guess_type', 0);
          $this->switchActivePlayerSafely((int) $secondary_id);
          $this->gamestate->nextState('prophetPrompt');
          return;
        }
        // Already copied: defer guess until after first reveal (handled below).
      } else {
        $this->routeProphetResponderToPromptOrGuess((int) $secondary_id, (int) $primary_id);
        return;
      }
    }

    $primary_visible = ($primary_id > 0 && $this->isSkillRevealed((int) $primary_id)) ? 1 : 0;
    $secondary_visible = ($secondary_id > 0 && $this->isSkillRevealed((int) $secondary_id)) ? 1 : 0;
    if ($this->resolveAndRouteSecondaryProphetPromptIfPending(
      (int) $drawer_id,
      (int) $draw_count,
      (int) $primary_id,
      (int) $primary_guess_stored,
      (int) $primary_guess_type,
      (int) $primary_visible,
      (int) $secondary_id,
      (int) $secondary_visible,
      (int) $source_code
    )) {
      return;
    }

    $draw_count = max(0, (int) self::getGameStateValue('prophet_pending_draw_count'));
    $primary_guess_stored = (int) self::getGameStateValue('prophet_pending_primary_guess_type');
    $secondary_guess_stored = (int) self::getGameStateValue('prophet_pending_secondary_guess_type');
    $primary_guess_type = (int) $this->normalizeProphetStoredGuessType((int) $primary_guess_stored);
    $secondary_guess_type = (int) $this->normalizeProphetStoredGuessType((int) $secondary_guess_stored);
    $primary_guess_resolved = $this->isProphetStoredGuessResolved((int) $primary_guess_stored) ? 1 : 0;
    $secondary_guess_base = (int) $this->getProphetStoredGuessBase((int) $secondary_guess_stored);
    $secondary_done = ($secondary_id <= 0) || ($secondary_guess_base !== 0);

    if (!$secondary_done) {
      $this->routeProphetResponderToPromptOrGuess((int) $secondary_id, (int) $primary_id);
      return;
    }

    $source_key = $this->getProphetPendingSourceKey($source_code);
    $deck_before = (int) $this->believer_cards->countCardInLocation('deck');
    $source_name = ($source_key === 'divine_inspire') ? clienttranslate('Divine Inspiration') : clienttranslate('Have a Charity');
    $draw_index_offset = ($primary_guess_resolved === 1 && $primary_guess_type > 0) ? 1 : 0;
    $requested_draw_total = (int) $draw_count + (int) $draw_index_offset;
    $deck_before_total = (int) $deck_before + (int) $draw_index_offset;

    $drawer_cards = [];
    $primary_cards = [];
    $secondary_cards = [];
    $prediction_events = [];
    $secondary_target_index = 0;
    if ($secondary_id > 0 && $secondary_guess_type > 0) {
      $secondary_target_index = ($primary_id > 0 && $primary_guess_type > 0) ? 2 : 1;
    }

    if ($draw_count > 0) {
      // Deadlock mitigation: pick once, then route cards in memory.
      // This avoids repeated deck count/pick query cycles under Prophet flow.
      $drawn_cards = array_values($this->believer_cards->pickCards((int) $draw_count, 'deck', (int) $drawer_id));
      $drawn_total = (int) count($drawn_cards);
      for ($draw_index = 1; $draw_index <= $drawn_total; $draw_index++) {
        $card = $drawn_cards[$draw_index - 1];
        $revealed_type = (int) ($card['type'] ?? 0);
        $actual_draw_index = (int) $draw_index_offset + (int) $draw_index;

        if ($primary_id > 0 && $primary_guess_resolved === 0 && $primary_guess_type > 0 && $actual_draw_index === 1) {
          $guess_correct = ($revealed_type === (int) $primary_guess_type) ? 1 : 0;
          $receiver_id = (int) $drawer_id;
          if ($guess_correct === 1) {
            $this->believer_cards->moveCard((int) $card['id'], 'hand', (int) $primary_id);
            $moved = $this->believer_cards->getCard((int) $card['id']);
            $primary_cards[] = $moved ? $moved : $card;
            $receiver_id = (int) $primary_id;
          } else {
            $drawer_cards[] = $card;
          }
          $prediction_events[] = [
            'predictor_id' => (int) $primary_id,
            'ability_source' => 'prophet',
            'draw_index' => (int) $actual_draw_index,
            'guess_type' => (int) $primary_guess_type,
            'revealed_type' => (int) $revealed_type,
            'guess_correct' => (int) $guess_correct,
            'receiver_id' => (int) $receiver_id
          ];
          continue;
        }

        if ($secondary_id > 0 && $secondary_guess_type > 0 && $secondary_target_index > 0 && $actual_draw_index === (int) $secondary_target_index) {
          $guess_correct = ($revealed_type === (int) $secondary_guess_type) ? 1 : 0;
          $receiver_id = (int) $drawer_id;
          if ($guess_correct === 1) {
            $this->believer_cards->moveCard((int) $card['id'], 'hand', (int) $secondary_id);
            $moved = $this->believer_cards->getCard((int) $card['id']);
            $secondary_cards[] = $moved ? $moved : $card;
            $receiver_id = (int) $secondary_id;
          } else {
            $drawer_cards[] = $card;
          }
          $prediction_events[] = [
            'predictor_id' => (int) $secondary_id,
            'ability_source' => 'gate_truth_copy',
            'draw_index' => (int) $actual_draw_index,
            'guess_type' => (int) $secondary_guess_type,
            'revealed_type' => (int) $revealed_type,
            'guess_correct' => (int) $guess_correct,
            'receiver_id' => (int) $receiver_id
          ];
          continue;
        }

        $drawer_cards[] = $card;
      }
    }

    $drawer_gain = (int) count($drawer_cards);
    $primary_gain = (int) count($primary_cards);
    $secondary_gain = (int) count($secondary_cards);
    $total_drawn = (int) $drawer_gain + (int) $primary_gain + (int) $secondary_gain;
    $insufficient_deck = ((int) $total_drawn < (int) $requested_draw_total) ? 1 : 0;
    $remaining_draw_n = max(0, (int) $total_drawn - (int) count($prediction_events));
    $primary_guess_correct = $this->isProphetStoredGuessCorrect((int) $primary_guess_stored) ? 1 : 0;
    // If draw #1 was already resolved in partial phase and Prophet missed,
    // that first card still belongs to drawer and must be counted in summary.
    $partial_drawer_gain = ($draw_index_offset > 0 && $primary_guess_type > 0 && $primary_guess_correct === 0) ? 1 : 0;
    $drawer_gain_total = (int) $drawer_gain + (int) $partial_drawer_gain;

    if ($source_key === 'divine_inspire') {
      $this->notifyAllPlayersTr('divineInspiration', clienttranslate('${player_name} uses Divine Inspiration: discards ${discard_n} Action card(s) to draw ${draw_n} Believers.'), array(
        'player_name' => self::getPlayerNameById($drawer_id),
        'player_id' => (int) $drawer_id,
        'discard_n' => (int) $source_extra,
        'draw_n' => (int) $drawer_gain_total,
        'draw_total_n' => (int) $requested_draw_total,
        'deck_before' => (int) $deck_before_total,
        'insufficient_deck' => (int) $insufficient_deck,
        'prophet_flow' => 1
      ));
    } else {
      $this->notifyAllPlayersTr('haveACharity', clienttranslate('${player_name} plays Have a Charity to draw ${n} Believers.'), array(
        'player_name' => self::getPlayerNameById($drawer_id),
        'player_id' => (int) $drawer_id,
        'n' => (int) $drawer_gain_total,
        'n_total' => (int) $requested_draw_total,
        'prophet_flow' => 1
      ));
    }

    $this->notifyProphetPredictionResolvedEvent(
      (int) $drawer_id,
      $source_key,
      $source_name,
      (int) $requested_draw_total,
      (int) $drawer_gain_total,
      (int) $primary_id,
      (int) $primary_visible,
      (int) $primary_guess_type,
      (int) $primary_gain,
      (int) $secondary_id,
      (int) $secondary_visible,
      (int) $secondary_guess_type,
      (int) $secondary_gain,
      (int) $secondary_target_index,
      array_values($prediction_events),
      (int) $remaining_draw_n,
      'final',
      ($draw_index_offset > 0) ? 1 : 0
    );

    // Send private card-sync after public prediction-resolve notification,
    // so clients can render the full Prophet animation first.
    $this->notifyProphetPredictionPrivateHands((int) $drawer_id, (int) $primary_id, (int) $secondary_id, $drawer_cards, $primary_cards, $secondary_cards);

    $this->clearProphetPendingContext();
    $this->switchActivePlayerSafely((int) $drawer_id);
    $this->finishPlayerAction();
  }

  function argHolyRebirthPrompt()
  {
    $player_id = (int) self::getGameStateValue('holy_rebirth_pending_player_id');
    $deaths = max(0, (int) self::getGameStateValue('holy_rebirth_pending_deaths'));
    $source_code = (int) self::getGameStateValue('holy_rebirth_pending_source');
    $source_key = $this->getHolyRebirthSourceKey($source_code);
    $source_name = $this->getHolyRebirthSourceName((string) $source_key);
    $ability_source = 'holy_rebirth';
    if ($player_id > 0 && $this->canPlayerUseCopiedSkillAbility((int) $player_id, 5)) {
      $ability_source = 'gate_truth_copy';
    } elseif ($player_id > 0 && (int) $this->getReactiveGateTruthSourceForHolyRebirth((int) $player_id) > 0) {
      $ability_source = 'gate_truth_copy';
    }
    return [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById((int) $player_id),
      'deaths' => (int) $deaths,
      'source_key' => $source_key,
      'source_name' => $source_name,
      'ability_source' => $ability_source
    ];
  }

  function holyRebirthUse()
  {
    self::checkAction('holyRebirthUse');
    $player_id = (int) self::getCurrentPlayerId();
    $pending_player_id = (int) self::getGameStateValue('holy_rebirth_pending_player_id');
    if ($player_id <= 0 || $player_id !== $pending_player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the Holy Rebirth responder."));
    }
    self::setGameStateValue('holy_rebirth_pending_use', 1);
    $this->gamestate->nextState('resolve');
  }

  function holyRebirthSkip()
  {
    self::checkAction('holyRebirthSkip');
    $player_id = (int) self::getCurrentPlayerId();
    $pending_player_id = (int) self::getGameStateValue('holy_rebirth_pending_player_id');
    if ($player_id <= 0 || $player_id !== $pending_player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the Holy Rebirth responder."));
    }
    self::setGameStateValue('holy_rebirth_pending_use', 0);
    $this->gamestate->nextState('resolve');
  }

  function stResolveHolyRebirth()
  {
    $player_id = (int) self::getGameStateValue('holy_rebirth_pending_player_id');
    $deaths = max(0, (int) self::getGameStateValue('holy_rebirth_pending_deaths'));
    $source_code = (int) self::getGameStateValue('holy_rebirth_pending_source');
    $resume_player_id = (int) self::getGameStateValue('holy_rebirth_pending_resume_player');
    $resume_mode = (int) self::getGameStateValue('holy_rebirth_pending_resume_mode');
    $use_skill = ((int) self::getGameStateValue('holy_rebirth_pending_use') === 1);
    $source_key = $this->getHolyRebirthSourceKey($source_code);

    $revived_cards = [];
    $revived_n = 0;
    $used = 0;
    $ability_source = 'holy_rebirth';

    if ($player_id > 0 && $use_skill) {
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
      $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");
      $skill_card = $this->getPlayerSkillCard($player_id);
      $has_native_holy_rebirth = ($skill_card && (int) $skill_card['type'] === 5);
      $has_copied_holy_rebirth = $this->canPlayerUseCopiedSkillAbility((int) $player_id, 5);
      if (!$has_native_holy_rebirth && !$has_copied_holy_rebirth) {
        $native_holy_owner = (int) $this->getReactiveGateTruthSourceForHolyRebirth((int) $player_id);
        if ($native_holy_owner > 0) {
          $has_copied_holy_rebirth = $this->tryActivateReactiveGateTruthCopyForHolyRebirth((int) $player_id, (int) $native_holy_owner);
        }
      }

      if (
        $role !== 2 &&
        $sealed === 0 &&
        ($has_native_holy_rebirth || $has_copied_holy_rebirth) &&
        !$this->isHolyRebirthUsedThisTurn($player_id)
      ) {
        $pending_ids = $this->getHolyRebirthPendingCardIds();
        $selected_cards = [];
        $selected_map = [];
        foreach ($pending_ids as $pending_card_id) {
          $pending_card_id = (int) $pending_card_id;
          if ($pending_card_id <= 0 || isset($selected_map[$pending_card_id])) continue;
          $card = $this->believer_cards->getCard($pending_card_id);
          if (
            !$card ||
            (string) ($card['location'] ?? '') !== 'discard' ||
            (int) ($card['type_arg'] ?? 0) !== (int) $player_id
          ) {
            continue;
          }
          $selected_map[$pending_card_id] = 1;
          $selected_cards[] = $card;
          if (count($selected_cards) >= 3) break;
        }

        if (count($selected_cards) < 3) {
          $fallback_cards = $this->getRecentDiscardedBelieversByOwner((int) $player_id, 6);
          foreach ($fallback_cards as $card) {
            $cid = (int) ($card['id'] ?? 0);
            if ($cid <= 0 || isset($selected_map[$cid])) continue;
            $selected_map[$cid] = 1;
            $selected_cards[] = $card;
            if (count($selected_cards) >= 3) break;
          }
        }

        $take = min(3, count($selected_cards));
        if ($take > 0) {
          $cards_to_revive = array_slice($selected_cards, 0, $take);
          $ids = array_map(function ($card) {
            return (int) $card['id'];
          }, $cards_to_revive);
          $this->believer_cards->moveCards($ids, 'hand', $player_id);
          $revived_cards = array_values($cards_to_revive);
          $revived_n = (int) count($revived_cards);
          $used = 1;
          $ability_source = $has_native_holy_rebirth ? 'holy_rebirth' : 'gate_truth_copy';
          $this->markHolyRebirthUsedThisTurn($player_id);
          if ($skill_card) {
            $this->incrementSkillUseCount($skill_card, 1);
          }
          if ($has_native_holy_rebirth) {
            $this->revealSkillAndNotifyIfNeeded((int) $player_id, 5);
          } else {
            $this->revealSkillAndNotifyIfNeeded((int) $player_id, 9);
          }
          $this->notifyPlayerTr($player_id, 'newBelievers', '', ['cards' => $revived_cards]);
          $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
            'skill_state' => $this->getSkillStateForPlayer($player_id)
          ]);
        }
      }
    }

    if ($player_id > 0) {
      if ($used === 1) {
        $this->notifyAllPlayersTr('skillHolyRebirth', clienttranslate('${player_name} uses Holy Rebirth and revives ${n} Believers after ${source_name} (${deaths} deaths).'), [
          'player_id' => (int) $player_id,
          'player_name' => self::getPlayerNameById($player_id),
          'n' => (int) $revived_n,
          'source_key' => $source_key,
          'source_name' => $this->getHolyRebirthSourceName((string) $source_key),
          'deaths' => (int) $deaths,
          'ability_source' => $ability_source,
          'used' => 1,
          'revived_n' => (int) $revived_n,
          'revived_cards' => array_values($revived_cards),
          'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
          'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
          'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
        ]);
      }
    }

    $this->clearHolyRebirthPendingContext();
    $this->notifyPublicCountsSync();

    if ($resume_player_id > 0) {
      $this->switchActivePlayerSafely((int) $resume_player_id);
    }
    if ($resume_mode === 1) {
      $this->finishPlayerAction();
      return;
    }
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function argReverseKarmaPrompt()
  {
    $player_id = (int) self::getGameStateValue('reverse_karma_pending_player_id');
    $war_type = (int) self::getGameStateValue('reverse_karma_pending_war_type');
    $combat_name = clienttranslate('confrontation');
    if ($war_type === 2) $combat_name = clienttranslate('Faith War');
    if ($war_type === 7) $combat_name = clienttranslate('Faith Debate');
    if ($war_type === 3) $combat_name = clienttranslate('Martyrdom');
    if ($war_type === 6) $combat_name = clienttranslate('Conspiracy');

    return [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById((int) $player_id),
      'war_type' => (int) $war_type,
      'combat_name' => $combat_name
    ];
  }

  function reverseKarmaUse()
  {
    self::checkAction('reverseKarmaUse');
    $player_id = (int) self::getCurrentPlayerId();
    $pending_player = (int) self::getGameStateValue('reverse_karma_pending_player_id');
    if ($player_id <= 0 || $player_id !== $pending_player) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the Karma Reversed responder."));
    }
    self::setGameStateValue('reverse_karma_pending_use', 1);
    $this->gamestate->nextState('resolve');
  }

  function reverseKarmaSkip()
  {
    self::checkAction('reverseKarmaSkip');
    $player_id = (int) self::getCurrentPlayerId();
    $pending_player = (int) self::getGameStateValue('reverse_karma_pending_player_id');
    if ($player_id <= 0 || $player_id !== $pending_player) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the Karma Reversed responder."));
    }
    self::setGameStateValue('reverse_karma_pending_use', 0);
    $this->gamestate->nextState('resolve');
  }

  function stResolveReverseKarmaPrompt()
  {
    $player_id = (int) self::getGameStateValue('reverse_karma_pending_player_id');
    $war_type = (int) self::getGameStateValue('reverse_karma_pending_war_type');
    $resume_mode = (int) self::getGameStateValue('reverse_karma_pending_resume_mode');
    $use_skill = ((int) self::getGameStateValue('reverse_karma_pending_use') === 1);
    $resume_player_id = (int) self::getGameStateValue('reverse_karma_pending_resume_player');

    $checked_state = (int) self::getGameStateValue('war_reverse_karma_checked');
    $current_toggle = 0;
    $used_native_karma = false;
    if ($player_id > 0 && $use_skill && $this->isReverseKarmaCombatType((int) $war_type)) {
      $skill_card = $this->getPlayerSkillCard((int) $player_id);
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
      $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");
      $has_native = ($skill_card && (int) $skill_card['type'] === 16 && $role === 0 && $sealed === 0);
      $has_copied = $this->canPlayerUseCopiedSkillAbility((int) $player_id, 16);
      if (!$has_native && !$has_copied && $checked_state === 2) {
        $source_native_owner = (int) self::getGameStateValue('war_reverse_karma_owner_id');
        if ($source_native_owner > 0) {
          $has_copied = $this->tryActivateReactiveGateTruthCopyForReverseKarma((int) $player_id, (int) $source_native_owner);
        }
      }
      if ($has_native || $has_copied) {
        $current_toggle = 1;
        $used_native_karma = $has_native ? true : false;
        $this->revealSkillAndNotifyIfNeeded((int) $player_id, $has_native ? 16 : 9);
      }
    }

    $responders = $this->getReverseKarmaResponderIds();
    $first_responder = !empty($responders) ? (int) $responders[0] : 0;
    $second_responder = (count($responders) >= 2) ? (int) $responders[1] : 0;
    if (
      $checked_state === 0 &&
      $second_responder <= 0 &&
      $player_id > 0 &&
      $player_id === $first_responder &&
      (int) $this->getSkillTypeInPlayerHandByPlayer((int) $player_id) === 16
    ) {
      // Native Karma responder finished first response (use or skip):
      // Gate of Truth may still reactively copy + respond here.
      $second_responder = (int) $this->getReactiveGateTruthResponderForReverseKarma((int) $player_id);
    }

    // Two-responder chain:
    // 1) native Karma responder first
    // 2) Gate-copied Karma responder second (may re-toggle outcome)
    if (
      $checked_state === 0 &&
      $second_responder > 0 &&
      $player_id > 0 &&
      $player_id === $first_responder
    ) {
      self::setGameStateValue('war_reverse_karma_checked', 2);
      self::setGameStateValue('war_reverse_karma_active', (int) $current_toggle);
      // Keep native Karma responder id as reactive source even when first
      // responder skips. Second responder (Gate of Truth) may still choose to
      // copy + use Karma in this same confrontation window.
      self::setGameStateValue('war_reverse_karma_owner_id', (int) $first_responder);
      $this->setReverseKarmaStackOwnerIds(($current_toggle === 1 && $player_id > 0) ? [(int) $player_id] : []);
      self::setGameStateValue('reverse_karma_pending_player_id', (int) $second_responder);
      self::setGameStateValue('reverse_karma_pending_use', 0);
      $this->switchActivePlayerSafely((int) $second_responder);
      $this->gamestate->nextState('reverseKarmaPrompt');
      return;
    }

    $active = 0;
    $owner_id = 0;
    $stack_owner_ids = [];
    if ($checked_state === 2) {
      $first_toggle = ((int) self::getGameStateValue('war_reverse_karma_active') === 1) ? 1 : 0;
      $first_owner = (int) self::getGameStateValue('war_reverse_karma_owner_id');
      $toggle_count = (int) $first_toggle + (int) $current_toggle;
      $active = (($toggle_count % 2) === 1) ? 1 : 0;
      if ($first_toggle === 1 && $first_owner > 0) {
        $stack_owner_ids[] = (int) $first_owner;
      }
      if ($current_toggle === 1 && $player_id > 0 && (int) $player_id !== (int) $first_owner) {
        $stack_owner_ids[] = (int) $player_id;
      }
      if ($active === 1) {
        $owner_id = ($current_toggle === 1) ? (int) $player_id : (int) $first_owner;
      }
    } else {
      $active = (int) $current_toggle;
      if ($active === 1) {
        $owner_id = (int) $player_id;
        $stack_owner_ids[] = (int) $player_id;
      }
    }

    self::setGameStateValue('war_reverse_karma_checked', 1);
    self::setGameStateValue('war_reverse_karma_active', (int) $active);
    self::setGameStateValue('war_reverse_karma_owner_id', (int) $owner_id);
    $this->setReverseKarmaStackOwnerIds($stack_owner_ids);

    if ($player_id > 0) {
      $stack_owner_ids_public = $this->getReverseKarmaStackOwnerIds();
      // Keep hidden-skill information private: only reveal that a hidden response is active,
      // without exposing which player owns it. Skips are not publicly announced.
      if (!empty($stack_owner_ids_public)) {
        $status_message = ($active === 1)
          ? clienttranslate('A confrontation reversal effect is activated.')
          : clienttranslate('Confrontation reversal effects cancel out.');
        $this->notifyAllPlayersTr('reverseKarmaStatus', $status_message, [
          'owner_id' => (int) $owner_id,
          'active' => (int) $active,
          'war_type' => (int) $war_type,
          'stack_owner_ids' => array_values($stack_owner_ids_public)
        ]);
      } else {
        $this->notifyPlayerTr((int) $player_id, 'reverseKarmaStatus', '', [
          'owner_id' => (int) $player_id,
          'active' => 0,
          'war_type' => (int) $war_type
        ]);
      }
    }

    $this->clearReverseKarmaPendingContext();
    if ($resume_player_id > 0) {
      $this->switchActivePlayerSafely((int) $resume_player_id);
    }
    // New pre-believer resume modes (asked right after defense).
    if ($resume_mode === 11) {
      $this->gamestate->nextState('resumeWarSetup');
      return;
    }
    if ($resume_mode === 12) {
      $this->gamestate->nextState('resumeDebateSetup');
      return;
    }
    if ($resume_mode === 13) {
      $this->gamestate->nextState('resumeMartyrdomSetup');
      return;
    }
    if ($resume_mode === 14) {
      $this->gamestate->nextState('resumeConspiracySetup');
      return;
    }

    // Legacy in-combat resume modes (kept for compatibility).
    if ($resume_mode === 1) {
      $this->gamestate->nextState('resumeWar');
      return;
    }
    if ($resume_mode === 2) {
      $this->gamestate->nextState('resumeDebate');
      return;
    }
    if ($resume_mode === 3) {
      $this->gamestate->nextState('resumeMartyrdom');
      return;
    }
    if ($resume_mode === 4) {
      $this->gamestate->nextState('resumeConspiracy');
      return;
    }

    $this->gamestate->nextState('resumeWar');
  }

  function stFaithDebateDuel()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

    // Safety: leader may timeout/disconnect in representative selection.
    // Auto-assign one combat-ready representative per side when missing.
    if ($attacker_rep_id <= 0) {
      $choices = $this->getSectCombatReadyPlayerIds($attacker_sect);
      if (!empty($choices)) {
        $attacker_rep_id = (int) $choices[bga_rand(0, count($choices) - 1)];
        self::setGameStateValue('war_rep_attacker_id', $attacker_rep_id);
        $leader_id = $this->getSectLeaderId($attacker_sect, $attacker_id);
        $this->notifyAllPlayersTr('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Faith Debate.'), [
          'leader_name' => self::getPlayerNameById($leader_id),
          'representative_name' => self::getPlayerNameById($attacker_rep_id),
          'representative_id' => $attacker_rep_id,
          'auto_assigned' => 1
        ]);
      }
    }
    if ($defender_rep_id <= 0) {
      $choices = $this->getSectCombatReadyPlayerIds($defender_sect);
      if (!empty($choices)) {
        $defender_rep_id = (int) $choices[bga_rand(0, count($choices) - 1)];
        self::setGameStateValue('war_rep_defender_id', $defender_rep_id);
        $leader_id = $this->getSectLeaderId($defender_sect, $defender_id);
        $this->notifyAllPlayersTr('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Faith Debate.'), [
          'leader_name' => self::getPlayerNameById($leader_id),
          'representative_name' => self::getPlayerNameById($defender_rep_id),
          'representative_id' => $defender_rep_id,
          'auto_assigned' => 1
        ]);
      }
    }

    // Mid-debate a representative can run out of Believers (mental combat
    // snatches them). Reassign to a combat-ready Sect member; if a Sect can no
    // longer field anyone the rep becomes 0 and the debate ends below —
    // otherwise a 0-Believer player is asked to "choose a Believer" and the
    // table is stuck.
    if ($attacker_rep_id > 0 && (int) $this->believer_cards->countCardInLocation('hand', $attacker_rep_id) <= 0) {
      $ready = $this->getSectCombatReadyPlayerIds($attacker_sect);
      $attacker_rep_id = !empty($ready) ? (int) $ready[0] : 0;
      self::setGameStateValue('war_rep_attacker_id', (int) $attacker_rep_id);
    }
    if ($defender_rep_id > 0 && (int) $this->believer_cards->countCardInLocation('hand', $defender_rep_id) <= 0) {
      $ready = $this->getSectCombatReadyPlayerIds($defender_sect);
      $defender_rep_id = !empty($ready) ? (int) $ready[0] : 0;
      self::setGameStateValue('war_rep_defender_id', (int) $defender_rep_id);
    }

    if ($attacker_rep_id <= 0 || $defender_rep_id <= 0) {
      $this->finalizeFaithDebate((int) self::getGameStateValue('debate_round'));
      return;
    }

    self::setGameStateValue('debate_stop_requested', 0);
    $this->clearFaithDebateStopApprovalContext();
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    $this->gamestate->setPlayersMultiactive([$attacker_rep_id, $defender_rep_id], 'nextDebateStep');

    $round_no = (int) self::getGameStateValue('debate_round') + 1;
    $this->notifyAllPlayersTr('faithDebateRound', clienttranslate('Faith Debate round ${round}/5: representatives choose Believers.'), [
      'round' => $round_no,
      'attacker_rep_id' => $attacker_rep_id,
      'defender_rep_id' => $defender_rep_id,
      'attacker_rep_name' => self::getPlayerNameById($attacker_rep_id),
      'defender_rep_name' => self::getPlayerNameById($defender_rep_id)
    ]);
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function stResolveFaithDebateDuel()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

    if ((int) self::getGameStateValue('debate_stop_requested') === 1) {
      $this->finalizeFaithDebate((int) self::getGameStateValue('debate_round'));
      return;
    }

    $card_a_id = (int) self::getGameStateValue('war_card_attacker');
    $card_b_id = (int) self::getGameStateValue('war_card_defender');
    if ($card_a_id <= 0 && $attacker_rep_id > 0) {
      $auto_card = $this->autoCommitFaithDebateBelieverForRepresentative($attacker_rep_id, true);
      if ($auto_card) {
        $card_a_id = (int) $auto_card['id'];
      }
    }
    if ($card_b_id <= 0 && $defender_rep_id > 0) {
      $auto_card = $this->autoCommitFaithDebateBelieverForRepresentative($defender_rep_id, false);
      if ($auto_card) {
        $card_b_id = (int) $auto_card['id'];
      }
    }
    if ($card_a_id <= 0 || $card_b_id <= 0) {
      $this->finalizeFaithDebate((int) self::getGameStateValue('debate_round'));
      return;
    }

    $card_a = $this->believer_cards->getCard($card_a_id);
    $card_b = $this->believer_cards->getCard($card_b_id);
    // Debate gain ownership must follow the assigned representatives.
    $owner_a = ($attacker_rep_id > 0) ? $attacker_rep_id : (int) $card_a['location_arg'];
    $owner_b = ($defender_rep_id > 0) ? $defender_rep_id : (int) $card_b['location_arg'];
    $result = $this->getCurrentCombatComparisonResult((int) $card_a['type'], (int) $card_b['type'], false);
    $round_no = (int) self::getGameStateValue('debate_round') + 1;
    $winner_id = 0;
    $loser_id = 0;
    $result_type = 'draw';

    if ($result['winner'] === 1) {
      // Debate rule: each committed believer can only fight once in this Debate.
      // Winner takes opponent's believer, but both cards are parked in debateused
      // and returned only after Faith Debate ends.
      $this->believer_cards->moveCard($card_b_id, 'debateused', $owner_a);
      $this->believer_cards->moveCard($card_a_id, 'debateused', $owner_a);
      $winner_id = $owner_a;
      $loser_id = $owner_b;
      $result_type = 'attacker';
      $this->notifyAllPlayersTr('faithDebateResult', clienttranslate('${winner_name} wins Faith Debate and snatches 1 Believer.'), [
        'winner_name' => self::getPlayerNameById($owner_a),
        'loser_name' => self::getPlayerNameById($owner_b),
        'winner_id' => $owner_a,
        'loser_id' => $owner_b,
        'attacker_id' => $owner_a,
        'defender_id' => $owner_b,
        'attacker_name' => self::getPlayerNameById($owner_a),
        'defender_name' => self::getPlayerNameById($owner_b),
        'result_type' => 'attacker',
        'winner_gain' => 2,
        'loser_gain' => 0,
        'card_a' => $card_a,
        'card_b' => $card_b,
        'reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
        'reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
        'reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds()
      ]);
    } elseif ($result['winner'] === -1) {
      $this->believer_cards->moveCard($card_a_id, 'debateused', $owner_b);
      $this->believer_cards->moveCard($card_b_id, 'debateused', $owner_b);
      $winner_id = $owner_b;
      $loser_id = $owner_a;
      $result_type = 'defender';
      $this->notifyAllPlayersTr('faithDebateResult', clienttranslate('${winner_name} wins Faith Debate and snatches 1 Believer.'), [
        'winner_name' => self::getPlayerNameById($owner_b),
        'loser_name' => self::getPlayerNameById($owner_a),
        'winner_id' => $owner_b,
        'loser_id' => $owner_a,
        'attacker_id' => $owner_a,
        'defender_id' => $owner_b,
        'attacker_name' => self::getPlayerNameById($owner_a),
        'defender_name' => self::getPlayerNameById($owner_b),
        'result_type' => 'defender',
        'winner_gain' => 2,
        'loser_gain' => 0,
        'card_a' => $card_a,
        'card_b' => $card_b,
        'reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
        'reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
        'reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds()
      ]);
    } else {
      $this->believer_cards->moveCard($card_a_id, 'debateused', $owner_a);
      $this->believer_cards->moveCard($card_b_id, 'debateused', $owner_b);
      $this->notifyAllPlayersTr('faithDebateResult', clienttranslate('Faith Debate is a draw. Believers return to owners.'), [
        'result_type' => 'draw',
        'attacker_id' => $owner_a,
        'defender_id' => $owner_b,
        'attacker_name' => self::getPlayerNameById($owner_a),
        'defender_name' => self::getPlayerNameById($owner_b),
        'attacker_gain' => 1,
        'defender_gain' => 1,
        'card_a' => $card_a,
        'card_b' => $card_b,
        'reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
        'reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
        'reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds()
      ]);
    }
    $this->notifyCombatRoundHistory(
      'faith_debate',
      (string) $result_type,
      (int) $owner_a,
      (int) $owner_b,
      (int) $card_a['type'],
      (int) $card_b['type'],
      (int) $round_no
    );

    $round = (int) self::getGameStateValue('debate_round') + 1;
    self::setGameStateValue('debate_round', $round);

    $end = ($round >= 5) || ($this->countSectHandBelievers($attacker_sect) <= 0) || ($this->countSectHandBelievers($defender_sect) <= 0);
    if ($end) {
      $this->finalizeFaithDebate($round);
      return;
    }

    $this->notifyPublicCountsSync();
    $this->gamestate->nextState('nextDebateRound');
  }

  private function autoCommitFaithDebateBelieverForRepresentative(int $representative_id, bool $is_attacker): ?array
  {
    $hand_cards = array_values($this->believer_cards->getCardsInLocation('hand', $representative_id));
    if (empty($hand_cards)) {
      return null;
    }

    $pick_index = bga_rand(0, count($hand_cards) - 1);
    $card = $hand_cards[$pick_index];
    $card_id = (int) $card['id'];

    $this->believer_cards->moveCard($card_id, 'cardsontable', $representative_id);
    if ($is_attacker) {
      self::setGameStateValue('war_card_attacker', $card_id);
    } else {
      self::setGameStateValue('war_card_defender', $card_id);
    }

    $this->notifyAllPlayersTr('faithDebateCardPlayed', '', array(
      'player_id' => $representative_id,
      'player_name' => self::getPlayerNameById($representative_id),
      'card_id' => $card_id,
      'card_type' => (int) $card['type'],
      'auto_played' => 1
    ));

    return $card;
  }

  private function finalizeFaithDebate(int $round): void
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_name = self::getPlayerNameById($attacker_id);
    $defender_name = self::getPlayerNameById($defender_id);

    $debate_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'faith_debate';
    });
    if (!empty($debate_cards)) {
      $this->action_cards->moveCards(array_keys($debate_cards), 'discard');
    }

    // Debate ends: return any unresolved current-round committed cards first
    // (can happen when attacker stops Debate while defender has already committed).
    $pending_return_ids = [];
    $pending_attacker_id = (int) self::getGameStateValue('war_card_attacker');
    $pending_defender_id = (int) self::getGameStateValue('war_card_defender');
    if ($pending_attacker_id > 0) $pending_return_ids[] = (int) $pending_attacker_id;
    if ($pending_defender_id > 0 && $pending_defender_id !== $pending_attacker_id) $pending_return_ids[] = (int) $pending_defender_id;
    if (!empty($pending_return_ids)) {
      $pending_cards_by_owner = [];
      foreach ($pending_return_ids as $pending_card_id) {
        $pending_card = $this->believer_cards->getCard((int) $pending_card_id);
        if (!$pending_card) continue;
        if ((string) ($pending_card['location'] ?? '') !== 'cardsontable') continue;
        $owner = (int) ($pending_card['location_arg'] ?? 0);
        if ($owner <= 0) continue;
        $this->believer_cards->moveCard((int) $pending_card_id, 'hand', (int) $owner);
        if (!isset($pending_cards_by_owner[$owner])) $pending_cards_by_owner[$owner] = [];
        $pending_cards_by_owner[$owner][] = [
          'id' => (int) $pending_card['id'],
          'type' => (int) $pending_card['type'],
          'type_arg' => (int) $pending_card['type_arg']
        ];
      }
      foreach ($pending_cards_by_owner as $owner => $cards) {
        $this->notifyPlayerTr((int) $owner, 'newBelievers', '', ['cards' => array_values($cards)]);
      }
    }

    // Debate ends: return all parked cards to owners' hands.
    $debate_used_cards = $this->believer_cards->getCardsInLocation('debateused');
    if (!empty($debate_used_cards)) {
      $by_owner = [];
      foreach ($debate_used_cards as $c) {
        $owner = (int) $c['location_arg'];
        if (!isset($by_owner[$owner])) {
          $by_owner[$owner] = [];
        }
        $by_owner[$owner][] = $c;
      }
      foreach ($by_owner as $owner => $cards) {
        $ids = array_map(function ($c) {
          return (int) $c['id'];
        }, $cards);
        $this->believer_cards->moveCards($ids, 'hand', $owner);
        $this->notifyPlayerTr((int) $owner, 'newBelievers', '', ['cards' => array_values($cards)]);
      }
    }

    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('debate_round', 0);
    self::setGameStateValue('debate_stop_requested', 0);
    $this->clearFaithDebateStopApprovalContext();
    $this->clearCombatSkillState();
    $this->notifyAllPlayersTr('faithDebateEnd', clienttranslate('Faith Debate ends after ${round} round(s).'), [
      'round' => max(0, (int) $round)
    ]);
    $this->notifyAllPlayersTr('combatSnapshotHistory', clienttranslate('Confrontation summary: Faith Debate, ${attacker_name} vs ${defender_name}, ${round} round(s).'), [
      'attacker_name' => $attacker_name,
      'defender_name' => $defender_name,
      'round' => max(0, (int) $round)
    ]);
    $this->notifyPublicCountsSync();
    // Debate is an action-window card flow: after it ends, turn ownership must
    // return to the original debate initiator (war_attacker_id), not the leader
    // who may have been temporarily switched in for stop-approval.
    if ($attacker_id > 0) {
      $this->switchActivePlayerSafely((int) $attacker_id);
    }
    $this->routeAfterActionWindowCheck('endDebate');
  }

  function buildAoeRepresentativeCandidatesByLeader(int $war_type, int $attacker_sect): array
  {
    $players = self::loadPlayersBasicInfos();
    $defended_sects = array_fill_keys(
      $this->getAoeDefendedSectsForCurrentCombat((int) $war_type, (int) $attacker_sect),
      true
    );
    $processed_sects = [];
    $by_leader = [];

    foreach ($players as $pid => $_p) {
      $pid = (int) $pid;
      $sect = $this->getPlayerSect($pid);
      if ($sect < 0) continue;
      if (isset($processed_sects[$sect])) continue;
      $processed_sects[$sect] = true;
      if ((int) $sect !== (int) $attacker_sect && isset($defended_sects[$sect])) {
        continue;
      }

      $leader = (int) $this->getSectLeaderId((int) $sect, (int) $pid);
      if ($leader <= 0) continue;

      $candidates = [];
      foreach ($this->getSectCombatReadyPlayerIds((int) $sect) as $cand_pid) {
        $candidates[] = [
          'id' => (int) $cand_pid,
          'name' => self::getPlayerNameById((int) $cand_pid),
          'believer_count' => (int) $this->believer_cards->countCardInLocation('hand', (int) $cand_pid)
        ];
      }
      $by_leader[(string) $leader] = array_values($candidates);
    }

    return $by_leader;
  }

  function argChooseConspiracyRepresentative()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $candidates_by_leader = $this->buildAoeRepresentativeCandidatesByLeader(6, (int) $attacker_sect);
    $active_leader_ids = array_values(array_map('intval', $this->gamestate->getActivePlayerList()));

    return [
      'candidates' => [],
      'candidates_by_leader' => $candidates_by_leader,
      'active_leader_ids' => $active_leader_ids
    ];
  }

  function stConspiracyChooseRepresentative()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $players = self::loadPlayersBasicInfos();

    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0");
    self::setGameStateValue('war_rep_attacker_id', 0);

    $defended_sects = array_fill_keys(
      $this->getAoeDefendedSectsForCurrentCombat(6, (int) $attacker_sect),
      true
    );

    $leaders_to_activate = [];
    $processed_sects = [];
    foreach ($players as $pid => $_p) {
      $pid = (int) $pid;
      $sect = $this->getPlayerSect($pid);
      if ($sect < 0) continue;
      if (isset($processed_sects[$sect])) continue;
      $processed_sects[$sect] = true;
      $is_attacker_sect = ((int) $sect === (int) $attacker_sect);
      if (!$is_attacker_sect && isset($defended_sects[$sect])) continue;

      $candidates = $this->getSectCombatReadyPlayerIds($sect);
      if (empty($candidates)) continue;

      $leader = $this->getSectLeaderId($sect, $pid);
      if (!$this->shouldPromptLeaderForAoeRepresentative((int) $leader, (int) $sect, $candidates)) {
        $rep = (int) $candidates[0];
        self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $rep");
        if ($is_attacker_sect) {
          self::setGameStateValue('war_rep_attacker_id', (int) $rep);
        }
        if ((int) $leader !== (int) $rep) {
          $this->notifyAllPlayersTr('conspiracyRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Conspiracy.'), [
            'leader_name' => self::getPlayerNameById($leader),
            'leader_id' => (int) $leader,
            'representative_name' => self::getPlayerNameById($rep),
            'representative_id' => $rep
          ]);
          $this->notifyPlayerTr($rep, 'conspiracyAssignedToYou', clienttranslate('${leader_name} assigns you to Conspiracy.'), [
            'leader_name' => self::getPlayerNameById($leader),
            'leader_id' => (int) $leader,
            'representative_id' => $rep
          ]);
        }
      } else {
        $leaders_to_activate[] = (int) $leader;
        // Early defense window: defense-card holders of this prompted sect
        // may defend now (concealed) so their Leader can skip assignment.
        if (!$is_attacker_sect) {
          foreach ($this->getSectPlayerIds((int) $sect) as $member_id) {
            foreach ($this->action_cards->getCardsInLocation('hand', (int) $member_id) as $c) {
              if ((string) ($c['type'] ?? '') === 'firm_faith') {
                $leaders_to_activate[] = (int) $member_id;
                break;
              }
            }
          }
        }
      }
    }

    if (empty($leaders_to_activate)) {
      $this->gamestate->nextState('chooseDone');
      return;
    }

    $this->notifyAllPlayersTr('conspiracyRepresentativePhase', clienttranslate('Each Sect Leader chooses a representative for Conspiracy.'), []);
    $this->gamestate->setPlayersMultiactive(array_values(array_unique(array_map('intval', $leaders_to_activate))), 'chooseDone');
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function argChooseMartyrdomRepresentative()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $candidates_by_leader = $this->buildAoeRepresentativeCandidatesByLeader(3, (int) $attacker_sect);
    $active_leader_ids = array_values(array_map('intval', $this->gamestate->getActivePlayerList()));

    return [
      'candidates' => [],
      'candidates_by_leader' => $candidates_by_leader,
      'active_leader_ids' => $active_leader_ids
    ];
  }

  function stMartyrdomChooseRepresentative()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $players = self::loadPlayersBasicInfos();

    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0");
    self::setGameStateValue('war_rep_attacker_id', 0);

    $defended_sects = array_fill_keys(
      $this->getAoeDefendedSectsForCurrentCombat(3, (int) $attacker_sect),
      true
    );

    $leaders_to_activate = [];
    $processed_sects = [];
    foreach ($players as $pid => $_p) {
      $pid = (int) $pid;
      $sect = $this->getPlayerSect($pid);
      if ($sect < 0) continue;
      if (isset($processed_sects[$sect])) continue;
      $processed_sects[$sect] = true;
      $is_attacker_sect = ((int) $sect === (int) $attacker_sect);
      if (!$is_attacker_sect && isset($defended_sects[$sect])) continue;

      $candidates = $this->getSectCombatReadyPlayerIds($sect);
      if (empty($candidates)) continue;

      $leader = $this->getSectLeaderId($sect, $pid);
      if (!$this->shouldPromptLeaderForAoeRepresentative((int) $leader, (int) $sect, $candidates)) {
        $rep = (int) $candidates[0];
        self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 1 WHERE player_id = $rep");
        if ($is_attacker_sect) {
          self::setGameStateValue('war_rep_attacker_id', (int) $rep);
        }
        if ((int) $leader !== (int) $rep) {
          $this->notifyAllPlayersTr('martyrdomRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Martyrdom.'), [
            'leader_name' => self::getPlayerNameById($leader),
            'leader_id' => (int) $leader,
            'representative_name' => self::getPlayerNameById($rep),
            'representative_id' => $rep
          ]);
          $this->notifyPlayerTr($rep, 'martyrdomAssignedToYou', clienttranslate('${leader_name} assigns you to Martyrdom.'), [
            'leader_name' => self::getPlayerNameById($leader),
            'leader_id' => (int) $leader,
            'representative_id' => $rep
          ]);
        }
      } else {
        $leaders_to_activate[] = (int) $leader;
        // Early defense window: defense-card holders of this prompted sect
        // may defend now (concealed) so their Leader can skip assignment.
        if (!$is_attacker_sect) {
          foreach ($this->getSectPlayerIds((int) $sect) as $member_id) {
            foreach ($this->action_cards->getCardsInLocation('hand', (int) $member_id) as $c) {
              if ((string) ($c['type'] ?? '') === 'great_mercy') {
                $leaders_to_activate[] = (int) $member_id;
                break;
              }
            }
          }
        }
      }
    }

    if (empty($leaders_to_activate)) {
      $this->gamestate->nextState('chooseDone');
      return;
    }

    $this->notifyAllPlayersTr('martyrdomRepresentativePhase', clienttranslate('Each Sect Leader chooses a representative for Martyrdom.'), []);
    $this->gamestate->setPlayersMultiactive(array_values(array_unique(array_map('intval', $leaders_to_activate))), 'chooseDone');
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function chooseMartyrdomRepresentative($representative_id)
  {
    self::checkAction("chooseMartyrdomRepresentative");
    $player_id = (int) self::getCurrentPlayerId();
    $representative_id = (int) $representative_id;
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $leader_sect = $this->getPlayerSect($player_id);
    $leader_id = $this->getSectLeaderId($leader_sect, $player_id);
    if ($player_id !== $leader_id) {
      throw new BgaVisibleSystemException(clienttranslate("Only Sect Leaders can assign a representative for Martyrdom"));
    }
    if ($leader_sect < 0) {
      throw new BgaVisibleSystemException(clienttranslate("Your Sect cannot assign a Martyrdom representative"));
    }
    if ((int) $leader_sect !== (int) $attacker_sect) {
      $defended_sects = array_fill_keys(
        $this->getAoeDefendedSectsForCurrentCombat(3, (int) $attacker_sect),
        true
      );
      if (isset($defended_sects[$leader_sect])) {
        throw new BgaVisibleSystemException(clienttranslate("Your Sect already defended against Martyrdom"));
      }
    }

    if (!$this->isValidSectCombatRepresentative((int) $leader_sect, (int) $representative_id)) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid Martyrdom representative"));
    }

    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0 WHERE player_sect = $leader_sect");
    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 1 WHERE player_id = $representative_id");
    if ((int) $leader_sect === (int) $attacker_sect) {
      self::setGameStateValue('war_rep_attacker_id', (int) $representative_id);
    }

    if ((int) $player_id !== (int) $representative_id) {
      $this->notifyAllPlayersTr('martyrdomRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Martyrdom.'), [
        'leader_name' => self::getPlayerNameById($player_id),
        'leader_id' => (int) $player_id,
        'representative_name' => self::getPlayerNameById($representative_id),
        'representative_id' => $representative_id
      ]);
      $this->notifyPlayerTr($representative_id, 'martyrdomAssignedToYou', clienttranslate('${leader_name} assigns you to Martyrdom.'), [
        'leader_name' => self::getPlayerNameById($player_id),
        'leader_id' => (int) $player_id,
        'representative_id' => $representative_id
      ]);
    }

    // Close this sect's early defense window; holders regain the option
    // during the believer-commit phase.
    $this->releaseSameSectActivePlayers((int) $leader_sect, (int) $player_id, 'chooseDone');
    $this->gamestate->setPlayerNonMultiactive($player_id, 'chooseDone');
  }

  function chooseConspiracyRepresentative($representative_id)
  {
    self::checkAction("chooseConspiracyRepresentative");
    $player_id = (int) self::getCurrentPlayerId();
    $representative_id = (int) $representative_id;
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $leader_sect = $this->getPlayerSect($player_id);
    $leader_id = $this->getSectLeaderId($leader_sect, $player_id);
    if ($player_id !== $leader_id) {
      throw new BgaVisibleSystemException(clienttranslate("Only Sect Leaders can assign a representative for Conspiracy"));
    }
    if ($leader_sect < 0) {
      throw new BgaVisibleSystemException(clienttranslate("Your Sect cannot assign a defender for this Conspiracy"));
    }
    if ((int) $leader_sect !== (int) $attacker_sect) {
      $defended_sects = array_fill_keys(
        $this->getAoeDefendedSectsForCurrentCombat(6, (int) $attacker_sect),
        true
      );
      if (isset($defended_sects[$leader_sect])) {
        throw new BgaVisibleSystemException(clienttranslate("Your Sect already defended against Conspiracy"));
      }
    }

    if (!$this->isValidSectCombatRepresentative((int) $leader_sect, (int) $representative_id)) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid Conspiracy representative"));
    }

    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0 WHERE player_sect = $leader_sect");
    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $representative_id");
    if ((int) $leader_sect === (int) $attacker_sect) {
      self::setGameStateValue('war_rep_attacker_id', (int) $representative_id);
    }

    if ((int) $player_id !== (int) $representative_id) {
      $this->notifyAllPlayersTr('conspiracyRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Conspiracy.'), [
        'leader_name' => self::getPlayerNameById($player_id),
        'leader_id' => (int) $player_id,
        'representative_name' => self::getPlayerNameById($representative_id),
        'representative_id' => $representative_id
      ]);
      $this->notifyPlayerTr($representative_id, 'conspiracyAssignedToYou', clienttranslate('${leader_name} assigns you to Conspiracy.'), [
        'leader_name' => self::getPlayerNameById($player_id),
        'leader_id' => (int) $player_id,
        'representative_id' => $representative_id
      ]);
    }

    // Close this sect's early defense window; holders regain the option
    // during the believer-commit phase.
    $this->releaseSameSectActivePlayers((int) $leader_sect, (int) $player_id, 'chooseDone');
    $this->gamestate->setPlayerNonMultiactive($player_id, 'chooseDone');
  }

  function stConspiracyChooseBelievers()
  {
    $war_type = (int) self::getGameStateValue('war_type');
    if ($war_type === 11) {
      $contenders = $this->getFinalConspiracyContenders();
      if (count($contenders) < 2) {
        $this->finalizeFinalConspiracyContest(true);
        return;
      }

      $playable = $this->getFinalConspiracyPlayableContenders($contenders);
      if (count($playable) < 2) {
        $this->finalizeFinalConspiracyContest(false);
        return;
      }

      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      if (!in_array((int) $attacker_id, $playable, true)) {
        $attacker_id = (int) $this->pickNextFinalConspiracyAttacker(0, $playable);
      }
      if ($attacker_id <= 0) {
        $attacker_id = (int) $playable[0];
      }

      $round = (int) self::getGameStateValue('debate_round') + 1;
      self::setGameStateValue('debate_round', (int) $round);
      self::setGameStateValue('war_attacker_id', (int) $attacker_id);
      self::setGameStateValue('war_rep_attacker_id', (int) $attacker_id);
      self::setGameStateValue('war_card_attacker', 0);
      self::setGameStateValue('war_card_defender', 0);
      $this->clearWarCardSourceFlags();
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0");
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $attacker_id");

      $targets = array_values(array_map('intval', $playable));
      $this->gamestate->setPlayersMultiactive($targets, 'nextStep');

      $this->notifyAllPlayersTr('conspiracyStart', clienttranslate('Final Struggle round ${round}: ${player_name} launches Conspiracy.'), [
        'player_id' => (int) $attacker_id,
        'player_name' => self::getPlayerNameById((int) $attacker_id),
        'final_struggle' => 1,
        'round' => (int) $round,
        'score_rows' => $this->getFinalConspiracyScoreRows($contenders)
      ]);
      $this->notifyAllPlayersTr('conspiracyDefendersChoose', clienttranslate('Final Struggle Conspiracy: contenders must choose one Believer'), [
        'target_ids' => $targets,
        'final_struggle' => 1,
        'round' => (int) $round,
        'attacker_id' => (int) $attacker_id,
        'score_rows' => $this->getFinalConspiracyScoreRows($contenders)
      ]);
      $this->runPracticeAiForCurrentStateIfNeeded();
      return;
    }

    // Safety net: ensure every undefended sect with available believers has
    // exactly one active representative before entering choose-believer step.
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $players = self::loadPlayersBasicInfos();
    $defended_sects = array_fill_keys(
      $this->getAoeDefendedSectsForCurrentCombat(6, (int) $attacker_sect),
      true
    );

    $attacker_candidates = array_values(array_map('intval', $this->getSectCombatReadyPlayerIds($attacker_sect)));
    if (empty($attacker_candidates)) {
      self::setGameStateValue('war_rep_attacker_id', 0);
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0 WHERE player_sect = $attacker_sect");
    } else {
      $attacker_rep = (int) self::getGameStateValue('war_rep_attacker_id');
      if (!in_array($attacker_rep, $attacker_candidates, true)) {
        $attacker_rep = (int) $attacker_candidates[0];
      }
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0 WHERE player_sect = $attacker_sect");
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $attacker_rep");
      self::setGameStateValue('war_rep_attacker_id', (int) $attacker_rep);
    }

    $processed_sects = [];
    foreach ($players as $pid => $_p) {
      $pid = (int) $pid;
      $sect = $this->getPlayerSect($pid);
      if ($sect < 0 || $sect === $attacker_sect) continue;
      if (isset($processed_sects[$sect])) continue;
      $processed_sects[$sect] = true;
      if (isset($defended_sects[$sect])) continue;

      $candidates = array_values(array_map('intval', $this->getSectCombatReadyPlayerIds($sect)));
      if (empty($candidates)) {
        self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0 WHERE player_sect = $sect");
        continue;
      }

      $existing = array_values(array_map('intval', self::getObjectListFromDB(
        "SELECT player_id FROM player WHERE player_sect = $sect AND player_is_conspiracy_rep = 1 AND player_role != 2",
        true
      )));
      $existing = array_values(array_intersect($existing, $candidates));
      $rep = !empty($existing) ? (int) $existing[0] : (int) $candidates[0];

      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0 WHERE player_sect = $sect");
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $rep");
    }

    $rep_ids = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_is_conspiracy_rep = 1", true));
    $targets = array_values(array_filter($rep_ids, function ($pid) {
      return $this->believer_cards->countCardInLocation('hand', (int) $pid) > 0;
    }));

    if (empty($targets)) {
      $this->gamestate->nextState('nextStep');
      return;
    }

    // Defense-card holders of fighting sects stay in the window: they may
    // still defend (concealed) until their representative commits a believer.
    // target_ids stays representatives-only (labels + commit eligibility).
    $active_targets = array_values(array_unique(array_merge(
      $targets,
      $this->getAoeCommitPhaseDefenseHolderIds(6, $targets)
    )));

    $this->gamestate->setPlayersMultiactive($active_targets, 'nextStep');
    $this->notifyAllPlayersTr('conspiracyDefendersChoose', clienttranslate('Conspiracy representatives must choose one Believer'), [
      'target_ids' => $targets
    ]);
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function argConspiracyChooseBelievers()
  {
    $war_type = (int) self::getGameStateValue('war_type');
    // Representatives only (war 6): defense holders are also multiactive but
    // must not appear in commit-target labels/eligibility. Final Struggle
    // (war 11) keeps the active list (all contenders commit).
    $args = [
      'target_ids' => ($war_type === 6)
        ? array_values(array_map('intval', self::getObjectListFromDB(
            "SELECT player_id FROM player WHERE player_is_conspiracy_rep = 1",
            true
          )))
        : array_values(array_map('intval', $this->gamestate->getActivePlayerList()))
    ];
    if ($war_type === 11) {
      $args['final_struggle'] = 1;
      $args['round'] = (int) self::getGameStateValue('debate_round');
      $args['attacker_id'] = (int) self::getGameStateValue('war_attacker_id');
      $args['score_rows'] = $this->getFinalConspiracyScoreRows($this->getFinalConspiracyContenders());
    }
    return $args;
  }

  function stResolveConspiracy()
  {
    $war_type = (int) self::getGameStateValue('war_type');
    if ($war_type === 11) {
      $contenders = $this->getFinalConspiracyContenders();
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      $attacker_name = self::getPlayerNameById((int) $attacker_id);
      // Skip/zombie safety: if any contender did not commit in time, auto-commit
      // one random Believer so Final Conspiracy still resolves this round.
      foreach ($contenders as $pid) {
        $this->autoCommitAoeBelieverForZombie((int) $pid, 11);
      }
      $attacker_card_id = (int) self::getGameStateValue('war_card_attacker');
      $attacker_card = $this->believer_cards->getCard($attacker_card_id);
      if (!$attacker_card || $attacker_card['location'] !== 'cardsontable') {
        $this->finalizeFinalConspiracyContest(true);
        return;
      }

      $defender_cards = array_values(array_filter(
        $this->believer_cards->getCardsInLocation('cardsontable'),
        function ($card) use ($attacker_card_id) {
          return (int) $card['id'] !== (int) $attacker_card_id;
        }
      ));
      $visual_cards = $this->buildAoeVisualBelieverCards(array_merge([$attacker_card], $defender_cards), (int) $attacker_card_id);

      $attacker_wins = [];
      $attacker_draws = [];
      $defender_wins = [];
      foreach ($defender_cards as $def_card) {
        $result = $this->compareBelievers((int) $attacker_card['type'], (int) $def_card['type'], false);
        $def_id = (int) $def_card['id'];
        if ((int) $result['winner'] === 1) {
          $attacker_wins[] = $def_id;
        } elseif ((int) $result['winner'] === -1) {
          $defender_wins[] = $def_id;
        } else {
          $attacker_draws[] = $def_id;
        }
      }

      $attacker_stolen = array_values($attacker_wins);
      foreach ($defender_cards as $def_card) {
        $def_id = (int) $def_card['id'];
        $owner_id = (int) $def_card['location_arg'];
        if (in_array($def_id, $attacker_stolen, true)) {
          $this->believer_cards->moveCard((int) $def_id, 'finalconspcap', (int) $attacker_id);
        } elseif (in_array($def_id, $attacker_draws, true)) {
          $this->believer_cards->moveCard((int) $def_id, 'finalconspdraw', (int) $owner_id);
        } else {
          $this->believer_cards->moveCard((int) $def_id, 'finalconspused', (int) $owner_id);
        }
      }
      $this->believer_cards->moveCard((int) $attacker_card_id, 'finalconspused', (int) $attacker_id);

      $score_rows = $this->getFinalConspiracyScoreRows($contenders);
      $this->notifyAllPlayersTr('conspiracyResolved', clienttranslate('Final Struggle Conspiracy by ${player_name} ends.'), [
        'player_name' => $attacker_name,
        'attacker_id' => (int) $attacker_id,
        'attacker_card_id' => (int) $attacker_card_id,
        'attacker_owner' => (int) $attacker_id,
        'attacker_wins_visual' => $attacker_wins,
        'attacker_stolen' => $attacker_stolen,
        'defender_wins' => $defender_wins,
        'draw_defenders' => $attacker_draws,
        'visual_cards' => $visual_cards,
        'final_struggle' => 1,
        'round' => (int) self::getGameStateValue('debate_round'),
        'score_rows' => $score_rows,
        'reverse_karma_active' => 0,
        'reverse_karma_owner_id' => 0,
        'reverse_karma_stack_owner_ids' => []
      ]);

      $playable = $this->getFinalConspiracyPlayableContenders($contenders);
      $this->notifyPublicCountsSync();
      if (count($playable) < 2) {
        $this->finalizeFinalConspiracyContest(false);
        return;
      }

      $next_attacker_id = (int) $this->pickNextFinalConspiracyAttacker((int) $attacker_id, $playable);
      if ($next_attacker_id <= 0) {
        $this->finalizeFinalConspiracyContest(false);
        return;
      }

      self::setGameStateValue('war_attacker_id', (int) $next_attacker_id);
      self::setGameStateValue('war_rep_attacker_id', (int) $next_attacker_id);
      self::setGameStateValue('war_card_attacker', 0);
      self::setGameStateValue('war_card_defender', 0);
      $this->clearWarCardSourceFlags();
      $this->gamestate->nextState('nextFinalConspiracyRound');
      return;
    }

    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_name = self::getPlayerNameById($attacker_id);
    // Skip/zombie safety: if any selected representative did not commit in time,
    // auto-commit one random Believer before Conspiracy resolution.
    $rep_ids = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_is_conspiracy_rep = 1", true));
    foreach ($rep_ids as $rep_id) {
      $this->autoCommitAoeBelieverForZombie((int) $rep_id, 6);
    }
    $attacker_card_id = (int) self::getGameStateValue('war_card_attacker');
    $attacker_card = $this->believer_cards->getCard($attacker_card_id);
    if (!$attacker_card || $attacker_card['location'] !== 'cardsontable') {
      $this->notifyPublicCountsSync();
      $this->routeAfterActionWindowCheck('playerTurn');
      return;
    }

    // Conspiracy rewards/penalties belong to the acting attacker fighter.
    // Prefer assigned attacker representative if present; otherwise use
    // the attacking player who initiated the action.
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $attacker_owner = ($attacker_rep_id > 0) ? $attacker_rep_id : $attacker_id;
    $defender_cards = array_values(array_filter(
      $this->believer_cards->getCardsInLocation('cardsontable'),
      function ($card) use ($attacker_card_id) {
        return (int) $card['id'] !== (int) $attacker_card_id;
      }
    ));
    $visual_cards = $this->buildAoeVisualBelieverCards(array_merge([$attacker_card], $defender_cards), (int) $attacker_card_id);

    $attacker_wins = [];
    $attacker_draws = [];
    $defender_wins = [];
    foreach ($defender_cards as $def_card) {
      $result = $this->getCurrentCombatComparisonResult((int) $attacker_card['type'], (int) $def_card['type'], false);
      $def_id = (int) $def_card['id'];
      if ($result['winner'] === 1) {
        $attacker_wins[] = $def_id;
      } elseif ($result['winner'] === -1) {
        $defender_wins[] = $def_id;
      } else {
        $attacker_draws[] = $def_id;
      }
    }

    // Resolve Conspiracy per duel outcome:
    // - attacker win on that defender card => attacker representative steals it
    // - defender win or draw => defender keeps own card
    // - attacker own card always returns to attacker representative
    $attacker_stolen = array_values($attacker_wins);
    $cards_final_owner = [];
    foreach ($defender_cards as $def_card) {
      $def_id = (int) $def_card['id'];
      if (in_array($def_id, $attacker_stolen, true)) {
        $cards_final_owner[$def_id] = $attacker_owner;
      } else {
        $cards_final_owner[$def_id] = (int) $def_card['location_arg'];
      }
    }
    $cards_final_owner[$attacker_card_id] = $attacker_owner;

    foreach ($cards_final_owner as $card_id => $owner_id) {
      $this->believer_cards->moveCard((int) $card_id, 'hand', (int) $owner_id);
    }

    $gain_by_player = [];
    $cards_by_owner = [];
    foreach ($cards_final_owner as $card_id => $owner_id) {
      if (!isset($cards_by_owner[$owner_id])) {
        $cards_by_owner[$owner_id] = [];
      }
      $cards_by_owner[$owner_id][] = $this->believer_cards->getCard((int) $card_id);
      if (!isset($gain_by_player[$owner_id])) {
        $gain_by_player[$owner_id] = 0;
      }
      $gain_by_player[$owner_id] += 1;
    }

    $conspiracy_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'conspiracy';
    });
    if (!empty($conspiracy_cards)) {
      $this->action_cards->moveCards(array_keys($conspiracy_cards), 'discard');
    }
    $consp_def_cards = $this->action_cards->getCardsInLocation('conspdef');
    if (!empty($consp_def_cards)) {
      $this->notifyAoeDefenseReveals($consp_def_cards);
      $this->action_cards->moveCards(array_map(function ($card) {
        return (int) $card['id'];
      }, $consp_def_cards), 'discard');
    }

    $this->notifyAllPlayersTr('conspiracyResolved', clienttranslate('Conspiracy by ${player_name} ends.'), [
      'player_name' => $attacker_name,
      'attacker_id' => $attacker_id,
      'attacker_card_id' => $attacker_card_id,
      'attacker_owner' => $attacker_owner,
      // Visual-only: keep per-duel attacker wins for loser-gray rendering,
      // aligned with actual transfer result for each duel.
      'attacker_wins_visual' => $attacker_wins,
      'attacker_stolen' => $attacker_stolen,
      'defender_wins' => $defender_wins,
      'draw_defenders' => $attacker_draws,
      'visual_cards' => $visual_cards,
      'gain_by_player' => $gain_by_player,
      'reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
      'reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
      'reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds()
    ]);
    $this->notifyAllPlayersTr('combatSnapshotHistory', clienttranslate('Confrontation summary: Conspiracy by ${player_name}, snatched ${stolen_n}, defender wins ${defender_n}, draws ${draw_n}.'), [
      'player_name' => $attacker_name,
      'stolen_n' => count($attacker_stolen),
      'defender_n' => count($defender_wins),
      'draw_n' => count($attacker_draws)
    ]);
    // Keep reveal/result animation first on all clients.
    // Private hand sync for gained cards is sent after resolved notification.
    foreach ($cards_by_owner as $owner_id => $cards) {
      $this->notifyPlayerTr((int) $owner_id, 'newBelievers', '', ['cards' => array_values($cards)]);
    }

    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0");
    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    $this->clearAoeDefendedSectMask();
    $this->clearCombatSkillState();

    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function stResolveAttack()
  {
    $war_type = (int) self::getGameStateValue('war_type');

    // Combat-order rule: ask Karma Reversed after defense and before
    // representatives/believers are chosen.
    if ($war_type === 2 && $this->queueReverseKarmaPromptIfNeeded(11)) {
      return;
    }
    if ($war_type === 7 && $this->queueReverseKarmaPromptIfNeeded(12)) {
      return;
    }
    if ($war_type === 3 && $this->queueReverseKarmaPromptIfNeeded(13)) {
      return;
    }
    if ($war_type === 6 && $this->queueReverseKarmaPromptIfNeeded(14)) {
      return;
    }

    switch ($war_type) {
      case 4:
        $this->gamestate->nextState('breakingFaith');
        break;
      case 2:
        $this->gamestate->nextState('faithWarDuel');
        break;
      case 3:
        $this->gamestate->nextState('martyrdom');
        break;
      case 6:
        $this->gamestate->nextState('conspiracy');
        break;
      case 7:
        $this->gamestate->nextState('faithDebate');
        break;
      case 8:
        $this->gamestate->nextState('witchHunt');
        break;
      case 9:
        $this->gamestate->nextState('spreadRumors');
        break;
      default:
        $this->gamestate->nextState('playerTurn');
        break;
    }
  }

  function stResolveBreakingFaith()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $attacker_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $attacker_id");
    $defender_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $defender_id");
    $defender_leader_id = (int) self::getUniqueValueFromDB("SELECT player_leader_id FROM player WHERE player_id = $defender_id");

    $defended = ((int) self::getGameStateValue('breaking_faith_defended') === 1);
    $defender_hand = array_values($this->believer_cards->getCardsInLocation('hand', $defender_id));
    $defender_count = count($defender_hand);
    $purple_leader_counter_case = (
      $attacker_role === 0 &&
      $defender_role === 1 &&
      $defender_leader_id === $attacker_id &&
      $this->isPurpleHermitPendingSplit((int) $defender_id)
    );
    $steal_count = $purple_leader_counter_case
      ? 0
      : ($defended ? min(1, $defender_count) : intdiv($defender_count, 2));

    $stolen_cards = [];
    for ($i = 0; $i < $steal_count; $i++) {
      if (empty($defender_hand)) {
        break;
      }
      $idx = array_rand($defender_hand);
      $card = $defender_hand[$idx];
      unset($defender_hand[$idx]);
      $defender_hand = array_values($defender_hand);
      $this->believer_cards->moveCard((int) $card['id'], 'hand', $attacker_id);
      $stolen_cards[] = $card;
    }

    if (!empty($stolen_cards)) {
      $this->notifyPlayerTr($attacker_id, 'newBelievers', '', ['cards' => array_values($stolen_cards)]);
      foreach ($stolen_cards as $stolen) {
        $this->notifyPlayerTr($defender_id, 'believerStolen', '', ['card_id' => (int) $stolen['id']]);
      }
    }

    // Always resync both sides after Breaking Faith resolution to prevent client-side
    // sect/role stale data from blocking subsequent target selection.
    $identity_sync_ids = [(int) $attacker_id, (int) $defender_id];
    if ($defender_role === 1) {
      // Target follower is expelled and becomes independent.
      $new_sect = (int) $this->allocateIndependentSectId((int) $defender_id);
      self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_sect = $new_sect, player_is_skill_sealed = 0 WHERE player_id = $defender_id");
      $this->clearPurpleHermitStatus((int) $defender_id);
    } elseif ($defender_role === 0 && $attacker_role === 1) {
      // Attacker follower challenged leader: attacker leaves and becomes independent.
      $new_sect = (int) $this->allocateIndependentSectId((int) $attacker_id);
      self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_sect = $new_sect, player_is_skill_sealed = 0 WHERE player_id = $attacker_id");
      $this->clearPurpleHermitStatus((int) $attacker_id);
    }

    $this->notifyPlayerIdentitySync(array_values(array_unique(array_map('intval', $identity_sync_ids))), 'breaking_faith_split');

    $breaking_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'breaking_faith';
    });
    if (!empty($breaking_cards)) {
      $this->action_cards->moveCards(array_keys($breaking_cards), 'discard');
    }

    $this->notifyAllPlayersTr('breakingFaithResolved', clienttranslate('Breaking Faith by ${player_name} ends.'), [
      'player_name' => self::getPlayerNameById($attacker_id),
      'attacker_id' => $attacker_id,
      'defender_id' => $defender_id,
      'attacker_sect' => (int) $attacker_sect,
      'defended' => $defended ? 1 : 0,
      'stolen_count' => (int) count($stolen_cards),
      'purple_counter_case' => $purple_leader_counter_case ? 1 : 0
    ]);

    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('breaking_faith_defended', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    $this->clearCombatSkillState();

    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function stResolveWitchHunt()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_name = self::getPlayerNameById($attacker_id);
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $target_sect = $this->getPlayerSect($defender_id);
    $target_type = (int) self::getGameStateValue('war_card_defender');

    $killed_by_owner = [];
    foreach ($this->getSectPlayerIds($target_sect) as $pid) {
      $hand = $this->believer_cards->getCardsInLocation('hand', (int) $pid);
      foreach ($hand as $card) {
        if ((int) $card['type'] === $target_type) {
          if (!isset($killed_by_owner[(int) $pid])) $killed_by_owner[(int) $pid] = [];
          $killed_by_owner[(int) $pid][] = $card;
        }
      }
    }

    $all_killed_ids = [];
    foreach ($killed_by_owner as $cards) {
      foreach ($cards as $c) {
        $all_killed_ids[] = (int) $c['id'];
      }
    }
    if (!empty($all_killed_ids)) {
      // Keep graveyard top order deterministic: assign explicit increasing
      // location_arg when batch-killing cards, instead of relying on moveCards().
      $next_discard_arg = (int) self::getUniqueValueFromDB("SELECT COALESCE(MAX(card_location_arg), 0) FROM believer_cards WHERE card_location = 'discard'");
      foreach ($all_killed_ids as $cid) {
        $next_discard_arg += 1;
        $this->believer_cards->moveCard((int) $cid, 'discard', (int) $next_discard_arg);
      }
    }

    $killed_by_owner_payload = [];
    $all_killed_cards = [];
    foreach ($killed_by_owner as $owner => $cards) {
      $payload_cards = array_values($cards);
      foreach ($payload_cards as $c) {
        $all_killed_cards[] = $c;
      }
      $death_n = (int) count($payload_cards);
      if ($death_n > 0) {
        $this->rememberHolyRebirthRoundDeathBurst((int) $owner, (int) $death_n);
      }
      $killed_by_owner_payload[] = [
        'player_id' => (int) $owner,
        'count' => (int) $death_n,
        'card_ids' => array_map(function ($c) {
          return (int) $c['id'];
        }, $payload_cards),
        'cards' => $payload_cards
      ];
    }

    $witch_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'witch_hunt';
    });
    if (!empty($witch_cards)) {
      $this->action_cards->moveCards(array_keys($witch_cards), 'discard');
    }

    $this->notifyAllPlayersTr('witchHunt', clienttranslate('Witch Hunt by ${player_name} ends. ${target_sect_name} loses all ${type} Believers (${n}).'), [
      'player_name' => $attacker_name,
      'attacker_id' => (int) $attacker_id,
      'attacker_sect' => (int) $this->getPlayerSect((int) $attacker_id),
      'target_player_id' => (int) $defender_id,
      'target_player_name' => self::getPlayerNameById((int) $defender_id),
      'target_sect' => $target_sect,
      'target_sect_name' => $this->getSectDisplayName((int) $target_sect),
      'type' => $this->getBelieverTypeLabel((int) $target_type),
      'n' => count($all_killed_ids),
      'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
      'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
      // newest-first for graveyard top rendering on every client
      'killed_cards' => array_values(array_reverse($all_killed_cards)),
      'killed_by_owner' => $killed_by_owner_payload
    ]);
    $this->notifyAllPlayersTr('combatSnapshotHistory', clienttranslate('Confrontation summary: Witch Hunt by ${player_name}, ${target_sect_name}, type ${type}, eliminated ${n}.'), [
      'player_name' => $attacker_name,
      'target_sect' => $target_sect,
      'target_sect_name' => $this->getSectDisplayName((int) $target_sect),
      'type' => $this->getBelieverTypeLabel((int) $target_type),
      'n' => count($all_killed_ids)
    ]);

    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    $this->clearAoeDefendedSectMask();
    $this->clearCombatSkillState();

    $this->notifyPublicCountsSync();
    // Witch Hunt can kill 3+ Believers in one resolution window.
    // If any affected Leader now has death burst >=3, queue Holy Rebirth prompt first.
    $resume_player_id = (int) $attacker_id;
    if ($resume_player_id <= 0) {
      $resume_player_id = (int) self::getActivePlayerId();
    }
    $candidate_order = array_values(array_unique(array_merge(
      array_map('intval', $this->getSectPlayerIds((int) $target_sect)),
      array_map('intval', array_keys($killed_by_owner))
    )));
    foreach ($candidate_order as $candidate_player_id) {
      $candidate_player_id = (int) $candidate_player_id;
      if ($candidate_player_id <= 0) continue;
      $deaths = (int) $this->getWarDeathCounter((int) $candidate_player_id);
      if ($deaths < 3) continue;
      if ($this->queueHolyRebirthPromptIfEligible((int) $candidate_player_id, (int) $deaths, 'witch_hunt', (int) $resume_player_id, 0)) {
        return;
      }
    }
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function stResolveSpreadRumors()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $target_sect = $this->getPlayerSect($defender_id);

    $stolen_cards = [];
    $stolen_by_victim = [];
    $affected_victim_ids = [];
    $affected_victim_names = [];
    foreach ($this->getSectPlayerIds($target_sect) as $victim_id) {
      $victim_id = (int) $victim_id;
      $hand = $this->believer_cards->getCardsInLocation('hand', $victim_id);
      if (empty($hand)) {
        continue;
      }
      $random_key = array_rand($hand);
      $card = $hand[$random_key];
      $this->believer_cards->moveCard((int) $card['id'], 'hand', $attacker_id);
      $stolen_cards[] = $card;
      if (!isset($stolen_by_victim[$victim_id])) {
        $stolen_by_victim[$victim_id] = [];
      }
      $stolen_by_victim[$victim_id][] = (int) $card['id'];
      if (!in_array($victim_id, $affected_victim_ids, true)) {
        $affected_victim_ids[] = $victim_id;
        $affected_victim_names[] = self::getPlayerNameById($victim_id);
      }

      $this->notifyAllPlayersTr('spreadRumors', clienttranslate('${player_name} snatches 1 Believer from ${victim_name} via Spread Rumors.'), array(
        'player_name' => self::getPlayerNameById($attacker_id),
        'player_id' => $attacker_id,
        'victim_id' => $victim_id,
        'victim_name' => self::getPlayerNameById($victim_id),
        'card_id' => (int) $card['id']
      ));
      $this->notifyPlayerTr($victim_id, 'believerStolen', '', array(
        'card_id' => (int) $card['id']
      ));
    }

    if (!empty($stolen_cards)) {
      $this->notifyPlayerTr($attacker_id, 'newBelievers', '', array('cards' => array_values($stolen_cards)));
    }
    $this->notifyAllPlayersTr('spreadRumorsSummary', clienttranslate('${player_name} snatches ${stolen_total} Believers in total.'), array(
      'player_name' => self::getPlayerNameById($attacker_id),
      'player_id' => $attacker_id,
      'stolen_total' => count($stolen_cards),
      'target_player_id' => (int) $defender_id,
      'target_player_name' => self::getPlayerNameById((int) $defender_id),
      'target_sect' => $target_sect,
      'victim_ids' => array_values(array_map('intval', $affected_victim_ids)),
      'victim_names' => array_values($affected_victim_names)
    ));
    $this->notifyAllPlayersTr('combatSnapshotHistory', clienttranslate('Confrontation summary: Spread Rumors by ${player_name}, snatched ${stolen_total} from ${target_sect_name}.'), array(
      'player_name' => self::getPlayerNameById($attacker_id),
      'stolen_total' => count($stolen_cards),
      'target_sect' => $target_sect,
      'target_sect_name' => $this->getSectDisplayName((int) $target_sect)
    ));

    $spread_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'spread_rumors';
    });
    if (!empty($spread_cards)) {
      $this->action_cards->moveCards(array_keys($spread_cards), 'discard');
    }

    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);

    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  // (Legacy playActionCard removed to avoid Cannot redeclare fatal error)
  function stMartyrdomChooseBelievers()
  {
    // Safety net: ensure every undefended sect with available believers has
    // exactly one active representative before entering choose-believer step.
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $players = self::loadPlayersBasicInfos();
    $defended_sects = array_fill_keys(
      $this->getAoeDefendedSectsForCurrentCombat(3, (int) $attacker_sect),
      true
    );

    $attacker_candidates = array_values(array_map('intval', $this->getSectCombatReadyPlayerIds($attacker_sect)));
    if (empty($attacker_candidates)) {
      self::setGameStateValue('war_rep_attacker_id', 0);
      self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0 WHERE player_sect = $attacker_sect");
    } else {
      $attacker_rep = (int) self::getGameStateValue('war_rep_attacker_id');
      if (!in_array($attacker_rep, $attacker_candidates, true)) {
        $attacker_rep = (int) $attacker_candidates[0];
      }
      self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0 WHERE player_sect = $attacker_sect");
      self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 1 WHERE player_id = $attacker_rep");
      self::setGameStateValue('war_rep_attacker_id', (int) $attacker_rep);
    }

    $processed_sects = [];
    foreach ($players as $pid => $_p) {
      $pid = (int) $pid;
      $sect = $this->getPlayerSect($pid);
      if ($sect < 0 || $sect === $attacker_sect) continue;
      if (isset($processed_sects[$sect])) continue;
      $processed_sects[$sect] = true;
      if (isset($defended_sects[$sect])) continue;

      $candidates = array_values(array_map('intval', $this->getSectCombatReadyPlayerIds($sect)));
      if (empty($candidates)) {
        self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0 WHERE player_sect = $sect");
        continue;
      }

      $existing = array_values(array_map('intval', self::getObjectListFromDB(
        "SELECT player_id FROM player WHERE player_sect = $sect AND player_is_martyrdom_rep = 1 AND player_role != 2",
        true
      )));
      $existing = array_values(array_intersect($existing, $candidates));
      $rep = !empty($existing) ? (int) $existing[0] : (int) $candidates[0];

      self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0 WHERE player_sect = $sect");
      self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 1 WHERE player_id = $rep");
    }

    $rep_ids = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_is_martyrdom_rep = 1", true));
    $targets = array_values(array_filter($rep_ids, function ($pid) {
      return $this->believer_cards->countCardInLocation('hand', (int) $pid) > 0;
    }));

    if (empty($targets)) {
      $this->gamestate->nextState('nextStep');
      return;
    }

    // Defense-card holders of fighting sects stay in the window: they may
    // still defend (concealed) until their representative commits a believer.
    // target_ids stays representatives-only (labels + commit eligibility).
    $active_targets = array_values(array_unique(array_merge(
      $targets,
      $this->getAoeCommitPhaseDefenseHolderIds(3, $targets)
    )));

    $this->gamestate->setPlayersMultiactive($active_targets, 'nextStep');
    $this->notifyAllPlayersTr('martyrdomDefendersChoose', clienttranslate('Martyrdom representatives must choose one Believer.'), [
      'target_ids' => $targets
    ]);
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function argMartyrdomChooseBelievers()
  {
    // Representatives only: defense holders are also multiactive but must
    // not appear in commit-target labels/eligibility.
    return [
      'target_ids' => array_values(array_map('intval', self::getObjectListFromDB(
        "SELECT player_id FROM player WHERE player_is_martyrdom_rep = 1",
        true
      )))
    ];
  }

  function stResolveMartyrdom()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_name = self::getPlayerNameById($attacker_id);
    // Skip/zombie safety: if any selected representative did not commit in time,
    // auto-commit one random Believer before Martyrdom resolution.
    $rep_ids = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_is_martyrdom_rep = 1", true));
    foreach ($rep_ids as $rep_id) {
      $this->autoCommitAoeBelieverForZombie((int) $rep_id, 3);
    }
    $martyr_card_id = (int) self::getGameStateValue('war_card_attacker');
    if (!$martyr_card_id) {
      $this->notifyPublicCountsSync();
      $this->routeAfterActionWindowCheck('playerTurn');
      return;
    }

    $attacker_card = $this->believer_cards->getCard($martyr_card_id);
    if (!$attacker_card || $attacker_card['location'] !== 'cardsontable') {
      $this->notifyPublicCountsSync();
      $this->routeAfterActionWindowCheck('playerTurn');
      return;
    }

    $defender_cards = array_values(array_filter(
      $this->believer_cards->getCardsInLocation('cardsontable'),
      function ($card) use ($martyr_card_id) {
        return (int) $card['id'] !== (int) $martyr_card_id;
      }
    ));
    $visual_cards = $this->buildAoeVisualBelieverCards(array_merge([$attacker_card], $defender_cards), (int) $martyr_card_id);

    $dead_defender_ids = [];
    $survivor_defender_ids = [];
    $defender_card_by_id = [];
    foreach ($defender_cards as $def_card) {
      $defender_card_by_id[(int) $def_card['id']] = $def_card;
      $result = $this->getCurrentCombatComparisonResult((int) $attacker_card['type'], (int) $def_card['type'], false);
      $def_card_id = (int) $def_card['id'];
      if ($result['winner'] === 1 || $result['winner'] === 0) {
        $dead_defender_ids[] = $def_card_id;
      } else {
        $survivor_defender_ids[] = $def_card_id;
      }
    }

    if (!empty($dead_defender_ids)) {
      $this->moveBelieverCardsToDiscardWithOwnerMeta($dead_defender_ids);
    }
    if (!empty($survivor_defender_ids)) {
      foreach ($survivor_defender_ids as $cid) {
        $owner = (int) $this->believer_cards->getCard($cid)['location_arg'];
        $this->believer_cards->moveCard($cid, 'hand', $owner);
      }
    }

    // Attacker always dies in Martyrdom.
    $attacker_card_owner = (int) ($attacker_card['location_arg'] ?? $attacker_id);
    $this->moveBelieverCardToDiscardWithOwnerMeta((int) $martyr_card_id, (int) $attacker_card_owner);

    // Sync private hands for survivors (their committed believer returns to hand).
    $survivor_cards_by_owner = [];
    foreach ($survivor_defender_ids as $cid) {
      $original = $defender_card_by_id[$cid] ?? null;
      if (!$original) continue;
      $owner = (int) $original['location_arg'];
      if (!isset($survivor_cards_by_owner[$owner])) {
        $survivor_cards_by_owner[$owner] = [];
      }
      $survivor_cards_by_owner[$owner][] = [
        'id' => (int) $original['id'],
        'type' => (int) $original['type'],
        'type_arg' => (int) $original['type_arg']
      ];
    }
    // Sync private hands for dead believers (attacker + losing/draw defenders).
    $dead_cards_by_owner = [];
    $dead_cards_by_owner[$attacker_card_owner] = [[
      'id' => (int) $attacker_card['id'],
      'type' => (int) $attacker_card['type'],
      'type_arg' => (int) $attacker_card['type_arg']
    ]];
    foreach ($dead_defender_ids as $cid) {
      $original = $defender_card_by_id[$cid] ?? null;
      if (!$original) continue;
      $owner = (int) $original['location_arg'];
      if (!isset($dead_cards_by_owner[$owner])) {
        $dead_cards_by_owner[$owner] = [];
      }
      $dead_cards_by_owner[$owner][] = [
        'id' => (int) $original['id'],
        'type' => (int) $original['type'],
        'type_arg' => (int) $original['type_arg']
      ];
    }
    // Defenders who used Great Mercy were parked in "martyrdef"; move those cards to discard now.
    $defense_marker_cards = $this->action_cards->getCardsInLocation('martyrdef');
    if (!empty($defense_marker_cards)) {
      $this->notifyAoeDefenseReveals($defense_marker_cards);
      $this->action_cards->moveCards(array_map(function ($card) {
        return (int) $card['id'];
      }, $defense_marker_cards), 'discard');
    }

    $martyrdom_action_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'martyrdom';
    });
    if (!empty($martyrdom_action_cards)) {
      $this->action_cards->moveCards(array_keys($martyrdom_action_cards), 'discard');
    }

    $this->notifyAllPlayersTr('martyrdomResolved', clienttranslate('Martyrdom by ${player_name} ends. The attacker Believer dies; losing/draw defenders die.'), array(
      'player_name' => $attacker_name,
      'attacker_id' => $attacker_id,
      'dead_defenders' => $dead_defender_ids,
      'survivor_defenders' => $survivor_defender_ids,
      'visual_cards' => $visual_cards,
      'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
      'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
      'reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
      'reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
      'reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds()
    ));
    $this->notifyAllPlayersTr('combatSnapshotHistory', clienttranslate('Confrontation summary: Martyrdom by ${player_name}, dead ${dead_n}, survivors ${survivor_n}.'), [
      'player_name' => $attacker_name,
      'dead_n' => (int) (1 + count($dead_defender_ids)),
      'survivor_n' => (int) count($survivor_defender_ids)
    ]);
    // Keep reveal/result animation first on all clients.
    // Private hand sync is sent after resolved notification.
    foreach ($survivor_cards_by_owner as $owner => $cards) {
      $this->notifyPlayerTr((int) $owner, 'newBelievers', '', ['cards' => $cards]);
    }
    foreach ($dead_cards_by_owner as $owner => $cards) {
      $this->notifyPlayerTr((int) $owner, 'believersDiscarded', '', [
        'count' => count($cards),
        'card_ids' => array_map(function ($c) {
          return (int) $c['id'];
        }, $cards),
        'cards' => $cards
      ]);
    }

    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    $this->clearAoeDefendedSectMask();
    $this->clearCombatSkillState();
    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0");

    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function startDiscardingActionCard()
  {
    self::checkAction("startDiscardingActionCard");
    $player_id = self::getActivePlayerId();
    $this->assertCanSpendActionSlot();

    // Check whether the player has discarded
    if ($this->hasPerformedActionBit(self::ACTION_BIT_DISCARD) && !$this->isPraiseLifeUsedThisTurn((int) $player_id)) {
      throw new BgaVisibleSystemException(clienttranslate("You've discarded this turn"));
    }
    // Check whether the player has card to discard
    $hand_size = $this->action_cards->countCardInLocation(
      'hand',
      $player_id
    );
    if ($hand_size <= 0) throw new BgaVisibleSystemException(clienttranslate("There's nothing to discard"));

    // And notify
    $this->notifyAllPlayersTr('startDiscardingActionCard', clienttranslate('${player_name} wants to discard'), array(
      'player_name' => self::getActivePlayerName()
    ));

    // Next action
    $this->gamestate->nextState('startDiscardingActionCard');
  }

  function confirmDiscardingActionCard($card_ids)
  {
    self::checkAction("confirmDiscardingActionCard");
    $player_id = (int) self::getActivePlayerId();
    $state_name = (string) $this->getCurrentStateNameSafe();
    $is_end_turn_trim = ($state_name === 'discardingActionCard');
    if (!$is_end_turn_trim) {
      $this->assertCanSpendActionSlot();
    }

    $card_ids = array_values(array_unique(array_filter(array_map('intval', (array) $card_ids), function ($id) {
      return (int) $id > 0;
    })));

    // Check whether the player has chosen at least 1 card to discard
    $discard_size = count($card_ids);
    if ($discard_size < 1) throw new BgaVisibleSystemException(clienttranslate("There's nothing chosen"));

    $hand_cards = $this->action_cards->getCardsInLocation('hand', (int) $player_id);
    $hand_card_ids = array_values(array_map('intval', array_keys($hand_cards)));
    foreach ($card_ids as $card_id) {
      if (!in_array((int) $card_id, $hand_card_ids, true)) {
        throw new BgaVisibleSystemException(clienttranslate("You can only discard Action cards from your own hand"));
      }
    }

    if ($is_end_turn_trim) {
      $hand_limit = (int) $this->getActionHandLimitForPlayer((int) $player_id);
      $required = max(0, (int) count($hand_cards) - (int) $hand_limit);
      if ($required <= 0) {
        $this->gamestate->nextState('nextState');
        return;
      }
      if ($discard_size !== (int) $required) {
        throw new BgaVisibleSystemException(sprintf(
          clienttranslate("You must discard exactly %d Action card(s) to reach your hand limit."),
          (int) $required
        ));
      }
    }

    $discard_map = $this->action_cards->getCards($card_ids);
    $discard_cards = [];
    foreach ($card_ids as $cid) {
      $entry = $discard_map[(int) $cid] ?? $discard_map[(string) $cid] ?? null;
      if (!$entry) continue;
      $discard_cards[] = [
        'id' => (int) ($entry['id'] ?? 0),
        'type' => (string) ($entry['type'] ?? ''),
      ];
    }

    // Checks are done! now we can confirm discarding
    $this->action_cards->moveCards($card_ids, 'discard'); // send it to 'discard'
    if (!$is_end_turn_trim) {
      $this->markPerformedActionBits(self::ACTION_BIT_DISCARD);
      $this->incrementPerformedActionCount(1);
    }

    // And notify
    if ($is_end_turn_trim) {
      $discard_count = count($card_ids);
      $this->notifyAllPlayersTr(
        'actionCardsDiscarded',
        clienttranslate('${player_name} discards ${count} Action card(s) to reach hand limit.'),
        array(
          'player_name' => self::getActivePlayerName(),
          'player_id' => (int) $player_id,
          'n' => (int) $discard_count,
          'count' => (int) $discard_count,
          'card_ids' => array_values(array_map('intval', $card_ids)),
          'cards' => $discard_cards,
          'consume_discard_action' => 0,
        )
      );
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('nextState');
      return;
    }

    $this->notifyAllPlayersTr(
      'confirmDiscardingActionCard',
      clienttranslate('${player_name} finishes discarding'),
      array(
        'player_name' => self::getActivePlayerName(),
        'player_id' => (int) $player_id,
        'cards' => $this->action_cards->getCards($card_ids)
      )
    );

    $this->finishPlayerAction();
  }

  function cancelDiscardingActionCard()
  {
    self::checkAction("cancelDiscardingActionCard");
    // And notify
    $this->notifyAllPlayersTr('cancelDiscardingActionCard', clienttranslate('${player_name} cancels discarding'), array(
      'player_name' => self::getActivePlayerName()
    ));

    // Next action
    $this->gamestate->nextState('cancelDiscardingActionCard');
  }

  function endTurn()
  {
    self::checkAction("endTurn");
    $player_id = (int) self::getActivePlayerId();
    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($player_role === 2) {
      $can_steal = false;
      foreach (self::loadPlayersBasicInfos() as $pid => $_p) {
        $pid = (int) $pid;
        if ($pid === $player_id) continue;
        if ($this->believer_cards->countCardInLocation('hand', $pid) > 0) {
          $can_steal = true;
          break;
        }
      }
      if ($can_steal) {
        throw new BgaVisibleSystemException(clienttranslate("Wanderer must snatch a Believer first."));
      }
    }
    $this->notifyAllPlayersTr('endTurn', clienttranslate('${player_name} finishes their action phase'), array(
      'player_name' => self::getActivePlayerName()
    ));
    $this->clearPraiseLifeDecisionPending();
    $this->gamestate->nextState('endTurn');
  }

  function wandererSteal($target_player_id)
  {
    self::checkAction("wandererSteal");
    $player_id = (int) self::getActivePlayerId();
    $target_player_id = (int) $target_player_id;
    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($player_role !== 2) {
      throw new BgaVisibleSystemException(clienttranslate("Only Wanderer can use this action."));
    }
    if ($target_player_id === $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose another player."));
    }

    $target_hand = array_values($this->believer_cards->getCardsInLocation('hand', $target_player_id));
    if (empty($target_hand)) {
      throw new BgaVisibleSystemException(clienttranslate("Target player has no Believers to snatch."));
    }

    $stolen_card = $target_hand[array_rand($target_hand)];
    $this->believer_cards->moveCard((int) $stolen_card['id'], 'hand', $player_id);
    $this->notifyPlayerTr($player_id, 'newBelievers', '', ['cards' => [[
      'id' => (int) $stolen_card['id'],
      'type' => (int) $stolen_card['type'],
      'type_arg' => (int) $stolen_card['type_arg']
    ]]]);
    $this->notifyPlayerTr($target_player_id, 'believerStolen', '', ['card_id' => (int) $stolen_card['id']]);
    $this->notifyAllPlayersTr('wandererSteal', clienttranslate('${player_name} snatches 1 Believer from ${target_name}'), [
      'player_name' => self::getPlayerNameById($player_id),
      'target_name' => self::getPlayerNameById($target_player_id),
      'player_id' => $player_id,
      'target_id' => $target_player_id
    ]);

    $turns = (int) self::getUniqueValueFromDB("SELECT player_wanderer_turns FROM player WHERE player_id = $player_id");
    $turns += 1;
    if ($turns >= 3) {
      $reborn_sect = (int) $this->allocateIndependentSectId((int) $player_id);
      self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_sect = $reborn_sect, player_is_skill_sealed = 0, player_wanderer_turns = 0 WHERE player_id = $player_id");
      $this->clearPurpleHermitStatus((int) $player_id);
      $this->notifyPlayerIdentitySync([(int) $player_id], 'wanderer_reborn');

      $this->notifyAllPlayersTr('wandererReborn', clienttranslate('${player_name} rises again and returns to normal play!'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => $player_id
      ]);

      // Refill is handled once in argPlayerTurn (single source of truth).
      // Avoid double refill (reborn branch + playerTurn entry) causing 12 cards.
      $this->resetActionWindowState(true);
      $this->gamestate->nextState('wandererSteal');
      return;
    }

    self::DbQuery("UPDATE player SET player_wanderer_turns = $turns WHERE player_id = $player_id");
    $this->gamestate->nextState('endTurn');
  }

  function surrender($leader_id)
  {
    self::checkAction("surrender");
    $player_id = (int) self::getCurrentPlayerId();
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    if ($bankrupt_id <= 0) {
      $bankrupt_id = $player_id;
      self::setGameStateValue('surrender_bankrupt_id', $bankrupt_id);
    }
    if ($player_id !== $bankrupt_id) {
      throw new BgaVisibleSystemException(clienttranslate("Only the player with 0 Believers may choose a surrender target."));
    }

    $leader_id = (int) $leader_id;
    $available = $this->getAvailableSurrenderLeaders($bankrupt_id);
    if (!in_array($leader_id, $available, true)) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid surrender target."));
    }

    self::setGameStateValue('surrender_target_leader_id', $leader_id);

    $this->notifyAllPlayersTr('surrenderAsked', clienttranslate('${player_name} asks ${leader_name} to accept surrender.'), array(
      'player_name' => self::getPlayerNameById($bankrupt_id),
      'leader_name' => self::getPlayerNameById($leader_id),
      'bankrupt_id' => $bankrupt_id,
      'leader_id' => $leader_id
    ));

    $this->gamestate->nextState('routeSurrenderLeaderResponse');
  }

  function becomeWanderer()
  {
    self::checkAction("becomeWanderer");
    $player_id = (int) self::getCurrentPlayerId();
    $available = $this->getAvailableSurrenderLeaders($player_id);
    if (!empty($available)) {
      throw new BgaVisibleSystemException(clienttranslate("You may become Wanderer only after all Leaders refuse surrender."));
    }

    $this->doBecomeWanderer($player_id);
    self::setGameStateValue('surrender_bankrupt_id', 0);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);
    $this->setRejectedMask(0);
    $this->gamestate->nextState('nextPlayer');
  }

  private function getPendingLeaderSupportLeaderId(): int
  {
    $follower_id = (int) self::getGameStateValue('follower_id_waiting');
    if ($follower_id > 0) {
      $leader_id = (int) self::getUniqueValueFromDB("SELECT player_leader_id FROM player WHERE player_id = $follower_id");
      if ($leader_id > 0) {
        return (int) $leader_id;
      }
    }
    return (int) self::getActivePlayerId();
  }

  private function requireCurrentOrBotForActiveState(string $state_name, int $expected_player_id): int
  {
    $expected_player_id = (int) $expected_player_id;
    $state = $this->getCurrentStateSnapshotSafe();
    $current_state_name = (string) ($state['name'] ?? '');
    if ($current_state_name !== (string) $state_name) {
      throw new BgaVisibleSystemException(clienttranslate("This action is no longer available."));
    }

    // Bot/practice-AI automation: the AJAX caller (getCurrentPlayerId) is the
    // human running the AI, not the AI seat. Treat it as a bot action for the
    // expected player instead of throwing "It is not your turn."
    if ($this->bot_automation_depth > 0 && $expected_player_id > 0) {
      if ((int) self::getActivePlayerId() !== $expected_player_id) {
        $this->switchActivePlayerSafely((int) $expected_player_id);
      }
      return (int) $expected_player_id;
    }

    $current_player_id = (int) self::getCurrentPlayerId();
    if ($current_player_id > 0) {
      if ($expected_player_id > 0 && $current_player_id !== $expected_player_id) {
        throw new BgaVisibleSystemException(clienttranslate("It is not your turn."));
      }
      if ($expected_player_id > 0 && (int) self::getActivePlayerId() !== $expected_player_id) {
        $this->switchActivePlayerSafely((int) $expected_player_id);
      }
      return (int) $current_player_id;
    }

    if ($expected_player_id > 0) {
      if ((int) self::getActivePlayerId() !== $expected_player_id) {
        $this->switchActivePlayerSafely((int) $expected_player_id);
      }
      return (int) $expected_player_id;
    }
    return (int) self::getActivePlayerId();
  }

  function acceptLeaderSupport()
  {
    $leader_id = $this->requireCurrentOrBotForActiveState('askLeaderSupport', $this->getPendingLeaderSupportLeaderId());
    $follower_id = (int) self::getGameStateValue('follower_id_waiting');
    if ($follower_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("No Follower waiting for support."));
    }
    if ($this->believer_cards->countCardInLocation('hand', $leader_id) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("You have no Believer to give."));
    }
    $this->notifyAllPlayersTr('leaderSupportDecision', clienttranslate('${leader_name} agrees to support ${target_name}.'), [
      'leader_name' => self::getPlayerNameById($leader_id),
      'target_name' => self::getPlayerNameById($follower_id),
      'accepted' => 1
    ]);
    $this->gamestate->nextState('leaderGiveBeliever');
  }

  function rejectLeaderSupport()
  {
    $leader_id = $this->requireCurrentOrBotForActiveState('askLeaderSupport', $this->getPendingLeaderSupportLeaderId());
    $follower_id = (int) self::getGameStateValue('follower_id_waiting');
    if ($follower_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("No Follower waiting for support."));
    }

    $this->notifyAllPlayersTr('leaderSupportDecision', clienttranslate('${leader_name} refuses to support ${target_name}.'), [
      'leader_name' => self::getPlayerNameById($leader_id),
      'target_name' => self::getPlayerNameById($follower_id),
      'accepted' => 0
    ]);

    self::setGameStateValue('surrender_support_mode', 0);
    $this->markLeaderRejected((int) $leader_id);
    $this->startSurrenderFlowFor($follower_id, false);
  }

  function acceptSurrenderRequest()
  {
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    $target_leader_id = (int) self::getGameStateValue('surrender_target_leader_id');
    $leader_id = $this->requireCurrentOrBotForActiveState('surrenderLeaderResponse', (int) $target_leader_id);
    if ($bankrupt_id <= 0 || $target_leader_id !== $leader_id) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid surrender response."));
    }
    $leader_sect = $this->getPlayerSect($leader_id);

    $this->storeSurrenderAcceptanceSnapshot($bankrupt_id);
    self::DbQuery("UPDATE player SET player_role = 1, player_leader_id = $leader_id, player_sect = $leader_sect, player_is_skill_sealed = 1 WHERE player_id = $bankrupt_id");
    self::setGameStateValue('follower_id_waiting', $bankrupt_id);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);

    $this->notifyAllPlayersTr('surrenderAccepted', clienttranslate('${leader_name} accepts ${player_name}. ${leader_name} must give 1 Believer.'), array(
      'player_name' => self::getPlayerNameById($bankrupt_id),
      'leader_name' => self::getPlayerNameById($leader_id),
      'player_id' => $bankrupt_id,
      'leader_id' => $leader_id
    ));
    $this->notifyPlayerIdentitySync([(int) $bankrupt_id], 'surrender_accepted');

    $this->gamestate->nextState('leaderGiveBeliever');
  }

  function rejectSurrenderRequest()
  {
    $this->clearSurrenderAcceptanceSnapshot();
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    $target_leader_id = (int) self::getGameStateValue('surrender_target_leader_id');
    $leader_id = $this->requireCurrentOrBotForActiveState('surrenderLeaderResponse', (int) $target_leader_id);
    if ($bankrupt_id <= 0 || $target_leader_id !== $leader_id) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid surrender response."));
    }
    $this->markLeaderRejected($leader_id);
    self::setGameStateValue('surrender_target_leader_id', 0);

    $this->notifyAllPlayersTr('surrenderRejected', clienttranslate('${leader_name} rejects ${player_name}.'), array(
      'player_name' => self::getPlayerNameById($bankrupt_id),
      'leader_name' => self::getPlayerNameById($leader_id),
      'player_id' => $bankrupt_id,
      'leader_id' => $leader_id
    ));

    $available = $this->getAvailableSurrenderLeaders($bankrupt_id);
    if (empty($available)) {
      $this->doBecomeWanderer($bankrupt_id);
      self::setGameStateValue('surrender_bankrupt_id', 0);
      self::setGameStateValue('surrender_support_mode', 0);
      $this->setRejectedMask(0);
      $this->setForcedNextTurnAnchor((int) $bankrupt_id);
      $this->gamestate->nextState('nextPlayer');
      return;
    }

    // Ensure flow always returns to the bankrupt player to pick the next leader.
    self::setGameStateValue('surrender_support_mode', 0);
    self::setGameStateValue('surrender_bankrupt_id', $bankrupt_id);
    $this->gamestate->nextState('routeSurrenderBankrupt');
  }

  function giveBeliever($believer_id)
  {
    self::checkAction("giveBeliever");
    $leader_id = (int) self::getActivePlayerId();
    $follower_id = (int) self::getGameStateValue('follower_id_waiting');
    $support_mode = (int) self::getGameStateValue('surrender_support_mode');
    if ($follower_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("No Follower is waiting for a Believer."));
    }

    // Only finalized surrender acceptance should trigger Impermanence failure.
    // (Support rescue mode should not.)
    if ($support_mode === 0 && $follower_id > 0) {
      $this->failImpermanenceAndRedrawSkill((int) $leader_id, 'accept_follower');
      $this->failImpermanenceAndRedrawSkill((int) $follower_id, 'surrender');
    }

    $card = $this->believer_cards->getCard($believer_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $leader_id)
      throw new BgaVisibleSystemException(clienttranslate("You do not own this Believer card"));

    $this->believer_cards->moveCard($believer_id, 'hand', $follower_id);

    $this->notifyAllPlayersTr('giveBeliever', clienttranslate('${leader_name} gives 1 Believer to Follower ${follower_name}.'), array(
      'leader_name' => self::getActivePlayerName(),
      'follower_name' => self::getPlayerNameById($follower_id)
    ));

    if ($support_mode === 0 && $follower_id > 0) {
      $this->applySkillSealEffectsForPlayers([(int) $follower_id]);
    }

    if ($support_mode === 0 && $follower_id > 0) {
      $this->armPurpleHermitAfterSurrender((int) $follower_id, (int) $leader_id);
    }
    $this->revealAscendWithMeIfLeaderHasFollowers((int) $leader_id);

    // Keep both private hands authoritative after surrender support transfer.
    // This avoids stale UI when no dedicated giveBeliever hand notification is consumed.
    $this->notifyPlayerTr((int) $leader_id, 'syncBelieverHand', '', [
      'cards' => array_values($this->believer_cards->getCardsInLocation('hand', (int) $leader_id))
    ]);
    $this->notifyPlayerTr((int) $follower_id, 'syncBelieverHand', '', [
      'cards' => array_values($this->believer_cards->getCardsInLocation('hand', (int) $follower_id))
    ]);
    $this->notifyPublicCountsSync();

    self::setGameStateValue('follower_id_waiting', 0);
    self::setGameStateValue('surrender_bankrupt_id', 0);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);
    $this->setRejectedMask(0);
    $this->clearSurrenderAcceptanceSnapshot();
    $this->notifyPlayerIdentitySync([(int) $leader_id, (int) $follower_id], ($support_mode === 0 ? 'surrender_give_believer' : 'support_give_believer'));

    // Keep next-turn anchor on the bankrupt/follower player whose end-turn flow triggered this support/surrender.
    // Otherwise turn order can jump from helper leader and incorrectly loop back.
    $this->setForcedNextTurnAnchor((int) $follower_id);

    $this->gamestate->nextState('nextPlayer');
  }

  function cancelGiveBeliever()
  {
    self::checkAction("cancelGiveBeliever");

    $leader_id = (int) self::getActivePlayerId();
    $follower_id = (int) self::getGameStateValue('follower_id_waiting');
    $support_mode = (int) self::getGameStateValue('surrender_support_mode');
    if ($follower_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("No Follower is waiting for a Believer."));
    }

    $this->notifyAllPlayersTr(
      'giveBelieverCanceled',
      clienttranslate('${leader_name} cancels giving a Believer to ${follower_name}.'),
      [
        'leader_id' => $leader_id,
        'leader_name' => self::getPlayerNameById($leader_id),
        'follower_id' => $follower_id,
        'follower_name' => self::getPlayerNameById($follower_id),
      ]
    );

    self::setGameStateValue('follower_id_waiting', 0);

    // Support flows (follower rescue / leader replacement rescue):
    // cancel behaves like refusing support; target must continue surrender flow.
    if ($support_mode === 1 || $support_mode === 2) {
      self::setGameStateValue('surrender_support_mode', 0);
      $this->markLeaderRejected((int) $leader_id);
      $this->startSurrenderFlowFor($follower_id, false);
      return;
    }

    // Accepted surrender flow (mode 0):
    // rollback accepted role/sect change, then treat this leader as rejected.
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    if ($bankrupt_id <= 0) {
      $bankrupt_id = $follower_id;
      self::setGameStateValue('surrender_bankrupt_id', $bankrupt_id);
    }
    $this->restoreSurrenderAcceptanceSnapshot($bankrupt_id);
    $this->notifyPlayerIdentitySync([(int) $bankrupt_id], 'surrender_rollback');
    $this->markLeaderRejected($leader_id);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);

    $available = $this->getAvailableSurrenderLeaders($bankrupt_id);
    if (empty($available)) {
      $this->doBecomeWanderer($bankrupt_id);
      self::setGameStateValue('surrender_bankrupt_id', 0);
      self::setGameStateValue('surrender_support_mode', 0);
      $this->setRejectedMask(0);
      $this->clearSurrenderAcceptanceSnapshot();
      $this->setForcedNextTurnAnchor((int) $bankrupt_id);
      $this->gamestate->nextState('nextPlayer');
      return;
    }

    self::setGameStateValue('surrender_bankrupt_id', $bankrupt_id);
    $this->gamestate->nextState('routeSurrenderBankrupt');
  }

  // (Legacy playFaithWar removed, replaced by the new Sect-based multi-active method above)

  /*
   * Player action: Select a believer card for combat
   */
  function playBelieverCardCombat($card_id)
  {
    self::checkAction("playBelieverCard");
    $player_id = (int) self::getCurrentPlayerId();
    $war_type = (int) self::getGameStateValue('war_type');

    // Verify source card.
    $card = $this->believer_cards->getCard($card_id);
    if (!$card) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid Believer card"));
    }

    $is_card_from_hand = ((string) $card['location'] === 'hand' && (int) $card['location_arg'] === (int) $player_id);
    $is_card_from_discard = ((string) $card['location'] === 'discard');
    $from_graveyard = false;

    if ($war_type === 2 || $war_type === 10 || $war_type === 12) {
      $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
      $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

      if ($player_id === $attacker_rep_id) {
        if (!$is_card_from_hand) {
          $can_use_zombie = ($war_type === 2) && $is_card_from_discard && $this->canRepresentativeUseZombieFromGraveyard((int) $player_id, true);
          if ($can_use_zombie && !$this->isCardEligibleForFaithWarZombieSnapshot((array) $card)) {
            throw new BgaVisibleSystemException(clienttranslate("Zombie Army can only use graveyard Believers that were already in graveyard when Faith War started."));
          }
          if (!$can_use_zombie) {
            if ($war_type === 10) {
              throw new BgaVisibleSystemException(clienttranslate("You must choose a Believer from your hand."));
            }
            throw new BgaVisibleSystemException(clienttranslate("You must choose a Believer from your hand, or from graveyard via Zombie Army."));
          }
          $from_graveyard = true;
        }
        self::setGameStateValue('war_card_attacker', $card_id);
        $this->setWarCardSourceFlag(true, $from_graveyard);
      } elseif ($player_id === $defender_rep_id) {
        if (!$is_card_from_hand) {
          $can_use_zombie = ($war_type === 2) && $is_card_from_discard && $this->canRepresentativeUseZombieFromGraveyard((int) $player_id, false);
          if ($can_use_zombie && !$this->isCardEligibleForFaithWarZombieSnapshot((array) $card)) {
            throw new BgaVisibleSystemException(clienttranslate("Zombie Army can only use graveyard Believers that were already in graveyard when Faith War started."));
          }
          if (!$can_use_zombie) {
            if ($war_type === 10) {
              throw new BgaVisibleSystemException(clienttranslate("You must choose a Believer from your hand."));
            }
            throw new BgaVisibleSystemException(clienttranslate("You must choose a Believer from your hand, or from graveyard via Zombie Army."));
          }
          $from_graveyard = true;
        }
        self::setGameStateValue('war_card_defender', $card_id);
        $this->setWarCardSourceFlag(false, $from_graveyard);
      } else {
        // Distinguish a stale click (round already resolved / representatives
        // being reassigned) from a click by a genuine non-representative, so
        // test reports can tell which case happened.
        if ($attacker_rep_id <= 0 || $defender_rep_id <= 0) {
          throw new BgaVisibleSystemException(clienttranslate("This war round is not accepting Believers right now."));
        }
        throw new BgaVisibleSystemException(clienttranslate("Only the assigned war representatives can commit a Believer this round."));
      }

      if (!$is_card_from_hand && !$from_graveyard) {
        throw new BgaVisibleSystemException(clienttranslate("You do not own this card"));
      }
      $this->markFaithWarParticipant((int) $player_id);
    } elseif ($war_type === 3) {
      if (!$is_card_from_hand) {
        throw new BgaVisibleSystemException(clienttranslate("You do not own this card"));
      }
      $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
      $is_rep = (int) self::getUniqueValueFromDB("SELECT player_is_martyrdom_rep FROM player WHERE player_id = $player_id");
      if ($is_rep !== 1) {
        throw new BgaVisibleSystemException(clienttranslate("You are not the selected Martyrdom representative"));
      }
      if ($player_id === $attacker_rep_id) {
        if ((int) self::getGameStateValue('war_card_attacker') > 0) {
          throw new BgaVisibleSystemException(clienttranslate("Attacker representative already committed a Believer for Martyrdom"));
        }
        self::setGameStateValue('war_card_attacker', (int) $card_id);
      }
      foreach ($this->believer_cards->getCardsInLocation('cardsontable', $player_id) as $existing) {
        if ((int) $existing['id'] !== (int) self::getGameStateValue('war_card_attacker')) {
          throw new BgaVisibleSystemException(clienttranslate("You already committed a Believer for Martyrdom"));
        }
      }
    } elseif ($war_type === 6) {
      if (!$is_card_from_hand) {
        throw new BgaVisibleSystemException(clienttranslate("You do not own this card"));
      }
      $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
      $is_rep = (int) self::getUniqueValueFromDB("SELECT player_is_conspiracy_rep FROM player WHERE player_id = $player_id");
      if ($is_rep !== 1) {
        throw new BgaVisibleSystemException(clienttranslate("You are not the selected Conspiracy representative"));
      }
      if ($player_id === $attacker_rep_id) {
        if ((int) self::getGameStateValue('war_card_attacker') > 0) {
          throw new BgaVisibleSystemException(clienttranslate("Attacker representative already committed a Believer for Conspiracy"));
        }
        self::setGameStateValue('war_card_attacker', (int) $card_id);
      }
      foreach ($this->believer_cards->getCardsInLocation('cardsontable', $player_id) as $existing) {
        if ((int) $existing['id'] !== (int) self::getGameStateValue('war_card_attacker')) {
          throw new BgaVisibleSystemException(clienttranslate("You already committed a Believer for Conspiracy"));
        }
      }
    } elseif ($war_type === 11) {
      if (!$is_card_from_hand) {
        throw new BgaVisibleSystemException(clienttranslate("You do not own this card"));
      }
      $contenders = $this->getFinalConspiracyContenders();
      if (!in_array((int) $player_id, $contenders, true)) {
        throw new BgaVisibleSystemException(clienttranslate("You are not part of this Final Struggle"));
      }
      $attacker_now = (int) self::getGameStateValue('war_attacker_id');
      if ($player_id === $attacker_now) {
        if ((int) self::getGameStateValue('war_card_attacker') > 0) {
          throw new BgaVisibleSystemException(clienttranslate("Attacker already committed a Believer for Final Struggle"));
        }
        self::setGameStateValue('war_card_attacker', (int) $card_id);
      }
      foreach ($this->believer_cards->getCardsInLocation('cardsontable', $player_id) as $existing) {
        if ((int) $existing['id'] !== (int) self::getGameStateValue('war_card_attacker')) {
          throw new BgaVisibleSystemException(clienttranslate("You already committed a Believer for this Final Struggle round"));
        }
      }
    } elseif ($war_type === 7) {
      if (!$is_card_from_hand) {
        throw new BgaVisibleSystemException(clienttranslate("You do not own this card"));
      }
      $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
      $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');
      if ($player_id === $attacker_rep_id) {
        if ((int) self::getGameStateValue('war_card_attacker') > 0) {
          throw new BgaVisibleSystemException(clienttranslate("You already committed your Believer for this Faith Debate round."));
        }
        self::setGameStateValue('war_card_attacker', $card_id);
      } elseif ($player_id === $defender_rep_id) {
        if ((int) self::getGameStateValue('war_card_defender') > 0) {
          throw new BgaVisibleSystemException(clienttranslate("You already committed your Believer for this Faith Debate round."));
        }
        self::setGameStateValue('war_card_defender', $card_id);
      } else {
        throw new BgaVisibleSystemException(clienttranslate("You are not the selected Faith Debate representative"));
      }
    } else {
      throw new BgaVisibleSystemException(clienttranslate("This confrontation action is not available right now"));
    }

    $this->believer_cards->moveCard($card_id, 'cardsontable', $player_id);

    if ($war_type === 3) {
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
      if ((int) $player_id === (int) $attacker_rep_id) {
        $this->notifyAllPlayersTr('martyrdomAttackerCommitted', '', array(
          'player_id' => $player_id,
          'attacker_id' => $attacker_id,
          'player_name' => self::getPlayerNameById($player_id),
          'card_id' => $card_id,
          'card_type' => $card['type'],
          'sect_id' => (int) $this->getPlayerSect((int) $player_id),
          'is_attacker_representative' => 1
        ));
      } else {
        $this->notifyAllPlayersTr('martyrdomBelieverCommitted', '', array(
          'player_id' => $player_id,
          'attacker_id' => $attacker_id,
          'player_name' => self::getPlayerNameById($player_id),
          'card_id' => $card_id,
          'card_type' => $card['type'],
          'sect_id' => (int) $this->getPlayerSect((int) $player_id),
          'is_attacker_representative' => 0
        ));
      }
    } elseif ($war_type === 6 || $war_type === 11) {
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
      $this->notifyAllPlayersTr('conspiracyBelieverCommitted', '', array(
        'player_id' => $player_id,
        'attacker_id' => $attacker_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => $card_id,
        'card_type' => $card['type'],
        'sect_id' => (int) $this->getPlayerSect((int) $player_id),
        'is_attacker_representative' => ((int) $player_id === (int) $attacker_rep_id) ? 1 : 0
      ));
    } elseif ($war_type === 7) {
      $this->notifyAllPlayersTr('faithDebateCardPlayed', '', array(
        'player_id' => $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => $card_id,
        'card_type' => $card['type']
      ));
    } else {
      $this->notifyAllPlayersTr('faithWarCardPlayed', '', array(
        'player_id' => $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => $card_id,
        'card_type' => $card['type'],
        'from_graveyard' => $from_graveyard ? 1 : 0,
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst()
      ));
    }

    // Mark player as done for this duel round.
    // Let the framework advance only after all required players have responded.
    $transition = 'nextStep';
    if ($war_type === 2 || $war_type === 10 || $war_type === 12) $transition = 'nextDuelStep';
    if ($war_type === 7) $transition = 'nextDebateStep';
    if ($war_type === 11) $transition = 'nextStep';
    if ($war_type === 3 || $war_type === 6) {
      // The representative's believer is committed: this sect's defense
      // window closes now, so release any waiting defense-card holders.
      $this->releaseSameSectActivePlayers(
        (int) $this->getPlayerSect((int) $player_id),
        (int) $player_id,
        $transition
      );
    }
    $this->gamestate->setPlayerNonMultiactive($player_id, $transition);
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Game state actions
  ////////////

  function stFaithWarDuel()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $war_type = (int) self::getGameStateValue('war_type');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

    if ($war_type === 10) {
      if ($attacker_rep_id <= 0) {
        $attacker_rep_id = (int) $attacker_id;
        self::setGameStateValue('war_rep_attacker_id', (int) $attacker_rep_id);
      }
      if ($defender_rep_id <= 0) {
        $defender_rep_id = (int) $defender_id;
        self::setGameStateValue('war_rep_defender_id', (int) $defender_rep_id);
      }

      $count_a = (int) $this->believer_cards->countCardInLocation('hand', (int) $attacker_id);
      $count_b = (int) $this->believer_cards->countCardInLocation('hand', (int) $defender_id);
      if ($count_a <= 0 || $count_b <= 0) {
        if ($count_a <= 0 && $count_b <= 0 && $this->startFinalInfiniteWar((int) $attacker_id, (int) $defender_id)) {
          $count_a = (int) $this->believer_cards->countCardInLocation('hand', (int) $attacker_id);
          $count_b = (int) $this->believer_cards->countCardInLocation('hand', (int) $defender_id);
        }
      }
      if ($count_a <= 0 || $count_b <= 0) {
        $this->finalizeFinalStruggle((int) $attacker_id, (int) $defender_id, true);
        return;
      }

      $round = (int) self::getGameStateValue('debate_round') + 1;
      self::setGameStateValue('debate_round', (int) $round);
      $this->gamestate->setPlayersMultiactive([$attacker_rep_id, $defender_rep_id], 'nextDuelStep');

      self::setGameStateValue('war_card_attacker', 0);
      self::setGameStateValue('war_card_defender', 0);
      $this->clearWarCardSourceFlags();

      $this->notifyAllPlayersTr('faithWarRound', clienttranslate('Final War round ${round}: each contender selects one Believer.'), [
        'round' => (int) $round,
        'final_struggle' => 1,
        'attacker_id' => (int) $attacker_id,
        'defender_id' => (int) $defender_id,
        'attacker_sect' => (int) $attacker_sect,
        'defender_sect' => (int) $defender_sect,
        'attacker_rep_id' => (int) $attacker_rep_id,
        'defender_rep_id' => (int) $defender_rep_id,
        'attacker_rep_name' => self::getPlayerNameById((int) $attacker_rep_id),
        'defender_rep_name' => self::getPlayerNameById((int) $defender_rep_id),
        'attacker_name' => self::getPlayerNameById((int) $attacker_id),
        'defender_name' => self::getPlayerNameById((int) $defender_id),
        'zombie_owner_id' => 0,
        'war_zombie_snapshot_max_discard_arg' => 0
      ]);
      $this->runPracticeAiForCurrentStateIfNeeded();
      return;
    }

    // Safety net (regular Faith War round loop): if either Sect can no longer
    // field a Believer, end the war here instead of asking a depleted
    // representative to commit — otherwise a player with 0 Believers is told to
    // "choose a Believer" with nothing to choose and the table deadlocks.
    // (war_type 10 final struggle is handled above with its own count check.)
    $attacker_available = $this->getFaithWarAvailableBelieversForSect((int) $attacker_sect);
    $defender_available = $this->getFaithWarAvailableBelieversForSect((int) $defender_sect);
    if ($attacker_available <= 0 || $defender_available <= 0) {
      if ($war_type === 12) {
        $this->finalizeFaithWar($attacker_id, $defender_id, $attacker_sect, $defender_sect, true);
      } else {
        $this->endFaithWarForDepletedSect((int) $attacker_sect, (int) $defender_sect, (int) $attacker_available, (int) $defender_available);
      }
      return;
    }

    // The sect still has Believers, but the CURRENT representative may have run
    // out (multi-member sect: another member still holds Believers). Drop a
    // depleted representative so the auto-assign below picks a combat-ready one,
    // otherwise a 0-Believer rep is asked to commit and the round deadlocks.
    $attacker_ready = array_map('intval', $this->getFaithWarCombatReadyPlayerIds((int) $attacker_sect));
    if ($attacker_rep_id > 0 && !in_array((int) $attacker_rep_id, $attacker_ready, true)) {
      $attacker_rep_id = 0;
      self::setGameStateValue('war_rep_attacker_id', 0);
    }
    $defender_ready = array_map('intval', $this->getFaithWarCombatReadyPlayerIds((int) $defender_sect));
    if ($defender_rep_id > 0 && !in_array((int) $defender_rep_id, $defender_ready, true)) {
      $defender_rep_id = 0;
      self::setGameStateValue('war_rep_defender_id', 0);
    }

    // Safety: if a leader timed out/disconnected and did not assign,
    // auto-assign one combat-ready representative for that sect.
    if ($attacker_rep_id <= 0) {
      $attacker_choices = $this->getFaithWarCombatReadyPlayerIds($attacker_sect);
      if (!empty($attacker_choices)) {
        $attacker_rep_id = (int) $attacker_choices[bga_rand(0, count($attacker_choices) - 1)];
        self::setGameStateValue('war_rep_attacker_id', $attacker_rep_id);
        $attacker_leader = $this->getSectLeaderId($attacker_sect, $attacker_id);
        $this->notifyAllPlayersTr('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their Sect.'), [
          'leader_id' => $attacker_leader,
          'leader_name' => self::getPlayerNameById($attacker_leader),
          'representative_id' => $attacker_rep_id,
          'representative_name' => self::getPlayerNameById($attacker_rep_id),
          'auto_assigned' => 1
        ]);
        $this->notifyPlayerTr($attacker_rep_id, 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
          'leader_id' => $attacker_leader,
          'leader_name' => self::getPlayerNameById($attacker_leader),
          'representative_id' => $attacker_rep_id,
          'auto_assigned' => 1
        ]);
      }
    }

    if ($defender_rep_id <= 0) {
      $defender_choices = $this->getFaithWarCombatReadyPlayerIds($defender_sect);
      if (!empty($defender_choices)) {
        $defender_rep_id = (int) $defender_choices[bga_rand(0, count($defender_choices) - 1)];
        self::setGameStateValue('war_rep_defender_id', $defender_rep_id);
        $defender_leader = $this->getSectLeaderId($defender_sect, $defender_id);
        $this->notifyAllPlayersTr('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their Sect.'), [
          'leader_id' => $defender_leader,
          'leader_name' => self::getPlayerNameById($defender_leader),
          'representative_id' => $defender_rep_id,
          'representative_name' => self::getPlayerNameById($defender_rep_id),
          'auto_assigned' => 1
        ]);
        $this->notifyPlayerTr($defender_rep_id, 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
          'leader_id' => $defender_leader,
          'leader_name' => self::getPlayerNameById($defender_leader),
          'representative_id' => $defender_rep_id,
          'auto_assigned' => 1
        ]);
      }
    }

    if ($attacker_rep_id <= 0 || $defender_rep_id <= 0) {
      $this->finalizeFaithWar($attacker_id, $defender_id, $attacker_sect, $defender_sect, true);
      return;
    }

    $this->gamestate->setPlayersMultiactive([$attacker_rep_id, $defender_rep_id], 'nextDuelStep');

    // Reset card choices for this round
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    $this->clearWarCardSourceFlags();

    $this->notifyAllPlayersTr('faithWarRound', clienttranslate('Faith War Round: each chosen representative selects one Believer.'), [
      'attacker_id' => $attacker_id,
      'defender_id' => $defender_id,
      'attacker_sect' => $attacker_sect,
      'defender_sect' => $defender_sect,
      'attacker_rep_id' => $attacker_rep_id,
      'defender_rep_id' => $defender_rep_id,
      'attacker_rep_name' => self::getPlayerNameById($attacker_rep_id),
      'defender_rep_name' => self::getPlayerNameById($defender_rep_id),
      'attacker_name' => self::getPlayerNameById($attacker_id),
      'defender_name' => self::getPlayerNameById($defender_id),
      'zombie_owner_id' => (int) self::getGameStateValue('war_zombie_owner_id'),
      'war_zombie_snapshot_max_discard_arg' => (int) self::getGameStateValue('war_zombie_snapshot_max_discard_arg')
    ]);
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function stResolveDuel()
  {
    $attacker_id = self::getGameStateValue('war_attacker_id');
    $defender_id = self::getGameStateValue('war_defender_id');
    $war_type = (int) self::getGameStateValue('war_type');
    $is_final_struggle = ($war_type === 10);
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

    $card_a_id = self::getGameStateValue('war_card_attacker');
    $card_b_id = self::getGameStateValue('war_card_defender');
    if ($card_a_id == 0 || $card_b_id == 0) {
      // Safety: never stall in game-state resolve. End this war early instead
      // of blocking the table when a representative did not submit a believer.
      // Zombie representatives auto-submit in zombieTurn(); do not auto-submit
      // here, because this resolve state must not play cards for living players.
      if ($is_final_struggle) {
        $this->finalizeFinalStruggle((int) $attacker_id, (int) $defender_id, true);
        return;
      }
      $this->finalizeFaithWar($attacker_id, $defender_id, $attacker_sect, $defender_sect, true);
      return;
    }

    $card_a = $this->believer_cards->getCard($card_a_id);
    $card_b = $this->believer_cards->getCard($card_b_id);
    // Ownership/result identity for this round must follow assigned representatives,
    // not leader identity or historical card location metadata.
    $attacker_player_id = ($attacker_rep_id > 0) ? (int) $attacker_rep_id : (int) $card_a['location_arg'];
    $defender_player_id = ($defender_rep_id > 0) ? (int) $defender_rep_id : (int) $card_b['location_arg'];
    $attacker_from_grave = $this->getWarCardSourceFlag(true);
    $defender_from_grave = $this->getWarCardSourceFlag(false);
    $result_type = 'draw';

    // --- Combat Logic ---
    $result = $is_final_struggle
      ? $this->compareBelievers((int) $card_a['type'], (int) $card_b['type'], false)
      : $this->getCurrentCombatComparisonResult((int) $card_a['type'], (int) $card_b['type'], true); // true = is faith war

    if ($result['winner'] == 1) {
      $result_type = 'attacker';
      if ($defender_from_grave) {
        $this->believer_cards->moveCard($card_b_id, 'removed');
      } else {
        $this->moveBelieverCardToDiscardWithOwnerMeta((int) $card_b_id, (int) $defender_player_id);
        $this->rememberHolyRebirthRoundDeathBurst((int) $defender_player_id, 1);
      }
      if ($attacker_from_grave) {
        $this->believer_cards->moveCard($card_a_id, 'removed');
      } else {
        $this->believer_cards->moveCard($card_a_id, 'warused', $attacker_player_id);
      }

      $this->notifyAllPlayersTr('duelResult', clienttranslate('${winner_name} wins! ${loser_name}\'s Believer dies.'), [
        'winner_name' => self::getPlayerNameById($attacker_player_id),
        'loser_name' => self::getPlayerNameById($defender_player_id),
        'winner_id' => $attacker_player_id,
        'loser_id' => $defender_player_id,
        'attacker_id' => $attacker_player_id,
        'defender_id' => $defender_player_id,
        'attacker_name' => self::getPlayerNameById($attacker_player_id),
        'defender_name' => self::getPlayerNameById($defender_player_id),
        'result_type' => 'attacker',
        'result_bonus' => ((int) $result['bonus']) ? 1 : 0,
        'dead_count' => $defender_from_grave ? 0 : 1,
        'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'card_a' => $card_a,
        'card_b' => $card_b,
        'attacker_sect' => $attacker_sect,
        'defender_sect' => $defender_sect,
        'attacker_from_graveyard' => $attacker_from_grave ? 1 : 0,
        'defender_from_graveyard' => $defender_from_grave ? 1 : 0,
        'reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
        'reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
        'reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds()
      ]);

      if (!$is_final_struggle && $result['bonus']) {
        $bonus_card = $this->believer_cards->pickCardForLocation('deck', 'warbonus', $attacker_player_id);
        if ($bonus_card) {
          $this->notifyAllPlayersTr('duelBonus', clienttranslate('${player_name} gets a War Bonus (Crushing Victory)!'), [
            'player_name' => self::getPlayerNameById($attacker_player_id),
            'player_id' => $attacker_player_id,
            'card' => $bonus_card,
            'delayed_until_war_end' => true,
            'deck_empty' => 0
          ]);
        } else {
          $this->notifyAllPlayersTr('duelBonus', clienttranslate('${player_name} triggers War Bonus (Crushing Victory), but it cannot grant an extra Believer because the Believer deck is empty.'), [
            'player_name' => self::getPlayerNameById($attacker_player_id),
            'player_id' => $attacker_player_id,
            'card' => null,
            'delayed_until_war_end' => false,
            'deck_empty' => 1
          ]);
        }
      }
    } elseif ($result['winner'] == -1) {
      $result_type = 'defender';
      if ($attacker_from_grave) {
        $this->believer_cards->moveCard($card_a_id, 'removed');
      } else {
        $this->moveBelieverCardToDiscardWithOwnerMeta((int) $card_a_id, (int) $attacker_player_id);
        $this->rememberHolyRebirthRoundDeathBurst((int) $attacker_player_id, 1);
      }
      if ($defender_from_grave) {
        $this->believer_cards->moveCard($card_b_id, 'removed');
      } else {
        $this->believer_cards->moveCard($card_b_id, 'warused', $defender_player_id);
      }

      $this->notifyAllPlayersTr('duelResult', clienttranslate('${winner_name} wins! ${loser_name}\'s Believer dies.'), [
        'winner_name' => self::getPlayerNameById($defender_player_id),
        'loser_name' => self::getPlayerNameById($attacker_player_id),
        'winner_id' => $defender_player_id,
        'loser_id' => $attacker_player_id,
        'attacker_id' => $attacker_player_id,
        'defender_id' => $defender_player_id,
        'attacker_name' => self::getPlayerNameById($attacker_player_id),
        'defender_name' => self::getPlayerNameById($defender_player_id),
        'result_type' => 'defender',
        'result_bonus' => ((int) $result['bonus']) ? 1 : 0,
        'dead_count' => $attacker_from_grave ? 0 : 1,
        'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'card_a' => $card_a,
        'card_b' => $card_b,
        'attacker_sect' => $attacker_sect,
        'defender_sect' => $defender_sect,
        'attacker_from_graveyard' => $attacker_from_grave ? 1 : 0,
        'defender_from_graveyard' => $defender_from_grave ? 1 : 0,
        'reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
        'reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
        'reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds()
      ]);

      if (!$is_final_struggle && $result['bonus']) {
        $bonus_card = $this->believer_cards->pickCardForLocation('deck', 'warbonus', $defender_player_id);
        if ($bonus_card) {
          $this->notifyAllPlayersTr('duelBonus', clienttranslate('${player_name} gets a War Bonus (Crushing Victory)!'), [
            'player_name' => self::getPlayerNameById($defender_player_id),
            'player_id' => $defender_player_id,
            'card' => $bonus_card,
            'delayed_until_war_end' => true,
            'deck_empty' => 0
          ]);
        } else {
          $this->notifyAllPlayersTr('duelBonus', clienttranslate('${player_name} triggers War Bonus (Crushing Victory), but it cannot grant an extra Believer because the Believer deck is empty.'), [
            'player_name' => self::getPlayerNameById($defender_player_id),
            'player_id' => $defender_player_id,
            'card' => null,
            'delayed_until_war_end' => false,
            'deck_empty' => 1
          ]);
        }
      }
    } else {
      $dead_count = 0;
      if ($attacker_from_grave) {
        $this->believer_cards->moveCard($card_a_id, 'removed');
      } else {
        $this->moveBelieverCardToDiscardWithOwnerMeta((int) $card_a_id, (int) $attacker_player_id);
        $this->rememberHolyRebirthRoundDeathBurst((int) $attacker_player_id, 1);
        $dead_count += 1;
      }
      if ($defender_from_grave) {
        $this->believer_cards->moveCard($card_b_id, 'removed');
      } else {
        $this->moveBelieverCardToDiscardWithOwnerMeta((int) $card_b_id, (int) $defender_player_id);
        $this->rememberHolyRebirthRoundDeathBurst((int) $defender_player_id, 1);
        $dead_count += 1;
      }

      $this->notifyAllPlayersTr('duelResult', clienttranslate('It\'s a DRAW! Both Believers die.'), [
        'attacker_id' => $attacker_player_id,
        'defender_id' => $defender_player_id,
        'attacker_name' => self::getPlayerNameById($attacker_player_id),
        'defender_name' => self::getPlayerNameById($defender_player_id),
        'result_type' => 'draw',
        'result_bonus' => 0,
        'dead_count' => (int) $dead_count,
        'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'card_a' => $card_a,
        'card_b' => $card_b,
        'attacker_sect' => $attacker_sect,
        'defender_sect' => $defender_sect,
        'attacker_from_graveyard' => $attacker_from_grave ? 1 : 0,
        'defender_from_graveyard' => $defender_from_grave ? 1 : 0,
        'reverse_karma_active' => (int) self::getGameStateValue('war_reverse_karma_active'),
        'reverse_karma_owner_id' => (int) self::getGameStateValue('war_reverse_karma_owner_id'),
        'reverse_karma_stack_owner_ids' => $this->getReverseKarmaStackOwnerIds()
      ]);
    }
    $this->notifyCombatRoundHistory(
      'faith_war',
      (string) $result_type,
      (int) $attacker_player_id,
      (int) $defender_player_id,
      (int) $card_a['type'],
      (int) $card_b['type']
    );

    // Faith War ends when one side has no more available combat believers.
    if ($is_final_struggle) {
      $count_a = (int) $this->believer_cards->countCardInLocation('hand', (int) $attacker_id);
      $count_b = (int) $this->believer_cards->countCardInLocation('hand', (int) $defender_id);
      if ($count_a == 0 && $count_b == 0 && $this->startFinalInfiniteWar((int) $attacker_id, (int) $defender_id)) {
        $this->gamestate->nextState('nextFinalStruggleRound');
        return;
      }
      if ($count_a == 0 || $count_b == 0) {
        $this->finalizeFinalStruggle((int) $attacker_id, (int) $defender_id, false);
      } else {
        $this->notifyPublicCountsSync();
        $this->gamestate->nextState('nextFinalStruggleRound');
      }
    } else {
      $count_a = $this->getFaithWarAvailableBelieversForSect($attacker_sect);
      $count_b = $this->getFaithWarAvailableBelieversForSect($defender_sect);

      if ($count_a == 0 || $count_b == 0) {
        $this->finalizeFaithWar($attacker_id, $defender_id, $attacker_sect, $defender_sect, false);
      } else {
        $this->notifyPublicCountsSync();
        $this->gamestate->nextState('nextDuelRound');
      }
    }
  }

  private function autoCommitFaithWarBelieverForRepresentative(int $representative_id, bool $is_attacker): ?array
  {
    $from_graveyard = false;
    $hand_cards = array_values($this->believer_cards->getCardsInLocation('hand', $representative_id));
    if (!empty($hand_cards)) {
      $pick_index = bga_rand(0, count($hand_cards) - 1);
      $card = $hand_cards[$pick_index];
    } else {
      $can_use_grave = $this->canRepresentativeUseZombieFromGraveyard((int) $representative_id, $is_attacker);
      if (!$can_use_grave) {
        return null;
      }
      $grave_cards = $this->getFaithWarZombieSnapshotDiscardCards();
      if (empty($grave_cards)) {
        return null;
      }
      $pick_index = bga_rand(0, count($grave_cards) - 1);
      $card = $grave_cards[$pick_index];
      $from_graveyard = true;
    }
    $card_id = (int) $card['id'];

    $this->believer_cards->moveCard($card_id, 'cardsontable', $representative_id);
    if ($is_attacker) {
      self::setGameStateValue('war_card_attacker', $card_id);
      $this->setWarCardSourceFlag(true, $from_graveyard);
    } else {
      self::setGameStateValue('war_card_defender', $card_id);
      $this->setWarCardSourceFlag(false, $from_graveyard);
    }
    $this->markFaithWarParticipant((int) $representative_id);

    $this->notifyAllPlayersTr('faithWarCardPlayed', '', array(
      'player_id' => $representative_id,
      'player_name' => self::getPlayerNameById($representative_id),
      'card_id' => $card_id,
      'card_type' => (int) $card['type'],
      'auto_played' => 1,
      'from_graveyard' => $from_graveyard ? 1 : 0,
      'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
      'graveyard_cards' => $this->getGraveyardCardsNewestFirst()
    ));

    return $card;
  }

  private function clearWarBattleStateForFinalization(): void
  {
    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('debate_round', 0);
    $this->clearFaithWarParticipants();
    $this->clearCombatSkillState();
    $this->clearWarCardSourceFlags();
  }

  private function getCurrentStateSnapshotSafe(): array
  {
    if (method_exists($this->gamestate, 'getCurrentMainState')) {
      try {
        $stateObj = $this->gamestate->getCurrentMainState();
        if (is_array($stateObj)) {
          return $stateObj;
        }
        if (is_object($stateObj)) {
          if (method_exists($stateObj, 'toArray')) {
            $arr = $stateObj->toArray();
            if (is_array($arr)) {
              return $arr;
            }
          }
          $snapshot = [];
          if (property_exists($stateObj, 'name')) {
            $snapshot['name'] = (string) $stateObj->name;
          }
          if (property_exists($stateObj, 'type')) {
            $snapshot['type'] = (string) $stateObj->type;
          }
          if (!empty($snapshot)) {
            return $snapshot;
          }
        }
      } catch (\Throwable $e) {
        // Fall through to per-player accessor.
      }
    }

    if (method_exists($this->gamestate, 'getCurrentState')) {
      try {
        $player_id = (int) self::getActivePlayerId();
        if ($player_id > 0) {
          $stateObj = $this->gamestate->getCurrentState((int) $player_id);
          if (is_array($stateObj)) {
            return $stateObj;
          }
          if (is_object($stateObj) && method_exists($stateObj, 'toArray')) {
            $arr = $stateObj->toArray();
            if (is_array($arr)) {
              return $arr;
            }
          }
        }
      } catch (\Throwable $e) {
        // Ignore and return empty snapshot below.
      }
    }
    return [];
  }

  private function getCurrentStateNameSafe(): string
  {
    $state = $this->getCurrentStateSnapshotSafe();
    return isset($state['name']) ? (string) $state['name'] : '';
  }

  private function continueFinalSectWarRound(): void
  {
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    $this->clearWarCardSourceFlags();
    $this->clearFaithWarParticipants();
    $this->notifyAllPlayersTr('finalStruggleEnd', clienttranslate('Final War remains tied. Another round begins.'), []);
    $this->notifyPublicCountsSync();

    $state_name = $this->getCurrentStateNameSafe();
    if ($state_name === 'resolveDuel') {
      $this->gamestate->nextState('nextDuelRound');
      return;
    }
    if ($state_name === 'chooseWarRepresentative') {
      $this->gamestate->nextState('chooseDone');
      return;
    }
    if ($state_name === 'faithWarDuel') {
      $this->gamestate->nextState('nextDuelStep');
      return;
    }
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  private function startLeaderInfiniteFinalWarFromSectTie(int $leader_a, int $leader_b): bool
  {
    $leader_a = (int) $leader_a;
    $leader_b = (int) $leader_b;
    if ($leader_a <= 0 || $leader_b <= 0 || $leader_a === $leader_b) return false;
    if (!$this->startFinalInfiniteWar((int) $leader_a, (int) $leader_b)) return false;

    $this->captureFinalDuelSummarySnapshot((int) $leader_a, (int) $leader_b);
    self::setGameStateValue('war_attacker_id', (int) $leader_a);
    self::setGameStateValue('war_defender_id', (int) $leader_b);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 10); // switch to 1v1 infinite final war
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', (int) $leader_a);
    self::setGameStateValue('war_rep_defender_id', (int) $leader_b);
    self::setGameStateValue('debate_round', 0);
    $this->clearFaithWarParticipants();
    $this->clearCombatSkillState();
    $this->clearWarCardSourceFlags();
    return true;
  }

  private function concludeFinalSectWarWinner(int $winning_sect, int $anchor_player_id, int $attacker_sect, int $defender_sect, int $count_a, int $count_b, bool $is_incomplete): void
  {
    $winner_id = (int) $this->getSectInternalWinnerByBelievers((int) $winning_sect, (int) $anchor_player_id);
    if ($winner_id <= 0) {
      $fallback_members = array_values(array_map('intval', $this->getSectPlayerIds((int) $winning_sect)));
      if (!empty($fallback_members)) {
        $winner_id = (int) $fallback_members[0];
      }
    }
    if ($winner_id <= 0) {
      $players = array_values(array_map('intval', array_keys(self::loadPlayersBasicInfos())));
      $winner_id = (int) ($players[0] ?? 0);
    }

    $this->clearWarBattleStateForFinalization();
    $this->notifyAllPlayersTr(
      'finalStruggleEnd',
      $is_incomplete
        ? clienttranslate('Final War ends early.')
        : clienttranslate('Final War ends.'),
      [
        'attacker_sect' => (int) $attacker_sect,
        'defender_sect' => (int) $defender_sect,
        'attacker_sect_name' => (string) $this->getSectDisplayName((int) $attacker_sect),
        'defender_sect_name' => (string) $this->getSectDisplayName((int) $defender_sect),
        'attacker_remaining' => (int) $count_a,
        'defender_remaining' => (int) $count_b,
        'winner_id' => (int) $winner_id,
        'winner_name' => self::getPlayerNameById((int) $winner_id)
      ]
    );
    $this->notifyPublicCountsSync();
    $this->concludeGameWithWinner((int) $winner_id, 'final_struggle');
  }

  // Shared round-start war end when a Sect can no longer field a Believer.
  // Used by both the representative-choice and duel round-start guards so a
  // depleted side never gets asked to commit a Believer (which deadlocks).
  // Uses the 'endWar' transition (-> playerTurn), available in both states.
  private function endFaithWarForDepletedSect(int $attacker_sect, int $defender_sect, int $attacker_remaining, int $defender_remaining): void
  {
    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    $this->clearCombatSkillState();
    $this->notifyAllPlayersTr('faithWarEnd', clienttranslate('Faith War ended. One side has no Believers available to continue.'), [
      'attacker_sect' => (int) $attacker_sect,
      'defender_sect' => (int) $defender_sect,
      'attacker_remaining' => (int) $attacker_remaining,
      'defender_remaining' => (int) $defender_remaining
    ]);
    $this->gamestate->nextState('endWar');
  }

  private function finalizeFaithWar(int $attacker_id, int $defender_id, int $attacker_sect, int $defender_sect, bool $is_incomplete): void
  {
    $war_type = (int) self::getGameStateValue('war_type');
    $pending_bonus_by_player = [];
    $pending_bonus_cards = $this->believer_cards->getCardsInLocation('warbonus');
    foreach ($pending_bonus_cards as $bonus_card) {
      $pending_owner = (int) $bonus_card['location_arg'];
      if (!isset($pending_bonus_by_player[$pending_owner])) {
        $pending_bonus_by_player[$pending_owner] = [];
      }
      $pending_bonus_by_player[$pending_owner][] = $bonus_card;
    }

    foreach ($pending_bonus_by_player as $bonus_owner => $bonus_cards) {
      $this->believer_cards->moveCards(array_map(function ($card) {
        return $card['id'];
      }, $bonus_cards), 'hand', $bonus_owner);
      $this->notifyPlayerTr($bonus_owner, 'newBelievers', '', ['cards' => $bonus_cards]);
    }

    $used_war_believers = $this->believer_cards->getCardsInLocation('warused');
    $used_by_player = [];
    foreach ($used_war_believers as $used_card) {
      $used_owner = (int) $used_card['location_arg'];
      if (!isset($used_by_player[$used_owner])) {
        $used_by_player[$used_owner] = [];
      }
      $used_by_player[$used_owner][] = $used_card;
    }
    foreach ($used_by_player as $used_owner => $used_cards) {
      $used_ids = array_map(function ($card) {
        return $card['id'];
      }, $used_cards);
      $this->believer_cards->moveCards($used_ids, 'hand', $used_owner);
      $this->notifyPlayerTr($used_owner, 'newBelievers', '', ['cards' => array_values($used_cards)]);
    }

    $faith_war_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'faith_war';
    });
    if (!empty($faith_war_cards)) {
      $this->action_cards->moveCards(array_keys($faith_war_cards), 'discard');
    }

    $count_a = $this->getFaithWarAvailableBelieversForSect($attacker_sect);
    $count_b = $this->getFaithWarAvailableBelieversForSect($defender_sect);
    $attacker_participant_names = $this->getFaithWarParticipantNamesForSect((int) $attacker_sect);
    $defender_participant_names = $this->getFaithWarParticipantNamesForSect((int) $defender_sect);
    $attacker_participants_text = empty($attacker_participant_names) ? '-' : implode(', ', $attacker_participant_names);
    $defender_participants_text = empty($defender_participant_names) ? '-' : implode(', ', $defender_participant_names);
    $attacker_sect_name = $this->getSectDisplayName((int) $attacker_sect);
    $defender_sect_name = $this->getSectDisplayName((int) $defender_sect);

    if ((int) $war_type === 12) {
      // Final War Sect-vs-Sect special resolution:
      // - compare Sect totals after war
      // - if one Sect leads, decide winner inside that Sect (Leader/Follower by Believer count)
      // - if tied and both empty, leaders enter Infinite Final War (3 random each)
      // - if tied with cards remaining (rare/incomplete), continue another round
      if ($count_a > $count_b) {
        $this->concludeFinalSectWarWinner((int) $attacker_sect, (int) $attacker_id, (int) $attacker_sect, (int) $defender_sect, (int) $count_a, (int) $count_b, (bool) $is_incomplete);
        return;
      }
      if ($count_b > $count_a) {
        $this->concludeFinalSectWarWinner((int) $defender_sect, (int) $defender_id, (int) $attacker_sect, (int) $defender_sect, (int) $count_a, (int) $count_b, (bool) $is_incomplete);
        return;
      }

      if ($count_a <= 0 && $count_b <= 0) {
        $leader_a = (int) $this->getSectLeaderId((int) $attacker_sect, (int) $attacker_id);
        $leader_b = (int) $this->getSectLeaderId((int) $defender_sect, (int) $defender_id);
        if ($this->startLeaderInfiniteFinalWarFromSectTie((int) $leader_a, (int) $leader_b)) {
          $this->notifyAllPlayersTr(
            'finalStruggleEnd',
            clienttranslate('Final War is tied. Leaders enter Infinite Final War.'),
            [
              'attacker_sect' => (int) $attacker_sect,
              'defender_sect' => (int) $defender_sect,
              'leader_a_id' => (int) $leader_a,
              'leader_b_id' => (int) $leader_b,
              'leader_a_name' => self::getPlayerNameById((int) $leader_a),
              'leader_b_name' => self::getPlayerNameById((int) $leader_b)
            ]
          );
          $this->notifyPublicCountsSync();
          $state_name = $this->getCurrentStateNameSafe();
          if ($state_name === 'resolveDuel') {
            $this->gamestate->nextState('nextFinalStruggleRound');
          } elseif ($state_name === 'chooseWarRepresentative') {
            $this->gamestate->nextState('chooseDone');
          } else {
            $this->gamestate->nextState('endHand');
          }
          return;
        }

        $fallback_winner = 0;
        if ($leader_a > 0 && $leader_b > 0 && $leader_a !== $leader_b) {
          $fallback_winner = (int) $this->resolveFinalWarTieBetweenTwo((int) $leader_a, (int) $leader_b);
        } elseif ($leader_a > 0) {
          $fallback_winner = (int) $leader_a;
        } elseif ($leader_b > 0) {
          $fallback_winner = (int) $leader_b;
        }
        if ($fallback_winner <= 0) {
          $fallback_players = array_values(array_map('intval', array_keys(self::loadPlayersBasicInfos())));
          $fallback_winner = (int) ($fallback_players[0] ?? 0);
        }
        $this->clearWarBattleStateForFinalization();
        $this->notifyPublicCountsSync();
        $this->concludeGameWithWinner((int) $fallback_winner, 'final_struggle');
        return;
      }

      $this->continueFinalSectWarRound();
      return;
    }

    $this->clearWarBattleStateForFinalization();

    $message = $is_incomplete
      ? clienttranslate('Faith War could not continue because a representative Believer was missing.')
      : clienttranslate('Faith War ended. One side has no Believers available to continue.');

    $this->notifyAllPlayersTr('faithWarEnd', $message, [
      'attacker_id' => $attacker_id,
      'defender_id' => $defender_id,
      'attacker_sect' => $attacker_sect,
      'defender_sect' => $defender_sect,
      'attacker_remaining' => $count_a,
      'defender_remaining' => $count_b,
      'incomplete_round' => $is_incomplete ? 1 : 0,
      'pending_bonus_summary' => array_map(function ($cards) {
        return count($cards);
      }, $pending_bonus_by_player)
    ]);
    $this->notifyAllPlayersTr('combatSnapshotHistory', clienttranslate('${attacker_sect_name} (${attacker_participants}) VS ${defender_sect_name} (${defender_participants}) Faith War ended.'), [
      'attacker_sect_name' => (string) $attacker_sect_name,
      'attacker_participants' => (string) $attacker_participants_text,
      'defender_sect_name' => (string) $defender_sect_name,
      'defender_participants' => (string) $defender_participants_text
    ]);
    $this->notifyPublicCountsSync();

    // After Faith War concludes, any player who lost >=3 believers in this round window
    // may trigger Holy Rebirth before the attacker resumes turn flow.
    $resume_player_id = (int) $attacker_id;
    if ($resume_player_id <= 0) {
      $resume_player_id = (int) self::getActivePlayerId();
    }
    $candidate_order = array_values(array_unique(array_merge(
      [(int) $defender_id, (int) $attacker_id],
      array_map('intval', array_keys(self::loadPlayersBasicInfos()))
    )));
    foreach ($candidate_order as $candidate_player_id) {
      $candidate_player_id = (int) $candidate_player_id;
      if ($candidate_player_id <= 0) continue;
      $deaths = (int) $this->getWarDeathCounter((int) $candidate_player_id);
      if ($deaths < 3) continue;
      if ($this->queueHolyRebirthPromptIfEligible((int) $candidate_player_id, (int) $deaths, 'faith_war', (int) $resume_player_id, 1)) {
        return;
      }
    }

    $this->routeAfterActionWindowCheck('playerTurn');
  }

  private function finalizeFinalStruggle(int $attacker_id, int $defender_id, bool $is_incomplete): void
  {
    $attacker_id = (int) $attacker_id;
    $defender_id = (int) $defender_id;

    $used_war_believers = $this->believer_cards->getCardsInLocation('warused');
    $used_by_player = [];
    foreach ($used_war_believers as $used_card) {
      $used_owner = (int) $used_card['location_arg'];
      if (!isset($used_by_player[$used_owner])) {
        $used_by_player[$used_owner] = [];
      }
      $used_by_player[$used_owner][] = $used_card;
    }
    foreach ($used_by_player as $used_owner => $used_cards) {
      $used_ids = array_map(function ($card) {
        return (int) $card['id'];
      }, $used_cards);
      if (empty($used_ids)) continue;
      $this->believer_cards->moveCards($used_ids, 'hand', (int) $used_owner);
      $this->notifyPlayerTr((int) $used_owner, 'newBelievers', '', ['cards' => array_values($used_cards)]);
    }

    $count_a = (int) $this->believer_cards->countCardInLocation('hand', (int) $attacker_id);
    $count_b = (int) $this->believer_cards->countCardInLocation('hand', (int) $defender_id);
    $winner_id = 0;
    if ($count_a > $count_b) {
      $winner_id = (int) $attacker_id;
    } elseif ($count_b > $count_a) {
      $winner_id = (int) $defender_id;
    } else {
      // Safety fallback: if both contenders are still tied, use legacy tie-break.
      $winner_id = (int) $this->resolveFinalWarTieBetweenTwo((int) $attacker_id, (int) $defender_id);
    }

    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('debate_round', 0);
    $this->clearFaithWarParticipants();
    $this->clearCombatSkillState();
    $this->clearWarCardSourceFlags();

    $this->notifyAllPlayersTr(
      'finalStruggleEnd',
      $is_incomplete
        ? clienttranslate('Final War ends because one contender has no Believers left to play.')
        : clienttranslate('Final War ends.'),
      [
        'attacker_id' => (int) $attacker_id,
        'defender_id' => (int) $defender_id,
        'attacker_name' => self::getPlayerNameById((int) $attacker_id),
        'defender_name' => self::getPlayerNameById((int) $defender_id),
        'attacker_remaining' => (int) $count_a,
        'defender_remaining' => (int) $count_b,
        'winner_id' => (int) $winner_id,
        'winner_name' => self::getPlayerNameById((int) $winner_id)
      ]
    );
    $this->notifyPublicCountsSync();
    $this->concludeGameWithWinner((int) $winner_id, 'final_struggle');
  }

  function stNewHand()
  {
    $stage = 'start';
    try {
    // Take back all cards (from any location => null) to deck
    $stage = 'reset_action_believer_decks';
    $this->action_cards->moveAllCardsInLocation(null, "deck");
    $this->believer_cards->moveAllCardsInLocation(null, "deck");
    // Shuffle deck and give initial cards
    $stage = 'shuffle_action_believer_decks';
    $this->action_cards->shuffle('deck');
    $this->believer_cards->shuffle('deck');
    // Deal 6 action cards and 3 believer cards to each player
    $stage = 'deal_action_believer_hands';
    $players = self::loadPlayersBasicInfos();
    foreach ($players as $player_id => $player) {
      $action_cards = $this->action_cards->pickCards(6, 'deck', $player_id);
      $believer_cards = $this->believer_cards->pickCards(3, 'deck', $player_id);
      // Notify player about his cards
      $this->notifyPlayerTr(
        $player_id,
        'newHand',
        '',
        array('action_cards' => $action_cards, 'believer_cards' => $believer_cards)
      );
    }
    self::setGameStateValue('initial_believer_deck_count', (int) $this->believer_cards->countCardInLocation('deck'));

    $stage = 'prepare_initial_skill_draft';
    $this->prepareInitialSkillDraftIfNeeded();
    if (!empty($this->getPlayersPendingInitialSkillChoice())) {
      $stage = 'route_choose_initial_skill';
      $this->gamestate->nextState("chooseInitialSkill");
      return;
    }
    $stage = 'route_next_player';
    $this->gamestate->nextState("nextPlayer");
    } catch (\Throwable $e) {
      throw new \Exception(sprintf(clienttranslate('stNewHand failed at [%s]: %s'), (string) $stage, (string) $e->getMessage()));
    }
  }

  function stChooseInitialSkill()
  {
    $pending = $this->getPlayersPendingInitialSkillChoice();
    if (empty($pending)) {
      $turn_owner_player_id = (int) self::getGameStateValue('turn_owner_player_id');
      if ($turn_owner_player_id > 0) {
        $this->switchActivePlayerSafely((int) $turn_owner_player_id);
      }
      $this->gamestate->nextState('nextPlayer');
      return;
    }

    $active_player_id_before = (int) self::getActivePlayerId();
    if (in_array((int) $active_player_id_before, $pending, true)) {
      if ($this->isPracticeAiPlayer((int) $active_player_id_before)) {
        $this->runPracticeAiTurn([
          'name' => 'chooseInitialSkill',
          'type' => 'activeplayer'
        ], (int) $active_player_id_before);
      }
      return;
    }

    $next_player_id = 0;
    $ordered = $this->getPlayerOrderStartingFrom((int) max(1, $active_player_id_before));
    foreach ($ordered as $pid) {
      $pid = (int) $pid;
      if (in_array((int) $pid, $pending, true)) {
        $next_player_id = (int) $pid;
        break;
      }
    }
    if ($next_player_id <= 0) {
      $next_player_id = (int) $pending[0];
    }
    if ($next_player_id > 0 && $next_player_id !== $active_player_id_before) {
      $this->switchActivePlayerSafely((int) $next_player_id);
      self::giveExtraTime((int) $next_player_id);
      $next_choices = $this->getInitialSkillChoicesForPlayer((int) $next_player_id);
      $this->notifyAllPlayersTr('initialSkillActivePlayerChanged', '', [
        'active_player_id' => (int) $next_player_id
      ]);
      $this->notifyPlayerTr((int) $next_player_id, 'initialSkillActivePlayerChanged', '', [
        'active_player_id' => (int) $next_player_id,
        'choices' => array_values($next_choices)
      ]);
      // Re-enter same state once so clients receive a normal state refresh payload.
      $this->gamestate->nextState('chooseDone');
      return;
    }

    if (!in_array((int) self::getActivePlayerId(), $pending, true)) {
      $fallback_id = (int) $pending[0];
      $this->switchActivePlayerSafely((int) $fallback_id);
      self::giveExtraTime((int) $fallback_id);
      $fallback_choices = $this->getInitialSkillChoicesForPlayer((int) $fallback_id);
      $this->notifyAllPlayersTr('initialSkillActivePlayerChanged', '', [
        'active_player_id' => (int) $fallback_id
      ]);
      $this->notifyPlayerTr((int) $fallback_id, 'initialSkillActivePlayerChanged', '', [
        'active_player_id' => (int) $fallback_id,
        'choices' => array_values($fallback_choices)
      ]);
      $this->gamestate->nextState('chooseDone');
    }
  }


  function stCheckEndTurnPhase()
  {
    $player_id = self::getActivePlayerId();

    // Check Hand Limit
    $hand_limit = (int) $this->getActionHandLimitForPlayer((int) $player_id);
    $action_cards_count = $this->action_cards->countCardInLocation('hand', $player_id);

    if ($action_cards_count > $hand_limit) {
      $this->gamestate->nextState('discardingActionCard');
      return;
    }

    // Check Believer Count
    // Rule: If 0 believers, must surrender or wander.
    $believer_count = $this->believer_cards->countCardInLocation('hand', $player_id);

    if ($believer_count == 0) {
      $role_now = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
      if ($role_now === 2) {
        $this->gamestate->nextState('nextPlayer');
        return;
      }
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
      $sect = $this->getPlayerSect($player_id);

      if ($role === 1) {
        $leader_id = (int) self::getUniqueValueFromDB("SELECT player_leader_id FROM player WHERE player_id = $player_id");
        if ($leader_id > 0 && $this->believer_cards->countCardInLocation('hand', $leader_id) > 0) {
          self::setGameStateValue('follower_id_waiting', $player_id);
          self::setGameStateValue('surrender_support_mode', 1);
          $this->setRejectedMask(0);
          self::setGameStateValue('surrender_bankrupt_id', $player_id);
          $this->switchActivePlayerSafely((int) $leader_id);
          $this->gamestate->nextState('askLeaderSupport');
          return;
        }
        $this->startSurrenderFlowFor($player_id);
        return;
      }

      if ($role === 0) {
        $followers = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect='$sect' AND player_role = 1", true));
        if (!empty($followers)) {
          $max = -1;
          $candidates = [];
          foreach ($followers as $fid) {
            $cnt = $this->believer_cards->countCardInLocation('hand', (int) $fid);
            if ($cnt > $max) {
              $max = $cnt;
              $candidates = [(int) $fid];
            } elseif ($cnt === $max) {
              $candidates[] = (int) $fid;
            }
          }

          if ($max > 0 && !empty($candidates)) {
            $new_leader = (int) $candidates[array_rand($candidates)];
            self::DbQuery("UPDATE player SET player_role = 1, player_leader_id = $new_leader, player_is_skill_sealed = 1 WHERE player_sect = $sect AND player_role = 1 AND player_id != $new_leader");
            self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_is_skill_sealed = 0 WHERE player_id = $new_leader");
            self::DbQuery("UPDATE player SET player_role = 1, player_leader_id = $new_leader, player_is_skill_sealed = 1 WHERE player_id = $player_id");
            $sealed_after_replace = array_values(array_unique(array_merge(
              array_values(array_filter($followers, function ($fid) use ($new_leader) {
                return ((int) $fid !== (int) $new_leader);
              })),
              [(int) $player_id]
            )));
            $this->applySkillSealEffectsForPlayers($sealed_after_replace);
            $this->clearPurpleHermitStatus((int) $new_leader);
            // Former leader just became follower under the new leader.
            // Arm Purple Hermit for this follower-join path as well.
            $this->armPurpleHermitAfterSurrender((int) $player_id, (int) $new_leader);
            $this->revealAscendWithMeIfLeaderHasFollowers((int) $new_leader);

            $this->notifyAllPlayersTr('leaderReplaced', clienttranslate('${new_leader_name} becomes the new Sect Leader because ${old_leader_name} has no Believers.'), [
              'new_leader_name' => self::getPlayerNameById($new_leader),
              'old_leader_name' => self::getPlayerNameById($player_id),
              'new_leader_id' => $new_leader,
              'old_leader_id' => (int) $player_id
            ]);
            $sync_ids = array_merge([(int) $player_id, (int) $new_leader], array_map('intval', $followers));
            $this->notifyPlayerIdentitySync($sync_ids, 'leader_replaced');
            $this->notifyPublicCountsSync();

            self::setGameStateValue('follower_id_waiting', $player_id);
            self::setGameStateValue('surrender_support_mode', 2);
            self::setGameStateValue('surrender_bankrupt_id', $player_id);
            $this->setRejectedMask(0);
            $this->switchActivePlayerSafely((int) $new_leader);
            $this->gamestate->nextState('askLeaderSupport');
            return;
          }
        }
      }

      $this->startSurrenderFlowFor($player_id);
      return;
    }

    $this->gamestate->nextState('nextPlayer');
  }

  function resetPerTurnSkillFlagsForPlayer(int $player_id): void
  {
    $pid = (int) $player_id;
    if ($pid <= 0) return;
    if ((int) $this->getGateTruthOwnerId() === (int) $pid) {
      // Gate of Truth copy window lasts until this player's next turn starts.
      $this->clearGateTruthCopiedSkillContext();
    }
    $this->clearGateTruthUsedThisTurn((int) $pid);
    // Holy Rebirth trigger memory window is one round:
    // from this player's turn start until just before their next turn.
    $this->setWarDeathCounter((int) $pid, 0);
    $this->clearKarboomUsedThisTurn($pid);
    $this->setPlayerAttackLockByKarboom((int) $pid, false);
    $this->clearPraiseLifeUsedThisTurn($pid);
    $this->clearHolyRebirthUsedThisTurn($pid);
    $this->setPlayerSkillProtection($pid, 'physical', false);
    $this->setPlayerSkillProtection($pid, 'mental', false);
  }

  function notifySoulBladeSkipTurn(int $player_id, int $remaining_skip_count): void
  {
    $pid = (int) $player_id;
    $remaining = max(0, (int) $remaining_skip_count);
    $this->notifyAllPlayersTr('soulBladeTurnSkipped', clienttranslate('${player_name}\'s turn is skipped by Soul-Cutting Sword.'), [
      'player_id' => (int) $pid,
      'player_name' => self::getPlayerNameById((int) $pid),
      'remaining_skip_count' => (int) $remaining
    ]);
    $this->notifyPlayerTr((int) $pid, 'soulBladeTurnSkippedPrivate', clienttranslate('Your turn is skipped due to Soul-Cutting Sword.'), [
      'player_id' => (int) $pid,
      'remaining_skip_count' => (int) $remaining
    ]);
  }

  function pickNextPlayerSkipAware(): int
  {
    $loop_guard = max(1, count($this->getSortedPlayerIds()) * 8);
    for ($i = 0; $i < $loop_guard; $i++) {
      $player_id = (int) self::activeNextPlayer();
      self::giveExtraTime((int) $player_id);

      // Per-turn reset for this player happens even if this turn is skipped.
      $this->resetPerTurnSkillFlagsForPlayer((int) $player_id);

      $skip_count_before = (int) $this->getSkipTurnCounter((int) $player_id);
      if ($skip_count_before > 0) {
        $skip_count_after = (int) $this->consumeSkipTurnCounter((int) $player_id);
        $this->notifySoulBladeSkipTurn((int) $player_id, (int) $skip_count_after);
        // If KABOOM lock was active for this player, a skipped turn still counts
        // as spending that locked turn window.
        $this->setPlayerAttackLockByKarboom((int) $player_id, false);
        continue;
      }

      return (int) $player_id;
    }
    return 0;
  }

  function stNextPlayer()
  {
    $forced_anchor_id = (int) $this->consumeForcedNextTurnAnchor();
    if ($forced_anchor_id > 0) {
      $this->switchActivePlayerSafely((int) $forced_anchor_id);
    }

    // End-game checks are evaluated right before activating the next player.
    // Use persisted turn owner as anchor; active player id can be temporarily
    // switched by interrupt flows (Prophet/Holy Rebirth/etc).
    $stored_turn_owner_id = (int) self::getGameStateValue('turn_owner_player_id');
    $anchor_player_id = ($stored_turn_owner_id > 0)
      ? (int) $stored_turn_owner_id
      : (int) self::getActivePlayerId();
    if ($this->checkAndResolveGameEnd($anchor_player_id)) {
      return;
    }

    // Reset turn flags
    $this->resetActionWindowState(true);
    // Karboom attack lock applies only within the acting player's current turn.
    // Clear all residues at turn boundary to avoid cross-player stale locks.
    self::setGameStateValue('karboom_attack_lock_mask', 0);

    // Activate next player (skip-turn aware, circular by table order).
    $chosen_player_id = (int) $this->pickNextPlayerSkipAware();

    if ($chosen_player_id <= 0) {
      // Fallback safety: no eligible player found in guard loop.
      $chosen_player_id = (int) self::getActivePlayerId();
    }
    self::setGameStateValue('turn_owner_player_id', (int) $chosen_player_id);
    $this->incStat(1, 'turns_number');
    $this->incStat(1, 'turns_played', (int) $chosen_player_id);

    $this->resolvePurpleHermitPendingSplitOnTurnStart((int) $chosen_player_id);

    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $chosen_player_id");
    if ($player_role != 2) {
      $this->drawActionCardsToLimit($chosen_player_id, (int) $this->getActionHandLimitForPlayer((int) $chosen_player_id));
    }
    if ($player_role == 2) { // 2 = Wanderer
      $this->notifyAllPlayersTr('wandererTurnStart', clienttranslate('${player_name} (Wanderer) starts their turn! They must snatch 1 Believer.'), array(
        'player_name' => self::getPlayerNameById($chosen_player_id)
      ));
    }

    $this->notifyPublicCountsSync();
    $this->gamestate->nextState('nextPlayer');
  }

  function stEndHand()
  {
    $winner_id = (int) self::getGameStateValue('game_end_winner_id');
    if ($winner_id <= 0) {
      $this->gamestate->nextState("endGame");
      return;
    }

    $showcase_player_id = (int) self::getGameStateValue('impermanence_showcase_player_id');
    if ($showcase_player_id > 0) {
      $this->gamestate->nextState("impermanenceShowcase");
      return;
    }

    $this->gamestate->nextState("showEndSummary");
  }

  function stShowImpermanenceVictory()
  {
    $player_id = (int) self::getGameStateValue('impermanence_showcase_player_id');
    if ($player_id <= 0) {
      $this->gamestate->nextState("showEndSummary");
      return;
    }
    $this->switchActivePlayerSafely((int) $player_id);
    $believer_count = (int) $this->believer_cards->countCardInLocation('hand', (int) $player_id);
    $this->notifyAllPlayersTr(
      'impermanenceVictoryShowcase',
      clienttranslate('${player_name} fulfills Impermanence of Life with ${believer_count} Believers.'),
      [
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById((int) $player_id),
        'skill_type' => 12,
        'believer_count' => (int) $believer_count
      ]
    );
    $this->gamestate->nextState("showEndSummary");
  }

  function stShowGameEndSummary()
  {
    $winner_id = (int) self::getGameStateValue('game_end_winner_id');
    if ($winner_id <= 0) {
      $this->gamestate->nextState("endGame");
      return;
    }

    // End summary is confirmed (End Game) by the human players only. Practice-AI
    // bot seats must NOT be left multiactive here: the AI does not clear its own
    // gameEndSummary slot, so including bots would hang the table forever
    // (especially in solo play where most seats are AI). If somehow no human
    // remains, fall back to all players so the state can still complete.
    $player_ids = array_values(array_map('intval', array_keys(self::loadPlayersBasicInfos())));
    $human_ids = array_values(array_filter($player_ids, function ($pid) {
      return !$this->isPracticeAiPlayer((int) $pid);
    }));
    $confirm_ids = !empty($human_ids) ? $human_ids : $player_ids;
    if (!empty($confirm_ids)) {
      $this->gamestate->setPlayersMultiactive($confirm_ids, 'endGame');
    }

    $reason_code = (int) self::getGameStateValue('game_end_reason_code');
    $final_duel_snapshot = $this->getFinalDuelSummarySnapshot();
    $final_duel_player_a = (int) ($final_duel_snapshot['player_a_id'] ?? 0);
    $final_duel_player_b = (int) ($final_duel_snapshot['player_b_id'] ?? 0);
    $is_final_war_summary = ($reason_code === 4 && $final_duel_player_a > 0 && $final_duel_player_b > 0);
    $final_struggle_summary = $this->getFinalStruggleSummarySnapshot();
    $final_contender_ids = array_values(array_unique(array_map('intval', $final_struggle_summary['contender_ids'] ?? [])));
    if (empty($final_contender_ids) && $final_duel_player_a > 0 && $final_duel_player_b > 0) {
      $final_contender_ids = [(int) $final_duel_player_a, (int) $final_duel_player_b];
    }
    $final_contender_set = array_fill_keys($final_contender_ids, true);
    $final_pre_counts = [];
    if (isset($final_struggle_summary['pre_counts_by_player']) && is_array($final_struggle_summary['pre_counts_by_player'])) {
      foreach ($final_struggle_summary['pre_counts_by_player'] as $pid => $count) {
        $final_pre_counts[(int) $pid] = (int) $count;
      }
    }
    $final_show_mode = '';
    if ($reason_code === 4) {
      $contender_count = count($final_contender_ids);
      if ($contender_count >= 3) {
        $final_show_mode = 'struggle';
      } elseif ($contender_count >= 2 || $is_final_war_summary) {
        $final_show_mode = 'war';
      } else {
        $final_show_mode = 'struggle';
      }
    }
    $reason_text = '';
    if ($reason_code === 1) {
      $reason_text = clienttranslate('Unification Under Heaven victory.');
    } elseif ($reason_code === 2) {
      $reason_text = clienttranslate('This Leader wins with the most Believers.');
    } elseif ($reason_code === 3) {
      $reason_text = clienttranslate('Impermanence of Life succeeded and secured victory.');
    } elseif ($reason_code === 4) {
      $reason_text = ($final_show_mode === 'war')
        ? clienttranslate('Having the most Believers, this player won the final war.')
        : clienttranslate('Having the most Believers, this player won the final struggle.');
    } elseif ($reason_code === 5) {
      $reason_text = clienttranslate('A Follower gained the most Believers and usurped their Leader for victory.');
    } elseif ($reason_code === 6) {
      $reason_text = clienttranslate('In the Sect with the most Believers, this player has the most Believers and wins.');
    } else {
      $reason_text = clienttranslate('Winner determined by a game-end rule.');
    }

    $players = self::loadPlayersBasicInfos();
    $rows = [];
    foreach ($players as $pid => $pinfo) {
      $pid = (int) $pid;
      $skill_card = $this->getPlayerSkillCard($pid);
      $row = [
        'player_id' => $pid,
        'player_name' => $pinfo['player_name'],
        'player_color' => $pinfo['player_color'],
        'player_sect' => (int) self::getUniqueValueFromDB("SELECT player_sect FROM player WHERE player_id = $pid"),
        'player_role' => (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $pid"),
        'believer_count' => (int) $this->believer_cards->countCardInLocation('hand', $pid),
        'skill_type' => $skill_card ? (int) $skill_card['type'] : 0,
        'is_winner' => ($pid === $winner_id) ? 1 : 0
      ];
      $is_final_contender = isset($final_contender_set[$pid]) ? 1 : 0;
      if ($is_final_contender === 1) {
        $row['is_final_struggle_contender'] = 1;
        if ($final_show_mode === 'war') {
          $row['is_final_war_contender'] = 1;
        }
        if (isset($final_pre_counts[$pid])) {
          $row['pre_final_believer_count'] = (int) $final_pre_counts[$pid];
        } elseif ($pid === $final_duel_player_a || $pid === $final_duel_player_b) {
          $row['pre_final_believer_count'] = ($pid === $final_duel_player_a)
            ? (int) ($final_duel_snapshot['pre_count_a'] ?? 0)
            : (int) ($final_duel_snapshot['pre_count_b'] ?? 0);
        }
      }
      $rows[] = $row;
    }

    usort($rows, function ($a, $b) use ($winner_id) {
      $aWinner = ((int) $a['player_id'] === (int) $winner_id) ? 1 : 0;
      $bWinner = ((int) $b['player_id'] === (int) $winner_id) ? 1 : 0;
      if ($aWinner !== $bWinner) {
        return ($bWinner <=> $aWinner);
      }
      if ((int) $a['believer_count'] !== (int) $b['believer_count']) {
        return ((int) $b['believer_count'] <=> (int) $a['believer_count']);
      }
      return ((int) $a['player_id'] <=> (int) $b['player_id']);
    });

    $this->notifyAllPlayersTr(
      'gameEndSummaryShow',
      '',
      [
        'winner_id' => $winner_id,
        'winner_name' => self::getPlayerNameById($winner_id),
        'winner_believer_count' => (int) $this->believer_cards->countCardInLocation('hand', $winner_id),
        'reason_code' => $reason_code,
        'reason_text' => $reason_text,
        'final_show_mode' => (string) $final_show_mode,
        'players' => $rows,
        'end_button_delay_ms' => 3000
      ]
    );
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  function confirmGameEndSummary()
  {
    self::checkAction("confirmGameEndSummary");
    $state = $this->getCurrentStateSnapshotSafe();
    $state_name = isset($state['name']) ? (string) $state['name'] : '';
    if ($state_name !== 'gameEndSummary') {
      return;
    }
    $player_id = (int) self::getCurrentPlayerId();
    $active_players = array_values(array_map('intval', $this->gamestate->getActivePlayerList()));
    if ($player_id <= 0 || (!empty($active_players) && !in_array($player_id, $active_players, true))) {
      return;
    }
    $this->notifyAllPlayersTr('gameEndSummaryClosing', '', [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById((int) $player_id)
    ]);
    self::setGameStateValue('impermanence_showcase_player_id', 0);
    self::setGameStateValue('game_end_winner_id', 0);
    self::setGameStateValue('game_end_reason_code', 0);
    $this->gamestate->nextState("endGame");
  }

  // Backward compatibility for cached clients still calling legacy endpoint.
  function confirmImpermanenceShowcase()
  {
    self::checkAction("confirmGameEndSummary");
    $this->confirmGameEndSummary();
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Zombie
  ////////////

  function zombieTurn($state, $active_player)
  {
    $this->runBotAutomationTurn((array) $state, (int) $active_player, self::BOT_MODE_ZOMBIE);
  }

  protected function runPracticeAiTurn(array $state, int $active_player): void
  {
    $this->runBotAutomationTurn((array) $state, (int) $active_player, self::BOT_MODE_PRACTICE_AI, true);
  }

  function stPracticeAiActivePlayer(): void
  {
    $this->runPracticeAiForCurrentStateIfNeeded();
  }

  private function runPracticeAiForCurrentStateIfNeeded(): void
  {
    $state = $this->getCurrentStateSnapshotSafe();
    $statename = (string) ($state['name'] ?? '');
    $state_type = (string) ($state['type'] ?? '');
    if ($statename === '' || $state_type === '') {
      return;
    }

    if ($state_type === 'activeplayer') {
      $active_player = (int) self::getActivePlayerId();
      if ($active_player > 0 && $this->isPracticeAiPlayer((int) $active_player)) {
        $this->requestPracticeAiStep((int) $active_player, (string) $statename);
      }
      return;
    }

    if ($state_type === 'multipleactiveplayer') {
      if ($statename === 'gameEndSummary') {
        return;
      }
      $active_players = array_values(array_map('intval', $this->gamestate->getActivePlayerList()));
      foreach ($active_players as $active_player) {
        if (!$this->isPracticeAiPlayer((int) $active_player)) {
          continue;
        }
        $this->requestPracticeAiStep((int) $active_player, (string) $statename);
        return;
      }
    }
  }

  private function requestPracticeAiStep(int $player_id, string $state_name): void
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) {
      return;
    }
    $token = (int) self::getGameStateValue('practice_ai_request_token') + 1;
    if ($token <= 0 || $token > 1000000000) {
      $token = 1;
    }
    self::setGameStateValue('practice_ai_request_token', (int) $token);
    $this->notifyAllPlayersTr('practiceAiStepRequested', '', [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById((int) $player_id),
      'state_name' => (string) $state_name,
      'token' => (int) $token,
      'delay_ms' => $this->getPracticeAiStepDelayMs((string) $state_name),
    ]);
  }

  private function getPracticeAiStepDelayMs(string $state_name): int
  {
    return (int) (self::BOT_STEP_DELAY_MS_BY_STATE[$state_name] ?? self::BOT_STEP_DELAY_MS_DEFAULT);
  }

  private function getBotThinkingDelayMs(string $state_name): int
  {
    return (int) (self::BOT_THINKING_MS_BY_STATE[$state_name] ?? self::BOT_THINKING_MS_DEFAULT);
  }

  private function notifyBotThinking(int $player_id, string $state_name, string $bot_mode): void
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) {
      return;
    }
    $this->notifyAllPlayersTr('botThinking', '', [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById((int) $player_id),
      'state_name' => (string) $state_name,
      'bot_mode' => (string) $bot_mode,
      'delay_ms' => $this->getBotThinkingDelayMs((string) $state_name),
    ]);
  }

  private function runBotAutomationTurn(array $state, int $active_player, string $bot_mode, bool $single_step = false): void
  {
    $this->bot_automation_depth++;
    try {
      $this->runBotAutomationTurnInner((array) $state, (int) $active_player, (string) $bot_mode, (bool) $single_step);
    } finally {
      $this->bot_automation_depth = max(0, $this->bot_automation_depth - 1);
    }
  }

  private function runBotAutomationTurnInner(array $state, int $active_player, string $bot_mode, bool $single_step = false): void
  {
    $statename = $state['name'];
    $active_player = (int) $active_player;
    $bot_label = $this->getBotAutomationLabel((string) $bot_mode);

    if ($state['type'] === "activeplayer") {
      if ((int) self::getActivePlayerId() !== (int) $active_player) {
        return;
      }
      switch ($statename) {
        case 'playerTurn':
          $this->botPlayPlayerTurn((int) $active_player, (string) $bot_mode, (bool) $single_step);
          break;
        case 'chooseInitialSkill':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $choices = $this->getInitialSkillChoicesForPlayer((int) $active_player);
          if (!empty($choices)) {
            $random_index = bga_rand(0, count($choices) - 1);
            $chosen_card_id = (int) ($choices[$random_index]['id'] ?? 0);
            if ($chosen_card_id > 0) {
              $this->resolveStartingSkillChoice((int) $active_player, (int) $chosen_card_id);
              $this->notifyAllPlayersTr(
                'initialSkillChosen',
                clienttranslate('${player_name} chooses a starting Skill.'),
                [
                  'player_id' => (int) $active_player,
                  'player_name' => self::getPlayerNameById((int) $active_player)
                ]
              );
            }
          }
          $pending = $this->getPlayersPendingInitialSkillChoice();
          if (empty($pending)) {
            $turn_owner_player_id = (int) self::getGameStateValue('turn_owner_player_id');
            if ($turn_owner_player_id > 0) {
              $this->switchActivePlayerSafely((int) $turn_owner_player_id);
            }
            $this->gamestate->nextState('nextPlayer');
          } else {
            $this->gamestate->nextState('chooseDone');
          }
          break;
        case 'discardingActionCard':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $this->botDiscardActionCardsToLimit((int) $active_player, (string) $bot_mode);
          $this->gamestate->nextState('nextState');
          break;
        case 'chooseSurrenderOrWanderer':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $this->botChooseSurrenderOrWanderer((int) $active_player, (string) $bot_mode);
          break;
        case 'askLeaderSupport':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $this->rejectLeaderSupport();
          break;
        case 'surrenderLeaderResponse':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $this->rejectSurrenderRequest();
          break;
        case 'leaderGiveBeliever':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $this->botResolveLeaderGiveBeliever((int) $active_player, (string) $bot_mode);
          break;
        case 'secretAllianceAttackerChoice':
        case 'secretAllianceTargetChoice':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $this->botChooseSecretAllianceCard((int) $active_player, (string) $statename, (string) $bot_mode);
          break;
        case 'prophetSkillPrompt':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          if ($this->botTryEnableProphet((int) $active_player)) {
            break;
          }
          self::setGameStateValue('prophet_pending_guess_type', 7);
          $this->gamestate->nextState('resolve');
          break;
        case 'prophetGuess':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $guess_type = (int) $this->chooseBotProphetGuessType((int) $active_player);
          if ($guess_type >= 1 && $guess_type <= 5) {
            self::setGameStateValue('prophet_pending_guess_type', (int) $guess_type);
            $this->notifyAllPlayersTr('prophetGuessChosen', clienttranslate('${player_name} predicts ${type_name} with The Prophet for draw #${draw_index}.'), [
              'player_name' => self::getPlayerNameById((int) $active_player),
              'player_id' => (int) $active_player,
              'type_name' => $this->getBelieverTypeLabel((int) $guess_type),
              'type' => (int) $guess_type,
              'draw_index' => (int) $this->getProphetPredictTargetIndexForResponder((int) $active_player)
            ]);
          } else {
            self::setGameStateValue('prophet_pending_guess_type', 7);
          }
          $this->gamestate->nextState('resolve');
          break;
        case 'infoSpyReview':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $this->completeInfoSpy(true, (int) $active_player);
          break;
        case 'holyRebirthPrompt':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          // Reviving 3 of our own dead Believers is free: always accept.
          // stResolveHolyRebirth re-validates eligibility before reviving.
          self::setGameStateValue('holy_rebirth_pending_use', 1);
          $this->gamestate->nextState('resolve');
          break;
        case 'faithDebateStopLeaderApproval':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          self::setGameStateValue('debate_stop_requested', 0);
          $this->clearFaithDebateStopApprovalContext();
          $this->gamestate->nextState('rejected');
          break;
        case 'reverseKarmaPrompt':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          self::setGameStateValue(
            'reverse_karma_pending_use',
            $this->shouldBotUseReverseKarma((int) $active_player) ? 1 : 0
          );
          $this->gamestate->nextState('resolve');
          break;
        case 'impermanenceShowcase':
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          self::setGameStateValue('impermanence_showcase_player_id', 0);
          $this->gamestate->nextState('showEndSummary');
          break;
        case 'gameEndSummary':
          if ($bot_mode === self::BOT_MODE_PRACTICE_AI) {
            return;
          }
          $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
          $this->notifyAllPlayersTr('gameEndSummaryClosing', '', [
            'player_id' => (int) $active_player,
            'player_name' => self::getPlayerNameById((int) $active_player)
          ]);
          self::setGameStateValue('impermanence_showcase_player_id', 0);
          self::setGameStateValue('game_end_winner_id', 0);
          self::setGameStateValue('game_end_reason_code', 0);
          $this->gamestate->nextState('endGame');
          break;
        default:
          throw new feException($bot_label . " mode not supported at this active player state: " . $statename);
      }

      return;
    }

    if ($state['type'] === "multipleactiveplayer") {
      if ($statename === 'gameEndSummary') {
        if ($bot_mode === self::BOT_MODE_PRACTICE_AI) {
          return;
        }
        // A zombie only clears its own multiactive slot here. Do not broadcast
        // the closing notification until a real confirm or the actual end-game
        // transition, otherwise human players lose the End Game button.
        $this->gamestate->setPlayerNonMultiactive($active_player, 'endGame');
        return;
      }

      // Keep combat flows moving per disconnected player only.
      $this->notifyBotThinking((int) $active_player, (string) $statename, (string) $bot_mode);
      if ($statename === 'faithWarDuel') {
        $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
        $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');
        if ($active_player === $attacker_rep_id && (int) self::getGameStateValue('war_card_attacker') === 0) {
          $this->autoCommitFaithWarBelieverForRepresentative($active_player, true);
        } elseif ($active_player === $defender_rep_id && (int) self::getGameStateValue('war_card_defender') === 0) {
          $this->autoCommitFaithWarBelieverForRepresentative($active_player, false);
        }
        $this->gamestate->setPlayerNonMultiactive($active_player, 'nextDuelStep');
        return;
      }

      if ($statename === 'faithDebateDuel') {
        $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
        $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');
        if ($active_player === $attacker_rep_id && (int) self::getGameStateValue('war_card_attacker') === 0) {
          $this->autoCommitFaithDebateBelieverForRepresentative($active_player, true);
        } elseif ($active_player === $defender_rep_id && (int) self::getGameStateValue('war_card_defender') === 0) {
          $this->autoCommitFaithDebateBelieverForRepresentative($active_player, false);
        }
        $this->gamestate->setPlayerNonMultiactive($active_player, 'nextDebateStep');
        return;
      }

      if ($statename === 'martyrdomChooseBelievers') {
        if (!$this->botTryAoeCommitPhaseDefense($active_player)) {
          // Only the sect representative commits a believer; a waiting
          // defense holder without a usable card is simply released.
          if ($this->isPlayerAoeRepresentative($active_player, 3)) {
            $this->autoCommitAoeBelieverForZombie($active_player, 3);
          }
          $this->gamestate->setPlayerNonMultiactive($active_player, 'nextStep');
        }
        return;
      }

      if ($statename === 'conspiracyChooseBelievers') {
        if (!$this->botTryAoeCommitPhaseDefense($active_player)) {
          $consp_war_type = (int) self::getGameStateValue('war_type');
          if (
            $consp_war_type === 11 ||
            $this->isPlayerAoeRepresentative($active_player, 6)
          ) {
            $this->autoCommitAoeBelieverForZombie($active_player, $consp_war_type);
          }
          $this->gamestate->setPlayerNonMultiactive($active_player, 'nextStep');
        }
        return;
      }

      if ($statename === 'confirmDefense') {
        $this->botPlayDefenseIfAvailable($active_player, (string) $bot_mode);
        return;
      }

      if (
        $statename === 'chooseWarRepresentative' ||
        $statename === 'chooseFaithDebateRepresentative' ||
        $statename === 'martyrdomChooseRepresentative' ||
        $statename === 'conspiracyChooseRepresentative'
      ) {
        // AOE early defense window: a bot holding the matching defense card
        // defends right away so its Leader can skip the assignment.
        if (
          ($statename === 'martyrdomChooseRepresentative' || $statename === 'conspiracyChooseRepresentative') &&
          $this->botTryAoeCommitPhaseDefense($active_player)
        ) {
          return;
        }
        $this->botChooseCombatRepresentative($active_player, (string) $statename, (string) $bot_mode);
        return;
      }

      // Default multiple-active fallback
      $this->gamestate->setPlayerNonMultiactive($active_player, '');

      return;
    }

    throw new feException($bot_label . " mode not supported at this game state: " . $statename);
  }

  private function getBotAutomationLabel(string $bot_mode): string
  {
    return ($bot_mode === self::BOT_MODE_ZOMBIE) ? 'Zombie' : 'Bot';
  }

  // Bot automation adapters. Phase 1 keeps zombie behavior unchanged while
  // giving future practice-AI seats one shared entry point to drive turns.
  private function botPlayPlayerTurn(int $player_id, string $bot_mode, bool $single_step = false): void
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) {
      $this->gamestate->nextState('endTurn');
      return;
    }
    if ((int) self::getActivePlayerId() !== (int) $player_id) {
      return;
    }

    $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($role === 2) {
      $this->notifyBotThinking((int) $player_id, 'playerTurn', (string) $bot_mode);
      $this->botWandererStealOrEndTurn((int) $player_id, (string) $bot_mode);
      return;
    }

    if ($this->isPraiseLifeDecisionPendingForPlayer((int) $player_id)) {
      $this->notifyBotThinking((int) $player_id, 'playerTurn', (string) $bot_mode);
      if (!$this->botResolvePraiseLifeDecision((int) $player_id, (string) $bot_mode)) {
        $this->botEndTurn((int) $player_id, (string) $bot_mode);
        return;
      }
      // Praise of Life granted an extra action slot: continue playing below.
    }

    // Try the player's single Skill card once per entry; it does not consume
    // an action slot but can change state (KABOOM prompts, Everyone is Equal
    // ends the turn), so always re-check before playing cards.
    $skill_outcome = $this->maybeBotUseActiveSkill((int) $player_id, (string) $bot_mode);
    if ($skill_outcome === 'turn_ended' || (string) $this->getCurrentStateNameSafe() !== 'playerTurn') {
      return;
    }
    if ($skill_outcome === 'used' && $single_step) {
      return;
    }

    $played_recruit = false;
    $performed_step = false;
    $max_steps = $single_step ? 1 : 2;
    for ($i = 0; $i < $max_steps; $i++) {
      if ((int) self::getActivePlayerId() !== (int) $player_id) {
        return;
      }
      if (!$this->hasRemainingActionSlots()) {
        break;
      }
      if ((string) $this->getCurrentStateNameSafe() !== 'playerTurn') {
        return;
      }

      $plans = $this->getBotPlayableActionPlans((int) $player_id, (string) $bot_mode);
      if (empty($plans)) {
        break;
      }

      $plan = $this->chooseBotActionPlan($plans, (int) $i, $played_recruit, (string) $bot_mode);
      if (empty($plan)) {
        break;
      }
      if ((string) ($plan['group'] ?? '') === 'recruit') {
        $played_recruit = true;
      }
      $performed_step = true;

      $this->notifyBotThinking((int) $player_id, 'playerTurn', (string) $bot_mode);
      $this->playActionCardInternal(
        (int) $player_id,
        (int) $plan['card_id'],
        $plan['target_player_id'],
        $plan['type_arg'],
        $plan['card_ids'],
        $plan['use_zombie']
      );

      if ((string) $this->getCurrentStateNameSafe() !== 'playerTurn') {
        return;
      }
    }

    // Zombie burst: when the last card play raised the Praise of Life
    // decision, resolve it here and keep playing the extra slot. Practice AI
    // (single_step) instead handles it on its next paced step.
    if (
      !$single_step &&
      (string) $this->getCurrentStateNameSafe() === 'playerTurn' &&
      $this->isPraiseLifeDecisionPendingForPlayer((int) $player_id)
    ) {
      $this->notifyBotThinking((int) $player_id, 'playerTurn', (string) $bot_mode);
      if ($this->botResolvePraiseLifeDecision((int) $player_id, (string) $bot_mode)) {
        // Recursion is bounded: Praise of Life is once per turn.
        $this->botPlayPlayerTurn((int) $player_id, (string) $bot_mode, false);
        return;
      }
    }

    if ((!$single_step || !$performed_step) && (string) $this->getCurrentStateNameSafe() === 'playerTurn') {
      $this->notifyBotThinking((int) $player_id, 'playerTurn', (string) $bot_mode);
      $this->botEndTurn((int) $player_id, (string) $bot_mode);
    }
  }

  private function chooseBotActionPlan(array $plans, int $attempt_index, bool $played_recruit, string $bot_mode): array
  {
    $recruit_plans = array_values(array_filter($plans, function ($plan) {
      return (string) ($plan['group'] ?? '') === 'recruit';
    }));
    $attack_plans = array_values(array_filter($plans, function ($plan) {
      return (string) ($plan['group'] ?? '') === 'attack';
    }));
    $setup_plans = array_values(array_filter($plans, function ($plan) {
      return (string) ($plan['group'] ?? '') === 'setup';
    }));

    if ($attempt_index === 0 && !empty($setup_plans)) {
      return (array) $setup_plans[bga_rand(0, count($setup_plans) - 1)];
    }
    if (!$played_recruit && !empty($recruit_plans)) {
      return (array) $recruit_plans[bga_rand(0, count($recruit_plans) - 1)];
    }
    if (!empty($attack_plans)) {
      return (array) $attack_plans[bga_rand(0, count($attack_plans) - 1)];
    }
    if (!empty($plans)) {
      return (array) $plans[bga_rand(0, count($plans) - 1)];
    }
    return [];
  }

  // $ignore_action_bits previews what becomes playable after Praise of Life
  // resets the per-turn action category restriction.
  private function getBotPlayableActionPlans(int $player_id, string $bot_mode, bool $ignore_action_bits = false): array
  {
    $player_id = (int) $player_id;
    $cards = array_values($this->action_cards->getCardsInLocation('hand', $player_id));
    if (empty($cards)) {
      return [];
    }

    $plans = [];
    $recruit_types = ['have_a_charity', 'divine_inspire', 'its_a_miracle'];
    $attack_types = ['witch_hunt', 'faith_war', 'martyrdom', 'spread_rumors', 'faith_debate', 'conspiracy'];
    $setup_types = ['info_spy'];
    $tactic_types = ['secret_alliance', 'kowtow_to_me', 'breaking_faith'];
    $allowed_types = array_fill_keys(array_merge($recruit_types, $attack_types, $setup_types, $tactic_types), true);
    $praise_life_used = $this->isPraiseLifeUsedThisTurn((int) $player_id);

    foreach ($cards as $card) {
      $card_id = (int) ($card['id'] ?? 0);
      $type = (string) ($card['type'] ?? '');
      if ($card_id <= 0 || !isset($allowed_types[$type])) {
        continue;
      }

      $mask = $this->getActionTypeMaskFromCardType((string) $type);
      if (!$ignore_action_bits && !$praise_life_used && $this->isTrackedActionTypeMask($mask) && $this->hasPerformedActionBit((int) $mask)) {
        continue;
      }
      // Mirror the playActionCardInternal KABOOM attack-lock validation so a
      // locked bot never plans an attack that would throw mid-step.
      if (
        ($mask === self::ACTION_BIT_PHYSICAL || $mask === self::ACTION_BIT_MENTAL) &&
        $this->isPlayerAttackLockedByKarboom((int) $player_id) &&
        $this->isKarboomUsedThisTurn((int) $player_id)
      ) {
        continue;
      }

      $plan = [
        'card_id' => (int) $card_id,
        'type' => (string) $type,
        'target_player_id' => null,
        'type_arg' => null,
        'card_ids' => [],
        'use_zombie' => 0,
        'group' => in_array($type, $recruit_types, true) ? 'recruit' : (in_array($type, $setup_types, true) ? 'setup' : 'attack')
      ];

      if ($type === 'divine_inspire') {
        $discard_ids = $this->getBotRandomActionCardIds((int) $player_id, 3, [(int) $card_id], (string) $bot_mode);
        if (count($discard_ids) < 3) {
          continue;
        }
        $plan['card_ids'] = $discard_ids;
      } elseif ($type === 'its_a_miracle') {
        if ((int) $this->believer_cards->countCardInLocation('discard') <= 0) {
          continue;
        }
      } elseif ($type === 'witch_hunt') {
        $target_id = $this->getBotActionTarget((int) $player_id, (string) $type, (string) $bot_mode);
        if ($target_id <= 0) continue;
        $believer_type = $this->getBotWitchHuntBelieverTypeForTarget((int) $target_id, (string) $bot_mode);
        if ($believer_type <= 0) continue;
        $plan['target_player_id'] = (int) $target_id;
        $plan['type_arg'] = (int) $believer_type;
      } elseif ($type === 'faith_war' || $type === 'spread_rumors' || $type === 'faith_debate') {
        $target_id = $this->getBotActionTarget((int) $player_id, (string) $type, (string) $bot_mode);
        if ($target_id <= 0) continue;
        $plan['target_player_id'] = (int) $target_id;
        if (
          $type === 'faith_war' &&
          (int) $this->getZombieArmyLeaderForAttacker((int) $player_id) > 0 &&
          (int) $this->believer_cards->countCardInLocation('discard') >= 2
        ) {
          // Zombie Army: spend graveyard Believers as Faith War fodder.
          $plan['use_zombie'] = 1;
        }
      } elseif ($type === 'martyrdom' || $type === 'conspiracy') {
        $sect = (int) $this->getPlayerSect((int) $player_id);
        if ($sect < 0 || (int) $this->countSectHandBelievers((int) $sect) <= 0) {
          continue;
        }
        if (!$this->hasAnyOtherNonWandererPlayer((int) $player_id)) {
          continue;
        }
      } elseif ($type === 'info_spy') {
        $target_id = $this->getBotInfoSpySetupTarget((int) $player_id, (string) $bot_mode);
        if ($target_id <= 0) continue;
        $plan['target_player_id'] = (int) $target_id;
      } elseif ($type === 'secret_alliance') {
        $target_id = $this->getBotSecretAllianceTarget((int) $player_id, (string) $bot_mode);
        if ($target_id <= 0) continue;
        $plan['target_player_id'] = (int) $target_id;
      } elseif ($type === 'kowtow_to_me') {
        $target_id = $this->getBotKowtowTarget((int) $player_id, (string) $bot_mode);
        if ($target_id <= 0) continue;
        $plan['target_player_id'] = (int) $target_id;
      } elseif ($type === 'breaking_faith') {
        $target_id = $this->getBotBreakingFaithTarget((int) $player_id, (string) $bot_mode);
        if ($target_id <= 0) continue;
        $plan['target_player_id'] = (int) $target_id;
      }

      $plans[] = $plan;
    }

    return array_values($plans);
  }

  private function botEndTurn(int $player_id, string $bot_mode): void
  {
    $this->zombieEndTurn((int) $player_id);
  }

  private function botWandererStealOrEndTurn(int $player_id, string $bot_mode): void
  {
    $this->zombieWandererStealOrEndTurn((int) $player_id);
  }

  private function getBotActionTarget(int $player_id, string $card_type, string $bot_mode): int
  {
    return (int) $this->getZombieRandomActionTarget((int) $player_id, (string) $card_type);
  }

  private function getBotInfoSpySetupTarget(int $player_id, string $bot_mode): int
  {
    return (int) $this->getZombieInfoSpySetupTarget((int) $player_id);
  }

  private function getBotSecretAllianceTarget(int $player_id, string $bot_mode): int
  {
    return (int) $this->getZombieSecretAllianceTarget((int) $player_id);
  }

  private function getBotKowtowTarget(int $player_id, string $bot_mode): int
  {
    return (int) $this->getZombieKowtowTarget((int) $player_id);
  }

  private function getBotBreakingFaithTarget(int $player_id, string $bot_mode): int
  {
    return (int) $this->getZombieBreakingFaithTarget((int) $player_id);
  }

  private function getBotWitchHuntBelieverTypeForTarget(int $target_player_id, string $bot_mode): int
  {
    return (int) $this->getZombieWitchHuntBelieverTypeForTarget((int) $target_player_id);
  }

  private function getBotRandomActionCardIds(int $player_id, int $count, array $exclude_ids, string $bot_mode): array
  {
    return $this->getZombieRandomActionCardIds((int) $player_id, (int) $count, $exclude_ids);
  }

  private function botDiscardActionCardsToLimit(int $player_id, string $bot_mode): void
  {
    $this->zombieDiscardActionCardsToLimit((int) $player_id);
  }

  private function botChooseSurrenderOrWanderer(int $player_id, string $bot_mode): void
  {
    $this->zombieChooseSurrenderOrWanderer((int) $player_id);
  }

  private function botResolveLeaderGiveBeliever(int $leader_id, string $bot_mode): void
  {
    $this->zombieResolveLeaderGiveBeliever((int) $leader_id);
  }

  private function botChooseSecretAllianceCard(int $player_id, string $state_name, string $bot_mode): void
  {
    $this->zombieChooseSecretAllianceCard((int) $player_id, (string) $state_name);
  }

  private function botPlayDefenseIfAvailable(int $player_id, string $bot_mode): void
  {
    $this->zombiePlayDefenseIfAvailable((int) $player_id);
  }

  private function botChooseCombatRepresentative(int $leader_id, string $state_name, string $bot_mode): void
  {
    $this->zombieChooseCombatRepresentative((int) $leader_id, (string) $state_name);
  }

  private function isPlayerAoeRepresentative(int $player_id, int $war_type): bool
  {
    $flag = ((int) $war_type === 3) ? 'player_is_martyrdom_rep' : 'player_is_conspiracy_rep';
    return ((int) self::getUniqueValueFromDB(
      "SELECT $flag FROM player WHERE player_id = " . (int) $player_id
    )) === 1;
  }

  // AOE defense window (representative choice + commit phase): defend
  // (concealed) when holding the matching card, mirroring the previous
  // zombie defense-window behavior. Returns true when a defense was
  // committed (playDefenseCardInternal deactivates the whole sect).
  private function botTryAoeCommitPhaseDefense(int $player_id): bool
  {
    $player_id = (int) $player_id;
    $war_type = (int) self::getGameStateValue('war_type');
    if ($war_type !== 3 && $war_type !== 6) {
      return false;
    }
    $attacker_sect = (int) $this->getPlayerSect((int) self::getGameStateValue('war_attacker_id'));
    if ((int) $this->getPlayerSect($player_id) === $attacker_sect) {
      return false;
    }
    $needed_type = ($war_type === 3) ? 'great_mercy' : 'firm_faith';
    foreach ($this->action_cards->getCardsInLocation('hand', $player_id) as $card) {
      if ((string) ($card['type'] ?? '') === $needed_type) {
        $this->playDefenseCardInternal((int) $player_id, (int) $card['id']);
        return true;
      }
    }
    return false;
  }

  // --- Bot skill automation (simple tier) ---------------------------------
  // Each player holds exactly one Skill card. The bot evaluates its own
  // skill with a simple heuristic and uses it through useSkillInternal when
  // clearly beneficial. Legality always re-checked by canPlayerUseSkillNow.
  // Returns '' (not used), 'used' (still in playerTurn afterwards is not
  // guaranteed; caller must re-check state) or 'turn_ended' (Everyone is
  // Equal forcibly ends the turn).
  private function maybeBotUseActiveSkill(int $player_id, string $bot_mode): string
  {
    $player_id = (int) $player_id;
    if ($player_id <= 0) return '';
    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card) return '';
    $skill_type = (int) ($skill_card['type'] ?? 0);
    $uses = $this->getSkillUseCountFromCard($skill_card);
    $can = $this->canPlayerUseSkillNow($player_id, $skill_type, (int) $uses);
    if (empty($can[0])) return '';

    $target_id = null;
    $believer_id = null;

    switch ($skill_type) {
      case 1: // Purple Hermit: steal half of our leader's Believers once.
        $leader_id = (int) self::getUniqueValueFromDB("SELECT player_leader_id FROM player WHERE player_id = $player_id");
        if ($leader_id <= 0 || (int) $this->believer_cards->countCardInLocation('hand', (int) $leader_id) < 2) {
          return '';
        }
        break;
      case 2: // KABOOM!: trade 1 Believer for up to 3 enemy Believers.
        if ((int) $this->believer_cards->countCardInLocation('hand', $player_id) < 2) return '';
        $target_id = $this->getBotBiggestEnemyHandPlayerId($player_id, 4);
        if ($target_id <= 0) return '';
        $believer_id = $this->getBotSacrificeBelieverId($player_id);
        if ($believer_id <= 0) return '';
        break;
      case 3: // Headstronger: expel Followers when their pooled Believers pay off.
        $sect = (int) $this->getPlayerSect($player_id);
        if ($sect < 0) return '';
        $follower_total = 0;
        foreach (self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect = $sect AND player_role = 1", true) as $fid) {
          $follower_total += (int) $this->believer_cards->countCardInLocation('hand', (int) $fid);
        }
        if ($follower_total < 4) return '';
        break;
      case 7: // Eternal Truth: shield a leading hand from Mental attacks.
      case 8: // World Peace: shield a leading hand from Physical attacks.
        if ((int) $this->believer_cards->countCardInLocation('hand', $player_id) < 5) return '';
        if (!$this->isBotLeadingInBelievers($player_id)) return '';
        $believer_id = $this->getBotSacrificeBelieverId($player_id);
        if ($believer_id <= 0) return '';
        break;
      case 11: // Soul-Cutting Sword: skip the strongest enemy's next turn.
        $target_id = $this->getBotBiggestEnemyHandPlayerId($player_id, 5);
        if ($target_id <= 0) return '';
        if ((int) $this->getSkipTurnCounter((int) $target_id) > 0) return '';
        break;
      case 14: // Chaos Coming: redistribute Action cards when starved.
        if ((int) $this->action_cards->countCardInLocation('hand', $player_id) > 1) return '';
        if ($this->getBotMaxOtherActionHandCount($player_id) < 4) return '';
        break;
      case 15: // Everyone is Equal: redistribute Believers when far behind.
        if ((int) $this->believer_cards->countCardInLocation('hand', $player_id) > 2) return '';
        if ($this->getBotMaxEnemyHandBelieverCount($player_id) < 5) return '';
        break;
      default:
        // Simple tier: Gate of Truth proactive copy and the remaining skills
        // are reactive/passive and handled in their own prompt states.
        return '';
    }

    $this->notifyBotThinking($player_id, 'playerTurn', $bot_mode);
    $this->useSkillInternal($player_id, $target_id, $believer_id);
    return ($skill_type === 15) ? 'turn_ended' : 'used';
  }

  // Sacrifice from the type we hold the most copies of (cheapest variety loss).
  private function getBotSacrificeBelieverId(int $player_id): int
  {
    $cards = array_values($this->believer_cards->getCardsInLocation('hand', (int) $player_id));
    if (empty($cards)) return 0;
    $ids_by_type = [];
    foreach ($cards as $card) {
      $type = (int) ($card['type'] ?? 0);
      $ids_by_type[$type][] = (int) ($card['id'] ?? 0);
    }
    $best_ids = [];
    foreach ($ids_by_type as $ids) {
      if (count($ids) > count($best_ids)) {
        $best_ids = $ids;
      }
    }
    return empty($best_ids) ? 0 : (int) $best_ids[bga_rand(0, count($best_ids) - 1)];
  }

  private function getBotBiggestEnemyHandPlayerId(int $player_id, int $min_count): int
  {
    $own_sect = (int) $this->getPlayerSect((int) $player_id);
    $best_id = 0;
    $best_count = (int) $min_count - 1;
    foreach (array_keys(self::loadPlayersBasicInfos()) as $pid) {
      $pid = (int) $pid;
      if ($pid <= 0 || $pid === (int) $player_id) continue;
      if ($this->isPlayerWanderer($pid)) continue;
      $sect = (int) $this->getPlayerSect($pid);
      if ($sect >= 0 && $sect === $own_sect) continue;
      $n = (int) $this->believer_cards->countCardInLocation('hand', $pid);
      if ($n > $best_count) {
        $best_count = $n;
        $best_id = $pid;
      }
    }
    return (int) $best_id;
  }

  private function getBotMaxEnemyHandBelieverCount(int $player_id): int
  {
    $pid = $this->getBotBiggestEnemyHandPlayerId((int) $player_id, 1);
    return $pid > 0 ? (int) $this->believer_cards->countCardInLocation('hand', $pid) : 0;
  }

  private function getBotMaxOtherActionHandCount(int $player_id): int
  {
    $max = 0;
    foreach (array_keys(self::loadPlayersBasicInfos()) as $pid) {
      $pid = (int) $pid;
      if ($pid <= 0 || $pid === (int) $player_id) continue;
      $max = max($max, (int) $this->action_cards->countCardInLocation('hand', $pid));
    }
    return (int) $max;
  }

  private function isBotLeadingInBelievers(int $player_id): bool
  {
    $own = (int) $this->believer_cards->countCardInLocation('hand', (int) $player_id);
    return $own > 0 && $own >= $this->getBotMaxEnemyHandBelieverCount((int) $player_id);
  }

  // Praise of Life end-of-actions decision: sacrifice 1 Believer for an extra
  // action only when we keep a healthy hand and the extra slot has a use.
  private function botResolvePraiseLifeDecision(int $player_id, string $bot_mode): bool
  {
    $player_id = (int) $player_id;
    if ((int) $this->believer_cards->countCardInLocation('hand', $player_id) < 5) return false;
    $plans = $this->getBotPlayableActionPlans($player_id, $bot_mode, true);
    if (empty($plans)) return false;
    $believer_id = $this->getBotSacrificeBelieverId($player_id);
    if ($believer_id <= 0) return false;
    $this->useSkillInternal($player_id, null, $believer_id);
    return ((string) $this->getCurrentStateNameSafe() === 'playerTurn');
  }

  // The Prophet: primary native owner predicts; Gate-copy responders keep
  // the previous skip behavior in the simple tier.
  private function botTryEnableProphet(int $player_id): bool
  {
    $player_id = (int) $player_id;
    $responder_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    $primary_id = (int) self::getGameStateValue('prophet_pending_primary_player_id');
    if ($player_id <= 0 || $player_id !== $responder_id || $player_id !== $primary_id) {
      return false;
    }
    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card || (int) ($skill_card['type'] ?? 0) !== 4) return false;
    $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");
    if ($sealed === 1) return false;
    $this->revealSkillAndNotifyIfNeeded($player_id, 4);
    $this->notifyPlayerTr($player_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer($player_id)
    ]);
    $this->gamestate->nextState('toGuess');
    return true;
  }

  // Fair inference only: deck estimate = 12 per type minus the graveyard and
  // our own hand. No peeking at other hands or the deck order.
  private function chooseBotProphetGuessType(int $player_id): int
  {
    $remaining = [1 => 12, 2 => 12, 3 => 12, 4 => 12, 5 => 12];
    foreach ($this->believer_cards->getCardsInLocation('discard') as $card) {
      $t = (int) ($card['type'] ?? 0);
      if (isset($remaining[$t])) $remaining[$t]--;
    }
    foreach ($this->believer_cards->getCardsInLocation('hand', (int) $player_id) as $card) {
      $t = (int) ($card['type'] ?? 0);
      if (isset($remaining[$t])) $remaining[$t]--;
    }
    $best = max($remaining);
    if ($best <= 0) return 0;
    $best_types = [];
    foreach ($remaining as $type => $n) {
      if ((int) $n === (int) $best) $best_types[] = (int) $type;
    }
    return (int) $best_types[bga_rand(0, count($best_types) - 1)];
  }

  // Karma Reversed simple tier: flip outcomes only when our own Sect is the
  // defending side of the pending confrontation.
  private function shouldBotUseReverseKarma(int $player_id): bool
  {
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    if ($defender_id <= 0) return false;
    $own_sect = (int) $this->getPlayerSect((int) $player_id);
    return $own_sect >= 0 && $own_sect === (int) $this->getPlayerSect((int) $defender_id);
  }

  private function getZombieRandomActionTarget(int $player_id, string $card_type): int
  {
    $player_id = (int) $player_id;
    $attacker_sect = (int) $this->getPlayerSect((int) $player_id);
    if ($player_id <= 0 || $attacker_sect < 0) {
      return 0;
    }

    $candidates = [];
    $players = $this->shuffleValuesWithBgaRand(array_values(array_map('intval', array_keys(self::loadPlayersBasicInfos()))));
    foreach ($players as $target_id) {
      $target_id = (int) $target_id;
      if ($target_id <= 0 || $target_id === $player_id) continue;
      if ($this->isPlayerWanderer((int) $target_id)) continue;

      $target_sect = (int) $this->getPlayerSect((int) $target_id);
      if ($target_sect < 0 || $target_sect === $attacker_sect) continue;

      if (in_array($card_type, ['witch_hunt', 'faith_war'], true) && $this->isPlayerProtectedFromPhysicalSkill((int) $target_id)) {
        continue;
      }
      if (in_array($card_type, ['spread_rumors', 'faith_debate'], true) && $this->isPlayerProtectedFromMentalSkill((int) $target_id)) {
        continue;
      }

      if ($card_type === 'faith_war') {
        if ((int) $this->countSectHandBelievers((int) $attacker_sect) <= 0) continue;
        if ((int) $this->countSectHandBelievers((int) $target_sect) <= 0) continue;
      } elseif ($card_type === 'faith_debate') {
        if ((int) $this->countSectHandBelievers((int) $attacker_sect) <= 0) continue;
        if ((int) $this->countSectHandBelievers((int) $target_sect) <= 0) continue;
      } elseif ($card_type === 'spread_rumors' || $card_type === 'witch_hunt') {
        if ((int) $this->countSectHandBelievers((int) $target_sect) <= 0) continue;
      }

      $candidates[] = [
        'target_id' => (int) $target_id,
        'score' => (int) $this->countSectHandBelievers((int) $target_sect)
      ];
    }

    if (empty($candidates)) {
      return 0;
    }

    $best_score = max(array_map(function ($candidate) {
      return (int) ($candidate['score'] ?? 0);
    }, $candidates));
    $best = array_values(array_filter($candidates, function ($candidate) use ($best_score) {
      return (int) ($candidate['score'] ?? 0) === (int) $best_score;
    }));
    if (empty($best)) {
      return 0;
    }

    return (int) ($best[bga_rand(0, count($best) - 1)]['target_id'] ?? 0);
  }

  private function getZombieInfoSpySetupTarget(int $player_id): int
  {
    $cards = array_values($this->action_cards->getCardsInLocation('hand', (int) $player_id));
    $targetable_types = ['witch_hunt', 'faith_war', 'spread_rumors', 'faith_debate'];
    foreach ($cards as $card) {
      $type = (string) ($card['type'] ?? '');
      if (in_array($type, $targetable_types, true)) {
        $target_id = $this->getZombieRandomActionTarget((int) $player_id, (string) $type);
        if ($target_id > 0) {
          return (int) $target_id;
        }
      }
      if ($type === 'kowtow_to_me') {
        $target_id = $this->getZombieKowtowTarget((int) $player_id);
        if ($target_id > 0) {
          return (int) $target_id;
        }
      }
      if ($type === 'breaking_faith') {
        $target_id = $this->getZombieBreakingFaithTarget((int) $player_id);
        if ($target_id > 0) {
          return (int) $target_id;
        }
      }
    }

    return 0;
  }

  private function getZombieSecretAllianceTarget(int $player_id): int
  {
    if ((int) $this->action_cards->countCardInLocation('hand', (int) $player_id) <= 1) {
      return 0;
    }

    $targets = [];
    foreach (array_keys(self::loadPlayersBasicInfos()) as $pid) {
      $pid = (int) $pid;
      if ($pid <= 0 || $pid === (int) $player_id) continue;
      if ($this->isPlayerWanderer((int) $pid)) continue;
      if ((int) $this->action_cards->countCardInLocation('hand', (int) $pid) <= 0) continue;
      $targets[] = (int) $pid;
    }
    if (empty($targets)) {
      return 0;
    }

    return (int) $targets[bga_rand(0, count($targets) - 1)];
  }

  private function getZombieKowtowTarget(int $player_id): int
  {
    $attacker_sect = (int) $this->getPlayerSect((int) $player_id);
    if ($attacker_sect < 0) {
      return 0;
    }
    $attacker_count = (int) $this->countSectHandBelievers((int) $attacker_sect);
    $threshold = intdiv($attacker_count, 2);
    if ($threshold < 2) {
      return 0;
    }

    $rows = self::getObjectListFromDB(
      "SELECT player_id, player_sect FROM player WHERE player_role != 2 ORDER BY player_no ASC"
    );
    $by_sect = [];
    foreach ($rows as $row) {
      $pid = (int) ($row['player_id'] ?? 0);
      $sect = (int) ($row['player_sect'] ?? -1);
      if ($pid <= 0 || $sect < 0 || $sect === $attacker_sect) continue;
      if (!isset($by_sect[$sect])) {
        $by_sect[$sect] = [];
      }
      $by_sect[$sect][] = (int) $pid;
    }

    $candidates = [];
    foreach ($by_sect as $sect => $player_ids) {
      $target_count = (int) $this->countSectHandBelievers((int) $sect);
      if ($target_count < 2 || $target_count > $threshold) continue;
      $player_ids = $this->shuffleValuesWithBgaRand(array_values(array_map('intval', $player_ids)));
      $candidates[] = [
        'target_id' => (int) ($player_ids[0] ?? 0),
        'score' => (int) $target_count
      ];
    }
    if (empty($candidates)) {
      return 0;
    }

    $best_score = max(array_map(function ($candidate) {
      return (int) ($candidate['score'] ?? 0);
    }, $candidates));
    $best = array_values(array_filter($candidates, function ($candidate) use ($best_score) {
      return (int) ($candidate['score'] ?? 0) === (int) $best_score;
    }));

    return (int) ($best[bga_rand(0, count($best) - 1)]['target_id'] ?? 0);
  }

  private function getZombieBreakingFaithTarget(int $player_id): int
  {
    $row = self::getObjectFromDB("SELECT player_role, player_leader_id FROM player WHERE player_id = " . (int) $player_id);
    if (!$row || (int) ($row['player_role'] ?? 0) !== 1) {
      return 0;
    }
    if ((int) $this->believer_cards->countCardInLocation('hand', (int) $player_id) < 5) {
      return 0;
    }

    $leader_id = (int) ($row['player_leader_id'] ?? 0);
    if ($leader_id <= 0 || $this->isPlayerWanderer((int) $leader_id)) {
      return 0;
    }

    return (int) $leader_id;
  }

  private function getZombieWitchHuntBelieverTypeForTarget(int $target_player_id): int
  {
    $target_sect = (int) $this->getPlayerSect((int) $target_player_id);
    if ($target_sect < 0) {
      return 0;
    }

    $counts = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
    foreach ($this->getSectPlayerIds((int) $target_sect) as $pid) {
      foreach ($this->believer_cards->getCardsInLocation('hand', (int) $pid) as $card) {
        $type = (int) ($card['type'] ?? 0);
        if (isset($counts[$type])) {
          $counts[$type]++;
        }
      }
    }

    $best_count = max($counts);
    if ($best_count <= 0) {
      return 0;
    }
    $best_types = [];
    foreach ($counts as $type => $count) {
      if ((int) $count === (int) $best_count) {
        $best_types[] = (int) $type;
      }
    }

    return (int) $best_types[bga_rand(0, count($best_types) - 1)];
  }

  private function hasAnyOtherNonWandererPlayer(int $player_id): bool
  {
    foreach (array_keys(self::loadPlayersBasicInfos()) as $pid) {
      $pid = (int) $pid;
      if ($pid <= 0 || $pid === (int) $player_id) continue;
      if (!$this->isPlayerWanderer((int) $pid)) {
        return true;
      }
    }
    return false;
  }

  private function getZombieRandomActionCardIds(int $player_id, int $count, array $exclude_ids = []): array
  {
    $exclude = array_fill_keys(array_map('intval', $exclude_ids), true);
    $cards = array_values($this->action_cards->getCardsInLocation('hand', (int) $player_id));
    $ids = [];
    foreach ($cards as $card) {
      $cid = (int) ($card['id'] ?? 0);
      if ($cid <= 0 || isset($exclude[$cid])) continue;
      $ids[] = (int) $cid;
    }
    $ids = $this->shuffleValuesWithBgaRand($ids);
    return array_slice($ids, 0, max(0, (int) $count));
  }

  private function shuffleValuesWithBgaRand(array $values): array
  {
    $values = array_values($values);
    for ($i = count($values) - 1; $i > 0; $i--) {
      $j = bga_rand(0, $i);
      $tmp = $values[$i];
      $values[$i] = $values[$j];
      $values[$j] = $tmp;
    }
    return $values;
  }

  private function zombieEndTurn(int $player_id): void
  {
    $player_id = (int) $player_id;
    if ((int) self::getActivePlayerId() !== (int) $player_id) {
      return;
    }
    $this->notifyAllPlayersTr('endTurn', clienttranslate('${player_name} finishes their action phase'), [
      'player_name' => self::getPlayerNameById((int) $player_id)
    ]);
    $this->clearPraiseLifeDecisionPending();
    $this->gamestate->nextState('endTurn');
  }

  private function zombieWandererStealOrEndTurn(int $player_id): void
  {
    $targets = [];
    foreach (array_keys(self::loadPlayersBasicInfos()) as $pid) {
      $pid = (int) $pid;
      if ($pid <= 0 || $pid === (int) $player_id) continue;
      if ((int) $this->believer_cards->countCardInLocation('hand', (int) $pid) > 0) {
        $targets[] = (int) $pid;
      }
    }

    if (empty($targets)) {
      $this->zombieEndTurn((int) $player_id);
      return;
    }

    $target_player_id = (int) $targets[bga_rand(0, count($targets) - 1)];
    $target_hand = array_values($this->believer_cards->getCardsInLocation('hand', (int) $target_player_id));
    if (empty($target_hand)) {
      $this->zombieEndTurn((int) $player_id);
      return;
    }

    $stolen_card = $target_hand[bga_rand(0, count($target_hand) - 1)];
    $this->believer_cards->moveCard((int) $stolen_card['id'], 'hand', (int) $player_id);
    $this->notifyPlayerTr((int) $player_id, 'newBelievers', '', ['cards' => [[
      'id' => (int) $stolen_card['id'],
      'type' => (int) $stolen_card['type'],
      'type_arg' => (int) $stolen_card['type_arg']
    ]]]);
    $this->notifyPlayerTr((int) $target_player_id, 'believerStolen', '', ['card_id' => (int) $stolen_card['id']]);
    $this->notifyAllPlayersTr('wandererSteal', clienttranslate('${player_name} snatches 1 Believer from ${target_name}'), [
      'player_name' => self::getPlayerNameById((int) $player_id),
      'target_name' => self::getPlayerNameById((int) $target_player_id),
      'player_id' => (int) $player_id,
      'target_id' => (int) $target_player_id
    ]);

    $turns = (int) self::getUniqueValueFromDB("SELECT player_wanderer_turns FROM player WHERE player_id = $player_id") + 1;
    if ($turns >= 3) {
      $reborn_sect = (int) $this->allocateIndependentSectId((int) $player_id);
      self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_sect = $reborn_sect, player_is_skill_sealed = 0, player_wanderer_turns = 0 WHERE player_id = $player_id");
      $this->clearPurpleHermitStatus((int) $player_id);
      $this->notifyPlayerIdentitySync([(int) $player_id], 'wanderer_reborn');
      $this->notifyAllPlayersTr('wandererReborn', clienttranslate('${player_name} rises again and returns to normal play!'), [
        'player_name' => self::getPlayerNameById((int) $player_id),
        'player_id' => (int) $player_id
      ]);
      $this->resetActionWindowState(true);
      $this->gamestate->nextState('wandererSteal');
      return;
    }

    self::DbQuery("UPDATE player SET player_wanderer_turns = $turns WHERE player_id = $player_id");
    $this->gamestate->nextState('endTurn');
  }

  private function zombieDiscardActionCardsToLimit(int $player_id): void
  {
    $player_id = (int) $player_id;
    $hand_limit = (int) $this->getActionHandLimitForPlayer((int) $player_id);
    $hand_cards = array_values($this->action_cards->getCardsInLocation('hand', (int) $player_id));
    $excess = max(0, count($hand_cards) - (int) $hand_limit);
    if ($excess <= 0) {
      return;
    }

    $hand_cards = $this->shuffleValuesWithBgaRand($hand_cards);
    $to_discard = array_slice($hand_cards, 0, (int) $excess);
    $card_ids = array_values(array_map(function ($card) {
      return (int) ($card['id'] ?? 0);
    }, $to_discard));
    $discard_cards = array_values(array_map(function ($card) {
      return [
        'id' => (int) ($card['id'] ?? 0),
        'type' => (string) ($card['type'] ?? ''),
      ];
    }, $to_discard));

    if (empty($card_ids)) {
      return;
    }
    $this->action_cards->moveCards($card_ids, 'discard');
    $this->notifyAllPlayersTr('actionCardsDiscarded', clienttranslate('${player_name} discards ${count} Action card(s) to reach hand limit.'), [
      'player_name' => self::getPlayerNameById((int) $player_id),
      'player_id' => (int) $player_id,
      'n' => (int) count($card_ids),
      'count' => (int) count($card_ids),
      'card_ids' => $card_ids,
      'cards' => $discard_cards,
      'consume_discard_action' => 0,
    ]);
    $this->notifyPublicCountsSync();
  }

  private function zombieChooseSurrenderOrWanderer(int $player_id): void
  {
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    if ($bankrupt_id <= 0) {
      $bankrupt_id = (int) $player_id;
      self::setGameStateValue('surrender_bankrupt_id', (int) $bankrupt_id);
    }

    $available = $this->getAvailableSurrenderLeaders((int) $bankrupt_id);
    if (empty($available)) {
      $this->doBecomeWanderer((int) $bankrupt_id);
      self::setGameStateValue('surrender_bankrupt_id', 0);
      self::setGameStateValue('surrender_target_leader_id', 0);
      self::setGameStateValue('surrender_support_mode', 0);
      $this->setRejectedMask(0);
      $this->gamestate->nextState('nextPlayer');
      return;
    }

    $leader_scores = [];
    foreach ($available as $leader_id) {
      $leader_id = (int) $leader_id;
      $leader_scores[] = [
        'leader_id' => (int) $leader_id,
        'score' => (int) $this->believer_cards->countCardInLocation('hand', (int) $leader_id)
      ];
    }
    $best_score = max(array_map(function ($row) {
      return (int) ($row['score'] ?? 0);
    }, $leader_scores));
    $best = array_values(array_filter($leader_scores, function ($row) use ($best_score) {
      return (int) ($row['score'] ?? 0) === (int) $best_score;
    }));
    $leader_id = (int) ($best[bga_rand(0, count($best) - 1)]['leader_id'] ?? 0);
    self::setGameStateValue('surrender_target_leader_id', (int) $leader_id);
    $this->notifyAllPlayersTr('surrenderAsked', clienttranslate('${player_name} asks ${leader_name} to accept surrender.'), [
      'player_name' => self::getPlayerNameById((int) $bankrupt_id),
      'leader_name' => self::getPlayerNameById((int) $leader_id),
      'bankrupt_id' => (int) $bankrupt_id,
      'leader_id' => (int) $leader_id
    ]);
    $this->gamestate->nextState('routeSurrenderLeaderResponse');
  }

  private function zombieResolveLeaderGiveBeliever(int $leader_id): void
  {
    $this->cancelGiveBeliever();
  }

  private function zombieChooseSecretAllianceCard(int $player_id, string $state_name): void
  {
    $player_id = (int) $player_id;
    $attacker_id = (int) self::getGameStateValue('secret_alliance_attacker_id');
    $target_id = (int) self::getGameStateValue('secret_alliance_target_id');
    if ($attacker_id <= 0 || $target_id <= 0) {
      $this->gamestate->nextState($state_name === 'secretAllianceAttackerChoice' ? 'secretAllianceSwitchToTarget' : 'secretAllianceReturnToAttacker');
      return;
    }

    $cards = array_values($this->action_cards->getCardsInLocation('hand', (int) $player_id));
    if (empty($cards)) {
      $this->gamestate->nextState($state_name === 'secretAllianceAttackerChoice' ? 'secretAllianceSwitchToTarget' : 'secretAllianceReturnToAttacker');
      return;
    }

    $card = $cards[bga_rand(0, count($cards) - 1)];
    $card_id = (int) ($card['id'] ?? 0);
    if ($card_id <= 0) {
      $this->gamestate->nextState($state_name === 'secretAllianceAttackerChoice' ? 'secretAllianceSwitchToTarget' : 'secretAllianceReturnToAttacker');
      return;
    }

    $this->chooseSecretAllianceCardInternal((int) $player_id, (int) $card_id);
  }

  private function zombiePlayDefenseIfAvailable(int $player_id): void
  {
    $player_id = (int) $player_id;
    $war_type = (int) self::getGameStateValue('war_type');
    $defense_kind = $this->getDefenseKindByWarType((int) $war_type);
    if ($defense_kind === 'physical') {
      $valid_types = ['great_mercy'];
    } elseif ($defense_kind === 'breaking_faith') {
      $valid_types = ['breaking_faith'];
    } else {
      $valid_types = ['firm_faith'];
    }

    $cards = array_values($this->action_cards->getCardsInLocation('hand', (int) $player_id));
    $cards = $this->shuffleValuesWithBgaRand($cards);
    $card = null;
    foreach ($cards as $candidate) {
      if (in_array((string) ($candidate['type'] ?? ''), $valid_types, true)) {
        $card = $candidate;
        break;
      }
    }

    if (!$card) {
      $this->gamestate->setPlayerNonMultiactive($player_id, 'nextDefenseStep');
      return;
    }

    $card_id = (int) ($card['id'] ?? 0);
    $card_type = (string) ($card['type'] ?? '');
    $moved_to_discard = 1;
    if ($war_type == 3 && $card_type === 'great_mercy') {
      $this->action_cards->moveCard($card_id, 'martyrdef', $player_id);
      $moved_to_discard = 0;
    } elseif ($war_type == 6 && $card_type === 'firm_faith') {
      $this->action_cards->moveCard($card_id, 'conspdef', $player_id);
      $moved_to_discard = 0;
    } else {
      $this->action_cards->moveCard($card_id, 'discard');
    }

    if (($war_type == 2 || $war_type == 8) && $card_type === 'great_mercy') {
      self::setGameStateValue('war_attack_blocked', 1);
    }
    if (($war_type == 7 || $war_type == 9) && $card_type === 'firm_faith') {
      self::setGameStateValue('war_attack_blocked', 1);
    }
    if ($war_type == 4 && $card_type === 'breaking_faith') {
      self::setGameStateValue('breaking_faith_defended', 1);
    }
    if ($war_type == 3 || $war_type == 6) {
      $this->markAoeSectDefended((int) $this->getPlayerSect((int) $player_id));
    }

    $this->incStat(1, 'defense_cards_played', (int) $player_id);
    if ($war_type == 3 || $war_type == 6) {
      $this->notifyAllPlayersTr('defensePlayed', '', [
        'anonymous' => true,
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById((int) $player_id),
        'card_id' => (int) $card_id,
        'card_type' => (string) $card_type,
        'moved_to_discard' => (int) $moved_to_discard,
        'sect_id' => (int) $this->getPlayerSect((int) $player_id)
      ]);
    } else {
      $this->notifyAllPlayersTr('defensePlayed', clienttranslate('${player_name} uses a defense card'), [
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById((int) $player_id),
        'card_id' => (int) $card_id,
        'card_type' => (string) $card_type,
        'moved_to_discard' => (int) $moved_to_discard,
        'sect_id' => (int) $this->getPlayerSect((int) $player_id)
      ]);
    }

    if ($war_type == 3 || $war_type == 6) {
      $defender_sect = (int) $this->getPlayerSect((int) $player_id);
      foreach ($this->gamestate->getActivePlayerList() as $active_pid) {
        $active_pid = (int) $active_pid;
        if ($active_pid !== (int) $player_id && (int) $this->getPlayerSect((int) $active_pid) === $defender_sect) {
          $this->gamestate->setPlayerNonMultiactive($active_pid, 'nextDefenseStep');
        }
      }
    }

    // Faith War / Faith Debate: a single block ends the defense window for the
    // whole defending Sect, so finish every other active defender too (e.g. the
    // human Leader still being prompted after an AI Follower blocked).
    if (($war_type == 2 || $war_type == 7) && (int) self::getGameStateValue('war_attack_blocked') === 1) {
      foreach ($this->gamestate->getActivePlayerList() as $active_pid) {
        $active_pid = (int) $active_pid;
        if ($active_pid !== (int) $player_id) {
          $this->gamestate->setPlayerNonMultiactive($active_pid, 'nextDefenseStep');
        }
      }
    }

    $this->gamestate->setPlayerNonMultiactive($player_id, 'nextDefenseStep');
  }

  private function zombieChooseCombatRepresentative(int $leader_id, string $state_name): void
  {
    $leader_id = (int) $leader_id;
    if ($state_name === 'chooseWarRepresentative' || $state_name === 'chooseFaithDebateRepresentative') {
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      $defender_id = (int) self::getGameStateValue('war_defender_id');
      $attacker_sect = (int) $this->getPlayerSect((int) $attacker_id);
      $defender_sect = (int) $this->getPlayerSect((int) $defender_id);
      $attacker_leader = (int) $this->getSectLeaderId((int) $attacker_sect, (int) $attacker_id);
      $defender_leader = (int) $this->getSectLeaderId((int) $defender_sect, (int) $defender_id);
      $this->lockRepresentativeLeaderRows((int) $attacker_leader, (int) $defender_leader);

      $is_faith_war = ($state_name === 'chooseWarRepresentative');
      if ($leader_id === $attacker_leader) {
        $sect = (int) $attacker_sect;
        $allowed = $is_faith_war ? $this->getFaithWarCombatReadyPlayerIds((int) $sect) : $this->getSectCombatReadyPlayerIds((int) $sect);
        $representative_id = $this->pickZombiePreferredRepresentative((int) $leader_id, (int) $sect, $allowed);
        if ($representative_id > 0) {
          self::setGameStateValue('war_rep_attacker_id', (int) $representative_id);
          $this->notifyZombieRepresentativeChosen((int) $leader_id, (int) $representative_id, (bool) $is_faith_war);
        }
      } elseif ($leader_id === $defender_leader) {
        $sect = (int) $defender_sect;
        $allowed = $is_faith_war ? $this->getFaithWarCombatReadyPlayerIds((int) $sect) : $this->getSectCombatReadyPlayerIds((int) $sect);
        $representative_id = $this->pickZombiePreferredRepresentative((int) $leader_id, (int) $sect, $allowed);
        if ($representative_id > 0) {
          self::setGameStateValue('war_rep_defender_id', (int) $representative_id);
          $this->notifyZombieRepresentativeChosen((int) $leader_id, (int) $representative_id, (bool) $is_faith_war);
        }
      }

      $this->gamestate->setPlayerNonMultiactive($leader_id, 'chooseDone');
      return;
    }

    $war_type = ($state_name === 'martyrdomChooseRepresentative') ? 3 : 6;
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = (int) $this->getPlayerSect((int) $attacker_id);
    $leader_sect = (int) $this->getPlayerSect((int) $leader_id);
    if ($leader_sect < 0 || $leader_id !== (int) $this->getSectLeaderId((int) $leader_sect, (int) $leader_id)) {
      $this->gamestate->setPlayerNonMultiactive($leader_id, 'chooseDone');
      return;
    }

    if ($leader_sect !== $attacker_sect) {
      $defended_sects = array_fill_keys(
        $this->getAoeDefendedSectsForCurrentCombat((int) $war_type, (int) $attacker_sect),
        true
      );
      if (isset($defended_sects[$leader_sect])) {
        $this->gamestate->setPlayerNonMultiactive($leader_id, 'chooseDone');
        return;
      }
    }

    $representative_id = $this->pickZombiePreferredRepresentative(
      (int) $leader_id,
      (int) $leader_sect,
      $this->getSectCombatReadyPlayerIds((int) $leader_sect)
    );
    if ($representative_id <= 0) {
      $this->gamestate->setPlayerNonMultiactive($leader_id, 'chooseDone');
      return;
    }

    if ($war_type === 3) {
      self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0 WHERE player_sect = $leader_sect");
      self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 1 WHERE player_id = $representative_id");
      if ($leader_sect === $attacker_sect) {
        self::setGameStateValue('war_rep_attacker_id', (int) $representative_id);
      }
      if ($leader_id !== $representative_id) {
        $this->notifyAllPlayersTr('martyrdomRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Martyrdom.'), [
          'leader_name' => self::getPlayerNameById((int) $leader_id),
          'leader_id' => (int) $leader_id,
          'representative_name' => self::getPlayerNameById((int) $representative_id),
          'representative_id' => (int) $representative_id
        ]);
        $this->notifyPlayerTr((int) $representative_id, 'martyrdomAssignedToYou', clienttranslate('${leader_name} assigns you to Martyrdom.'), [
          'leader_name' => self::getPlayerNameById((int) $leader_id),
          'leader_id' => (int) $leader_id,
          'representative_id' => (int) $representative_id
        ]);
      }
    } else {
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0 WHERE player_sect = $leader_sect");
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $representative_id");
      if ($leader_sect === $attacker_sect) {
        self::setGameStateValue('war_rep_attacker_id', (int) $representative_id);
      }
      if ($leader_id !== $representative_id) {
        $this->notifyAllPlayersTr('conspiracyRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Conspiracy.'), [
          'leader_name' => self::getPlayerNameById((int) $leader_id),
          'leader_id' => (int) $leader_id,
          'representative_name' => self::getPlayerNameById((int) $representative_id),
          'representative_id' => (int) $representative_id
        ]);
        $this->notifyPlayerTr((int) $representative_id, 'conspiracyAssignedToYou', clienttranslate('${leader_name} assigns you to Conspiracy.'), [
          'leader_name' => self::getPlayerNameById((int) $leader_id),
          'leader_id' => (int) $leader_id,
          'representative_id' => (int) $representative_id
        ]);
      }
    }

    $this->gamestate->setPlayerNonMultiactive($leader_id, 'chooseDone');
  }

  private function notifyZombieRepresentativeChosen(int $leader_id, int $representative_id, bool $is_faith_war): void
  {
    if ($is_faith_war) {
      $this->notifyAllPlayersTr('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their Sect.'), [
        'leader_id' => (int) $leader_id,
        'leader_name' => self::getPlayerNameById((int) $leader_id),
        'representative_id' => (int) $representative_id,
        'representative_name' => self::getPlayerNameById((int) $representative_id)
      ]);
      $this->notifyPlayerTr((int) $representative_id, 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
        'leader_id' => (int) $leader_id,
        'leader_name' => self::getPlayerNameById((int) $leader_id),
        'representative_id' => (int) $representative_id
      ]);
      return;
    }

    $this->notifyAllPlayersTr('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to Faith Debate.'), [
      'leader_name' => self::getPlayerNameById((int) $leader_id),
      'representative_name' => self::getPlayerNameById((int) $representative_id),
      'representative_id' => (int) $representative_id
    ]);
  }

  private function pickZombiePreferredRepresentative(int $leader_id, int $sect, array $candidate_ids): int
  {
    $candidate_ids = array_values(array_unique(array_map('intval', $candidate_ids)));
    $candidate_ids = array_values(array_filter($candidate_ids, function ($pid) {
      return (int) $pid > 0;
    }));
    if (empty($candidate_ids)) {
      return 0;
    }

    $ids_sql = implode(',', array_map('intval', $candidate_ids));
    $rows = self::getObjectListFromDB(
      "SELECT player_id, player_role, player_leader_id FROM player WHERE player_id IN ($ids_sql)"
    );
    $row_by_id = [];
    foreach ($rows as $row) {
      $row_by_id[(int) ($row['player_id'] ?? 0)] = $row;
    }

    $preferred = [];
    foreach ($candidate_ids as $pid) {
      $row = $row_by_id[(int) $pid] ?? null;
      if ($row && (int) ($row['player_role'] ?? 0) === 1 && (int) ($row['player_leader_id'] ?? 0) === (int) $leader_id) {
        $preferred[] = (int) $pid;
      }
    }
    $pool = !empty($preferred) ? $preferred : $candidate_ids;
    $scored = [];
    foreach ($pool as $pid) {
      $scored[] = [
        'player_id' => (int) $pid,
        'score' => (int) $this->believer_cards->countCardInLocation('hand', (int) $pid)
      ];
    }

    $best_score = max(array_map(function ($row) {
      return (int) ($row['score'] ?? 0);
    }, $scored));
    $best = array_values(array_filter($scored, function ($row) use ($best_score) {
      return (int) ($row['score'] ?? 0) === (int) $best_score;
    }));

    return (int) ($best[bga_rand(0, count($best) - 1)]['player_id'] ?? 0);
  }

  private function autoCommitAoeBelieverForZombie(int $player_id, int $war_type): bool
  {
    $already_on_table = array_values(array_filter(
      $this->believer_cards->getCardsInLocation('cardsontable', $player_id),
      function ($card) use ($player_id) {
        return (int) $card['location_arg'] === (int) $player_id;
      }
    ));
    if (!empty($already_on_table)) {
      return false;
    }

    $hand_cards = array_values($this->believer_cards->getCardsInLocation('hand', $player_id));
    if (empty($hand_cards)) {
      return false;
    }

    $pick_index = bga_rand(0, count($hand_cards) - 1);
    $card = $hand_cards[$pick_index];
    $card_id = (int) $card['id'];
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $is_attacker_rep = ((int) $player_id === (int) $attacker_rep_id);
    if ($is_attacker_rep) {
      self::setGameStateValue('war_card_attacker', (int) $card_id);
    }
    $this->believer_cards->moveCard($card_id, 'cardsontable', $player_id);

    $payload = [
      'player_id' => (int) $player_id,
      'attacker_id' => (int) self::getGameStateValue('war_attacker_id'),
      'player_name' => self::getPlayerNameById((int) $player_id),
      'card_id' => $card_id,
      'card_type' => (int) $card['type'],
      'sect_id' => (int) $this->getPlayerSect((int) $player_id),
      'is_attacker_representative' => $is_attacker_rep ? 1 : 0,
      'auto_played' => 1
    ];

    if ($war_type === 3) {
      if ($is_attacker_rep) {
        $this->notifyAllPlayersTr('martyrdomAttackerCommitted', '', $payload);
      } else {
        $this->notifyAllPlayersTr('martyrdomBelieverCommitted', '', $payload);
      }
      return true;
    }
    if ($war_type === 6 || $war_type === 11) {
      $this->notifyAllPlayersTr('conspiracyBelieverCommitted', '', $payload);
      return true;
    }
    return false;
  }

  function upgradeTableDb($from_version) {}
}

}

namespace Bga\Games\hegemonyoffaith {

class Game extends \HegemonyOfFaith
{
}

}


