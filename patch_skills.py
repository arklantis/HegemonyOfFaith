with open('modules/php/Game.php', 'r', encoding='utf-8') as f:
    lines = f.readlines()

praise_found = False
impermanence_found = False

for i in range(len(lines)):
    if "1.5 Validate per-turn action category usage" in lines[i]:
        for j in range(i, i+10):
            if "0b01110" in lines[j] and "$current_performed_actions" in lines[j]:
                original_indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                lines[j] = (original_indent + "$extra = max(0, (int) self::getGameStateValue('extra_action_slots'));\n" +
                            original_indent + "if ($extra <= 0 && ($action_type_mask & 0b01110) && ($current_performed_actions & $action_type_mask)) {\n")
                print("Praise of life fixed!")
                praise_found = True
                break
        if praise_found: break

for i in range(len(lines)):
    if "// Impermanence of Life special win" in lines[i]:
        start_idx = i
        end_idx = -1
        for j in range(start_idx, start_idx+40):
            if "if ($winner_id <= 0) return false;" in lines[j]:
                end_idx = j
                break
        
        if end_idx != -1:
            replacement = """    $is_game_ending = false;
    // Special instant-unification victory: only one leader remains and no wanderer exists.
    if ($wanderer_count === 0 && count($leader_ids) === 1) {
      $is_game_ending = true;
      $winner_id = (int) $leader_ids[0];
      $reason = 'unification';
    } elseif ($this->believer_cards->countCardInLocation('deck') <= 0) {
      // Standard end: believer deck is empty.
      $is_game_ending = true;
      $winner_id = $this->computeWinnerWhenBelieverDeckEmpty($anchor_player_id);
      $reason = 'believer_deck_empty';
    }

    if (!$is_game_ending) return false;

    // Impermanence of Life special win: if still active and owner has >=5 believers at game-end check.
    $players = array_map('intval', array_keys(self::loadPlayersBasicInfos()));
    foreach ($players as $pid) {
      $role = (int) self::getUniqueValueFromDB("SELECT player_role FROM player WHERE player_id = $pid");
      if ($role !== 0) continue;
      if (!$this->isImpermanenceActiveOnPlayer((int) $pid)) continue;
      $cnt = (int) $this->believer_cards->countCardInLocation('hand', (int) $pid);
      if ($cnt >= 5) {
        $winner_id = (int) $pid;
        $reason = 'impermanence';
        break;
      }
    }

    if ($winner_id <= 0) return false;
"""
            lines[start_idx:end_idx+1] = [replacement]
            print("Impermanence fixed!")
            impermanence_found = True
        break

if not praise_found: print("Could not find Praise of Life block!")
if not impermanence_found: print("Could not find Impermanence block!")

with open('modules/php/Game.php', 'w', encoding='utf-8') as f:
    f.writelines(lines)
