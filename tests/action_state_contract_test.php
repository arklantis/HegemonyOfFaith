<?php

$root = dirname(__DIR__);
$state_source = file_get_contents($root . '/modules/php/HOFMachineStates.inc.php');
$action_source = file_get_contents($root . '/hegemonyoffaith.action.php');
$game_source = file_get_contents($root . '/modules/php/Game.php');
$client_source = file_get_contents($root . '/modules/js/Game.js');

function failContract(string $message): void
{
  fwrite(STDERR, "FAIL: {$message}\n");
  exit(1);
}

preg_match_all('/["\']possibleactions["\']\s*=>\s*array\s*\((.*?)\)/s', $state_source, $blocks);
$possible_actions = [];
foreach ($blocks[1] as $block) {
  preg_match_all('/["\']([A-Za-z][A-Za-z0-9_]*)["\']/', $block, $names);
  $possible_actions = array_merge($possible_actions, $names[1]);
}
$possible_actions = array_values(array_unique($possible_actions));

preg_match_all('/public\s+function\s+([A-Za-z][A-Za-z0-9_]*)\s*\(/', $action_source, $endpoint_matches);
$endpoints = array_values(array_unique($endpoint_matches[1]));
$missing_endpoints = array_values(array_diff($possible_actions, $endpoints));
if (!empty($missing_endpoints)) {
  failContract('State actions missing AJAX endpoints: ' . implode(', ', $missing_endpoints));
}

foreach (['startDiscardingActionCard', 'cancelDiscardingActionCard'] as $dead_action) {
  foreach ([
    'state machine' => $state_source,
    'AJAX actions' => $action_source,
    'game logic' => $game_source,
    'client subscriptions' => $client_source,
  ] as $surface => $source) {
    if (strpos($source, $dead_action) !== false) {
      failContract("Dead action {$dead_action} remains in {$surface}.");
    }
  }
}

if (!preg_match('/function\s+notifyPublicCountsSync\s*\(bool\s+\$include_believer_counts\s*=\s*true\)/', $game_source)) {
  failContract('Public count sync must support omitting unstable mid-confrontation Believer counts.');
}
if (!preg_match('/function\s+notifyPublicCountsSync[\s\S]{0,500}unset\(\$snapshot\[.believer_counts.\]\)/', $game_source)) {
  failContract('Mid-confrontation public snapshots must omit Believer counts while retaining other counts.');
}
foreach (['nextDebateRound', 'nextDuelRound', 'nextFinalStruggleRound'] as $transition) {
  if (!preg_match('/notifyPublicCountsSync\(false\);[\s\S]{0,180}nextState\(.'.preg_quote($transition, '/').'.\)/', $game_source)) {
    failContract("{$transition} must keep public Believer counts frozen between confrontation rounds.");
  }
}
preg_match('/function\s+startFinalInfiniteWar[\s\S]*?\n  }\n\n  function\s+finalizeFinalConspiracyContest/', $game_source, $infinite_war_match);
if (empty($infinite_war_match[0]) || strpos($infinite_war_match[0], 'notifyPublicCountsSync(false);') === false) {
  failContract('Infinite Final War re-deals must not expose mid-confrontation Believer counts.');
}
preg_match('/function\s+endFaithWarForDepletedSect[\s\S]*?\n  }\n\n  private function\s+finalizeFaithWar/', $game_source, $depleted_war_match);
if (
  empty($depleted_war_match[0])
  || strpos($depleted_war_match[0], "'faithWarEnd'") === false
  || strpos($depleted_war_match[0], 'notifyPublicCountsSync();') === false
  || strpos($depleted_war_match[0], 'notifyPublicCountsSync();') > strpos($depleted_war_match[0], 'promptNextFaithWarHolyRebirthIfEligible')
) {
  failContract('A Faith War that ends at round start must publish its final Believer counts before revival prompts.');
}

echo "Action/state contract tests passed.\n";
