const express = require('express');
const { pool } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/dashboard
// One request supplies all the numbers and lists shown on the Dashboard.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [countRows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM department) AS department_count,
        (SELECT COUNT(*) FROM doctor) AS doctor_count,
        (SELECT COUNT(*) FROM patient) AS patient_count,
        (SELECT COUNT(*) FROM appointment) AS appointment_count,
        (SELECT COUNT(*) FROM medical_record) AS medical_record_count,
        (SELECT COUNT(*) FROM appointment
          WHERE appointment_date = CURDATE()) AS today_appointment_count,
        (SELECT COUNT(*) FROM appointment
          WHERE status = 'Completed') AS completed_appointment_count
    `);

    const [todayAppointments] = await pool.query(`
      SELECT
        a.appointment_id,
        a.appointment_time,
        a.status,
        a.reason,
        p.first_name AS patient_first_name,
        p.last_name  AS patient_last_name,
        d.first_name AS doctor_first_name,
        d.last_name  AS doctor_last_name,
        d.specialization
      FROM appointment a
      JOIN patient p ON a.patient_id = p.patient_id
      JOIN doctor  d ON a.doctor_id  = d.doctor_id
      WHERE a.appointment_date = CURDATE()
      ORDER BY a.appointment_time
      LIMIT 10
    `);

    const [recentRecords] = await pool.query(`
      SELECT
        mr.record_id,
        mr.record_date,
        mr.diagnosis,
        p.first_name AS patient_first_name,
        p.last_name  AS patient_last_name,
        d.first_name AS doctor_first_name,
        d.last_name  AS doctor_last_name
      FROM medical_record mr
      JOIN patient p ON mr.patient_id = p.patient_id
      JOIN doctor  d ON mr.doctor_id  = d.doctor_id
      ORDER BY mr.record_date DESC, mr.record_id DESC
      LIMIT 5
    `);

    const counts = countRows[0];
    res.json({
      counts: {
        departments: Number(counts.department_count),
        doctors: Number(counts.doctor_count),
        patients: Number(counts.patient_count),
        appointments: Number(counts.appointment_count),
        medical_records: Number(counts.medical_record_count),
        today_appointments: Number(counts.today_appointment_count),
        completed_appointments: Number(counts.completed_appointment_count)
      },
      today_appointments: todayAppointments,
      recent_records: recentRecords
    });
  })
);

module.exports = router;
