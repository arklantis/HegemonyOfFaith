
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- HegemonyOfFaith implementation: <Your name here> <Your email address here>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- dbmodel.sql

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

-- Example 1: create a standard "card" table to be used with the "Deck" tools (see example game "hearts"):

CREATE TABLE IF NOT EXISTS `action_cards` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `believer_cards` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `skill_cards` (
  `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `card_type` varchar(16) NOT NULL,
  `card_type_arg` int(11) NOT NULL,
  `card_location` varchar(16) NOT NULL,
  `card_location_arg` int(11) NOT NULL,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;


-- add info about first player
ALTER TABLE `player` ADD `player_first` BOOLEAN NOT NULL DEFAULT '0';
-- add info about player role: 0 = Leader, 1 = Follower, 2 = Wanderer
ALTER TABLE `player` ADD `player_role` INT NOT NULL DEFAULT '0';
-- sect id: each player starts with their own sect; wanderer uses -1
ALTER TABLE `player` ADD `player_sect` INT NOT NULL DEFAULT '-1';
-- follower points to a leader's player_id. NULL/0 if not following.
ALTER TABLE `player` ADD `player_leader_id` INT DEFAULT NULL;
-- follower skill seals
ALTER TABLE `player` ADD `player_is_skill_sealed` BOOLEAN NOT NULL DEFAULT '0';
-- temporary round flag for Conspiracy representative selection
ALTER TABLE `player` ADD `player_is_conspiracy_rep` BOOLEAN NOT NULL DEFAULT '0';
-- temporary round flag for Martyrdom representative selection
ALTER TABLE `player` ADD `player_is_martyrdom_rep` BOOLEAN NOT NULL DEFAULT '0';
-- how many Wanderer turns have been completed since becoming Wanderer
ALTER TABLE `player` ADD `player_wanderer_turns` INT NOT NULL DEFAULT '0';


-- Example 2: add a custom field to the standard "player" table
-- ALTER TABLE `player` ADD `player_my_custom_field` INT UNSIGNED NOT NULL DEFAULT '0';
