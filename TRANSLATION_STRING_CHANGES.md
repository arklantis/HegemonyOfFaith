# Translation String Changes

## 2026-06-12 — String consolidation pass (Claude)

Goal: identical-meaning strings now share one exact English key across PHP and JS, shrinking the BGA translation workload (735 → ~690 unique keys). Old keys below are RETIRED; carry their translations over to the new key in the BGA translation UI.

### 2026-07-16 applied corrections

- Applied the confirmed English-key corrections recorded below, including combat history wording, copied Skill prompts, surrender and representative states, defense results, and affected card tooltips.
- Holy Rebirth death accumulation is now scoped to the current Faith War. KABOOM! and Witch Hunt check only deaths caused by that use.
- Witch Hunt now preserves each discarded Believer's original owner so Holy Rebirth can restore the correct player's fallen Believers.

### Unified instruction/error keys

| New canonical key | Retired keys |
| --- | --- |
| `Select at least one Action card to discard.` | `Select at least one other Action card to discard` (JS), `Select one or more Action cards to discard` (JS), `Select Action card(s) to discard.` (JS), `Select at least one Action card to discard` (PHP), `Choose at least one Action card to discard for Divine Inspiration` (PHP) |
| `Select exactly 1 Believer to sacrifice.` | `Select exactly 1 Believer for KABOOM!` (JS), `Select exactly 1 Believer to sacrifice for Praise of Life` (JS), `... for World Peace` (JS), `... for Eternal Truth` (JS) |
| `Choose one of your Believers to sacrifice.` (existing) | `Choose one of your Believers for KABOOM!.` (PHP) |
| `Select one Action card from your hand to exchange.` | `Select one Action card from your hand to exchange` (JS), `Select exactly one Action card to offer` (JS), `Select exactly one Action card` (JS), `Select one Action card from your hand to offer` (JS), `Choose an Action card from your hand to exchange.` (PHP), `Choose one Action card from your hand.` (PHP) |
| `Choose your starting Skill.` | `Choose one starting Skill you like for this game.` (JS), `Choose one of your 2 starting Skills.` (PHP) |
| `Choose a Believer type for Witch Hunt.` | `Choose a Believer for Witch Hunt.` (JS), `Choose a Believer type for Witch Hunt` (PHP) |
| `Wanderer must snatch a Believer first.` (existing) | `Wanderer must finish snatching first.` (PHP), `Wanderer must snatch a Believer before ending turn.` (PHP) |
| `This skill is not available right now.` (existing) | `This skill cannot be used right now.` (PHP) |
| `Conspiracy by ${player_name} ends.` (existing PHP) | `Conspiracy by ${player_name} ends` (JS, missing period) |
| `Final Struggle Conspiracy by ${player_name} ends.` (existing PHP) | `Final Struggle Conspiracy by ${player_name} ends` (JS) |
| `Target a player with Soul-Cutting Sword.` (existing PHP) | `Target a player with Soul-Cutting Sword` (JS) |
| `${player_name} rises again and returns to normal play!` (existing PHP) | `rises again and returns to normal play!` (JS concatenation fragment — now uses the full template) |

### Unified button labels

Buttons now use short uniform verbs; context lives in the status/instruction text.

| New label | Retired labels |
| --- | --- |
| `Confirm` | `Confirm Believer`, `Confirm Discard`, `Confirm Discard and Draw`, `Confirm Starting Skill`, `Confirm Skill`, `Confirm Offered Action Card`, `Confirm Give Believer`, `Confirm Exchange Card`, `Continue` |
| `Cancel` | `Cancel Discard`, `Cancel Action`, `Keep Giving Believer` |
| `Skip` | `Skip This Time`, `Skip Defense`, `Do Not Guess` |
| `Refuse` | `Reject`, `Refuse Support` |
| `Accept` | `Approve`, `Accept Surrender` |
| `Use Skill: ${skill_name}` (existing template) | `Use Skill: Praise of Life` |

### Redundant instruction tails removed (buttons already show the options)

| New key | Retired key |
| --- | --- |
| `Choose a Believer type to predict draw #${draw_index}.` | `Choose a Believer to predict draw #${draw_index}, or pass.` |
| `Gate of Truth target selected: ${target_name} (${skill_name}).` | `Gate of Truth target selected: ${target_name} (${skill_name}). Click Confirm, or select another player.` |
| `Praise of Life: sacrifice 1 Believer to gain 1 extra action.` | `Use Praise of Life to sacrifice 1 Believer and gain 1 extra action, or end your turn.` |
| `Resolve the Praise of Life decision first.` | `Choose whether to use Praise of Life or end turn first.` |
| `Choose one Believer for this war.` (existing) | `Choose 1 Believer from hand, or choose 1 from graveyard (Zombie Army).` |
| `Action slots are used.` | `Action slots are used. You may still use Soul-Cutting Sword, or end your turn.` |
| `Your representative asks to stop Faith Debate.` | `Your representative asks to stop Faith Debate. Approve or reject.` |

### 2026-06-13 — AOE merged defense flow (new/changed keys)

| New key | Notes |
| --- | --- |
| `${you}: commit one Believer or play a defense card` | Replaces `${you} must choose one Believer for Martyrdom` and `${you} must choose one Believer for Conspiracy` (state descriptionmyturn, both AOE commit states) |
| `Choose one Believer to commit, or play your defense card.` | JS top instruction when the active representative holds the matching defense card |
| `${player_name} reveals ${card_name}: their Sect is defended.` | Resolution reveal of a concealed AOE defense |
| `You cannot defend against your own Sect's attack.` | Guard: attacker-sect members cannot defend their own AOE |
| `Defense cards cannot be played right now.` | Guard: Final Struggle shares the conspiracy commit state but allows no defense |

### 2026-06-13 — AOE sect-wide defense window (new keys)

| New key | Context |
| --- | --- |
| `Your Leader is choosing a representative. You may play your defense card now.` | Non-leader defense holder, assignment phase |
| `Assign a representative, or play your defense card.` | Leader who also holds the matching defense card |
| `Your representative is choosing a Believer. You may play your defense card instead, or wait.` | Non-rep defense holder, commit phase |

### 2026-06-13 — diagnostic split

| New key | Retired key |
| --- | --- |
| `This war round is not accepting Believers right now.` (rep slots empty / round transitioning) + `Only the assigned war representatives can commit a Believer this round.` (genuine non-rep) | `You are not part of this war` |

### Question-style prompts converted to statements

| New key | Retired key |
| --- | --- |
| `Zombie Army: you may use graveyard Believers for this Faith War.` | `Use Zombie Army for this Faith War?` |
| `Holy Rebirth: revive 3 Believers from the graveyard.` | `Holy Rebirth: revive 3 Believers from graveyard now?` |
| `Gate of Truth: copy Holy Rebirth to revive 3 Believers from the graveyard.` | `Gate of Truth: copy Holy Rebirth and revive 3 Believers from graveyard now?` |
| `Karma Reversed: invert the result of this confrontation.` | `Karma Reversed: invert this confrontation result order?` |
| `${requester_name} wants to stop Faith Debate.` | `${requester_name} wants to stop Faith Debate. Do you agree?` |
| `Refusing support: this player will seek surrender from another Sect Leader.` | `Refuse support? This player will seek surrender from another Sect Leader.` |

---

- Terminology note: `Prayer` should be translated consistently as `平信者`.
- Terminology note: `Karma Reversed` should be translated consistently as `六道輪迴`.
- Terminology note: `KABOOM!` should be translated consistently as `阿拉碰瓜` in Chinese, without the exclamation mark.
- Terminology note: `Kowtow To Me` should be translated consistently as `信仰勸說`.
- Terminology note: `Soul-Cutting Sword` should be translated consistently as `斷魂寶劍`.
- Terminology note: `Spread Rumors` should be translated consistently as `散布流言`.
- Terminology note: `Holy Rebirth` should be translated consistently as `聖光復活`.
- Terminology note: `Martyrdom` should be translated consistently as `煽動殉教`.
- Terminology note: `Witch Hunt` should be translated consistently as `獵殺異端`.
- Terminology note: `Zombie Army` should be translated consistently as `殭屍大軍`.
- Terminology note: for Gate of Truth copied effects, Chinese should prefer `複製的 OO 能力` instead of `複製的 OO 技能/牌`, because Gate of Truth copies the ability/effect rather than the card itself.
- Style note: in Chinese, use `發動` for Skill effects/skill use, and usually use `使用` for Action cards.
- Style note: skill-card `Timing:` labels should be translated as `發動時機：`.

Last updated: 2026-05-10

This file records English `clienttranslate()` / `_()` strings changed during the Traditional Chinese translation pass.
BGA uses the English source string as the translation key, so each "new" string below should be treated as a new key in the BGA translation system.

Note: generated extraction lists such as `misc/i18n_keys_all.txt` are not updated here. Re-run the extraction process later if needed.

## Chinese Terminology Notes

- `Sect Leader` should be translated consistently as `教主`.
- `Secret Alliance` should be translated consistently as `秘密同盟`.
- Use `牌` for card objects: `Action card` = `行動牌`, `Believer` = `信徒牌`, `Skill card` = `技能牌`.
- Use Chinese numerals for ordinary quantities in Chinese translation, unless the value is an ID, counter, placeholder, or other literal number.

## Changed Keys

