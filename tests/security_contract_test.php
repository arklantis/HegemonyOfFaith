<?php

require_once __DIR__ . '/../modules/php/HOFPublicData.php';
require_once __DIR__ . '/../modules/php/HOFRequestGuards.php';

function assertSameValue($expected, $actual, string $message): void
{
  if ($expected !== $actual) {
    fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
    exit(1);
  }
}

$hidden_card = HOFPublicData::hiddenCard([
  'id' => 42,
  'type' => 5,
  'type_arg' => 17,
  'location' => 'cardsontable',
  'location_arg' => 123,
]);
assertSameValue(
  ['location' => 'cardsontable', 'location_arg' => 123, 'hidden' => 1],
  $hidden_card,
  'Hidden table cards expose only placement data.'
);

$public_commit = HOFPublicData::publicCommit([
  'player_id' => 123,
  'player_name' => 'Player A',
  'sect_id' => 4,
  'card_id' => 42,
  'card_type' => 5,
]);
assertSameValue(false, array_key_exists('card_id', $public_commit), 'Public commits do not expose card ids.');
assertSameValue(false, array_key_exists('card_type', $public_commit), 'Public commits do not expose card types.');
assertSameValue(123, $public_commit['player_id'], 'Public commits retain the owner.');

$combat = HOFPublicData::publicCombatContext([
  'war_type' => 2,
  'war_card_attacker' => 42,
  'war_card_defender' => 99,
  'war_attacker_id' => 123,
]);
assertSameValue(false, array_key_exists('war_card_attacker', $combat), 'Combat snapshots hide attacker card ids.');
assertSameValue(false, array_key_exists('war_card_defender', $combat), 'Combat snapshots hide defender card ids.');
assertSameValue(1, $combat['war_attacker_committed'], 'Combat snapshots expose attacker commitment state.');
assertSameValue(1, $combat['war_defender_committed'], 'Combat snapshots expose defender commitment state.');

assertSameValue(false, HOFRequestGuards::debugToolAllowed(false), 'Release builds reject debug tools.');
assertSameValue(true, HOFRequestGuards::debugToolAllowed(true), 'Test builds allow debug tools.');
assertSameValue(
  true,
  HOFRequestGuards::canDriveAiStep(7, 7, 12, 12),
  'The elected driver can execute the current AI token.'
);
assertSameValue(
  false,
  HOFRequestGuards::canDriveAiStep(8, 7, 12, 12),
  'A different player cannot execute the AI token.'
);
assertSameValue(
  false,
  HOFRequestGuards::canDriveAiStep(7, 7, 11, 12),
  'A stale AI token is rejected.'
);

echo "Security contract tests passed.\n";
