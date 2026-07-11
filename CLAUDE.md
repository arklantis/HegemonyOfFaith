# 信仰霸權 (Hegemony of Faith) — 接手模型守則

BGA Studio 卡牌遊戲,alpha 階段。專案主體在 `hegemonyoffaith/`(git repo,分支 `feature/single-player-ai`,remote = GitHub arklantis/HegemonyOfFaith)。
Yen = 設計師兼工程師,繁體中文溝通。規則的最終依據:`Hegemony_of_Faith_Rules_Consolidated.md` + `hegemonyoffaith/card_text_reference_en_primary.md` + `rulebook_extracted.txt`。

## 鐵律(違反 = 重大事故)

1. **絕不弄壞遊戲載入**。改完必驗:`php -l modules/php/Game.php`、`node --check modules/js/Game.js`、CSS 大括號平衡。任何 PHP 框架方法**不可 override**(`getPlayerNameById`/`incStat`/`setStat`…簽名不合直接 fatal)——一律用改名 helper(`seatNameById`/`incStatSafe`/`setStatSafe`)。`dbmodel.sql` 只吃 table DDL,不可 CREATE VIEW;改 dbmodel 後 Yen 要開新桌才生效。
2. **遊戲名詞絕不自譯**。中文名查規則書,查不到用英文/內部 key。已確認:kowtow_to_me=信仰勸說、holy_rebirth=聖光復活、reverse_karma=六道輪迴、its_a_miracle=天降神蹟。亂translate過被嚴正糾正多次。
3. **不動核心規則**,除非 Yen 明說是 bug。出問題先懷疑自己的 code,絕不質疑 Yen 的上傳/快取/測試流程(他是工程師)。
4. **翻譯字串只有一套**。卡面文案(`getSkillCardFaceText`/`getActionCardFaceText`)是唯一來源,其他地方委派取用;新增重複語意的 `_()` 字串 = 讓翻譯者做兩次工,禁止。所有玩家可見字串都要 `_()`/`clienttranslate()`,原文英文,`${placeholder}` 保留。
5. **能統一就統一**。CSS 變數、時序常數、卡牌三級尺寸(S=面板40px/M=座位技能+牌庫84px/L=手牌+出牌126px,tooltip 250px 另計)、間距——不寫 ad-hoc 數值。Yen 會自己微調 CSS:可調的地方加中文「旋鈕」註解並告訴他 class 名。
6. **改完回報要上傳哪些檔**(他手動上傳 BGA)。沒實際驗過的不說「測過」。

## 地雷區(歷史上真炸過的)

### PHP / 伺服器
- **VPLAYER 讀寫分離**:讀用 `self::VPLAYER`(player ∪ bot_player 衍生表);寫必走 `updateSeat`/`updateSeatsWhere`。`updateSeatsWhere` 內部的 `"UPDATE player"` 字串被全域 sed 改成自呼叫過一次 → 無限遞迴記憶體爆掉,動它要小心。
- **Solo bot(id 1–6)永遠不是框架 active**。任何 `getActivePlayerId()===actor` 的檢查都要有 `isSoloBotId` 豁免(秘密同盟就漏過)。行動者追蹤:`solo_pending_actor_id`/`solo_current_actor_id`/`turn_owner_player_id`;全 bot multiactive 視窗走 `solo_multi_bot_mask`+轉場編碼,一步一步 client 節拍,**絕不 inline 整場跑完**(曾把整場戰爭遞迴在一個請求裡 → DB 鎖死 → 整桌 timeout)。
- **setSeatsMultiactive 呼叫順序**:每回合的狀態重置(如 war_card_*=0)必須在 arm 之前——混合視窗裡 bot 是 inline 出牌,後重置會把 bot 的牌抹掉(戰爭打一回合就強制結束的根因)。
- **`nextState('X')` 前確認該 state 的 transitions 有 X**(HOFMachineStates.inc.php)。缺 transition = 卡死(holyRebirthPrompt 在 95/69/70 都漏過)。
- **gamestate label 只存 int**,id 已用到 113;新 id 先查有沒有撞(100 撞過 final_struggle,每回合污染)。字串狀態用編碼表(int↔string map)。
- Studio 開 `exception_on_warning`:PHP warning 即 fatal——`max()` 空陣列、未定義 index 都會炸。
- Bot 大腦 `runBotAutomationTurnInner` 三模式共用(zombie/practice/solo)——改行為三個一起變,想清楚再動。AI 層:`getBotSituation` mood、評分 ≤−50=禁手、技能性格、間諜記憶(globals 111–113 打包)。
- 遊戲規則不變量(改流程時自檢):游離者不能用任何技能/不能被指定/不進終局不獲勝;諸行無常四個失敗觸發(成為游離/勸說雙方/接受投誠/投誠);追隨者技能封印;天下一統(僅剩一教主且無游離者)**當下即結束**。