| File | Context | Old English key | New English key | Suggested Traditional Chinese |
| --- | --- | --- | --- | --- |
| `modules/js/Game.js` | Target selection prompt for Info-Spy / Secret Alliance | `Choose a target player for ${card_name}, or cancel.` | `Target a player with ${card_name}, or cancel.` | `使用 ${card_name} 指定一名玩家，或取消。` |
| `modules/js/Game.js` | Target selection prompt for Breaking Faith | `Choose a target player in your Sect for ${card_name}, or cancel.` | `Target a player in your Sect with ${card_name}, or cancel.` | `使用 ${card_name} 指定你教團中的一名玩家，或取消。` |
| `modules/js/Game.js` | Target selection prompt for Faith War / Faith Debate / Witch Hunt / Spread Rumors | `Choose a target Sect for ${card_name}, or cancel.` | `Target a Sect with ${card_name}, or cancel.` | `使用 ${card_name} 指定一個教團，或取消。` |
| `modules/js/Game.js` | Soul-Cutting Sword selection instruction | `Soul-Cutting Sword: select 1 target player, then confirm.` | `Soul-Cutting Sword: target 1 player, then confirm.` | `斷魂劍：指定一名玩家，然後確認。` |
| `modules/js/Game.js` | KABOOM! selection instruction | `KABOOM!: select 1 Believer and 1 non-self target player, then confirm.` | `KABOOM!: select 1 Believer and target 1 other player, then confirm.` | `KABOOM!：選擇一張信徒牌並指定另一名玩家，然後確認。` |
| `modules/js/Game.js` | KABOOM! missing target error | `Select a target player for KABOOM!` | `Target a player with KABOOM!` | `請指定一名玩家作為 KABOOM! 的目標` |
| `modules/js/Game.js` | Soul-Cutting Sword missing target error | `Select a target player for Soul-Cutting Sword` | `Target a player with Soul-Cutting Sword` | `請指定一名玩家作為斷魂劍的目標` |
| `modules/js/Game.js` | Surrender target prompt now states only the player's actual choice | `Select a Sect Leader to ask for surrender acceptance.` | `Choose a Sect Leader to surrender to.` | `請選擇一名教主投誠。` |
| `modules/js/Game.js` | Info-Spy action tooltip | `View 1 target player's Action and Believer cards.` | `Target a player to view their Action and Believer cards.` | `指定一名玩家，查看其行動牌與信徒牌。` |
| `modules/js/Game.js` | Secret Alliance action tooltip | `Choose a player. Exchange 1 Action card from your hand with 1 Action card from that player.` | `Target a player. Exchange 1 Action card from your hand with 1 Action card from that player.` | `指定一名玩家。從你手牌中拿一張行動牌，與該玩家的一張行動牌交換。` |
| `modules/js/Game.js` | Breaking Faith action tooltip | `Same-Sect only. If used by a Leader: expel 1 Follower. If used by a Follower: become an independent Leader. If countered with Breaking Faith, snatch 1 Believer; otherwise, snatch half of target's Believers (rounded down).` | `Same-Sect only. If used by a Leader: expel 1 Follower. If used by a Follower: become an independent Leader. If countered with Breaking Faith, snatch 1 Believer; otherwise, snatch half of that player's Believers (rounded down).` | `僅限同教團使用。教主可逐出一名追隨者；追隨者可脫離從屬關係並獨立成為教主。若對方以恩斷義絕防禦，奪取一張信徒牌；否則奪取該玩家一半的信徒牌（無條件捨去）。` |
| `modules/js/Game.js` | Conspiracy action tooltip | `Send 1 of your Believers to confront 1 Believer from each other Sect. Snatch each Believer you defeat; ties and losses are not snatched.` | `Send 1 of your Believers to mentally confront 1 Believer from each other Sect. Snatch each Believer you defeat; ties and losses are not snatched.` | `派出一張你的信徒牌，與每個其他教團各一張信徒牌進行精神對抗。你的信徒牌不會被奪取；只有被你擊敗的對方信徒牌會被你奪取。` |
| `modules/js/Game.js` | Faith War action tooltip | `Sect vs Sect war until one side has no available Believers.` | `Target a Sect and engage in physical confrontation until all Believers on one side have participated.` | `選擇一個教團發起戰爭，與其進行物理對抗，直到其中一方所有信徒牌都已參與對抗為止。` |
| `modules/js/Game.js` | Breaking Faith section tooltip | `If defended with Breaking Faith: snatch 1 Believer. If not defended: snatch half of target's Believers (rounded down).` | `If defended with Breaking Faith: snatch 1 Believer. If not defended: snatch half of that player's Believers (rounded down).` | `若對方以恩斷義絕防禦，奪取一張信徒牌；否則奪取該玩家一半的信徒牌（無條件捨去）。` |
| `modules/js/Game.js` | Spread Rumors blocked-target info | `Spread Rumors cannot target sects with no Believers: ${sects}` | `Spread Rumors cannot target Sects with no Believers: ${sects}` | `散布流言不能指定沒有信徒牌的教團：${sects}` |
| `modules/js/Game.js` | Faith War / Faith Debate blocked-target info | `confrontation cannot target sects with no Believers: ${sects}` | `This confrontation cannot target Sects with no Believers: ${sects}` | `這場對抗不能指定沒有信徒牌的教團：${sects}` |
| `modules/js/Game.js` | Kowtow To Me no-valid-target prompt | `No valid target Sect for Kowtow To Me. You can cancel.` | `No valid Sect to target with Kowtow To Me. You can cancel.` | `沒有可用「向我叩拜」指定的教團。你可以取消。` |
| `modules/js/Game.js` | Zombie Army + Faith War target prompt | `Zombie Army is active. Choose a target Sect for Faith War.` | `Zombie Army is active. Target a Sect with Faith War.` | `殭屍大軍已發動。請指定一個教團，對其發動信仰戰爭。` |
| `modules/js/Game.js` | Kowtow To Me blocked-target info | `Kowtow To Me cannot target sects with too many Believers: ${sects}` | `Kowtow To Me cannot target Sects with too many Believers: ${sects}` | `向我叩拜不能指定信徒牌過多的教團：${sects}` |
| `modules/js/Game.js` | Spread Rumors no-valid-target error | `No target Sect currently has Believers for Spread Rumors.` | `No Sect you can target currently has Believers for Spread Rumors.` | `目前沒有可指定且擁有信徒牌的教團，無法使用散布流言。` |
| `modules/js/Game.js` | KABOOM! skill tooltip | `Sacrifice 1 Believer, target any player, and kill up to 3 of their Believers. After using this skill, you cannot perform Physical or Mental attacks for the rest of this turn.` | `Use only before performing any Physical or Mental attack this turn. Sacrifice 1 Believer, target another player, and kill 3 of their Believers, or all of them if they have fewer than 3. After using this skill, you cannot perform Physical or Mental attacks for the rest of this turn.` | `本回合尚未使用物理或精神攻擊時才能發動。犧牲一張信徒牌，指定另一名玩家，炸毀其三張信徒牌；若不足三張，則全部炸毀。此技能無法被防禦；使用後，本回合內不能再使用物理或精神攻擊。` |
| `modules/php/Game.php` | Kowtow To Me missing target error | `Select a target Sect member.` | `Target the Sect you want to absorb.` | `指定你想吸收的教團。` |
| `modules/php/Game.php` | KABOOM! backend missing target error | `Choose a target player for KABOOM!.` | `Target a player with KABOOM!` | `請指定一名玩家作為 KABOOM! 的目標` |
| `modules/php/Game.php` | Soul-Cutting Sword backend missing target error | `Choose a target player for Soul-Cutting Sword.` | `Target a player with Soul-Cutting Sword.` | `請指定一名玩家作為斷魂劍的目標。` |
| `modules/php/Game.php` | Copied Purple Hermit availability check | `Copied Purple Hermit requires a current Leader target.` | `Copied Purple Hermit can only be used after you join another Sect as a Follower.` | `要發動複製的紫氣東來，你需要先加入他人教團成為追隨者。` |
| `modules/php/Game.php` | Purple Hermit availability check | `Purple Hermit requires a current Leader target.` | `Purple Hermit can only be used after you join another Sect as a Follower.` | `要發動紫氣東來，你需要先加入他人教團成為追隨者。` |
| `modules/php/Game.php` | Copied Purple Hermit backend missing Leader error | `Copied Purple Hermit requires a valid current Leader.` | `Copied Purple Hermit can only be used after you join another Sect as a Follower.` | `你尚未加入他人教團，所以無法對教主發動複製的紫氣東來。` |
| `modules/php/Game.php` | Purple Hermit backend missing Leader error | `Purple Hermit requires a valid Leader target.` | `Purple Hermit can only be used after you join another Sect as a Follower.` | `你尚未加入他人教團，所以無法對教主發動紫氣東來。` |
| `modules/js/Game.js` | Zombie Army Believer commit missing selection error | `Please choose one graveyard Believer first (Zombie Army).` | `Please choose one Believer from hand or graveyard.` | `你必須選擇一張手牌或墓地中的信徒牌。` |
| `modules/js/Game.js` | The Prophet prediction response button | `Use Prophet Skill` | `Use The Prophet` | `使用宇宙大先知` |
| `modules/js/Game.js` | Gate of Truth skill tooltip usage text | `Uses: Once per turn. Each revealed skill type can be copied once per game.` | `Uses: Once per round. Each revealed skill type can be copied once per game.` | `使用方式：每輪可使用一次；每種已公開技能每場遊戲只能複製一次。` |
| `modules/js/Game.js` | Gate of Truth combat stack tooltip when copied Karma Reversed cancels reversal | `Karma Reversed effect has been canceled.` | `Karma Reversed's confrontation reversal has been canceled by Gate of Truth's copied effect.` | `六道輪迴的對抗反轉效果已被真理之門的複製效果取消。` |
| `modules/js/Game.js` | Kowtow To Me blocked-target info when Sects are too large to absorb | `Kowtow To Me cannot target Sects with too many Believers: ${sects}` | `Kowtow To Me cannot target Sects with more than half as many Believers as your Sect: ${sects}` | `${sects} 的信徒牌數超過你教團的一半，不能成為信仰勸說的對象。` |
| `modules/js/Game.js` | Kowtow To Me clicked invalid target error when target Sect is too large | `has too many Believers to be absorbed by Kowtow To Me.` | `has more than half as many Believers as your Sect and cannot be absorbed by Kowtow To Me.` | `的信徒牌數超過你教團的一半，不能成為信仰勸說的對象。` |
| `modules/php/Game.php` | Spread Rumors public notification when defended | `Spread Rumors is blocked by defense and ends immediately.` | `Spread Rumors is defended and has no effect.` | `散布流言已被防禦，效果無效。` |
| `modules/php/Game.php` | Spread Rumors public start log target wording | `${player_name} plays Spread Rumors against ${target_sect_name}.` | `${player_name} plays Spread Rumors targeting ${target_sect_name}.` | `${player_name} 對 ${target_sect_name} 使用散布流言。` |
| `modules/php/Game.php` | Faith War public end log when one side cannot continue | `Faith War ended. One side has no Believers left.` | `Faith War ended. One side has no Believers available to continue.` | `信仰戰爭結束，其中一方已沒有可繼續參與對抗的信徒牌。` |
| `modules/php/Game.php` | Faith War fallback end log when representative Believer submission is missing | `Faith War ended early because one representative did not submit a Believer.` | `Faith War could not continue because a representative Believer was missing.` | `信仰戰爭因代表信徒牌缺失而無法繼續。` |
| `modules/php/Game.php` | Faith Debate backend no-attacker-believers error | `Your Sect has no Believers for Faith Debate. Discard Action cards or end turn to continue.` | `Your Sect has no Believers available for Faith Debate.` | `你的教團沒有可參與信仰辯論的信徒牌。` |
| `modules/php/Game.php` | Faith War backend no-attacker-believers error | `Your Sect has no Believers for Faith War. Discard Action cards or end turn to continue.` | `Your Sect has no Believers available for Faith War.` | `你的教團沒有可參與信仰戰爭的信徒牌。` |

