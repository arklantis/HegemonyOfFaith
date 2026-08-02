const DEFENSE_STANDBY_CARDS = new Set(["great_mercy", "firm_faith"]);
const OWN_SECT_BELIEVER_REQUIRED_CARDS = new Set([
  "faith_war",
  "faith_debate",
  "martyrdom",
  "conspiracy",
]);
const TARGET_REQUIRED_CARDS = new Set([
  "witch_hunt",
  "spread_rumors",
  "faith_debate",
  "faith_war",
  "info_spy",
  "secret_alliance",
  "kowtow_to_me",
  "breaking_faith",
]);

function disabledCard(key, reason) {
  return { key, enabled: false, reason };
}

export function projectActionCardReadiness(input = {}) {
  const cardKeys = Array.isArray(input.cardKeys) ? input.cardKeys : [];
  const focusDefenseCardKey = String(input.focusDefenseCardKey || "");
  const selectableTargetKeys = new Set(
    Array.isArray(input.selectableTargetKeys) ? input.selectableTargetKeys : []
  );
  const actionTypeMasks = input.actionTypeMasks || {};
  const turnActionMask = Number.parseInt(input.turnActionMask || 0, 10) || 0;
  const repeatBypass = Number.parseInt(input.repeatBypass || 0, 10) || 0;

  return cardKeys.map(function (rawKey) {
    const key = String(rawKey || "");
    if (!key) return { key, enabled: true, reason: "" };
    if (focusDefenseCardKey) {
      return key === focusDefenseCardKey
        ? { key, enabled: true, reason: "" }
        : disabledCard(key, "defense_focus");
    }
    if (input.waitingForDefense) return disabledCard(key, "defense_waiting");
    if (input.waitingForAoe) return disabledCard(key, "aoe_waiting");
    if (input.initialSkillDraft) return disabledCard(key, "initial_skill_draft");
    if (input.believerSelection) return disabledCard(key, "believer_selection");
    if (!input.playerTurnRules) return { key, enabled: true, reason: "" };
    if (DEFENSE_STANDBY_CARDS.has(key)) {
      return disabledCard(key, "defense_standby");
    }
    if (input.noActionSlots) return disabledCard(key, "no_action_slots");
    if (
      !input.mySectHasBelievers &&
      OWN_SECT_BELIEVER_REQUIRED_CARDS.has(key)
    ) {
      return disabledCard(key, "no_sect_believers");
    }
    if (TARGET_REQUIRED_CARDS.has(key) && !selectableTargetKeys.has(key)) {
      return disabledCard(key, "no_target");
    }

    const actionTypeMask = Number.parseInt(actionTypeMasks[key] || 0, 10) || 0;
    if (
      input.attackLocked &&
      (actionTypeMask === 0b00100 || actionTypeMask === 0b00010)
    ) {
      return disabledCard(key, "attack_locked");
    }
    if (
      actionTypeMask > 0 &&
      repeatBypass <= 0 &&
      (turnActionMask & actionTypeMask) !== 0
    ) {
      return disabledCard(key, "action_type_used");
    }
    return { key, enabled: true, reason: "" };
  });
}
