<?php

// Execute the production state methods with a small BGA persistence adapter.
// No BGA runtime or database is available in the local test environment.
$source = file_get_contents(__DIR__ . '/../modules/php/Game.php');
$methods = '';
foreach (['stShowGameEndSummary', 'argGameEndSummary', 'getGameEndSummarySnapshot'] as $name) {
  if (!preg_match('/^  (?:private |protected |public )?function ' . $name . '\b.*?(?=^  (?:private |protected |public )?function |\z)/ms', $source, $match)) {
    throw new RuntimeException("Missing game-end state method: {$name}");
  }
  $methods .= $match[0];
}
eval('trait ProductionGameEndMethods {' . $methods . '}');

function clienttranslate($text) { return $text; }
function assertEnd($expected, $actual, string $message): void {
  if ($expected !== $actual) throw new RuntimeException($message);
}

class EndSummaryFixture {
  use ProductionGameEndMethods;
  const VPLAYER = 'player';
  public static array $globals = ['game_end_winner_id' => 20, 'game_end_reason_code' => 2];
  public array $events = [];
  public array $activated = [];
  public int $automationCalls = 0;
  public array $duel = [];
  public array $struggle = [];
  public object $believer_cards;
  public function __construct() {
    $this->believer_cards = new class {
      function countCardInLocation($location, $id) { return $id === 20 ? 9 : 5; }
    };
  }
  static function getGameStateValue($key) { return self::$globals[$key] ?? 0; }
  static function getUniqueValueFromDB($sql) { return str_contains($sql, 'player_sect') ? 2 : 0; }
  function loadSeatsBasicInfos() { return [10 => ['player_name' => 'A', 'player_color' => 'ff0000'], 20 => ['player_name' => 'Winner', 'player_color' => '0000ff']]; }
  function seatNameById($id) { return $id === 20 ? 'Winner' : 'A'; }
  function getPlayerSkillCard($id) { return ['type' => $id === 20 ? 12 : 4]; }
  function getFinalDuelSummarySnapshot() { return $this->duel; }
  function getFinalStruggleSummarySnapshot() { return $this->struggle; }
  function isPracticeAiPlayer($id) { return false; }
  function isSoloBotId($id) { return false; }
  function setSeatsMultiactive($ids, $transition) { $this->activated = $ids; }
  function notifyAllPlayersTr($name, $log, $args) { $this->events[] = [$name, $args]; }
  function runPracticeAiForCurrentStateIfNeeded() { $this->automationCalls++; }
}

$fixture = new EndSummaryFixture();
$fixture->stShowGameEndSummary();
$eventsBefore = $fixture->events;
$args = $fixture->argGameEndSummary();
assertEnd([10, 20], $fixture->activated, 'Normal summary entry must activate its human confirmers.');
assertEnd($eventsBefore[0][1], $args['summary'], 'Reload arguments must match the live summary notification exactly.');
assertEnd(20, $args['summary']['winner_id'], 'The reconnect snapshot must retain the actual winner.');
assertEnd(9, $args['summary']['winner_believer_count'], 'Reconnect must retain final Believer counts.');
assertEnd(20, $args['summary']['players'][0]['player_id'], 'The winner must remain first in the summary.');
assertEnd($eventsBefore, $fixture->events, 'Fetching state arguments must not broadcast notifications.');
assertEnd(1, $fixture->automationCalls, 'Fetching state arguments must not run automation or reactivate players.');

EndSummaryFixture::$globals['game_end_reason_code'] = 4;
$fixture->duel = ['player_a_id' => 10, 'player_b_id' => 20, 'pre_count_a' => 6, 'pre_count_b' => 6];
$war = $fixture->argGameEndSummary()['summary'];
assertEnd('war', $war['final_show_mode'], 'Reload must retain a final-war summary.');
assertEnd(6, $war['players'][0]['pre_final_believer_count'], 'Reload must retain pre-final counts.');

EndSummaryFixture::$globals['game_end_winner_id'] = 0;
assertEnd([], $fixture->argGameEndSummary()['summary'], 'An abandoned game must not invent a winner.');

require __DIR__ . '/../modules/php/HOFMachineStates.inc.php';
assertEnd('argGameEndSummary', $machinestates[102]['args'] ?? null, 'BGA must publish reconnect arguments for state 102.');
echo "Game-end snapshot tests passed.\n";
