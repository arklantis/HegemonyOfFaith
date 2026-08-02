<?php

$root = dirname(__DIR__);
$game_source = file_get_contents($root . '/modules/php/Game.php');

function failBotLogicContract(string $message): void
{
  fwrite(STDERR, "FAIL: {$message}\n");
  exit(1);
}

if (!preg_match('/function hasBotAoeTargetSect\b.*?getSkillDefendedSectsForAoe.*?countSectHandBelievers/s', $game_source)) {
  failBotLogicContract('Bot AOE target filtering must exclude skill-protected or empty Sects.');
}

if (strpos($game_source, '$war_type = ($type === \'martyrdom\') ? 3 : 6;') === false) {
  failBotLogicContract('Martyrdom and Conspiracy must use their matching AOE protection kinds.');
}

if (!preg_match('/if\s*\(\s*!\$this->hasBotAoeTargetSect\(/', $game_source)) {
  failBotLogicContract('Bot AOE plans must require an affected enemy Sect.');
}

if (!preg_match(
  '/function autoCommitFaithWarBelieverForRepresentative\b.*?canRepresentativeUseZombieFromGraveyard.*?getFaithWarZombieSnapshotDiscardCards.*?getCardsInLocation\(\'hand\'/s',
  $game_source
)) {
  failBotLogicContract('Bots using Zombie Army must prefer eligible graveyard Believers before hand Believers.');
}

$resolve_start = strpos($game_source, 'function stResolveDuel()');
$resolve_end = strpos($game_source, 'private function autoCommitFaithWarBelieverForRepresentative', $resolve_start);
$resolve_source = substr($game_source, $resolve_start, $resolve_end - $resolve_start);
if (
  substr_count($resolve_source, "moveCard(\$card_a_id, 'removed')") !== 3 ||
  substr_count($resolve_source, "moveCard(\$card_b_id, 'removed')") !== 3
) {
  failBotLogicContract('Zombie Army graveyard Believers must be removed after every win, loss, or draw outcome.');
}

echo "Bot logic contract tests passed.\n";
