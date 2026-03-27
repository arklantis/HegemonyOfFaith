with open('hegemonyoffaith.game.php', 'r', encoding='utf-8') as f:
    lines = f.readlines()

found = False
for i in range(len(lines)):
    if "1.5 Validate per-turn action category usage" in lines[i]:
        if "0b01110" in lines[i+4]:
            print("Found block exactly! Replacing...")
            lines[i+4] = "    $extra = max(0, (int) self::getGameStateValue('extra_action_slots'));\\n    if ($extra <= 0 && ($action_type_mask & 0b01110) && ($current_performed_actions & $action_type_mask)) {\\n"
            found = True
            break

if not found:
    print("Could not find block!")
else:
    with open('hegemonyoffaith.game.php', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fixed!")
