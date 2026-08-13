module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  globals: {
    $: "readonly",
    _: "readonly",
    gameui: "readonly",
    g_archive_mode: "readonly",
    g_current_player_id: "readonly",
    g_gamelogs: "readonly",
    g_gametable_id: "readonly",
    g_gamethemeurl: "readonly",
    g_last_msg_dispatched_time: "readonly",
    g_last_msg_dispatched_uid: "readonly",
    g_player_id: "readonly",
    g_replayFrom: "readonly",
    importDojoLibs: "readonly",
  },
  rules: {
    "no-undef": "error",
  },
};
