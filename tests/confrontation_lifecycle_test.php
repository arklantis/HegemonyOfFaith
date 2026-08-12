<?php

require_once __DIR__ . '/../modules/php/HOFConfrontationLifecycle.php';

function assertConfrontation($expected, $actual, string $message): void
{
  if ($expected !== $actual) {
    fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
    exit(1);
  }
}

$war = HOFConfrontationLifecycle::begin(HOFConfrontationLifecycle::FAITH_WAR, 10, 20);
assertConfrontation(10, $war['war_attacker_id'], 'A confrontation records its attacker.');
assertConfrontation(20, $war['war_defender_id'], 'A confrontation records its defender.');
assertConfrontation(0, $war['war_card_attacker'], 'A new confrontation has no committed attacker card.');
assertConfrontation(HOFConfrontationLifecycle::FAITH_WAR, $war['war_type'], 'A confrontation records its type.');

$witch_hunt = HOFConfrontationLifecycle::begin(
  HOFConfrontationLifecycle::WITCH_HUNT,
  10,
  20,
  ['war_card_defender' => 4]
);
assertConfrontation(4, $witch_hunt['war_card_defender'], 'A known context field may carry action-specific state.');

assertConfrontation('physical', HOFConfrontationLifecycle::defenseKind(HOFConfrontationLifecycle::FAITH_WAR), 'Faith War uses physical defense.');
assertConfrontation('mental', HOFConfrontationLifecycle::defenseKind(HOFConfrontationLifecycle::CONSPIRACY), 'Conspiracy uses mental defense.');
assertConfrontation('breaking_faith', HOFConfrontationLifecycle::defenseKind(HOFConfrontationLifecycle::BREAKING_FAITH), 'Breaking Faith has its own defense.');
assertConfrontation(true, HOFConfrontationLifecycle::isAoe(HOFConfrontationLifecycle::MARTYRDOM), 'Martyrdom is AOE.');
assertConfrontation(false, HOFConfrontationLifecycle::isAoe(HOFConfrontationLifecycle::FAITH_DEBATE), 'Faith Debate is not AOE.');
assertConfrontation(true, HOFConfrontationLifecycle::isDuel(HOFConfrontationLifecycle::FINAL_WAR), 'Final War uses the duel lifecycle.');
assertConfrontation(false, HOFConfrontationLifecycle::isDuel(HOFConfrontationLifecycle::CONSPIRACY), 'Conspiracy is not a duel.');
assertConfrontation(true, HOFConfrontationLifecycle::defenseEndsSectResponse(HOFConfrontationLifecycle::WITCH_HUNT), 'Witch Hunt defense ends the Sect response.');
assertConfrontation(false, HOFConfrontationLifecycle::defenseEndsSectResponse(HOFConfrontationLifecycle::MARTYRDOM), 'AOE defense has its own concealed response lifecycle.');

assertConfrontation('faithWarDuel', HOFConfrontationLifecycle::resolveTransition(HOFConfrontationLifecycle::FAITH_WAR), 'Faith War resolves into representative selection.');
assertConfrontation(14, HOFConfrontationLifecycle::reverseKarmaResumeMode(HOFConfrontationLifecycle::CONSPIRACY), 'Conspiracy has the canonical Karma Reversed resume mode.');
assertConfrontation('nextDuelStep', HOFConfrontationLifecycle::commitTransition(HOFConfrontationLifecycle::FINAL_SECT_WAR), 'Sect Final War uses the duel transition.');
assertConfrontation('nextDebateStep', HOFConfrontationLifecycle::commitTransition(HOFConfrontationLifecycle::FAITH_DEBATE), 'Faith Debate uses the debate transition.');

assertConfrontation(HOFConfrontationLifecycle::CONTINUE, HOFConfrontationLifecycle::roundStartDecision(HOFConfrontationLifecycle::FAITH_WAR, 1, 2), 'A duel continues while both sides can fight.');
assertConfrontation(HOFConfrontationLifecycle::END_DEPLETED, HOFConfrontationLifecycle::roundStartDecision(HOFConfrontationLifecycle::FAITH_WAR, 0, 2), 'A depleted Faith War ends through the normal path.');
assertConfrontation(HOFConfrontationLifecycle::FINALIZE, HOFConfrontationLifecycle::roundStartDecision(HOFConfrontationLifecycle::FINAL_SECT_WAR, 0, 2), 'A depleted Sect Final War uses final scoring.');

assertConfrontation(['winner' => 0, 'bonus' => false], HOFConfrontationLifecycle::compareBelievers(3, 3, true), 'Matching Believers draw.');
assertConfrontation(['winner' => 1, 'bonus' => true], HOFConfrontationLifecycle::compareBelievers(2, 1, true), 'Direct Faith War counter grants a bonus.');
assertConfrontation(['winner' => -1, 'bonus' => true], HOFConfrontationLifecycle::compareBelievers(1, 2, true), 'Defender direct counter grants a bonus.');
assertConfrontation(['winner' => 1, 'bonus' => false], HOFConfrontationLifecycle::compareBelievers(3, 1, true), 'A two-step win grants no bonus.');

$cleared = HOFConfrontationLifecycle::clear();
assertConfrontation(9, count($cleared), 'Clear covers the complete shared confrontation context.');
assertConfrontation([], array_values(array_filter($cleared)), 'Clear resets every shared context value.');

$game_source = file_get_contents(__DIR__ . '/../modules/php/Game.php');
assertConfrontation(true, $game_source !== false, 'Game source is available for lifecycle integration checks.');
assertConfrontation(true, str_contains($game_source, "require_once __DIR__ . '/HOFConfrontationLifecycle.php';"), 'Game loads the confrontation lifecycle module.');
assertConfrontation(false, preg_match("/setGameStateValue\\('war_type'/", $game_source) === 1, 'Confrontations cannot bypass the canonical begin context.');
assertConfrontation(true, substr_count($game_source, 'HOFConfrontationLifecycle::begin(') >= 10, 'All confrontation entry paths use the canonical begin context.');
assertConfrontation(true, substr_count($game_source, '$this->clearConfrontationContext();') >= 10, 'Confrontation exits share the canonical clear context.');
assertConfrontation(true, str_contains($game_source, 'HOFConfrontationLifecycle::resolveTransition($war_type)'), 'Resolve callbacks delegate common progression.');
assertConfrontation(true, str_contains($game_source, 'HOFConfrontationLifecycle::roundStartDecision('), 'Round callbacks delegate depletion decisions.');

echo "Confrontation lifecycle tests passed.\n";
