const express = require('express');
const { pool, findById } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/errors');
const {
  requiredString,
  requiredInt,
  requiredDate,
  requiredTime,
  oneOf
} = require('../utils/validation');

const router = express.Router();

const STATUSES = ['Scheduled', 'Completed', 'Cancelled'];

// The joined SELECT used by every appointment response.
async function getAppointmentById(id) {
  const [rows] = await pool.query(
    `SELECT
       a.appointment_id,
       a.patient_id,
       a.doctor_id,
       a.appointment_date,
       a.appointment_time,
       a.status,
       a.reason,
       a.created_at,
       p.first_name AS patient_first_name,
       p.last_name  AS patient_last_name,
       d.first_name AS doctor_first_name,
       d.last_name  AS doctor_last_name,
       d.specialization
     FROM appointment a
     JOIN patient p ON a.patient_id = p.patient_id
     JOIN doctor  d ON a.doctor_id  = d.doctor_id
     WHERE a.appointment_id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

function appointmentPayload(body) {
  return {
    patient_id: requiredInt(body.patient_id, 'Patient'),
    doctor_id: requiredInt(body.doctor_id, 'Doctor'),
    appointment_date: requiredDate(
      body.appointment_date,
      'Appointment date'
    ),
    appointment_time: requiredTime(
      body.appointment_time,
      'Appointment time'
    ),
    status: oneOf(body.status, STATUSES, 'Status', 'Scheduled'),
    reason: requiredString(body.reason, 'Reason')
  };
}

// Check that both selected records exist before attempting the INSERT.
async function ensureParticipants(patientId, doctorId) {
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
}

// Friendly pre-check for the report's business rule. The database UNIQUE
// constraint remains the final authority and also protects against race
// conditions.
async function ensureSlotAvailable(doctorId, date, time, excludeId = null) {
  const params = [doctorId, date, time];
  let sql = `
    SELECT appointment_id
    FROM appointment
    WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ?`;

  if (excludeId !== null) {
    sql += ' AND appointment_id <> ?';
    params.push(excludeId);
  }

  sql += ' LIMIT 1';

  const [rows] = await pool.query(sql, params);

  if (rows.length > 0) {
    throw httpError(
      409,
      'This doctor already has an appointment at the selected date and time. Please choose another slot.'
    );
  }
}

// A medical record permanently identifies the patient and doctor for a visit.
// Once a record is linked, do not allow the appointment to be reassigned to a
// different patient/doctor or moved away from "Completed", because that would
// leave the clinical record inconsistent with its appointment.
async function ensureLinkedRecordsAllowUpdate(appointmentId, changes) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS record_count
     FROM medical_record
     WHERE appointment_id = ?`,
    [appointmentId]
  );

  if (Number(rows[0].record_count) === 0) {
    return;
  }

  if (
    changes.patientId !== undefined &&
    Number(changes.patientId) !== Number(changes.existingPatientId)
  ) {
    throw httpError(
      409,
      'This appointment has a linked medical record, so its patient cannot be changed.'
    );
  }

  if (
    changes.doctorId !== undefined &&
    Number(changes.doctorId) !== Number(changes.existingDoctorId)
  ) {
    throw httpError(
      409,
      'This appointment has a linked medical record, so its doctor cannot be changed.'
    );
  }

  if (changes.status !== undefined && changes.status !== 'Completed') {
    throw httpError(
      409,
      'This appointment has a linked medical record and must remain Completed. Delete the appointment if the record should be unlinked.'
    );
  }
}

// GET /api/appointments
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT
        a.appointment_id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        a.reason,
        a.created_at,
        p.first_name AS patient_first_name,
        p.last_name  AS patient_last_name,
        d.first_name AS doctor_first_name,
        d.last_name  AS doctor_last_name,
        d.specialization
      FROM appointment a
      JOIN patient p ON a.patient_id = p.patient_id
      JOIN doctor  d ON a.doctor_id  = d.doctor_id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `);

    res.json(rows);
  })
);

// GET /api/appointments/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Appointment ID');
    const appointment = await getAppointmentById(id);

    if (!appointment) {
      throw httpError(404, 'Appointment not found.');
    }

    res.json(appointment);
  })
);

// POST /api/appointments
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const appointment = appointmentPayload(req.body);

    await ensureParticipants(appointment.patient_id, appointment.doctor_id);
    await ensureSlotAvailable(
      appointment.doctor_id,
      appointment.appointment_date,
      appointment.appointment_time
    );

    const [result] = await pool.query(
      `INSERT INTO appointment
         (patient_id, doctor_id, appointment_date, appointment_time,
          status, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        appointment.patient_id,
        appointment.doctor_id,
        appointment.appointment_date,
        appointment.appointment_time,
        appointment.status,
        appointment.reason
      ]
    );

    const created = await getAppointmentById(result.insertId);
    res.status(201).json(created);
  })
);

// PUT /api/appointments/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Appointment ID');
    const existing = await findById(
      'appointment',
      'appointment_id',
      id
    );

    if (!existing) {
      throw httpError(404, 'Appointment not found.');
    }

    const appointment = appointmentPayload(req.body);

    await ensureLinkedRecordsAllowUpdate(id, {
      patientId: appointment.patient_id,
      existingPatientId: existing.patient_id,
      doctorId: appointment.doctor_id,
      existingDoctorId: existing.doctor_id,
      status: appointment.status
    });

    await ensureParticipants(appointment.patient_id, appointment.doctor_id);
    await ensureSlotAvailable(
      appointment.doctor_id,
      appointment.appointment_date,
      appointment.appointment_time,
      id
    );

    await pool.query(
      `UPDATE appointment
       SET patient_id = ?, doctor_id = ?, appointment_date = ?,
           appointment_time = ?, status = ?, reason = ?
       WHERE appointment_id = ?`,
      [
        appointment.patient_id,
        appointment.doctor_id,
        appointment.appointment_date,
        appointment.appointment_time,
        appointment.status,
        appointment.reason,
        id
      ]
    );

    const updated = await getAppointmentById(id);
    res.json(updated);
  })
);

// PATCH /api/appointments/:id/status
// Used by the "Complete" and "Cancel" buttons in the interface.
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Appointment ID');
    const existing = await findById(
      'appointment',
      'appointment_id',
      id
    );

    if (!existing) {
      throw httpError(404, 'Appointment not found.');
    }

    const status = oneOf(req.body.status, STATUSES, 'Status');

    await ensureLinkedRecordsAllowUpdate(id, { status });

    await pool.query(
      'UPDATE appointment SET status = ? WHERE appointment_id = ?',
      [status, id]
    );

    const updated = await getAppointmentById(id);
    res.json(updated);
  })
);

// DELETE /api/appointments/:id
// ON DELETE SET NULL keeps any linked medical record but clears its
// appointment_id.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Appointment ID');
    const existing = await findById(
      'appointment',
      'appointment_id',
      id
    );

    if (!existing) {
      throw httpError(404, 'Appointment not found.');
    }

    await pool.query('DELETE FROM appointment WHERE appointment_id = ?', [
      id
    ]);
    res.json({ message: 'Appointment deleted successfully.' });
  })
);

module.exports = router;