| `modules/php/Game.php` | Skill availability guard for unsupported/unusable skill types | `This skill is not implemented yet.` | `This skill cannot be used right now.` | `此技能目前無法使用。` |
| `modules/php/HOFMachineStates.inc.php` | Starting Skill state description shown to waiting/observing players | `${actplayer} must choose a starting Skill` | `Waiting for ${actplayer} to choose a starting Skill` | `等待 ${actplayer} 選擇起始技能牌` |
| `modules/js/Game.js` | Starting Skill draft subtitle for desktop and mobile tooltip access | `Hover on a card to read Skill details.` | `Hover or long-press a card to read Skill details.` | `將游標移到或長按技能牌，可查看技能詳情。` |
| `modules/php/Game.php`, `modules/php/HOFMachineStates.inc.php`, `modules/js/Game.js` | No-choice Surrender Phase fallback now auto-converts to Wanderer; removed redundant Impermanence confirmation prompt | `Becoming Wanderer will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?` | `(removed; Wanderer conversion resolves automatically when no surrender target remains; Impermanence failure is handled by notification)` | `成為游離者會使諸行無常失效，並公開此失效後重抽技能。` |
| `modules/js/Game.js` | Removed redundant Impermanence confirmation when choosing a surrender target during forced Surrender Phase | `Surrender will fail Impermanence of Life, reveal that failure, and redraw your skill. Continue?` | `(removed; surrender is forced at 0 Believers, and Impermanence failure is handled by notification when the surrender completes)` | `投降會使諸行無常失效，並公開此失效後重抽技能。是否繼續？` |

| `modules/php/Game.php` | Two-player final tie-break start now states the tie that causes Final War | `Believer deck is empty. ${player_a_name} and ${player_b_name} enter Final Struggle.` | `Believer deck is empty. ${player_a_name} and ${player_b_name} are tied and enter Final War.` | `信徒牌庫已空。由於 ${player_a_name} 和 ${player_b_name} 的信徒牌數量相同，雙方將進入最終戰爭。` |
| `modules/php/Game.php` | Sect-vs-Sect final tie-break start now states the tie that causes Final War | `Believer deck is empty. ${sect_a_name} and ${sect_b_name} enter Final Struggle.` | `Believer deck is empty. ${sect_a_name} and ${sect_b_name} are tied and enter Final War.` | `信徒牌庫已空。由於 ${sect_a_name} 和 ${sect_b_name} 的信徒牌數量相同，雙方將進入最終戰爭。` |
| `modules/php/Game.php` | Final War round log for two-contender final duel | `Final Struggle round ${round}: each contender selects one Believer.` | `Final War round ${round}: each contender selects one Believer.` | `最終戰爭第 ${round} 輪：每位對戰者各選擇一張信徒牌。` |
| `modules/php/Game.php` | Sect-vs-Sect Final War tie continuation log | `Final Struggle Sect War remains tied. Another round begins.` | `Final War remains tied. Another round begins.` | `最終戰爭仍為平手，將開始新一輪。` |
| `modules/php/Game.php` | Sect-vs-Sect Final War tie escalation log | `Final Struggle Sect War is tied. Leaders enter Infinite Final War.` | `Final War is tied. Leaders enter Infinite Final War.` | `最終戰爭平手，雙方教主進入無限最終戰爭。` |
| `modules/php/Game.php` | Sect-vs-Sect Final War end log | `Final Struggle Sect War ends.` | `Final War ends.` | `最終戰爭結束。` |
| `modules/php/Game.php` | TODO next code release: split the Sect-vs-Sect Final War end message into the normal depleted-Sect cause and the exceptional missing-representative/card cause | `Final Struggle Sect War ends early.` | `Final War ends early.` | `最終戰爭因一方無法繼續出戰而結束。` |
| `modules/php/Game.php` | Two-contender Final War end log | `Final Struggle ends.` | `Final War ends.` | `最終戰爭結束。` |
| `modules/php/Game.php` | Two-contender Final War early end log | `Final Struggle ends because one contender has no Believers left to play.` | `Final War ends because one contender has no Believers left to play.` | `最終戰爭結束，因為其中一位對戰者已沒有可派出的信徒牌。` |
| `modules/js/Game.js` | Sect-vs-Sect Final War start UI message | `Final Struggle begins: tied Sects enter final Faith War.` | `Final War begins: tied Sects fight a final Faith War.` | `最終戰爭開始：平手教團進行最後的信仰戰爭。` |
| `modules/js/Game.js` | Sect-vs-Sect Final War representative prompt | `Final Struggle (Sect War): each Sect Leader chooses a representative each round.` | `Final War: each Sect Leader chooses a representative each round.` | `最終戰爭：每輪由雙方教主各選擇一名代表。` |
| `modules/js/Game.js` | Two-contender Final War start UI message | `Final Struggle begins between tied contenders.` | `Final War begins between tied contenders.` | `平手對戰者進入最終戰爭。` |
| `modules/js/Game.js` | Two-contender Final War Believer prompt | `Final Struggle: contenders choose one Believer to duel.` | `Final War: contenders choose one Believer to duel.` | `最終戰爭：對戰者各選擇一張信徒牌進行對抗。` |
| `modules/js/Game.js` | Infinite War continuation prompt uses Final War terminology | `Infinite War: continue Final Struggle until one contender wins.` | `Infinite War: continue Final War until one contender wins.` | `無限戰爭：繼續最終戰爭，直到一方獲勝為止。` |
| `modules/js/Game.js` | Faith War board prefix for final-war rounds | `Final Struggle:` | `Final War:` | `最終戰爭：` |
| `modules/js/Game.js` | Faith War action label for final-war rounds | `Final Struggle` | `Final War` | `最終戰爭` |
| `modules/js/Game.js` | Final War continuation toast | `Final Struggle continues.` | `Final War continues.` | `最終戰爭繼續。` |

| `modules/php/Game.php` | Faith Debate stop request public log uses one requester variable | `${player_name} requests to stop Faith Debate. Waiting for ${leader_name} to decide.` | `${requester_name} requests to stop Faith Debate. Waiting for ${leader_name} to decide.` | `${requester_name} 請求停止信仰辯論，等待 ${leader_name} 決定。` |
| `modules/js/Game.js` | Faith Debate stop request frontend toast uses one requester variable | `${player_name} requests to stop Faith Debate; waiting for ${leader_name}.` | `${requester_name} requests to stop Faith Debate; waiting for ${leader_name}.` | `${requester_name} 請求停止信仰辯論，等待 ${leader_name}。` |
| `modules/php/Game.php`, `modules/js/Game.js` | Faith Debate stop approval log/toast uses requester variable instead of duplicated player variable | `${leader_name} approves ${player_name}'s request and stops Faith Debate.` | `${leader_name} approves ${requester_name}'s request and stops Faith Debate.` | `${leader_name} 同意 ${requester_name} 的請求，停止信仰辯論。` |
| `modules/php/Game.php` | Faith Debate stop rejection public log uses requester variable instead of duplicated player variable | `${leader_name} rejects ${player_name}'s request to stop Faith Debate.` | `${leader_name} rejects ${requester_name}'s request to stop Faith Debate.` | `${leader_name} 拒絕 ${requester_name} 停止信仰辯論的請求。` |
| `modules/js/Game.js` | Faith Debate stop rejection frontend toast now matches backend wording | `${leader_name} rejects stopping Faith Debate requested by ${requester_name}.` | `${leader_name} rejects ${requester_name}'s request to stop Faith Debate.` | `${leader_name} 拒絕 ${requester_name} 停止信仰辯論的請求。` |
| `modules/js/Game.js` | Zombie Army quick action button avoids repeating the Faith War condition already explained elsewhere | `Use Zombie Army in Faith War` | `Use Zombie Army` | `發動殭屍大軍` |
| `modules/php/HOFMachineStates.inc.php` | Karma Reversed reactive prompt removes redundant skip wording because a Skip button is already shown | `${you}: use Karma Reversed to reverse the confrontation result, or skip` | `${you}: use Karma Reversed to reverse the confrontation result` | `${you}：可發動六道輪迴反轉對抗結果` |
| `modules/php/HOFMachineStates.inc.php` | The Prophet reactive prompt removes redundant skip wording because a Skip button is already shown | `${you}: use The Prophet to predict the draw, or skip` | `${you}: use The Prophet to predict the draw` | `${you}：可發動宇宙大先知預測抽牌` |
| `modules/php/HOFMachineStates.inc.php` | Holy Rebirth reactive prompt removes redundant skip wording because a Skip button is already shown | `${you}: use Holy Rebirth to revive 3 Believers, or skip` | `${you}: use Holy Rebirth to revive 3 Believers` | `${you}：可發動聖光復活，復活三張信徒牌` |

