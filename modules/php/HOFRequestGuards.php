<?php

final class HOFRequestGuards
{
  public static function debugToolAllowed(bool $enabled): bool
  {
    return $enabled;
  }

  public static function canDriveAiStep(int $caller_id, int $driver_id, int $token, int $pending_token): bool
  {
    return $caller_id > 0
      && $caller_id === $driver_id
      && $token > 0
      && $token === $pending_token;
  }
}