### JS / Client
- **PHP 每個 `notifyAllPlayers` 名字都要有 JS 訂閱**,否則新框架彈錯+卡通知佇列。訂閱防重複(`_notificationsSubscribed`)。
- **通知同封包時序陷阱**:handler 可能在前一個飛行還沒登記 `flightBusyUntil` 時就跑,等待值要用 `max(剩餘飛行, getUnifiedCardFlyMs())+緩衝` 保底(散布流言、神啟都踩過)。
- **飛牌一律走三級縮放**:`animateTempCardFlight` 的 from/toScale 傳 `null`=自動分級;寫死 `1` 會關掉縮放(發牌大卡卡在牌庫的根因)。`safeSlideToObject` 只位移不縮放,需要縮放要自己補 transform 過渡。落地即更新:牌到墓地/棄牌堆的瞬間就 render 該堆,不等下一個通知。
- **ebg.stock**:不可蓋 `.stockitem` 的 `position:absolute`(要補定位用 `:where()` 零特異性);`data-index` 在 `onItemCreate` 設;視窗 resize 後要 `updateDisplay` 重排。
- **卡面文字層**:MutationObserver 掃 `.card-*[data-index]` 自動長字;換牌要先刪 `.hof-card-text` 才會重建;字級用 `cqw`(只在 container-typed 卡面內有效,面板固定框用 px);tooltip=大牌+牌外動態資訊。
- **Solo 下唯一真人永遠是框架 active 佔位**:`isCurrentPlayerActive()` 在 activeplayer 狀態不可信,用 `soloBotOwnsActiveState()`/args 的 actor id 判斷。
- 手牌鎖(`hof-hand-locked`):灰不縮、技能疊不鎖;`HOF_DEBUG_TOOLS=true` 時有視覺豁免,**發佈前翻 false**(同一旗標也管 console 測試工具 hofEmptyDeck/hofAi)。

### CSS
- 背景維持原淡色羊皮紙調——Yen 否決過深色底(卡牌是深色的,會糊)。
- 中央牌桌固定 min-height(戰爭/AOE 盤同大),結算頁可超高。
- 座位固定寬小方框、依出牌順序順時針排;RWD 收成等寬兩欄;徽章=黑 token+玩家色日芒環(follower 縮小、wanderer 虛線空心圓)。
- 對齊要求以**卡牌上緣**為準(不是文字),對齊值儘量從結構推導(鏡射另一側的行高結構),不要猜 px。

