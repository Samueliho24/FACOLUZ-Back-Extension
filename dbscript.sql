/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: faco_luz_extension
-- ------------------------------------------------------
-- Server version	12.1.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `certificates`
--

CREATE DATABASE faco_luz_extension;

USE faco_luz_extension;

CREATE TABLE `certificates` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `studentId` uuid NOT NULL,
  `courseId` uuid NOT NULL,
  `date` date NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `certificates_students_FK` (`studentId`),
  KEY `certificates_courses_FK` (`courseId`),
  CONSTRAINT `certificates_courses_FK` FOREIGN KEY (`courseId`) REFERENCES `courses` (`id`),
  CONSTRAINT `certificates_students_FK` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

LOCK TABLES `certificates` WRITE;
/*!40000 ALTER TABLE `certificates` DISABLE KEYS */;
INSERT INTO `certificates` VALUES
('2a5095b5-1045-11f1-9f8d-106530499799','49c8680e-0f9a-11f1-9f8d-106530499799','0c346a18-09d0-11f1-a6b1-106530499799','2026-02-22');
/*!40000 ALTER TABLE `certificates` ENABLE KEYS */;
UNLOCK TABLES;

CREATE TABLE `changelogs` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `userId` int(11) UNSIGNED NOT NULL,
  `changeType` int(11) NOT NULL,
  `description` text NOT NULL,
  `create_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `courses` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `description` text NOT NULL,
  `state` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `create_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES
('0c346a18-09d0-11f1-a6b1-106530499799','Asistente de Higienista Dental','Activo','2026-02-14 18:05:36');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

CREATE TABLE `documents` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `studentId` uuid NOT NULL,
  `docType` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

CREATE TABLE `enrollments` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `studentId` uuid NOT NULL,
  `sectionId` uuid NOT NULL,
  `cohortId` uuid NOT NULL,
  `enrollmentType` enum('Regular','Repitiente') NOT NULL DEFAULT 'Regular',
  `parentEnrollmentId` uuid DEFAULT NULL COMMENT 'Si es repitiente, ID de la inscripcion original que reprobo',
  `dateEnrollments` datetime NOT NULL DEFAULT current_timestamp(),
  `status` enum('Pagada','Deuda') NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_student_enrollment` (`studentId`),
  CONSTRAINT `fk_student_enrollment` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


LOCK TABLES `enrollments` WRITE;
/*!40000 ALTER TABLE `enrollments` DISABLE KEYS */;
/*!40000 ALTER TABLE `enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enrollments_modules`
--

CREATE TABLE `enrollments_modules` (
  `enrollmentId` uuid NOT NULL,
  `moduleId` uuid NOT NULL,
  KEY `fk_enrollment` (`enrollmentId`),
  KEY `fk_module` (`moduleId`),
  CONSTRAINT `fk_enrollment` FOREIGN KEY (`enrollmentId`) REFERENCES `enrollments` (`id`),
  CONSTRAINT `fk_module` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


LOCK TABLES `enrollments_modules` WRITE;
/*!40000 ALTER TABLE `enrollments_modules` DISABLE KEYS */;
/*!40000 ALTER TABLE `enrollments_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `billableitem` enum('Inscripcion','Materia','Actividad especial','Reimpresion de certificado') NOT NULL,
  `chargedAmount` float NOT NULL,
  `date` datetime NOT NULL DEFAULT current_timestamp(),
  `comments` text DEFAULT NULL,
  `status` enum('Pendiente','Pagado') NOT NULL DEFAULT 'Pendiente',
  `StudentIdentification` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;


LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES
('a7dba523-0f9e-11f1-9f8d-106530499799','Inscripcion',10,'2026-02-21 23:29:11',NULL,'Pendiente',1111);
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules`
--

CREATE TABLE `modules` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `description` text NOT NULL,
  `create_at` datetime NOT NULL DEFAULT current_timestamp(),
  `state` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
INSERT INTO `modules` VALUES
('0c3dae7c-09d0-11f1-a6b1-106530499799','Nociones basicas de la Anatomia Dental y Oclusion','2026-02-14 18:05:36','Activo'),
('0c3db180-09d0-11f1-a6b1-106530499799','Realaciones Humanas','2026-02-14 18:05:36','Activo'),
('0c3db276-09d0-11f1-a6b1-106530499799','Sistema de Atencion Odontologica','2026-02-14 18:05:36','Activo'),
('0c3db2bc-09d0-11f1-a6b1-106530499799','Semiologia e Historia Clinica','2026-02-14 18:05:36','Activo'),
('0c3db2fa-09d0-11f1-a6b1-106530499799','Bioetica y Odontologia Legal','2026-02-14 18:05:36','Activo'),
('0c3db334-09d0-11f1-a6b1-106530499799','Bioseguridad y Esterilizacion en Odontologia','2026-02-14 18:05:36','Activo'),
('0c3db36b-09d0-11f1-a6b1-106530499799','Practica Profesional I','2026-02-14 18:05:36','Activo'),
('0c3db3ab-09d0-11f1-a6b1-106530499799','Asistencia de Procedimientos Clincos Odontologicos','2026-02-14 18:05:36','Activo'),
('0c3db3e8-09d0-11f1-a6b1-106530499799','Biomateriales Odontologicos','2026-02-14 18:05:36','Activo'),
('0c3db427-09d0-11f1-a6b1-106530499799','Nociones Basicas en Radiologia e Imagenologia Odontologica','2026-02-14 18:05:36','Activo'),
('0c3db45f-09d0-11f1-a6b1-106530499799','Epidemiologia y Sistema de informacion','2026-02-14 18:05:36','Activo'),
('0c3db495-09d0-11f1-a6b1-106530499799','Ingles Intrumental','2026-02-14 18:05:36','Activo'),
('0c3db4d1-09d0-11f1-a6b1-106530499799','Educacion y Promocion de la Salud Bucal','2026-02-14 18:05:36','Activo'),
('0c3db508-09d0-11f1-a6b1-106530499799','Fotografia Clinica y Marketing en Odontologia','2026-02-14 18:05:36','Activo'),
('0c3db53f-09d0-11f1-a6b1-106530499799','Practica Profesional II','2026-02-14 18:05:36','Activo'),
('0c3db578-09d0-11f1-a6b1-106530499799','Servicios Comunitario','2026-02-14 18:05:36','Activo');
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules_courses`
--

CREATE TABLE `modules_courses` (
  `moduleid` uuid NOT NULL,
  `courseid` uuid NOT NULL,
  `order` int(2) UNSIGNED NOT NULL,
  KEY `modules_courses_courses_FK` (`courseid`),
  KEY `modules_courses_modules_FK` (`moduleid`),
  CONSTRAINT `modules_courses_courses_FK` FOREIGN KEY (`courseid`) REFERENCES `courses` (`id`),
  CONSTRAINT `modules_courses_modules_FK` FOREIGN KEY (`moduleid`) REFERENCES `modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


LOCK TABLES `modules_courses` WRITE;
/*!40000 ALTER TABLE `modules_courses` DISABLE KEYS */;
/*!40000 ALTER TABLE `modules_courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `invoiceId` uuid NOT NULL,
  `receivedPaymentMethod` enum('efectivo','Exoneracion') NOT NULL,
  `returnedPaymentMethod` enum('efectivo','Exoneracion') NOT NULL,
  `paidAmount` float NOT NULL,
  `returnedAmount` float NOT NULL,
  `reference` varchar(20) DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `date` datetime NOT NULL DEFAULT current_timestamp(),
  `changeRate` float NOT NULL,
  PRIMARY KEY (`id`),
  KEY `payments_invoices_FK` (`invoiceId`),
  CONSTRAINT `payments_invoices_FK` FOREIGN KEY (`invoiceId`) REFERENCES `invoices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `periods`
--

CREATE TABLE `periods` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `year` int(4) NOT NULL,
  `period` int(2) NOT NULL,
  `modality` enum('Intensivo','Sabatino') NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `create_at` datetime NOT NULL DEFAULT current_timestamp(),
  `state` enum('En curso','Finalizado') NOT NULL DEFAULT 'En curso',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


LOCK TABLES `periods` WRITE;
/*!40000 ALTER TABLE `periods` DISABLE KEYS */;
/*!40000 ALTER TABLE `periods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scores`
--

CREATE TABLE `scores` (
  `studentsId` uuid DEFAULT NULL,
  `moduleId` uuid DEFAULT NULL,
  `score` int(2) DEFAULT NULL,
  KEY `fk_student_scores` (`studentsId`),
  KEY `fk_module_scores` (`moduleId`),
  CONSTRAINT `fk_module_scores` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`),
  CONSTRAINT `fk_student_scores` FOREIGN KEY (`studentsId`) REFERENCES `students` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


