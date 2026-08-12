<?php

require_once __DIR__ . '/../modules/php/HOFPersistentFlowState.php';

final class FakeBgaGlobals
{
  public array $values = [];

  public function set(string $key, $value): void
  {
    $this->values[$key] = $value;
  }

  public function get(string $key, $default = null)
  {
    return $this->values[$key] ?? $default;
  }

  public function inc(string $key, int $amount): int
  {
    $this->values[$key] = (int) ($this->values[$key] ?? 0) + $amount;
    return (int) $this->values[$key];
  }
}

function assertFlowState($expected, $actual, string $message): void
{
  if ($expected !== $actual) {
    fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
    exit(1);
  }
}

$globals = new FakeBgaGlobals();
$state = new HOFPersistentFlowState($globals);

assertFlowState(0, $state->getInt('confrontation_id'), 'Missing flow state defaults to zero.');
$state->setInt('confrontation_id', 7);
assertFlowState(7, $state->getInt('confrontation_id'), 'Flow state persists through the globals adapter.');
assertFlowState(9, $state->increment('confrontation_id', 2), 'Flow state increments atomically through the adapter.');
assertFlowState('hof.flow.confrontation_id', HOFPersistentFlowState::storageKey('confrontation_id'), 'Flow state uses a string BGA global.');

$state->setInt('practice_ai_request_token', 13);
assertFlowState(9, $state->getInt('confrontation_id'), 'Independent keys do not overwrite each other.');
assertFlowState(13, $state->getInt('practice_ai_request_token'), 'Each flow value has an independent storage key.');

$state->initialize();
assertFlowState(0, $state->getInt('confrontation_id'), 'New-game initialization resets flow state.');
assertFlowState(0, $state->getInt('practice_ai_request_token'), 'Initialization resets every supported key.');

$unknown_rejected = false;
try {
  $state->getInt('game_option_100');
} catch (InvalidArgumentException $e) {
  $unknown_rejected = true;
}
assertFlowState(true, $unknown_rejected, 'Unknown keys cannot leak into persistent flow storage.');

$game_source = file_get_contents(__DIR__ . '/../modules/php/Game.php');
preg_match('/initGameStateLabels\(array\((.*?)\)\);/s', $game_source, $label_block);
preg_match_all('/["\']([^"\']+)["\']\s*=>\s*(\d+)/', $label_block[1] ?? '', $label_pairs, PREG_SET_ORDER);
assertFlowState(80, count($label_pairs), 'Legacy numeric globals stay within BGA\'s 80-value limit.');
foreach ($label_pairs as $pair) {
  $id = (int) $pair[2];
  assertFlowState(true, $id >= 10 && $id <= 89, "Legacy numeric global {$pair[1]} uses BGA range 10-89.");
}
assertFlowState(
  false,
  (bool) preg_match('/GameState(?:Initial)?Value\(["\']final_struggle_contender_mask["\']/', $game_source),
  'Final Struggle state cannot collide with game option 100 again.'
);

preg_match_all(
  '/(?:get|set)GameState(?:Initial)?Value\(\s*["\']([^"\']+)["\']/s',
  $game_source,
  $legacy_state_calls
);
foreach (array_unique($legacy_state_calls[1] ?? []) as $key) {
  assertFlowState(
    false,
    HOFPersistentFlowState::supports((string) $key),
    "Persistent flow-state key {$key} cannot use the legacy numeric-global interface."
  );
}

echo "Persistent flow-state tests passed.\n";
