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

echo "Bot logic contract tests passed.\n";
