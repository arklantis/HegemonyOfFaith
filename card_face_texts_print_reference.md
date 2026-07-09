# 卡面文案總表(再版印刷參考)/ Card Face Texts — Print Reference

來源:BGA 版統一文案(`modules/js/Game.js` 的 `getSkillCardFaceText` / `getActionCardFaceText` 等,遊戲內卡面、大牌 tooltip、純文字提示全部同一套)。
規則依據:`Hegemony_of_Faith_Rules_Consolidated.md` + `card_text_reference_en_primary.md` + 實際程式行為。
`【物理】`/`【精神】` = 內嵌攻擊型別 icon;`⏎` = 卡面上的換行。

---

## 技能卡 Skills(16)

| # | 中文名 | English | 發動時機(pill) | 次數 | 卡面文字 |
|---|--------|---------|----------------|------|----------|
| 1 | 紫氣東來 | Purple Hermit | Your turn after becoming a Follower | 1 | Take half of your Leader's believers. Next turn, take half again and go independent. If the Leader then plays "Breaking Faith" on you, it snatches nothing and you go independent immediately. |
| 2 | 阿拉碰瓜 | KABOOM! | Before any attack actions on your turn | 1↻ | Use before attacking: sacrifice 1 believer to destroy 3 of a target player's believers (all, if fewer). Cannot be defended. You cannot attack for the rest of this turn. |
| 3 | 唯我獨尊 | Headstronger | When you have Followers on your turn | 1 | Expel all your Followers at once, seizing half of each one's believers. |
| 4 | 宇宙大先知 | The Prophet | When others draw believer cards | ∞ | When another player recruits believers, predict the first card's type — if correct, take it. (Faith War bonus draws cannot be predicted.) |
| 5 | 聖光復活 | Holy Rebirth | Upon meeting conditions | 1↻ | When 3 or more of your believers die at once, revive 3 believers from the graveyard. |
| 6 | 雞犬升天 | Ascend with Me | When your Follower draws action cards | ∞ | ① When your Follower draws action cards, you draw the same number. ② Your action hand limit is +1 for each Follower. |
| 7 | 永恆真理 | Eternal Truth | On your turn | 3 | Sacrifice 1 believer: your sect is immune to 【精神】 mental attacks until your next turn. |
| 8 | 世界大同 | World Peace | On your turn | 3 | Sacrifice 1 believer: your sect is immune to 【物理】 physical attacks until your next turn. |
| 9 | 真理之門 | Gate of Truth | Depending on the copied skill | 1↻ | ① Copy another player's revealed skill; the copy lasts until your next turn. ② Each skill can only be copied once. |
| 10 | 殭屍大軍 | Zombie Army | When you initiate a "Faith War" | ∞ | In a Faith War you declare, you may fight with believers from the graveyard. Each graveyard believer used is removed from the game. |
| 11 | 斷魂寶劍 | Soul-Cutting Sword | On your turn | 3 | Force a player to skip their entire next turn. |
| 12 | 諸行無常 | Impermanence of Life | At game end | 1 | Stay independent: never join or absorb another sect, never become a Wanderer — if you do, reveal and discard this, then draw a new skill. Win immediately if you hold 5 or more believers at game end. |
| 13 | 生命禮讚 | Praise of Life | On your turn | 1↻ | Sacrifice 1 believer: gain 1 extra action this turn — any type, even one you already used. |
| 14 | 混沌降世 | Chaos Coming | On your turn | 3 | Collect all players' action cards, shuffle, and deal them back evenly, starting with yourself. |
| 15 | 眾生平等 | Everyone is Equal | Before playing any action on your turn | 1 | Collect all players' believers, shuffle, and deal them back evenly, starting with yourself. Your turn then ends immediately. |
| 16 | 六道輪迴 | Karma Reversed | Before believers in a confrontation | ∞ | Reverse the outcome of a believer confrontation, before it is resolved. |

---

## 行動卡 Actions(15)

