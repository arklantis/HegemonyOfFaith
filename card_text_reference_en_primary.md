# Hegemony of Faith - Action Card Text Table (English Primary)

Source priority:
- Primary: `Hegemony_of_Faith_Rules_Consolidated.md` (English rules)
- Secondary: current project naming and your existing CN naming convention

Notes:
- This is a data draft only (not wired to UI yet).
- If EN and CN differ, EN is authoritative.
- The CN text in the consolidated `.md` appears encoding-damaged, so this table keeps EN first and leaves CN alias as draft labels.

| card_key | name_en | name_cn_alias (draft) | category | timing | target_rule | effect_en (authoritative draft) |
|---|---|---|---|---|---|---|
| `have_a_charity` | Have a Charity | charity | Strategy | Main action | Self | Draw 2 Believers. If deck has fewer, draw as many as possible. |
| `info_spy` | Info-Spy | spy | Strategy | Main action | 1 non-Wanderer player | View target player's hand (Action and Believer cards). |
| `its_a_miracle` | It's a Miracle | miracle revive | Strategy | Main action | Self / Graveyard | Revive up to 3 Believers from top of graveyard to hand. Cannot be played if graveyard is empty. |
| `divine_inspire` | Divine Inspiration | divine inspire | Strategy | Main action | Self | Discard X Action cards (excluding this card), then draw X Believers. |
| `secret_alliance` | Secret Alliance | secret alliance | Strategy | Main action + response | 1 non-Wanderer player | Choose a target player. You offer 1 Action card (not this card); target chooses 1 Action card; exchange those 2 cards. |
| `breaking_faith` | Breaking Faith | break faith | Strategy (special attack-like) | Main action + defense check | Same-sect target only | Can only target same-sect legal relation (Leader->Follower or Follower->Leader). Defended only by `breaking_faith`. If defended: steal 1 Believer; if not defended: steal floor(half) Believers. Then separation logic applies by role relation. |
| `kowtow_to_me` | Kowtow To Me | kowtow | Strategy | Main action | 1 target sect | If target sect member count is <= half of your sect member count, absorb that sect into your sect. |
| `spread_rumors` | Spread Rumors | rumors | Mental Attack | Main action + defense phase | 1 target sect | If not defended, steal 1 random Believer from each player in target sect; stolen cards go to attacker. |
| `faith_debate` | Faith Debate | debate | Mental Attack | Main action + duel rounds | 1 target sect | Sect vs sect mental duel, up to 5 rounds. Winner of each duel snatches loser's Believer; draw returns cards. |
| `conspiracy` | Conspiracy | conspiracy | Mental Attack (AoE) | Main action + defense/commit + resolve | 1 vs all enemy sects | Attacker commits 1 Believer against all defending representatives. If any defender beats attacker, attacker steals none and keeps own card. Otherwise attacker steals from defenders they beat; draws are retained by original owners. |
| `witch_hunt` | Witch Hunt | witch hunt | Physical Attack | Main action + defense phase | 1 target sect + believer type | Choose a target sect and believer type; if not defended, all Believers of that type in that sect die (to graveyard). |
| `faith_war` | Faith War | war | Physical Attack | Main action + repeated duels | 1 target sect | Sect vs sect war. Representatives duel repeatedly until one side has no available Believers to continue. Physical draw: both die. |
| `martyrdom` | Martyrdom | martyrdom | Physical Attack (AoE) | Main action + defense/commit + resolve | 1 vs all enemy sects | Attacker commits 1 Believer (attacker card always dies at resolution). Defenders commit 1 each. Compared against attacker: defender loses or draws -> defender dies; defender wins -> defender survives/returns. |
| `great_mercy` | Great Mercy | physical defense | Defense | Defense response only | Physical attacks only | Defense card usable only against physical attacks. |
| `firm_faith` | Firm Faith | mental defense | Defense | Defense response only | Mental attacks only | Defense card usable only against mental attacks. |

## Key Mapping Checklist

Keys aligned with current code (`material.inc.php`, `hegemonyoffaith.game.php`):

- `witch_hunt`
- `faith_war`
- `martyrdom`
- `spread_rumors`
- `faith_debate`
- `conspiracy`
- `great_mercy`
- `firm_faith`
- `breaking_faith`
- `kowtow_to_me`
- `info_spy`
- `secret_alliance`
- `its_a_miracle`
- `have_a_charity`
- `divine_inspire`
