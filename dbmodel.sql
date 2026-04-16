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
