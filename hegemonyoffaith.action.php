<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * HegemonyOfFaith implementation: (C) 2026 Yen / Gamefly Studio
 * Copyright (C) 2026 Yen / Gamefly Studio
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * hegemonyoffaith.action.php
 *
 * HegemonyOfFaith main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/hegemonyoffaith/hegemonyoffaith/myAction.html", ...)
 *
 */


class action_hegemonyoffaith extends APP_GameAction
{
  // Constructor: please do not modify
  public function __default()
  {
    if (self::isArg('notifwindow')) {
      $this->view = "common_notifwindow";
      $this->viewArgs['table'] = self::getArg("table", AT_posint, true);
    } else {
      $this->view = "hegemonyoffaith_hegemonyoffaith";
      self::trace("Complete reinitialization of board game");
    }
  }

  private function parseNumberListArg($raw): array
  {
    if ($raw === null || $raw === '') return array();
    $raw = rtrim((string) $raw, ';');
    if ($raw === '') return array();
    return explode(';', $raw);
  }

  public function playActionCard()
  {
    self::setAjaxMode();
    $card_id = self::getArg("id", AT_posint, true);
    
    // Optional arguments depending on the card type
    $target_id = self::getArg("target_id", AT_posint, false); // Target player
    $type_arg = self::getArg("type_arg", AT_posint, false);   // E.g., chosen believer type for Witch Hunt
    $offered_card_id = self::getArg("offered_card_id", AT_posint, false); // Secret Alliance offered card
    $card_ids_raw = self::getArg("card_ids", AT_numberlist, false); // For Divine Inspiration
    $use_zombie = self::getArg("use_zombie", AT_posint, false); // Faith War + Zombie Army opt-in

    if ($offered_card_id) {
        $type_arg = $offered_card_id;
    }
    
    $card_ids = $this->parseNumberListArg($card_ids_raw);

    $this->game->playActionCard($card_id, $target_id, $type_arg, $card_ids, $use_zombie);
    self::ajaxResponse();
  }

  public function chooseInitialSkill()
  {
    self::setAjaxMode();
    $card_id = self::getArg("card_id", AT_posint, true);
    $this->game->chooseInitialSkill($card_id);
    self::ajaxResponse();
  }


  // --- Combat Response ---

  public function playBelieverCard()
  {
    self::setAjaxMode();
    $card_id = self::getArg("id", AT_posint, true);
    $this->game->playBelieverCardCombat($card_id); // Maps to .game.php function
    self::ajaxResponse();
  }

  public function playDefenseCard()
  {
    self::setAjaxMode();
    $card_id = self::getArg("id", AT_posint, true);
    $this->game->playDefenseCard($card_id);
    self::ajaxResponse();
  }

  public function passDefense()
  {
    self::setAjaxMode();
    $this->game->passDefense();
    self::ajaxResponse();
  }

  public function startDiscardingActionCard()
  {
    self::setAjaxMode();
    $this->game->startDiscardingActionCard();
    self::ajaxResponse();
  }

  public function confirmDiscardingActionCard()
  {
    self::setAjaxMode();
    $card_ids_raw = self::getArg("ids", AT_numberlist, true);
    $card_ids = $this->parseNumberListArg($card_ids_raw);

    $this->game->confirmDiscardingActionCard($card_ids);
    self::ajaxResponse();
  }

  public function cancelDiscardingActionCard()
  {
    self::setAjaxMode();
    $this->game->cancelDiscardingActionCard();
    self::ajaxResponse();
  }

  public function discardActionCards()
  {
    self::setAjaxMode();
    $card_ids_raw = self::getArg("ids", AT_numberlist, true);
    $card_ids = $this->parseNumberListArg($card_ids_raw);

    $this->game->discardActionCards($card_ids);
    self::ajaxResponse();
  }

  public function endTurn()
  {
    self::setAjaxMode();
    $this->game->endTurn();
    self::ajaxResponse();
  }

  public function wandererSteal()
  {
    self::setAjaxMode();
    $target_id = self::getArg("target_id", AT_posint, true);
    $this->game->wandererSteal($target_id);
    self::ajaxResponse();
  }

  public function surrender()
  {
      self::setAjaxMode();
      $leader_id = self::getArg("leader_id", AT_posint, true);
      $this->game->surrender($leader_id);
      self::ajaxResponse();
  }

  public function becomeWanderer()
  {
      self::setAjaxMode();
      $this->game->becomeWanderer();
      self::ajaxResponse();
  }

  public function acceptLeaderSupport()
  {
      self::setAjaxMode();
      $this->game->acceptLeaderSupport();
      self::ajaxResponse();
  }

  public function rejectLeaderSupport()
  {
      self::setAjaxMode();
      $this->game->rejectLeaderSupport();
      self::ajaxResponse();
  }

  public function acceptSurrenderRequest()
  {
      self::setAjaxMode();
      $this->game->acceptSurrenderRequest();
      self::ajaxResponse();
  }

  public function rejectSurrenderRequest()
  {
      self::setAjaxMode();
      $this->game->rejectSurrenderRequest();
      self::ajaxResponse();
  }

  public function giveBeliever()
  {
      self::setAjaxMode();
      $card_id = self::getArg("id", AT_posint, true);
      $this->game->giveBeliever($card_id);
      self::ajaxResponse();
  }

