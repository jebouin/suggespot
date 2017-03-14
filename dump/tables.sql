-- MySQL dump 10.13  Distrib 5.7.17, for Linux (x86_64)
--
-- Host: localhost    Database: suggespot
-- ------------------------------------------------------
-- Server version	5.7.17-0ubuntu0.16.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `comments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `author` int(10) unsigned DEFAULT NULL,
  `content` varchar(4096) COLLATE utf8mb4_unicode_ci NOT NULL,
  `suggestion` int(10) unsigned NOT NULL,
  `timeCreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `upvotes` int(10) unsigned NOT NULL DEFAULT '0',
  `downvotes` int(10) unsigned NOT NULL DEFAULT '0',
  `parent` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `author` (`author`),
  KEY `suggestion` (`suggestion`),
  KEY `parent` (`parent`),
  CONSTRAINT `comments_ibfk_4` FOREIGN KEY (`author`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `comments_ibfk_5` FOREIGN KEY (`suggestion`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_6` FOREIGN KEY (`parent`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `photos`
--

DROP TABLE IF EXISTS `photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `photos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `path` varchar(256) NOT NULL,
  `suggestion` int(10) unsigned DEFAULT NULL,
  `position` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `suggestion` (`suggestion`),
  CONSTRAINT `photos_ibfk_1` FOREIGN KEY (`suggestion`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=277 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suggestionTags`
--

DROP TABLE IF EXISTS `suggestionTags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suggestionTags` (
  `suggestion` int(10) unsigned NOT NULL,
  `tag` int(10) unsigned NOT NULL,
  PRIMARY KEY (`suggestion`,`tag`),
  KEY `tag` (`tag`),
  CONSTRAINT `suggestionTags_ibfk_1` FOREIGN KEY (`suggestion`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `suggestionTags_ibfk_2` FOREIGN KEY (`tag`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suggestions`
--

DROP TABLE IF EXISTS `suggestions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suggestions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descr` varchar(4096) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lat` int(11) DEFAULT NULL,
  `lon` int(11) DEFAULT NULL,
  `upvotes` int(10) unsigned NOT NULL DEFAULT '0',
  `downvotes` int(10) unsigned NOT NULL DEFAULT '0',
  `author` int(10) unsigned DEFAULT NULL,
  `timeCreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `published` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `author` (`author`),
  CONSTRAINT `suggestions_ibfk_1` FOREIGN KEY (`author`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(256) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `userTags`
--

DROP TABLE IF EXISTS `userTags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `userTags` (
  `user` int(10) unsigned NOT NULL,
  `tag` int(10) unsigned NOT NULL,
  PRIMARY KEY (`user`,`tag`),
  KEY `tag` (`tag`),
  CONSTRAINT `userTags_ibfk_1` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `userTags_ibfk_2` FOREIGN KEY (`tag`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `salt` char(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timeRegistered` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `votes`
--

DROP TABLE IF EXISTS `votes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `votes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `dir` tinyint(4) NOT NULL DEFAULT '1',
  `user` int(10) unsigned DEFAULT NULL,
  `suggestion` int(10) unsigned DEFAULT NULL,
  `comment` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user` (`user`),
  KEY `suggestion` (`suggestion`),
  KEY `comment` (`comment`),
  CONSTRAINT `votes_ibfk_4` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `votes_ibfk_5` FOREIGN KEY (`suggestion`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `votes_ibfk_6` FOREIGN KEY (`comment`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-03-14  6:44:48
