<?php

final class HOFPersistentFlowState
{
  private const PREFIX = 'hof.flow.';

  private const KEYS = [
    // End-game snapshots.
    'final_struggle_contender_mask',
    'final_struggle_pre_counts_pack_1',
    'final_struggle_pre_counts_pack_2',
    // Practice AI request identity and pacing.
    'practice_ai_player_mask',
    'practice_ai_request_token',
    'practice_ai_request_seq',
    'practice_ai_request_at',
    // Monotonic UI identities.
    'confrontation_id',
    'action_discard_seq',
    // Gate of Truth copied-skill state.
    'gate_truth_copied_skill_type',
    'gate_truth_copied_source_player_id',
    'gate_truth_turn_used_mask',
    'gate_truth_copied_skill_mask',
    // The Prophet two-stage prediction state.
    'prophet_pending_primary_player_id',
    'prophet_pending_secondary_player_id',
    'prophet_pending_primary_guess_type',
    'prophet_pending_secondary_guess_type',
    // Turn and debate interrupts.
    'praise_repeat_bypass',
    'debate_stop_rejected_round',
    'debate_stop_requester_id',
    'debate_stop_leader_id',
    // Solo Bot ownership, multiactive pacing and spy memory.
    'solo_pending_actor_id',
    'solo_current_actor_id',
    'solo_multi_bot_mask',
    'solo_multi_transition_code',
    'solo_bot_spy_pack_a',
    'solo_bot_spy_pack_b',
    'hof_turn_counter',
    'solo_bot_spy_pack_c',
  ];

  private $globals;

  public function __construct($globals)
  {
    $this->globals = $globals;
  }

  public static function supports(string $key): bool
  {
    return in_array($key, self::KEYS, true);
  }

  public static function storageKey(string $key): string
  {
    self::assertSupported($key);
    return self::PREFIX . $key;
  }

  public function initialize(): void
  {
    foreach (self::KEYS as $key) {
      $this->globals->set(self::storageKey($key), 0);
    }
  }

  public function getInt(string $key): int
  {
    return (int) $this->globals->get(self::storageKey($key), 0);
  }

  public function setInt(string $key, int $value): void
  {
    $this->globals->set(self::storageKey($key), $value);
  }

  public function increment(string $key, int $amount = 1): int
  {
    return (int) $this->globals->inc(self::storageKey($key), $amount);
  }

  private static function assertSupported(string $key): void
  {
    if (!self::supports($key)) {
      throw new InvalidArgumentException('Unknown persistent flow-state key: ' . $key);
    }
  }
}