LOCK TABLES `scores` WRITE;
/*!40000 ALTER TABLE `scores` DISABLE KEYS */;
/*!40000 ALTER TABLE `scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `name` varchar(20) NOT NULL,
  `lastname` varchar(20) NOT NULL,
  `photo` text DEFAULT NULL,
  `parentalPermission` text DEFAULT NULL,
  `studentsIdentification` int(10) NOT NULL,
  `birthDate` date NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` int(10) unsigned NOT NULL,
  `address` text NOT NULL,
  `instructionGrade` enum('Ninguno','Bachillerato','Universitario','Postgrado') NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `state` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `section` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `studentsId` (`studentsIdentification`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES
('382f4b8f-0f9a-11f1-9f8d-106530499799','Juan','perez',NULL,NULL,1111,'2026-01-12','jjd@o.c',4127859999,'kkk','Universitario','2026-02-21 22:57:26','Activo',NULL),
('49c8680e-0f9a-11f1-9f8d-106530499799','jesus','Lozano',NULL,NULL,890,'2026-01-05','jjd@o.c',414223,'kkk','Postgrado','2026-02-21 22:57:56','Activo',NULL),
('55af3fe9-0f9a-11f1-9f8d-106530499799','David','Garcia',NULL,NULL,3353,'2026-01-06','jjd@o.c',41409876,'kkk','Bachillerato','2026-02-21 22:58:16','Activo',NULL);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` uuid NOT NULL DEFAULT uuid(),
  `name` varchar(20) NOT NULL,
  `lastName` varchar(20) NOT NULL,
  `identification` int(11) unsigned NOT NULL,
  `status` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


LOCK TABLES `teachers` WRITE;
/*!40000 ALTER TABLE `teachers` DISABLE KEYS */;
/*!40000 ALTER TABLE `teachers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teachers_modules`
--

CREATE TABLE `teachers_modules` (
  `teacherId` uuid NOT NULL,
  `moduleId` uuid NOT NULL,
  `section` int(11) NOT NULL,
  KEY `teachers_modules_modules_FK` (`moduleId`),
  KEY `teachers_modules_teachers_FK` (`teacherId`),
  CONSTRAINT `teachers_modules_modules_FK` FOREIGN KEY (`moduleId`) REFERENCES `modules` (`id`),
  CONSTRAINT `teachers_modules_teachers_FK` FOREIGN KEY (`teacherId`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;


LOCK TABLES `teachers_modules` WRITE;
/*!40000 ALTER TABLE `teachers_modules` DISABLE KEYS */;
/*!40000 ALTER TABLE `teachers_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) unsigned NOT NULL,
  `name` varchar(20) NOT NULL,
  `lastname` varchar(20) NOT NULL,
  `passwordSHA256` varchar(64) NOT NULL,
  `type` int(11) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;


LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'admin','admin','66908395b9edc2fbbedd85dbda476785736a14ac7313f06a362f779b643734e5',0,1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'faco_luz_extension'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-03-02 20:36:14
