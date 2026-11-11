-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - MySQL DATABASE SCRIPT
-- ----------------------------------------------------------------------------
-- Based on the DBMS project report "Hospital Management".
-- Target: MySQL 8.0+ (also works with MariaDB 10.4+).
--
-- HOW TO RUN:
--   mysql -u root -p < database/hospital_management.sql
--   ...or open this file in MySQL Workbench and execute it.
--
-- WARNING: This script DROPS the existing hospital_management database so it
-- can be imported repeatedly for a clean demonstration. Do not run it against
-- a database that contains data you want to keep.
-- ============================================================================

DROP DATABASE IF EXISTS hospital_management;

CREATE DATABASE hospital_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hospital_management;

-- ============================================================================
-- 1. DEPARTMENT
-- One department can have many doctors.
-- ============================================================================
CREATE TABLE department (
  department_id   INT AUTO_INCREMENT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL UNIQUE,
  location        VARCHAR(100) NOT NULL,
  phone           VARCHAR(15)  NOT NULL
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 2. DOCTOR
-- Each doctor belongs to exactly one department.
-- ON DELETE RESTRICT prevents deleting a department that still has doctors.
-- ============================================================================
CREATE TABLE doctor (
  doctor_id        INT AUTO_INCREMENT PRIMARY KEY,
  first_name       VARCHAR(50)  NOT NULL,
  last_name        VARCHAR(50)  NOT NULL,
  specialization   VARCHAR(100) NOT NULL,
  phone            VARCHAR(15)  NOT NULL,
  email            VARCHAR(100) NOT NULL UNIQUE,
  consultation_fee DECIMAL(10, 2) NOT NULL DEFAULT 0
                   CHECK (consultation_fee >= 0),
  department_id    INT NOT NULL,

  CONSTRAINT fk_doctor_department
    FOREIGN KEY (department_id) REFERENCES department (department_id)
    ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 3. PATIENT
-- Email is optional, but when supplied it must be unique.
-- ============================================================================
CREATE TABLE patient (
  patient_id   INT AUTO_INCREMENT PRIMARY KEY,
  first_name   VARCHAR(50) NOT NULL,
  last_name    VARCHAR(50) NOT NULL,
  date_of_birth DATE       NOT NULL,
  gender       VARCHAR(10) NOT NULL
               CHECK (gender IN ('Male', 'Female', 'Other')),
  phone        VARCHAR(15) NOT NULL,
  email        VARCHAR(100) UNIQUE,
  address      TEXT        NOT NULL,
  blood_group  VARCHAR(5)
               CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-',
                                      'AB+', 'AB-', 'O+', 'O-'))
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 4. APPOINTMENT
-- Links a patient to a doctor at a specific date and time.
--
-- The UNIQUE constraint below is the report's double-booking rule:
-- the same doctor cannot be booked twice at the same date and time.
-- ============================================================================
CREATE TABLE appointment (
  appointment_id   INT AUTO_INCREMENT PRIMARY KEY,
  patient_id       INT NOT NULL,
  doctor_id        INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'Scheduled'
                   CHECK (status IN ('Scheduled', 'Completed', 'Cancelled')),
  reason           TEXT NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_doctor_slot
    UNIQUE (doctor_id, appointment_date, appointment_time),

  CONSTRAINT fk_appointment_patient
    FOREIGN KEY (patient_id) REFERENCES patient (patient_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_appointment_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor (doctor_id)
    ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 5. MEDICAL_RECORD
-- Stores the clinical outcome of a visit.
-- An appointment link is optional; if the appointment is deleted, the record
-- is kept and appointment_id becomes NULL (ON DELETE SET NULL).
-- ============================================================================
CREATE TABLE medical_record (
  record_id      INT AUTO_INCREMENT PRIMARY KEY,
  patient_id     INT NOT NULL,
  doctor_id      INT NOT NULL,
  appointment_id INT,
  diagnosis      TEXT NOT NULL,
  prescription   TEXT,
  notes          TEXT,
  record_date    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_record_patient
    FOREIGN KEY (patient_id) REFERENCES patient (patient_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_record_doctor
    FOREIGN KEY (doctor_id) REFERENCES doctor (doctor_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_record_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointment (appointment_id)
    ON DELETE SET NULL
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- INDEXES from the report's source-code section
-- (Primary/unique/FK columns are indexed automatically by InnoDB; these
-- additional indexes support the searches used by the application.)
-- ============================================================================
CREATE INDEX idx_doctor_department          ON doctor (department_id);
CREATE INDEX idx_appointment_patient        ON appointment (patient_id);
CREATE INDEX idx_appointment_doctor         ON appointment (doctor_id);
CREATE INDEX idx_appointment_date           ON appointment (appointment_date);
CREATE INDEX idx_medical_record_patient     ON medical_record (patient_id);
CREATE INDEX idx_medical_record_doctor      ON medical_record (doctor_id);
CREATE INDEX idx_medical_record_appointment ON medical_record (appointment_id);

-- ============================================================================
-- SAMPLE DATA
-- Dates are relative to CURDATE() so the dashboard is useful whenever the
-- script is imported.
-- ============================================================================
START TRANSACTION;

INSERT INTO department (department_id, department_name, location, phone) VALUES
  (1, 'Cardiology',      'Block A - 2nd Floor', '08023456701'),
  (2, 'Neurology',       'Block B - 3rd Floor', '08023456702'),
  (3, 'Orthopedics',     'Block C - 1st Floor', '08023456703'),
  (4, 'Pediatrics',      'Block D - Ground Floor', '08023456704'),
  (5, 'Dermatology',     'Block A - 1st Floor', '08023456705'),
  (6, 'General Medicine','Block E - Ground Floor', '08023456706');

INSERT INTO doctor
  (doctor_id, first_name, last_name, specialization, phone, email,
   consultation_fee, department_id)
VALUES
  (1, 'Arjun',  'Rao',      'Interventional Cardiology', '9845012301',
   'arjun.rao@hospital.com',    800.00, 1),
  (2, 'Meera',  'Iyer',     'Neurology',                 '9845012302',
   'meera.iyer@hospital.com',   950.00, 2),
  (3, 'Vikram', 'Shetty',   'Orthopedic Surgery',        '9845012303',
   'vikram.shetty@hospital.com',700.00, 3),
  (4, 'Ananya', 'Gupta',    'Pediatrics',                '9845012304',
   'ananya.gupta@hospital.com', 600.00, 4),
  (5, 'Rahul',  'Verma',    'Dermatology',               '9845012305',
   'rahul.verma@hospital.com',  500.00, 5),
  (6, 'Sneha',  'Kulkarni', 'General Medicine',          '9845012306',
   'sneha.kulkarni@hospital.com',450.00, 6),
  (7, 'Imran',  'Khan',     'Cardiology',                '9845012307',
   'imran.khan@hospital.com',   750.00, 1),
  (8, 'Priya',  'Nair',     'Pediatric Neurology',       '9845012308',
   'priya.nair@hospital.com',   900.00, 2);

INSERT INTO patient
  (patient_id, first_name, last_name, date_of_birth, gender, phone,
   email, address, blood_group)
VALUES
  (1, 'Rohan',  'Mehta',    '1990-05-14', 'Male',   '9900011101',
   'rohan.mehta@example.com',   '#12, MG Road, Bengaluru',            'B+'),
  (2, 'Ayesha', 'Siddiqui', '1985-11-02', 'Female', '9900011102',
   'ayesha.siddiqui@example.com','#44, Indiranagar, Bengaluru',       'O+'),
  (3, 'Karan',  'Patel',    '1998-02-20', 'Male',   '9900011103',
   'karan.patel@example.com',   '#8, Jayanagar, Bengaluru',           'A+'),
  (4, 'Diya',   'Menon',    '2019-08-09', 'Female', '9900011104',
   'diya.menon@example.com',    '#21, Whitefield, Bengaluru',         'AB+'),
  (5, 'Farhan', 'Ali',      '1993-07-30', 'Male',   '9900011105',
   'farhan.ali@example.com',    '#6, Frazer Town, Bengaluru',         'B-'),
  (6, 'Ishita', 'Desai',    '1988-12-12', 'Female', '9900011106',
   'ishita.desai@example.com',  '#19, Malleshwaram, Bengaluru',       'O-'),
  (7, 'Nikhil', 'Reddy',    '1979-03-25', 'Male',   '9900011107',
   'nikhil.reddy@example.com',  '#3, Koramangala, Bengaluru',         'A-'),
  (8, 'Sara',   'Thomas',   '1995-09-18', 'Female', '9900011108',
   'sara.thomas@example.com',   '#27, HSR Layout, Bengaluru',         'B+'),
  (9, 'Aditya', 'Kulkarni', '2001-01-07', 'Male',   '9900011109',
   'aditya.kulkarni@example.com','#15, Rajajinagar, Bengaluru',       'O+'),
  (10,'Neha',   'Joshi',    '1991-06-03', 'Female', '9900011110',
   'neha.joshi@example.com',    '#9, Banashankari, Bengaluru',        'AB-');

-- Today / upcoming / past appointments.
-- Completed appointments are used by the sample medical records below.
INSERT INTO appointment
  (appointment_id, patient_id, doctor_id, appointment_date, appointment_time,
   status, reason)
VALUES
  (1,  1, 6, CURDATE(),                              '09:00:00', 'Scheduled', 'Fever and body ache'),
  (2,  2, 1, CURDATE(),                              '10:00:00', 'Completed', 'Follow-up for chest pain'),
  (3,  3, 3, CURDATE(),                              '11:30:00', 'Scheduled', 'Knee pain after a fall'),
  (4,  4, 4, DATE_ADD(CURDATE(), INTERVAL 1 DAY),    '09:30:00', 'Scheduled', 'Child vaccination consultation'),
  (5,  5, 5, DATE_ADD(CURDATE(), INTERVAL 1 DAY),    '11:00:00', 'Scheduled', 'Persistent skin rash'),
  (6,  6, 8, DATE_ADD(CURDATE(), INTERVAL 2 DAY),    '14:00:00', 'Scheduled', 'Migraine and blurred vision'),
  (7,  7, 2, DATE_SUB(CURDATE(), INTERVAL 1 DAY),    '10:00:00', 'Completed', 'Recurring headaches'),
  (8,  8, 7, DATE_SUB(CURDATE(), INTERVAL 2 DAY),    '15:30:00', 'Completed', 'Routine heart check-up'),
  (9,  9, 5, DATE_SUB(CURDATE(), INTERVAL 3 DAY),    '09:00:00', 'Cancelled', 'Allergy consultation'),
  (10, 10,1, DATE_SUB(CURDATE(), INTERVAL 5 DAY),    '11:00:00', 'Completed', 'High blood pressure review'),
  (11, 2, 6, DATE_ADD(CURDATE(), INTERVAL 3 DAY),    '16:00:00', 'Scheduled', 'General wellness check'),
  (12, 3, 2, DATE_SUB(CURDATE(), INTERVAL 7 DAY),    '12:00:00', 'Completed', 'Migraine follow-up');

INSERT INTO medical_record
  (record_id, patient_id, doctor_id, appointment_id, diagnosis,
   prescription, notes, record_date)
VALUES
  (1, 2, 1, 2,
   'Stable angina',
   'Aspirin 75 mg once daily; Atorvastatin 10 mg at night',
   'Patient advised low-fat diet and a review after four weeks.',
   TIMESTAMP(CURDATE(), '10:30:00')),
  (2, 7, 2, 7,
   'Migraine without aura',
   'Sumatriptan 50 mg at onset of headache; Paracetamol 500 mg if needed',
   'Triggers discussed. Maintain a headache diary.',
   TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '10:45:00')),
  (3, 8, 7, 8,
   'Mild hypertension',
   'Telmisartan 40 mg once daily',
   'Blood pressure logged. Reduce salt intake and walk 30 minutes daily.',
   TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '16:00:00')),
  (4, 10, 1, 10,
   'Essential hypertension',
   'Amlodipine 5 mg once daily',
   'Home blood-pressure readings reviewed; follow-up in two weeks.',
   TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '11:30:00')),
  (5, 3, 2, 12,
   'Chronic migraine',
   'Propranolol 20 mg twice daily for prevention',
   'Neurological examination normal. Avoid skipped meals and sleep loss.',
   TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 7 DAY), '12:30:00')),
  (6, 1, 6, NULL,
   'Viral fever',
   'Paracetamol 650 mg every six hours if fever persists',
   'Previous walk-in consultation; no appointment was linked to this record.',
   TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 14 DAY), '17:15:00'));

COMMIT;

-- ============================================================================
-- QUICK VERIFICATION
-- ============================================================================
SELECT 'Database schema created successfully!' AS message;

SELECT 'Departments' AS table_name, COUNT(*) AS row_count FROM department
UNION ALL
SELECT 'Doctors', COUNT(*) FROM doctor
UNION ALL
SELECT 'Patients', COUNT(*) FROM patient
UNION ALL
SELECT 'Appointments', COUNT(*) FROM appointment
UNION ALL
SELECT 'Medical records', COUNT(*) FROM medical_record;
