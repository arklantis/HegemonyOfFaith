<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * HegemonyOfFaith implementation: <Your name here> <Your email address here>
 * 
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 * 
 * hegemonyoffaith.game.php
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

  function __construct()
  {
    // Your global variables labels:
    //  Here, you can assign labels to global variables you are using for this game.
    //  You can use any number of global variables with IDs between 10 and 99.
    //  If your game has options (variants), you also have to associate here a label to
    //  the corresponding ID in gameoptions.inc.php.
    // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
    parent::__construct();

    $this->game_materials = include("material.inc.php");  // Load game materials

    self::initGameStateLabels(array(
      // 0b0000 denotes none of 'strategy', 'physical', 'mental', or 'discard' has been performed
      "performedActions" => 10,
      "actions_performed_count" => 11, // Track number of actions (0, 1, 2)

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
      "war_death_counter_pack" => 59,
      "praise_life_decision_player_id" => 60
    ));

    $this->action_cards = $this->bga->deckFactory->createDeck("action_cards");
    $this->action_cards->init("action_cards");

    $this->believer_cards = $this->bga->deckFactory->createDeck("believer_cards");
    $this->believer_cards->init("believer_cards");

    $this->skill_cards = $this->bga->deckFactory->createDeck("skill_cards");
    $this->skill_cards->init("skill_cards");
  }



  /*
        setupNewGame:
        
        This method is called only once, when a new game is launched.
        In this method, you must setup the game according to the game rules, so that
        the game is ready to be played.
    */
  protected function setupNewGame($players, $options = array())
  {
    // Set the colors of the players with HTML color code
    // The default below is red/green/blue/orange/brown
    // The number of colors defined here must correspond to the maximum number of players allowed for the gams
    $gameinfos = self::getGameinfos();
    $default_colors = $gameinfos['player_colors'];

    // Create players
    // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialize it there.
    // $players = self::getCollectionFromDb($sql);
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
    self::reloadPlayersBasicInfos();

    /************ Start the game initialization *****/

    // Init global values with their initial values

    // Set current performed actions to init val (= no perfomed action)
    self::setGameStateInitialValue('performedActions', 0b0000);
    self::setGameStateInitialValue('actions_performed_count', 0);
    self::setGameStateInitialValue('war_attack_blocked', 0);
    self::setGameStateInitialValue('war_rep_attacker_id', 0);
    self::setGameStateInitialValue('war_rep_defender_id', 0);
    self::setGameStateInitialValue('debate_round', 0);
    self::setGameStateInitialValue('secret_alliance_attacker_id', 0);
    self::setGameStateInitialValue('secret_alliance_target_id', 0);
    self::setGameStateInitialValue('secret_alliance_attacker_card_id', 0);
    self::setGameStateInitialValue('breaking_faith_defended', 0);
    self::setGameStateInitialValue('surrender_bankrupt_id', 0);
    self::setGameStateInitialValue('surrender_target_leader_id', 0);
    self::setGameStateInitialValue('surrender_reject_mask', 0);
    self::setGameStateInitialValue('surrender_support_mode', 0);
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
    self::setGameStateInitialValue('war_death_counter_pack', 0);
    self::setGameStateInitialValue('praise_life_decision_player_id', 0);

    // Create action cards
    $action_cards = array();
    foreach ($this->action_cards_count as $type => $info)
      $action_cards[] = array('type' => $type, 'type_arg' => $info['type_arg'], 'nbr' => $info['nbr']);

    $this->action_cards->createCards($action_cards, 'deck');

    // Create believer cards
    $player_count = count($players);
    if ($player_count <= 4) {
      $believers_per_type = 6;   // 30 total
    } elseif ($player_count <= 6) {
      $believers_per_type = 9;   // 45 total
    } else {
      $believers_per_type = 12;  // 60 total
    }

    $believer_cards = array();
    for ($value = 1; $value < 6; $value++)
      // Fool, Prayer, Missionary, Elder, Fanatic
      $believer_cards[] = array('type' => $value, 'type_arg' => 0b10000, 'nbr' => $believers_per_type);

    $this->believer_cards->createCards($believer_cards, 'deck');

    // Create skill cards (1 copy each), then deal 1 random skill to each player.
    $skill_cards = array();
    foreach ($this->skill_labels as $skill_id => $label) {
      $skill_cards[] = array('type' => (int) $skill_id, 'type_arg' => 0, 'nbr' => 1);
    }
    $this->skill_cards->createCards($skill_cards, 'deck');

    $this->action_cards->shuffle('deck');
    $this->believer_cards->shuffle('deck');
    $this->skill_cards->shuffle('deck');

    foreach ($players as $player_id => $player) {
      $this->action_cards->pickCards(6, 'deck', $player_id);
      $this->believer_cards->pickCards(3, 'deck', $player_id);
      $this->skill_cards->pickCards(1, 'deck', $player_id);
    }

    // Activate first player
    $this->activeNextPlayer();

    /************ End of the game initialization *****/

    return 2;
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
    }

    // TODO: Gather all information about current game situation (visible by player $current_player_id).

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
    foreach ($result['players'] as $player_id => &$player) {
      $player_skill_cards = array_values($this->skill_cards->getCardsInLocation('hand', (int) $player_id));
      $is_self = ((int) $player_id === (int) $current_player_id);
      $revealed = $this->isSkillRevealed((int) $player_id);
      $visible = $is_self || $revealed;
      $result['player_skills_revealed'][$player_id] = $visible ? 1 : 0;
      $result['player_skills'][$player_id] = ($visible && !empty($player_skill_cards)) ? $player_skill_cards[0] : null;
    }

    // Cards played on the table
    $result['cardsontable'] = $this->action_cards->getCardsInLocation('cardsontable');
    $result['believersontable'] = array_values($this->believer_cards->getCardsInLocation('cardsontable'));
    $result['combat_context'] = $this->getCombatContextSnapshot();

    // Counts for UI decks
    $result['action_deck_count'] = $this->action_cards->countCardInLocation('deck');
    $result['believer_deck_count'] = $this->believer_cards->countCardInLocation('deck');
    $result['graveyard_count'] = $this->believer_cards->countCardInLocation('discard');
    $result['graveyard_cards'] = $this->getGraveyardCardsNewestFirst();
    $result['performed_actions_mask'] = self::getGameStateValue('performedActions') & 0b01111;
    $result['my_skill_state'] = $this->getSkillStateForPlayer((int) $current_player_id);
    $result['skill_protection'] = $this->getSkillProtectionSnapshot();

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
    // Simple progression based on cards remaining in deck
    $total_cards = 60; // Assuming 60 cards initially
    $remaining = $this->believer_cards->countCardInLocation('deck');
    return 100 - ($remaining / $total_cards * 100);
  }


  //////////////////////////////////////////////////////////////////////////////
  //////////// Utility functions
  ////////////    

  function checkPlayableActionCards($player_id): array
  {
    // Get all data needed to check playable action cards at the moment
    $current_performed_actions = self::getGameStateValue('performedActions');
    $hand = $this->action_cards->getPlayerHand($player_id);

    $playable_action_cards = [];
    foreach ($hand as $card) {
      $action_type_mask = $this->getActionTypeMaskFromCardType($card['type']);
      if (($action_type_mask & 0b01110) && !($current_performed_actions & $action_type_mask)) {
        switch ($action_type_mask) {
          case 0b01000:
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
                $player_sect_member_count = (int) self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_sect='$player_sect' AND player_role != 2");
                $threshold = intdiv($player_sect_member_count, 2);
                if ($threshold <= 0) {
                  break;
                }

                $other_sects = self::getObjectListFromDB("SELECT DISTINCT player_sect FROM player WHERE player_sect!='$player_sect' AND player_sect != -1", true);
                foreach ($other_sects as $sect) {
                  $sect_member_count = (int) self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_sect='$sect' AND player_role != 2");
                  if ($sect_member_count <= $threshold) {
                    $playable_action_cards[] = $card['id'];
                    break;
                  }
                }
                break;

              default:
                break;
            }
            break;

          case 0b00100:
          case 0b00010:
            if ($this->isPlayerAttackLockedByKarboom((int) $player_id)) {
              break;
            }
            switch ($card['type']) {
              case 'faith_war':
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

  function countSectHandBelievers($sect): int
  {
    $count = 0;
    foreach ($this->getSectPlayerIds($sect) as $pid) {
      $count += $this->believer_cards->countCardInLocation('hand', $pid);
    }
    return $count;
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
      'debate_round' => (int) self::getGameStateValue('debate_round')
    ];
  }

  function notifyPublicCountsSync(): void
  {
    self::notifyAllPlayers('publicCountsSync', '', $this->getPublicCountsSnapshot());
  }

  function getSortedPlayerIds(): array
  {
    $ids = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
    sort($ids, SORT_NUMERIC);
    return $ids;
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
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('skill_revealed_mask');
    return (($mask & $bit) !== 0);
  }

  function revealSkill(int $player_id): bool
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('skill_revealed_mask');
    if (($mask & $bit) !== 0) {
      return false;
    }
    self::setGameStateValue('skill_revealed_mask', ($mask | $bit));
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
    $next = max(0, $current + (int) $delta);
    $this->setSkillUseCount((int) $skill_card['id'], $next);
    return $next;
  }

  function isKarboomUsedThisTurn(int $player_id): bool
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('karboom_turn_used_mask');
    return (($mask & $bit) !== 0);
  }

  function markKarboomUsedThisTurn(int $player_id): void
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('karboom_turn_used_mask');
    self::setGameStateValue('karboom_turn_used_mask', ($mask | $bit));
  }

  function clearKarboomUsedThisTurn(int $player_id): void
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('karboom_turn_used_mask');
    self::setGameStateValue('karboom_turn_used_mask', ($mask & (~$bit)));
  }

  function isPraiseLifeUsedThisTurn(int $player_id): bool
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('praise_life_turn_used_mask');
    return (($mask & $bit) !== 0);
  }

  function markPraiseLifeUsedThisTurn(int $player_id): void
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('praise_life_turn_used_mask');
    self::setGameStateValue('praise_life_turn_used_mask', ($mask | $bit));
  }

  function clearPraiseLifeUsedThisTurn(int $player_id): void
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('praise_life_turn_used_mask');
    self::setGameStateValue('praise_life_turn_used_mask', ($mask & (~$bit)));
  }

  function isPlayerProtectedFromPhysicalSkill(int $player_id): bool
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('skill_physical_protect_mask');
    return (($mask & $bit) !== 0);
  }

  function isPlayerProtectedFromMentalSkill(int $player_id): bool
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('skill_mental_protect_mask');
    return (($mask & $bit) !== 0);
  }

  function setPlayerSkillProtection(int $player_id, string $kind, bool $enabled): void
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    if ($kind === 'physical') {
      $mask = (int) self::getGameStateValue('skill_physical_protect_mask');
      self::setGameStateValue('skill_physical_protect_mask', $enabled ? ($mask | $bit) : ($mask & (~$bit)));
      return;
    }
    if ($kind === 'mental') {
      $mask = (int) self::getGameStateValue('skill_mental_protect_mask');
      self::setGameStateValue('skill_mental_protect_mask', $enabled ? ($mask | $bit) : ($mask & (~$bit)));
    }
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
  }

  function getEligibleProphetPlayerForDrawer(int $drawer_id): int
  {
    $players = $this->getSortedPlayerIds();
    foreach ($players as $pid) {
      $pid = (int) $pid;
      if ($pid === (int) $drawer_id) continue;
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $pid");
      $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $pid");
      if ($role !== 0 || $sealed === 1) continue;
      $skill_card = $this->getPlayerSkillCard($pid);
      if ($skill_card && (int) $skill_card['type'] === 4) {
        return $pid;
      }
    }
    return 0;
  }

  function queueProphetPredictionIfNeeded(int $drawer_id, int $draw_count, string $source_card, int $source_extra = 0): bool
  {
    $draw_count = max(0, (int) $draw_count);
    if ($draw_count <= 0) return false;
    if ((int) $this->believer_cards->countCardInLocation('deck') <= 0) return false;

    $prophet_id = $this->getEligibleProphetPlayerForDrawer((int) $drawer_id);
    if ($prophet_id <= 0) return false;

    $source_code = ((string) $source_card === 'divine_inspire') ? 2 : 1;
    self::setGameStateValue('prophet_pending_drawer_id', (int) $drawer_id);
    self::setGameStateValue('prophet_pending_draw_count', (int) $draw_count);
    self::setGameStateValue('prophet_pending_source', (int) $source_code);
    self::setGameStateValue('prophet_pending_prophet_id', (int) $prophet_id);
    self::setGameStateValue('prophet_pending_guess_type', 0);
    self::setGameStateValue('prophet_pending_extra', max(0, (int) $source_extra));

    $this->gamestate->changeActivePlayer((int) $prophet_id);
    if ($this->isSkillRevealed((int) $prophet_id)) {
      $this->gamestate->nextState('prophetGuess');
    } else {
      $this->gamestate->nextState('prophetPrompt');
    }
    return true;
  }

  function isHolyRebirthUsedThisTurn(int $player_id): bool
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('holy_rebirth_turn_used_mask');
    return (($mask & $bit) !== 0);
  }

  function markHolyRebirthUsedThisTurn(int $player_id): void
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('holy_rebirth_turn_used_mask');
    self::setGameStateValue('holy_rebirth_turn_used_mask', ($mask | $bit));
  }

  function clearHolyRebirthUsedThisTurn(int $player_id): void
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('holy_rebirth_turn_used_mask');
    self::setGameStateValue('holy_rebirth_turn_used_mask', ($mask & (~$bit)));
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

  function getHolyRebirthSourceKey(int $code): string
  {
    if ((int) $code === 2) return 'faith_war';
    return 'karboom';
  }

  function clearHolyRebirthPendingContext(): void
  {
    self::setGameStateValue('holy_rebirth_pending_player_id', 0);
    self::setGameStateValue('holy_rebirth_pending_deaths', 0);
    self::setGameStateValue('holy_rebirth_pending_source', 0);
    self::setGameStateValue('holy_rebirth_pending_resume_player', 0);
    self::setGameStateValue('holy_rebirth_pending_resume_mode', 0);
    self::setGameStateValue('holy_rebirth_pending_use', 0);
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
    if (!$skill_card || (int) $skill_card['type'] !== 5) return false;
    if ((int) $this->believer_cards->countCardInLocation('discard') <= 0) return false;

    $source_code = ((string) $source_key === 'faith_war') ? 2 : 1;
    self::setGameStateValue('holy_rebirth_pending_player_id', (int) $candidate_player_id);
    self::setGameStateValue('holy_rebirth_pending_deaths', (int) $deaths);
    self::setGameStateValue('holy_rebirth_pending_source', (int) $source_code);
    self::setGameStateValue('holy_rebirth_pending_resume_player', (int) $resume_player_id);
    self::setGameStateValue('holy_rebirth_pending_resume_mode', (int) $resume_mode);
    self::setGameStateValue('holy_rebirth_pending_use', 0);

    $this->gamestate->changeActivePlayer((int) $candidate_player_id);
    $this->gamestate->nextState('holyRebirthPrompt');
    return true;
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
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('skill_revealed_mask');
    self::setGameStateValue('skill_revealed_mask', ($mask & (~$bit)));
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
    $old_skill_name = isset($this->skill_labels[12]['name']) ? (string) $this->skill_labels[12]['name'] : 'Impermanence of Life';

    if ((string) $old_skill['location'] !== 'hand') return false;
    $this->skill_cards->moveCard($old_skill_id, 'discard');
    $this->skill_cards->moveCard($new_skill_id, 'hand', $player_id);
    $this->clearSkillRevealForPlayer($player_id);

    self::notifyAllPlayers('impermanenceFailed', clienttranslate('${player_name} fails ${skill_name} and redraws a new hidden skill.'), [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById($player_id),
      'skill_name' => $old_skill_name,
      'trigger_key' => (string) $trigger_key
    ]);
    self::notifyAllPlayers('skillHiddenReset', '', [
      'player_id' => (int) $player_id
    ]);
    self::notifyPlayer($player_id, 'skillCardReplaced', '', [
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
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return false;
    $mask = (int) self::getGameStateValue('karboom_attack_lock_mask');
    return (($mask & $bit) !== 0);
  }

  function setPlayerAttackLockByKarboom(int $player_id, bool $locked): void
  {
    $bit = $this->getPlayerBit($player_id);
    if ($bit <= 0) return;
    $mask = (int) self::getGameStateValue('karboom_attack_lock_mask');
    if ($locked) {
      self::setGameStateValue('karboom_attack_lock_mask', ($mask | $bit));
    } else {
      self::setGameStateValue('karboom_attack_lock_mask', ($mask & (~$bit)));
    }
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
      throw new BgaVisibleSystemException(clienttranslate("Choose whether to use Praise of Life or end turn first."));
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
      $this->gamestate->nextState($end_transition);
      return;
    }
    $this->clearPraiseLifeDecisionPending();
    $this->gamestate->nextState($continue_transition);
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

  function canPlayerUseSkillNow(int $player_id, int $skill_type, int $uses): array
  {
    $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");
    if ($role === 2) {
      return [false, clienttranslate("Wanderer must resolve stealing first.")];
    }
    if ($sealed === 1) {
      return [false, clienttranslate("Your skill is sealed right now.")];
    }
    if ($role !== 0) {
      return [false, clienttranslate("You are not a Leader, so you cannot use skills.")];
    }

    // Only explicitly implemented skills are usable.
    if (!in_array($skill_type, [2, 5, 7, 8, 11, 12, 13, 14, 15], true)) {
      return [false, clienttranslate("This skill is not implemented yet.")];
    }

    if ($skill_type === 12) {
      return [false, clienttranslate("Impermanence of Life is a passive skill and cannot be manually used.")];
    }

    if ($skill_type === 5) {
      return [false, clienttranslate("Holy Rebirth is a reactive skill and is triggered automatically.")];
    }

    if ($skill_type === 2) {
      if ($this->isKarboomUsedThisTurn($player_id)) {
        return [false, clienttranslate("KABOOM! can only be used once per turn.")];
      }
      if ($this->believer_cards->countCardInLocation('hand', $player_id) <= 0) {
        return [false, clienttranslate("You need at least 1 Believer to use KABOOM!.")];
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
        return [false, clienttranslate("Soul Severing Sword can only be used up to 3 times per game.")];
      }
      return [true, ''];
    }

    return [false, clienttranslate("This skill is not available right now.")];
  }

  function getSkillStateForPlayer(int $player_id): array
  {
    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card) {
      return [
        'skill_type' => 0,
        'skill_card_id' => 0,
        'uses' => 0,
        'can_use' => 0,
        'disabled_reason' => '',
        'karboom_used_this_turn' => 0,
        'attack_locked_by_karboom' => $this->isPlayerAttackLockedByKarboom($player_id) ? 1 : 0
      ];
    }

    $skill_type = (int) $skill_card['type'];
    $uses = $this->getSkillUseCountFromCard($skill_card);
    $can_reason = $this->canPlayerUseSkillNow($player_id, $skill_type, $uses);

    return [
      'skill_type' => $skill_type,
      'skill_card_id' => (int) $skill_card['id'],
      'uses' => (int) $uses,
      'can_use' => $can_reason[0] ? 1 : 0,
      'disabled_reason' => (string) $can_reason[1],
      'karboom_used_this_turn' => $this->isKarboomUsedThisTurn($player_id) ? 1 : 0,
      'praise_life_used_this_turn' => $this->isPraiseLifeUsedThisTurn($player_id) ? 1 : 0,
      'holy_rebirth_used_this_turn' => $this->isHolyRebirthUsedThisTurn($player_id) ? 1 : 0,
      'attack_locked_by_karboom' => $this->isPlayerAttackLockedByKarboom($player_id) ? 1 : 0,
      'protected_physical' => $this->isPlayerProtectedFromPhysicalSkill($player_id) ? 1 : 0,
      'protected_mental' => $this->isPlayerProtectedFromMentalSkill($player_id) ? 1 : 0
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
    self::notifyAllPlayers('finalTieBreakFallback', clienttranslate('Final tie-break reached safety limit; random winner is chosen.'), [
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
    self::notifyAllPlayers('finalTieBreakFallback', clienttranslate('Final tie-break reached safety limit; random winner is chosen.'), [
      'winner_id' => (int) $winner,
      'winner_name' => self::getPlayerNameById($winner),
      'entered_infinite_war' => 1
    ]);
    return $winner;
  }

  function computeWinnerWhenBelieverDeckEmpty(int $anchor_player_id): int
  {
    $rows = self::getObjectListFromDB("SELECT player_id, player_role, player_sect FROM player");
    $sect_members = [];
    $sect_totals = [];

    foreach ($rows as $row) {
      $pid = (int) $row['player_id'];
      $role = (int) $row['player_role'];
      $sect = (int) $row['player_sect'];
      if ($role === 2 || $sect < 0) continue; // skip wanderers

      if (!isset($sect_members[$sect])) $sect_members[$sect] = [];
      $sect_members[$sect][] = $pid;
      if (!isset($sect_totals[$sect])) $sect_totals[$sect] = 0;
      $sect_totals[$sect] += (int) $this->believer_cards->countCardInLocation('hand', $pid);
    }

    if (empty($sect_totals)) {
      $all_players = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
      return (int) $all_players[array_rand($all_players)];
    }

    $max_sect_total = max($sect_totals);
    $top_sects = array_values(array_filter(array_keys($sect_totals), function ($sect) use ($sect_totals, $max_sect_total) {
      return (int) $sect_totals[$sect] === (int) $max_sect_total;
    }));

    $candidate_players = [];
    foreach ($top_sects as $sect) {
      $members = $sect_members[(int) $sect] ?? [];
      if (count($members) <= 1) {
        if (!empty($members)) $candidate_players[] = (int) $members[0];
        continue;
      }

      $max_personal = -1;
      $local = [];
      foreach ($members as $pid) {
        $cnt = (int) $this->believer_cards->countCardInLocation('hand', $pid);
        if ($cnt > $max_personal) {
          $max_personal = $cnt;
          $local = [(int) $pid];
        } elseif ($cnt === $max_personal) {
          $local[] = (int) $pid;
        }
      }
      $candidate_players = array_merge($candidate_players, $local);
    }

    $candidate_players = array_values(array_unique(array_map('intval', $candidate_players)));
    if (count($candidate_players) === 1) return (int) $candidate_players[0];
    if (count($candidate_players) === 2) {
      return $this->resolveFinalWarTieBetweenTwo((int) $candidate_players[0], (int) $candidate_players[1]);
    }

    return $this->resolveFinalConspiracyTie($candidate_players, $anchor_player_id);
  }

  function checkAndResolveGameEnd(int $anchor_player_id): bool
  {
    $leader_ids = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_role = 0", true));
    $wanderer_count = (int) self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_role = 2");
    $winner_id = 0;
    $reason = '';
    $end_triggered = false;

    // Base end triggers.
    if ($wanderer_count === 0 && count($leader_ids) === 1) {
      // Special instant-unification victory: only one leader remains and no wanderer exists.
      $winner_id = (int) $leader_ids[0];
      $reason = 'unification';
      $end_triggered = true;
    } elseif ($this->believer_cards->countCardInLocation('deck') <= 0) {
      // Standard end: believer deck is empty.
      $winner_id = $this->computeWinnerWhenBelieverDeckEmpty($anchor_player_id);
      $reason = 'believer_deck_empty';
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

    if ($winner_id <= 0) return false;

    $players = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
    $score_snapshot = [];
    foreach ($players as $pid) {
      $base_score = (int) $this->believer_cards->countCardInLocation('hand', $pid);
      $final_score = $base_score + (($pid === $winner_id) ? 1000 : 0);
      self::DbQuery("UPDATE player SET player_score = $final_score WHERE player_id = $pid");
      $score_snapshot[] = ['player_id' => $pid, 'score' => $final_score, 'believers' => $base_score];
    }

    self::notifyAllPlayers('gameEndedByRule', clienttranslate('${winner_name} wins the game!'), [
      'winner_id' => (int) $winner_id,
      'winner_name' => self::getPlayerNameById($winner_id),
      'reason' => $reason,
      'scores' => $score_snapshot
    ]);

    $this->gamestate->nextState('endHand');
    return true;
  }

  function startSurrenderFlowFor(int $bankrupt_id): void
  {
    self::setGameStateValue('surrender_bankrupt_id', (int) $bankrupt_id);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);
    $this->setRejectedMask(0);
    $this->gamestate->nextState('routeSurrenderBankrupt');
  }

  function stRouteSurrenderBankrupt()
  {
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    if ($bankrupt_id > 0) {
      $this->gamestate->changeActivePlayer($bankrupt_id);
    }
    $this->gamestate->nextState('surrenderOrWanderer');
  }

  function stRouteSurrenderLeaderResponse()
  {
    $leader_id = (int) self::getGameStateValue('surrender_target_leader_id');
    if ($leader_id > 0) {
      $this->gamestate->changeActivePlayer($leader_id);
    }
    $this->gamestate->nextState('surrenderLeaderResponse');
  }

  function doBecomeWanderer(int $player_id): void
  {
    $this->failImpermanenceAndRedrawSkill((int) $player_id, 'become_wanderer');

    $cards = $this->action_cards->getCardsInLocation('hand', $player_id);
    $card_ids = array_map(function ($c) {
      return $c['id'];
    }, $cards);
    if (!empty($card_ids)) {
      $this->action_cards->moveCards($card_ids, 'discard');
    }

    $sql = "UPDATE player SET player_role = 2, player_leader_id = NULL, player_sect = -1, player_wanderer_turns = 0 WHERE player_id = $player_id";
    self::DbQuery($sql);

    self::notifyAllPlayers('becomeWanderer', clienttranslate('${player_name} becomes a Wanderer and discards all action cards!'), array(
      'player_name' => self::getPlayerNameById($player_id)
    ));
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

    $available = $this->getAvailableSurrenderLeaders($bankrupt_id);
    $candidates = array_map(function ($leader_id) {
      return [
        'id' => (int) $leader_id,
        'name' => self::getPlayerNameById((int) $leader_id),
        'sect' => (int) $this->getPlayerSect((int) $leader_id)
      ];
    }, $available);

    return [
      'candidates' => $candidates,
      'can_become_wanderer' => empty($available)
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

    $candidates = [];
    if ($current_player_id === $attacker_leader) {
      foreach ($this->getSectCombatReadyPlayerIds($attacker_sect) as $pid) {
        $candidates[] = [
          'id' => (int) $pid,
          'name' => self::getPlayerNameById((int) $pid),
          'believer_count' => $this->believer_cards->countCardInLocation('hand', (int) $pid)
        ];
      }
    } elseif ($current_player_id === $defender_leader) {
      foreach ($this->getSectCombatReadyPlayerIds($defender_sect) as $pid) {
        $candidates[] = [
          'id' => (int) $pid,
          'name' => self::getPlayerNameById((int) $pid),
          'believer_count' => $this->believer_cards->countCardInLocation('hand', (int) $pid)
        ];
      }
    }

    return [
      'candidates' => $candidates
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
      return clienttranslate('Do you want to play a Mental defense card?');
    }
    if ($defense_kind === 'breaking_faith') {
      return clienttranslate('Do you want to play a Breaking Faith defense card?');
    }
    return clienttranslate('Do you want to play a Physical defense card?');
  }

  function argConfirmDefense()
  {
    $war_type = (int) self::getGameStateValue('war_type');
    $defense_kind = $this->getDefenseKindByWarType($war_type);
    return [
      'defense_kind' => $defense_kind,
      'defense_prompt' => $this->getDefensePromptText($defense_kind)
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
    $strategy_cards = ['breaking_faith', 'kowtow_to_me', 'info_spy', 'secret_alliance', 'its_a_miracle', 'have_a_charity', 'divine_inspire'];
    $physical_cards = ['witch_hunt', 'faith_war', 'martyrdom'];
    $mental_cards = ['spread_rumors', 'faith_debate', 'conspiracy'];

    if (in_array($card_type, $strategy_cards, true)) return 0b01000;
    if (in_array($card_type, $physical_cards, true)) return 0b00100;
    if (in_array($card_type, $mental_cards, true)) return 0b00010;
    return 0;
  }

  function getPerformedActionCount(): int
  {
    $count = (int) self::getGameStateValue('actions_performed_count');
    if ($count > 0) {
      return $count;
    }
    // Backward-compatible fallback for older in-flight states that only used bitmask.
    $mask = self::getGameStateValue('performedActions') & 0b01111;
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

  function argPlayerTurn()
  {
    $player_id = (int) self::getActivePlayerId();
    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    // Safety net: ensure normal players always refill to 6 at turn start.
    // We only do this when no action has been consumed this turn.
    if ($player_role !== 2 && $this->getPerformedActionCount() === 0) {
      $this->drawActionCardsToLimit($player_id, 6);
    }
    $result = [
      'performed_actions_mask' => (int) (self::getGameStateValue('performedActions') & 0b01111),
      'performed_actions_count' => (int) $this->getPerformedActionCount(),
      'max_actions_this_turn' => (int) $this->getMaxActionsThisTurn(),
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

  function drawActionCardsToLimit(int $player_id, int $hand_limit = 6): array
  {
    $action_cards_count = $this->action_cards->countCardInLocation('hand', $player_id);
    if ($action_cards_count >= $hand_limit) {
      return [];
    }

    $cards_to_draw = $hand_limit - $action_cards_count;
    $drawn_cards = $this->action_cards->pickCards($cards_to_draw, 'deck', $player_id);
    if (empty($drawn_cards) || count($drawn_cards) < $cards_to_draw) {
      $discard_before_shuffle = array_values($this->action_cards->getCardsInLocation('discard'));
      if (!empty($discard_before_shuffle)) {
        self::notifyAllPlayers('reshuffleActionDiscard', clienttranslate('The Action discard pile is reshuffled into the deck.'), array(
          'count' => count($discard_before_shuffle)
        ));
      }
      $this->action_cards->moveAllCardsInLocation('discard', 'deck');
      $this->action_cards->shuffle('deck');
      $remaining = $cards_to_draw - count($drawn_cards);
      if ($remaining > 0) {
        $more_cards = $this->action_cards->pickCards($remaining, 'deck', $player_id);
        $drawn_cards = array_merge($drawn_cards, $more_cards);
      }
    }

    if (!empty($drawn_cards)) {
      self::notifyPlayer($player_id, 'newActionCards', '', array('cards' => $drawn_cards));
      self::notifyAllPlayers('drawActionCards', clienttranslate('${player_name} draws action cards until hand limit'), array(
        'player_name' => self::getPlayerNameById($player_id),
        'count' => count($drawn_cards),
        'deck_count' => $this->action_cards->countCardInLocation('deck')
      ));
    }
    return $drawn_cards;
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
      throw new BgaVisibleSystemException(clienttranslate("Choose an Action card from your hand to exchange."));
    }

    if ((string) $offer_card['type'] === 'secret_alliance') {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance itself cannot be the exchanged card."));
    }

    if ($this->action_cards->countCardInLocation('hand', $target_id) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target player has no Action cards to exchange."));
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Strategy Actions
  ////////////

  public function playActionCard($card_id, $target_player_id = null, $type_arg = null, $card_ids = array())
  {
    self::checkAction("playActionCard");
    $player_id = self::getActivePlayerId();
    $this->assertNoPendingPraiseLifeDecision((int) $player_id);
    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($player_role === 2) {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer must steal a believer first."));
    }

    // 1. Validate Card Ownership
    $card = $this->action_cards->getCard($card_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You do not have this card in hand."));
    }

    // 1.5 Validate per-turn action category usage
    $type_str = $card['type'];
    $current_performed_actions = self::getGameStateValue('performedActions');
    $action_type_mask = $this->getActionTypeMaskFromCardType($type_str);
    if (($action_type_mask & 0b01110) && ($current_performed_actions & $action_type_mask)) {
      $action_type_name = 'Action';
      if ($action_type_mask === 0b01000) $action_type_name = 'Strategy';
      if ($action_type_mask === 0b00100) $action_type_name = 'Physical Attack';
      if ($action_type_mask === 0b00010) $action_type_name = 'Mental Attack';
      throw new BgaVisibleSystemException(clienttranslate("You have already performed this action type this turn.") . ' (' . $action_type_name . ')');
    }
    if (
      ($action_type_mask === 0b00100 || $action_type_mask === 0b00010) &&
      $this->isPlayerAttackLockedByKarboom((int) $player_id)
    ) {
      throw new BgaVisibleSystemException(clienttranslate("Your attacks are locked this turn."));
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
      throw new BgaVisibleSystemException(clienttranslate("You cannot play It's a Miracle when the graveyard is empty."));
    }
    if ($type_str === 'secret_alliance') {
      if (!$target_player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Select a target."));
      }
      if (!$type_arg) {
        throw new BgaVisibleSystemException(clienttranslate("Select one Action card to exchange."));
      }
      $this->validateSecretAllianceOffer(
        (int) $player_id,
        (int) $card_id,
        (int) $target_player_id,
        (int) $type_arg
      );
    }

    // 2. Broadcast Action to JS for slide animation (from hand to Arena)
    self::notifyAllPlayers('actionCardPlayed', '', array(
      'card_id' => $card_id,
      'player_id' => $player_id,
      'card_type' => $type_str
    ));

    // 3. Move Card to the Common Arena (cardsontable)
    $this->action_cards->moveCard($card_id, 'cardsontable', $player_id);

    // 3.5 Consume the corresponding action slot for this turn BEFORE resolving subflows
    $current_performed_actions = self::getGameStateValue('performedActions');
    $this->setGameStateValue('performedActions', $current_performed_actions | $action_type_mask);
    $this->incrementPerformedActionCount(1);

    // 4. Dispatch to Specific Logic Based on Card Type String
    switch ($type_str) {
      case 'have_a_charity':
        $this->playHaveACharity();
        break;
      case 'great_mercy':
        throw new BgaVisibleSystemException(clienttranslate("Great Mercy is a defense card and can only be played when defending against a Physical attack."));
      case 'firm_faith':
        throw new BgaVisibleSystemException(clienttranslate("Firm Faith is a defense card and can only be played when defending against a Mental attack."));
      case 'its_a_miracle':
        $this->playItsAMiracle();
        break;
      case 'divine_inspire':
        $this->playDivineInspiration($card_ids);
        break;
      case 'info_spy':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playInfoSpy($target_player_id);
        break;
      case 'secret_alliance':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        if (!$type_arg) throw new BgaVisibleSystemException(clienttranslate("Select one Action card to exchange."));
        $this->playSecretAlliance($target_player_id, (int) $type_arg);
        break;
      case 'kowtow_to_me':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target sect member."));
        $this->playKowtowToMe($target_player_id);
        break;
      case 'breaking_faith':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playBreakingFaith($target_player_id);
        break;
      case 'witch_hunt':
        // Temporarily ignore missing type_arg to prevent hard crash, we can add a sub-state later
        $this->playWitchHunt($target_player_id, $type_arg);
        break;
      case 'spread_rumors':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playSpreadRumors($target_player_id);
        break;
      case 'faith_debate':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playFaithDebate($target_player_id);
        break;
      case 'faith_war':
        if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
        $this->playFaithWar($target_player_id);
        break;
      case 'martyrdom':
        if (!$type_arg) throw new BgaVisibleSystemException(clienttranslate("Select a believer for Martyrdom."));
        $this->playMartyrdom($type_arg);
        break;
      case 'conspiracy':
        if (!$type_arg) throw new BgaVisibleSystemException(clienttranslate("Select a believer for Conspiracy."));
        $this->playConspiracy($type_arg);
        break;
      default:
        throw new BgaVisibleSystemException(clienttranslate("Card action not fully implemented yet: " . $type_str));
    }

    // 5. Discard Strategy Cards immediately after resolution
    $instant_cards = ['have_a_charity', 'its_a_miracle', 'divine_inspire', 'info_spy'];
    if (in_array($type_str, $instant_cards)) {
      $this->action_cards->moveCard($card_id, 'discard');
    }
  }

  function redistributeBelieversFromAllHands(int $starter_player_id): array
  {
    $order = $this->getPlayerOrderStartingFrom($starter_player_id);
    $pool_cards = [];
    foreach ($order as $pid) {
      $cards = array_values($this->believer_cards->getCardsInLocation('hand', (int) $pid));
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
      $shuffled = array_values($this->believer_cards->getCardsInLocation('skill_equal_pool'));

      $player_count = max(1, count($order));
      $base = intdiv($total, $player_count);
      $rem = $total % $player_count;
      $cursor = 0;

      foreach ($order as $index => $pid) {
        $take = $base + (($index < $rem) ? 1 : 0);
        $slice = array_slice($shuffled, $cursor, $take);
        $cursor += $take;
        $ids = array_map(function ($card) {
          return (int) $card['id'];
        }, $slice);
        if (!empty($ids)) {
          $this->believer_cards->moveCards($ids, 'hand', (int) $pid);
        }
        $distribution[(int) $pid] = (int) $take;
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
      'distribution' => $distribution,
      'hands' => $hands
    ];
  }

  function redistributeActionCardsFromAllHands(int $starter_player_id): array
  {
    $order = $this->getPlayerOrderStartingFrom($starter_player_id);
    $pool_cards = [];
    foreach ($order as $pid) {
      $cards = array_values($this->action_cards->getCardsInLocation('hand', (int) $pid));
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
      $shuffled = array_values($this->action_cards->getCardsInLocation('skill_chaos_pool'));

      $player_count = max(1, count($order));
      $base = intdiv($total, $player_count);
      $rem = $total % $player_count;
      $cursor = 0;

      foreach ($order as $index => $pid) {
        $take = $base + (($index < $rem) ? 1 : 0);
        $slice = array_slice($shuffled, $cursor, $take);
        $cursor += $take;
        $ids = array_map(function ($card) {
          return (int) $card['id'];
        }, $slice);
        if (!empty($ids)) {
          $this->action_cards->moveCards($ids, 'hand', (int) $pid);
        }
        $distribution[(int) $pid] = (int) $take;
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
      'distribution' => $distribution,
      'hands' => $hands
    ];
  }

  function useSkill($target_player_id = null, $believer_id = null)
  {
    self::checkAction("useSkill");

    $player_id = (int) self::getActivePlayerId();
    $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($role === 2) {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer must resolve stealing first."));
    }

    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card) {
      throw new BgaVisibleSystemException(clienttranslate("No skill card found."));
    }
    $skill_type = (int) $skill_card['type'];
    if ($this->isPraiseLifeDecisionPendingForPlayer($player_id) && $skill_type !== 13) {
      throw new BgaVisibleSystemException(clienttranslate("Choose whether to use Praise of Life or end turn first."));
    }
    $uses = $this->getSkillUseCountFromCard($skill_card);
    $can_reason = $this->canPlayerUseSkillNow($player_id, $skill_type, $uses);
    if (!$can_reason[0]) {
      throw new BgaVisibleSystemException((string) $can_reason[1]);
    }

    $just_revealed = $this->revealSkill($player_id);
    if ($just_revealed) {
      $skill_name = isset($this->skill_labels[$skill_type]['name'])
        ? (string) $this->skill_labels[$skill_type]['name']
        : ('Skill ' . $skill_type);
      self::notifyAllPlayers('skillRevealed', clienttranslate('${player_name} reveals skill: ${skill_name}.'), [
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'skill_type' => (int) $skill_type,
        'skill_name' => $skill_name,
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);
    }

    if ($skill_type === 2) {
      $target_player_id = (int) $target_player_id;
      $believer_id = (int) $believer_id;
      if ($target_player_id <= 0) {
        throw new BgaVisibleSystemException(clienttranslate("Choose a target player for KABOOM!."));
      }
      if (!array_key_exists((int) $target_player_id, self::loadPlayersBasicInfos())) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid KABOOM! target."));
      }
      $believer = $this->believer_cards->getCard($believer_id);
      if (!$believer || $believer['location'] !== 'hand' || (int) $believer['location_arg'] !== $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Choose one of your Believers for KABOOM!."));
      }

      $this->believer_cards->moveCard($believer_id, 'discard');
      $sacrificed = $this->believer_cards->getCard($believer_id);

      $target_hand = array_values($this->believer_cards->getCardsInLocation('hand', $target_player_id));
      shuffle($target_hand);
      $kill_n = min(3, count($target_hand));
      $killed = array_slice($target_hand, 0, $kill_n);
      $killed_ids = array_map(function ($card) {
        return (int) $card['id'];
      }, $killed);
      if (!empty($killed_ids)) {
        $this->believer_cards->moveCards($killed_ids, 'discard');
      }

      $this->markKarboomUsedThisTurn($player_id);
      $this->setPlayerAttackLockByKarboom($target_player_id, true);
      $this->incrementSkillUseCount($skill_card, 1);
      $this->incrementPerformedActionCount(1);

      self::notifyAllPlayers('skillKarboom', clienttranslate('${player_name} uses KABOOM! on ${target_name}: 1 self Believer sacrificed, ${n} target Believer(s) die, and attacks are locked for that player this turn.'), [
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

      self::notifyPlayer($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);

      if ($this->queueHolyRebirthPromptIfEligible((int) $target_player_id, (int) $kill_n, 'karboom', (int) $player_id, 1)) {
        return;
      }

      $this->finishPlayerAction();
      return;
    }

    if ($skill_type === 13) {
      $believer_id = (int) $believer_id;
      $believer = $this->believer_cards->getCard($believer_id);
      if (!$believer || $believer['location'] !== 'hand' || (int) $believer['location_arg'] !== $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Choose one of your Believers to sacrifice."));
      }

      $this->believer_cards->moveCard($believer_id, 'discard');
      $sacrificed = $this->believer_cards->getCard($believer_id);
      $this->markPraiseLifeUsedThisTurn($player_id);
      $this->clearPraiseLifeDecisionPending();
      $this->incrementSkillUseCount($skill_card, 1);
      $extra = (int) self::getGameStateValue('extra_action_slots');
      self::setGameStateValue('extra_action_slots', $extra + 1);

      self::notifyAllPlayers('skillPraiseLife', clienttranslate('${player_name} uses Praise of Life: 1 Believer is sacrificed and gains 1 extra action this turn.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'sacrificed_card' => $sacrificed,
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'extra_action_slots' => (int) self::getGameStateValue('extra_action_slots'),
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      self::notifyPlayer($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);

      $this->finishPlayerAction();
      return;
    }

    if ($skill_type === 8) {
      $believer_id = (int) $believer_id;
      $believer = $this->believer_cards->getCard($believer_id);
      if (!$believer || $believer['location'] !== 'hand' || (int) $believer['location_arg'] !== $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Choose one of your Believers to sacrifice."));
      }

      $this->believer_cards->moveCard($believer_id, 'discard');
      $sacrificed = $this->believer_cards->getCard($believer_id);
      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      $this->setPlayerSkillProtection($player_id, 'physical', true);

      self::notifyAllPlayers('skillWorldPeace', clienttranslate('${player_name} uses World Peace: sacrifices 1 Believer and is protected from Physical attacks until their next turn (no action consumed).'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'sacrificed_card' => $sacrificed,
        'uses' => (int) $new_uses,
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      self::notifyPlayer($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($skill_type === 7) {
      $believer_id = (int) $believer_id;
      $believer = $this->believer_cards->getCard($believer_id);
      if (!$believer || $believer['location'] !== 'hand' || (int) $believer['location_arg'] !== $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Choose one of your Believers to sacrifice."));
      }

      $this->believer_cards->moveCard($believer_id, 'discard');
      $sacrificed = $this->believer_cards->getCard($believer_id);
      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      $this->setPlayerSkillProtection($player_id, 'mental', true);

      self::notifyAllPlayers('skillEternalTruth', clienttranslate('${player_name} uses Eternal Truth: sacrifices 1 Believer and is protected from Mental attacks until their next turn (no action consumed).'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'sacrificed_card' => $sacrificed,
        'uses' => (int) $new_uses,
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      self::notifyPlayer($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($skill_type === 11) {
      $target_player_id = (int) $target_player_id;
      if ($target_player_id <= 0 || !array_key_exists((int) $target_player_id, self::loadPlayersBasicInfos())) {
        throw new BgaVisibleSystemException(clienttranslate("Choose a valid target player for Soul Severing Sword."));
      }
      if ($target_player_id === $player_id) {
        throw new BgaVisibleSystemException(clienttranslate("Soul Severing Sword cannot target yourself."));
      }

      $new_uses = $this->incrementSkillUseCount($skill_card, 1);
      $target_skip_count = $this->addSkipTurnCounter((int) $target_player_id, 1);

      self::notifyAllPlayers('skillSoulSeveringSword', clienttranslate('${player_name} uses Soul Severing Sword on ${target_name}. ${target_name} will skip ${n} upcoming turn(s).'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'target_name' => self::getPlayerNameById($target_player_id),
        'target_id' => (int) $target_player_id,
        'target_skip_count' => (int) $target_skip_count,
        'uses' => (int) $new_uses,
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      self::notifyPlayer((int) $target_player_id, 'soulBladeMarked', clienttranslate('${player_name} used Soul Severing Sword on you. Your next turn will be skipped.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'target_skip_count' => (int) $target_skip_count
      ]);

      self::notifyPlayer($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    if ($skill_type === 15) {
      $redistributed = $this->redistributeBelieversFromAllHands($player_id);
      $this->setSkillUseCount((int) $skill_card['id'], 1);

      self::notifyAllPlayers('skillEveryoneEqual', clienttranslate('${player_name} uses Everyone is Equal. All Believers in hand are shuffled and redistributed from ${player_name} seat order. This immediately ends the turn.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'total' => (int) $redistributed['total'],
        'distribution' => $redistributed['distribution'],
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      foreach ($redistributed['hands'] as $pid => $cards) {
        self::notifyPlayer((int) $pid, 'syncBelieverHand', '', [
          'cards' => array_values($cards)
        ]);
      }

      self::setGameStateValue('actions_performed_count', (int) $this->getMaxActionsThisTurn());
      $this->notifyPublicCountsSync();
      self::notifyPlayer($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->gamestate->nextState('endTurn');
      return;
    }

    if ($skill_type === 14) {
      $redistributed = $this->redistributeActionCardsFromAllHands($player_id);
      $this->incrementSkillUseCount($skill_card, 1);

      self::notifyAllPlayers('skillChaosComing', clienttranslate('${player_name} uses Chaos Coming. All Action cards in hand are shuffled and redistributed from ${player_name} seat order.'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => (int) $player_id,
        'total' => (int) $redistributed['total'],
        'distribution' => $redistributed['distribution'],
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);

      foreach ($redistributed['hands'] as $pid => $cards) {
        self::notifyPlayer((int) $pid, 'syncActionHand', '', [
          'cards' => array_values($cards)
        ]);
      }

      $this->notifyPublicCountsSync();
      self::notifyPlayer($player_id, 'skillStateUpdated', '', [
        'skill_state' => $this->getSkillStateForPlayer($player_id)
      ]);
      $this->gamestate->nextState('playActionCard');
      return;
    }

    throw new BgaVisibleSystemException(clienttranslate("This skill is not implemented yet."));
  }

  function discardActionCards($card_ids)
  {
    self::checkAction("discardActionCards");
    $player_id = self::getActivePlayerId();
    $this->assertNoPendingPraiseLifeDecision((int) $player_id);
    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($player_role === 2) {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer cannot discard actions before stealing."));
    }

    if (count($card_ids) < 1) {
      throw new BgaVisibleSystemException(clienttranslate("Select at least one Action card to discard"));
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
    $current_performed_actions = self::getGameStateValue('performedActions');
    $this->setGameStateValue('performedActions', $current_performed_actions | 0b0001);
    $this->incrementPerformedActionCount(1);

    self::notifyAllPlayers('actionCardsDiscarded', clienttranslate('${player_name} discards ${count} action card(s).'), array(
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
  function playDivineInspiration($card_ids_to_discard)
  {
    $player_id = self::getActivePlayerId();

    if (count($card_ids_to_discard) < 1) {
      throw new BgaVisibleSystemException(clienttranslate("Choose at least one Action card to discard for Divine Inspiration"));
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

    // Discard chosen cards
    $this->action_cards->moveCards($card_ids_to_discard, 'discard');

    // Draw X Believer Cards
    $discard_count = count($card_ids_to_discard);
    if ($this->queueProphetPredictionIfNeeded((int) $player_id, (int) $discard_count, 'divine_inspire', (int) $discard_count)) {
      return;
    }

    $deck_before = (int) $this->believer_cards->countCardInLocation('deck');
    $new_believers = array_values($this->believer_cards->pickCards($discard_count, 'deck', $player_id));
    $draw_count = count($new_believers);
    $insufficient_deck = $draw_count < $discard_count;

    self::notifyAllPlayers('divineInspiration', clienttranslate('${player_name} uses Divine Inspiration: discards ${discard_n} Action card(s) and draws ${draw_n} Believer card(s).'), array(
      'player_name' => self::getActivePlayerName(),
      'player_id' => (int) $player_id,
      'discard_n' => (int) $discard_count,
      'draw_n' => (int) $draw_count,
      'draw_total_n' => (int) $draw_count,
      'deck_before' => (int) $deck_before,
      'insufficient_deck' => $insufficient_deck ? 1 : 0
    ));
    self::notifyPlayer($player_id, 'newBelievers', '', array('cards' => array_values($new_believers)));

    $this->finishPlayerAction();
  }

  /*
   * Info Spy
   * Reveal target player's Hand (Action + Believer). NOT Skills.
   * UI should show a modal with timer.
   */
  function playInfoSpy($target_player_id)
  {
    $player_id = self::getActivePlayerId();
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }

    // Get target's hand
    $action_hand = $this->action_cards->getCardsInLocation('hand', $target_player_id);
    $believer_hand = $this->believer_cards->getCardsInLocation('hand', $target_player_id);

    // Notify all players (public info)
    $target_name = self::getPlayerNameById($target_player_id);
    self::notifyAllPlayers('infoSpy', clienttranslate('${player_name} spies on ${target_name}'), array(
      'player_name' => self::getActivePlayerName(),
      'target_name' => $target_name
    ));

    // Send private info to spy (Action + Believer only)
    self::notifyPlayer($player_id, 'spyResult', '', array(
      'target_name' => $target_name,
      'action_cards' => $action_hand,
      'believer_cards' => $believer_hand
    ));

    $this->finishPlayerAction();
  }

  /*
   * Kowtow To Me
   * Force target player (Sect Leader) to join your Sect as Follower.
   * Condition: Your Sect Believers >= 2 * Target Sect Believers.
   * (Already checked in checkPlayableActionCards, but double check here for safety)
   */
  function playKowtowToMe($target_player_id)
  {
    $player_id = self::getActivePlayerId();
    $this->assertTargetIsNotWanderer($target_player_id);
    $attacker_sect = $this->getPlayerSect($player_id);
    $target_sect = $this->getPlayerSect($target_player_id);
    if ($attacker_sect < 0) {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer cannot use Kowtow To Me."));
    }
    if ($target_sect < 0 || $target_sect === $attacker_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Choose a different sect."));
    }

    $attacker_member_count = (int) self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_sect='$attacker_sect' AND player_role != 2");
    $target_member_count = (int) self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_sect='$target_sect' AND player_role != 2");
    $threshold = intdiv($attacker_member_count, 2);
    if ($target_member_count > $threshold) {
      throw new BgaVisibleSystemException(clienttranslate("Target sect is too large to be absorbed."));
    }

    $attacker_leader = $this->getSectLeaderId($attacker_sect, $player_id);
    $this->failImpermanenceAndRedrawSkill((int) $attacker_leader, 'recruit_follower');
    self::DbQuery("UPDATE player SET player_sect = $attacker_sect, player_role = 1, player_leader_id = $attacker_leader, player_is_skill_sealed = 1 WHERE player_sect = $target_sect AND player_role != 2");

    // Keep the original leader of attacker's sect as leader.
    self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_is_skill_sealed = 0 WHERE player_id = $attacker_leader");

    self::notifyAllPlayers('kowtowToMe', clienttranslate('${player_name} absorbs target sect into their sect.'), array(
      'player_name' => self::getActivePlayerName(),
      'attacker_sect' => (int) $attacker_sect,
      'target_sect' => (int) $target_sect,
      'attacker_leader_id' => (int) $attacker_leader
    ));

    $this->finishPlayerAction();
  }

  /*
   * Have a Charity
   * Draw 2 Believer cards from deck.
   */
  function playHaveACharity()
  {
    $player_id = self::getActivePlayerId();
    if ($this->queueProphetPredictionIfNeeded((int) $player_id, 2, 'have_a_charity', 0)) {
      return;
    }

    $cards = array_values($this->believer_cards->pickCards(2, 'deck', $player_id));
    $draw_count = count($cards);

    self::notifyAllPlayers('haveACharity', clienttranslate('${player_name} performs Charity and draws ${n} Believer card(s).'), array(
      'player_name' => self::getActivePlayerName(),
      'player_id' => (int) $player_id,
      'n' => (int) $draw_count,
      'n_total' => (int) $draw_count
    ));
    self::notifyPlayer($player_id, 'newBelievers', '', array('cards' => array_values($cards)));

    $this->finishPlayerAction();
  }

  /*
   * Great Mercy / It's a Miracle
   * Revive top 3 Believer cards from discard pile (Graveyard).
   */
  function playItsAMiracle()
  {
    $player_id = self::getActivePlayerId();

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

      self::notifyAllPlayers('greatMercy', clienttranslate('${player_name} uses It\'s a Miracle and revives the top ${n} believers from the graveyard'), array(
        'player_name' => self::getActivePlayerName(),
        'player_id' => $player_id,
        'n' => $count,
        'cards' => array_values($cards_to_revive),
        'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
        'graveyard_cards' => $this->getGraveyardCardsNewestFirst()
      ));
      self::notifyPlayer($player_id, 'newBelievers', '', array('cards' => $cards_to_revive));
    } else {
      self::notifyAllPlayers('greatMercy', clienttranslate('${player_name} tries to use It\'s a Miracle, but the graveyard is empty!'), array(
        'player_name' => self::getActivePlayerName()
      ));
    }

    $this->finishPlayerAction();
  }

  /*
   * Secret Alliance
   * Swap 1 Action Card with target player.
   * Requires UI interaction: Select own card + Select target.
   * Target also needs to select? Or random? Rulebook: mutually exchange.
   * Usually implies both players choose.
   * Implementation:
   * 1. Active player chooses card & target.
   * 2. Target player gets notification & state transition to choose their card to give back.
   * For now, simplified stub.
   */
  function playSecretAlliance($target_id, $card_id_give)
  {
    $player_id = self::getActivePlayerId();
    $target_id = (int) $target_id;
    $card_id_give = (int) $card_id_give;
    $this->assertTargetIsNotWanderer($target_id);

    if ($target_id === $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose another player."));
    }

    $offer_card = $this->action_cards->getCard($card_id_give);
    if (!$offer_card || $offer_card['location'] !== 'hand' || (int) $offer_card['location_arg'] !== $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose an Action card from your hand to exchange."));
    }
    if ((string) $offer_card['type'] === 'secret_alliance') {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance itself cannot be the exchanged card."));
    }
    if ($this->action_cards->countCardInLocation('hand', $target_id) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target player has no Action cards to exchange."));
    }

    self::setGameStateValue('secret_alliance_attacker_id', $player_id);
    self::setGameStateValue('secret_alliance_target_id', $target_id);
    self::setGameStateValue('secret_alliance_attacker_card_id', $card_id_give);

    self::notifyAllPlayers('secretAllianceStarted', clienttranslate('${player_name} starts Secret Alliance with ${target_name}.'), array(
      'player_name' => self::getPlayerNameById($player_id),
      'target_name' => self::getPlayerNameById($target_id),
      'target_id' => (int) $target_id
    ));

    $this->gamestate->changeActivePlayer($target_id);
    $this->gamestate->nextState('secretAllianceTargetChoice');
  }

  function playBreakingFaith($target_player_id)
  {
    $player_id = self::getActivePlayerId();
    $target_player_id = (int) $target_player_id;
    $this->assertTargetIsNotWanderer($target_player_id);
    if ($target_player_id === $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose another player."));
    }

    $attacker_sect = $this->getPlayerSect($player_id);
    $target_sect = $this->getPlayerSect($target_player_id);
    if ($attacker_sect < 0 || $attacker_sect !== $target_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Breaking Faith can only target players in your own sect."));
    }

    $attacker_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    $target_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $target_player_id");
    $sect_leader = $this->getSectLeaderId($attacker_sect, $player_id);

    if ($attacker_role === 1) {
      if ($target_player_id !== $sect_leader) {
        throw new BgaVisibleSystemException(clienttranslate("Follower can only target sect leader with Breaking Faith."));
      }
    } elseif ($attacker_role === 0) {
      if ($target_role !== 1) {
        throw new BgaVisibleSystemException(clienttranslate("Leader can only target a follower with Breaking Faith."));
      }
    } else {
      throw new BgaVisibleSystemException(clienttranslate("Wanderer cannot use Breaking Faith."));
    }

    self::setGameStateValue('war_attacker_id', (int) $player_id);
    self::setGameStateValue('war_defender_id', (int) $target_player_id);
    self::setGameStateValue('war_type', 4);
    self::setGameStateValue('breaking_faith_defended', 0);
    self::setGameStateValue('war_attack_blocked', 0);

    self::notifyAllPlayers('breakingFaithStart', clienttranslate('${player_name} uses Breaking Faith on ${target_name}.'), array(
      'player_name' => self::getPlayerNameById($player_id),
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
  function playWitchHunt($target_player_id, $believer_type)
  {
    $player_id = self::getActivePlayerId();
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    if ($believer_type === null || $believer_type < 1 || $believer_type > 5) {
      throw new BgaVisibleSystemException(clienttranslate("Choose a Believer type for Witch Hunt"));
    }

    $target_sect = $this->getPlayerSect($target_player_id);
    $attacker_sect = $this->getPlayerSect($player_id);
    if ($target_sect < 0 || $target_sect === $attacker_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Witch Hunt must target another sect"));
    }

    // Store Witch Hunt context and resolve via defense flow.
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id); // used to infer sect
    self::setGameStateValue('war_type', 8); // 8 = Witch Hunt
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_card_defender', (int) $believer_type); // reuse as targeted believer type

    self::notifyAllPlayers('witchHuntStart', clienttranslate('${player_name} launches Witch Hunt against Sect ${target_sect} (type: ${type}).'), array(
      'player_name' => self::getActivePlayerName(),
      'target_name' => self::getPlayerNameById($target_player_id),
      'target_player_id' => $target_player_id,
      'target_sect' => $target_sect,
      'type' => $this->type_labels[$believer_type]['name'],
      'believer_type' => (int) $believer_type
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
  function playSpreadRumors($target_player_id)
  {
    $player_id = self::getActivePlayerId();
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    $attacker_sect = $this->getPlayerSect($player_id);
    $target_sect = $this->getPlayerSect($target_player_id);
    if ($target_sect < 0 || $target_sect === $attacker_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Spread Rumors must target another sect"));
    }

    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id);
    self::setGameStateValue('war_type', 9); // 9 = Spread Rumors
    self::setGameStateValue('war_attack_blocked', 0);

    self::notifyAllPlayers('spreadRumorsStart', clienttranslate('${player_name} spreads rumors against Sect ${target_sect}.'), array(
      'player_name' => self::getActivePlayerName(),
      'player_id' => $player_id,
      'target_player_id' => $target_player_id,
      'target_sect' => $target_sect
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Faith Debate
   * Current implementation: target one player and steal 1 random Believer.
   * This keeps the card functional in live testing until the full duel/max-5 logic is added.
   */
  function playFaithDebate($target_player_id)
  {
    $player_id = self::getActivePlayerId();
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    $attacker_sect = $this->getPlayerSect($player_id);
    $defender_sect = $this->getPlayerSect($target_player_id);
    if ($attacker_sect < 0 || $defender_sect < 0 || $attacker_sect === $defender_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Faith Debate must target another sect"));
    }
    if ($this->countSectHandBelievers($attacker_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Your sect has no Believers for Faith Debate"));
    }
    if ($this->countSectHandBelievers($defender_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target sect has no Believers for Faith Debate"));
    }

    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id);
    self::setGameStateValue('war_type', 7); // 7 = Faith Debate (mental)
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    self::setGameStateValue('debate_round', 0);

    self::notifyAllPlayers('faithDebateStart', clienttranslate('${player_name} starts a Faith Debate: Sect ${attacker_sect} vs Sect ${defender_sect} (max 5 rounds).'), array(
      'player_name' => self::getActivePlayerName(),
      'target_name' => self::getPlayerNameById($target_player_id),
      'player_id' => $player_id,
      'target_player_id' => $target_player_id,
      'attacker_sect' => $attacker_sect,
      'defender_sect' => $defender_sect
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Faith War
   * Declare war on a target Sect. Initiates a multi-active state where
   * all members of both Sects select a Believer card for combat.
   */
  function playFaithWar($target_player_id)
  {
    $player_id = self::getActivePlayerId();
    $this->assertTargetIsNotWanderer($target_player_id);

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    $attacker_sect = $this->getPlayerSect($player_id);
    $defender_sect = $this->getPlayerSect($target_player_id);
    if ($attacker_sect < 0 || $defender_sect < 0 || $attacker_sect === $defender_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Faith War must target another sect"));
    }
    if ($this->countSectHandBelievers($attacker_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Your sect has no Believers to start a Faith War"));
    }
    if ($this->countSectHandBelievers($defender_sect) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("Target sect has no Believers to fight with"));
    }

    // Store state context (current flow is a 1v1 duel loop)
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id);
    self::setGameStateValue('war_type', 2); // 2 = Faith War (physical attack)
    self::setGameStateValue('war_attack_blocked', 0);
    $this->resetAllWarDeathCounters();

    self::notifyAllPlayers('faithWarStart', clienttranslate('${player_name} declares a Faith War: Sect ${attacker_sect} vs Sect ${defender_sect}!'), array(
      'player_name' => self::getActivePlayerName(),
      'target_name' => self::getPlayerNameById($target_player_id),
      'player_id' => $player_id,
      'target_player_id' => $target_player_id,
      'attacker_sect' => $attacker_sect,
      'defender_sect' => $defender_sect
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Martyrdom
   * AoE Physical Attack. Attacker sacrifices 1 believer.
   * All others choose 1 believer. Draw/Lose = Death for defender.
   */
  function playMartyrdom($believer_id)
  {
    $player_id = self::getActivePlayerId();
    $believer_id = (int) $believer_id;
    $attacker_card = $this->believer_cards->getCard($believer_id);
    if (!$attacker_card || $attacker_card['location'] !== 'hand' || (int) $attacker_card['location_arg'] !== (int) $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Select a believer from your hand for Martyrdom"));
    }

    // Store context
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_card_attacker', $believer_id);
    self::setGameStateValue('war_type', 3); // 3 = Martyrdom
    self::setGameStateValue('war_attack_blocked', 0);
    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0");

    // Attacker believer is marked for death (but stays on table for comparison)
    $this->believer_cards->moveCard($believer_id, 'cardsontable', $player_id);

    self::notifyAllPlayers('martyrdomAttackerCommitted', '', array(
      'player_id' => $player_id,
      'player_name' => self::getActivePlayerName(),
      'card_id' => $believer_id,
      'card_type' => $attacker_card['type'],
      'sect_id' => (int) $this->getPlayerSect((int) $player_id)
    ));

    self::notifyAllPlayers('martyrdomStart', clienttranslate('${player_name} initiates Martyrdom! Everyone else must defend.'), array(
      'player_name' => self::getActivePlayerName(),
      'player_id' => (int) $player_id
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Conspiracy
   * AoE Mental Attack. Attacker sends 1 believer to snatch others.
   */
  function playConspiracy($believer_id)
  {
    $player_id = self::getActivePlayerId();
    $believer_id = (int) $believer_id;
    $attacker_card = $this->believer_cards->getCard($believer_id);
    if (!$attacker_card || $attacker_card['location'] !== 'hand' || (int) $attacker_card['location_arg'] !== (int) $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("Select a believer from your hand for Conspiracy"));
    }

    // Store context
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_card_attacker', $believer_id);
    self::setGameStateValue('war_type', 6); // 6 = Conspiracy
    self::setGameStateValue('war_attack_blocked', 0);
    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0");

    $this->believer_cards->moveCard($believer_id, 'cardsontable', $player_id);
    self::notifyAllPlayers('conspiracyBelieverCommitted', '', array(
      'player_id' => $player_id,
      'player_name' => self::getPlayerNameById($player_id),
      'card_id' => $believer_id,
      'card_type' => $attacker_card['type'],
      'sect_id' => (int) $this->getPlayerSect((int) $player_id)
    ));

    self::notifyAllPlayers('conspiracyStart', clienttranslate('${player_name} spreads a Conspiracy! Everyone else must defend.'), array(
      'player_name' => self::getActivePlayerName(),
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
            self::notifyAllPlayers('skillAutoDefense', clienttranslate('${player_name} is protected; this sect auto-defends.'), [
              'player_id' => $auto_defender_pid,
              'player_name' => self::getPlayerNameById($auto_defender_pid),
              'sect_id' => (int) $sect,
              'defense_kind' => $defense_kind
            ]);
          }
          continue;
        }

        $holders = [];
        foreach ($member_ids as $pid) {
          $has_defense = false;
          $defense_cards = $this->action_cards->getCardsInLocation('hand', (int) $pid);
          foreach ($defense_cards as $c) {
            if (($war_type == 3 && $c['type'] == 'great_mercy') || ($war_type == 6 && $c['type'] == 'firm_faith')) {
              $has_defense = true;
              break;
            }
          }
          if ($has_defense) $holders[] = (int) $pid;
        }

        if (empty($holders)) {
          $target_sects_without_defense[] = (int) $sect;
        } else {
          $target_sects_with_defense[] = (int) $sect;
          $targets = array_merge($targets, $holders);
        }
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
        self::notifyAllPlayers('defenseDecisionPhase', clienttranslate('Waiting for sect defense decisions.'), [
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
        self::notifyAllPlayers('defenseDecisionPhase', clienttranslate('Waiting for defenders to decide whether to defend.'), [
          'phase' => 'defense_prompt',
          'defense_kind' => $defense_kind,
          'scope' => 'player',
          'defender_ids' => $targets,
          'defender_names' => $target_names
        ]);
      }
      $this->gamestate->setPlayersMultiactive($targets, 'nextDefenseStep');
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
    $card = $this->action_cards->getCard($card_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You do not have this defense card in hand"));
    }

    $war_type = self::getGameStateValue('war_type');
    $valid_types = ($war_type == 1 || $war_type == 2 || $war_type == 3) ? ['great_mercy'] : (($war_type == 4) ? ['breaking_faith'] : ['firm_faith']);
    if (!in_array($card['type'], $valid_types)) {
      throw new BgaVisibleSystemException(clienttranslate("This is not a valid defense card for the current attack"));
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
    self::notifyAllPlayers('defensePlayed', clienttranslate('${player_name} uses a defense card'), array(
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById($player_id),
      'card_id' => (int) $card_id,
      'card_type' => (string) $card['type'],
      'moved_to_discard' => (int) $moved_to_discard,
      'sect_id' => (int) $this->getPlayerSect((int) $player_id)
    ));

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

    $this->gamestate->setPlayerNonMultiactive($player_id, 'nextDefenseStep');
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
      self::notifyAllPlayers('passDefense', clienttranslate('A defender chooses not to defend.'), array(
        'anonymous' => true
      ));
    } else {
      self::notifyAllPlayers('passDefense', clienttranslate('${player_name} does not defend'), array(
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
        $blocked_message = clienttranslate('Spread Rumors is blocked by defense and ends immediately.');
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
      self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0, player_is_martyrdom_rep = 0");

      self::notifyAllPlayers('combatBlocked', $blocked_message, [
        'war_type' => $war_type
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
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_leader = $this->getSectLeaderId($attacker_sect, $attacker_id);
    $defender_leader = $this->getSectLeaderId($defender_sect, $defender_id);
    $attacker_remaining = $this->countSectHandBelievers($attacker_sect);
    $defender_remaining = $this->countSectHandBelievers($defender_sect);

    if ($attacker_remaining <= 0 || $defender_remaining <= 0) {
      self::setGameStateValue('war_attacker_id', 0);
      self::setGameStateValue('war_defender_id', 0);
      self::setGameStateValue('war_card_attacker', 0);
      self::setGameStateValue('war_card_defender', 0);
      self::setGameStateValue('war_type', 0);
      self::setGameStateValue('war_attack_blocked', 0);
      self::setGameStateValue('war_rep_attacker_id', 0);
      self::setGameStateValue('war_rep_defender_id', 0);
      self::notifyAllPlayers('faithWarEnd', clienttranslate('Faith War ended. One side has no believers left.'), [
        'attacker_sect' => $attacker_sect,
        'defender_sect' => $defender_sect,
        'attacker_remaining' => $attacker_remaining,
        'defender_remaining' => $defender_remaining
      ]);
      $this->gamestate->nextState('endWar');
      return;
    }

    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);

    $leaders_to_activate = [];
    $attacker_choices = $this->getSectCombatReadyPlayerIds($attacker_sect);
    $defender_choices = $this->getSectCombatReadyPlayerIds($defender_sect);

    if (count($attacker_choices) === 1) {
      self::setGameStateValue('war_rep_attacker_id', (int) $attacker_choices[0]);
      self::notifyAllPlayers('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their sect.'), [
        'leader_id' => $attacker_leader,
        'leader_name' => self::getPlayerNameById($attacker_leader),
        'representative_id' => (int) $attacker_choices[0],
        'representative_name' => self::getPlayerNameById((int) $attacker_choices[0])
      ]);
      self::notifyPlayer((int) $attacker_choices[0], 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
        'leader_id' => $attacker_leader,
        'leader_name' => self::getPlayerNameById($attacker_leader),
        'representative_id' => (int) $attacker_choices[0]
      ]);
    } else {
      $leaders_to_activate[] = (int) $attacker_leader;
    }

    if (count($defender_choices) === 1) {
      self::setGameStateValue('war_rep_defender_id', (int) $defender_choices[0]);
      self::notifyAllPlayers('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their sect.'), [
        'leader_id' => $defender_leader,
        'leader_name' => self::getPlayerNameById($defender_leader),
        'representative_id' => (int) $defender_choices[0],
        'representative_name' => self::getPlayerNameById((int) $defender_choices[0])
      ]);
      self::notifyPlayer((int) $defender_choices[0], 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
        'leader_id' => $defender_leader,
        'leader_name' => self::getPlayerNameById($defender_leader),
        'representative_id' => (int) $defender_choices[0]
      ]);
    } else {
      $leaders_to_activate[] = (int) $defender_leader;
    }

    $leaders_to_activate = array_values(array_unique($leaders_to_activate));

    self::notifyAllPlayers('faithWarRepresentativePhase', clienttranslate('Sect leaders choose who represents their sect this round.'), [
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

    $allowed = [];
    if ($player_id === $attacker_leader) {
      $allowed = $this->getSectCombatReadyPlayerIds($attacker_sect);
      if (!in_array($representative_id, $allowed, true)) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid representative for your sect"));
      }
      self::setGameStateValue('war_rep_attacker_id', $representative_id);
    } elseif ($player_id === $defender_leader) {
      $allowed = $this->getSectCombatReadyPlayerIds($defender_sect);
      if (!in_array($representative_id, $allowed, true)) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid representative for your sect"));
      }
      self::setGameStateValue('war_rep_defender_id', $representative_id);
    } else {
      throw new BgaVisibleSystemException(clienttranslate("Only sect leaders can choose representatives"));
    }

    self::notifyAllPlayers('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their sect.'), [
      'leader_id' => $player_id,
      'leader_name' => self::getPlayerNameById($player_id),
      'representative_id' => $representative_id,
      'representative_name' => self::getPlayerNameById($representative_id)
    ]);
    self::notifyPlayer($representative_id, 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
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

    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);

    $leaders_to_activate = [];
    $attacker_choices = $this->getSectCombatReadyPlayerIds($attacker_sect);
    $defender_choices = $this->getSectCombatReadyPlayerIds($defender_sect);

    if (count($attacker_choices) === 1) {
      self::setGameStateValue('war_rep_attacker_id', (int) $attacker_choices[0]);
      self::notifyAllPlayers('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Faith Debate.'), [
        'leader_name' => self::getPlayerNameById($attacker_leader),
        'representative_name' => self::getPlayerNameById((int) $attacker_choices[0]),
        'representative_id' => (int) $attacker_choices[0]
      ]);
    } else {
      $leaders_to_activate[] = (int) $attacker_leader;
    }

    if (count($defender_choices) === 1) {
      self::setGameStateValue('war_rep_defender_id', (int) $defender_choices[0]);
      self::notifyAllPlayers('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Faith Debate.'), [
        'leader_name' => self::getPlayerNameById($defender_leader),
        'representative_name' => self::getPlayerNameById((int) $defender_choices[0]),
        'representative_id' => (int) $defender_choices[0]
      ]);
    } else {
      $leaders_to_activate[] = (int) $defender_leader;
    }

    if (empty($leaders_to_activate)) {
      $this->gamestate->nextState('chooseDone');
      return;
    }

    self::notifyAllPlayers('faithDebateRepresentativePhase', clienttranslate('Sect leaders choose representatives for Faith Debate.'), []);
    $this->gamestate->setPlayersMultiactive(array_values(array_unique($leaders_to_activate)), 'chooseDone');
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

    if ($player_id === $attacker_leader) {
      $allowed = $this->getSectCombatReadyPlayerIds($attacker_sect);
      if (!in_array($representative_id, $allowed, true)) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid representative for your sect"));
      }
      self::setGameStateValue('war_rep_attacker_id', $representative_id);
    } elseif ($player_id === $defender_leader) {
      $allowed = $this->getSectCombatReadyPlayerIds($defender_sect);
      if (!in_array($representative_id, $allowed, true)) {
        throw new BgaVisibleSystemException(clienttranslate("Invalid representative for your sect"));
      }
      self::setGameStateValue('war_rep_defender_id', $representative_id);
    } else {
      throw new BgaVisibleSystemException(clienttranslate("Only sect leaders can choose representatives"));
    }

    self::notifyAllPlayers('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Faith Debate.'), [
      'leader_name' => self::getPlayerNameById($player_id),
      'representative_name' => self::getPlayerNameById($representative_id),
      'representative_id' => $representative_id
    ]);
    $this->gamestate->setPlayerNonMultiactive($player_id, 'chooseDone');
  }

  function chooseSecretAllianceCard($card_id)
  {
    self::checkAction("chooseSecretAllianceCard");
    $target_id = (int) self::getActivePlayerId();
    $attacker_id = (int) self::getGameStateValue('secret_alliance_attacker_id');
    $expected_target_id = (int) self::getGameStateValue('secret_alliance_target_id');
    $attacker_card_id = (int) self::getGameStateValue('secret_alliance_attacker_card_id');
    $card_id = (int) $card_id;

    if ($attacker_id <= 0 || $expected_target_id <= 0 || $target_id !== $expected_target_id) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance state is invalid."));
    }

    $target_card = $this->action_cards->getCard($card_id);
    if (!$target_card || $target_card['location'] !== 'hand' || (int) $target_card['location_arg'] !== $target_id) {
      throw new BgaVisibleSystemException(clienttranslate("Choose one Action card from your hand."));
    }

    $attacker_card = $this->action_cards->getCard($attacker_card_id);
    if (!$attacker_card || $attacker_card['location'] !== 'hand' || (int) $attacker_card['location_arg'] !== $attacker_id) {
      throw new BgaVisibleSystemException(clienttranslate("Secret Alliance offered card is no longer available."));
    }

    $this->action_cards->moveCard($attacker_card_id, 'hand', $target_id);
    $this->action_cards->moveCard($card_id, 'hand', $attacker_id);

    self::notifyPlayer($attacker_id, 'actionCardsDiscarded', '', [
      'player_id' => (int) $attacker_id,
      'count' => 1,
      'card_ids' => [(int) $attacker_card_id]
    ]);
    self::notifyPlayer($target_id, 'actionCardsDiscarded', '', [
      'player_id' => (int) $target_id,
      'count' => 1,
      'card_ids' => [(int) $card_id]
    ]);
    self::notifyPlayer($attacker_id, 'newActionCards', '', [
      'cards' => [['id' => (int) $target_card['id'], 'type' => (string) $target_card['type']]]
    ]);
    self::notifyPlayer($target_id, 'newActionCards', '', [
      'cards' => [['id' => (int) $attacker_card['id'], 'type' => (string) $attacker_card['type']]]
    ]);

    self::notifyAllPlayers('secretAllianceExchanged', clienttranslate('${player_name} and ${target_name} exchange one Action card each.'), [
      'player_name' => self::getPlayerNameById($attacker_id),
      'target_name' => self::getPlayerNameById($target_id),
      'attacker_id' => (int) $attacker_id,
      'target_id' => (int) $target_id
    ]);

    self::setGameStateValue('secret_alliance_attacker_id', 0);
    self::setGameStateValue('secret_alliance_target_id', 0);
    self::setGameStateValue('secret_alliance_attacker_card_id', 0);

    $this->gamestate->changeActivePlayer($attacker_id);
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function argProphetSkillPrompt()
  {
    $drawer_id = (int) self::getGameStateValue('prophet_pending_drawer_id');
    $draw_count = (int) self::getGameStateValue('prophet_pending_draw_count');
    $source_code = (int) self::getGameStateValue('prophet_pending_source');
    $source_key = $this->getProphetPendingSourceKey($source_code);
    $source_name = ($source_key === 'divine_inspire') ? 'Divine Inspiration' : 'Have a Charity';
    return [
      'drawer_id' => (int) $drawer_id,
      'drawer_name' => self::getPlayerNameById((int) $drawer_id),
      'draw_count' => (int) $draw_count,
      'source_key' => $source_key,
      'source_name' => $source_name
    ];
  }

  function argProphetGuess()
  {
    $args = $this->argProphetSkillPrompt();
    $args['believer_types'] = $this->type_labels;
    return $args;
  }

  function prophetEnableSkill()
  {
    self::checkAction('prophetEnableSkill');
    $player_id = (int) self::getCurrentPlayerId();
    $pending_prophet_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    if ($player_id <= 0 || $player_id !== $pending_prophet_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the Prophet responder."));
    }

    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card || (int) $skill_card['type'] !== 4) {
      throw new BgaVisibleSystemException(clienttranslate("Prophet skill is not available."));
    }
    $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");
    if ($sealed === 1) {
      throw new BgaVisibleSystemException(clienttranslate("Your skill is sealed right now."));
    }

    $just_revealed = $this->revealSkill($player_id);
    if ($just_revealed) {
      $skill_name = isset($this->skill_labels[4]['name'])
        ? (string) $this->skill_labels[4]['name']
        : 'Prophet';
      self::notifyAllPlayers('skillRevealed', clienttranslate('${player_name} reveals skill: ${skill_name}.'), [
        'player_id' => (int) $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'skill_type' => 4,
        'skill_name' => $skill_name,
        'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
      ]);
    }

    self::notifyPlayer($player_id, 'skillStateUpdated', '', [
      'skill_state' => $this->getSkillStateForPlayer($player_id)
    ]);
    $this->gamestate->nextState('toGuess');
  }

  function prophetSkipSkill()
  {
    self::checkAction('prophetSkipSkill');
    $player_id = (int) self::getCurrentPlayerId();
    $pending_prophet_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    if ($player_id <= 0 || $player_id !== $pending_prophet_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the Prophet responder."));
    }
    self::setGameStateValue('prophet_pending_guess_type', 0);
    $this->gamestate->nextState('resolve');
  }

  function prophetGuessBelieverType($believer_type)
  {
    self::checkAction('prophetGuessBelieverType');
    $player_id = (int) self::getCurrentPlayerId();
    $pending_prophet_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    if ($player_id <= 0 || $player_id !== $pending_prophet_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the Prophet responder."));
    }
    $skill_card = $this->getPlayerSkillCard($player_id);
    if (!$skill_card || (int) $skill_card['type'] !== 4 || !$this->isSkillRevealed($player_id)) {
      throw new BgaVisibleSystemException(clienttranslate("Prophet is not active."));
    }
    $believer_type = (int) $believer_type;
    if ($believer_type < 1 || $believer_type > 5) {
      throw new BgaVisibleSystemException(clienttranslate("Choose a valid Believer type."));
    }
    self::setGameStateValue('prophet_pending_guess_type', (int) $believer_type);
    $this->gamestate->nextState('resolve');
  }

  function prophetPassGuess()
  {
    self::checkAction('prophetPassGuess');
    $player_id = (int) self::getCurrentPlayerId();
    $pending_prophet_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    if ($player_id <= 0 || $player_id !== $pending_prophet_id) {
      throw new BgaVisibleSystemException(clienttranslate("You are not the Prophet responder."));
    }
    self::setGameStateValue('prophet_pending_guess_type', 0);
    $this->gamestate->nextState('resolve');
  }

  function stResolveProphetPrediction()
  {
    $drawer_id = (int) self::getGameStateValue('prophet_pending_drawer_id');
    $draw_count = max(0, (int) self::getGameStateValue('prophet_pending_draw_count'));
    $source_code = (int) self::getGameStateValue('prophet_pending_source');
    $prophet_id = (int) self::getGameStateValue('prophet_pending_prophet_id');
    $guess_type = (int) self::getGameStateValue('prophet_pending_guess_type');
    $source_extra = max(0, (int) self::getGameStateValue('prophet_pending_extra'));

    if ($drawer_id <= 0 || $prophet_id <= 0) {
      $this->clearProphetPendingContext();
      $this->gamestate->nextState('playActionCard');
      return;
    }

    $source_key = $this->getProphetPendingSourceKey($source_code);
    $deck_before = (int) $this->believer_cards->countCardInLocation('deck');

    $drawer_cards = [];
    $prophet_cards = [];
    $first_card_type = 0;
    $guess_correct = 0;
    $first_receiver_id = 0;

    if ($draw_count > 0) {
      $remaining = $draw_count;
      if ($guess_type > 0 && (int) $this->believer_cards->countCardInLocation('deck') > 0) {
        $first_pick = array_values($this->believer_cards->pickCards(1, 'deck', $drawer_id));
        if (!empty($first_pick)) {
          $first_card = $first_pick[0];
          $first_card_type = (int) $first_card['type'];
          $first_receiver_id = (int) $drawer_id;
          if ($first_card_type === (int) $guess_type) {
            $guess_correct = 1;
            $this->believer_cards->moveCard((int) $first_card['id'], 'hand', $prophet_id);
            $moved = $this->believer_cards->getCard((int) $first_card['id']);
            $prophet_cards[] = $moved ? $moved : $first_card;
            $first_receiver_id = (int) $prophet_id;
          } else {
            $drawer_cards[] = $first_card;
          }
          $remaining = max(0, $remaining - 1);
        }
      }

      if ($remaining > 0) {
        $rest = array_values($this->believer_cards->pickCards($remaining, 'deck', $drawer_id));
        $drawer_cards = array_values(array_merge($drawer_cards, $rest));
      }
    }

    $drawer_gain = count($drawer_cards);
    $prophet_gain = count($prophet_cards);
    $total_drawn = $drawer_gain + $prophet_gain;
    $insufficient_deck = ((int) $total_drawn < (int) $draw_count) ? 1 : 0;
    $remaining_draw_n = max(0, (int) $total_drawn - ($first_card_type > 0 ? 1 : 0));

    if ($source_key === 'divine_inspire') {
      self::notifyAllPlayers('divineInspiration', clienttranslate('${player_name} uses Divine Inspiration: discards ${discard_n} Action card(s) and draws ${draw_n} Believer card(s).'), array(
        'player_name' => self::getPlayerNameById($drawer_id),
        'player_id' => (int) $drawer_id,
        'discard_n' => (int) $source_extra,
        'draw_n' => (int) $drawer_gain,
        'draw_total_n' => (int) $total_drawn,
        'deck_before' => (int) $deck_before,
        'insufficient_deck' => (int) $insufficient_deck
      ));
    } else {
      self::notifyAllPlayers('haveACharity', clienttranslate('${player_name} performs Charity and draws ${n} Believer card(s).'), array(
        'player_name' => self::getPlayerNameById($drawer_id),
        'player_id' => (int) $drawer_id,
        'n' => (int) $drawer_gain,
        'n_total' => (int) $total_drawn
      ));
    }

    if (!empty($drawer_cards)) {
      self::notifyPlayer($drawer_id, 'newBelievers', '', array('cards' => array_values($drawer_cards)));
    }
    if (!empty($prophet_cards)) {
      self::notifyPlayer($prophet_id, 'newBelievers', '', array('cards' => array_values($prophet_cards)));
    }

    self::notifyAllPlayers('prophetPredictionResolved', clienttranslate('Prophet prediction is resolved.'), [
      'drawer_id' => (int) $drawer_id,
      'drawer_name' => self::getPlayerNameById($drawer_id),
      'prophet_id' => (int) $prophet_id,
      'prophet_name' => self::getPlayerNameById($prophet_id),
      'source_key' => $source_key,
      'requested_draw_n' => (int) $draw_count,
      'drawer_gain_n' => (int) $drawer_gain,
      'prophet_gain_n' => (int) $prophet_gain,
      'guess_type' => (int) $guess_type,
      'revealed_type' => (int) $first_card_type,
      'guess_correct' => (int) $guess_correct,
      'first_receiver_id' => (int) $first_receiver_id,
      'remaining_draw_n' => (int) $remaining_draw_n
    ]);

    $this->clearProphetPendingContext();
    $this->gamestate->changeActivePlayer((int) $drawer_id);
    $this->finishPlayerAction();
  }

  function argHolyRebirthPrompt()
  {
    $player_id = (int) self::getGameStateValue('holy_rebirth_pending_player_id');
    $deaths = max(0, (int) self::getGameStateValue('holy_rebirth_pending_deaths'));
    $source_code = (int) self::getGameStateValue('holy_rebirth_pending_source');
    $source_key = $this->getHolyRebirthSourceKey($source_code);
    $source_name = ($source_key === 'faith_war') ? 'Faith War' : 'KABOOM!';
    return [
      'player_id' => (int) $player_id,
      'player_name' => self::getPlayerNameById((int) $player_id),
      'deaths' => (int) $deaths,
      'source_key' => $source_key,
      'source_name' => $source_name
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

    if ($player_id > 0 && $use_skill) {
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
      $sealed = (int) self::getUniqueValueFromDB("SELECT player_is_skill_sealed FROM player WHERE player_id = $player_id");
      $skill_card = $this->getPlayerSkillCard($player_id);

      if (
        $role !== 2 &&
        $sealed === 0 &&
        $skill_card &&
        (int) $skill_card['type'] === 5 &&
        !$this->isHolyRebirthUsedThisTurn($player_id)
      ) {
        $discarded_cards = array_values($this->believer_cards->getCardsInLocation('discard', null, 'location_arg DESC'));
        $take = min(3, count($discarded_cards));
        if ($take > 0) {
          $cards_to_revive = array_slice($discarded_cards, 0, $take);
          $ids = array_map(function ($card) {
            return (int) $card['id'];
          }, $cards_to_revive);
          $this->believer_cards->moveCards($ids, 'hand', $player_id);
          $revived_cards = array_values($cards_to_revive);
          $revived_n = (int) count($revived_cards);
          $used = 1;
          $this->markHolyRebirthUsedThisTurn($player_id);
          $this->incrementSkillUseCount($skill_card, 1);
          self::notifyPlayer($player_id, 'newBelievers', '', ['cards' => $revived_cards]);
          self::notifyPlayer($player_id, 'skillStateUpdated', '', [
            'skill_state' => $this->getSkillStateForPlayer($player_id)
          ]);
        }
      }
    }

    if ($player_id > 0) {
      if ($used === 1) {
        self::notifyAllPlayers('skillHolyRebirth', clienttranslate('${player_name} uses Holy Rebirth and revives ${n} Believer(s) after ${source_name} (${deaths} deaths).'), [
          'player_id' => (int) $player_id,
          'player_name' => self::getPlayerNameById($player_id),
          'source_key' => $source_key,
          'source_name' => ($source_key === 'faith_war') ? 'Faith War' : 'KABOOM!',
          'deaths' => (int) $deaths,
          'used' => 1,
          'revived_n' => (int) $revived_n,
          'revived_cards' => array_values($revived_cards),
          'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
          'graveyard_cards' => $this->getGraveyardCardsNewestFirst(),
          'skill_state_actor' => $this->getSkillStateForPlayer($player_id)
        ]);
      } else {
        self::notifyAllPlayers('skillHolyRebirth', clienttranslate('${player_name} does not use Holy Rebirth after ${source_name} (${deaths} deaths).'), [
          'player_id' => (int) $player_id,
          'player_name' => self::getPlayerNameById($player_id),
          'source_key' => $source_key,
          'source_name' => ($source_key === 'faith_war') ? 'Faith War' : 'KABOOM!',
          'deaths' => (int) $deaths,
          'used' => 0,
          'revived_n' => 0,
          'revived_cards' => [],
          'graveyard_count' => (int) $this->believer_cards->countCardInLocation('discard'),
          'graveyard_cards' => $this->getGraveyardCardsNewestFirst()
        ]);
      }
    }

    $this->clearHolyRebirthPendingContext();
    $this->notifyPublicCountsSync();

    if ($resume_player_id > 0) {
      $this->gamestate->changeActivePlayer((int) $resume_player_id);
    }
    if ($resume_mode === 1) {
      $this->finishPlayerAction();
      return;
    }
    $this->routeAfterActionWindowCheck('playerTurn');
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
        self::notifyAllPlayers('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Faith Debate.'), [
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
        self::notifyAllPlayers('faithDebateRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Faith Debate.'), [
          'leader_name' => self::getPlayerNameById($leader_id),
          'representative_name' => self::getPlayerNameById($defender_rep_id),
          'representative_id' => $defender_rep_id,
          'auto_assigned' => 1
        ]);
      }
    }

    if ($attacker_rep_id <= 0 || $defender_rep_id <= 0) {
      $this->finalizeFaithDebate((int) self::getGameStateValue('debate_round'));
      return;
    }

    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    $this->gamestate->setPlayersMultiactive([$attacker_rep_id, $defender_rep_id], 'nextDebateStep');

    $round_no = (int) self::getGameStateValue('debate_round') + 1;
    self::notifyAllPlayers('faithDebateRound', clienttranslate('Faith Debate round ${round}/5: representatives choose believers.'), [
      'round' => $round_no,
      'attacker_rep_id' => $attacker_rep_id,
      'defender_rep_id' => $defender_rep_id,
      'attacker_rep_name' => self::getPlayerNameById($attacker_rep_id),
      'defender_rep_name' => self::getPlayerNameById($defender_rep_id)
    ]);
  }

  function stResolveFaithDebateDuel()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

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
    $owner_a = (int) $card_a['location_arg'];
    $owner_b = (int) $card_b['location_arg'];
    $result = $this->compareBelievers((int) $card_a['type'], (int) $card_b['type'], false);
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
      self::notifyAllPlayers('faithDebateResult', clienttranslate('${winner_name} wins Faith Debate and snatches 1 believer.'), [
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
        'card_b' => $card_b
      ]);
    } elseif ($result['winner'] === -1) {
      $this->believer_cards->moveCard($card_a_id, 'debateused', $owner_b);
      $this->believer_cards->moveCard($card_b_id, 'debateused', $owner_b);
      $winner_id = $owner_b;
      $loser_id = $owner_a;
      $result_type = 'defender';
      self::notifyAllPlayers('faithDebateResult', clienttranslate('${winner_name} wins Faith Debate and snatches 1 believer.'), [
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
        'card_b' => $card_b
      ]);
    } else {
      $this->believer_cards->moveCard($card_a_id, 'debateused', $owner_a);
      $this->believer_cards->moveCard($card_b_id, 'debateused', $owner_b);
      self::notifyAllPlayers('faithDebateResult', clienttranslate('Faith Debate is a draw. Believers return to owners.'), [
        'result_type' => 'draw',
        'attacker_id' => $owner_a,
        'defender_id' => $owner_b,
        'attacker_name' => self::getPlayerNameById($owner_a),
        'defender_name' => self::getPlayerNameById($owner_b),
        'attacker_gain' => 1,
        'defender_gain' => 1,
        'card_a' => $card_a,
        'card_b' => $card_b
      ]);
    }

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

    self::notifyAllPlayers('faithDebateCardPlayed', '', array(
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
    $debate_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'faith_debate';
    });
    if (!empty($debate_cards)) {
      $this->action_cards->moveCards(array_keys($debate_cards), 'discard');
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
        self::notifyPlayer((int) $owner, 'newBelievers', '', ['cards' => array_values($cards)]);
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
    self::notifyAllPlayers('faithDebateEnd', clienttranslate('Faith Debate ends after ${round} round(s).'), [
      'round' => max(0, (int) $round)
    ]);
    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('endDebate');
  }

  function argChooseConspiracyRepresentative()
  {
    $player_id = (int) self::getCurrentPlayerId();
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $player_sect = $this->getPlayerSect($player_id);
    $player_leader = $this->getSectLeaderId($player_sect, $player_id);

    if ($player_id !== $player_leader || $player_sect < 0 || $player_sect === $attacker_sect) {
      return ['candidates' => []];
    }

    $defended_sects = [];
    foreach ($this->action_cards->getCardsInLocation('conspdef') as $def_card) {
      $defended_sect = $this->getPlayerSect((int) $def_card['location_arg']);
      if ($defended_sect >= 0) {
        $defended_sects[$defended_sect] = true;
      }
    }
    foreach ($this->getSkillDefendedSectsForAoe(6, (int) $attacker_sect) as $sect_id) {
      $defended_sects[(int) $sect_id] = true;
    }
    if (isset($defended_sects[$player_sect])) {
      return ['candidates' => []];
    }

    $candidates = [];
    foreach ($this->getSectCombatReadyPlayerIds($player_sect) as $pid) {
      $candidates[] = [
        'id' => (int) $pid,
        'name' => self::getPlayerNameById((int) $pid),
        'believer_count' => $this->believer_cards->countCardInLocation('hand', (int) $pid)
      ];
    }

    return ['candidates' => $candidates];
  }

  function stConspiracyChooseRepresentative()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $players = self::loadPlayersBasicInfos();

    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0");

    $defended_sects = [];
    foreach ($this->action_cards->getCardsInLocation('conspdef') as $def_card) {
      $defended_sect = $this->getPlayerSect((int) $def_card['location_arg']);
      if ($defended_sect >= 0) {
        $defended_sects[$defended_sect] = true;
      }
    }
    foreach ($this->getSkillDefendedSectsForAoe(6, (int) $attacker_sect) as $sect_id) {
      $defended_sects[(int) $sect_id] = true;
    }

    $leaders_to_activate = [];
    $processed_sects = [];
    foreach ($players as $pid => $_p) {
      $pid = (int) $pid;
      $sect = $this->getPlayerSect($pid);
      if ($sect < 0 || $sect === $attacker_sect) continue;
      if (isset($processed_sects[$sect])) continue;
      $processed_sects[$sect] = true;
      if (isset($defended_sects[$sect])) continue;

      $candidates = $this->getSectCombatReadyPlayerIds($sect);
      if (empty($candidates)) continue;

      if (count($candidates) === 1) {
        $rep = (int) $candidates[0];
        self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $rep");
        $leader = $this->getSectLeaderId($sect, $rep);
        if ((int) $leader !== (int) $rep) {
          self::notifyAllPlayers('conspiracyRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Conspiracy defense.'), [
            'leader_name' => self::getPlayerNameById($leader),
            'leader_id' => (int) $leader,
            'representative_name' => self::getPlayerNameById($rep),
            'representative_id' => $rep
          ]);
          self::notifyPlayer($rep, 'conspiracyAssignedToYou', clienttranslate('${leader_name} assigns you to defend against Conspiracy.'), [
            'leader_name' => self::getPlayerNameById($leader),
            'leader_id' => (int) $leader,
            'representative_id' => $rep
          ]);
        }
      } else {
        $leaders_to_activate[] = $this->getSectLeaderId($sect, $pid);
      }
    }

    if (empty($leaders_to_activate)) {
      $this->gamestate->nextState('chooseDone');
      return;
    }

    self::notifyAllPlayers('conspiracyRepresentativePhase', clienttranslate('Sect leaders choose who will defend against Conspiracy.'), []);
    $this->gamestate->setPlayersMultiactive(array_values(array_unique(array_map('intval', $leaders_to_activate))), 'chooseDone');
  }

  function argChooseMartyrdomRepresentative()
  {
    $player_id = (int) self::getCurrentPlayerId();
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $player_sect = $this->getPlayerSect($player_id);
    $player_leader = $this->getSectLeaderId($player_sect, $player_id);

    if ($player_id !== $player_leader || $player_sect < 0 || $player_sect === $attacker_sect) {
      return ['candidates' => []];
    }

    $defended_sects = [];
    foreach ($this->action_cards->getCardsInLocation('martyrdef') as $def_card) {
      $defended_sect = $this->getPlayerSect((int) $def_card['location_arg']);
      if ($defended_sect >= 0) {
        $defended_sects[$defended_sect] = true;
      }
    }
    foreach ($this->getSkillDefendedSectsForAoe(3, (int) $attacker_sect) as $sect_id) {
      $defended_sects[(int) $sect_id] = true;
    }
    if (isset($defended_sects[$player_sect])) {
      return ['candidates' => []];
    }

    $candidates = [];
    foreach ($this->getSectCombatReadyPlayerIds($player_sect) as $pid) {
      $candidates[] = [
        'id' => (int) $pid,
        'name' => self::getPlayerNameById((int) $pid),
        'believer_count' => $this->believer_cards->countCardInLocation('hand', (int) $pid)
      ];
    }

    return ['candidates' => $candidates];
  }

  function stMartyrdomChooseRepresentative()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $players = self::loadPlayersBasicInfos();

    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0");

    $defended_sects = [];
    foreach ($this->action_cards->getCardsInLocation('martyrdef') as $def_card) {
      $defended_sect = $this->getPlayerSect((int) $def_card['location_arg']);
      if ($defended_sect >= 0) {
        $defended_sects[$defended_sect] = true;
      }
    }
    foreach ($this->getSkillDefendedSectsForAoe(3, (int) $attacker_sect) as $sect_id) {
      $defended_sects[(int) $sect_id] = true;
    }

    $leaders_to_activate = [];
    $processed_sects = [];
    foreach ($players as $pid => $_p) {
      $pid = (int) $pid;
      $sect = $this->getPlayerSect($pid);
      if ($sect < 0 || $sect === $attacker_sect) continue;
      if (isset($processed_sects[$sect])) continue;
      $processed_sects[$sect] = true;
      if (isset($defended_sects[$sect])) continue;

      $candidates = $this->getSectCombatReadyPlayerIds($sect);
      if (empty($candidates)) continue;

      if (count($candidates) === 1) {
        $rep = (int) $candidates[0];
        self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 1 WHERE player_id = $rep");
        $leader = $this->getSectLeaderId($sect, $rep);
        if ((int) $leader !== (int) $rep) {
          self::notifyAllPlayers('martyrdomRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Martyrdom.'), [
            'leader_name' => self::getPlayerNameById($leader),
            'leader_id' => (int) $leader,
            'representative_name' => self::getPlayerNameById($rep),
            'representative_id' => $rep
          ]);
          self::notifyPlayer($rep, 'martyrdomAssignedToYou', clienttranslate('${leader_name} assigns you for Martyrdom.'), [
            'leader_name' => self::getPlayerNameById($leader),
            'leader_id' => (int) $leader,
            'representative_id' => $rep
          ]);
        }
      } else {
        $leaders_to_activate[] = $this->getSectLeaderId($sect, $pid);
      }
    }

    if (empty($leaders_to_activate)) {
      $this->gamestate->nextState('chooseDone');
      return;
    }

    self::notifyAllPlayers('martyrdomRepresentativePhase', clienttranslate('Sect leaders choose who will answer Martyrdom.'), []);
    $this->gamestate->setPlayersMultiactive(array_values(array_unique(array_map('intval', $leaders_to_activate))), 'chooseDone');
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
      throw new BgaVisibleSystemException(clienttranslate("Only sect leaders can assign Martyrdom representatives"));
    }
    if ($leader_sect < 0 || $leader_sect === $attacker_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Your sect cannot assign a Martyrdom representative"));
    }

    $candidates = $this->getSectCombatReadyPlayerIds($leader_sect);
    if (!in_array($representative_id, $candidates, true)) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid Martyrdom representative"));
    }

    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0 WHERE player_sect = $leader_sect");
    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 1 WHERE player_id = $representative_id");

    if ((int) $player_id !== (int) $representative_id) {
      self::notifyAllPlayers('martyrdomRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Martyrdom.'), [
        'leader_name' => self::getPlayerNameById($player_id),
        'leader_id' => (int) $player_id,
        'representative_name' => self::getPlayerNameById($representative_id),
        'representative_id' => $representative_id
      ]);
      self::notifyPlayer($representative_id, 'martyrdomAssignedToYou', clienttranslate('${leader_name} assigns you for Martyrdom.'), [
        'leader_name' => self::getPlayerNameById($player_id),
        'leader_id' => (int) $player_id,
        'representative_id' => $representative_id
      ]);
    }

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
      throw new BgaVisibleSystemException(clienttranslate("Only sect leaders can assign Conspiracy defenders"));
    }
    if ($leader_sect < 0 || $leader_sect === $attacker_sect) {
      throw new BgaVisibleSystemException(clienttranslate("Your sect cannot assign a defender for this Conspiracy"));
    }

    $candidates = $this->getSectCombatReadyPlayerIds($leader_sect);
    if (!in_array($representative_id, $candidates, true)) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid Conspiracy defender representative"));
    }

    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 0 WHERE player_sect = $leader_sect");
    self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $representative_id");

    if ((int) $player_id !== (int) $representative_id) {
      self::notifyAllPlayers('conspiracyRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} for Conspiracy defense.'), [
        'leader_name' => self::getPlayerNameById($player_id),
        'leader_id' => (int) $player_id,
        'representative_name' => self::getPlayerNameById($representative_id),
        'representative_id' => $representative_id
      ]);
      self::notifyPlayer($representative_id, 'conspiracyAssignedToYou', clienttranslate('${leader_name} assigns you to defend against Conspiracy.'), [
        'leader_name' => self::getPlayerNameById($player_id),
        'leader_id' => (int) $player_id,
        'representative_id' => $representative_id
      ]);
    }

    $this->gamestate->setPlayerNonMultiactive($player_id, 'chooseDone');
  }

  function stConspiracyChooseBelievers()
  {
    // Safety net: if no representative was marked (edge timing/state issue),
    // auto-assign one combat-ready representative per undefended sect.
    $rep_count = (int) self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_is_conspiracy_rep = 1");
    if ($rep_count <= 0) {
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      $attacker_sect = $this->getPlayerSect($attacker_id);
      $players = self::loadPlayersBasicInfos();

      $defended_sects = [];
      foreach ($this->action_cards->getCardsInLocation('conspdef') as $def_card) {
        $defended_sect = $this->getPlayerSect((int) $def_card['location_arg']);
        if ($defended_sect >= 0) $defended_sects[$defended_sect] = true;
      }
      foreach ($this->getSkillDefendedSectsForAoe(6, (int) $attacker_sect) as $sect_id) {
        $defended_sects[(int) $sect_id] = true;
      }

      $processed_sects = [];
      foreach ($players as $pid => $_p) {
        $pid = (int) $pid;
        $sect = $this->getPlayerSect($pid);
        if ($sect < 0 || $sect === $attacker_sect) continue;
        if (isset($processed_sects[$sect])) continue;
        $processed_sects[$sect] = true;
        if (isset($defended_sects[$sect])) continue;

        $candidates = $this->getSectCombatReadyPlayerIds($sect);
        if (empty($candidates)) continue;
        $rep = (int) $candidates[0];
        self::DbQuery("UPDATE player SET player_is_conspiracy_rep = 1 WHERE player_id = $rep");
      }
    }

    $rep_ids = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_is_conspiracy_rep = 1", true));
    $targets = array_values(array_filter($rep_ids, function ($pid) {
      return $this->believer_cards->countCardInLocation('hand', (int) $pid) > 0;
    }));

    if (empty($targets)) {
      $this->gamestate->nextState('nextStep');
      return;
    }

    self::notifyAllPlayers('conspiracyDefendersChoose', clienttranslate('Conspiracy defenders must choose one believer.'), [
      'target_ids' => $targets
    ]);
    $this->gamestate->setPlayersMultiactive($targets, 'nextStep');
  }

  function stResolveConspiracy()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $attacker_card_id = (int) self::getGameStateValue('war_card_attacker');
    $attacker_card = $this->believer_cards->getCard($attacker_card_id);
    if (!$attacker_card || $attacker_card['location'] !== 'cardsontable') {
      $this->notifyPublicCountsSync();
      $this->routeAfterActionWindowCheck('playerTurn');
      return;
    }

    // Conspiracy rewards/penalties belong to the actual fighter card owner.
    $attacker_owner = (int) $attacker_card['location_arg'];
    $defender_cards = array_values(array_filter(
      $this->believer_cards->getCardsInLocation('cardsontable'),
      function ($card) use ($attacker_card_id, $attacker_id) {
        return (int) $card['id'] !== (int) $attacker_card_id && (int) $card['location_arg'] !== (int) $attacker_id;
      }
    ));

    $attacker_wins = [];
    $attacker_draws = [];
    $defender_wins = [];
    foreach ($defender_cards as $def_card) {
      $result = $this->compareBelievers((int) $attacker_card['type'], (int) $def_card['type'], false);
      $def_id = (int) $def_card['id'];
      if ($result['winner'] === 1) {
        $attacker_wins[] = $def_id;
      } elseif ($result['winner'] === -1) {
        $defender_wins[] = $def_id;
      } else {
        $attacker_draws[] = $def_id;
      }
    }

    $cards_final_owner = [];
    // If any defender wins, attacker steals nobody and takes own card back.
    if (!empty($defender_wins)) {
      foreach ($defender_cards as $def_card) {
        $cards_final_owner[(int) $def_card['id']] = (int) $def_card['location_arg'];
      }
      $cards_final_owner[$attacker_card_id] = $attacker_owner;
    } else {
      foreach ($defender_cards as $def_card) {
        $def_id = (int) $def_card['id'];
        if (in_array($def_id, $attacker_wins, true)) {
          $cards_final_owner[$def_id] = $attacker_owner;
        } else {
          $cards_final_owner[$def_id] = (int) $def_card['location_arg']; // draw -> owner keeps
        }
      }
      $cards_final_owner[$attacker_card_id] = $attacker_owner;
    }

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
      $this->action_cards->moveCards(array_map(function ($card) {
        return (int) $card['id'];
      }, $consp_def_cards), 'discard');
    }

    self::notifyAllPlayers('conspiracyResolved', clienttranslate('${player_name} resolves Conspiracy.'), [
      'player_name' => self::getPlayerNameById($attacker_id),
      'attacker_id' => $attacker_id,
      'attacker_card_id' => $attacker_card_id,
      'attacker_owner' => $attacker_owner,
      'attacker_stolen' => empty($defender_wins) ? $attacker_wins : [],
      'defender_wins' => $defender_wins,
      'draw_defenders' => $attacker_draws,
      'gain_by_player' => $gain_by_player
    ]);
    // Keep reveal/result animation first on all clients.
    // Private hand sync for gained cards is sent after resolved notification.
    foreach ($cards_by_owner as $owner_id => $cards) {
      self::notifyPlayer((int) $owner_id, 'newBelievers', '', ['cards' => array_values($cards)]);
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

    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function stResolveAttack()
  {
    $war_type = self::getGameStateValue('war_type');

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

    $defended = ((int) self::getGameStateValue('breaking_faith_defended') === 1);
    $defender_hand = array_values($this->believer_cards->getCardsInLocation('hand', $defender_id));
    $defender_count = count($defender_hand);
    $steal_count = $defended ? min(1, $defender_count) : intdiv($defender_count, 2);

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
      self::notifyPlayer($attacker_id, 'newBelievers', '', ['cards' => array_values($stolen_cards)]);
      foreach ($stolen_cards as $stolen) {
        self::notifyPlayer($defender_id, 'believerStolen', '', ['card_id' => (int) $stolen['id']]);
      }
    }

    $attacker_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $attacker_id");
    $defender_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $defender_id");
    if ($defender_role === 1) {
      // Target follower is expelled and becomes independent.
      self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_sect = $defender_id, player_is_skill_sealed = 0 WHERE player_id = $defender_id");
    } elseif ($defender_role === 0 && $attacker_role === 1) {
      // Attacker follower challenged leader: attacker leaves and becomes independent.
      self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_sect = $attacker_id, player_is_skill_sealed = 0 WHERE player_id = $attacker_id");
    }

    $breaking_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'breaking_faith';
    });
    if (!empty($breaking_cards)) {
      $this->action_cards->moveCards(array_keys($breaking_cards), 'discard');
    }

    self::notifyAllPlayers('breakingFaithResolved', clienttranslate('${player_name} resolves Breaking Faith.'), [
      'player_name' => self::getPlayerNameById($attacker_id),
      'attacker_id' => $attacker_id,
      'defender_id' => $defender_id,
      'attacker_sect' => (int) $attacker_sect,
      'defended' => $defended ? 1 : 0,
      'stolen_count' => (int) count($stolen_cards)
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

    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function stResolveWitchHunt()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
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
      $this->believer_cards->moveCards($all_killed_ids, 'discard');
    }

    $killed_by_owner_payload = [];
    $all_killed_cards = [];
    foreach ($killed_by_owner as $owner => $cards) {
      $payload_cards = array_values($cards);
      foreach ($payload_cards as $c) {
        $all_killed_cards[] = $c;
      }
      $killed_by_owner_payload[] = [
        'player_id' => (int) $owner,
        'count' => count($payload_cards),
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

    self::notifyAllPlayers('witchHunt', clienttranslate('${player_name} resolves Witch Hunt. Sect ${target_sect} loses all ${type} believers (${n}).'), [
      'player_name' => self::getPlayerNameById($attacker_id),
      'attacker_id' => (int) $attacker_id,
      'attacker_sect' => (int) $this->getPlayerSect((int) $attacker_id),
      'target_sect' => $target_sect,
      'type' => $this->type_labels[$target_type]['name'],
      'n' => count($all_killed_ids),
      'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
      // newest-first for graveyard top rendering on every client
      'killed_cards' => array_values(array_reverse($all_killed_cards)),
      'killed_by_owner' => $killed_by_owner_payload
    ]);

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

      self::notifyAllPlayers('spreadRumors', clienttranslate('${player_name} steals 1 believer from ${victim_name} via Spread Rumors.'), array(
        'player_name' => self::getPlayerNameById($attacker_id),
        'player_id' => $attacker_id,
        'victim_id' => $victim_id,
        'victim_name' => self::getPlayerNameById($victim_id)
      ));
      self::notifyPlayer($victim_id, 'believerStolen', '', array(
        'card_id' => (int) $card['id']
      ));
    }

    if (!empty($stolen_cards)) {
      self::notifyPlayer($attacker_id, 'newBelievers', '', array('cards' => array_values($stolen_cards)));
    }
    self::notifyAllPlayers('spreadRumorsSummary', clienttranslate('${player_name} steals ${stolen_total} believer(s) in total.'), array(
      'player_name' => self::getPlayerNameById($attacker_id),
      'player_id' => $attacker_id,
      'stolen_total' => count($stolen_cards),
      'target_sect' => $target_sect,
      'victim_ids' => array_values(array_map('intval', $affected_victim_ids)),
      'victim_names' => array_values($affected_victim_names)
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
    // Safety net: if no representative was marked (edge timing/state issue),
    // auto-assign one combat-ready representative per undefended sect.
    $rep_count = (int) self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_is_martyrdom_rep = 1");
    if ($rep_count <= 0) {
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      $attacker_sect = $this->getPlayerSect($attacker_id);
      $players = self::loadPlayersBasicInfos();

      $defended_sects = [];
      foreach ($this->action_cards->getCardsInLocation('martyrdef') as $def_card) {
        $defended_sect = $this->getPlayerSect((int) $def_card['location_arg']);
        if ($defended_sect >= 0) $defended_sects[$defended_sect] = true;
      }
      foreach ($this->getSkillDefendedSectsForAoe(3, (int) $attacker_sect) as $sect_id) {
        $defended_sects[(int) $sect_id] = true;
      }

      $processed_sects = [];
      foreach ($players as $pid => $_p) {
        $pid = (int) $pid;
        $sect = $this->getPlayerSect($pid);
        if ($sect < 0 || $sect === $attacker_sect) continue;
        if (isset($processed_sects[$sect])) continue;
        $processed_sects[$sect] = true;
        if (isset($defended_sects[$sect])) continue;

        $candidates = $this->getSectCombatReadyPlayerIds($sect);
        if (empty($candidates)) continue;
        $rep = (int) $candidates[0];
        self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 1 WHERE player_id = $rep");
      }
    }

    $rep_ids = array_map('intval', self::getObjectListFromDB("SELECT player_id FROM player WHERE player_is_martyrdom_rep = 1", true));
    $targets = array_values(array_filter($rep_ids, function ($pid) {
      return $this->believer_cards->countCardInLocation('hand', (int) $pid) > 0;
    }));

    if (empty($targets)) {
      $this->gamestate->nextState('nextStep');
      return;
    }

    self::notifyAllPlayers('martyrdomDefendersChoose', clienttranslate('Martyrdom: all non-defending targets must choose one believer.'), [
      'target_ids' => $targets
    ]);
    $this->gamestate->setPlayersMultiactive($targets, 'nextStep');
  }

  function stResolveMartyrdom()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
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
      function ($card) use ($attacker_id, $martyr_card_id) {
        return (int) $card['id'] !== (int) $martyr_card_id && (int) $card['location_arg'] !== (int) $attacker_id;
      }
    ));

    $dead_defender_ids = [];
    $survivor_defender_ids = [];
    $defender_card_by_id = [];
    foreach ($defender_cards as $def_card) {
      $defender_card_by_id[(int) $def_card['id']] = $def_card;
      $result = $this->compareBelievers((int) $attacker_card['type'], (int) $def_card['type'], false);
      $def_card_id = (int) $def_card['id'];
      if ($result['winner'] === 1 || $result['winner'] === 0) {
        $dead_defender_ids[] = $def_card_id;
      } else {
        $survivor_defender_ids[] = $def_card_id;
      }
    }

    if (!empty($dead_defender_ids)) {
      $this->believer_cards->moveCards($dead_defender_ids, 'discard');
    }
    if (!empty($survivor_defender_ids)) {
      foreach ($survivor_defender_ids as $cid) {
        $owner = (int) $this->believer_cards->getCard($cid)['location_arg'];
        $this->believer_cards->moveCard($cid, 'hand', $owner);
      }
    }

    // Attacker always dies in Martyrdom.
    $this->believer_cards->moveCard($martyr_card_id, 'discard');

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
    $dead_cards_by_owner[$attacker_id] = [[
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

    self::notifyAllPlayers('martyrdomResolved', clienttranslate('${player_name} resolves Martyrdom. The attacker believer dies; losing/draw defenders die.'), array(
      'player_name' => self::getPlayerNameById($attacker_id),
      'attacker_id' => $attacker_id,
      'dead_defenders' => $dead_defender_ids,
      'survivor_defenders' => $survivor_defender_ids,
      'graveyard_count' => $this->believer_cards->countCardInLocation('discard')
    ));
    // Keep reveal/result animation first on all clients.
    // Private hand sync is sent after resolved notification.
    foreach ($survivor_cards_by_owner as $owner => $cards) {
      self::notifyPlayer((int) $owner, 'newBelievers', '', ['cards' => $cards]);
    }
    foreach ($dead_cards_by_owner as $owner => $cards) {
      self::notifyPlayer((int) $owner, 'believersDiscarded', '', [
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
    self::DbQuery("UPDATE player SET player_is_martyrdom_rep = 0");

    $this->notifyPublicCountsSync();
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function startDiscardingActionCard()
  {
    self::checkAction("startDiscardingActionCard");
    $player_id = self::getActivePlayerId();

    // Check whether the player has discarded
    $current_performed_actions = self::getGameStateValue('performedActions');
    if ($current_performed_actions & 0b0001) throw new BgaVisibleSystemException(clienttranslate("You've discarded this turn"));
    // Check whether the player has card to discard
    $hand_size = $this->action_cards->countCardInLocation(
      'hand',
      $player_id
    );
    if ($hand_size <= 0) throw new BgaVisibleSystemException(clienttranslate("There's nothing to discard"));

    // And notify
    self::notifyAllPlayers('startDiscardingActionCard', clienttranslate('${player_name} wants to discard'), array(
      'player_name' => self::getActivePlayerName()
    ));

    // Next action
    $this->gamestate->nextState('startDiscardingActionCard');
  }

  function confirmDiscardingActionCard($card_ids)
  {
    self::checkAction("confirmDiscardingActionCard");

    // Check whether the player has chosen at least 1 card to discard
    $discard_size = count($card_ids);
    if ($discard_size < 1) throw new BgaVisibleSystemException(clienttranslate("There's nothing chosen"));

    // Checks are done! now we can confirm discarding
    foreach ($card_ids as $card_id) $this->action_cards->playCard($card_id); // send it to 'discard'
    $current_performed_actions = self::getGameStateValue('performedActions');
    $this->setGameStateValue('performedActions', $current_performed_actions | 0b0001);
    $this->incrementPerformedActionCount(1);

    // And notify
    self::notifyAllPlayers('confirmDiscardingActionCard', clienttranslate('${player_name} finishes discarding'), array(
      'player_name' => self::getActivePlayerName(),
      'player_id' => self::getActivePlayerId(),
      'cards' => $this->action_cards->getCards($card_ids)
    ));

    // Next action
    $this->gamestate->nextState('confirmDiscardingActionCard');
  }

  function cancelDiscardingActionCard()
  {
    self::checkAction("cancelDiscardingActionCard");
    // And notify
    self::notifyAllPlayers('cancelDiscardingActionCard', clienttranslate('${player_name} cancels discarding'), array(
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
        throw new BgaVisibleSystemException(clienttranslate("Wanderer must steal a believer before ending turn."));
      }
    }
    self::notifyAllPlayers('endTurn', clienttranslate('${player_name} finishes their action phase'), array(
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
      throw new BgaVisibleSystemException(clienttranslate("Target player has no believers to steal."));
    }

    $stolen_card = $target_hand[array_rand($target_hand)];
    $this->believer_cards->moveCard((int) $stolen_card['id'], 'hand', $player_id);
    self::notifyPlayer($player_id, 'newBelievers', '', ['cards' => [[
      'id' => (int) $stolen_card['id'],
      'type' => (int) $stolen_card['type'],
      'type_arg' => (int) $stolen_card['type_arg']
    ]]]);
    self::notifyPlayer($target_player_id, 'believerStolen', '', ['card_id' => (int) $stolen_card['id']]);
    self::notifyAllPlayers('wandererSteal', clienttranslate('${player_name} steals 1 believer from ${target_name}.'), [
      'player_name' => self::getPlayerNameById($player_id),
      'target_name' => self::getPlayerNameById($target_player_id),
      'player_id' => $player_id,
      'target_id' => $target_player_id
    ]);

    $turns = (int) self::getUniqueValueFromDB("SELECT player_wanderer_turns FROM player WHERE player_id = $player_id");
    $turns += 1;
    if ($turns >= 3) {
      self::DbQuery("UPDATE player SET player_role = 0, player_leader_id = NULL, player_sect = $player_id, player_is_skill_sealed = 0, player_wanderer_turns = 0 WHERE player_id = $player_id");

      self::notifyAllPlayers('wandererReborn', clienttranslate('${player_name} rises again and returns to normal play!'), [
        'player_name' => self::getPlayerNameById($player_id),
        'player_id' => $player_id
      ]);

      $this->drawActionCardsToLimit($player_id, 6);
      self::setGameStateValue('performedActions', 0b0000);
      self::setGameStateValue('actions_performed_count', 0);
      self::setGameStateValue('extra_action_slots', 0);
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
      throw new BgaVisibleSystemException(clienttranslate("Only the bankrupt player may choose surrender target."));
    }

    $leader_id = (int) $leader_id;
    $available = $this->getAvailableSurrenderLeaders($bankrupt_id);
    if (!in_array($leader_id, $available, true)) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid surrender target."));
    }

    self::setGameStateValue('surrender_target_leader_id', $leader_id);

    self::notifyAllPlayers('surrenderAsked', clienttranslate('${player_name} asks ${leader_name} for surrender acceptance.'), array(
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
      throw new BgaVisibleSystemException(clienttranslate("You may become Wanderer only after all leaders refuse surrender."));
    }

    $this->doBecomeWanderer($player_id);
    self::setGameStateValue('surrender_bankrupt_id', 0);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);
    $this->setRejectedMask(0);
    $this->gamestate->nextState('nextPlayer');
  }

  function acceptLeaderSupport()
  {
    self::checkAction("acceptLeaderSupport");
    $leader_id = (int) self::getActivePlayerId();
    $follower_id = (int) self::getGameStateValue('follower_id_waiting');
    if ($follower_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("No follower waiting for support."));
    }
    if ($this->believer_cards->countCardInLocation('hand', $leader_id) <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("You have no believer to give."));
    }
    self::notifyAllPlayers('leaderSupportDecision', clienttranslate('${leader_name} accepts to support ${target_name}.'), [
      'leader_name' => self::getPlayerNameById($leader_id),
      'target_name' => self::getPlayerNameById($follower_id),
      'accepted' => 1
    ]);
    $this->gamestate->nextState('leaderGiveBeliever');
  }

  function rejectLeaderSupport()
  {
    self::checkAction("rejectLeaderSupport");
    $leader_id = (int) self::getActivePlayerId();
    $follower_id = (int) self::getGameStateValue('follower_id_waiting');
    if ($follower_id <= 0) {
      throw new BgaVisibleSystemException(clienttranslate("No follower waiting for support."));
    }

    self::notifyAllPlayers('leaderSupportDecision', clienttranslate('${leader_name} refuses to support ${target_name}.'), [
      'leader_name' => self::getPlayerNameById($leader_id),
      'target_name' => self::getPlayerNameById($follower_id),
      'accepted' => 0
    ]);

    self::setGameStateValue('surrender_support_mode', 0);
    $this->startSurrenderFlowFor($follower_id);
  }

  function acceptSurrenderRequest()
  {
    self::checkAction("acceptSurrenderRequest");
    $leader_id = (int) self::getActivePlayerId();
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    $target_leader_id = (int) self::getGameStateValue('surrender_target_leader_id');
    if ($bankrupt_id <= 0 || $target_leader_id !== $leader_id) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid surrender response."));
    }
    $this->failImpermanenceAndRedrawSkill((int) $leader_id, 'accept_follower');
    $this->failImpermanenceAndRedrawSkill((int) $bankrupt_id, 'surrender');
    $leader_sect = $this->getPlayerSect($leader_id);

    self::DbQuery("UPDATE player SET player_role = 1, player_leader_id = $leader_id, player_sect = $leader_sect, player_is_skill_sealed = 1 WHERE player_id = $bankrupt_id");
    self::setGameStateValue('follower_id_waiting', $bankrupt_id);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);
    $this->setRejectedMask(0);

    self::notifyAllPlayers('surrenderAccepted', clienttranslate('${leader_name} accepts ${player_name}. ${leader_name} must give 1 believer.'), array(
      'player_name' => self::getPlayerNameById($bankrupt_id),
      'leader_name' => self::getPlayerNameById($leader_id),
      'player_id' => $bankrupt_id,
      'leader_id' => $leader_id
    ));

    $this->gamestate->nextState('leaderGiveBeliever');
  }

  function rejectSurrenderRequest()
  {
    self::checkAction("rejectSurrenderRequest");
    $leader_id = (int) self::getActivePlayerId();
    $bankrupt_id = (int) self::getGameStateValue('surrender_bankrupt_id');
    $target_leader_id = (int) self::getGameStateValue('surrender_target_leader_id');
    if ($bankrupt_id <= 0 || $target_leader_id !== $leader_id) {
      throw new BgaVisibleSystemException(clienttranslate("Invalid surrender response."));
    }
    $this->markLeaderRejected($leader_id);
    self::setGameStateValue('surrender_target_leader_id', 0);

    self::notifyAllPlayers('surrenderRejected', clienttranslate('${leader_name} rejects ${player_name}.'), array(
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
      $this->gamestate->nextState('nextPlayer');
      return;
    }

    // Ensure flow always returns to the bankrupt player to pick the next leader.
    self::setGameStateValue('surrender_support_mode', 0);
    self::setGameStateValue('surrender_bankrupt_id', $bankrupt_id);
    $this->gamestate->changeActivePlayer($bankrupt_id);
    $this->gamestate->nextState('surrenderOrWanderer');
  }

  function giveBeliever($believer_id)
  {
    self::checkAction("giveBeliever");
    $leader_id = self::getActivePlayerId();
    $follower_id = self::getGameStateValue('follower_id_waiting');

    $card = $this->believer_cards->getCard($believer_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $leader_id)
      throw new BgaVisibleSystemException(clienttranslate("You do not own this believer card"));

    $this->believer_cards->moveCard($believer_id, 'hand', $follower_id);

    self::notifyAllPlayers('giveBeliever', clienttranslate('${leader_name} gives a Believer to their new Follower ${follower_name}'), array(
      'leader_name' => self::getActivePlayerName(),
      'follower_name' => self::getPlayerNameById($follower_id)
    ));

    self::setGameStateValue('follower_id_waiting', 0);
    self::setGameStateValue('surrender_bankrupt_id', 0);
    self::setGameStateValue('surrender_target_leader_id', 0);
    self::setGameStateValue('surrender_support_mode', 0);
    $this->setRejectedMask(0);

    $this->gamestate->nextState('nextPlayer');
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

    // Verify ownership
    $card = $this->believer_cards->getCard($card_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $player_id)
      throw new BgaVisibleSystemException(clienttranslate("You do not own this card"));

    if ($war_type === 2) {
      $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
      $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

      if ($player_id === $attacker_rep_id) {
        self::setGameStateValue('war_card_attacker', $card_id);
      } elseif ($player_id === $defender_rep_id) {
        self::setGameStateValue('war_card_defender', $card_id);
      } else {
        throw new BgaVisibleSystemException(clienttranslate("You are not part of this war"));
      }
    } elseif ($war_type === 3) {
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      if ($player_id === $attacker_id) {
        throw new BgaVisibleSystemException(clienttranslate("Attacker already committed the Martyrdom believer"));
      }
      $is_rep = (int) self::getUniqueValueFromDB("SELECT player_is_martyrdom_rep FROM player WHERE player_id = $player_id");
      if ($is_rep !== 1) {
        throw new BgaVisibleSystemException(clienttranslate("You are not the selected Martyrdom defender"));
      }
      foreach ($this->believer_cards->getCardsInLocation('cardsontable', $player_id) as $existing) {
        if ((int) $existing['id'] !== (int) self::getGameStateValue('war_card_attacker')) {
          throw new BgaVisibleSystemException(clienttranslate("You already committed a believer for Martyrdom"));
        }
      }
    } elseif ($war_type === 6) {
      $is_rep = (int) self::getUniqueValueFromDB("SELECT player_is_conspiracy_rep FROM player WHERE player_id = $player_id");
      if ($is_rep !== 1) {
        throw new BgaVisibleSystemException(clienttranslate("You are not the selected Conspiracy defender"));
      }
      foreach ($this->believer_cards->getCardsInLocation('cardsontable', $player_id) as $existing) {
        if ((int) $existing['id'] !== (int) self::getGameStateValue('war_card_attacker')) {
          throw new BgaVisibleSystemException(clienttranslate("You already committed a believer for Conspiracy"));
        }
      }
    } elseif ($war_type === 7) {
      $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
      $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');
      if ($player_id === $attacker_rep_id) {
        self::setGameStateValue('war_card_attacker', $card_id);
      } elseif ($player_id === $defender_rep_id) {
        self::setGameStateValue('war_card_defender', $card_id);
      } else {
        throw new BgaVisibleSystemException(clienttranslate("You are not the selected Faith Debate representative"));
      }
    } else {
      throw new BgaVisibleSystemException(clienttranslate("This combat action is not available right now"));
    }

    $this->believer_cards->moveCard($card_id, 'cardsontable', $player_id);

    if ($war_type === 3) {
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      self::notifyAllPlayers('martyrdomBelieverCommitted', '', array(
        'player_id' => $player_id,
        'attacker_id' => $attacker_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => $card_id,
        'card_type' => $card['type'],
        'sect_id' => (int) $this->getPlayerSect((int) $player_id)
      ));
    } elseif ($war_type === 6) {
      $attacker_id = (int) self::getGameStateValue('war_attacker_id');
      self::notifyAllPlayers('conspiracyBelieverCommitted', '', array(
        'player_id' => $player_id,
        'attacker_id' => $attacker_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => $card_id,
        'card_type' => $card['type'],
        'sect_id' => (int) $this->getPlayerSect((int) $player_id)
      ));
    } elseif ($war_type === 7) {
      self::notifyAllPlayers('faithDebateCardPlayed', '', array(
        'player_id' => $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => $card_id,
        'card_type' => $card['type']
      ));
    } else {
      self::notifyAllPlayers('faithWarCardPlayed', '', array(
        'player_id' => $player_id,
        'player_name' => self::getPlayerNameById($player_id),
        'card_id' => $card_id,
        'card_type' => $card['type']
      ));
    }

    // Mark player as done for this duel round.
    // Let the framework advance only after all required players have responded.
    $transition = 'nextStep';
    if ($war_type === 2) $transition = 'nextDuelStep';
    if ($war_type === 7) $transition = 'nextDebateStep';
    $this->gamestate->setPlayerNonMultiactive($player_id, $transition);
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Game state actions
  ////////////

  function stFaithWarDuel()
  {
    $attacker_id = (int) self::getGameStateValue('war_attacker_id');
    $defender_id = (int) self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

    // Safety: if a leader timed out/disconnected and did not assign,
    // auto-assign one combat-ready representative for that sect.
    if ($attacker_rep_id <= 0) {
      $attacker_choices = $this->getSectCombatReadyPlayerIds($attacker_sect);
      if (!empty($attacker_choices)) {
        $attacker_rep_id = (int) $attacker_choices[bga_rand(0, count($attacker_choices) - 1)];
        self::setGameStateValue('war_rep_attacker_id', $attacker_rep_id);
        $attacker_leader = $this->getSectLeaderId($attacker_sect, $attacker_id);
        self::notifyAllPlayers('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their sect.'), [
          'leader_id' => $attacker_leader,
          'leader_name' => self::getPlayerNameById($attacker_leader),
          'representative_id' => $attacker_rep_id,
          'representative_name' => self::getPlayerNameById($attacker_rep_id),
          'auto_assigned' => 1
        ]);
        self::notifyPlayer($attacker_rep_id, 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
          'leader_id' => $attacker_leader,
          'leader_name' => self::getPlayerNameById($attacker_leader),
          'representative_id' => $attacker_rep_id,
          'auto_assigned' => 1
        ]);
      }
    }

    if ($defender_rep_id <= 0) {
      $defender_choices = $this->getSectCombatReadyPlayerIds($defender_sect);
      if (!empty($defender_choices)) {
        $defender_rep_id = (int) $defender_choices[bga_rand(0, count($defender_choices) - 1)];
        self::setGameStateValue('war_rep_defender_id', $defender_rep_id);
        $defender_leader = $this->getSectLeaderId($defender_sect, $defender_id);
        self::notifyAllPlayers('faithWarRepresentativeChosen', clienttranslate('${leader_name} assigns ${representative_name} to represent their sect.'), [
          'leader_id' => $defender_leader,
          'leader_name' => self::getPlayerNameById($defender_leader),
          'representative_id' => $defender_rep_id,
          'representative_name' => self::getPlayerNameById($defender_rep_id),
          'auto_assigned' => 1
        ]);
        self::notifyPlayer($defender_rep_id, 'faithWarAssignedToYou', clienttranslate('${leader_name} assigns you to fight this round.'), [
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

    self::notifyAllPlayers('faithWarRound', clienttranslate('Faith War Round: each chosen representative selects one believer.'), [
      'attacker_id' => $attacker_id,
      'defender_id' => $defender_id,
      'attacker_sect' => $attacker_sect,
      'defender_sect' => $defender_sect,
      'attacker_rep_id' => $attacker_rep_id,
      'defender_rep_id' => $defender_rep_id,
      'attacker_rep_name' => self::getPlayerNameById($attacker_rep_id),
      'defender_rep_name' => self::getPlayerNameById($defender_rep_id),
      'attacker_name' => self::getPlayerNameById($attacker_id),
      'defender_name' => self::getPlayerNameById($defender_id)
    ]);
  }

  function stResolveDuel()
  {
    $attacker_id = self::getGameStateValue('war_attacker_id');
    $defender_id = self::getGameStateValue('war_defender_id');
    $attacker_sect = $this->getPlayerSect($attacker_id);
    $defender_sect = $this->getPlayerSect($defender_id);
    $attacker_rep_id = (int) self::getGameStateValue('war_rep_attacker_id');
    $defender_rep_id = (int) self::getGameStateValue('war_rep_defender_id');

    $card_a_id = self::getGameStateValue('war_card_attacker');
    $card_b_id = self::getGameStateValue('war_card_defender');

    // If a representative timed out/disconnected, auto-commit one believer for
    // that representative so Faith War can continue until believers are exhausted.
    if ($card_a_id == 0 && $attacker_rep_id > 0) {
      $auto_card = $this->autoCommitFaithWarBelieverForRepresentative($attacker_rep_id, true);
      if ($auto_card) {
        $card_a_id = (int) $auto_card['id'];
      }
    }
    if ($card_b_id == 0 && $defender_rep_id > 0) {
      $auto_card = $this->autoCommitFaithWarBelieverForRepresentative($defender_rep_id, false);
      if ($auto_card) {
        $card_b_id = (int) $auto_card['id'];
      }
    }

    if ($card_a_id == 0 || $card_b_id == 0) {
      // Safety: never stall in game-state resolve. End this war early instead
      // of blocking the table when a representative did not submit a believer.
      $this->finalizeFaithWar($attacker_id, $defender_id, $attacker_sect, $defender_sect, true);
      return;
    }

    $card_a = $this->believer_cards->getCard($card_a_id);
    $card_b = $this->believer_cards->getCard($card_b_id);
    $attacker_player_id = (int) $card_a['location_arg'];
    $defender_player_id = (int) $card_b['location_arg'];

    // --- Combat Logic ---
    $result = $this->compareBelievers($card_a['type'], $card_b['type'], true); // true = is faith war

    if ($result['winner'] == 1) {
      $this->believer_cards->moveCard($card_b_id, 'discard');
      $this->believer_cards->moveCard($card_a_id, 'warused', $attacker_player_id);
      $this->addWarDeathCounter((int) $defender_player_id, 1);

      self::notifyAllPlayers('duelResult', clienttranslate('${winner_name} wins! ${loser_name}\'s believer dies.'), [
        'winner_name' => self::getPlayerNameById($attacker_player_id),
        'loser_name' => self::getPlayerNameById($defender_player_id),
        'winner_id' => $attacker_player_id,
        'loser_id' => $defender_player_id,
        'attacker_id' => $attacker_player_id,
        'defender_id' => $defender_player_id,
        'attacker_name' => self::getPlayerNameById($attacker_player_id),
        'defender_name' => self::getPlayerNameById($defender_player_id),
        'result_type' => 'attacker',
        'dead_count' => 1,
        'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
        'card_a' => $card_a,
        'card_b' => $card_b,
        'attacker_sect' => $attacker_sect,
        'defender_sect' => $defender_sect
      ]);

      if ($result['bonus']) {
        $bonus_card = $this->believer_cards->pickCardForLocation('deck', 'warbonus', $attacker_player_id);
        self::notifyAllPlayers('duelBonus', clienttranslate('${player_name} gets a War Bonus (Crushing Victory)!'), [
          'player_name' => self::getPlayerNameById($attacker_player_id),
          'player_id' => $attacker_player_id,
          'card' => $bonus_card,
          'delayed_until_war_end' => true
        ]);
      }
    } elseif ($result['winner'] == -1) {
      $this->believer_cards->moveCard($card_a_id, 'discard');
      $this->believer_cards->moveCard($card_b_id, 'warused', $defender_player_id);
      $this->addWarDeathCounter((int) $attacker_player_id, 1);

      self::notifyAllPlayers('duelResult', clienttranslate('${winner_name} defends successfully! ${loser_name}\'s believer dies.'), [
        'winner_name' => self::getPlayerNameById($defender_player_id),
        'loser_name' => self::getPlayerNameById($attacker_player_id),
        'winner_id' => $defender_player_id,
        'loser_id' => $attacker_player_id,
        'attacker_id' => $attacker_player_id,
        'defender_id' => $defender_player_id,
        'attacker_name' => self::getPlayerNameById($attacker_player_id),
        'defender_name' => self::getPlayerNameById($defender_player_id),
        'result_type' => 'defender',
        'dead_count' => 1,
        'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
        'card_a' => $card_a,
        'card_b' => $card_b,
        'attacker_sect' => $attacker_sect,
        'defender_sect' => $defender_sect
      ]);

      if ($result['bonus']) {
        $bonus_card = $this->believer_cards->pickCardForLocation('deck', 'warbonus', $defender_player_id);
        self::notifyAllPlayers('duelBonus', clienttranslate('${player_name} gets a War Bonus!'), [
          'player_name' => self::getPlayerNameById($defender_player_id),
          'player_id' => $defender_player_id,
          'card' => $bonus_card,
          'delayed_until_war_end' => true
        ]);
      }
    } else {
      $this->believer_cards->moveCard($card_a_id, 'discard');
      $this->believer_cards->moveCard($card_b_id, 'discard');
      $this->addWarDeathCounter((int) $attacker_player_id, 1);
      $this->addWarDeathCounter((int) $defender_player_id, 1);

      self::notifyAllPlayers('duelResult', clienttranslate('It\'s a DRAW! Both believers die.'), [
        'attacker_id' => $attacker_player_id,
        'defender_id' => $defender_player_id,
        'attacker_name' => self::getPlayerNameById($attacker_player_id),
        'defender_name' => self::getPlayerNameById($defender_player_id),
        'result_type' => 'draw',
        'dead_count' => 2,
        'graveyard_count' => $this->believer_cards->countCardInLocation('discard'),
        'card_a' => $card_a,
        'card_b' => $card_b,
        'attacker_sect' => $attacker_sect,
        'defender_sect' => $defender_sect
      ]);
    }

    // Rule confirmed: war ends as soon as one sect has used all believers in hand.
    $count_a = $this->countSectHandBelievers($attacker_sect);
    $count_b = $this->countSectHandBelievers($defender_sect);

    if ($count_a == 0 || $count_b == 0) {
      $this->finalizeFaithWar($attacker_id, $defender_id, $attacker_sect, $defender_sect, false);
    } else {
      $this->notifyPublicCountsSync();
      $this->gamestate->nextState('nextDuelRound');
    }
  }

  private function autoCommitFaithWarBelieverForRepresentative(int $representative_id, bool $is_attacker): ?array
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

    self::notifyAllPlayers('faithWarCardPlayed', '', array(
      'player_id' => $representative_id,
      'player_name' => self::getPlayerNameById($representative_id),
      'card_id' => $card_id,
      'card_type' => (int) $card['type'],
      'auto_played' => 1
    ));

    return $card;
  }

  private function finalizeFaithWar(int $attacker_id, int $defender_id, int $attacker_sect, int $defender_sect, bool $is_incomplete): void
  {
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
      self::notifyPlayer($bonus_owner, 'newBelievers', '', ['cards' => $bonus_cards]);
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
      self::notifyPlayer($used_owner, 'newBelievers', '', ['cards' => array_values($used_cards)]);
    }

    $faith_war_cards = array_filter($this->action_cards->getCardsInLocation('cardsontable'), function ($card) {
      return $card['type'] === 'faith_war';
    });
    if (!empty($faith_war_cards)) {
      $this->action_cards->moveCards(array_keys($faith_war_cards), 'discard');
    }

    $count_a = $this->countSectHandBelievers($attacker_sect);
    $count_b = $this->countSectHandBelievers($defender_sect);
    $holy_rebirth_owner_id = (int) $this->getPlayerIdHoldingSkillType(5);
    $holy_rebirth_deaths = ($holy_rebirth_owner_id > 0)
      ? (int) $this->getWarDeathCounter($holy_rebirth_owner_id)
      : 0;

    self::setGameStateValue('war_attacker_id', 0);
    self::setGameStateValue('war_defender_id', 0);
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);
    self::setGameStateValue('war_type', 0);
    self::setGameStateValue('war_attack_blocked', 0);
    self::setGameStateValue('war_rep_attacker_id', 0);
    self::setGameStateValue('war_rep_defender_id', 0);
    $this->resetAllWarDeathCounters();

    $message = $is_incomplete
      ? clienttranslate('Faith War ended early because one representative did not submit a believer.')
      : clienttranslate('Faith War ended. One side has no believers left.');

    self::notifyAllPlayers('faithWarEnd', $message, [
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
    $this->notifyPublicCountsSync();
    if (
      $holy_rebirth_owner_id > 0 &&
      $holy_rebirth_deaths >= 3 &&
      $this->queueHolyRebirthPromptIfEligible(
        (int) $holy_rebirth_owner_id,
        (int) $holy_rebirth_deaths,
        'faith_war',
        (int) $attacker_id,
        1
      )
    ) {
      return;
    }
    $this->routeAfterActionWindowCheck('playerTurn');
  }

  function stNewHand()
  {
    // Take back all cards (from any location => null) to deck
    $this->action_cards->moveAllCardsInLocation(null, "deck");
    $this->believer_cards->moveAllCardsInLocation(null, "deck");
    // Shuffle deck and give initial cards
    $this->action_cards->shuffle('deck');
    $this->believer_cards->shuffle('deck');
    // Deal 6 action cards and 3 believer cards to each player
    $players = self::loadPlayersBasicInfos();
    foreach ($players as $player_id => $player) {
      $action_cards = $this->action_cards->pickCards(6, 'deck', $player_id);
      $believer_cards = $this->believer_cards->pickCards(3, 'deck', $player_id);
      // Notify player about his cards
      self::notifyPlayer(
        $player_id,
        'newHand',
        '',
        array('action_cards' => $action_cards, 'believer_cards' => $believer_cards)
      );
    }
    $this->gamestate->nextState("");
  }


  function stCheckEndTurnPhase()
  {
    $player_id = self::getActivePlayerId();

    // Check Hand Limit
    $hand_limit = 6; // Default
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
          $this->gamestate->changeActivePlayer($leader_id);
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

            self::notifyAllPlayers('leaderReplaced', clienttranslate('${new_leader_name} becomes the new sect leader because ${old_leader_name} has no believers.'), [
              'new_leader_name' => self::getPlayerNameById($new_leader),
              'old_leader_name' => self::getPlayerNameById($player_id),
              'new_leader_id' => $new_leader,
              'old_leader_id' => (int) $player_id
            ]);

            self::setGameStateValue('follower_id_waiting', $player_id);
            self::setGameStateValue('surrender_support_mode', 2);
            self::setGameStateValue('surrender_bankrupt_id', $player_id);
            $this->setRejectedMask(0);
            $this->gamestate->changeActivePlayer($new_leader);
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

  function stNextPlayer()
  {
    // End-game checks are evaluated right before activating the next player.
    // Anchor is the player who just ended their turn.
    $anchor_player_id = (int) self::getActivePlayerId();
    if ($this->checkAndResolveGameEnd($anchor_player_id)) {
      return;
    }

    // Reset turn flags
    self::setGameStateValue('performedActions', 0b0000);
    self::setGameStateValue('actions_performed_count', 0);
    self::setGameStateValue('extra_action_slots', 0);
    $this->clearPraiseLifeDecisionPending();
    // Karboom attack lock applies for one whole turn; clear it after that player's turn ends.
    $this->setPlayerAttackLockByKarboom($anchor_player_id, false);

    // Activate next player (skip-turn aware).
    $chosen_player_id = 0;
    $loop_guard = max(1, count($this->getSortedPlayerIds()) * 8);
    for ($i = 0; $i < $loop_guard; $i++) {
      $player_id = (int) self::activeNextPlayer();
      self::giveExtraTime($player_id);

      // Per-turn reset for this player happens even if this turn is skipped.
      $this->clearKarboomUsedThisTurn((int) $player_id);
      $this->clearPraiseLifeUsedThisTurn((int) $player_id);
      $this->clearHolyRebirthUsedThisTurn((int) $player_id);
      $this->setPlayerSkillProtection((int) $player_id, 'physical', false);
      $this->setPlayerSkillProtection((int) $player_id, 'mental', false);

      $skip_count_before = (int) $this->getSkipTurnCounter((int) $player_id);
      if ($skip_count_before > 0) {
        $skip_count_after = (int) $this->consumeSkipTurnCounter((int) $player_id);
        self::notifyAllPlayers('soulBladeTurnSkipped', clienttranslate('${player_name}\'s turn is skipped by Soul Severing Sword.'), [
          'player_id' => (int) $player_id,
          'player_name' => self::getPlayerNameById((int) $player_id),
          'remaining_skip_count' => (int) $skip_count_after
        ]);
        self::notifyPlayer((int) $player_id, 'soulBladeTurnSkippedPrivate', clienttranslate('Your turn is skipped due to Soul Severing Sword.'), [
          'player_id' => (int) $player_id,
          'remaining_skip_count' => (int) $skip_count_after
        ]);
        continue;
      }

      $chosen_player_id = (int) $player_id;
      break;
    }

    if ($chosen_player_id <= 0) {
      // Fallback safety: no eligible player found in guard loop.
      $chosen_player_id = (int) self::getActivePlayerId();
    }

    $player_role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $chosen_player_id");
    if ($player_role != 2) {
      $this->drawActionCardsToLimit($chosen_player_id, 6);
    }
    if ($player_role == 2) { // 2 = Wanderer
      self::notifyAllPlayers('wandererTurnStart', clienttranslate('${player_name} (Wanderer) starts their turn! They must steal 1 believer.'), array(
        'player_name' => self::getPlayerNameById($chosen_player_id)
      ));
    }

    $this->notifyPublicCountsSync();
    $this->gamestate->nextState('nextPlayer');
  }

  function stEndHand()
  {
    $this->gamestate->nextState("endGame");
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Zombie
  ////////////

  function zombieTurn($state, $active_player)
  {
    $statename = $state['name'];
    $active_player = (int) $active_player;

    if ($state['type'] === "activeplayer") {
      switch ($statename) {
        case 'prophetSkillPrompt':
          self::setGameStateValue('prophet_pending_guess_type', 0);
          $this->gamestate->nextState('resolve');
          break;
        case 'prophetGuess':
          self::setGameStateValue('prophet_pending_guess_type', 0);
          $this->gamestate->nextState('resolve');
          break;
        case 'holyRebirthPrompt':
          self::setGameStateValue('holy_rebirth_pending_use', 0);
          $this->gamestate->nextState('resolve');
          break;
        default:
          $this->gamestate->nextState("zombiePass");
          break;
      }

      return;
    }

    if ($state['type'] === "multipleactiveplayer") {
      // Keep combat flows moving per disconnected player only.
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
        $this->autoCommitAoeBelieverForZombie($active_player, 3);
        $this->gamestate->setPlayerNonMultiactive($active_player, 'nextStep');
        return;
      }

      if ($statename === 'conspiracyChooseBelievers') {
        $this->autoCommitAoeBelieverForZombie($active_player, 6);
        $this->gamestate->setPlayerNonMultiactive($active_player, 'nextStep');
        return;
      }

      if ($statename === 'confirmDefense') {
        // Disconnected defender auto-skips only their own defense choice.
        $this->gamestate->setPlayerNonMultiactive($active_player, 'nextDefenseStep');
        return;
      }

      if (
        $statename === 'chooseWarRepresentative' ||
        $statename === 'chooseFaithDebateRepresentative' ||
        $statename === 'martyrdomChooseRepresentative' ||
        $statename === 'conspiracyChooseRepresentative'
      ) {
        $this->gamestate->setPlayerNonMultiactive($active_player, 'chooseDone');
        return;
      }

      // Default multiple-active fallback
      $this->gamestate->setPlayerNonMultiactive($active_player, '');

      return;
    }

    throw new feException("Zombie mode not supported at this game state: " . $statename);
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
    $this->believer_cards->moveCard($card_id, 'cardsontable', $player_id);

    $payload = [
      'player_id' => (int) $player_id,
      'attacker_id' => (int) self::getGameStateValue('war_attacker_id'),
      'player_name' => self::getPlayerNameById((int) $player_id),
      'card_id' => $card_id,
      'card_type' => (int) $card['type'],
      'sect_id' => (int) $this->getPlayerSect((int) $player_id),
      'auto_played' => 1
    ];

    if ($war_type === 3) {
      self::notifyAllPlayers('martyrdomBelieverCommitted', '', $payload);
      return true;
    }
    if ($war_type === 6) {
      self::notifyAllPlayers('conspiracyBelieverCommitted', '', $payload);
      return true;
    }
    return false;
  }

  function upgradeTableDb($from_version) {}
}
