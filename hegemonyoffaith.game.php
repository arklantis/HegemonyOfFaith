<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * HegemonyOfFaith implementation : © <Your name here> <Your email address here>
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
  protected $type_arg_labels, $type_labels, $action_cards_count;

  function __construct()
  {
    // Your global variables labels:
    //  Here, you can assign labels to global variables you are using for this game.
    //  You can use any number of global variables with IDs between 10 and 99.
    //  If your game has options (variants), you also have to associate here a label to
    //  the corresponding ID in gameoptions.inc.php.
    // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
    parent::__construct();

    $this->game_materials = include("material.inc.php");  // ← 加這行

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
      "follower_id_waiting" => 25 // Follower waiting to receive a believer
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
    foreach ($players as $player_id => $player) {
      $color = array_shift($default_colors);
      $player_canal = $player['player_canal'];
      $player_name = addslashes($player['player_name']);
      $player_avatar = addslashes($player['player_avatar']);
      $values[] = "('$player_id','$color','0','$player_canal','$player_name','$player_avatar')";
    }
    $sql = "INSERT INTO player (player_id, player_color, player_role, player_canal, player_name, player_avatar) VALUES " . implode(',', $values);
    self::DbQuery($sql);
    self::reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
    self::reloadPlayersBasicInfos();

    /************ Start the game initialization *****/

    // Init global values with their initial values

    // Set current performed actions to init val (= no perfomed action)
    self::setGameStateInitialValue('performedActions', 0b0000);

    // Create action cards
    $action_cards = array();
    foreach ($this->action_cards_count as $type => $info)
      $action_cards[] = array('type' => $type, 'type_arg' => $info['type_arg'], 'nbr' => $info['nbr']);

    $this->action_cards->createCards($action_cards, 'deck');

    // Create believer cards
    $believer_cards = array();
    for ($value = 1; $value < 6; $value++)
      // Fool, Prayer, Missionary, Elder, Fanatic
      $believer_cards[] = array('type' => $value, 'type_arg' => 0b10000, 'nbr' => 12);

    $this->believer_cards->createCards($believer_cards, 'deck');

    $this->action_cards->shuffle('deck');
    $this->believer_cards->shuffle('deck');

    foreach ($players as $player_id => $player) {
      $this->action_cards->pickCards(6, 'deck', $player_id);
      $this->believer_cards->pickCards(3, 'deck', $player_id);
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
    $sql = "SELECT player_id id, player_score score, player_role, player_leader_id, player_is_skill_sealed, player_name, player_color FROM player ";
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

    // Cards played on the table
    $result['cardsontable'] = $this->action_cards->getCardsInLocation('cardsontable');

    // Counts for UI decks
    $result['action_deck_count'] = $this->action_cards->countCardInLocation('deck');
    $result['believer_deck_count'] = $this->believer_cards->countCardInLocation('deck');
    $result['graveyard_count'] = $this->believer_cards->countCardInLocation('discard');

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
      if (($card['type_arg'] & 0b01110) && !($current_performed_actions & $card['type_arg'])) {
        switch ($card['type_arg']) {
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
              case 'secret_alliance':
                if (count($hand) > 1)
                  $playable_action_cards[] = $card['id'];
                break;

              case 'breaking_faith':
                $player_sect = self::getUniqueValueFromDB("SELECT player_sect FROM player WHERE player_id='$player_id'");
                if ($player_sect != -1) { // is not a wanderer
                  $player_sect_member_count = self::getUniqueValueFromDB("SELECT count(*) FROM player WHERE player_sect='$player_sect'");
                  if ($player_sect_member_count > 1) $playable_action_cards[] = $card['id'];
                }
                break;

              case 'kowtow_to_me':
                $believers_count = $this->believer_cards->countCardsByLocationArgs('hand');

                $player_sect = self::getUniqueValueFromDB("SELECT player_sect FROM player WHERE player_id='$player_id'");
                $player_sect_believers_count = $this->countSectBelievers($player_sect, $believers_count);

                $other_sects = self::getObjectListFromDB("SELECT DISTINCT player_sect FROM player WHERE player_sect!='$player_sect'", true);
                foreach ($other_sects as $sect) {
                  $sect_believers_count = $this->countSectBelievers($sect, $believers_count);

                  if ($sect_believers_count <= $player_sect_believers_count) {
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
    return array_reduce(
      self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect='$sect'", true),
      fn($sect_believers_count, $id) => $sect_believers_count + $believers_count[$id],
      0
    );
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


  //////////////////////////////////////////////////////////////////////////////
  //////////// Strategy Actions
  ////////////

  public function playActionCard($card_id, $target_player_id = null, $type_arg = null, $card_ids = array())
  {
      self::checkAction("playActionCard");
      $player_id = self::getActivePlayerId();

      // 1. Validate Card Ownership
      $card = $this->action_cards->getCard($card_id);
      if ($card['location'] != 'hand' || $card['location_arg'] != $player_id) {
          throw new BgaVisibleSystemException(clienttranslate("You do not have this card in hand."));
      }

      // 2. Broadcast Action to JS for slide animation (from hand to Arena)
      $type_str = $card['type'];
      self::notifyAllPlayers('actionCardPlayed', '', array(
          'card_id' => $card_id,
          'player_id' => $player_id,
          'card_type' => $type_str
      ));

      // 3. Move Card to the Common Arena (cardsontable)
      $this->action_cards->moveCard($card_id, 'cardsontable', $player_id);

      // 4. Dispatch to Specific Logic Based on Card Type String
      switch ($type_str) {
          case 'have_a_charity':
              $this->playHaveACharity();
              break;
          case 'great_mercy':
          case 'its_a_miracle':
              $this->playGreatMercy();
              break;
          case 'divine_inspire':
              $this->playDivineInspiration($card_ids);
              break;
          case 'info_spy':
              if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
              $this->playInfoSpy($target_player_id);
              break;
          case 'witch_hunt':
              // Temporarily ignore missing type_arg to prevent hard crash, we can add a sub-state later
              $this->playWitchHunt($target_player_id, $type_arg);
              break;
          case 'spread_rumors':
              if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
              $this->playSpreadRumors($target_player_id);
              break;
          case 'faith_war':
              if (!$target_player_id) throw new BgaVisibleSystemException(clienttranslate("Select a target."));
              $this->playFaithWar($target_player_id);
              break;
          default:
              throw new BgaVisibleSystemException(clienttranslate("Card action not fully implemented yet: " . $type_str));
      }
      
      // 5. Discard Strategy Cards immediately after resolution
      $instant_cards = ['have_a_charity', 'great_mercy', 'its_a_miracle', 'divine_inspire', 'info_spy'];
      if (in_array($type_str, $instant_cards)) {
          $this->action_cards->moveCard($card_id, 'discard');
      }
  }

  /*
   * Divine Inspiration (神啟)
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
    $count = count($card_ids_to_discard);
    $new_believers = $this->believer_cards->pickCards($count, 'deck', $player_id);

    // Notify
    self::notifyAllPlayers('divineInspiration', clienttranslate('${player_name} uses Divine Inspiration to discard ${n} cards and draw ${n} believers'), array(
      'player_name' => self::getActivePlayerName(),
      'n' => $count
    ));
    self::notifyPlayer($player_id, 'newBelievers', '', array('cards' => $new_believers));

    $this->gamestate->nextState('playActionCard');
  }

  /*
   * Info Spy (情報間諜)
   * Reveal target player's Hand (Action + Believer). NOT Skills.
   * UI should show a modal with timer.
   */
  function playInfoSpy($target_player_id)
  {
    $player_id = self::getActivePlayerId();

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

    $this->gamestate->nextState('playerTurn');
  }

  /*
   * Kowtow To Me (無條件投降)
   * Force target player (Sect Leader) to join your Sect as Follower.
   * Condition: Your Sect Believers >= 2 * Target Sect Believers.
   * (Already checked in checkPlayableActionCards, but double check here for safety)
   */
  function playKowtowToMe($target_player_id)
  {
    $player_id = self::getActivePlayerId();

    // Validate logic again (safety check)
    // ... (Implementation of sect merging logic)
    // This involves changing 'player_sect' in DB and moving 'leader_token'.

    // Notify
    $target_name = self::getPlayerNameById($target_player_id);
    self::notifyAllPlayers('kowtowToMe', clienttranslate('${player_name} forces ${target_name} to surrender!'), array(
      'player_name' => self::getActivePlayerName(),
      'target_name' => $target_name
    ));

    $this->gamestate->nextState('playerTurn');
  }

  /*
   * Have a Charity (廣善布施)
   * Draw 2 Believer cards from deck.
   */
  function playHaveACharity()
  {
    $player_id = self::getActivePlayerId();

    $cards = $this->believer_cards->pickCards(2, 'deck', $player_id);

    self::notifyAllPlayers('haveACharity', clienttranslate('${player_name} performs Charity and draws 2 believers'), array(
      'player_name' => self::getActivePlayerName()
    ));
    self::notifyPlayer($player_id, 'newBelievers', '', array('cards' => $cards));

    $this->gamestate->nextState('playActionCard');
  }

  /*
   * Great Mercy / It's a Miracle (天降神蹟)
   * Revive top 3 Believer cards from discard pile (Graveyard).
   */
  function playGreatMercy()
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
      $cards = $this->believer_cards->pickCards($count, 'discard', $player_id); // This might pick random if not ordered
      // If pickCards doesn't support 'discard' source in this version, use getCardsInLocation + moveCard.
      // Standard Deck component usually supports pickCards from 'discard' if reshuffle is handled, 
      // but to be safe, let's look at available cards.

      // Let's rely on standard pickCards behavior (it might auto-reshuffle if deck empty, but we want DISCARD specifically).
      // Actually, pickCards takes from 'deck' location. 
      // To pick from discard, we likely need a custom query or move.
      // Let's just move top $count cards found in 'discard'.
      $discarded_cards = $this->believer_cards->getCardsInLocation('discard', null, 'location_arg DESC'); // Get latest
      $cards_to_revive = array_slice($discarded_cards, 0, $count);
      $ids = array_map(function ($c) {
        return $c['id'];
      }, $cards_to_revive);

      $this->believer_cards->moveCards($ids, 'hand', $player_id);

      self::notifyAllPlayers('greatMercy', clienttranslate('${player_name} performs a Miracle and revives ${n} believers from graveyard'), array(
        'player_name' => self::getActivePlayerName(),
        'n' => $count
      ));
      self::notifyPlayer($player_id, 'newBelievers', '', array('cards' => $cards_to_revive));
    } else {
      self::notifyAllPlayers('greatMercy', clienttranslate('${player_name} tries to perform a Miracle but the graveyard is empty!'), array(
        'player_name' => self::getActivePlayerName()
      ));
    }

    $this->gamestate->nextState('playerTurn');
  }

  /*
   * Secret Alliance (秘密結盟)
   * Swap 1 Action Card with target player.
   * Requires UI interaction: Select own card + Select target.
   * Target also needs to select? Or random? Rulebook: "互相交換" (Mutually exchange).
   * Usually implies both players choose.
   * Implementation:
   * 1. Active player chooses card & target.
   * 2. Target player gets notification & state transition to choose their card to give back.
   * For now, simplified stub.
   */
  function playSecretAlliance($target_id, $card_id_give)
  {
    // TODO: Implement state machine for target player response
    $this->gamestate->nextState('playActionCard');
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Physical Attacks
  ////////////

  /*
   * Witch Hunt (獵殺異端)
   * Target Sect -> Specific Believer Type -> Discard ALL matching.
   */
  function playWitchHunt($target_player_id, $believer_type)
  {
    $player_id = self::getActivePlayerId();

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    if ($believer_type === null || $believer_type < 1 || $believer_type > 5) {
      throw new BgaVisibleSystemException(clienttranslate("Choose a Believer type for Witch Hunt"));
    }

    // 1. Check Defense (Great Mercy - Physical Defense)
    // if (checkDefense($target_player_id, 'physical')) return; 

    // 2. Execute Effect
    // Get target's believers
    $hand = $this->believer_cards->getCardsInLocation('hand', $target_player_id);
    $cards_to_kill = [];
    foreach ($hand as $card) {
      if ($card['type'] == $believer_type) {
        $cards_to_kill[] = $card['id'];
      }
    }

    $count = count($cards_to_kill);
    if ($count > 0) {
      $this->believer_cards->moveCards($cards_to_kill, 'discard');
      self::notifyAllPlayers('witchHunt', clienttranslate('${player_name} launches a Witch Hunt! ${target_name} loses ${n} believers of type ${type}'), array(
        'player_name' => self::getActivePlayerName(),
        'target_name' => self::getPlayerNameById($target_player_id),
        'target_player_id' => $target_player_id,
        'n' => $count,
        'type' => $this->type_labels[$believer_type]['name']
      ));
      self::notifyPlayer($target_player_id, 'believersDiscarded', '', array(
        'count' => $count,
        'card_ids' => $cards_to_kill
      ));
    } else {
      self::notifyAllPlayers('witchHunt', clienttranslate('${player_name} launches a Witch Hunt against ${target_name}, but finds no heretics!'), array(
        'player_name' => self::getActivePlayerName(),
        'target_name' => self::getPlayerNameById($target_player_id)
      ));
    }

    $this->gamestate->nextState('playActionCard');
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Mental Attacks
  ////////////

  /*
   * Spread Rumors (散播謠言)
   * Target Sect -> Steal 1 Believer from ALL members (Leader + Followers).
   */
  function playSpreadRumors($target_sect_id) // Usually passed as a player ID who belongs to that sect
  {
    $player_id = self::getActivePlayerId();

    if ($target_sect_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player or sect"));
    }

    // Identify Sect Members
    // If input is player_id, find their sect first
    $target_sect = self::getUniqueValueFromDB("SELECT player_sect FROM player WHERE player_id='$target_sect_id'");
    $members = self::getObjectListFromDB("SELECT player_id FROM player WHERE player_sect='$target_sect'", true);

    // For each member:
    // 1. Check Defense (Firm Faith - Mental Defense)
    //    Note: Defense is per-player or per-sect? Rule says "Designated Sect". Usually Leader defends for Sect?
    //    Let's assume individual check or Leader check.

    // 2. Execute Steal (Random 1)
    $stolen_total = 0;
    foreach ($members as $victim_id) {
      if ($victim_id == $player_id) continue;

      $hand = $this->believer_cards->getCardsInLocation('hand', $victim_id);
      if (count($hand) > 0) {
        $random_key = array_rand($hand);
        $card_to_steal = $hand[$random_key];

        $this->believer_cards->moveCard($card_to_steal['id'], 'hand', $player_id);
        $stolen_total++;

        self::notifyAllPlayers('spreadRumors', clienttranslate('${player_name} spreads rumors! Steals a believer from ${victim_name}'), array(
          'player_name' => self::getActivePlayerName(),
          'player_id' => $player_id,
          'victim_id' => $victim_id,
          'victim_name' => self::getPlayerNameById($victim_id)
        ));
        self::notifyPlayer($player_id, 'newBelievers', '', array('cards' => [$card_to_steal]));
        self::notifyPlayer($victim_id, 'believerStolen', '', array('card_id' => $card_to_steal['id']));
      }
    }

    self::notifyAllPlayers('spreadRumorsSummary', '', array(
      'player_id' => $player_id,
      'stolen_total' => $stolen_total
    ));

    $this->gamestate->nextState('playActionCard');
  }

  /*
   * Faith War (宗教戰爭)
   * Declare war on a target Sect. Initiates a multi-active state where
   * all members of both Sects select a Believer card for combat.
   */
  function playFaithWar($target_player_id)
  {
    $player_id = self::getActivePlayerId();

    if ($target_player_id == $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You must target another player"));
    }
    if (!$this->believer_cards->countCardInLocation('hand', $player_id)) {
      throw new BgaVisibleSystemException(clienttranslate("You need at least one Believer to start a Faith War"));
    }
    if (!$this->believer_cards->countCardInLocation('hand', $target_player_id)) {
      throw new BgaVisibleSystemException(clienttranslate("Target player has no Believers to fight with"));
    }

    // Store state context (current flow is a 1v1 duel loop)
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_defender_id', $target_player_id);
    self::setGameStateValue('war_type', 2); // 2 = Faith War

    self::notifyAllPlayers('faithWarStart', clienttranslate('${player_name} declares a Faith War against ${target_name}!'), array(
      'player_name' => self::getActivePlayerName(),
      'target_name' => self::getPlayerNameById($target_player_id)
    ));

    $this->gamestate->nextState('faithWarDuel');
  }

  /*
   * Martyrdom (煽動殉教)
   * AoE Physical Attack. Attacker sacrifices 1 believer.
   * All others choose 1 believer. Draw/Lose = Death for defender.
   */
  function playMartyrdom($believer_id)
  {
    $player_id = self::getActivePlayerId();

    // Store context
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_card_attacker', $believer_id);
    self::setGameStateValue('war_type', 3); // 3 = Martyrdom

    // Attacker believer is marked for death (but stays on table for comparison)
    $this->believer_cards->moveCard($believer_id, 'cardsontable', $player_id);

    self::notifyAllPlayers('martyrdomStart', clienttranslate('${player_name} initiates Martyrdom! Everyone else must defend.'), array(
      'player_name' => self::getActivePlayerName()
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Conspiracy (陰謀論)
   * AoE Mental Attack. Attacker sends 1 believer to snatch others.
   */
  function playConspiracy($believer_id)
  {
    $player_id = self::getActivePlayerId();

    // Store context
    self::setGameStateValue('war_attacker_id', $player_id);
    self::setGameStateValue('war_card_attacker', $believer_id);
    self::setGameStateValue('war_type', 6); // 6 = Conspiracy

    $this->believer_cards->moveCard($believer_id, 'cardsontable', $player_id);

    self::notifyAllPlayers('conspiracyStart', clienttranslate('${player_name} spreads a Conspiracy! Everyone else must defend.'), array(
      'player_name' => self::getActivePlayerName()
    ));

    $this->gamestate->nextState('confirmDefense');
  }

  /*
   * Generic Defense Confirmation Logic (State 50)
   */
  function stConfirmDefense()
  {
    $attacker_id = self::getGameStateValue('war_attacker_id');
    $war_type = self::getGameStateValue('war_type');

    // Determine targets
    $targets = [];
    $players = self::loadPlayersBasicInfos();
    foreach ($players as $pid => $p) {
      if ($pid == $attacker_id) continue;

      // Check if player HAS a defense card for this type
      $has_defense = false;
      if ($war_type == 1 || $war_type == 3) { // Physical
        $defense_cards = $this->action_cards->getCardsInLocation('hand', $pid);
        foreach ($defense_cards as $c) if ($c['type'] == 'great_mercy') {
          $has_defense = true;
          break;
        }
      } elseif ($war_type == 4) { // Betrayal
        $defense_cards = $this->action_cards->getCardsInLocation('hand', $pid);
        foreach ($defense_cards as $c) if ($c['type'] == 'breaking_faith') {
          $has_defense = true;
          break;
        }
      } else { // Mental
        $defense_cards = $this->action_cards->getCardsInLocation('hand', $pid);
        foreach ($defense_cards as $c) if ($c['type'] == 'firm_faith') {
          $has_defense = true;
          break;
        }
      }

      if ($has_defense) $targets[] = $pid;
    }

    if (empty($targets)) {
      // No one can defend, go straight to resolution
      $this->gamestate->nextState('resolveAttack');
    } else {
      $this->gamestate->setPlayersMultiactive($targets, 'resolveAttack');
    }
  }
  //////////// 

  function playDefenseCard($card_id)
  {
    self::checkAction("playDefenseCard");
    $player_id = self::getCurrentPlayerId();
    $card = $this->action_cards->getCard($card_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $player_id) {
      throw new BgaVisibleSystemException(clienttranslate("You do not have this defense card in hand"));
    }

    $war_type = self::getGameStateValue('war_type');
    $valid_types = ($war_type == 1 || $war_type == 3) ? ['great_mercy'] : ['firm_faith', 'breaking_faith'];
    if (!in_array($card['type'], $valid_types)) {
      throw new BgaVisibleSystemException(clienttranslate("This is not a valid defense card for the current attack"));
    }

    $this->action_cards->moveCard($card_id, 'discard');
    self::notifyAllPlayers('defensePlayed', clienttranslate('${player_name} uses a defense card'), array(
      'player_name' => self::getPlayerNameById($player_id)
    ));

    $this->gamestate->setPlayerNonMultiactive($player_id, 'resolveAttack');
  }

  function passDefense()
  {
    self::checkAction("passDefense");
    $player_id = self::getCurrentPlayerId();
    self::notifyAllPlayers('passDefense', clienttranslate('${player_name} does not defend'), array(
      'player_name' => self::getPlayerNameById($player_id)
    ));
    $this->gamestate->setPlayerNonMultiactive($player_id, 'resolveAttack');
  }

  function stResolveAttack()
  {
    $war_type = self::getGameStateValue('war_type');

    switch ($war_type) {
      case 2:
        $this->gamestate->nextState('faithWarDuel');
        break;
      case 3:
        $this->gamestate->nextState('martyrdom');
        break;
      default:
        $this->gamestate->nextState('playerTurn');
        break;
    }
  }

  // (Legacy playActionCard removed to avoid Cannot redeclare fatal error)
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
    self::notifyAllPlayers('endTurn', clienttranslate('${player_name} finishes their action phase'), array(
      'player_name' => self::getActivePlayerName()
    ));
    $this->gamestate->nextState('endTurn');
  }

  function surrender($leader_id)
  {
    self::checkAction("surrender");
    $player_id = self::getActivePlayerId();

    $sql = "UPDATE player SET player_role = 1, player_leader_id = $leader_id, player_is_skill_sealed = 1 WHERE player_id = $player_id";
    self::DbQuery($sql);

    self::notifyAllPlayers('surrender', clienttranslate('${player_name} surrenders to ${leader_name} and becomes a Follower!'), array(
      'player_name' => self::getActivePlayerName(),
      'leader_name' => self::getPlayerNameById($leader_id)
    ));

    self::setGameStateValue('follower_id_waiting', $player_id);

    // Make leader active to give believer
    $this->gamestate->changeActivePlayer($leader_id);
    $this->gamestate->nextState('leaderGiveBeliever');
  }

  function becomeWanderer()
  {
    self::checkAction("becomeWanderer");
    $player_id = self::getActivePlayerId();

    $cards = $this->action_cards->getCardsInLocation('hand', $player_id);
    $card_ids = array_map(function ($c) {
      return $c['id'];
    }, $cards);
    if (!empty($card_ids)) {
      $this->action_cards->moveCards($card_ids, 'discard');
    }

    $sql = "UPDATE player SET player_role = 2, player_leader_id = NULL WHERE player_id = $player_id";
    self::DbQuery($sql);

    self::notifyAllPlayers('becomeWanderer', clienttranslate('${player_name} becomes a Wanderer and discards all action cards!'), array(
      'player_name' => self::getActivePlayerName()
    ));

    $this->gamestate->nextState('nextPlayer');
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

    $this->gamestate->nextState('nextPlayer');
  }

  // (Legacy playFaithWar removed, replaced by the new Sect-based multi-active method above)

  /*
   * Player action: Select a believer card for combat
   */
  function playBelieverCardCombat($card_id)
  {
    self::checkAction("playBelieverCard");
    $player_id = self::getCurrentPlayerId(); // Can be attacker or defender

    // Verify ownership
    $card = $this->believer_cards->getCard($card_id);
    if ($card['location'] != 'hand' || $card['location_arg'] != $player_id)
      throw new BgaVisibleSystemException(clienttranslate("You do not own this card"));

    // Store selection
    $attacker_id = self::getGameStateValue('war_attacker_id');
    $defender_id = self::getGameStateValue('war_defender_id');

    if ($player_id == $attacker_id) {
      self::setGameStateValue('war_card_attacker', $card_id);
    } elseif ($player_id == $defender_id) {
      self::setGameStateValue('war_card_defender', $card_id);
    } else {
      throw new BgaVisibleSystemException(clienttranslate("You are not part of this war"));
    }

    // Mark player as active/done
    $this->gamestate->setPlayerNonMultiactive($player_id, 'resolveDuel');
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Game state actions
  ////////////

  function stFaithWarDuel()
  {
    $attacker_id = self::getGameStateValue('war_attacker_id');
    $defender_id = self::getGameStateValue('war_defender_id');

    // Set both players active
    $this->gamestate->setPlayersMultiactive([$attacker_id, $defender_id], 'resolveDuel');

    // Reset card choices for this round
    self::setGameStateValue('war_card_attacker', 0);
    self::setGameStateValue('war_card_defender', 0);

    self::notifyAllPlayers('faithWarRound', clienttranslate('Faith War Round: Attacker and Defender must choose a believer.'), []);
  }

  function stResolveDuel()
  {
    $attacker_id = self::getGameStateValue('war_attacker_id');
    $defender_id = self::getGameStateValue('war_defender_id');

    $card_a_id = self::getGameStateValue('war_card_attacker');
    $card_b_id = self::getGameStateValue('war_card_defender');

    if ($card_a_id == 0 || $card_b_id == 0) {
      // Should not happen if transitions are correct
      return;
    }

    $card_a = $this->believer_cards->getCard($card_a_id);
    $card_b = $this->believer_cards->getCard($card_b_id);

    // --- Combat Logic ---
    $result = $this->compareBelievers($card_a['type'], $card_b['type'], true); // true = is faith war

    $winner_id = null;
    $dead_cards = [];

    if ($result['winner'] == 1) {
      // Attacker wins
      $winner_id = $attacker_id;
      $dead_cards[] = $card_b; // Defender card dies
      $this->believer_cards->moveCard($card_b_id, 'discard');
      $this->believer_cards->moveCard($card_a_id, 'hand', $attacker_id); // Return to hand

      self::notifyAllPlayers('duelResult', clienttranslate('${winner_name} wins! ${loser_name}\'s believer dies.'), [
        'winner_name' => self::getPlayerNameById($attacker_id),
        'loser_name' => self::getPlayerNameById($defender_id),
        'card_a' => $card_a,
        'card_b' => $card_b
      ]);

      // Handle Bonus
      if ($result['bonus']) {
        $bonus_card = $this->believer_cards->pickCard('deck', $attacker_id);
        self::notifyAllPlayers('duelBonus', clienttranslate('${player_name} gets a War Bonus (Crushing Victory)!'), [
          'player_name' => self::getPlayerNameById($attacker_id)
        ]);
        self::notifyPlayer($attacker_id, 'newBelievers', '', ['cards' => [$bonus_card]]);
      }
    } elseif ($result['winner'] == -1) {
      // Defender wins
      $winner_id = $defender_id;
      $dead_cards[] = $card_a; // Attacker card dies
      $this->believer_cards->moveCard($card_a_id, 'discard');
      $this->believer_cards->moveCard($card_b_id, 'hand', $defender_id); // Return to hand

      self::notifyAllPlayers('duelResult', clienttranslate('${winner_name} defends successfully! ${loser_name}\'s believer dies.'), [
        'winner_name' => self::getPlayerNameById($defender_id),
        'loser_name' => self::getPlayerNameById($attacker_id),
        'card_a' => $card_a,
        'card_b' => $card_b
      ]);

      if ($result['bonus']) {
        // Defender bonus logic same as above
        $bonus_card = $this->believer_cards->pickCard('deck', $defender_id);
        self::notifyAllPlayers('duelBonus', clienttranslate('${player_name} gets a War Bonus!'), [
          'player_name' => self::getPlayerNameById($defender_id)
        ]);
        self::notifyPlayer($defender_id, 'newBelievers', '', ['cards' => [$bonus_card]]);
      }
    } else {
      // Draw (0) - Both die in Physical War
      $dead_cards[] = $card_a;
      $dead_cards[] = $card_b;
      $this->believer_cards->moveCard($card_a_id, 'discard');
      $this->believer_cards->moveCard($card_b_id, 'discard');

      self::notifyAllPlayers('duelResult', clienttranslate('It\'s a DRAW! Both believers die.'), [
        'card_a' => $card_a,
        'card_b' => $card_b
      ]);
    }

    // --- Loop Check ---
    // Rule: "until ONE side has used ALL believers" (modified: usually until one runs out or all cycled)
    // Check hand counts
    $count_a = $this->believer_cards->countCardInLocation('hand', $attacker_id);
    $count_b = $this->believer_cards->countCardInLocation('hand', $defender_id);

    if ($count_a == 0 || $count_b == 0) {
      // War End
      self::notifyAllPlayers('faithWarEnd', clienttranslate('Faith War ended. One side has no believers left.'), []);
      $this->gamestate->nextState('endWar');
    } else {
      // Continue
      // TODO: Logic to track "used" believers if we want to enforce "cycle through all".
      // For now, simplified: until death do us part (or until empty).
      // If the rule is strictly "cycle through", we need another global to track participated IDs.
      // Assuming "death loop" for now based on context.
      $this->gamestate->nextState('nextDuelRound');
    }
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
      $this->gamestate->nextState('surrenderOrWanderer');
      return;
    }

    $this->gamestate->nextState('nextPlayer');
  }

  function stNextPlayer()
  {
    $players = self::loadPlayersBasicInfos();

    // Reset turn flags
    self::setGameStateValue('performedActions', 0b0000);

    // Activate next player
    $player_id = self::activeNextPlayer();
    self::giveExtraTime($player_id);

    // Draw Phase: Draw action cards until hand limit
    $hand_limit = 6;
    $action_cards_count = $this->action_cards->countCardInLocation('hand', $player_id);
    if ($action_cards_count < $hand_limit) {
      $cards_to_draw = $hand_limit - $action_cards_count;
      $drawn_cards = $this->action_cards->pickCards($cards_to_draw, 'deck', $player_id);

      // Handle empty deck
      if (empty($drawn_cards) || count($drawn_cards) < $cards_to_draw) {
        $this->action_cards->moveAllCardsInLocation('discard', 'deck');
        $this->action_cards->shuffle('deck');
        $remaining = $cards_to_draw - count($drawn_cards);
        if ($remaining > 0) {
          $more_cards = $this->action_cards->pickCards($remaining, 'deck', $player_id);
          $drawn_cards = array_merge($drawn_cards, $more_cards);
        }
      }

      self::notifyPlayer($player_id, 'newActionCards', '', array('cards' => $drawn_cards));
      self::notifyAllPlayers('drawActionCards', clienttranslate('${player_name} draws action cards until hand limit'), array(
        'player_name' => self::getActivePlayerName()
      ));
    }

    // Check if player is Wanderer
    $player_role = self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $player_id");
    if ($player_role == 2) { // 2 = Wanderer
      self::notifyAllPlayers('wandererTurnStart', clienttranslate('${player_name} (Wanderer) starts their turn! They must steal 1 believer.'), array(
        'player_name' => self::getActivePlayerName()
      ));
    }

    $this->gamestate->nextState('nextPlayer');
  }

  function stEndHand()
  {
    // Placeholder for end-of-round logic (scoring, reshuffling)
    // For now, just start a new hand if needed
    $this->gamestate->nextState("nextHand");
  }

  //////////////////////////////////////////////////////////////////////////////
  //////////// Zombie
  ////////////

  function zombieTurn($state, $active_player)
  {
    $statename = $state['name'];

    if ($state['type'] === "activeplayer") {
      switch ($statename) {
        default:
          $this->gamestate->nextState("zombiePass");
          break;
      }

      return;
    }

    if ($state['type'] === "multipleactiveplayer") {
      // Make sure player is in a non blocking status for role turn
      $this->gamestate->setPlayerNonMultiactive($active_player, '');

      return;
    }

    throw new feException("Zombie mode not supported at this game state: " . $statename);
  }

  function upgradeTableDb($from_version) {}
}
