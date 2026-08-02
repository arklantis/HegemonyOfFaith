<?php

final class HOFTurnOwnership
{
  public static function resolveActionWindowActor(
    int $framework_active_player_id,
    int $turn_owner_player_id,
    array $solo_bot_player_ids
  ): int {
    $solo_bot_ids = array_values(array_unique(array_filter(
      array_map('intval', $solo_bot_player_ids),
      function ($player_id) {
        return $player_id > 0;
      }
    )));
    if ($turn_owner_player_id > 0 && in_array($turn_owner_player_id, $solo_bot_ids, true)) {
      return $turn_owner_player_id;
    }
    return max(0, $framework_active_player_id);
  }
}
