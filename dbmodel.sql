-- HegemonyOfFaith implementation: (C) 2026 Yen / Gamefly Studio
-- Copyright (C) 2026 Yen / Gamefly Studio

CREATE TABLE IF NOT EXISTS `action_cards` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `believer_cards` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `skill_cards` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1;

ALTER TABLE `player` ADD `player_first` BOOLEAN NOT NULL DEFAULT '0';
ALTER TABLE `player` ADD `player_role` INT NOT NULL DEFAULT '0';
ALTER TABLE `player` ADD `player_sect` INT NOT NULL DEFAULT '-1';
ALTER TABLE `player` ADD `player_leader_id` INT DEFAULT NULL;
ALTER TABLE `player` ADD `player_is_skill_sealed` BOOLEAN NOT NULL DEFAULT '0';
ALTER TABLE `player` ADD `player_is_conspiracy_rep` BOOLEAN NOT NULL DEFAULT '0';
ALTER TABLE `player` ADD `player_is_martyrdom_rep` BOOLEAN NOT NULL DEFAULT '0';
ALTER TABLE `player` ADD `player_wanderer_turns` INT NOT NULL DEFAULT '0';

-- Solo mode: virtual bot seats (official BGA rule: fake players must NOT live
-- in the standard `player` table). Mirrors every player column the game logic
-- touches; bot ids use the reserved 1..6 range that can never be real accounts.
CREATE TABLE IF NOT EXISTS `bot_player` (
  `player_id` int(10) unsigned NOT NULL,
  `player_no` int(10) NOT NULL DEFAULT '0',
  `player_name` varchar(64) NOT NULL,
  `player_color` varchar(6) NOT NULL DEFAULT 'cccccc',
  `player_avatar` varchar(32) NOT NULL DEFAULT '',
  -- named bot_score (not player_score): the BGA checker reserves direct
  -- player_score manipulation for the framework counters; this is OUR table.
  `bot_score` int(10) NOT NULL DEFAULT '0',
  `player_zombie` tinyint(1) NOT NULL DEFAULT '0',
  `player_eliminated` tinyint(1) NOT NULL DEFAULT '0',
  `player_first` BOOLEAN NOT NULL DEFAULT '0',
  `player_role` INT NOT NULL DEFAULT '0',
  `player_sect` INT NOT NULL DEFAULT '-1',
  `player_leader_id` INT DEFAULT NULL,
  `player_is_skill_sealed` BOOLEAN NOT NULL DEFAULT '0',
  `player_is_conspiracy_rep` BOOLEAN NOT NULL DEFAULT '0',
  `player_is_martyrdom_rep` BOOLEAN NOT NULL DEFAULT '0',
  `player_wanderer_turns` INT NOT NULL DEFAULT '0',
  PRIMARY KEY (`player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Read seam note: game-logic SELECTs use the derived union "vplayer" defined
-- as the VPLAYER SQL constant in Game.php (humans + bot seats in one list).
-- No SQL view here: BGA's dbmodel loader only accepts table DDL. Writes are
-- routed per-id in PHP (updateSeat / updateSeatsWhere).
