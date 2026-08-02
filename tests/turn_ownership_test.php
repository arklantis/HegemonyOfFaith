<?php

require_once __DIR__ . '/../modules/php/HOFTurnOwnership.php';

function assertTurnOwner(int $expected, int $actual, string $message): void
{
  if ($expected !== $actual) {
    fwrite(STDERR, "FAIL: {$message}\nExpected: {$expected}\nActual: {$actual}\n");
    exit(1);
  }
}

assertTurnOwner(
  4,
  HOFTurnOwnership::resolveActionWindowActor(1, 4, [2, 3, 4]),
  'A solo bot turn must resume the bot, not the framework-active human.'
);
assertTurnOwner(
  1,
  HOFTurnOwnership::resolveActionWindowActor(1, 1, [2, 3, 4]),
  'A human solo turn must keep the framework-active human.'
);
assertTurnOwner(
  2,
  HOFTurnOwnership::resolveActionWindowActor(2, 4, []),
  'Ordinary multiplayer games must use the framework active player.'
);

$game_source = file_get_contents(__DIR__ . '/../modules/php/Game.php');
if (!preg_match(
  '/function queueReverseKarmaPromptIfNeeded\b.*?reverse_karma_pending_resume_player.*?getActionWindowActorId\(\)/s',
  $game_source
)) {
  fwrite(STDERR, "FAIL: Karma Reversed must resume the logical action-window actor.\n");
  exit(1);
}
if (!preg_match(
  '/function soloAdvance\b.*?solo_current_actor_id.*?notifySoloActorChanged\(\$actor\)/s',
  $game_source
)) {
  fwrite(STDERR, "FAIL: Solo playerTurn recovery must republish a stale bot actor.\n");
  exit(1);
}

echo "Turn ownership tests passed.\n";
