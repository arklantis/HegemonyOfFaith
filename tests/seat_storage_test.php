<?php

require_once dirname(__DIR__) . '/modules/php/HOFSeatStorage.php';

$game_source = file_get_contents(dirname(__DIR__) . '/modules/php/Game.php');

function assertSeatStorage($condition, string $message): void
{
  if (!$condition) {
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
  }
}

$adapter = new HOFMemorySeatStorageAdapter(
  [99 => ['player_id' => 99, 'player_name' => 'Human', 'player_sect' => 4]],
  [1 => ['player_id' => 1, 'player_no' => 2, 'player_name' => 'AI 1', 'player_color' => 'ff0000', 'player_role' => 1]]
);
$storage = new HOFSeatStorage($adapter, 7);

$seats = $storage->seats();
assertSeatStorage(count($seats) === 2, 'Human and bot seats must share one collection.');
assertSeatStorage(($seats[1]['player_ai'] ?? 0) === 1, 'Bot seats must be normalized as AI seats.');
assertSeatStorage($storage->botIds() === [1], 'Bot IDs must come from stored bot seats.');
assertSeatStorage($storage->isReservedBotId(7), 'Reserved bot IDs must include the configured upper bound.');
assertSeatStorage(!$storage->isReservedBotId(99), 'Human account IDs must not route to bot_player.');
assertSeatStorage($storage->value(99, 'player_sect') === 4, 'Human seat fields must be read through the adapter.');
assertSeatStorage($storage->value(1, 'player_role') === 1, 'Bot seat fields must use the same read interface.');

$storage->updateSeat(1, 'player_score = 3');
$storage->updateSeat(99, 'player_score = 4');
$storage->updateAll('player_role = 0', '1 = 1');
$updates = $adapter->updates();
assertSeatStorage(($updates[0]['table'] ?? '') === 'bot_player', 'Bot writes must route to bot_player.');
assertSeatStorage(($updates[1]['table'] ?? '') === 'player', 'Human writes must route to player.');
assertSeatStorage(
  array_column(array_slice($updates, 2), 'table') === ['player', 'bot_player'],
  'Bulk seat writes must reach both tables.'
);
assertSeatStorage(
  strpos($game_source, 'private const VPLAYER = HOFSeatStorage::SQL_SOURCE;') !== false,
  'The seat module must own the combined human and bot SQL source.'
);
assertSeatStorage(
  !preg_match('/DbQuery\("UPDATE (?:player|bot_player)\b/', $game_source),
  'Game rules must not bypass the seat storage update interface.'
);

$adapter->replaceSeats(
  [99 => ['player_id' => 99, 'player_name' => 'Human']],
  [2 => ['player_id' => 2, 'player_name' => 'AI 2']]
);
assertSeatStorage($storage->botIds() === [2], 'Writes must invalidate the cached bot-seat snapshot.');

echo "Seat storage tests passed.\n";