| 中文名 | English | 角標 | 型別icon | 範圍icon | 卡面文字 | 風味語錄 |
|--------|---------|------|----------|----------|----------|----------|
| 獵殺異端 | Witch Hunt | Attack | 物理 | 單體 | Target a sect and a believer type: every believer of that type in that sect dies. | - Burn!!! |
| 信仰戰爭 | Faith War | Attack | 物理 | 1v1 | Sect vs sect physical confrontation: duel round after round until one side has no believers left to fight. | - One shall stand, one shall fall! |
| 煽動殉教 | Martyrdom | Attack | 物理 | AoE | Send a believer to physically confront every other sect. Your believer always dies; each opposing believer that loses or draws dies too. | - Jump with me! |
| 散布流言 | Spread Rumors | Attack | 精神 | 單體 | Snatch 1 random believer from every player in a target sect. | - I heard rumors saying... |
| 信仰辯論 | Faith Debate | Attack | 精神 | 1v1 | Mental duels against a target sect, up to 5 rounds. ⏎ Each round's winner snatches the loser's believer; draws return to hand. | - Let's debate! |
| 陰謀論 | Conspiracy | Attack | 精神 | AoE | Send a believer to mentally confront every other sect, snatching each believer it defeats. | - The wonderful plan! |
| 廣善慈悲 | Great Mercy | Defence | 物理盾 | — | Defend your sect from one 【物理】 physical attack. | - Spare them! |
| 堅定信仰 | Firm Faith | Defence | 精神盾 | — | Defend your sect from one 【精神】 mental attack. | - I can't hear you! |
| 恩斷義絕 | Breaking Faith | Strategy | 策略 | — | ① Leader: expel one Follower. ⏎ ② Follower: become an independent Leader. ⏎ Snatch half the target's believers (rounded down) — only 1 if countered with Breaking Faith. ⏎ (底部置中)Same sect only. | (無) |
| 信仰勸說 | Kowtow to Me | Strategy | 策略 | — | Forcibly absorb a target sect whose believers number at most half of yours. | - At least I want your body |
| 情報間諜 | Info-Spy | Strategy | 策略 | — | Look at all of one player's action and believer cards. | - I'm watching you! |
| 秘密同盟 | Secret Alliance | Strategy | 策略 | — | Exchange one action card with a target player — each side picks which of their own cards to give. | - Insider trading control the world! |
| 天降神蹟 | It's a Miracle | Strategy | 策略 | — | Revive up to 3 believers from the top of the graveyard. | - Wake up! My child! |
| 廣善佈施 | Have a Charity | Strategy | 策略 | — | Draw 2 believer cards from the deck. | - Have you heard about our faith? |
| 神啟 | Divine Inspiration | Strategy | 策略 | — | Discard any number of action cards, then draw that many believers. ⏎ (This card itself does not count.) | - Let there be believers! |

---

## 信徒卡 Believers(5)

| # | 中文名 | English | Win(壓制) | War Bonus(剋) |
|---|--------|---------|------------|----------------|
| 1 | 愚民 | Fool | ④ Elder ⑤ Fanatics | ⑤ Fanatics |
| 2 | 平信者 | Prayer | ① Fool ⑤ Fanatics | ① Fool |
| 3 | 傳教士 | Missionary | ① Fool ② Prayer | ② Prayer |
| 4 | 長老 | Elder | ② Prayer ③ Missionary | ③ Missionary |
| 5 | 狂信者 | Fanatics | ③ Missionary ④ Elder | ④ Elder |

---

## 與原印刷版的差異(語意修正,再版時建議跟進)

1. **紫氣東來**:原文的恩斷義絕條款會被誤讀成「未發動也可取消」;新文用先後順序(then)綁定「已發動、等下回合」的前提。
2. **阿拉碰瓜**:原文 "Cannot do any attack actions before and after..." 語意含糊;新文明確為「攻擊前使用;用後本回合不能再攻擊」,並補「不可防禦」「不足 3 個全炸」。
3. **信仰戰爭**:原文「until all believers of one side have participated」與實際規則(打到一方無信徒可出)不一致,已改。
4. **信仰勸說**:原文 "fewer than half" 與實作(**小於等於**一半)不符,已改為 at most half。
5. **眾生平等**:原印刷「(This skill will consume two actions)」;BGA 實作為**立即結束回合**,文案已照實作。再版時請確認要用哪個規則。
6. **神啟**:補明「本牌不計入棄牌數」的語序,原文較繞。
7. **煽動殉教**:原文排版錯字 "confrontation.along" 已修正。

## 待你確認的規則疑點(文案未寫入,現行採實作/卡面版)

- **陰謀論**:`card_text_reference_en_primary.md` 草稿寫「任一防守者贏過攻擊者,攻擊者全部搶不到」;現行實作與卡面是「逐一結算,搶走每個被擊敗的信徒」。文案採後者,若前者才是正式規則請告知,程式跟文案都要改。
