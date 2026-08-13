<?php

interface HOFSeatStorageAdapter
{
  public function loadHumanSeats(): array;

  public function loadBotSeats(): array;

  public function readSeatValue(string $field, int $player_id);

  public function updateSeatTable(string $table, int $player_id, string $set_sql): void;

  public function updateSeatTableWhere(string $table, string $set_sql, string $where_sql): void;
}

final class HOFSqlSeatStorageAdapter implements HOFSeatStorageAdapter
{
  private $load_humans;
  private $load_bots;
  private $update_one;
  private $update_where;
  private $read_value;

  public function __construct(
    callable $load_humans,
    callable $load_bots,
    callable $update_one,
    callable $update_where,
    callable $read_value
  )
  {
    $this->load_humans = $load_humans;
    $this->load_bots = $load_bots;
    $this->update_one = $update_one;
    $this->update_where = $update_where;
    $this->read_value = $read_value;
  }

  public function loadHumanSeats(): array
  {
    return (array) call_user_func($this->load_humans);
  }

  public function loadBotSeats(): array
  {
    return (array) call_user_func($this->load_bots);
  }

  public function readSeatValue(string $field, int $player_id)
  {
    return call_user_func($this->read_value, $field, $player_id);
  }

  public function updateSeatTable(string $table, int $player_id, string $set_sql): void
  {
    call_user_func($this->update_one, $table, $player_id, $set_sql);
  }

  public function updateSeatTableWhere(string $table, string $set_sql, string $where_sql): void
  {
    call_user_func($this->update_where, $table, $set_sql, $where_sql);
  }
}

final class HOFMemorySeatStorageAdapter implements HOFSeatStorageAdapter
{
  private array $human_seats;
  private array $bot_seats;
  private array $updates = [];

  public function __construct(array $human_seats = [], array $bot_seats = [])
  {
    $this->human_seats = $human_seats;
    $this->bot_seats = $bot_seats;
  }

  public function loadHumanSeats(): array
  {
    return $this->human_seats;
  }

  public function loadBotSeats(): array
  {
    return $this->bot_seats;
  }

  public function readSeatValue(string $field, int $player_id)
  {
    $seat = $this->bot_seats[$player_id] ?? $this->human_seats[$player_id] ?? null;
    return is_array($seat) ? ($seat[$field] ?? null) : null;
  }

  public function updateSeatTable(string $table, int $player_id, string $set_sql): void
  {
    $this->updates[] = ['kind' => 'one', 'table' => $table, 'player_id' => $player_id, 'set' => $set_sql];
  }

  public function updateSeatTableWhere(string $table, string $set_sql, string $where_sql): void
  {
    $this->updates[] = ['kind' => 'where', 'table' => $table, 'set' => $set_sql, 'where' => $where_sql];
  }

  public function replaceSeats(array $human_seats, array $bot_seats): void
  {
    $this->human_seats = $human_seats;
    $this->bot_seats = $bot_seats;
  }

  public function updates(): array
  {
    return $this->updates;
  }
}

final class HOFSeatStorage
{
  public const SQL_SOURCE = "(SELECT player_id, player_no, player_name, player_color, player_avatar, player_score, player_zombie, player_eliminated, player_first, player_role, player_sect, player_leader_id, player_is_skill_sealed, player_is_conspiracy_rep, player_is_martyrdom_rep, player_wanderer_turns FROM player UNION ALL SELECT player_id, player_no, player_name, player_color, player_avatar, bot_score AS player_score, player_zombie, player_eliminated, player_first, player_role, player_sect, player_leader_id, player_is_skill_sealed, player_is_conspiracy_rep, player_is_martyrdom_rep, player_wanderer_turns FROM bot_player) vplayer";

  private HOFSeatStorageAdapter $adapter;
  private int $reserved_bot_id_max;
  private ?array $seat_cache = null;
  private ?array $bot_id_cache = null;
  private ?array $raw_bot_cache = null;
  private const READABLE_FIELDS = [
    'player_name',
    'player_role',
    'player_sect',
    'player_leader_id',
    'player_is_skill_sealed',
  ];

  public function __construct(HOFSeatStorageAdapter $adapter, int $reserved_bot_id_max)
  {
    $this->adapter = $adapter;
    $this->reserved_bot_id_max = $reserved_bot_id_max;
  }

  public function isReservedBotId(int $player_id): bool
  {
    return $player_id >= 1 && $player_id <= $this->reserved_bot_id_max;
  }

  public function botIds(): array
  {
    if ($this->bot_id_cache === null) {
      $ids = [];
      foreach ($this->rawBotSeats() as $key => $seat) {
        $ids[] = (int) ($seat['player_id'] ?? $key);
      }
      $ids = array_values(array_unique(array_filter($ids, fn($id) => $id > 0)));
      sort($ids, SORT_NUMERIC);
      $this->bot_id_cache = $ids;
    }
    return $this->bot_id_cache;
  }

  public function seats(): array
  {
    if ($this->seat_cache !== null) {
      return $this->seat_cache;
    }

    $seats = $this->adapter->loadHumanSeats();
    foreach ($this->rawBotSeats() as $key => $bot) {
      $bot_id = (int) ($bot['player_id'] ?? $key);
      if ($bot_id <= 0) continue;
      $seats[$bot_id] = [
        'player_id' => $bot_id,
        'player_no' => (int) ($bot['player_no'] ?? 0),
        'player_name' => (string) ($bot['player_name'] ?? ('AI ' . $bot_id)),
        'player_color' => (string) ($bot['player_color'] ?? 'cccccc'),
        'player_avatar' => (string) ($bot['player_avatar'] ?? ''),
        'player_zombie' => 0,
        'player_eliminated' => 0,
        'player_ai' => 1,
        'player_is_multiactive' => 0,
      ];
    }
    $this->seat_cache = $seats;
    return $seats;
  }

  public function value(int $player_id, string $field)
  {
    if (!in_array($field, self::READABLE_FIELDS, true)) {
      throw new InvalidArgumentException('Unsupported seat field: ' . $field);
    }
    return $this->adapter->readSeatValue($field, $player_id);
  }

  public function updateSeat(int $player_id, string $set_sql): void
  {
    $table = $this->isReservedBotId($player_id) ? 'bot_player' : 'player';
    $this->adapter->updateSeatTable($table, $player_id, $set_sql);
    $this->invalidate();
  }

  public function updateAll(string $set_sql, string $where_sql): void
  {
    $this->adapter->updateSeatTableWhere('player', $set_sql, $where_sql);
    $this->adapter->updateSeatTableWhere('bot_player', $set_sql, $where_sql);
    $this->invalidate();
  }

  public function invalidate(): void
  {
    $this->seat_cache = null;
    $this->bot_id_cache = null;
    $this->raw_bot_cache = null;
  }

  private function rawBotSeats(): array
  {
    if ($this->raw_bot_cache === null) {
      $this->raw_bot_cache = $this->adapter->loadBotSeats();
    }
    return $this->raw_bot_cache;
  }
}
