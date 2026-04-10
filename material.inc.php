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
 * material.inc.php
 *
 * HegemonyOfFaith game material description
 *
 * Here, you can describe the material of your game with PHP variables.
 *   
 * This file is loaded in your game logic class constructor, ie these variables
 * are available everywhere in your game logic code.
 *
 */


/*

Example:

$this->card_types = array(
    1 => array( "card_name" => ...,
                ...
              )
);

*/

$this->type_arg_labels = array(
  0b10000 => array(
    'name' => clienttranslate("Believer"),
    'nametr' => clienttranslate("Believer")
  ),
  0b01000 => array(
    'name' => clienttranslate("Strategy"),
    'nametr' => clienttranslate("Strategy")
  ),
  0b00100 => array(
    'name' => clienttranslate("Physical"),
    'nametr' => clienttranslate("Physical")
  ),
  0b00010 => array(
    'name' => clienttranslate("Mental"),
    'nametr' => clienttranslate("Mental")
  ),
  0b00001 => array(
    'name' => clienttranslate("Defense"),
    'nametr' => clienttranslate("Defense")
  )
);

$this->type_labels = array(
  1 => array(
    'name' => clienttranslate("Fool"),
    'nametr' => clienttranslate("Fool")
  ),
  2 => array(
    'name' => clienttranslate("Prayer"),
    'nametr' => clienttranslate("Prayer")
  ),
  3 => array(
    'name' => clienttranslate("Missionary"),
    'nametr' => clienttranslate("Missionary")
  ),
  4 => array(
    'name' => clienttranslate("Elder"),
    'nametr' => clienttranslate("Elder")
  ),
  5 => array(
    'name' => clienttranslate("Fanatic"),
    'nametr' => clienttranslate("Fanatic")
  ),
  'witch_hunt' => array(
    'name' => clienttranslate("Witch Hunt"),
    'nametr' => clienttranslate("Witch Hunt")
  ),
  'faith_war' => array(
    'name' => clienttranslate("Faith War"),
    'nametr' => clienttranslate("Faith War")
  ),
  'martyrdom' => array(
    'name' => clienttranslate("Martyrdom"),
    'nametr' => clienttranslate("Martyrdom")
  ),
  'spread_rumors' => array(
    'name' => clienttranslate("Spread Rumors"),
    'nametr' => clienttranslate("Spread Rumors")
  ),
  'faith_debate' =>  array(
    'name' => clienttranslate("Faith Debate"),
    'nametr' => clienttranslate("Faith Debate")
  ),
  'conspiracy' => array(
    'name' => clienttranslate("Conspiracy"),
    'nametr' => clienttranslate("Conspiracy")
  ),
  'great_mercy' => array(
    'name' => clienttranslate("Great Mercy"),
    'nametr' => clienttranslate("Great Mercy")
  ),
  'firm_faith' => array(
    'name' => clienttranslate("Firm Faith"),
    'nametr' => clienttranslate("Firm Faith")
  ),
  'breaking_faith' => array(
    'name' => clienttranslate("Breaking Faith"),
    'nametr' => clienttranslate("Breaking Faith")
  ),
  'kowtow_to_me' => array(
    'name' => clienttranslate("Kowtow To Me"),
    'nametr' => clienttranslate("Kowtow To Me")
  ),
  'info_spy' => array(
    'name' => clienttranslate("Info-Spy"),
    'nametr' => clienttranslate("Info-Spy")
  ),
  'secret_alliance' => array(
    'name' => clienttranslate("Secret Alliance"),
    'nametr' => clienttranslate("Secret Alliance")
  ),
  'its_a_miracle' => array(
    'name' => clienttranslate("It's a Miracle"),
    'nametr' => clienttranslate("It's a Miracle")
  ),
  'have_a_charity' => array(
    'name' => clienttranslate("Have a Charity"),
    'nametr' => clienttranslate("Have a Charity")
  ),
  'divine_inspire' => array(
    'name' => clienttranslate("Divine Inspiration"),
    'nametr' => clienttranslate("Divine Inspiration")
  )
);

