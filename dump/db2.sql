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
-- Table structure for table `commentThreads`
--

DROP TABLE IF EXISTS `commentThreads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `commentThreads` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `suggestion` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `suggestion` (`suggestion`),
  CONSTRAINT `commentThreads_ibfk_1` FOREIGN KEY (`suggestion`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commentThreads`
--

LOCK TABLES `commentThreads` WRITE;
/*!40000 ALTER TABLE `commentThreads` DISABLE KEYS */;
INSERT INTO `commentThreads` VALUES (56,38),(57,38),(58,38);
/*!40000 ALTER TABLE `commentThreads` ENABLE KEYS */;
UNLOCK TABLES;

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
  `timeCreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `upvotes` int(10) unsigned NOT NULL DEFAULT '0',
  `downvotes` int(10) unsigned NOT NULL DEFAULT '0',
  `thread` bigint(20) unsigned NOT NULL,
  `isReply` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `author` (`author`),
  KEY `parent` (`thread`),
  CONSTRAINT `comments_ibfk_4` FOREIGN KEY (`author`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `comments_ibfk_5` FOREIGN KEY (`thread`) REFERENCES `commentThreads` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=224 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */;
INSERT INTO `comments` VALUES (214,11,'test','2017-03-26 03:57:54',1,1,56,0),(215,11,'reply !','2017-03-26 03:58:01',1,0,56,1),(216,11,'hi !','2017-03-26 03:58:07',2,0,57,0),(217,1,'Hey o/','2017-03-26 03:59:27',1,0,57,1),(218,1,'test','2017-03-26 03:59:33',1,0,57,1),(219,1,'asdfasdf','2017-03-26 03:59:35',1,0,56,1),(220,1,'a','2017-03-26 03:59:37',1,0,56,1),(221,1,'asdfasdf','2017-03-26 04:23:21',1,0,57,1),(222,1,'asdfasdf','2017-03-26 04:23:26',0,1,58,0),(223,1,'rgyy','2017-03-26 04:23:34',1,0,58,1);
/*!40000 ALTER TABLE `comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `thingType` tinyint(3) unsigned DEFAULT NULL,
  `thingId` bigint(20) unsigned DEFAULT NULL,
  `author` int(10) unsigned DEFAULT NULL,
  `action` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timeCreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author` (`author`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`author`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=177 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (63,1,105,11,'mention','2017-03-23 14:18:29'),(64,1,107,11,'mention','2017-03-23 15:10:08'),(65,1,108,11,'comment','2017-03-23 15:10:15'),(66,1,109,11,'mention','2017-03-23 15:20:01'),(67,1,110,11,'comment','2017-03-23 15:20:07'),(68,1,111,1,'comment','2017-03-23 16:25:34'),(69,1,112,1,'comment','2017-03-23 16:25:39'),(70,1,113,1,'comment','2017-03-23 16:38:51'),(71,1,114,1,'comment','2017-03-23 16:38:56'),(72,1,115,1,'comment','2017-03-23 16:40:16'),(73,1,116,1,'comment','2017-03-23 16:40:20'),(74,1,117,1,'comment','2017-03-23 16:42:12'),(75,1,118,1,'comment','2017-03-23 16:42:15'),(76,1,119,1,'comment','2017-03-24 05:26:11'),(77,1,120,1,'comment','2017-03-24 05:26:37'),(78,1,121,1,'comment','2017-03-24 05:27:06'),(79,1,124,1,'comment','2017-03-24 07:14:21'),(80,1,125,1,'comment','2017-03-24 07:15:13'),(81,1,126,1,'comment','2017-03-24 07:15:20'),(82,1,129,1,'comment','2017-03-24 07:55:02'),(83,1,130,1,'comment','2017-03-24 07:55:44'),(84,1,131,1,'comment','2017-03-24 07:56:45'),(85,1,132,1,'comment','2017-03-24 07:56:57'),(86,1,133,1,'comment','2017-03-24 07:57:02'),(87,1,134,1,'comment','2017-03-24 11:30:09'),(88,1,135,1,'comment','2017-03-24 12:16:05'),(89,1,136,1,'comment','2017-03-24 12:16:14'),(90,1,137,1,'comment','2017-03-24 12:16:15'),(91,1,138,1,'comment','2017-03-24 12:16:17'),(92,1,139,1,'comment','2017-03-24 12:16:18'),(93,1,140,1,'comment','2017-03-24 12:16:19'),(94,1,141,1,'comment','2017-03-24 12:16:35'),(95,1,142,1,'comment','2017-03-24 12:16:35'),(96,1,143,1,'comment','2017-03-24 16:35:04'),(97,1,144,1,'comment','2017-03-24 16:36:48'),(100,1,147,1,'comment','2017-03-24 16:38:46'),(101,1,148,1,'comment','2017-03-24 16:40:03'),(102,1,149,1,'comment','2017-03-24 16:41:18'),(103,1,150,1,'comment','2017-03-24 16:42:12'),(104,1,151,1,'comment','2017-03-24 16:42:49'),(105,1,152,1,'comment','2017-03-24 16:43:08'),(106,1,153,1,'comment','2017-03-24 16:43:45'),(107,1,154,1,'comment','2017-03-24 16:44:12'),(108,1,155,1,'comment','2017-03-24 16:46:23'),(109,1,156,1,'comment','2017-03-24 16:46:38'),(110,1,157,1,'comment','2017-03-24 16:48:09'),(111,1,158,1,'comment','2017-03-24 16:55:09'),(112,1,159,1,'comment','2017-03-24 16:56:07'),(113,1,160,1,'comment','2017-03-24 16:56:53'),(114,1,161,1,'comment','2017-03-24 16:57:41'),(115,1,162,1,'comment','2017-03-24 16:57:55'),(116,1,163,1,'comment','2017-03-24 16:58:13'),(117,1,164,1,'comment','2017-03-24 16:58:36'),(118,1,165,1,'comment','2017-03-24 16:58:41'),(119,1,166,1,'comment','2017-03-24 17:02:10'),(120,1,167,1,'comment','2017-03-24 17:02:14'),(121,1,168,1,'comment','2017-03-24 17:02:38'),(122,1,169,1,'comment','2017-03-24 17:07:35'),(123,1,170,1,'comment','2017-03-24 17:08:02'),(124,1,171,1,'comment','2017-03-24 17:08:59'),(125,1,172,1,'comment','2017-03-24 17:09:22'),(126,1,173,1,'comment','2017-03-24 17:09:44'),(127,1,174,1,'comment','2017-03-24 17:10:41'),(128,1,175,1,'comment','2017-03-24 17:24:26'),(129,1,176,1,'comment','2017-03-24 17:25:02'),(130,1,177,1,'comment','2017-03-24 17:26:01'),(131,1,178,1,'comment','2017-03-24 17:26:07'),(132,1,179,1,'comment','2017-03-24 17:26:31'),(133,1,180,1,'comment','2017-03-24 17:26:36'),(134,1,181,1,'comment','2017-03-24 17:27:30'),(135,1,182,1,'comment','2017-03-24 17:27:42'),(136,1,183,1,'comment','2017-03-24 17:32:19'),(137,1,184,1,'comment','2017-03-24 17:32:28'),(138,1,185,1,'comment','2017-03-24 17:32:33'),(139,1,186,1,'comment','2017-03-24 17:32:45'),(140,1,187,1,'comment','2017-03-24 17:32:45'),(141,1,188,1,'comment','2017-03-24 17:32:51'),(142,1,189,1,'comment','2017-03-24 17:32:51'),(143,1,190,1,'comment','2017-03-24 17:32:57'),(144,1,191,1,'comment','2017-03-24 17:32:57'),(145,1,192,1,'comment','2017-03-24 17:32:58'),(146,1,193,1,'comment','2017-03-24 17:32:58'),(147,1,194,1,'comment','2017-03-24 17:32:58'),(148,1,195,1,'comment','2017-03-24 17:32:59'),(149,1,196,1,'comment','2017-03-24 17:32:59'),(150,1,197,1,'comment','2017-03-24 17:33:56'),(151,1,198,1,'comment','2017-03-24 17:34:19'),(152,1,199,1,'comment','2017-03-24 17:34:40'),(153,1,200,1,'comment','2017-03-24 17:34:45'),(154,1,201,1,'comment','2017-03-24 17:35:03'),(155,1,202,1,'comment','2017-03-24 17:35:27'),(156,1,203,1,'comment','2017-03-24 17:35:31'),(157,1,204,1,'comment','2017-03-24 17:36:22'),(158,1,205,1,'comment','2017-03-24 17:36:29'),(159,1,206,1,'comment','2017-03-24 17:38:03'),(160,1,207,1,'comment','2017-03-24 17:38:11'),(161,1,208,1,'comment','2017-03-26 03:34:03'),(162,1,209,11,'comment','2017-03-26 03:34:46'),(163,1,210,11,'comment','2017-03-26 03:50:43'),(164,1,211,11,'comment','2017-03-26 03:50:56'),(165,1,212,11,'comment','2017-03-26 03:53:56'),(166,1,213,11,'comment','2017-03-26 03:54:00'),(167,1,214,11,'comment','2017-03-26 03:57:54'),(168,1,215,11,'comment','2017-03-26 03:58:01'),(169,1,216,11,'comment','2017-03-26 03:58:07'),(170,1,217,1,'comment','2017-03-26 03:59:27'),(171,1,218,1,'comment','2017-03-26 03:59:34'),(172,1,219,1,'comment','2017-03-26 03:59:35'),(173,1,220,1,'comment','2017-03-26 03:59:37'),(174,1,221,1,'comment','2017-03-26 04:23:21'),(175,1,222,1,'comment','2017-03-26 04:23:26'),(176,1,223,1,'comment','2017-03-26 04:23:34');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=293 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `photos`
--

LOCK TABLES `photos` WRITE;
/*!40000 ALTER TABLE `photos` DISABLE KEYS */;
INSERT INTO `photos` VALUES (0,'/uploads/default.png',NULL,1),(125,'/uploads/53_0.jpg',53,1),(126,'/uploads/53_1.jpg',53,0),(127,'/uploads/53_2.jpg',53,3),(128,'/uploads/53_3.jpg',53,2),(129,'/uploads/54_0.jpg',54,0),(130,'/uploads/54_1.jpg',54,2),(131,'/uploads/54_2.jpg',54,1),(132,'/uploads/54_3.jpg',54,3),(133,'/uploads/54_4.jpg',54,4),(134,'/uploads/55_0.png',55,1),(135,'/uploads/55_1.jpg',55,2),(136,'/uploads/55_2.jpg',55,0),(137,'/uploads/56_0.jpg',56,1),(138,'/uploads/56_1.jpg',56,2),(139,'/uploads/56_2.jpg',56,0),(140,'/uploads/42_0.jpg',42,0),(141,'/uploads/42_1.jpg',42,1),(142,'/uploads/42_2.jpg',42,2),(143,'/uploads/58_0.jpg',58,1),(144,'/uploads/58_1.jpg',58,0),(145,'/uploads/53_4.jpg',53,5),(146,'/uploads/53_5.jpg',53,4),(218,'/uploads/69_0.png',69,0),(248,'/uploads/70_ixvsayabxuvj9k9.png',70,0),(249,'/uploads/70_h5lbt72gz625u3di.png',70,1),(250,'/uploads/70_0l94naknv84r6bt9.png',70,2),(251,'/uploads/71_f8hmppim964oyldi.png',71,0),(252,'/uploads/71_e81gl8onk7rv0a4i.png',71,2),(253,'/uploads/71_f32xxij2ma1t6gvi.png',71,1),(254,'/uploads/16_k7bltuyjecplow29.jpg',16,1),(255,'/uploads/16_jd7xw6ndmpfogvi.jpg',16,0),(256,'/uploads/16_5ufkbi4mudhadcxr.jpg',16,2),(257,'/uploads/37_66w1cbs2dvb49529.jpg',37,0),(258,'/uploads/34_0rls0fdy3bit3xr.jpg',34,0),(259,'/uploads/34_o48sojtcwc3j714i.jpg',34,1),(260,'/uploads/38_rutwqn6kyqdm42t9.jpg',38,0),(261,'/uploads/38_mqkwhc5cqhq6w29.jpg',38,1),(262,'/uploads/36_n5otqwj0q42yy14i.jpg',36,0),(263,'/uploads/73_z5f2lcxxvvnxko6r.png',73,0),(264,'/uploads/13_pyr5ryk1419py14i.jpg',13,0),(265,'/uploads/74_rtivjl3x2sm7vi.jpg',74,0),(266,'/uploads/74_23glferrmhzadcxr.jpg',74,1),(267,'/uploads/74_1l4srqynpn0l766r.jpg',74,2),(268,'/uploads/75_7i3dw4l3m4r0ms4i.jpg',75,0),(269,'/uploads/75_h64flu9a71awnrk9.jpg',75,1),(270,'/uploads/75_dak84k3zoofg8pvi.jpg',75,2),(271,'/uploads/17_kbvccx9ds8y6i529.jpg',17,0),(272,'/uploads/17_n9jtcvx8bv3x47vi.jpg',17,1),(273,'/uploads/18_dex3uk6myy3z0k9.jpg',18,0),(274,'/uploads/18_j12f5k937qarlik9.jpg',18,1),(275,'/uploads/19_6v77m67fv0c9dx6r.jpg',19,1),(276,'/uploads/19_p7twny7db4lyds4i.jpg',19,0),(277,'/uploads/22_4oi2khe4v8mjwcdi.jpg',22,0),(278,'/uploads/22_sui2m2wo4zzuayvi.jpg',22,1),(279,'/uploads/76_qvhysetnsgtit3xr.jpg',76,0),(280,'/uploads/76_fdv5cgqgffe3tyb9.jpg',76,1),(283,'/uploads/77_wexrra6szrpphkt9.jpg',77,0),(284,'/uploads/80_0iufqq03dwy7gb9.jpg',80,0),(285,'/uploads/80_m2wqxi7112nsif6r.jpg',80,1),(286,'/uploads/80_w4ic9osog1yeewmi.jpg',80,2),(287,'/uploads/81_xrjofgma84mwjyvi.jpg',81,0),(288,'/uploads/82_x8hqb1or0eezh0k9.jpg',82,0),(289,'/uploads/82_wlpbm2d8y7kl0udi.jpg',82,1),(290,'/uploads/83_fls52v9kuho7p66r.jpg',83,0),(291,'/uploads/83_fxvei9se7i6vquxr.jpg',83,1),(292,'/uploads/83_gbmtntjw0bervn29.jpg',83,2);
/*!40000 ALTER TABLE `photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reports` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `author` int(10) unsigned DEFAULT NULL,
  `suggestion` int(10) unsigned DEFAULT NULL,
  `comment` bigint(20) unsigned DEFAULT NULL,
  `tag` int(10) unsigned DEFAULT NULL,
  `message` varchar(256) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `author` (`author`),
  KEY `suggestion` (`suggestion`),
  KEY `comment` (`comment`),
  KEY `tag` (`tag`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`author`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`suggestion`) REFERENCES `suggestions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reports_ibfk_3` FOREIGN KEY (`comment`) REFERENCES `comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reports_ibfk_4` FOREIGN KEY (`tag`) REFERENCES `tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `suggestionTags`
