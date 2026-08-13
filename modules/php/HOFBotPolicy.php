<?php

final class HOFBotPolicy
{
  public static function scoreActionPlan(array $plan, array $context, bool $played_recruit): int
  {
    $type = (string) ($plan['type'] ?? '');
    $target_id = (int) ($plan['target_player_id'] ?? 0);
    $own_count = (int) ($context['own_count'] ?? 0);
    $target_count = (int) ($context['target_count'] ?? 0);
    $grave_count = (int) ($context['grave_count'] ?? 0);
    $own_sect_count = (int) ($context['own_sect_count'] ?? 0);
    $target_sect_count = (int) ($context['target_sect_count'] ?? 0);
    $skill = (int) ($context['skill_type'] ?? 0);
    $role = (int) ($context['role'] ?? 0);
    $spied_id = (int) ($context['spied_player_id'] ?? 0);
    $enemy_sect_count = (int) ($context['enemy_sect_count'] ?? 0);
    $mood = (string) ($context['mood'] ?? 'even');
    $reckless = !empty($context['wants_to_lose_believers']);

    switch ($type) {
      case 'have_a_charity':
        $score = 3 + max(0, 3 - $own_count);
        break;
      case 'its_a_miracle':
        $score = 2 + ($grave_count >= 3 ? 2 : 0) + max(0, 3 - $own_count);
        break;
      case 'divine_inspire':
        $score = 2 + max(0, 3 - $own_count);
        break;
      case 'witch_hunt':
        $score = 2 + min(2, intdiv($target_sect_count, 3));
        break;
      case 'spread_rumors':
        $score = 3;
        break;
      case 'faith_debate':
        $score = 2 + max(-2, min(2, $own_sect_count - $target_sect_count));
        break;
      case 'faith_war':
        $score = 1 + max(-2, min(2, $own_sect_count - $target_sect_count));
        break;
      case 'martyrdom':
      case 'conspiracy':
        $score = 1 + min(3, $enemy_sect_count);
        break;
      case 'kowtow_to_me':
        $score = 5;
        break;
      case 'breaking_faith':
        $score = $role === 0
          ? 4 + min(3, max(0, $target_count - $own_count + 1))
          : 3 + min(3, intdiv($target_count, 2));
        break;
      case 'secret_alliance':
        $score = 1;
        break;
      case 'info_spy':
        $score = $spied_id > 0 ? -1 : 2;
        break;
      default:
        $score = 1;
    }

    $recruit_types = ['have_a_charity', 'its_a_miracle', 'divine_inspire'];
    if ($played_recruit && in_array($type, $recruit_types, true)) $score -= 3;
    if ($spied_id > 0 && $target_id === $spied_id && in_array(
      $type,
      ['witch_hunt', 'faith_war', 'spread_rumors', 'faith_debate'],
      true
    )) {
      $score += 2;
    }

    if ($skill === 12) {
      if ($type === 'kowtow_to_me') $score -= 99;
      if (in_array($type, ['martyrdom', 'conspiracy', 'faith_war'], true)) $score -= 2;
      if (in_array($type, $recruit_types, true)) $score += 2;
    }
    if ($reckless) {
      if (in_array($type, ['martyrdom', 'conspiracy', 'faith_war', 'faith_debate'], true)) $score += 3;
      if (in_array($type, $recruit_types, true)) $score -= 3;
    }
    if ($skill === 10 && $type === 'faith_war') $score += min(3, intdiv($grave_count, 2));
    if ($skill === 16 && in_array($type, ['faith_war', 'faith_debate'], true)) $score += 2;
    if ($skill === 5 && $type === 'martyrdom') $score += 2;
    if (($skill === 6 || $skill === 3) && $type === 'kowtow_to_me') $score += 2;

    $steal_types = ['spread_rumors', 'faith_debate', 'conspiracy'];
    $costly_types = ['martyrdom', 'conspiracy', 'faith_war'];
    if ($mood === 'ahead') {
      if (in_array($type, $costly_types, true)) $score -= 2;
      if (in_array($type, $recruit_types, true)) $score += 1;
    } elseif ($mood === 'behind') {
      if (in_array($type, $steal_types, true)) $score += 1;
      if (in_array($type, $recruit_types, true)) $score += 1;
    } elseif ($mood === 'desperate') {
      if (in_array($type, $steal_types, true)) $score += 2;
      if ($type === 'martyrdom') $score += 1;
      if (in_array($type, $recruit_types, true)) $score += 1;
    }
    return $score;
  }

