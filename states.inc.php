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
 * Compact loader for machine states.
 * Full machine-state definition is maintained in:
 * `modules/php/HOFMachineStates.inc.php`
 */

$states_file = __DIR__ . '/modules/php/HOFMachineStates.inc.php';
if (!file_exists($states_file)) {
  throw new Exception(sprintf(clienttranslate('Missing machine states file: %s'), $states_file));
}
require $states_file;
