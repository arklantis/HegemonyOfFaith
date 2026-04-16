<?php

// Mocking the class context for testing
class TestHegemonyOfFaith
{
    // Paste the function we want to test
    function compareBelievers($card_a_type, $card_b_type, $is_faith_war)
    {
        if ($card_a_type == $card_b_type) {
            return array('winner' => 0, 'bonus' => false);
        }

        // Calculate cyclic difference: (A - B + 5) % 5
        // Result 1 or 2 => A wins
        // Result 3 or 4 => B wins (which means B is 2 or 1 steps ahead of A)
        $diff = ($card_a_type - $card_b_type + 5) % 5;

        if ($diff == 1 || $diff == 2) {
            // A wins
            // Bonus only applies if diff == 1 (Direct counter / Crushing Victory)
            $bonus = ($diff == 1 && $is_faith_war);
            return array('winner' => 1, 'bonus' => $bonus);
        } else {
            // B wins (diff is 3 or 4)
            // Bonus only applies if diff == 4 (which means B is 1 step ahead of A in cycle)
            $bonus = ($diff == 4 && $is_faith_war);
            return array('winner' => -1, 'bonus' => $bonus);
        }
    }
}

$game = new TestHegemonyOfFaith();

// Test Cases
$tests = [
    // [A, B, IsWar, ExpectedWinner, ExpectedBonus, Desc]
    [3, 2, true, 1, true, clienttranslate("3 vs 2 (War): A wins + Bonus")],
    [2, 3, true, -1, true, clienttranslate("2 vs 3 (War): B wins + Bonus")],
    [3, 1, true, 1, false, clienttranslate("3 vs 1 (War): A wins + No Bonus")],
    [1, 3, true, -1, false, clienttranslate("1 vs 3 (War): B wins + No Bonus")],
    [1, 5, true, 1, true, clienttranslate("1 vs 5 (War): A wins + Bonus (Cyclic)")],
    [5, 1, true, -1, true, clienttranslate("5 vs 1 (War): B wins + Bonus (Cyclic)")],
    [3, 3, true, 0, false, clienttranslate("3 vs 3 (War): Draw")],
    [3, 2, false, 1, false, clienttranslate("3 vs 2 (No War): A wins + No Bonus")],
    [1, 5, false, 1, false, clienttranslate("1 vs 5 (No War): A wins + No Bonus")],
];

$failed = 0;
echo clienttranslate("Starting Unit Tests for Combat Logic...\n");
echo "----------------------------------------\n";

foreach ($tests as $i => $test) {
    list($a, $b, $isWar, $expWin, $expBonus, $desc) = $test;
    $result = $game->compareBelievers($a, $b, $isWar);

    if ($result['winner'] === $expWin && $result['bonus'] === $expBonus) {
        echo "[PASS] Test #$i: $desc\n";
    } else {
        echo "[FAIL] Test #$i: $desc\n";
        echo "       Expected: Winner=$expWin, Bonus=" . ($expBonus ? 'true' : 'false') . "\n";
        echo "       Got:      Winner={$result['winner']}, Bonus=" . ($result['bonus'] ? 'true' : 'false') . "\n";
        $failed++;
    }
}

echo "----------------------------------------\n";
if ($failed === 0) {
    echo clienttranslate("ALL TESTS PASSED! Logic is solid.\n");
} else {
    echo str_replace('${n}', (string) $failed, clienttranslate('${n} tests FAILED. Please review logic.')) . "\n";
}