  public function cancelGiveBeliever()
  {
      self::setAjaxMode();
      $this->game->cancelGiveBeliever();
      self::ajaxResponse();
  }

  public function chooseWarRepresentative()
  {
    self::setAjaxMode();
    $representative_id = self::getArg("representative_id", AT_posint, true);
    $this->game->chooseWarRepresentative($representative_id);
    self::ajaxResponse();
  }

  public function chooseConspiracyRepresentative()
  {
    self::setAjaxMode();
    $representative_id = self::getArg("representative_id", AT_posint, true);
    $this->game->chooseConspiracyRepresentative($representative_id);
    self::ajaxResponse();
  }

  public function chooseMartyrdomRepresentative()
  {
    self::setAjaxMode();
    $representative_id = self::getArg("representative_id", AT_posint, true);
    $this->game->chooseMartyrdomRepresentative($representative_id);
    self::ajaxResponse();
  }

  public function chooseFaithDebateRepresentative()
  {
    self::setAjaxMode();
    $representative_id = self::getArg("representative_id", AT_posint, true);
    $this->game->chooseFaithDebateRepresentative($representative_id);
    self::ajaxResponse();
  }

  public function stopFaithDebate()
  {
    self::setAjaxMode();
    $this->game->stopFaithDebate();
    self::ajaxResponse();
  }

  public function approveFaithDebateStop()
  {
    self::setAjaxMode();
    $this->game->approveFaithDebateStop();
    self::ajaxResponse();
  }

  public function rejectFaithDebateStop()
  {
    self::setAjaxMode();
    $this->game->rejectFaithDebateStop();
    self::ajaxResponse();
  }

  public function chooseSecretAllianceCard()
  {
    self::setAjaxMode();
    $card_id = self::getArg("id", AT_posint, true);
    $this->game->chooseSecretAllianceCard($card_id);
    self::ajaxResponse();
  }

  public function useSkill()
  {
    self::setAjaxMode();
    $target_id = self::getArg("target_id", AT_posint, false);
    $believer_id = self::getArg("believer_id", AT_posint, false);
    $this->game->useSkill($target_id, $believer_id);
    self::ajaxResponse();
  }

  public function prophetEnableSkill()
  {
    self::setAjaxMode();
    $this->game->prophetEnableSkill();
    self::ajaxResponse();
  }

  public function prophetSkipSkill()
  {
    self::setAjaxMode();
    $this->game->prophetSkipSkill();
    self::ajaxResponse();
  }

  public function prophetGuessBelieverType()
  {
    self::setAjaxMode();
    $believer_type = self::getArg("believer_type", AT_posint, true);
    $this->game->prophetGuessBelieverType($believer_type);
    self::ajaxResponse();
  }

  public function prophetPassGuess()
  {
    self::setAjaxMode();
    $this->game->prophetPassGuess();
    self::ajaxResponse();
  }

  public function completeInfoSpy()
  {
    self::setAjaxMode();
    $this->game->completeInfoSpy();
    self::ajaxResponse();
  }

  public function holyRebirthUse()
  {
    self::setAjaxMode();
    $this->game->holyRebirthUse();
    self::ajaxResponse();
  }

  public function holyRebirthSkip()
  {
    self::setAjaxMode();
    $this->game->holyRebirthSkip();
    self::ajaxResponse();
  }

  public function reverseKarmaUse()
  {
    self::setAjaxMode();
    $this->game->reverseKarmaUse();
    self::ajaxResponse();
  }

  public function reverseKarmaSkip()
  {
    self::setAjaxMode();
    $this->game->reverseKarmaSkip();
    self::ajaxResponse();
  }

  public function confirmImpermanenceShowcase()
  {
    self::setAjaxMode();
    $this->game->confirmImpermanenceShowcase();
    self::ajaxResponse();
  }

  public function confirmGameEndSummary()
  {
    self::setAjaxMode();
    $this->game->confirmGameEndSummary();
    self::ajaxResponse();
  }

  public function setPracticeAiPlayer()
  {
    self::setAjaxMode();
    $player_id = self::getArg("player_id", AT_posint, true);
    $enabled = self::getArg("enabled", AT_int, true);
    $this->game->setPracticeAiPlayer($player_id, ((int) $enabled) === 1);
    self::ajaxResponse();
  }

  public function togglePracticeAiPlayer()
  {
    self::setAjaxMode();
    $player_id = self::getArg("player_id", AT_posint, true);
    $this->game->togglePracticeAiPlayer($player_id);
    self::ajaxResponse();
  }

  public function clearPracticeAiPlayers()
  {
    self::setAjaxMode();
    $this->game->clearPracticeAiPlayers();
    self::ajaxResponse();
  }

  public function runPracticeAiStep()
  {
    self::setAjaxMode();
    $player_id = self::getArg("player_id", AT_posint, true);
    $token = self::getArg("token", AT_posint, true);
    $this->game->runPracticeAiStep($player_id, $token);
    self::ajaxResponse();
  }

  // Watchdog re-kick: re-evaluates whether an AI seat should act in the
  // current state. Safe to call at any time (token-gated, no-op otherwise).
  public function kickPracticeAi()
  {
    self::setAjaxMode();
    $this->game->kickPracticeAi();
    self::ajaxResponse();
  }
}