## 與 Yen 的協作方式
- 繁體中文、散文少列點、**簡潔**;錯了直接認錯改正,不油腔;最多問一個問題,能自己決定就決定。
- 他說「所有/統一/通用」= 機制級全面處理,不是逐張修表面。
- 症狀重複出現 = 你沒修到根因,回去找同類路徑一次掃完。
- commit 只在他喊 commit 時做,訊息末尾 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`(接手模型換自己名字),push `origin feature/single-player-ai`。
- 持久記憶在 `C:\Users\arkla\.claude\projects\d--Game-develop-BGA-Faith\memory\`,先讀 MEMORY.md。

## 發佈前 checklist(alpha→release)
- `HOF_DEBUG_TOOLS` 翻 false;移除 `[HOF-GATE-COPY]`/`[HOF-IMP-WIN]` debug log。
- BGA check project 過(SQL 字串去空格避開誤報;player_score 不直接操作,bot 表用 bot_score 別名)。
- 待辦:陰謀論規則疑點待 Yen 裁決(逐一結算 vs 任一防守勝全不搶);中文翻譯 Yen 在 BGA 平台做,前置的 `hof-lang-zh` CSS 調整層已備好。

---

# 方法論(Fable 留給接手者:這專案怎麼做才有效)

## 工作流程規範
1. **先讀後寫**。動任何東西前,把該機制的完整路徑讀懂:值從哪寫入、誰讀、什麼順序。沒讀過的函式不改;grep 到一行就下手是這專案最常見的翻車方式。
2. **一次一個機制**。修 bug 不順手重構;重構不夾雜行為變更。每個 commit 是一個可獨立回退的穩定點。
3. **改的是「類」不是「例」**。Yen 回報一張牌的問題,先問自己:同形狀的路徑還有哪些?(grep API 呼叫點,不是 grep 症狀字串)。他說過:「不是我一張一張測,因為問題應該是相同」——症狀第二次出現 = 上次沒修到根,回去把同類全掃。
4. **每次修改後**:`php -l` + `node --check` + CSS 括號平衡,三個都過才回報;回報格式=修了什麼(一句話根因)+要上傳哪些檔+建議測什麼。沒驗證的部分明說沒驗證。
5. **大改前先 commit**(Yen 會喊,但接近大改時可以主動提醒他)。改壞可以退,是這專案敢大步走的原因。

## 找 BUG 方法論(這專案的 bug 長什麼樣)
1. **先追資料流,不是先看報錯**。挑一個關鍵值(如 `war_card_defender`、`solo_current_actor_id`),列出所有寫入點和讀取點,看順序。**這專案八成的 bug 是順序問題不是邏輯問題**:重置跑在寫入後(戰爭一回合就結束)、通知 handler 跑在飛行登記前(動畫疊圖)、state 進入時值還沒設(interrupt 卡死)。
2. **框架邊界最可疑**。bug 密集在「我們的模型跟 BGA 框架不一致」的地方:solo bot 不是框架 active、VPLAYER union 不可寫、stock 自己管定位、通知必須有訂閱。查 bug 先問:這條路徑有沒有跨過框架邊界?
3. **對照組法**。「A 情況正常、B 情況壞」= 直接 diff 兩條路徑的程式(AI對AI戰爭正常、人對AI壞 → 差異就在混合視窗的 inline commit)。對照組是最快的定位法,別急著讀全部。
4. **視覺 bug 用量的,不用看的**。位置偏了就寫腳本在圖上畫格線量百分比;對齊用「鏡射另一側的結構」推導,不猜 px。截圖 → 找到渲染那段 DOM/CSS → 找數值來源。
5. **read-only 稽核**。懷疑有一類問題時(如「沒訂閱的通知」),寫一次性腳本把 PHP 的 notify 名字跟 JS 訂閱名 diff 出來,一次抓完,不逐個找。
6. **時序 bug 的萬用解**:等「事件」不等「時間」——onEnd 回呼、`flightBusyUntil`、settle 迴圈;凡是寫死 ms 猜時長的地方都是未來的 bug。

## 判斷依據(拿不準時的優先序)
1. **權威順序:實際程式行為 > 規則書 > 舊卡面文字 > 自己的推測**。互相矛盾時不要默默選邊——攤開差異+給建議,讓 Yen 裁決(陰謀論疑點就是這樣處理的)。
2. **名詞、規則、數字:查證或標明是估的**,絕不編。BGA 框架知識拿不準就去讀 BGA doc 或在程式裡驗證,幻覺框架 API 造成過真實事故(addAutomataPlayerPanel)。
3. **可逆的事直接做,不可逆/改規則的事先確認**。UI/動畫/文案=直接做;勝利條件、結算邏輯、狀態機結構=除非 Yen 明說,否則只報告不動手。
4. **Yen 的新指示蓋舊指示**,但如果新舊矛盾且影響規則層,用一句話確認(「跟之前 X 的決定相反,以新的為準?」),不要來回猜。
5. **「能跑」≠「對」**。lint 過只代表語法;行為要嘛實測過,要嘛明說「邏輯推導、未實測」。

## 給接手者的最後提醒
- Yen 的回饋很精準(截圖+期望vs實際),跟上他的節奏:小步快跑、每步可驗。他罵人=資訊密度高的修正訊號,聽內容不用管語氣,改對就好。
- 他是設計師:視覺上他會自己調 CSS,你的工作是把「旋鈕」做出來並告訴他在哪,不是替他決定美感。
- 這專案的完成度已高,剩餘工作多是單卡視覺與平衡微調。**保守優先**:寧可少動,不要為了「更好」把能跑的東西弄壞。
