-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - PRACTICE / DEMONSTRATION QUERIES
-- ----------------------------------------------------------------------------
-- Run this file AFTER importing database/hospital_management.sql.
--
--   mysql -u root -p hospital_management < database/queries.sql
--
-- Sections:
--   1. SELECT queries
--   2. JOIN queries
--   3. INSERT examples (rolled back)
--   4. UPDATE examples (rolled back)
--   5. DELETE examples (rolled back)
--   6. Data-integrity checks
--   7. Constraint demonstration
-- ============================================================================

USE hospital_management;

-- ============================================================================
-- 1. SIMPLE SELECT QUERIES
-- ============================================================================

-- 1.1 View every department
SELECT * FROM department ORDER BY department_name;

-- 1.2 View every doctor, newest first
SELECT * FROM doctor ORDER BY doctor_id;

-- 1.3 Find doctors in a particular department by name
SELECT d.doctor_id, d.first_name, d.last_name, d.specialization,
       d.consultation_fee
FROM doctor d
JOIN department dep ON dep.department_id = d.department_id
WHERE dep.department_name = 'Cardiology';

-- 1.4 Search patients by blood group
SELECT patient_id, first_name, last_name, blood_group, phone
FROM patient
WHERE blood_group = 'O+';

-- 1.5 Appointments on a specific date (change the date as needed)
SELECT appointment_id, patient_id, doctor_id, appointment_time, status
FROM appointment
WHERE appointment_date = CURDATE()
ORDER BY appointment_time;

-- 1.6 Appointments between two dates (inclusive)
SELECT appointment_id, appointment_date, appointment_time, status, reason
FROM appointment
WHERE appointment_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                           AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY appointment_date, appointment_time;

-- 1.7 Count appointments by status
SELECT status, COUNT(*) AS total
FROM appointment
GROUP BY status
ORDER BY total DESC;

-- ============================================================================
-- 2. JOIN QUERIES (the queries used by the application)
-- ============================================================================

-- 2.1 Full appointment list with patient and doctor names
SELECT a.appointment_id,
       a.appointment_date,
       a.appointment_time,
       a.status,
       a.reason,
       CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
       CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
       d.specialization
FROM appointment a
JOIN patient p ON a.patient_id = p.patient_id
JOIN doctor  d ON a.doctor_id  = d.doctor_id
ORDER BY a.appointment_date DESC, a.appointment_time DESC;

-- 2.2 Today's appointment schedule
SELECT a.appointment_time,
       CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
       CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
       a.status,
       a.reason
FROM appointment a
JOIN patient p ON a.patient_id = p.patient_id
JOIN doctor  d ON a.doctor_id  = d.doctor_id
WHERE a.appointment_date = CURDATE()
ORDER BY a.appointment_time;

-- 2.3 Upcoming scheduled appointments for the next 30 days
SELECT a.appointment_date, a.appointment_time,
       CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
       CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
       a.reason
FROM appointment a
JOIN patient p ON a.patient_id = p.patient_id
JOIN doctor  d ON a.doctor_id  = d.doctor_id
WHERE a.status = 'Scheduled'
  AND a.appointment_date BETWEEN CURDATE()
                             AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY a.appointment_date, a.appointment_time;

-- 2.4 Doctors with their department details
SELECT d.doctor_id,
       CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
       d.specialization,
       d.email,
       d.consultation_fee,
       dep.department_name,
       dep.location
FROM doctor d
JOIN department dep ON d.department_id = dep.department_id
ORDER BY dep.department_name, doctor_name;

-- 2.5 Number of doctors in each department (includes empty departments)
SELECT dep.department_id,
       dep.department_name,
       COUNT(d.doctor_id) AS doctor_count,
       AVG(d.consultation_fee) AS average_fee
FROM department dep
LEFT JOIN doctor d ON dep.department_id = d.department_id
GROUP BY dep.department_id, dep.department_name
ORDER BY doctor_count DESC, dep.department_name;

-- 2.6 Number of appointments per patient (includes patients with zero)
SELECT p.patient_id,
       CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
       COUNT(a.appointment_id) AS appointment_count
FROM patient p
LEFT JOIN appointment a ON p.patient_id = a.patient_id
GROUP BY p.patient_id, p.first_name, p.last_name
ORDER BY appointment_count DESC, patient_name;

-- 2.7 Complete medical history of one patient
SELECT mr.record_date,
       CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
       d.specialization,
       mr.diagnosis,
       mr.prescription,
       mr.notes,
       mr.appointment_id
FROM medical_record mr
JOIN doctor d ON mr.doctor_id = d.doctor_id
WHERE mr.patient_id = 2
ORDER BY mr.record_date DESC;

-- 2.8 Medical record with its appointment information
SELECT mr.record_id,
       mr.record_date,
       CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
       CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
       a.appointment_date,
       a.appointment_time,
       mr.diagnosis,
       mr.prescription
FROM medical_record mr
JOIN patient p ON mr.patient_id = p.patient_id
JOIN doctor  d ON mr.doctor_id  = d.doctor_id
LEFT JOIN appointment a ON mr.appointment_id = a.appointment_id
ORDER BY mr.record_date DESC;

-- 2.9 Doctor workload: completed appointments and records written
SELECT CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
       d.specialization,
       COUNT(DISTINCT a.appointment_id) AS total_appointments,
       COUNT(DISTINCT CASE WHEN a.status = 'Completed'
                           THEN a.appointment_id END) AS completed_appointments,
       COUNT(DISTINCT mr.record_id) AS medical_records
FROM doctor d
LEFT JOIN appointment a   ON d.doctor_id = a.doctor_id
LEFT JOIN medical_record mr ON d.doctor_id = mr.doctor_id
GROUP BY d.doctor_id, d.first_name, d.last_name, d.specialization
ORDER BY total_appointments DESC;