  public static function chooseActionPlan(
    array $scored_plans,
    int $own_believers,
    bool $played_recruit,
    bool $wants_to_lose_believers,
    array $entropy = []
  ): array {
    if ($wants_to_lose_believers) {
      $own_believers = 99;
    }

    $recruits = self::plansInGroup($scored_plans, 'recruit');
    if ($own_believers <= 2 && !$played_recruit && !empty($recruits)) {
      return self::chooseEntry($recruits, (int) ($entropy[0] ?? 0));
    }

    if ($own_believers <= 2) {
      $safe_attacks = array_values(array_filter($scored_plans, function ($entry) {
        $plan = (array) ($entry['plan'] ?? []);
        return (string) ($plan['group'] ?? '') === 'attack' && in_array(
          (string) ($plan['type'] ?? ''),
          ['spread_rumors', 'witch_hunt', 'faith_debate'],
          true
        );
      }));
      if (!empty($safe_attacks)) {
        return self::chooseEntry($safe_attacks, (int) ($entropy[0] ?? 0));
      }
    }

    $best_plan = [];
    $best_score = -999;
    foreach (array_values($scored_plans) as $index => $entry) {
      $score = (int) ($entry['score'] ?? -999);
      if ($score <= -50) continue;
      $score += abs((int) ($entropy[$index] ?? 0)) % 3;
      if ($score > $best_score) {
        $best_score = $score;
        $best_plan = (array) ($entry['plan'] ?? []);
      }
    }
    return $best_plan;
  }

  public static function acceptsSurrender(int $believer_count): bool
  {
    return $believer_count >= 2;
  }

  public static function choosesReverseKarma(int $own_sect, int $defender_sect): bool
  {
    return $own_sect >= 0 && $defender_sect >= 0 && $own_sect === $defender_sect;
  }

  public static function prophetGuess(array $discarded_types, array $own_types, int $tie_index = 0): int
  {
    $remaining = [1 => 12, 2 => 12, 3 => 12, 4 => 12, 5 => 12];
    foreach (array_merge($discarded_types, $own_types) as $type) {
      $type = (int) $type;
      if (isset($remaining[$type])) $remaining[$type]--;
    }

    $best = max($remaining);
    if ($best <= 0) return 0;
    $best_types = [];
    foreach ($remaining as $type => $count) {
      if ($count === $best) $best_types[] = (int) $type;
    }
    return $best_types[self::boundedIndex($tie_index, count($best_types))] ?? 0;
  }

  public static function situation(int $deck_count, int $initial_deck_count, int $own_count, array $enemy_counts): array
  {
    $initial = max(1, $initial_deck_count);
    $progress = max(0.0, min(1.0, 1.0 - ($deck_count / $initial)));
    $enemy_counts = array_values(array_map('intval', $enemy_counts));
    rsort($enemy_counts, SORT_NUMERIC);
    $ahead_of = count(array_filter($enemy_counts, fn($count) => $own_count >= $count));
    $rank = 1 + count($enemy_counts) - $ahead_of;
    $leader_count = empty($enemy_counts) ? $own_count : max($enemy_counts);
    $gap = max(0, $leader_count - $own_count);
    $mood = 'even';
    if ($gap === 0 && $rank === 1) {
      $mood = 'ahead';
    } elseif ($gap >= 3 || $rank >= 3) {
      $mood = ($progress > 0.6 || $gap >= 5) ? 'desperate' : 'behind';
    }
    return [
      'progress' => $progress,
      'rank' => $rank,
      'gap' => $gap,
      'own' => $own_count,
      'mood' => $mood,
    ];
  }

  public static function choosesPraiseOfLife(int $own_count, int $recovery_potential, array $playable_types, string $mood): bool
  {
    if ($own_count < 2 || ($own_count < 3 && $recovery_potential < 2) || empty($playable_types)) {
      return false;
    }
    if ($mood === 'behind' || $mood === 'desperate') {
      return true;
    }
    $worthwhile = ['have_a_charity', 'its_a_miracle', 'divine_inspire'];
    if ($mood === 'even') {
      $worthwhile = array_merge($worthwhile, ['spread_rumors', 'faith_debate', 'conspiracy', 'kowtow_to_me']);
    }
    return count(array_intersect($playable_types, $worthwhile)) > 0;
  }

  private static function boundedIndex(int $index, int $count): int
  {
    return $count > 0 ? abs($index) % $count : 0;
  }

  private static function plansInGroup(array $entries, string $group): array
  {
    return array_values(array_filter($entries, function ($entry) use ($group) {
      return (string) (($entry['plan']['group'] ?? '')) === $group;
    }));
  }

  private static function chooseEntry(array $entries, int $index): array
  {
    $entry = $entries[self::boundedIndex($index, count($entries))] ?? [];
    return (array) ($entry['plan'] ?? []);
  }
}
