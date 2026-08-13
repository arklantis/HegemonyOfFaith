<?php

require_once dirname(__DIR__) . '/modules/php/HOFBotPolicy.php';

$policy_source = file_get_contents(dirname(__DIR__) . '/modules/php/HOFBotPolicy.php');

function assertBotPolicy($condition, string $message): void
{
  if (!$condition) {
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
  }
}

assertBotPolicy(
  !preg_match('/DbQuery|getUniqueValueFromDB|getObjectListFromDB|gamestate|notify/i', $policy_source),
  'Bot policy must remain independent from BGA persistence, state transitions, and notifications.'
);

assertBotPolicy(!HOFBotPolicy::acceptsSurrender(1), 'A bot must reject surrender when it cannot safely give a Believer.');
assertBotPolicy(HOFBotPolicy::acceptsSurrender(2), 'A bot must accept surrender with at least two Believers.');
assertBotPolicy(HOFBotPolicy::choosesReverseKarma(3, 3), 'Karma Reversed must protect the bot own Sect.');
assertBotPolicy(!HOFBotPolicy::choosesReverseKarma(3, 4), 'Karma Reversed must not help an enemy Sect.');

$guess = HOFBotPolicy::prophetGuess([1, 1, 1], [2, 2], 0);
assertBotPolicy($guess === 3, 'The Prophet must choose among the most likely remaining types.');

$situation = HOFBotPolicy::situation(10, 60, 2, [8, 6, 4]);
assertBotPolicy($situation['mood'] === 'desperate', 'A far-behind bot near game end must become desperate.');
assertBotPolicy($situation['rank'] === 4, 'Situation rank must count opponents with more Believers.');

$plans = [
  ['plan' => ['id' => 1, 'group' => 'attack', 'type' => 'faith_war'], 'score' => 9],
  ['plan' => ['id' => 2, 'group' => 'recruit', 'type' => 'have_a_charity'], 'score' => 2],
];
$choice = HOFBotPolicy::chooseActionPlan($plans, 2, false, false, [0, 0]);
assertBotPolicy(($choice['id'] ?? 0) === 2, 'A low-Believer bot must recruit before attacking.');
$choice = HOFBotPolicy::chooseActionPlan($plans, 2, false, true, [0, 0]);
assertBotPolicy(($choice['id'] ?? 0) === 1, 'Purple Hermit policy must bypass low-Believer recovery.');

$forbidden = [
  ['plan' => ['id' => 3, 'group' => 'setup', 'type' => 'kowtow_to_me'], 'score' => -99],
];
assertBotPolicy(HOFBotPolicy::chooseActionPlan($forbidden, 5, false, false, [0]) === [], 'Forbidden plans must never execute.');

$score_context = [
  'own_count' => 5,
  'target_count' => 8,
  'grave_count' => 4,
  'own_sect_count' => 5,
  'target_sect_count' => 8,
  'skill_type' => 12,
  'role' => 0,
  'mood' => 'ahead',
];
assertBotPolicy(
  HOFBotPolicy::scoreActionPlan(['type' => 'kowtow_to_me'], $score_context, false) <= -50,
  'Impermanence of Life must forbid Kowtow To Me in pure policy scoring.'
);
assertBotPolicy(
  HOFBotPolicy::scoreActionPlan(['type' => 'breaking_faith'], $score_context, false) > 4,
  'A Leader must value expelling a threatening Follower.'
);

assertBotPolicy(
  HOFBotPolicy::choosesPraiseOfLife(3, 0, ['spread_rumors'], 'even'),
  'An even bot may sacrifice for a worthwhile stealing action.'
);
assertBotPolicy(
  !HOFBotPolicy::choosesPraiseOfLife(2, 0, ['spread_rumors'], 'desperate'),
  'A bot with two Believers needs recovery potential before sacrificing one.'
);

echo "Bot policy tests passed.\n";
