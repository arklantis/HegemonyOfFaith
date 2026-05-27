<?php

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
    "transitions" => array(
      "chooseInitialSkill" => 26,
      "nextPlayer" => 31
    )
  ),

  26 => array(
    "name" => "chooseInitialSkill",
    "description" => clienttranslate('Waiting for ${actplayer} to choose a starting Skill'),
    "descriptionmyturn" => clienttranslate('${you} must choose 1 of your 2 starting Skills'),
    "type" => "activeplayer",
    "action" => "stChooseInitialSkill",
    "args" => "argChooseInitialSkill",
    "possibleactions" => array("chooseInitialSkill"),
    "transitions" => array(
      "chooseDone" => 26,
      "nextPlayer" => 31
    )
  ),

  // Player Turn Loop
  31 => array(
    "name" => "playerTurn",
    "description" => clienttranslate('${actplayer} must take action'),
    "descriptionmyturn" => clienttranslate('${you} must take an action'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argPlayerTurn",
    "possibleactions" => array("playActionCard", "discardActionCards", "useSkill", "endTurn", "wandererSteal"),
    "transitions" => array(
      "playActionCard" => 31,
      "wandererSteal" => 31,
      "endTurn" => 34,         // Go to End Turn Phase check
      "confirmDefense" => 50,  // Used by Conspiracy, Martyrdom
      "faithWarDuel" => 70,    // Used by Faith War
      "startCombat" => 70,     // Used by some legacy combat flows
      "secretAllianceAttackerChoice" => 103,
      "secretAllianceTargetChoice" => 90,
      "infoSpyReview" => 106,
      "prophetInterrupt" => 108,
      "prophetPrompt" => 91,
      "prophetGuess" => 92,
      "holyRebirthPrompt" => 109
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
      "routeSurrenderBankrupt" => 39,
      "askLeaderSupport" => 37,
      "nextPlayer" => 33            // Default
    )
  ),

  32 => array(
    "name" => "discardingActionCard",
    "description" => clienttranslate('${actplayer} must discard excess action cards'),
    "descriptionmyturn" => clienttranslate('${you} must discard cards to reach your hand limit'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argDiscardingActionCard",
    "possibleactions" => array("confirmDiscardingActionCard"),
    "transitions" => array("nextState" => 34) // Loop back to check end conditions again
  ),

  35 => array(
    "name" => "chooseSurrenderOrWanderer",
    "description" => clienttranslate('${actplayer} has 0 Believers and is in the Surrender Phase'),
    "descriptionmyturn" => clienttranslate('${you} have 0 Believers. Choose a Sect Leader for surrender'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argChooseSurrenderOrWanderer",
    "possibleactions" => array("surrender", "becomeWanderer"),
    "transitions" => array(
      "routeSurrenderLeaderResponse" => 41,
      "nextPlayer" => 33
    )
  ),

  37 => array(
    "name" => "askLeaderSupport",
    "description" => clienttranslate('Waiting for ${actplayer} (${sect_name}) to decide'),
    "descriptionmyturn" => clienttranslate('${you} must respond to the support request'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argAskLeaderSupport",
    "possibleactions" => array("acceptLeaderSupport", "rejectLeaderSupport"),
    "transitions" => array(
      "leaderGiveBeliever" => 36,
      "routeSurrenderBankrupt" => 39
    )
  ),

  38 => array(
    "name" => "surrenderLeaderResponse",
    "description" => clienttranslate('${actplayer} must respond to surrender'),
    "descriptionmyturn" => clienttranslate('${you} must respond to surrender'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "possibleactions" => array("acceptSurrenderRequest", "rejectSurrenderRequest"),
    "transitions" => array(
      "leaderGiveBeliever" => 36,
      "routeSurrenderBankrupt" => 39,
      "surrenderOrWanderer" => 35,
      "nextPlayer" => 33
    )
  ),

  39 => array(
    "name" => "routeSurrenderBankrupt",
    "description" => "",
    "type" => "game",
    "action" => "stRouteSurrenderBankrupt",
    "transitions" => array(
      "surrenderOrWanderer" => 35,
      "nextPlayer" => 33
    )
  ),

  41 => array(
    "name" => "routeSurrenderLeaderResponse",
    "description" => "",
    "type" => "game",
    "action" => "stRouteSurrenderLeaderResponse",
    "transitions" => array(
      "surrenderLeaderResponse" => 38
    )
  ),

  36 => array(
    "name" => "leaderGiveBeliever",
    "description" => clienttranslate('Waiting for the Sect Leader\'s decision in the Surrender Phase'),
    "descriptionmyturn" => clienttranslate('${you} must select 1 Believer to give to your Follower'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "possibleactions" => array("giveBeliever", "cancelGiveBeliever"),
    "transitions" => array(
      "nextPlayer" => 33,
      "routeSurrenderBankrupt" => 39
    )
  ),

  33 => array(
    "name" => "nextPlayer",
    "description" => "",
    "type" => "game",
    "action" => "stNextPlayer",
    "transitions" => array(
      "nextPlayer" => 31,
      "endHand" => 40,
      "finalStruggleDuel" => 70,
      "finalStruggleSectWar" => 69,
      "finalConspiracyBattle" => 83
    )
  ),

  // --- Combat & Interaction States ---

  // 1. Confirm Defense (AoE or Single Target)
  50 => array(
    "name" => "confirmDefense",
    "description" => clienttranslate('Waiting for defense decisions'),
    "descriptionmyturn" => clienttranslate('${you} must respond to this attack'),
    "type" => "multipleactiveplayer",
    "action" => "stConfirmDefense",
    "args" => "argConfirmDefense",
    "possibleactions" => array("playDefenseCard", "passDefense"),
    "transitions" => array(
      "nextDefenseStep" => 51, // Check if everyone responded
      "resolveAttack" => 60,   // Go to resolution
      "cancelAttack" => 31     // Attack blocked fully
    )
  ),

  51 => array(
    "name" => "afterDefenseResponses",
    "description" => "",
    "type" => "game",
    "action" => "stAfterDefenseResponses",
    "transitions" => array(
      "resolveAttack" => 60,
      "cancelAttack" => 31,
      "cancelAttackEndTurn" => 34
    )
  ),

  // 2. Resolve Attack Effect (Game State)
  60 => array(
    "name" => "resolveAttack",
    "description" => "",
    "type" => "game",
    "action" => "stResolveAttack",
    "transitions" => array(
      "reverseKarmaPrompt" => 96,
      "playerTurn" => 31,      // Back to main turn
      "faithWarDuel" => 69,    // Choose representatives first
      "faithDebate" => 75,     // Start Debate Loop
      "martyrdom" => 80,       // Start Martyrdom Loop
      "conspiracy" => 82,      // Start Conspiracy Loop
      "breakingFaith" => 89,
      "witchHunt" => 87,
      "spreadRumors" => 88
    )
  ),

  // 2.5 Faith War Representative Selection (Sect Leaders choose who fights this round)
  69 => array(
    "name" => "chooseWarRepresentative",
    "description" => clienttranslate('Sect Leaders must assign representatives for this Faith War round'),
    "descriptionmyturn" => clienttranslate('${you} must assign a representative for this Faith War round'),
    "type" => "multipleactiveplayer",
    "action" => "stChooseWarRepresentative",
    "possibleactions" => array("chooseWarRepresentative"),
    "args" => "argChooseWarRepresentative",
    "transitions" => array(
      "chooseDone" => 70,
      "endWar" => 31,
      "endHand" => 40
    )
  ),

  // 3. Faith War Duel (1v1 Loop)
  70 => array(
    "name" => "faithWarDuel",
    "description" => clienttranslate('${attacker_sect_name} vs ${defender_sect_name}: Faith War in progress'),
    "descriptionmyturn" => clienttranslate('${you} must choose one Believer for Faith War'),
    "type" => "multipleactiveplayer",
    "action" => "stFaithWarDuel",
    "args" => "argFaithWarDuel",
    "possibleactions" => array("playBelieverCard"),
    "transitions" => array(
      "nextDuelStep" => 71,      // Compare cards once both players have answered
      "endHand" => 40
    )
  ),

  71 => array(
    "name" => "resolveDuel",
    "description" => "",
    "type" => "game",
    "action" => "stResolveDuel",
    "transitions" => array(
      "nextDuelRound" => 69,   // Leader chooses representative again
      "nextFinalStruggleRound" => 70,
      "reverseKarmaPrompt" => 96,
      "holyRebirthPrompt" => 109,
      "playerTurn" => 31,
      "endTurn" => 34,
      "endHand" => 40
    )
  ),

  75 => array(
    "name" => "chooseFaithDebateRepresentative",
    "description" => clienttranslate('Faith Debate: Sect Leaders assign representatives'),
    "descriptionmyturn" => clienttranslate('${you} must assign a representative for Faith Debate'),
    "type" => "multipleactiveplayer",
    "action" => "stChooseFaithDebateRepresentative",
    "possibleactions" => array("chooseFaithDebateRepresentative"),
    "args" => "argChooseFaithDebateRepresentative",
    "transitions" => array(
      "chooseDone" => 76,
      "endDebate" => 31
    )
  ),

  76 => array(
    "name" => "faithDebateDuel",
    "description" => clienttranslate('${attacker_sect_name} vs ${defender_sect_name}: Faith Debate in progress'),
    "descriptionmyturn" => clienttranslate('${you} must choose one Believer for Faith Debate'),
    "type" => "multipleactiveplayer",
    "action" => "stFaithDebateDuel",
    "args" => "argFaithDebateDuel",
    "possibleactions" => array("playBelieverCard", "stopFaithDebate"),
    "transitions" => array(
      "nextDebateStep" => 77,
      "leaderStopApproval" => 107
    )
  ),

  77 => array(
    "name" => "resolveFaithDebateDuel",
    "description" => "",
    "type" => "game",
    "action" => "stResolveFaithDebateDuel",
    "transitions" => array(
      "nextDebateRound" => 75,
      "reverseKarmaPrompt" => 96,
      "endDebate" => 31,
      "endTurn" => 34
    )
  ),

  80 => array(
    "name" => "martyrdomChooseRepresentative",
    "description" => clienttranslate('Martyrdom: Sect Leaders assign representatives'),
    "descriptionmyturn" => clienttranslate('${you} must assign a representative for Martyrdom'),
    "type" => "multipleactiveplayer",
    "action" => "stMartyrdomChooseRepresentative",
    "possibleactions" => array("chooseMartyrdomRepresentative"),
    "args" => "argChooseMartyrdomRepresentative",
    "transitions" => array(
      "chooseDone" => 85,
      "resolveNow" => 86
    )
  ),

  85 => array(
    "name" => "martyrdomChooseBelievers",
    "description" => clienttranslate('Waiting for other players to choose a Believer'),
    "descriptionmyturn" => clienttranslate('${you} must choose one Believer for Martyrdom'),
    "type" => "multipleactiveplayer",
    "action" => "stMartyrdomChooseBelievers",
    "args" => "argMartyrdomChooseBelievers",
    "possibleactions" => array("playBelieverCard"),
    "transitions" => array(
      "nextStep" => 86
    )
  ),

  86 => array(
    "name" => "resolveMartyrdom",
    "description" => "",
    "type" => "game",
    "action" => "stResolveMartyrdom",
    "transitions" => array(
      "reverseKarmaPrompt" => 96,
      "playerTurn" => 31,
      "endTurn" => 34
    )
  ),

  82 => array(
    "name" => "conspiracyChooseRepresentative",
    "description" => clienttranslate('Conspiracy: Sect Leaders assign representatives'),
    "descriptionmyturn" => clienttranslate('${you} must assign a representative for Conspiracy'),
    "type" => "multipleactiveplayer",
    "action" => "stConspiracyChooseRepresentative",
    "possibleactions" => array("chooseConspiracyRepresentative"),
    "args" => "argChooseConspiracyRepresentative",
    "transitions" => array(
      "chooseDone" => 83,
      "resolveNow" => 84
    )
  ),

  83 => array(
    "name" => "conspiracyChooseBelievers",
    "description" => clienttranslate('Waiting for other players to choose a Believer'),
    "descriptionmyturn" => clienttranslate('${you} must choose one Believer for Conspiracy'),
    "type" => "multipleactiveplayer",
    "action" => "stConspiracyChooseBelievers",
    "args" => "argConspiracyChooseBelievers",
    "possibleactions" => array("playBelieverCard"),
    "transitions" => array(
      "nextStep" => 84
    )
  ),

  84 => array(
    "name" => "resolveConspiracy",
    "description" => "",
    "type" => "game",
    "action" => "stResolveConspiracy",
    "transitions" => array(
      "reverseKarmaPrompt" => 96,
      "nextFinalConspiracyRound" => 83,
      "playerTurn" => 31,
      "endTurn" => 34,
      "endHand" => 40
    )
  ),

  96 => array(
    "name" => "reverseKarmaPrompt",
    "description" => clienttranslate('Waiting for confrontation to continue'),
    "descriptionmyturn" => clienttranslate('${you}: use Karma Reversed to reverse the confrontation result'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argReverseKarmaPrompt",
    "possibleactions" => array("reverseKarmaUse", "reverseKarmaSkip"),
    "transitions" => array(
      "resolve" => 97
    )
  ),

  97 => array(
    "name" => "resolveReverseKarmaPrompt",
    "description" => "",
    "type" => "game",
    "action" => "stResolveReverseKarmaPrompt",
    "transitions" => array(
      "reverseKarmaPrompt" => 96,
      "resumeWarSetup" => 69,
      "resumeDebateSetup" => 75,
      "resumeMartyrdomSetup" => 80,
      "resumeConspiracySetup" => 82,
      "resumeWar" => 71,
      "resumeDebate" => 77,
      "resumeMartyrdom" => 86,
      "resumeConspiracy" => 84
    )
  ),

  87 => array(
    "name" => "resolveWitchHunt",
    "description" => "",
    "type" => "game",
    "action" => "stResolveWitchHunt",
    "transitions" => array(
      "holyRebirthPrompt" => 109,
      "playerTurn" => 31,
      "endTurn" => 34
    )
  ),

  88 => array(
    "name" => "resolveSpreadRumors",
    "description" => "",
    "type" => "game",
    "action" => "stResolveSpreadRumors",
    "transitions" => array(
      "playerTurn" => 31,
      "endTurn" => 34
    )
  ),

  89 => array(
    "name" => "resolveBreakingFaith",
    "description" => "",
    "type" => "game",
    "action" => "stResolveBreakingFaith",
    "transitions" => array(
      "playerTurn" => 31,
      "endTurn" => 34
    )
  ),

  103 => array(
    "name" => "secretAllianceAttackerChoice",
    "description" => clienttranslate('Waiting for players to exchange Action cards'),
    "descriptionmyturn" => clienttranslate('${you} must choose one Action card to offer'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "possibleactions" => array("chooseSecretAllianceCard"),
    "transitions" => array(
      "secretAllianceSwitchToTarget" => 104
    )
  ),

  104 => array(
    "name" => "secretAllianceSwitchToTarget",
    "description" => "",
    "type" => "game",
    "action" => "stSecretAllianceSwitchToTarget",
    "transitions" => array(
      "secretAllianceTargetChoice" => 90
    )
  ),

  90 => array(
    "name" => "secretAllianceTargetChoice",
    "description" => clienttranslate('Waiting for players to exchange Action cards'),
    "descriptionmyturn" => clienttranslate('${you} must choose one Action card to exchange'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "possibleactions" => array("chooseSecretAllianceCard"),
    "transitions" => array(
      "secretAllianceReturnToAttacker" => 105
    )
  ),

  105 => array(
    "name" => "secretAllianceReturnToAttacker",
    "description" => "",
    "type" => "game",
    "action" => "stSecretAllianceReturnToAttacker",
    "transitions" => array(
      "playerTurn" => 31,
      "endTurn" => 34,
      "playActionCard" => 31
    )
  ),

  91 => array(
    "name" => "prophetSkillPrompt",
    "description" => clienttranslate('Waiting for The Prophet decision'),
    "descriptionmyturn" => clienttranslate('${you}: use The Prophet to predict the draw'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argProphetSkillPrompt",
    "possibleactions" => array("prophetEnableSkill", "prophetSkipSkill"),
    "transitions" => array(
      "toGuess" => 92,
      "resolve" => 93
    )
  ),

  108 => array(
    "name" => "prophetInterruptHandoff",
    "description" => "",
    "type" => "game",
    "action" => "stRouteProphetInterrupt",
    "transitions" => array(
      "prophetPrompt" => 91,
      "prophetGuess" => 92,
      "playActionCard" => 31,
      "endTurn" => 34
    )
  ),

  109 => array(
    "name" => "holyRebirthInterruptHandoff",
    "description" => "",
    "type" => "game",
    "action" => "stRouteHolyRebirthInterrupt",
    "transitions" => array(
      "holyRebirthPrompt" => 94,
      "playActionCard" => 31,
      "playerTurn" => 31
    )
  ),

  92 => array(
    "name" => "prophetGuess",
    "description" => clienttranslate('Waiting for The Prophet prediction'),
    "descriptionmyturn" => clienttranslate('${you} must choose a Believer type to predict'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argProphetGuess",
    "possibleactions" => array("prophetGuessBelieverType", "prophetPassGuess"),
    "transitions" => array(
      "resolve" => 93
    )
  ),

  93 => array(
    "name" => "resolveProphetPrediction",
    "description" => "",
    "type" => "game",
    "action" => "stResolveProphetPrediction",
    "transitions" => array(
      "prophetPrompt" => 91,
      "prophetGuess" => 92,
      "playActionCard" => 31,
      "endTurn" => 34
    )
  ),

  94 => array(
    "name" => "holyRebirthPrompt",
    "description" => clienttranslate('Waiting for confrontation to continue'),
    "descriptionmyturn" => clienttranslate('${you}: use Holy Rebirth to revive 3 Believers'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argHolyRebirthPrompt",
    "possibleactions" => array("holyRebirthUse", "holyRebirthSkip"),
    "transitions" => array(
      "resolve" => 95
    )
  ),

  95 => array(
    "name" => "resolveHolyRebirth",
    "description" => "",
    "type" => "game",
    "action" => "stResolveHolyRebirth",
    "transitions" => array(
      "playActionCard" => 31,
      "endTurn" => 34,
      "playerTurn" => 31
    )
  ),

  106 => array(
    "name" => "infoSpyReview",
    "description" => clienttranslate('${actplayer} is reviewing Info Spy result'),
    "descriptionmyturn" => clienttranslate('${you} must close Info Spy result to continue'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "possibleactions" => array("completeInfoSpy"),
    "transitions" => array(
      "playActionCard" => 31,
      "endTurn" => 34
    )
  ),

  107 => array(
    "name" => "faithDebateStopLeaderApproval",
    "description" => clienttranslate('Waiting for Faith Debate decision'),
    "descriptionmyturn" => clienttranslate('${requester_name} wants to stop Faith Debate. Do you agree?'),
    "type" => "activeplayer",
    "action" => "stPracticeAiActivePlayer",
    "args" => "argFaithDebateStopLeaderApproval",
    "possibleactions" => array("approveFaithDebateStop", "rejectFaithDebateStop"),
    "transitions" => array(
      "approved" => 77,
      "rejected" => 76
    )
  ),

  // End of the hand (check win condition, reshuffle if needed)
  40 => array(
    "name" => "endHand",
    "description" => "",
    "type" => "game",
    "action" => "stEndHand",
    "transitions" => array(
      "nextHand" => 2,
      "endGame" => 99,
      "impermanenceShowcase" => 98,
      "showEndSummary" => 102
    )
  ),

  98 => array(
    "name" => "impermanenceShowcase",
    "description" => "",
    "type" => "game",
    "action" => "stShowImpermanenceVictory",
    "transitions" => array("showEndSummary" => 102)
  ),

  102 => array(
    "name" => "gameEndSummary",
    "description" => clienttranslate('Players review end-game summary'),
    "descriptionmyturn" => clienttranslate('${you} may continue to final BGA scoring'),
    "type" => "multipleactiveplayer",
    "action" => "stShowGameEndSummary",
    "possibleactions" => array("confirmGameEndSummary"),
    "transitions" => array("endGame" => 99)
  ),



);
