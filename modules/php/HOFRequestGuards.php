<?php

final class HOFRequestGuards
{
  public const ACTIVE_PLAYER = 'active_player';
  public const CURRENT_PLAYER = 'current_player';
  public const CURRENT_OR_ACTIVE = 'current_or_active';
  public const EXPECTED_PLAYER = 'expected_player';

  public static function debugToolAllowed(bool $enabled): bool
  {
    return $enabled;
  }

  public static function authorizeAction(
    string $actor_policy,
    int $current_player_id,
    int $active_player_id,
    int $expected_player_id = 0,
    bool $automation = false
  ): array {
    $current_player_id = max(0, $current_player_id);
    $active_player_id = max(0, $active_player_id);
    $expected_player_id = max(0, $expected_player_id);

    if ($actor_policy === self::ACTIVE_PLAYER) {
      $allowed = $active_player_id > 0
        && ($automation || $current_player_id <= 0 || $current_player_id === $active_player_id);
      return self::decision($allowed, $active_player_id);
    }

    if ($actor_policy === self::CURRENT_PLAYER) {
      return self::decision($current_player_id > 0, $current_player_id);
    }

    if ($actor_policy === self::CURRENT_OR_ACTIVE) {
      $actor_id = $current_player_id > 0 ? $current_player_id : $active_player_id;
      return self::decision($actor_id > 0, $actor_id);
    }

    if ($actor_policy === self::EXPECTED_PLAYER) {
      if ($expected_player_id <= 0) return self::decision(false, 0);
      if (!$automation && $current_player_id > 0 && $current_player_id !== $expected_player_id) {
        return self::decision(false, $current_player_id);
      }
      $actor_id = $automation || $current_player_id <= 0 ? $expected_player_id : $current_player_id;
      $switch_to = $active_player_id !== $expected_player_id ? $expected_player_id : 0;
      return self::decision(true, $actor_id, $switch_to);
    }

    throw new InvalidArgumentException('Unknown player-action actor policy: ' . $actor_policy);
  }

  public static function actionAvailable(string $action, array $possible_actions): bool
  {
    return $action !== '' && in_array($action, array_map('strval', $possible_actions), true);
  }

  public static function canDriveAiStep(int $caller_id, int $driver_id, int $token, int $pending_token): bool
  {
    return $caller_id > 0
      && $caller_id === $driver_id
      && $token > 0
      && $token === $pending_token;
  }

  private static function decision(bool $allowed, int $actor_id, int $switch_to = 0): array
  {
    return [
      'allowed' => $allowed,
      'actor_id' => max(0, $actor_id),
      'switch_to' => max(0, $switch_to),
    ];
  }
}