| `modules/php/Game.php` | The Prophet start log uses full skill name | `Prophet prediction starts before draw continues.` | `The Prophet prediction starts before draw continues.` | `宇宙大先知預測中，抽牌將在預測結束後繼續。` |
| `modules/php/Game.php` | The Prophet responder guard uses full skill name | `You are not the Prophet responder.` | `You are not the responder for The Prophet.` | `目前不是你決定是否發動宇宙大先知的時機。` |
| `modules/php/Game.php` | The Prophet unavailable guard uses full skill name | `Prophet skill is not available.` | `The Prophet skill is not available.` | `宇宙大先知目前無法使用。` |
| `modules/php/Game.php` | Copied The Prophet availability guard uses full skill name | `Copied Prophet is not available right now.` | `Copied The Prophet is not available right now.` | `複製的宇宙大先知能力目前無法使用。` |
| `modules/php/Game.php` | Native The Prophet active-state guard uses full skill name | `Prophet is not active.` | `The Prophet is not active.` | `宇宙大先知目前未生效。` |
| `modules/php/Game.php` | Copied The Prophet active-state guard uses full skill name | `Copied Prophet is not active.` | `Copied The Prophet is not active.` | `複製的宇宙大先知能力目前未生效。` |
| `modules/php/Game.php` | The Prophet pass log uses full skill name | `${player_name} chooses not to predict with Prophet.` | `${player_name} chooses not to predict with The Prophet.` | `${player_name} 選擇不發動宇宙大先知預測。` |
| `modules/php/Game.php` | The Prophet guess log uses full skill name | `${player_name} predicts ${type_name} with Prophet for draw #${draw_index}.` | `${player_name} predicts ${type_name} with The Prophet for draw #${draw_index}.` | `${player_name} 發動宇宙大先知，預測第 ${draw_index} 張抽到 ${type_name}。` |
| `modules/js/Game.js` | The Prophet fallback display label uses full skill name | `Prophet` | `The Prophet` | `宇宙大先知` |
| `modules/js/Game.js` | The Prophet chained reveal prompt uses full skill name | `First Prophet reveal resolved. Waiting for next prediction.` | `The Prophet's first reveal resolved. Waiting for next prediction.` | `宇宙大先知第一次揭示已完成，等待下一次預測。` |
| `modules/php/Game.php` | Ascend with Me manual-use guard focuses on why it cannot be clicked, without repeating hand-limit rules | `Ascend with Me is passive and triggers when Followers draw Action cards. Hand limit is increased by Follower count.` | `Ascend with Me is not an active skill and triggers when your Followers draw Action cards.` | `雞犬升天不是主動技能，會在你的追隨者抽取行動牌時觸發。` |
| `modules/js/Game.js` | Ascend with Me timing now matches the rulebook trigger instead of a broad passive condition | `Timing: Passive while you have one or more Followers.` | `Timing: When your Follower draws Action cards.` | `發動時機：當你的追隨者抽取行動牌時。` |
| `modules/js/Game.js` | Ascend with Me usage tooltip now describes its trigger instead of sharing the generic passive key | `Uses: Passive.` | `Uses: Triggered when your Followers draw Action cards.` | `使用方式：當你的追隨者抽取行動牌時觸發。` |
| `modules/js/Game.js` | Impermanence of Life usage tooltip now describes its game-end check instead of sharing the generic passive key | `Uses: Passive.` | `Uses: Checked at game end.` | `使用方式：遊戲結束時判定。` |
| `modules/php/Game.php` | Conspiracy start log now describes sect-wide defense instead of implying every other player defends individually | `${player_name} spreads a Conspiracy! Everyone else must defend.` | `${player_name} spreads a Conspiracy! Other Sects must defend.` | `${player_name} 使用陰謀論！其他教團必須防禦。` |
| `modules/php/Game.php`, `modules/js/Game.js` | Breaking Faith defense mismatch message now describes the special betrayal instead of calling it a generic attack | `This is a Breaking Faith attack. You must use Breaking Faith to defend.` | `This is a Breaking Faith betrayal. You must use Breaking Faith to defend.` | `這是恩斷義絕的背叛。你必須使用恩斷義絕防禦。` |
| `modules/js/Game.js` | Graveyard concealed state now explains that Zombie Army can use those cards without implying they were all committed | `Believers have been sent to war.` | `Graveyard Believers are available for this Faith War.` | `墓地中的信徒牌可用於本次信仰戰爭。` |
| `modules/js/Game.js` | Surrender/support give-Believer cancel action now describes refusing support instead of cancelling surrender | `Cancel Surrender/Support` | `Refuse Support` | `拒絕支援` |
| `modules/js/Game.js` | Surrender/support give-Believer confirmation now explains the player will ask another Leader | `Cancel this surrender/support? The pending Follower will not receive a Believer and surrender flow will continue.` | `Refuse support? This player will seek surrender from another Sect Leader.` | `要拒絕支援嗎？該玩家將向其他教主請求投降。` |
| `modules/js/Game.js` | Confirmation dialog button for refusing support now matches the action wording | `Confirm Cancel` | `Refuse Support` | `拒絕支援` |
| `modules/js/Game.js` | AoE same-Sect defense info simplified to avoid unnecessary automatic-completion wording | `Your Sect is already defended. Your defense step is completed automatically.` | `Your Sect has already defended.` | `你的教團已防禦。` |
| `modules/js/Game.js` | AoE same-Sect waiting instruction simplified to use completed defense action wording | `Your Sect is already defended. Waiting for other Sects to act.` | `Your Sect has already defended. Waiting for other Sects to act.` | `你的教團已防禦，等待其他教團行動。` |
| `modules/php/Game.php` | Defense decision public prompt simplified; defense type/defender names are unnecessary for the waiting message | `Waiting for Sect defense decisions.` | `Waiting for players to decide whether to defend.` | `等待玩家決定是否防禦。` |
| `modules/php/Game.php` | Defense decision public prompt simplified; defense type/defender names are unnecessary for the waiting message | `Waiting for defenders to decide whether to defend.` | `Waiting for players to decide whether to defend.` | `等待玩家決定是否防禦。` |
| `modules/js/Game.js` | Defense decision UI waiting instruction simplified; defense type is already clear from context | `Waiting for ${defense_label} defense decisions.` | `Waiting for players to decide whether to defend.` | `等待玩家決定是否防禦。` |
| `modules/js/Game.js` | Defense decision toast simplified; defender names and defense type add noise | `Waiting for Sect ${defense_label} defense decisions.` | `Waiting for players to decide whether to defend.` | `等待玩家決定是否防禦。` |
| `modules/js/Game.js` | Defense decision toast simplified; defender names and defense type add noise | `Waiting for ${defense_label} defense decision: ${defender_names}` | `Waiting for players to decide whether to defend.` | `等待玩家決定是否防禦。` |
| `modules/php/Game.php` | Believer confrontation result no longer calls the targeted side's win a successful defense | `${winner_name} defends successfully! ${loser_name}'s Believer dies.` | `${winner_name} wins! ${loser_name}'s Believer dies.` | `${winner_name} 獲勝！${loser_name} 的信徒牌死亡。` |
| `modules/php/HOFMachineStates.inc.php` | Defense decision active-player state no longer treats defense type as an attack kind, avoiding awkward Breaking Faith wording | `${you} must decide whether to defend against this ${defense_attack_kind} attack` | `${you} must decide whether to defend` | `${you} 必須決定是否防禦` |
| `modules/js/Game.js` | Three-use skill counter tooltip simplified by removing redundant total wording | `Count: total ${uses}/3` | `Count: ${uses}/3` | `次數：${uses}/3` |
| `modules/js/Game.js` | Protection skill counter tooltip simplified and avoids awkward active-protection wording | `Count: total ${uses}/3 · active protection ${status}` | `Count: ${uses}/3 · effect ${status}` | `次數：${uses}/3・效果 ${status}` |
| `modules/php/Game.php` | Copied Zombie Army availability guard no longer calls the skill passive; it is actively chosen during Faith War declaration | `Copied Zombie Army is passive and can be chosen when you declare Faith War.` | `Copied Zombie Army can only be chosen when you declare Faith War.` | `複製的殭屍大軍能力只能在你宣告信仰戰爭時選擇發動。` |

| `modules/js/Game.js`, `modules/php/Game.php` | Gate of Truth now copies and uses Zombie Army atomically with Faith War instead of requiring an impossible prior declaration | `Copied Zombie Army can only be chosen when you declare Faith War.` | `Copied Zombie Army must be used together with Faith War.` | `複製的殭屍大軍必須搭配信仰戰爭發動。` |
| `modules/js/Game.js` | Kowtow blocked-target error now uses one complete translatable sentence instead of concatenating the Sect name with a fragment | `has more than half as many Believers as your Sect and cannot be absorbed by Kowtow To Me.` | `${sect_name} has more than half as many Believers as your Sect and cannot be absorbed by Kowtow To Me.` | `${sect_name} 所持有的信徒牌數量超過你的教團的一半，因此無法使用信仰勸說將其吸收。` |

## Stale BGA Keys To Watch

These old English keys are no longer present in the current source code (or were already replaced locally), but may still appear in the BGA translation interface or generated extraction files. If they appear, translate them using the suggested Chinese below and treat them as historical/stale keys rather than current source strings.

