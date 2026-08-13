<?php

require_once __DIR__ . '/../modules/php/HOFPublicData.php';
require_once __DIR__ . '/../modules/php/HOFRequestGuards.php';

$game_source = file_get_contents(__DIR__ . '/../modules/php/Game.php');

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

$reload = HOFPublicData::reloadForViewer(1, [
  'players' => [1 => ['name' => 'A'], 2 => ['name' => 'B'], 3 => ['name' => 'C']],
  'action_hands' => [1 => [10 => ['id' => 10]], 2 => [20 => ['id' => 20], 21 => ['id' => 21]]],
  'believer_hands' => [1 => [30 => ['id' => 30]], 2 => [40 => ['id' => 40]]],
  'skill_entries' => [
    1 => ['cards' => [50 => ['id' => 50]], 'card' => ['id' => 50], 'revealed' => false, 'private_state' => ['uses' => 2], 'public_state' => ['uses' => 1]],
    2 => ['cards' => [['id' => 60]], 'card' => ['id' => 60], 'revealed' => false, 'private_state' => ['uses' => 3], 'public_state' => ['uses' => 1]],
    3 => ['cards' => [['id' => 70]], 'card' => ['id' => 70], 'revealed' => true, 'private_state' => ['uses' => 3], 'public_state' => ['uses' => 1]],
  ],
]);
assertSameValue([10 => ['id' => 10]], $reload['actioncards'], 'Reload exposes only the viewer Action hand and preserves Deck keys.');
assertSameValue([30 => ['id' => 30]], $reload['believercards'], 'Reload exposes only the viewer Believer hand and preserves Deck keys.');
assertSameValue(['id' => 50], $reload['player_skills'][1], 'Reload exposes the viewer hidden Skill.');
assertSameValue(null, $reload['player_skills'][2], 'Reload hides another player unrevealed Skill.');
assertSameValue(['id' => 70], $reload['player_skills'][3], 'Reload exposes another player revealed Skill.');
assertSameValue(['uses' => 1], $reload['player_skill_public_state'][3], 'Reload exposes only public state for another player Skill.');
assertSameValue(2, $reload['players'][2]['action_count'], 'Reload exposes public hand counts without exposing cards.');

$event = HOFPublicData::splitPrivateEvent(
  ['player_id' => 1, 'card_id' => 30, 'card_type' => 4],
  1,
  ['cards' => [['id' => 31]]]
);
assertSameValue(false, array_key_exists('card_id', $event['public']), 'Split events redact private card ids publicly.');
assertSameValue([['id' => 31]], $event['private']['cards'], 'Split events preserve the owner-only payload.');
$concealed_event = HOFPublicData::publicEvent('faithWarCardPlayed', ['player_id' => 1, 'card_id' => 30, 'card_type' => 4]);
assertSameValue(false, array_key_exists('card_id', $concealed_event), 'Public event projection redacts concealed combat commits.');
$revealed_event = HOFPublicData::publicEvent('duelResult', ['card_id' => 30, 'card_type' => 4]);
assertSameValue(30, $revealed_event['card_id'], 'Public event projection preserves cards after reveal.');

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

$active = HOFRequestGuards::authorizeAction(HOFRequestGuards::ACTIVE_PLAYER, 7, 7);
assertSameValue(true, $active['allowed'], 'The active human may use an active-player action.');
assertSameValue(7, $active['actor_id'], 'Active-player authorization returns the acting seat.');
$wrong_active = HOFRequestGuards::authorizeAction(HOFRequestGuards::ACTIVE_PLAYER, 8, 7);
assertSameValue(false, $wrong_active['allowed'], 'A different human cannot use the active player action.');
$multiactive = HOFRequestGuards::authorizeAction(HOFRequestGuards::CURRENT_PLAYER, 8, 7);
assertSameValue(8, $multiactive['actor_id'], 'Multiactive authorization keeps the current responder.');
$bot_expected = HOFRequestGuards::authorizeAction(HOFRequestGuards::EXPECTED_PLAYER, 7, 9, 11, true);
assertSameValue(true, $bot_expected['allowed'], 'Automation may act for its expected virtual seat.');
assertSameValue(11, $bot_expected['actor_id'], 'Automation authorization returns the expected bot seat.');
assertSameValue(11, $bot_expected['switch_to'], 'Automation requests an active-seat switch when required.');
assertSameValue(true, HOFRequestGuards::actionAvailable('passDefense', ['playDefenseCard', 'passDefense']), 'State actions authorize known actions.');
assertSameValue(false, HOFRequestGuards::actionAvailable('endTurn', ['playDefenseCard', 'passDefense']), 'State actions reject stale actions.');

assertSameValue(1, substr_count($game_source, 'self::checkAction('), 'All BGA action checks pass through one authorization adapter.');
assertSameValue(true, substr_count($game_source, 'authorizePlayerAction(') >= 34, 'Player action entry points share the authorization seam.');
assertSameValue(true, str_contains($game_source, 'HOFPublicData::reloadForViewer('), 'Reconnect data uses the viewer-aware projection.');
assertSameValue(true, str_contains($game_source, 'HOFPublicData::splitPrivateEvent('), 'Sensitive events share public/private projection rules.');

echo "Security contract tests passed.\n";
