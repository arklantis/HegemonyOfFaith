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
 * states.inc.php
 *
 * HegemonyOfFaith game states description
 *
 */

/*
   Game state machine is a tool used to facilitate game developpement by doing common stuff that can be set up
   in a very easy way from this configuration file.

   Please check the BGA Studio presentation about game state to understand this, and associated documentation.

   Summary:

   States types:
   _ activeplayer: in this type of state, we expect some action from the active player.
   _ multipleactiveplayer: in this type of state, we expect some action from multiple players (the active players)
   _ game: this is an intermediary state where we don't expect any actions from players. Your game logic must decide what is the next game state.
   _ manager: special type for initial and final state

   Arguments of game states:
   _ name: the name of the GameState, in order you can recognize it on your own code.
   _ description: the description of the current game state is always displayed in the action status bar on
                  the top of the game. Most of the time this is useless for game state with "game" type.
   _ descriptionmyturn: the description of the current game state when it's your turn.
   _ type: defines the type of game states (activeplayer / multipleactiveplayer / game / manager)
   _ action: name of the method to call when this game state become the current game state. Usually, the
             action method is prefixed by "st" (ex: "stMyGameStateName").
   _ possibleactions: array that specify possible player actions on this step. It allows you to use "checkAction"
                      method on both client side (Javacript: this.checkAction) and server side (PHP: self::checkAction).
   _ transitions: the transitions are the possible paths to go from a game state to another. You must name
                  transitions in order to use transition names in "nextState" PHP method, and use IDs to
                  specify the next game state for each transition.
   _ args: name of the method to call to retrieve arguments for this gamestate. Arguments are sent to the
           client side to be used on "onEnteringState" or to set arguments in the gamestate description.
   _ updateGameProgression: when specified, the game progression is updated (=> call to your getGameProgression
                            method).
*/

//    !! It is not a good idea to modify this file when a game is running !!


$machinestates = array(



  /// New hand
  // Note: ID=2 => your first state

  2 => array(
    "name" => "newHand",
    "description" => "",
    "type" => "game",
    "action" => "stNewHand",
    "updateGameProgression" => true,
    "transitions" => array("" => 31)
  ),

  // Player Turn Loop
  31 => array(
    "name" => "playerTurn",
    "description" => clienttranslate('${actplayer} must take action'),
    "descriptionmyturn" => clienttranslate('${you} must play a card, or end the turn'),
    "type" => "activeplayer",
    "possibleactions" => array("playActionCard", "endTurn"),
    "transitions" => array(
      "playActionCard" => 31,
      "endTurn" => 34,         // Go to End Turn Phase check
      "confirmDefense" => 50,  // Used by Conspiracy, Martyrdom
      "faithWarDuel" => 70,    // Used by Faith War
      "startCombat" => 70      // Used by some legacy combat flows
    )
  ),

  // --- Turn End Phase States ---
  34 => array(
    "name" => "checkEndTurnPhase",
    "description" => "",
    "type" => "game",
    "action" => "stCheckEndTurnPhase",
    "transitions" => array(
      "discardingActionCard" => 32, // If over hand limit
      "surrenderOrWanderer" => 35,  // If 0 believers
      "nextPlayer" => 33            // Default
    )
  ),

  32 => array(
    "name" => "discardingActionCard",
    "description" => clienttranslate('${actplayer} must discard excess action cards'),
    "descriptionmyturn" => clienttranslate('${you} must select cards to discard to reach your hand limit'),
    "type" => "activeplayer",
    "possibleactions" => array("confirmDiscardingActionCard"),
    "transitions" => array("nextState" => 34) // Loop back to check end conditions again
  ),

  35 => array(
    "name" => "chooseSurrenderOrWanderer",
    "description" => clienttranslate('${actplayer} has 0 Believers! Must surrender or become Wanderer'),
    "descriptionmyturn" => clienttranslate('${you} have 0 Believers! Surrender to a Leader or become a Wanderer.'),
    "type" => "activeplayer",
    "possibleactions" => array("surrender", "becomeWanderer"),
    "transitions" => array(
      "leaderGiveBeliever" => 36, // If surrendered
      "nextPlayer" => 33          // If wanderer, just proceed
    )
  ),

  36 => array(
    "name" => "leaderGiveBeliever",
    "description" => clienttranslate('${actplayer} must give 1 Believer to their new Follower'),
    "descriptionmyturn" => clienttranslate('${you} must select 1 Believer to give to your new Follower'),
    "type" => "activeplayer",
    "possibleactions" => array("giveBeliever"),
    "transitions" => array(
      "nextPlayer" => 33
    )
  ),

  33 => array(
    "name" => "nextPlayer",
    "description" => "",
    "type" => "game",
    "action" => "stNextPlayer",
    "transitions" => array(
      "nextPlayer" => 31,
      "endHand" => 40
    )
  ),

  // --- Combat & Interaction States ---

  // 1. Confirm Defense (AoE or Single Target)
  50 => array(
    "name" => "confirmDefense",
    "description" => clienttranslate('${actplayer} must choose whether to defend'),
    "descriptionmyturn" => clienttranslate('${you} must choose whether to defend against the attack'),
    "type" => "multipleactiveplayer",
    "action" => "stConfirmDefense",
    "possibleactions" => array("playDefenseCard", "passDefense"),
    "transitions" => array(
      "nextDefenseStep" => 51, // Check if everyone responded
      "resolveAttack" => 60,   // Go to resolution
      "cancelAttack" => 31     // Attack blocked fully
    )
  ),

  // 2. Resolve Attack Effect (Game State)
  60 => array(
    "name" => "resolveAttack",
    "description" => "",
    "type" => "game",
    "action" => "stResolveAttack",
    "transitions" => array(
      "playerTurn" => 31,      // Back to main turn
      "faithWarDuel" => 70,    // Start War Loop
      "faithDebate" => 75,     // Start Debate Loop
      "martyrdom" => 80        // Start Martyrdom Loop
    )
  ),

  // 3. Faith War Duel (1v1 Loop)
  70 => array(
    "name" => "faithWarDuel",
    "description" => clienttranslate('Faith War: Players must choose a believer card'),
    "descriptionmyturn" => clienttranslate('${you} must choose a believer card for Faith War'),
    "type" => "multipleactiveplayer",
    "action" => "stFaithWarDuel",
    "possibleactions" => array("playBelieverCard"),
    "transitions" => array(
      "resolveDuel" => 71      // Compare cards
    )
  ),

  71 => array(
    "name" => "resolveDuel",
    "description" => "",
    "type" => "game",
    "action" => "stResolveDuel",
    "transitions" => array(
      "nextDuelRound" => 70,   // Loop back if not finished
      "endWar" => 31           // End war, back to turn
    )
  ),

  // End of the hand (check win condition, reshuffle if needed)
  40 => array(
    "name" => "endHand",
    "description" => "",
    "type" => "game",
    "action" => "stEndHand",
    "transitions" => array("nextHand" => 2, "endGame" => 99)
  ),



);