--

LOCK TABLES `suggestionTags` WRITE;
/*!40000 ALTER TABLE `suggestionTags` DISABLE KEYS */;
INSERT INTO `suggestionTags` VALUES (53,10),(74,10),(75,10),(16,11),(17,11),(22,11),(38,11),(53,11),(56,11),(71,11),(74,11),(75,11),(76,11),(13,12),(16,12),(17,12),(34,12),(54,12),(58,12),(73,12),(75,12),(77,12),(83,12),(53,13),(54,13),(75,13),(56,14),(58,15),(42,16),(78,16),(79,16),(80,16),(16,17),(22,17),(37,18),(37,19),(13,20),(34,20),(73,20),(38,21),(36,25),(39,25),(76,25),(17,26),(75,26),(76,26),(18,27),(19,27),(55,27),(19,30),(81,42),(82,43);
/*!40000 ALTER TABLE `suggestionTags` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suggestions`
--

LOCK TABLES `suggestions` WRITE;
/*!40000 ALTER TABLE `suggestions` DISABLE KEYS */;
INSERT INTO `suggestions` VALUES (2,'Lycee de la Mer','C\'etait mon lycee',446432394,-10587611,1,0,1,'2017-01-29 10:43:53',1),(3,'Lycee Camille Jullian','La ou j\'ai fait prepa',448451636,-5916202,0,0,1,'2017-01-29 10:43:53',1),(5,'Telecom Saint-Etienne','Mon ecole d\'inge',454524699,43879330,0,0,1,'2017-01-29 10:43:53',1),(6,'La dune du Pilat','La dune du Pilat, située en bordure du massif forestier des Landes de Gascogne sur la côte d\'Argent à l\'entrée du bassin d\'Arcachon, est la plus haute dune d’Europe.',445966256,-12093618,0,0,1,'2017-01-29 10:43:53',1),(7,'Le Cabanon','Dans un style cabane de plage, ce restaurant propose des produits \"terre et mer\" du terroir et du vin local.',446390118,-11195594,0,0,1,'2017-01-29 10:43:53',1),(8,'La Vache sur le Toit','Le restaurant ne se veut pas gastronomique mais les plats proposés sont simples et bons. La viande est bonne et les frites fraîches délicieuses ! Le personnel est sympa et plutot eficace.',446379485,-11126554,0,0,1,'2017-01-29 10:43:53',1),(9,'La dune du Pilat via la Corniche','Le parking de la Corniche est gratuit. L\'acces a la dune est gratuit mais les escaliers en bois pour descendre de la Corniche sont mal entretenus.',446022890,-12103951,0,0,1,'2017-01-29 10:43:53',1),(10,'Observatoire Sainte Cecile','L\'observatoire de Sainte Cécile est une tour métallique surplombée d\'une plate forme d\'observation qui vous permettra de voir un panoramique sur tout le Bassin d\' Arcachon. D\'accès gratuit et relativement aisé, elle est un atout historique et touristique de la ville d\' Arcachon à visiter absolument.',446594630,-11753869,0,0,1,'2017-01-29 10:43:53',1),(12,'Cinéma Gérard-Philipe','Une salle de cinema.',446394028,-11119688,0,0,1,'2017-01-29 10:43:53',1),(13,'Pizza Hume','Pizzas à emporter à deux pas de la plage et des campings de La Hume à Gujan Mestras dans le bassin d’Arcachon en Gironde.',446388761,-11139402,1,0,1,'2017-01-29 10:43:53',1),(14,'Bistro\'50','Le Bistro\'50 est un restaurant bistronomique situé près de la plage de la Hume à Gujan-Mestras. Ouvert toute l\'année ! Découvrez la cuisine de son Chef !',446432846,-11141950,0,0,1,'2017-01-29 10:43:53',1),(15,'Mini Phare de la Hume','Belle vue sur le bassin et le port de la Hume.',446431777,-11171293,0,0,1,'2017-01-29 10:43:53',1),(16,'Tennis Club de Gujan-Mestras','A deux pas du bassin d’Arcachon, le Tennis Club de Gujan-Mestras, accessible par la piste cyclable, vous accueille tout au long  de l’année et vous propose des installations sportives qui  sauront vous satisfaire.',446249829,-11074170,1,0,1,'2017-01-29 10:43:53',1),(17,'Golf Blue Green Gujan-Mestras','Un parcours ludique de notoriété internationale alliant difficulté technique et tracé esthétique. Comme les célèbres parcours de Floride, le golf de Gujan épouse au mieux la nature qui l’environne : forêt de pins, lacs et bunkers de sable blanc sont les éléments d’un décor grandiose qui inspire l’exploit.',446034851,-10906090,1,0,1,'2017-01-29 10:43:53',1),(18,'Kid Parc','Kid Parc est un parc d\'attractions français pour les enfants de 0 à 12 ans, créé par J.L.G Promotion et Reverchon Industries en 2000.',446220348,-11061510,1,0,11,'2017-01-29 10:43:53',1),(19,'Aqualand Bassin d\'Arcachon','Aqualand est une chaîne européenne de parcs aquatiques. Elle appartient depuis 1999 au groupe espagnol Aspro-Ocio.',446181496,-11015083,1,0,1,'2017-01-29 10:43:53',1),(20,'Casino de Gujan-Mestras','Traversez l\'allée de palmiers et pénétrez dans le Casino de Gujan-Mestras : 21 tables de Poker, 105 machines à sous, 3 salles de Jeux',446158356,-10945988,0,0,1,'2017-01-29 10:43:53',1),(21,'Au P\'tit Creux du Bassin','Peut-être le meilleur snack Kebab du Bassin d\'Arcachon, Sud Gironde et Nord des Landes.',446387005,-10635227,0,0,1,'2017-01-29 10:43:53',1),(22,'Tennis Club d\'Arcachon','Avec ses 22 courts sur 3 hectares, au cœur verdoyant du parc Pereire, et à 100 mètres de la plage, le Tennis Club d\'Arcachon est l\'un des plus beaux de France',446509405,-11898655,1,0,1,'2017-01-29 10:43:53',1),(23,'Grand Écran La Teste','Plein de salles',446378226,-11545783,0,0,1,'2017-01-29 10:43:53',1),(24,'Parc Mauresque','Créé en 1863 par Paul Regnauld, il servait d’écrin au Casino Mauresque. Ses 4 hectares, plantés d’espèces rares, surplombent la ville. ',446582958,-11730212,0,0,1,'2017-01-29 10:43:53',1),(25,'Casino de la Plage','Dans le magestueux château Deganne le Casino fait se cotoyer machines à sous, jeux traditionnels, restaurant, animations, réceptions...',446628670,-11644515,0,0,1,'2017-01-29 10:43:53',1),(26,'Jetee Thiers','avancée sur la mer agréable pour admirer le paysage , la mer et la ville la plage. s\'assoir sur un banc.',446648844,-11687645,0,0,1,'2017-01-29 10:43:53',1),(27,'Port d\'Arcachon','Il est le seul port en eau profonde du Bassin et le second port de plaisance de la Côte Atlantique, avec 2 600 anneaux.\r\n\r\nDepuis 2007, il accueille un quai patrimoine réservé aux bateaux traditionnels du Bassin : pinasses, loups, vieux gréements…\r\n\r\nL’entrée du Port est marquée par la présence du Monument des Péris en mer, créé par Claude Bouscau, sculpteur récompensé du Grand Prix de Rome (1935). Selon l’angle sous lequel on la regarde, la sculpture prend soit la forme d’une croix, soit d’une ancre. ',446599080,-11477709,2,2,1,'2017-01-29 10:43:53',1),(34,'Donato Pizza','Chez Donato Pizza, les pizzerias sont fondamentalement généreuses. Les recettes classiques des pizzas sont en bonne place sur la carte. On relève même des marques d\'originalité à travers les créole, provençale, la Stéphanoise et les pizzas base crème. Le restaurant propose aussi des lasagnes, et toute la carte est à emporter ! Donato Pizza diffuse régulièrement des matchs de foot. Le seul bémol : la salle, assez grande, peut se révéler bruyante quand le restaurant est très fréquenté.',454546557,43826732,1,0,1,'2017-01-29 10:43:53',1),(35,'Harmonie de Côte Chaude','Vous pratiquez un instrument et vous recherchez un orchestre, n\'hésitez plus et rejoignez l\'Harmonie de Côte Chaude !\r\nRépétitions tous les lundis entre 20H et 22H au 33 rue Charles Floquet à Saint-Etienne.',454431614,43696819,0,0,1,'2017-01-29 10:43:53',1),(36,'Casino supermarché Saint-Etienne','Casino Supermarchés est un magasin à proximité de chez vous et c’est LA solution pour faire ses courses en se faisant plaisir ! C’est toujours plus de choix sur des produits de consommation courante mais aussi sur des produits gourmands ou « plaisir ». Ses rayons frais, épicerie, parfumerie et sans oublier la cave. La relation avec notre clientèle est une priorité. Nous sommes des commerçants au service de nos clients, pour leur donner le meilleur confort d’achat et limiter leur attente en caisse.',454543472,43832445,1,0,1,'2017-01-29 10:43:53',1),(37,'Gare de Lyon-Saint-Exupéry TGV','La gare de Lyon-Saint-Exupéry TGV, anciennement Satolas-TGV, est une gare ferroviaire française TGV, située sur le territoire de la commune de Colombier-Saugnieu, dans le département du Rhône, en région Auvergne-Rhône-Alpes.',457210613,50754932,1,0,1,'2017-01-29 10:43:53',1),(38,'Stade Geoffroy-Guichard','Le stade Geoffroy-Guichard, surnommé « le Chaudron » est un stade sportif français situé à Saint-Étienne, construit en 1930. Il est situé au nord de la ville dans le quartier de Carnot Le Marais.\r\n\r\nC\'est le stade où se jouent les matchs de football de l\'AS Saint-Étienne. À l\'origine, il s\'agit d\'un vaste terrain de 40 000 m2 acheté par Geoffroy Guichard, fondateur des magasins Casino, qui désirait un stade pour son équipe. Il est inauguré en 1931 et comprend à l\'époque une piste d\'athlétisme et une tribune principale de 1 000 places. Au fur et à mesure du temps et des succès de son club résident, l\'enceinte est agrandie et rénovée plusieurs fois. Les derniers travaux de rénovation en vue de l\'Euro 2016 portent sa capacité à 41 9652 places. Il est le septième stade français en nombre de places assises. Le stade peut également accueillir diverses manifestations (matchs de rugby à XV, concerts).',454607327,43901163,2,0,1,'2017-01-29 10:43:53',1),(39,'Guitare Avenue','Votre magasin spécialisé en guitares, basses,\r\namplis, effets et accessoires sur saint-etienne.',454613676,43811953,1,0,1,'2017-01-29 10:43:53',1),(40,'Palais des Spectacles','Centre Des Congres De Saint Etienne - Saint Etienne : Retrouvez tous les concerts, festivals, spectacles et reservez vos places.',454510770,43927181,0,0,1,'2017-01-29 10:43:53',1),(41,'Café Saint-Jacques','Situé au cœur du centre ville de Saint-Etienne, le bar est dans une rue piétonne haut lieu des fêtards stéphanois. Dans ce café, se retrouvent les étudiants, les commerçants, les jeunes et les cadres dynamiques autour d\'un verre de vin sélectionné avec la plus grande attention par le patron, une planche de charcuterie ou de fromage, un cocktail...\r\n\r\nNous avons deux salles pour vous accueillir : la première en bas à coté du bar avec 2 écrans pour la retransmission des matchs de l\'ASSE. L\'autre salle à l\'étage plus cosy avec canapé et un écran.\r\n\r\nNous avons aussi deux terrasses : la première situé dans la rue piétonne de la rue des Martyrs de Vingré et la seconde une tropézienne privatisable sur le Toit de Saint-Jacques pour l\'organisation de vos soirées privées (enterrement de vie de garçon, enterrement de vie de jeune fille, soirée d\'anniversaire, lancement produit). A votre disposition un barman pour vous servir, une sono, une plancha, un écran avec possibilité de retransmission de rencontres sportives. Coté restauration nous travaillons avec les commerçants du quartier (pizza, mini burger, verrines, sushi, plateaux de charcuterie...).',454363759,43900982,0,0,1,'2017-01-29 10:43:53',1),(42,'Soggy Bottom','En plein centre ville, avec un large choix de bière pression et bouteilles à prix très abordable.\nOn y trouve, entre autre, la Glutte (bière locale brassée à la houblonnerie).\nBillard gratuit, retransmission des matchs de foot, concerts, happy hour tous les soirs de 19h à 20h...\nTester le Soggy, c\'est l\'adopter comme QG de toutes vos bonnes soirées ;)\n',454396544,43858409,1,1,1,'2017-01-29 10:43:53',1),(43,'Théâtre Le Verso','Salle de theatre...',454376811,44055954,1,0,1,'2017-01-29 10:43:53',1),(44,'Opéra de Saint-Étienne','L’Opéra de Saint-Étienne est situé au cœur du Jardin des plantes à Saint-Étienne. C’est un théâtre à l\'italienne moderne, qui est la dixième salle d’opéra de France par sa fréquentation et qui est membre de la ROF.',454337324,43977915,0,0,1,'2017-01-29 10:43:53',1),(45,'Multifood Saint Etienne','Restaurant diversifié, sert de l\'hamburger à la pizza en passant par les buckets et les grillades !\nCadre convivial, salle de 300mètres carré !',454573613,44225550,0,1,1,'2017-01-29 10:43:53',1),(52,'La Maison de l\'Huitre','Située à Gujan-Mestras, la capitale de l’ostréiculture du Bassin d’Arcachon, La Maison de l’Huître vous invite à découvrir le métier d’ostréiculteur, les techniques d’élevage ainsi que l’histoire de l’huître au fil des siècles.\n\nAvec ses 7 ports le long de sa façade maritime, les nombreuses exploitations ostréicoles, le lycée de la mer, les cabanes traditionnelles et les dégustations d’huîtres, Gujan-Mestras est la capitale de l’ostréiculture du Bassin d’Arcachon.',446413609,-10724115,1,0,1,'2017-02-12 17:56:11',1),(53,'Pra Loup','Pra-Loup est une station de ski des Alpes du Sud. Elle est située sur la commune d\'Uvernet-Fours, à 7 km de Barcelonnette, dans la vallée de l\'Ubaye. Pra-Loup est une station de ski des Alpes du Sud. Elle est située sur la commune d\'Uvernet-Fours, à 7 km de Barcelonnette, dans la vallée de l\'Ubaye. Pra-Loup est une station de ski des Alpes du Sud. Elle est située sur la commune d\'Uvernet-Fours, à 7 km de Barcelonnette, dans la vallée de l\'Ubaye.',443686401,66007233,3,0,1,'2017-02-23 17:44:42',1),(54,'La Plancha','Appartements style \"Appart\'hôtel\" au centre de Barcelonnette, décoration lumineuse.\r\n\r\nNos appartements surplombent la place Manuel, célèbre pour accueillir les festivités Latino-Mexicaines en été et son charme hivernale pour ses décorations lumineuses.\r\n\r\nAu cœur même de toutes les commodités offertes par ce charmant village, nos appartements vous feront accéder au confort, tout en bénéficiant de l\'ambiance de Barcelonnette.',443877515,66543138,2,0,1,'2017-02-23 17:58:21',1),(55,'Jungle Parc','Amateurs de sensations fortes, entre amis ou en famille, venez découvrir nos parcours aventure au milieu d\'une magnifique forêt de 3 hectares.\n\nDécouvrez nos parcours en totale sécurité avec notre nouveau système Bornack. Vous restez toujours attaché au câble de sécurité, tout en gardant la manipulation de vos mousquetons.',443865535,66252816,2,0,1,'2017-02-23 18:06:19',1),(56,'Bowling de l\'Ubaye','Le bowling de Barcelonnette/Pra-Loup vous accueille pour des moments de plaisir et de divertissement en famille ou entre amis. Situé à 2km de Barcelonnette, 7km de Pra-Loup 1600, 7km du Sauze, Frédérique et Sébastien vous accueillent dans un lieu de détente à l\'ambiance chaleureuse, montagnarde et musicale.',443756497,66265154,2,0,1,'2017-02-23 18:09:24',1),(58,'Big Burger','« Un super fast food où les sandwiches sont hyper garnis, avec des saveurs originales et où on a l\'impression que c\'est frais... »\r\nMarie E.\r\n\r\n« De passage à Saint Étienne j\'ai été surpris de voir un vrai fast food à l\'américain hallal. Et assez bon en plus. Le choix de Burger est assez variés. »\r\nHamza S.',454508472,43902598,1,1,1,'2017-03-05 14:55:46',1),(69,'asasdfas','asdfsdafasdf',454553745,44002819,1,0,11,'2017-03-09 06:22:26',1),(70,'asdfasdf','sdfsdfasdf',652198939,-274218750,1,0,14,'2017-03-09 06:35:48',0),(71,'test','asdfasdfasdfasdf',454516716,43692970,1,0,11,'2017-03-10 13:41:32',0),(73,'Station Pizza','Cuisine fusion est depuis plus de 20 ans, le spécialiste de la restauration rapide et de la livraison à domicile.\r\nEnvie d’une pizza, d’un hamburger frites, de morceaux de poulets panés, de pâtes bolognaises, d’un sandwich, d’une salade composée, d’un plateau sushi, d’un véritable couscous, d’un produit tex mex…\r\nDécouvrez les cartes de  nos restaurants et  nos zones de livraison.',454441836,43859106,1,0,1,'2017-03-11 14:04:59',1),(74,'Station Chalmazel','Chalmazel ou Chalmazel - Pierre-sur-Haute est une station de sports d\'hiver du Massif central située sur le territoire de la commune de Chalmazel-Jeansagnière, dans le département de la Loire, en région Auvergne-Rhône-Alpes.',456768015,38269758,1,2,1,'2017-03-11 14:17:57',1),(75,'Tignes','Station de ski de Tignes dans les Alpes en Savoie. Vacances en montagne hiver et été dans une grande station de ski avec de nombreuses activités : ski freeride, freestyle, VTT, golf… Réservez en ligne votre séjour au ski : hébergement, école de ski, location de ski, parking, forfait... Consultez la webcam et la météo.',454683326,69055724,1,0,1,'2017-03-11 14:31:05',1),(76,'Golf Station','Un magasin de golf lumineux et spacieux sur plus de 300 m², \r\nsitué proche du golf de St Étienne dans la Loire. \r\nUne ambiance claire et contemporaine dédiée à notre passion du golf. \r\nFrancis et Vincent vous accueillent et vous conseillent dans \r\nle choix de votre matériel et des accessoires indispensables au golfeur, neufs et d\'occasion : larges gammes de chariots électriques, balles, clubs, vêtements, chaussures de golf...\r\nAvec les plus grandes marques représentées en rayon : Clubs de golf Wilson, Titleist, Cobra, Mizuno, Taylor Made, Callaway, Nike, Adams, Ping... Chariots Trolem, Motocaddy, Powakaddy, Mocad, Jucad... \r\nVêtements de golf Foot-Joy, Röhnisch, Golfino, Puma, Adidas... Chaussures Foot Joy, Puma, Ecco, Adidas, Nike, Duca Del Cosma... ',454474680,43825310,0,1,1,'2017-03-16 16:19:08',1),(77,'La Taverne de Maitre Kanter','asdfsdfsdfsdff',454426879,43986471,1,0,1,'2017-03-18 10:20:30',1),(78,'Le Candy\'s','Ventes de repas et boissons sur place et a emporter, organisations d\'événements.',454455156,43860474,1,0,1,'2017-03-18 14:09:22',1),(79,'Bar Pub Le P\'tit Prince','Le café bar est un lieu où il fait bon être à boire une bonne consommation en bonne compagnie.',454481369,43879236,1,0,1,'2017-03-18 14:11:47',1),(80,'The Smoking Dog','Rentrer dans The Smoking Dog, c\'est un peu comme retrouver un petit coin de Grande-Bretagne ! Le pub est petit mais chaleureux, et accueillera le visiteur par une carte dans la langue de Shakespeare écrite à la craie sur un tableau noir et par une multitude de chiens : fumant, buvant, menant une vie de gentleman. Pour rester en Perfide Albion, The Smoking Dog retransmet la Premiere\'s League mais aussi la Ligue 1. Le cadre est rustique et confortable : des étagères et des bibliothèques pleines de livres sont à portée de main, et pour ceux qui ne souhaitent pas lire, on trouve des jeux d\'échecs, de dames, de fléchettes et même un piano. Le reproche que l\'on pourrait faire à ce pub - car comme disent les Britanniques, nobody\'s perfect ? Sa petite taille, qui fait que ceux qui arriveront tard en fin de semaine pourront se sentir à l\'étroit.',454364150,43902690,1,0,1,'2017-03-18 14:16:27',1),(81,'Avatacar Saint-Etienne','Garagiste et centre auto Garage',454628033,43998098,1,0,1,'2017-03-18 14:22:08',1),(82,'La Platine de la Cité du Design','La tour observatoire est couverte de LED modulables en intensité et programmables pour des effets artistiques. L\'ensemble n\'a qu\'une puissance équivalente à celle d\'une machine à laver. Le système d\'éclairage est désactivé une partie de la nuit.',454508938,43854359,1,0,1,'2017-03-18 15:24:07',1),(83,'Restaurant La Platine','Le restaurant La Platine est ouvert tout au long de l\'année. Il se trouve au cœur de la Cité du Design de Saint-Etienne. Longée par une serre, la salle offre un vaste espace mêlant le verre, l’acier et le bois. \n\nDans une ambiance détendue et conviviale, le restaurant vous propose une carte d’une cuisine traditionnelle pour le déjeuner. Les différentes formules  s’adaptent aussi bien aux étudiants qu’aux professionnels des alentours.\n\nNotre chef Didier Crozat vous propose chaque jour une carte différente exclusivement élaborée avec des produits frais de saison. Ainsi, tous les jours nous vous proposons 5 entrées, 3 plats et 5 desserts. Notre chef décrit sa cuisine comme une « cuisine de saison, instinctive et créative ».\n',454502270,43856988,2,0,1,'2017-03-18 15:31:02',1);
/*!40000 ALTER TABLE `suggestions` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tags`
--

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
INSERT INTO `tags` VALUES (27,'Amusement Park'),(16,'Bar'),(14,'Bowling'),(42,'Car Dealer'),(15,'Fast Food'),(26,'Golf'),(13,'Hotel'),(24,'Lol'),(20,'Pizza'),(12,'Restaurant'),(10,'Skiing'),(21,'Soccer'),(11,'Sports'),(25,'Store'),(17,'Tennis'),(23,'Test'),(18,'Train Station'),(19,'Transports'),(43,'Vantage Point'),(30,'Water Park');
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `userNotifications`
--

DROP TABLE IF EXISTS `userNotifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `userNotifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user` int(10) unsigned NOT NULL,
  `notification` int(10) unsigned NOT NULL,
  `seen` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user` (`user`),
  KEY `notification` (`notification`),
  CONSTRAINT `userNotifications_ibfk_1` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `userNotifications_ibfk_2` FOREIGN KEY (`notification`) REFERENCES `notifications` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=182 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userNotifications`
--

LOCK TABLES `userNotifications` WRITE;
/*!40000 ALTER TABLE `userNotifications` DISABLE KEYS */;
INSERT INTO `userNotifications` VALUES (68,1,63,1),(69,1,64,1),(70,1,65,1),(71,1,66,1),(72,1,67,1),(73,1,68,0),(74,1,69,0),(75,1,70,0),(76,1,71,0),(77,1,72,0),(78,1,73,0),(79,1,74,0),(80,1,75,0),(81,1,76,0),(82,1,77,0),(83,1,78,0),(84,1,79,0),(85,1,80,0),(86,1,81,0),(87,1,82,0),(88,1,83,0),(89,1,84,0),(90,1,85,0),(91,1,86,0),(92,1,87,0),(93,1,88,0),(94,1,89,0),(95,1,90,0),(96,1,91,0),(97,1,92,0),(98,1,93,0),(99,1,94,0),(100,1,95,0),(101,1,96,0),(102,1,97,0),(105,1,100,0),(106,1,101,0),(107,1,102,0),(108,1,103,0),(109,1,104,0),(110,1,105,0),(111,1,106,0),(112,1,107,0),(113,1,108,0),(114,1,109,0),(115,1,110,0),(116,1,111,0),(117,1,112,0),(118,1,113,0),(119,1,114,0),(120,1,115,0),(121,1,116,0),(122,1,117,0),(123,1,118,0),(124,1,119,0),(125,1,120,0),(126,1,121,0),(127,1,122,0),(128,1,123,0),(129,1,124,0),(130,1,125,0),(131,1,126,0),(132,1,127,0),(133,1,128,0),(134,1,129,0),(135,1,130,0),(136,1,131,0),(137,1,132,0),(138,1,133,0),(139,1,134,0),(140,1,135,0),(141,1,136,0),(142,1,137,0),(143,1,138,0),(144,1,139,0),(145,1,140,0),(146,1,141,0),(147,1,142,1),(148,1,143,0),(149,1,144,0),(150,1,145,0),(151,1,146,0),(152,1,147,0),(153,1,148,0),(154,1,149,0),(155,1,150,0),(156,1,151,0),(157,1,152,0),(158,1,153,0),(159,1,154,0),(160,1,155,0),(161,1,156,0),(162,1,157,0),(163,1,158,1),(164,1,159,1),(165,1,160,1),(166,1,161,0),(167,1,162,0),(168,1,163,0),(169,1,164,0),(170,1,165,0),(171,1,166,0),(172,1,167,0),(173,1,168,0),(174,1,169,0),(175,1,170,0),(176,1,171,0),(177,1,172,0),(178,1,173,0),(179,1,174,0),(180,1,175,0),(181,1,176,0);
/*!40000 ALTER TABLE `userNotifications` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `userTags`
--

LOCK TABLES `userTags` WRITE;
/*!40000 ALTER TABLE `userTags` DISABLE KEYS */;
INSERT INTO `userTags` VALUES (15,10),(1,11),(15,11),(1,12),(11,12),(11,21);
/*!40000 ALTER TABLE `userTags` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'jebouin','+1ohPBbE+LU5svEn8J/vNA==','2017-03-05 13:16:50'),(11,'test','uh6VnhO0FaGgwoPsZsol2A==','2017-03-05 14:48:04'),(12,'yes','CySriIW07ALPkxU2yms4HA==','2017-03-05 14:49:26'),(14,'mochipet','hT+4UnK+nhTNsrXtNWKa8g==','2017-03-07 05:15:37'),(15,'test2','zeyFLTcnyqzBbyzqmK6qPg==','2017-03-23 05:24:22');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=318 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `votes`
--

LOCK TABLES `votes` WRITE;
/*!40000 ALTER TABLE `votes` DISABLE KEYS */;
INSERT INTO `votes` VALUES (10,1,1,52,NULL),(13,-1,1,27,NULL),(15,1,1,13,NULL),(18,1,NULL,54,NULL),(19,1,1,54,NULL),(20,1,NULL,55,NULL),(21,1,NULL,56,NULL),(22,1,1,55,NULL),(23,1,1,56,NULL),(33,1,NULL,53,NULL),(39,-1,NULL,45,NULL),(40,1,NULL,42,NULL),(54,1,11,58,NULL),(60,1,1,43,NULL),(76,1,11,69,NULL),(77,1,14,70,NULL),(78,1,11,71,NULL),(83,1,1,16,NULL),(85,1,1,37,NULL),(87,1,11,53,NULL),(88,1,1,53,NULL),(90,1,1,36,NULL),(92,1,1,73,NULL),(94,1,1,75,NULL),(98,-1,11,74,NULL),(99,-1,14,74,NULL),(101,1,1,17,NULL),(102,1,11,18,NULL),(103,1,1,19,NULL),(104,1,1,39,NULL),(105,1,1,22,NULL),(107,1,1,77,NULL),(108,1,1,78,NULL),(109,1,1,79,NULL),(110,1,1,80,NULL),(111,1,1,81,NULL),(112,1,1,82,NULL),(117,1,1,38,NULL),(118,-1,1,76,NULL),(119,1,1,74,NULL),(120,-1,1,58,NULL),(122,1,11,83,NULL),(131,1,1,34,NULL),(132,-1,1,42,NULL),(134,1,1,83,NULL),(162,1,15,38,NULL),(305,1,11,NULL,215),(306,-1,11,NULL,214),(307,1,11,NULL,216),(308,1,1,NULL,217),(309,1,1,NULL,216),(310,1,1,NULL,218),(311,1,1,NULL,219),(312,1,1,NULL,220),(313,1,1,NULL,221),(315,1,1,NULL,214),(316,-1,1,NULL,222),(317,1,1,NULL,223);
/*!40000 ALTER TABLE `votes` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-03-26  6:58:45
