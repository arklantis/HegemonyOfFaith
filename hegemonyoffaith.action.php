<?php

/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * HegemonyOfFaith implementation : © <Your name here> <Your email address here>
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

  // TODO: defines your action entry points there


  /*
    
    Example:
  	
    public function myAction()
    {
        self::setAjaxMode();     

        // Retrieve arguments
        // Note: these arguments correspond to what has been sent through the javascript "ajaxcall" method
        $arg1 = self::getArg( "myArgument1", AT_posint, true );
        $arg2 = self::getArg( "myArgument2", AT_posint, true );

        // Then, call the appropriate method in your game logic, like "playCard" or "myAction"
        $this->game->myAction( $arg1, $arg2 );

        self::ajaxResponse( );
    }
    
    */

  public function playActionCard()
  {
    self::setAjaxMode();
    $card_id = self::getArg("id", AT_posint, true);
    
    // Optional arguments depending on the card type
    $target_id = self::getArg("target_id", AT_posint, false); // Target player
    $type_arg = self::getArg("type_arg", AT_posint, false);   // E.g., chosen believer type for Witch Hunt
    $card_ids_raw = self::getArg("card_ids", AT_numberlist, false); // For Divine Inspiration
    
    $card_ids = array();
    if ($card_ids_raw != null && $card_ids_raw != '') {
        if (substr($card_ids_raw, -1) == ';') $card_ids_raw = substr($card_ids_raw, 0, -1);
        $card_ids = explode(';', $card_ids_raw);
    }

    $this->game->playActionCard($card_id, $target_id, $type_arg, $card_ids);
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

    // Removing last ';' if exists
    if (substr($card_ids_raw, -1) == ';') $card_ids_raw = substr($card_ids_raw, 0, -1);
    if ($card_ids_raw == '') $card_ids = array();
    else $card_ids = explode(';', $card_ids_raw);

    $this->game->confirmDiscardingActionCard($card_ids);
    self::ajaxResponse();
  }

  public function cancelDiscardingActionCard()
  {
    self::setAjaxMode();
    $this->game->cancelDiscardingActionCard();
    self::ajaxResponse();
  }

  public function endTurn()
  {
    self::setAjaxMode();
    $this->game->endTurn();
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

  public function giveBeliever()
  {
      self::setAjaxMode();
      $card_id = self::getArg("id", AT_posint, true);
      $this->game->giveBeliever($card_id);
      self::ajaxResponse();
  }
}
