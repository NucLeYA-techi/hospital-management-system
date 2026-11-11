const express = require('express');
const { pool, findById } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/errors');
const {
  requiredString,
  optionalString,
  requiredInt
} = require('../utils/validation');

const router = express.Router();

async function getMedicalRecordById(id) {
  const [rows] = await pool.query(
    `SELECT
       mr.record_id,
       mr.patient_id,
       mr.doctor_id,
       mr.appointment_id,
       mr.diagnosis,
       mr.prescription,
       mr.notes,
       mr.record_date,
       p.first_name AS patient_first_name,
       p.last_name  AS patient_last_name,
       d.first_name AS doctor_first_name,
       d.last_name  AS doctor_last_name,
       d.specialization,
       a.appointment_date,
       a.appointment_time,
       a.status AS appointment_status
     FROM medical_record mr
     JOIN patient p ON mr.patient_id = p.patient_id
     JOIN doctor  d ON mr.doctor_id  = d.doctor_id
     LEFT JOIN appointment a ON mr.appointment_id = a.appointment_id
     WHERE mr.record_id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

// GET /api/medical-records
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT
        mr.record_id,
        mr.patient_id,
        mr.doctor_id,
        mr.appointment_id,
        mr.diagnosis,
        mr.prescription,
        mr.notes,
        mr.record_date,
        p.first_name AS patient_first_name,
        p.last_name  AS patient_last_name,
        d.first_name AS doctor_first_name,
        d.last_name  AS doctor_last_name,
        d.specialization,
        a.appointment_date,
        a.appointment_time,
        a.status AS appointment_status
      FROM medical_record mr
      JOIN patient p ON mr.patient_id = p.patient_id
      JOIN doctor  d ON mr.doctor_id  = d.doctor_id
      LEFT JOIN appointment a ON mr.appointment_id = a.appointment_id
      ORDER BY mr.record_date DESC, mr.record_id DESC
    `);

    res.json(rows);
  })
);

// GET /api/medical-records/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Medical record ID');
    const record = await getMedicalRecordById(id);

    if (!record) {
      throw httpError(404, 'Medical record not found.');
    }

    res.json(record);
  })
);

// POST /api/medical-records
// The report says records are generated after an appointment. When an
// appointment is supplied, it must be COMPLETED and belong to the same
// patient and doctor.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const patientId = requiredInt(req.body.patient_id, 'Patient');
    const doctorId = requiredInt(req.body.doctor_id, 'Doctor');

    let appointmentId = null;
    if (
      req.body.appointment_id !== undefined &&
      req.body.appointment_id !== null &&
      String(req.body.appointment_id).trim() !== ''
    ) {
      appointmentId = requiredInt(
        req.body.appointment_id,
        'Appointment'
      );
    }

    const diagnosis = requiredString(
      req.body.diagnosis,
      'Diagnosis'
    );
    const prescription = optionalString(
      req.body.prescription,
      'Prescription'
    );
    const notes = optionalString(req.body.notes, 'Notes');

    const [patient, doctor] = await Promise.all([
      findById('patient', 'patient_id', patientId),
      findById('doctor', 'doctor_id', doctorId)
    ]);

    if (!patient) {
      throw httpError(400, 'The selected patient does not exist.');
    }

    if (!doctor) {
      throw httpError(400, 'The selected doctor does not exist.');
    }

    if (appointmentId !== null) {
      const appointment = await findById(
        'appointment',
        'appointment_id',
        appointmentId
      );

      if (!appointment) {
        throw httpError(400, 'The selected appointment does not exist.');
      }

      if (appointment.status !== 'Completed') {
        throw httpError(
          400,
          'A medical record can only be linked to a completed appointment.'
        );
      }

      if (
        appointment.patient_id !== patientId ||
        appointment.doctor_id !== doctorId
      ) {
        throw httpError(
          400,
          'The selected appointment belongs to a different patient or doctor.'
        );
      }
    }

    const [result] = await pool.query(
      `INSERT INTO medical_record
         (patient_id, doctor_id, appointment_id, diagnosis,
          prescription, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        doctorId,
        appointmentId,
        diagnosis,
        prescription,
        notes
      ]
    );

    const created = await getMedicalRecordById(result.insertId);
    res.status(201).json(created);
  })
);

module.exports = router;
