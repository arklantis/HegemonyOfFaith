<?php

final class HOFConfrontationLifecycle
{
  public const NONE = 0;
  public const PHYSICAL_ATTACK = 1;
  public const FAITH_WAR = 2;
  public const MARTYRDOM = 3;
  public const BREAKING_FAITH = 4;
  public const CONSPIRACY = 6;
  public const FAITH_DEBATE = 7;
  public const WITCH_HUNT = 8;
  public const SPREAD_RUMORS = 9;
  public const FINAL_WAR = 10;
  public const FINAL_CONSPIRACY = 11;
  public const FINAL_SECT_WAR = 12;

  public const CONTINUE = 'continue';
  public const END_DEPLETED = 'end_depleted';
  public const FINALIZE = 'finalize';

  private const TYPES = [
    self::PHYSICAL_ATTACK,
    self::FAITH_WAR,
    self::MARTYRDOM,
    self::BREAKING_FAITH,
    self::CONSPIRACY,
    self::FAITH_DEBATE,
    self::WITCH_HUNT,
    self::SPREAD_RUMORS,
    self::FINAL_WAR,
    self::FINAL_CONSPIRACY,
    self::FINAL_SECT_WAR,
  ];

  private const CONTEXT_KEYS = [
    'war_attacker_id',
    'war_defender_id',
    'war_card_attacker',
    'war_card_defender',
    'war_type',
    'war_attack_blocked',
    'war_rep_attacker_id',
    'war_rep_defender_id',
    'debate_round',
  ];

  public static function begin(int $type, int $attacker_id, int $defender_id = 0, array $overrides = []): array
  {
    self::assertType($type);
    if ($attacker_id <= 0) {
      throw new InvalidArgumentException('A confrontation requires an attacker.');
    }

    return self::mergeContext([
      'war_attacker_id' => $attacker_id,
      'war_defender_id' => max(0, $defender_id),
      'war_card_attacker' => 0,
      'war_card_defender' => 0,
      'war_type' => $type,
      'war_attack_blocked' => 0,
      'war_rep_attacker_id' => 0,
      'war_rep_defender_id' => 0,
      'debate_round' => 0,
    ], $overrides);
  }

  public static function clear(): array
  {
    return array_fill_keys(self::CONTEXT_KEYS, 0);
  }

  public static function nextRound(array $overrides = []): array
  {
    return self::mergeContext([
      'war_card_attacker' => 0,
      'war_card_defender' => 0,
      'war_attack_blocked' => 0,
      'war_rep_attacker_id' => 0,
      'war_rep_defender_id' => 0,
    ], $overrides);
  }

  public static function defenseKind(int $type): string
  {
    self::assertType($type);
    if ($type === self::BREAKING_FAITH) return 'breaking_faith';
    if (in_array($type, [self::CONSPIRACY, self::FAITH_DEBATE, self::SPREAD_RUMORS], true)) return 'mental';
    return 'physical';
  }

  public static function isAoe(int $type): bool
  {
    return in_array($type, [self::MARTYRDOM, self::CONSPIRACY], true);
  }

  public static function isDuel(int $type): bool
  {
    return in_array($type, [self::FAITH_WAR, self::FINAL_WAR, self::FINAL_SECT_WAR], true);
  }

  public static function defenseEndsSectResponse(int $type): bool
  {
    return in_array($type, [self::FAITH_WAR, self::FAITH_DEBATE, self::WITCH_HUNT, self::SPREAD_RUMORS], true);
  }

  public static function resolveTransition(int $type): string
  {
    $transitions = [
      self::BREAKING_FAITH => 'breakingFaith',
      self::FAITH_WAR => 'faithWarDuel',
      self::MARTYRDOM => 'martyrdom',
      self::CONSPIRACY => 'conspiracy',
      self::FAITH_DEBATE => 'faithDebate',
      self::WITCH_HUNT => 'witchHunt',
      self::SPREAD_RUMORS => 'spreadRumors',
    ];
    return $transitions[$type] ?? 'playerTurn';
  }

  public static function reverseKarmaResumeMode(int $type): int
  {
    $modes = [
      self::FAITH_WAR => 11,
      self::FAITH_DEBATE => 12,
      self::MARTYRDOM => 13,
      self::CONSPIRACY => 14,
    ];
    return $modes[$type] ?? 0;
  }

  public static function commitTransition(int $type): string
  {
    if (self::isDuel($type)) {
      return 'nextDuelStep';
    }
    if ($type === self::FAITH_DEBATE) return 'nextDebateStep';
    return 'nextStep';
  }

  public static function roundStartDecision(int $type, int $attacker_available, int $defender_available): string
  {
    if ($attacker_available > 0 && $defender_available > 0) return self::CONTINUE;
    if ($type === self::FINAL_SECT_WAR) return self::FINALIZE;
    return self::END_DEPLETED;
  }

  public static function compareBelievers(int $card_a_type, int $card_b_type, bool $faith_war_bonus): array
  {
    if ($card_a_type === $card_b_type) {
      return ['winner' => 0, 'bonus' => false];
    }
    if ($card_a_type < 1 || $card_a_type > 5 || $card_b_type < 1 || $card_b_type > 5) {
      throw new InvalidArgumentException('Believer types must be between 1 and 5.');
    }

    $difference = ($card_a_type - $card_b_type + 5) % 5;
    if ($difference === 1 || $difference === 2) {
      return ['winner' => 1, 'bonus' => $faith_war_bonus && $difference === 1];
    }
    return ['winner' => -1, 'bonus' => $faith_war_bonus && $difference === 4];
  }

  private static function mergeContext(array $context, array $overrides): array
  {
    foreach ($overrides as $key => $value) {
      if (!in_array($key, self::CONTEXT_KEYS, true)) {
        throw new InvalidArgumentException('Unknown confrontation context key: ' . $key);
      }
      $context[$key] = (int) $value;
    }
    return $context;
  }

  private static function assertType(int $type): void
  {
    if (!in_array($type, self::TYPES, true)) {
      throw new InvalidArgumentException('Unknown confrontation type: ' . $type);
    }
  }
}
