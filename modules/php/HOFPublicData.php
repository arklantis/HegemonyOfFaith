<?php

final class HOFPublicData
{
  public static function hiddenCard(array $card): array
  {
    return [
      'location' => (string) ($card['location'] ?? ''),
      'location_arg' => (int) ($card['location_arg'] ?? 0),
      'hidden' => 1,
    ];
  }

  public static function publicCommit(array $payload): array
  {
    unset($payload['card_id'], $payload['card_type'], $payload['type_arg']);
    return $payload;
  }

  public static function publicCombatContext(array $context): array
  {
    $context['war_attacker_committed'] = ((int) ($context['war_card_attacker'] ?? 0)) > 0 ? 1 : 0;
    $context['war_defender_committed'] = ((int) ($context['war_card_defender'] ?? 0)) > 0 ? 1 : 0;
    unset($context['war_card_attacker'], $context['war_card_defender']);
    return $context;
  }
}
