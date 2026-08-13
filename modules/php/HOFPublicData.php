<?php

final class HOFPublicData
{
  private const CONCEALED_COMMIT_EVENTS = [
    'faithWarCardPlayed',
    'faithDebateCardPlayed',
    'martyrdomAttackerCommitted',
    'martyrdomBelieverCommitted',
    'conspiracyBelieverCommitted',
  ];

  public static function reloadForViewer(int $viewer_id, array $domain): array
  {
    $players = (array) ($domain['players'] ?? []);
    $action_hands = (array) ($domain['action_hands'] ?? []);
    $believer_hands = (array) ($domain['believer_hands'] ?? []);
    $skill_entries = (array) ($domain['skill_entries'] ?? []);

    foreach ($players as $player_id => &$player) {
      $player_id = (int) $player_id;
      $player['action_count'] = count((array) ($action_hands[$player_id] ?? []));
      $player['believer_count'] = count((array) ($believer_hands[$player_id] ?? []));
    }
    unset($player);

    $skills = [];
    $skills_revealed = [];
    $skill_states = [];
    foreach ($players as $player_id => $_player) {
      $player_id = (int) $player_id;
      $entry = (array) ($skill_entries[$player_id] ?? []);
      $is_self = $viewer_id > 0 && $player_id === $viewer_id;
      $visible = $is_self || !empty($entry['revealed']);
      $skills_revealed[$player_id] = $visible ? 1 : 0;
      $skills[$player_id] = $visible ? ($entry['card'] ?? null) : null;
      $skill_states[$player_id] = $visible
        ? ($is_self ? ($entry['private_state'] ?? null) : ($entry['public_state'] ?? null))
        : null;
    }

    return [
      'players' => $players,
      'actioncards' => (array) ($action_hands[$viewer_id] ?? []),
      'believercards' => (array) ($believer_hands[$viewer_id] ?? []),
      'skillcards' => (array) ($skill_entries[$viewer_id]['cards'] ?? []),
      'player_skills' => $skills,
      'player_skills_revealed' => $skills_revealed,
      'player_skill_public_state' => $skill_states,
    ];
  }

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

  public static function publicEvent(string $event, array $payload): array
  {
    return in_array($event, self::CONCEALED_COMMIT_EVENTS, true)
      ? self::publicCommit($payload)
      : $payload;
  }

  public static function splitPrivateEvent(array $public_payload, int $owner_id, array $private_payload): array
  {
    return [
      'public' => self::publicCommit($public_payload),
      'private_player_id' => max(0, $owner_id),
      'private' => $private_payload,
    ];
  }

  public static function publicCombatContext(array $context): array
  {
    $context['war_attacker_committed'] = ((int) ($context['war_card_attacker'] ?? 0)) > 0 ? 1 : 0;
    $context['war_defender_committed'] = ((int) ($context['war_card_defender'] ?? 0)) > 0 ? 1 : 0;
    unset($context['war_card_attacker'], $context['war_card_defender']);
    return $context;
  }
}