$this->action_cards_count = array(
  'witch_hunt' => array(
    'type_arg' => 0b00100,
    'nbr' => 4
  ),
  'faith_war' => array(
    'type_arg' => 0b00100,
    'nbr' => 6
  ),
  'martyrdom' => array(
    'type_arg' => 0b00100,
    'nbr' => 7
  ),
  'spread_rumors' => array(
    'type_arg' => 0b00010,
    'nbr' => 7
  ),
  'faith_debate' =>  array(
    'type_arg' => 0b00010,
    'nbr' => 4
  ),
  'conspiracy' => array(
    'type_arg' => 0b00010,
    'nbr' => 6
  ),
  'great_mercy' => array(
    'type_arg' => 0b00001,
    'nbr' => 5
  ),
  'firm_faith' => array(
    'type_arg' => 0b00001,
    'nbr' => 5
  ),
  'breaking_faith' => array(
    'type_arg' => 0b01000,
    'nbr' => 6
  ),
  'kowtow_to_me' => array(
    'type_arg' => 0b01000,
    'nbr' => 4
  ),
  'info_spy' => array(
    'type_arg' => 0b01000,
    'nbr' => 3
  ),
  'secret_alliance' => array(
    'type_arg' => 0b01000,
    'nbr' => 3
  ),
  'its_a_miracle' => array(
    'type_arg' => 0b01000,
    'nbr' => 6
  ),
  'have_a_charity' => array(
    'type_arg' => 0b01000,
    'nbr' => 8
  ),
  'divine_inspire' => array(
    'type_arg' => 0b01000,
    'nbr' => 4
  )
);

/*
 * Skill Cards (Purple)
 */
$this->skill_labels = array(
  1 => array( 'name' => clienttranslate("Purple Hermit"), 'nametr' => clienttranslate("Purple Hermit") ),
  2 => array( 'name' => clienttranslate("KABOOM!"), 'nametr' => clienttranslate("KABOOM!") ),
  3 => array( 'name' => clienttranslate("Headstronger"), 'nametr' => clienttranslate("Headstronger") ),
  4 => array( 'name' => clienttranslate("The Prophet"), 'nametr' => clienttranslate("The Prophet") ),
  5 => array( 'name' => clienttranslate("Holy Rebirth"), 'nametr' => clienttranslate("Holy Rebirth") ),
  6 => array( 'name' => clienttranslate("Ascend with Me"), 'nametr' => clienttranslate("Ascend with Me") ),
  7 => array( 'name' => clienttranslate("Eternal Truth"), 'nametr' => clienttranslate("Eternal Truth") ),
  8 => array( 'name' => clienttranslate("World Peace"), 'nametr' => clienttranslate("World Peace") ),
  9 => array( 'name' => clienttranslate("Gate of Truth"), 'nametr' => clienttranslate("Gate of Truth") ),
  10 => array( 'name' => clienttranslate("Zombie Army"), 'nametr' => clienttranslate("Zombie Army") ),
  11 => array( 'name' => clienttranslate("Soul-Cutting Sword"), 'nametr' => clienttranslate("Soul-Cutting Sword") ),
  12 => array( 'name' => clienttranslate("Impermanence of Life"), 'nametr' => clienttranslate("Impermanence of Life") ),
  13 => array( 'name' => clienttranslate("Praise of Life"), 'nametr' => clienttranslate("Praise of Life") ),
  14 => array( 'name' => clienttranslate("Chaos Coming"), 'nametr' => clienttranslate("Chaos Coming") ),
  15 => array( 'name' => clienttranslate("Everyone is Equal"), 'nametr' => clienttranslate("Everyone is Equal") ),
  16 => array( 'name' => clienttranslate("Karma Reversed"), 'nametr' => clienttranslate("Karma Reversed") )
);