| Old / stale English key | Current replacement key | Suggested Traditional Chinese | Note |
| --- | --- | --- | --- |
| `If defended with Breaking Faith: snatch 1 Believer. If not defended: snatch half of target's Believers (rounded down).` | `If defended with Breaking Faith: snatch 1 Believer. If not defended: snatch half of that player's Believers (rounded down).` | `若對方以恩斷義絕防禦，奪取一張信徒牌；若未被防禦，奪取該玩家一半的信徒牌（無條件捨去）。` | Breaking Faith section tooltip old `target's` wording. |
| `Same-Sect only. If used by a Leader: expel 1 Follower. If used by a Follower: become an independent Leader. If countered with Breaking Faith, snatch 1 Believer; otherwise, snatch half of target's Believers (rounded down).` | `Same-Sect only. If used by a Leader: expel 1 Follower. If used by a Follower: become an independent Leader. If countered with Breaking Faith, snatch 1 Believer; otherwise, snatch half of that player's Believers (rounded down).` | `僅限同教團使用。教主可逐出一名追隨者；追隨者可脫離從屬關係並獨立成為教主。若對方以恩斷義絕防禦，奪取一張信徒牌；否則奪取該玩家一半的信徒牌（無條件捨去）。` | Breaking Faith full tooltip old `target's` wording. |
| `Soul-Cutting Sword: select 1 target player, then confirm.` | `Soul-Cutting Sword: target 1 player, then confirm.` | `斷魂寶劍：請選擇一名要跳過回合的玩家。` | Old prompt still seen in extraction/project notes. |
| `KABOOM!: select 1 Believer and 1 non-self target player, then confirm.` | `KABOOM!: select 1 Believer and target 1 other player, then confirm.` | `阿拉碰瓜：請選擇一張要犧牲的信徒牌，並指定一名玩家作為爆炸對象。` | Old prompt still present in generated extraction file. |
| `Choose a target player for KABOOM!.` | `Target a player with KABOOM!` | `你必須指定一名玩家作為阿拉碰瓜的爆炸對象。` | Old backend missing-target wording. |
| `Spread Rumors cannot target sects with no Believers: ${sects}` | `Spread Rumors cannot target Sects with no Believers: ${sects}` | `散布流言不能指定沒有信徒牌的教團：${sects}` | Old lowercase `sects` key still present in generated extraction file. |
| `No target Sect currently has Believers for Spread Rumors.` | `No Sect you can target currently has Believers for Spread Rumors.` | `目前沒有可指定且擁有信徒牌的教團，無法使用散布流言。` | Old no-valid-target key still present in generated extraction file. |
| `Spread Rumors is blocked by defense and ends immediately.` | `Spread Rumors is defended and has no effect.` | `散布流言已被防禦，效果無效。` | Old defended public-notification key still present in generated extraction file. |
| `${player_name} plays Spread Rumors against ${target_sect_name}.` | `${player_name} plays Spread Rumors targeting ${target_sect_name}.` | `${player_name} 對 ${target_sect_name} 使用散布流言。` | Old `against` wording is no longer in current source or generated extraction, but may remain in BGA if previously extracted. |
| `Zombie Army is active. Choose a target Sect for Faith War.` | `Zombie Army is active. Target a Sect with Faith War.` | `殭屍大軍已發動。請指定一個教團，對其發動信仰戰爭。` | Current English is ambiguous; next code release should revise it to `Zombie Army is active. Choose a Sect to target with Faith War.` |

| `${player_name} requests to stop Faith Debate. Waiting for ${leader_name} to decide.` | `${requester_name} requests to stop Faith Debate. Waiting for ${leader_name} to decide.` | `${player_name} 請求停止信仰辯論，等待 ${leader_name} 決定。` | Old Faith Debate stop-request key before requester variable normalization. |
| `${player_name} requests to stop Faith Debate; waiting for ${leader_name}.` | `${requester_name} requests to stop Faith Debate; waiting for ${leader_name}.` | `${player_name} 請求停止信仰辯論，等待 ${leader_name}。` | Old frontend Faith Debate stop-request key before requester variable normalization. |
| `${leader_name} approves ${player_name}'s request and stops Faith Debate.` | `${leader_name} approves ${requester_name}'s request and stops Faith Debate.` | `${leader_name} 同意 ${player_name} 的請求，停止信仰辯論。` | Old Faith Debate stop-approval key before requester variable normalization. |
| `${leader_name} rejects ${player_name}'s request to stop Faith Debate.` | `${leader_name} rejects ${requester_name}'s request to stop Faith Debate.` | `${leader_name} 拒絕 ${player_name} 停止信仰辯論的請求。` | Old Faith Debate stop-rejection key before requester variable normalization. |

## Follow-up Design Notes

- Some old English keys may still appear in the BGA translation interface even after local code has moved to a new key. Example: the old Breaking Faith section key with `target's Believers` is no longer present in current source code except in this change log, but may still appear as a stale BGA translation key. Use the corresponding "Suggested Traditional Chinese" entry here when that happens.
- Future wording cleanup: several top-instruction strings say `then confirm`, `Click Confirm`, or `Confirm to use` even though the UI already shows a confirm/use button immediately afterward. Do not change these during the current translation pass, but consider removing the redundant confirm wording in a future version. Candidate current keys:
  - Suggested UI principle for that cleanup: top instructions should describe what the player needs to choose/do, while the action button should describe the submit action (`Confirm Skill`, `Confirm Believer`, `Confirm Discard`, `Use Skill`, etc.). Avoid repeating "then confirm" inside the instruction when a confirm button is already visible.
  - `Soul-Cutting Sword: target 1 player, then confirm.` — selection prompt; button follows. Suggested future Chinese: `斷魂寶劍：請選擇一名要跳過回合的玩家。`
  - `KABOOM!: select 1 Believer and target 1 other player, then confirm.` — selection prompt; button follows. Suggested future Chinese: `阿拉碰瓜：請選擇一張要犧牲的信徒牌，並指定另一名玩家。`
  - `Praise of Life: select 1 Believer to sacrifice, then confirm.` — selection prompt; button follows. Suggested future Chinese: `生命禮讚：請選擇一張要犧牲的信徒牌。`
  - `World Peace: select 1 Believer to sacrifice, then confirm.` — selection prompt; button follows. Suggested future Chinese: `世界和平：請選擇一張要犧牲的信徒牌。`
  - `Eternal Truth: select 1 Believer to sacrifice, then confirm.` — selection prompt; button follows. Suggested future Chinese: `永恆真理：請選擇一張要犧牲的信徒牌。`
  - `Gate of Truth: choose one player with a revealed skill to copy, then confirm.` — selection prompt; button follows. Suggested future Chinese: `真理之門：請選擇一名已公開技能的玩家進行複製。`
  - `Gate of Truth target selected: ${target_name} (${skill_name}). Click Confirm, or select another player.` — target-selected prompt; confirm button follows. Suggested future Chinese: `真理之門已選擇：${target_name}（${skill_name}）。你也可以改選其他玩家。`
  - `Purple Hermit: activate to snatch half of your Leader's Believers now. Confirm to use.` — use confirmation prompt; button follows. Suggested future Chinese: `紫氣東來：發動後將立即奪取你所在教團教主一半的信徒牌。`
  - `Headstronger: expel all your Followers and snatch half of each Follower's Believers. Confirm to use.` — use confirmation prompt; button follows. Suggested future Chinese: `剛愎自用：逐出所有追隨者，並奪取每名追隨者一半的信徒牌。`
  - `Confirm to use this skill.` — generic fallback before confirm button. Suggested future Chinese: `確認使用此技能。`
  - `Select exactly 1 Believer to give your new Follower, then confirm.` — give-Believer flow; confirm button follows. Suggested future Chinese: `請給予你的追隨者一張信徒牌作支援。`
  - `Choose 1 Believer from hand, or choose 1 from graveyard (Zombie Army), then click Confirm.` — Zombie Army/Faith War commit flow; confirm button follows. Suggested future Chinese: `請從手牌或墓地選擇一張信徒牌。`
  - `You have been assigned to this war. Choose one Believer and click Confirm.` — representative commit flow; confirm button follows. Suggested future Chinese: `你已被指派參與這場戰爭，請選擇一張信徒牌。`
  - `You have been assigned to this war by ${leader_name}. Choose one Believer and click Confirm.` — representative commit flow; confirm button follows. Suggested future Chinese: `${leader_name} 已指派你參與這場戰爭，請選擇一張信徒牌。`
  - `Martyrdom: choose one Believer and click Confirm.` — AOE commit flow; confirm button follows. Suggested future Chinese: `殉道：請選擇一張信徒牌。`
  - `Conspiracy: choose one Believer and click Confirm.` — AOE commit flow; confirm button follows. Suggested future Chinese: `陰謀論：請選擇一張信徒牌。`
  - `Final Struggle (Conspiracy): choose one Believer and click Confirm.` — final struggle commit flow; confirm button follows. Suggested future Chinese: `最終鬥爭（陰謀論）：請選擇一張信徒牌。`
  - `You were assigned by your Leader to Martyrdom. Choose one Believer and click Confirm.` — AOE assigned commit flow; confirm button follows. Suggested future Chinese: `你的教主已指派你參與殉道，請選擇一張信徒牌。`
  - `You were assigned by your Leader to Conspiracy. Choose one Believer and click Confirm.` — AOE assigned commit flow; confirm button follows. Suggested future Chinese: `你的教主已指派你參與陰謀論，請選擇一張信徒牌。`
  - `Discard mode: select one or more Action cards, then confirm discard.` — discard mode; discard/confirm button follows. Suggested future Chinese: `棄牌模式：請選擇一張或多張行動牌。`