-- ============================================================================
-- 3. INSERT EXAMPLES (rolled back so sample data stays unchanged)
-- ============================================================================

START TRANSACTION;

INSERT INTO department (department_name, location, phone)
VALUES ('ENT', 'Block F - 2nd Floor', '08023456707');

INSERT INTO doctor
  (first_name, last_name, specialization, phone, email,
   consultation_fee, department_id)
VALUES
  ('Naveen', 'Bhat', 'ENT Surgery', '9845012309',
   'naveen.bhat@hospital.com', 550.00,
   (SELECT department_id FROM department WHERE department_name = 'ENT'));

INSERT INTO patient
  (first_name, last_name, date_of_birth, gender, phone, email,
   address, blood_group)
VALUES
  ('Maya', 'Sharma', '1997-04-16', 'Female', '9900011111',
   'maya.sharma@example.com', '#31, Richmond Town, Bengaluru', 'A+');

-- Create an appointment for the patient and doctor inserted above.
INSERT INTO appointment
  (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
VALUES
  ((SELECT patient_id FROM patient WHERE email = 'maya.sharma@example.com'),
   (SELECT doctor_id FROM doctor WHERE email = 'naveen.bhat@hospital.com'),
   DATE_ADD(CURDATE(), INTERVAL 4 DAY), '10:30:00',
   'Scheduled', 'Ear pain and blocked sinus');

SELECT 'INSERT examples completed successfully.' AS result;

ROLLBACK;

-- ============================================================================
-- 4. UPDATE EXAMPLES (rolled back)
-- ============================================================================

START TRANSACTION;

-- 4.1 Change a department's phone number
UPDATE department
SET phone = '08023459999'
WHERE department_name = 'Dermatology';

-- 4.2 Increase the consultation fee of cardiologists by 5%
UPDATE doctor
SET consultation_fee = consultation_fee * 1.05
WHERE department_id = (
  SELECT department_id FROM department WHERE department_name = 'Cardiology'
);

-- 4.3 Mark a scheduled appointment as completed
UPDATE appointment
SET status = 'Completed'
WHERE appointment_id = 1;

SELECT 'UPDATE examples completed successfully.' AS result;

ROLLBACK;

-- ============================================================================
-- 5. DELETE EXAMPLES (rolled back)
-- ============================================================================

START TRANSACTION;

-- 5.1 Delete a cancelled appointment
DELETE FROM appointment
WHERE appointment_id = 9
  AND status = 'Cancelled';

-- 5.2 Delete a medical record
DELETE FROM medical_record
WHERE record_id = 6;

-- 5.3 Deleting a patient cascades to their appointments and records.
--     (This is rolled back, so the sample patient is not really removed.)
DELETE FROM patient
WHERE patient_id = 10;

SELECT 'DELETE examples completed successfully.' AS result;

ROLLBACK;

-- ============================================================================
-- 6. DATA-INTEGRITY CHECKS
-- ============================================================================

-- 6.1 These should return zero rows: orphaned foreign-key references.
SELECT 'appointments without a patient' AS check_name, a.appointment_id
FROM appointment a
LEFT JOIN patient p ON a.patient_id = p.patient_id
WHERE p.patient_id IS NULL;

SELECT 'appointments without a doctor' AS check_name, a.appointment_id
FROM appointment a
LEFT JOIN doctor d ON a.doctor_id = d.doctor_id
WHERE d.doctor_id IS NULL;

SELECT 'records without a patient' AS check_name, mr.record_id
FROM medical_record mr
LEFT JOIN patient p ON mr.patient_id = p.patient_id
WHERE p.patient_id IS NULL;

SELECT 'records without a doctor' AS check_name, mr.record_id
FROM medical_record mr
LEFT JOIN doctor d ON mr.doctor_id = d.doctor_id
WHERE d.doctor_id IS NULL;

-- 6.2 These should return zero rows: no doctor is double-booked.
SELECT doctor_id, appointment_date, appointment_time,
       COUNT(*) AS bookings_at_same_time
FROM appointment
GROUP BY doctor_id, appointment_date, appointment_time
HAVING COUNT(*) > 1;

-- 6.3 These should return zero rows: no patient/doctor mismatch between a
--     medical record and its linked appointment.
SELECT mr.record_id
FROM medical_record mr
JOIN appointment a ON mr.appointment_id = a.appointment_id
WHERE mr.patient_id <> a.patient_id
   OR mr.doctor_id  <> a.doctor_id;

-- 6.4 A department cannot be deleted while it has doctors.
--     The statement below is intentionally commented out because it should
--     fail with MySQL error 1451 (foreign key constraint).
-- DELETE FROM department WHERE department_id = 1;

-- ============================================================================
-- 7. CONSTRAINT DEMONSTRATION: DOUBLE-BOOKING IS PREVENTED
-- ============================================================================
-- The following INSERT would violate:
--   UNIQUE KEY uq_doctor_slot (doctor_id, appointment_date, appointment_time)
-- Expected error: "Duplicate entry ... for key 'appointment.uq_doctor_slot'"
--
-- Uncomment to demonstrate the database enforcing the business rule.
--
-- INSERT INTO appointment
--   (patient_id, doctor_id, appointment_date, appointment_time, status, reason)
-- VALUES
--   (1, 6, CURDATE(), '09:00:00', 'Scheduled', 'Duplicate slot attempt');

-- A duplicate email is also rejected by UNIQUE constraints:
-- INSERT INTO doctor
--   (first_name, last_name, specialization, phone, email,
--    consultation_fee, department_id)
-- VALUES
--   ('Test', 'Doctor', 'General Medicine', '9800000000',
--    'arjun.rao@hospital.com', 100.00, 6);