- Future wording cleanup: prompts that include `or cancel`, `or confirm`, or `Click Confirm, or ...` should generally let the actual Cancel/Confirm buttons carry those choices instead of repeating them in the instruction text.
  - `Choose a Believer for Witch Hunt, or cancel.` — Witch Hunt Believer-type selection prompt; should clarify that the player chooses a Believer type, not a Believer card. Suggested future English: `Choose a Believer type for Witch Hunt.` Suggested future Chinese: `請選擇獵殺信徒類型。`
  - `Soul-Cutting Sword: selected target ${target_name}. Click Confirm, or select another player.` — Soul-Cutting Sword target-selected prompt; confirm button follows. Suggested future English: `Soul-Cutting Sword: selected target ${target_name}.` Suggested future Chinese: `斷魂寶劍：已選擇 ${target_name}。`
- Future wording cleanup: some prompts say `or skip` / `or pass` even though the UI already has a Skip/Pass button. Do not change these during the current translation pass; in a future UI wording pass, keep the instruction focused on the available action and let the button carry the skip/pass choice.
  - Suggested future UI pattern: render action choices as actual inline/action buttons instead of plain repeated text. Example Chinese layout: `你可以 [發動聖光復活] 以復活三張信徒牌，或 [跳過]。` where bracketed phrases are buttons. This may make reactive prompts clearer and reduce duplicated wording between instructions and action buttons.
  - `${you}: use Karma Reversed to reverse the confrontation result, or skip` — `descriptionmyturn`; UI has a `Skip` button. Suggested future Chinese: `${you}可以發動六道輪迴以反轉本次對抗結果。`
  - `${you}: use The Prophet to predict the draw, or skip` — `descriptionmyturn`; UI has `Use The Prophet` and `Skip This Time` buttons. Suggested future Chinese: `${you}可以發動宇宙大先知預測抽牌。`
  - `${you}: use Holy Rebirth to revive 3 Believers, or skip` — `descriptionmyturn`; UI has use/copy and `Skip` buttons. Suggested future Chinese: `${you}可以發動聖光復活以復活三張信徒牌。`
  - `${you} must choose a Believer type to predict, or pass` — `descriptionmyturn`; UI has a `Do Not Guess` button. Suggested future Chinese: `${you}必須選擇一種要預測的信徒牌類型。`
  - `Choose a Believer to predict draw #${draw_index}, or pass.` — top instruction; UI has a `Do Not Guess` button. Suggested future Chinese: `請選擇一種要預測的信徒牌類型（第 ${draw_index} 次抽牌）。`
- Gate of Truth currently locks after one copy/use until that player's next turn starts (`gate_truth_turn_used_mask` plus copied-skill context reset). This matches the temporary `Uses: Once per round...` tooltip wording, but the original design may not intend a per-round lock. Future balance/rules pass may change Gate of Truth to let the copied skill's own timing and limits determine the copy window, while still keeping "each revealed skill type can be copied once per game."
- Do not change this Gate of Truth behavior during the translation pass. A future version should handle it as a code-and-test change: adjust backend lock/context lifetime, frontend usage text/prompts, and regression tests for active copied skills, one-shot copied skills, and reactive copied skills.
- Future Ascend with Me behavior cleanup: current code auto-reveals/triggers `Ascend with Me` when a Follower draws Action cards, and applies the leader draw bonus without asking. Design intent is that skills should ask the skill owner whether to use them when their timing condition occurs, except Impermanence of Life. In a future code pass, change Ascend with Me so a Leader with one or more Followers is prompted when their Follower draws Action cards; only if the Leader chooses to use it should the skill reveal/trigger and draw matching Action cards. Update timing/availability text and add regression tests for native Ascend with Me and Gate of Truth copied Ascend with Me.
- Future wording cleanup: `[confrontation snapshot] ...` public history keys are functional but read like debug/history labels. Consider replacing the bracketed prefix with a more player-facing wording such as `Confrontation summary:` or removing it if the BGA log context is already clear. Current affected keys:
  - `[confrontation snapshot] Faith Debate: ${attacker_name} vs ${defender_name}, ${round} round(s). Use the war panel button View all rounds in this debate to review details.`
  - `[confrontation snapshot] Conspiracy by ${player_name}: snatched ${stolen_n}, defender wins ${defender_n}, draws ${draw_n}.`
  - `[confrontation snapshot] Witch Hunt by ${player_name}: ${target_sect_name}, type ${type}, eliminated ${n}.`
  - `[confrontation snapshot] Martyrdom by ${player_name}: dead ${dead_n}, survivors ${survivor_n}.`
- Future log consistency cleanup: combat/history log style is currently inconsistent. Faith War uses a `combatSnapshotHistory` entry without the `[confrontation snapshot]` prefix (`${attacker_sect_name} (...) VS ${defender_sect_name} (...) Faith War ended.`), while Faith Debate / Conspiracy / Witch Hunt / Martyrdom still use bracketed snapshot keys. Spread Rumors currently has no `combatSnapshotHistory` entry at all; it only has start, per-victim snatch, total summary, and frontend summary messages. In a future code pass, decide whether all confrontation/action-resolution history logs should share one naming/prefix style and whether Spread Rumors should get a matching history summary.
- Future The Prophet log cleanup: `prophetPredictionResolved` already carries backend-translated result logs (`${prophet_name} predicts correctly...`, `${prophet_name} predicts wrong...`, `${prophet_name} skips prediction.`, and the hidden/summary fallback). The frontend currently adds separate `showMessage()` strings for the same result (`${prophet_name} predicted correctly...`, `${prophet_name} predicted wrong...`, `${prophet_name} skipped prediction.`, `${drawer_name} draws Believers.`), creating extra BGA translation keys with nearly identical meaning. In a future code pass, either remove these duplicate frontend result toasts and rely on the backend notification log, or make the frontend reuse one canonical message/key from the notification payload so only one translation key exists per result.
- Future Conspiracy log cleanup: `Conspiracy by ${player_name} ends.` is the backend public log for `conspiracyResolved`, while `Conspiracy by ${player_name} ends` is a frontend `showMessage()` summary for the same notification. These differ only by punctuation and create duplicate BGA keys. In a future code pass, prefer one canonical key/message source.
- Future defense-log cleanup: `A defender chooses not to defend` is currently broadcast publicly for AoE defense passes (`Martyrdom` / `Conspiracy`). This public log is not necessary because passing defense is not meaningful public information beyond the defense phase continuing/resolving, and it can imply a visible choice that should not matter. In a future code pass, remove or suppress this public notification and let the defense flow continue without a separate public skip log.
- Future AoE defense-card secrecy cleanup: `A defender commits a facedown card` is currently broadcast publicly when a player commits an AoE defense card for `Martyrdom` / `Conspiracy`. If AoE defense should stay unknown until reveal/resolution, this notification leaks that someone defended even though the card remains facedown. In a future code pass, remove or suppress this public notification and rely on the reveal/resolution phase to show whether defense happened.
- Future protection-defense wording cleanup: protection skill auto-defense logs currently say `${player_name} is protected from ${attack_kind} attacks. Their Sect auto-defends.` / `${player_name} is protected; this Sect auto-defends.` This should be revised to name the relevant skill effect (`World Peace` for Physical, `Eternal Truth` for Mental) and say that this attack type has no effect, rather than framing it as "auto-defends." This likely needs payload/context changes so the frontend/backend can display the skill name consistently.
- Witch Hunt result-log cleanup: current key `Confrontation summary: Witch Hunt by ${player_name}, ${target_sect_name}, type ${type}, eliminated ${n}.` incorrectly labels Witch Hunt as a confrontation and is also an ambiguous comma-separated snapshot. Next code release should revise it to `${player_name} uses Witch Hunt against ${target_sect_name}, causing that Sect to lose ${n} ${type} Believers.` Current Chinese: `${player_name} 對 ${target_sect_name} 使用獵殺異端，使其失去 ${n} 張 ${type} 信徒牌。`
- Copied Prophet validation cleanup: `Copied The Prophet is not active.` is a defensive error raised only when a Gate of Truth responder submits a prediction after the copied ability is no longer usable. Next code release should reuse the existing canonical key `Copied The Prophet is not available right now.` Current Chinese: `真理之門複製的宇宙大先知能力目前無法使用。`
- Assigned-representative validation cleanup: current key `Only the assigned war representatives can commit a Believer this round.` is only used by the Faith War commit endpoint, but the restriction is suitable for all representative-based confrontations. Next code release should generalize and reuse `Only an assigned representative can commit a Believer.` Suggested Chinese: `只有被指派的代表可以派出信徒牌。`
- Skill-counter label cleanup: `Count: current Action hand limit ${hand_limit}` is not a usage count. Next code release should revise it to `Current Action hand limit: ${hand_limit}`. Current Chinese: `目前行動牌手牌上限：${hand_limit}`.
- Surrender Phase status cleanup: numeric `0 Believers` and `Choose a Sect Leader for surrender` read like internal state rather than player-facing English. Next code release should revise `${actplayer} has 0 Believers and is in the Surrender Phase` to `${actplayer} has no Believers and enters the Surrender Phase`, and `${you} have 0 Believers. Choose a Sect Leader for surrender` to `${you} have no Believers. Choose a Sect Leader to surrender to`. Current Chinese: `${actplayer} 已沒有信徒牌，進入投誠階段` / `${you} 沒有信徒牌了。請選擇一名教主投誠`.
- End-summary state cleanup: `${you} may continue to final BGA scoring` exposes technical BGA flow and uses ambiguous `may`. Next code release should reuse the existing player-facing key `Review the game-end summary.` Current Chinese for the extracted old key: `${you} 可以確認遊戲結算內容`.
- Defended-action result cleanup: `Attack is blocked by defense and ends immediately.`, `Faith War is blocked by defense and ends immediately.`, `Faith Debate is blocked by defense and ends immediately.`, `Witch Hunt is blocked by defense and ends immediately.`, and `Spread Rumors is defended and has no effect.` repeat a result already shown by the defense round. Next code release should consolidate them into `${action_name} is defended.` with the translated action name supplied as an argument. Current Chinese pattern: `${action_name} 已被防禦。`
- Follower defense-window prompt cleanup: `Your Leader is choosing a representative. You may play your defense card now.` omits the valid option of waiting for the Leader's assignment and can sound like a request to defend immediately. Next code release should revise it to `Your Leader is choosing a representative. You may play a defense card or wait for the assignment.` Current Chinese: `你的教主正在選擇對抗代表。你可以打出防禦牌，或等待指派結果。`
- Faith Debate stop-rejection cleanup: `Your Leader refuses to stop Faith Debate. You must continue this round.` and `Your Leader rejects stopping Faith Debate. You must continue this round.` are duplicate private/frontend messages and should share `Your Leader rejected your request. You must continue the confrontation.` The retry guard `Your Leader already refused to stop this round. Commit a Believer to continue.` should become `Your Leader already rejected your request. Commit a Believer to continue.` Current Chinese: `你的教主拒絕了你的請求。你必須繼續對抗。` / `你的教主拒絕了你的請求。請派出一張信徒牌繼續對抗。`
- Kowtow target prompt cleanup: `No valid Sect to target with Kowtow To Me. You can cancel.` uses internal validation language and repeats the visible Cancel button. Next code release should revise it to `No Sect can be targeted with Kowtow To Me.` Current Chinese: `目前沒有可以對其使用信仰勸說的教團。`
- Purple Hermit card-face cleanup: `Take half of your Leader's believers. Next turn, take half again and go independent. If the Leader then plays "Breaking Faith" on you, it snatches nothing and you go independent immediately.` does not identify whose next turn triggers the second steal, and `then` does not clearly delimit the Breaking Faith window. Next code release should revise it to `When activated, immediately snatch half of your Leader's Believers. At the start of your next turn, snatch half of your Leader's Believers again and become independent. If your Leader plays Breaking Faith on you before you become independent, they snatch no Believers and you become independent immediately.` Current Chinese: `發動時，立即奪取教主一半的信徒牌。你的下個回合開始時，再奪取教主當時一半的信徒牌，並脫離教團獨立。若教主在你獨立前對你使用恩斷義絕，教主不會奪取你的任何信徒牌，而你會立即脫離教團獨立。`
- Spread Rumors result-log cleanup: `Confrontation summary: Spread Rumors by ${player_name}, snatched ${stolen_total} from ${target_sect_name}.` exposes an internal summary label and omits the unit for `${stolen_total}`. Next code release should revise it to `${player_name} uses Spread Rumors against ${target_sect_name} and snatches ${stolen_total} Believers.` Current Chinese: `${player_name} 使用散布流言，從 ${target_sect_name} 奪取了 ${stolen_total} 張信徒牌。`
- Witch Hunt zero-result cleanup: `${target_name} has no ${believer_type} Believers — Witch Hunt catches none (0).` incorrectly describes elimination as catching and exposes a redundant numeric zero. Next code release should revise it to `${target_name} has no ${believer_type} Believers, so Witch Hunt has no effect.` Current Chinese: `${target_name} 沒有 ${believer_type} 信徒牌，因此獵殺異端未產生效果。`
- BGA metadata description: `Hegemony of Faith is a card and party game for 4-8 players, every player's main purpose in the game is to find a way to collect the most believer cards and become the only winner.` is extracted by BGA but is not present in the current repository or its Git history, so it was manually added to the translation mapping. Current Chinese: `《信仰霸權》是一款適合四至八名玩家的卡牌派對遊戲。每位玩家的主要目標都是設法收集最多的信徒牌，成為唯一的勝者。` If the BGA metadata can be edited later, prefer `Hegemony of Faith is a card-based party game for 4-8 players. Each player seeks to collect the most Believer cards and become the sole winner.`
- Conspiracy start-log cleanup: `${player_name} spreads a Conspiracy` uses an unnatural verb for launching the action, while `${player_name} spreads a Conspiracy! Other Sects must defend.` incorrectly says every other Sect must defend and omits the confrontation option. Next code release should revise them to `${player_name} launches Conspiracy` and `${player_name} launches Conspiracy. Other Sects must defend or confront it.` Current Chinese: `${player_name} 發起陰謀論` / `${player_name} 發起陰謀論。其他教團必須選擇防禦或進行對抗。`
- Breaking Faith card-face cleanup: the original numbering makes Leader and Follower look like two selectable effects, while the snatch is actually a shared second step. Keep the replacement compact enough for the card overlay. Next code release should revise the full key to `① Leader: expel a Follower; Follower: betray your Leader and become independent.${br}② Snatch half the other player's Believers (round down); only 1 if countered by Breaking Faith.${note}Same Sect only.${/note}`. Current old-key Chinese preserves both required `${br}` placeholders: `① 教主：逐出一名追隨者；追隨者：背叛教主，獨立成為教主。${br}② 奪取對方半數信徒牌，小數點後無條件捨去。${br}若被恩斷義絕反制，則僅奪一張。${note}限同教團。${/note}`
- Kowtow/Impermanence confirmation cleanup: `Recruiting followers with Kowtow To Me will fail Impermanence of Life, reveal that failure, and redraw your skill.` incorrectly says the failure itself is revealed and omits discarding the failed Skill. Next code release should revise it to `Recruiting Followers with Kowtow To Me causes Impermanence of Life to fail. Reveal and discard it, then draw a new hidden Skill card.` Current Chinese: `使用信仰勸說招募追隨者會使諸行無常失敗。失敗後，你將翻開並棄置諸行無常，再抽取一張新的隱藏技能牌。`
- Gate of Truth copied Purple Hermit correction (rules-impacting): `Gate of Truth copied Purple Hermit: snatch half of the copied-skill owner's Believers.` names the wrong target and does not explain that Purple Hermit's delayed effect is excluded. The implementation correctly snatches half of the Gate holder's current Leader's Believers (`player_leader_id`) immediately, then clears the copied-skill context without scheduling Purple Hermit's next-turn split. Next code release must revise the key to `Gate of Truth copied Purple Hermit: immediately snatch half of your Leader's Believers. The next-turn effect to snatch half again and become independent is not copied.` Current old-key Chinese: `真理之門複製紫氣東來：立即奪取你的教主一半的信徒牌，但不會觸發下回合再次奪取信徒牌並獨立的效果。`
- Holy Rebirth ownership clarification: `${you}: use Holy Rebirth to revive 3 Believers` does not state that the revived cards must be the acting player's own fallen Believers. The implementation restores cards whose stored owner is that player. Next code release should revise the key to `${you}: use Holy Rebirth to revive 3 of your fallen Believers`. Current old-key Chinese: `${you}：發動聖光復活，使自己陣亡的三張信徒牌復活`.
- Karma Reversed tooltip timing clarification: `Reverse the outcome of a believer confrontation, before it is resolved.` uses an abstract resolution point even though the implementation prompts after defense and before representatives or Believers are committed. Next code release should revise the key to `Before Believers are committed to a confrontation, reverse its Believer matchup results.` Current old-key Chinese: `在雙方派出信徒牌前，反轉該次對抗的信徒牌勝負關係。`
- Holy Rebirth trigger clarification (rules-impacting): `When 3 or more of your believers die at once, revive 3 believers from the graveyard.` makes sequential Faith War deaths sound ineligible and does not say that the revived Believers are the player's own. Intended player-facing wording: `When a single effect or Faith War causes 3 or more of your Believers to die, revive 3 of your fallen Believers from the graveyard.` Current old-key Chinese: `當單次效果或一場信仰戰爭使你有三張以上的信徒牌陣亡時，從墓地復活自己三張陣亡的信徒牌。` Before changing the code key, audit `war_death_counter_pack`: the current implementation retains accumulated deaths until that player's next turn and may therefore combine deaths from separate events, which is broader than this wording.
- Zombie Army related current keys/use contexts:
  - `Zombie Army is active. Target a Sect with Faith War.` — top instruction after choosing Zombie Army and before selecting the Faith War target. Current Chinese: `殭屍大軍已發動。請指定一個教團，對其發動信仰戰爭。` TODO next code release: revise the English key to `Zombie Army is active. Choose a Sect to target with Faith War.`
  - `Zombie Army is active in this Faith War. You can choose from hand or graveyard.` — frontend info shown to the Zombie Army owner when Faith War starts and graveyard choices are available. Suggested Chinese: `殭屍大軍已在本次信仰戰爭中發動。你可以從手牌或墓地派出信徒牌。`
  - `Zombie Army can be chosen when you declare Faith War.` — backend disabled reason when player tries to use Zombie Army as a standalone skill. Suggested Chinese: `殭屍大軍只能在你發起信仰戰爭時選擇發動。`

## Recent Translation Key Changes

| File | Context | Old English key | New English key | Suggested Traditional Chinese |
| --- | --- | --- | --- | --- |
| `modules/js/Game.js` | Surrender phase fallback when no Sect Leader can accept surrender | `No Sect Leader available. You may become a Wanderer.` | `No Sect Leader is available, so you become a Wanderer.` | `目前已沒有可投誠的教主。你成為游離者。` |
| `modules/php/Game.php`, `modules/js/Game.js` | No remaining action uses the same player-facing key in backend and frontend guards | `No action slots left this turn. Use Skill or End Turn.` / `No action slots left this turn. Use an available Skill or End Turn.` | `No actions left this turn. Use an available Skill or End Turn.` | `本回合已無法執行更多行動。請發動可用技能或結束回合。` |
| `modules/js/Game.js` | Already-committed Believer click guard uses one key for AoE and head-to-head confrontations | `You already committed your Believer. Please wait for confrontation to continue.` / `You already committed your Believer this round. Please wait.` | `You already committed your Believer. Please wait.` | `你已派出信徒牌，請等待。` |
| `modules/php/Game.php` | Skill availability guard for non-Leaders uses condition wording | `You are not a Leader, so you cannot use skills.` | `You must be a Leader to use this skill.` | `你不是教主，無法發動技能。` |
| `modules/js/Game.js` | Zombie Army duplicate action-type guard now reuses the generic action-type key | `You have already used a Physical Attack this turn.` / `You have already used this action type this turn (${action_type})` | `You have already used a ${action_type} action this turn.` | `你本回合已使用過 ${action_type} 行動` |
| `modules/php/Game.php`, `modules/js/Game.js` | War Bonus success/empty-deck notifications now use one backend log key instead of multiple duplicate frontend/backend keys | `${player_name} gets a War Bonus!` / `${player_name} earned a War Bonus` | `${player_name} gets a War Bonus (Crushing Victory)!` | `${player_name} 因大勝獲得戰爭獎勵信徒！` |
| `modules/php/Game.php`, `modules/js/Game.js` | War Bonus empty-deck notifications now use one backend log key instead of duplicate frontend/backend wording | `${player_name} triggers War Bonus, but it cannot grant an extra Believer because the Believer deck is empty.` / `Believer deck is empty, so no bonus card is drawn` | `${player_name} triggers War Bonus (Crushing Victory), but it cannot grant an extra Believer because the Believer deck is empty.` | `因信徒牌庫已空，${player_name} 無法在大勝中獲得戰爭獎勵的額外信徒牌。` |
| `modules/php/Game.php` | Hidden Karma Reversed / copied Karma Reversed status log describes the net canceled reversal | `confrontation responses have ended for this confrontation.` / `Confrontation responses have ended.` | `Confrontation reversal effects cancel out.` | `對抗反轉效果互相抵銷。` |
| `modules/php/Game.php` | Target Sect no-Believer confrontation guards now share one backend key for Faith War and Faith Debate | `Target Sect has no Believers for Faith Debate` / `Target Sect has no Believers to fight with` | `Target Sect has no Believers available for this confrontation.` | `指定教團沒有可參與這場對抗的信徒牌。` |
| `modules/js/Game.js` | Frontend no-Believer confrontation messages use one phrasing with or without Sect name | `currently has no Believers for confrontation.` / `${sect_name} has no Believers for this confrontation.` | `currently has no Believers available for this confrontation.` / `${sect_name} has no Believers available for this confrontation.` | `目前沒有可參與這場對抗的信徒牌。` / `${sect_name} 沒有可參與這場對抗的信徒牌。` |
| `modules/php/Game.php`, `modules/js/Game.js` | Karma Reversed activation log names reversal effect and removes duplicate frontend toast | `A hidden confrontation response is activated for this confrontation.` | `A confrontation reversal effect is activated.` | `對抗反轉效果已發動。` |
| `modules/js/Game.js` | The Prophet prediction choice no longer creates a duplicate frontend toast key; backend log remains canonical | `${player_name} predicts ${type_name} (draw #${draw_index}).` | `(removed; backend log `${player_name} predicts ${type_name} with The Prophet for draw #${draw_index}.` remains)` | `${player_name} 發動宇宙大先知，預測第 ${draw_index} 張抽到 ${type_name}。` |
| `modules/js/Game.js` | No surrender target branch no longer shows a duplicate toast plus top-instruction key | `No Sect Leader available to ask.` | `(removed; top instruction `No Sect Leader is available, so you become a Wanderer.` remains)` | `目前已沒有可投誠的教主。你成為游離者。` |
| `modules/js/Game.js` | Target-selection prompts keep `${card_name}` but let the Cancel button carry cancellation | `Target a player with ${card_name}, or cancel.` / `Target a player in your Sect with ${card_name}, or cancel.` / `Target a Sect with ${card_name}, or cancel.` | `Target a player with ${card_name}.` / `Target a player in your Sect with ${card_name}.` / `Target a Sect with ${card_name}.` | `請選擇 ${card_name} 要指定的玩家。` / `請選擇 ${card_name} 要指定的同教團玩家。` / `請選擇 ${card_name} 要指定的教團。` |
| `modules/php/Game.php` | Karma Reversed activation log should not say hidden because the reversing skill is revealed when activated | `A hidden confrontation reversal effect is activated.` | `A confrontation reversal effect is activated.` | `對抗反轉效果已發動。` |
| `modules/php/Game.php`, `modules/php/HOFMachineStates.inc.php`, `modules/js/Game.js` | Give-Believer support/surrender flow uses neutral Follower wording because the target is not always a new Follower | `${you} must select 1 Believer to give to your new Follower` / `Select exactly 1 Believer to give your new Follower, then confirm.` / `${leader_name} gives 1 Believer to their new Follower ${follower_name}.` | `${you} must select 1 Believer to give to your Follower` / `Select exactly 1 Believer to give your Follower.` / `${leader_name} gives 1 Believer to Follower ${follower_name}.` | `${you} 必須選擇一張信徒牌給予追隨者` / `請選擇一張信徒牌給予追隨者` / `${leader_name} 給予追隨者 ${follower_name} 一張信徒牌。` |
| `modules/php/Game.php`, `modules/js/Game.js` | Game-end fallback reason uses clearer wording | `A game-end rule determined the winner.` | `Winner determined by a game-end rule.` | `依遊戲結束規則判定勝者。` |
| `modules/php/HOFMachineStates.inc.php` | The Prophet prediction state lets the Pass button carry pass wording | `${you} must choose a Believer type to predict, or pass` | `${you} must choose a Believer type to predict` | `${you} 必須選擇一種信徒牌類型進行預測` |
| `modules/php/Game.php` | Karma Reversed responder guard uses the official skill name | `You are not the Reverse Karma responder.` | `You are not the Karma Reversed responder.` | `目前不是你能發動六道輪迴的時機。` |

## Future Consolidation Groups

- Give-Believer support/surrender wording should be reviewed as one group. Related keys include `${you} must decide whether to give 1 Believer`, `${you} must select 1 Believer to give to your Follower`, `Select exactly 1 Believer to give your Follower.`, `You have no Believer to give.`, and `${leader_name} gives 1 Believer to Follower ${follower_name}.` Prefer one concept in Chinese: `給予信徒牌支援` / `給予追隨者信徒牌`, with buttons carrying the final action.
- Secret Alliance exchange wording should be reviewed as one group. Related keys include `${you} must choose one Action card to offer`, `${you} must choose one Action card to exchange`, `Select one Action card from your hand to offer`, `Select one Action card from your hand to exchange`, `Choose an Action card from your hand to exchange.`, `Confirm Offered Action Card`, and `Confirm Exchange Card`. Use `offer` only for the initiating player's offered card and `exchange` for the target player's chosen exchange card.
- Turn/action state prompts that include `end the turn` / `End Turn` should be reviewed with the button-text rule. If an End Turn button is present, the state description should focus on the required action and let the actual button carry `End Turn`, instead of embedding `or end the turn` in the translatable sentence.
- Defense-response wording should be reviewed as one variable-driven UI group. Current duplicated keys such as `This is a Mental Attack. You must use a Mental defense card (Firm Faith).` and `This is a Physical Attack. You must use a Physical defense card (Great Mercy).` should become one shared key with inserted labels, e.g. `${attack_type}` and `${defense_card_name}`. The same rule applies to frontend and backend defense prompts so Physical/Mental/Firm Faith/Great Mercy do not create separate full-sentence translation keys.
- `Breaking Faith` defense is a special betrayal response, not a normal Physical/Mental defense-card category. Do not put it into generic `${defense_label} defense card` Chinese wording. Use special wording such as `使用恩斷義絕防禦背叛` / `打出恩斷義絕`.

## Current Small Cleanup Changes

| File | Context | Old English key | New English key | Suggested Traditional Chinese |
| --- | --- | --- | --- | --- |
| `modules/php/Game.php` | Breaking Faith defense prompt should not call it a generic defense card | `Do you want to play a Breaking Faith defense card?` | `Do you want to play Breaking Faith?` | `你要打出恩斷義絕防禦背叛嗎？` |
| `modules/js/Game.js` | Breaking Faith top instruction should not use generic `${defense_label} defense card` wording | `Play a matching ${defense_label} defense card, or click Skip Defense.` | `Play Breaking Faith, or click Skip Defense.` | `請打出恩斷義絕，或跳過防禦。` |

## Translation Cleanup Rules

- Player-facing strings with the same meaning should reuse the same English key and Chinese wording whenever possible. Keep separate wording only when the distinction is intentional, such as debugging, backend-only diagnostics, or genuinely different player actions.
- When duplicate player-facing strings differ only by action/card/type, prefer one variable-based key such as `${action_type}` or `${card_name}` instead of maintaining separate near-identical keys.
- Do not create separate frontend toast keys for the same event already covered by a backend public log unless the frontend message adds genuinely different player-facing information.
- For UI/status/error strings, prefer variables or actual UI buttons to avoid duplicate translation keys. Examples: use `${action_type}` for Physical/Mental variants, `${card_name}` for card-specific prompts, and let Confirm/Cancel/Skip/Pass buttons carry those choices instead of writing `or confirm`, `or cancel`, `or skip`, or `or pass` in the instruction text. Inline buttons in text are also acceptable when the UI supports them.
- Card tooltips are the exception: they are fixed card text and should remain explicit, matching the card/rulebook wording rather than being generalized through variables.
- Future code cleanup: UI text should use the canonical runtime labels for Action card names, Skill names, and type labels whenever possible instead of hardcoding separate strings for each card/type. Examples include `${card_name}`, `${skill_name}`, `${action_type}`, `${attack_kind}`, `${defense_label}`, and similar placeholders.
- Future code cleanup: Action type / attack type / defense type wording should be UI-label driven. Physical, Mental, Strategy, Defense, etc. should be translated once as labels and inserted into shared sentence keys where practical, rather than creating separate full-sentence keys for each type.
- Future code cleanup: Card and Skill names shown in UI prompts/logs may also be variable-driven. The exception is only the card tooltip effect-description body, where fixed wording is allowed and expected because it mirrors precise card/rulebook text.
- Translate `surrender` as `投誠` in Traditional Chinese, matching the Chinese rulebook terminology.
- Translate `Unification Under Heaven` consistently as `天下一統`.
