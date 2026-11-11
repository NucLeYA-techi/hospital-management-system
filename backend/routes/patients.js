const express = require('express');
const { pool, findById } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/errors');
const {
  requiredString,
  optionalEmail,
  requiredInt,
  requiredDate,
  oneOf,
  optionalOneOf
} = require('../utils/validation');

const router = express.Router();

const GENDERS = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function patientPayload(body) {
  return {
    first_name: requiredString(body.first_name, 'First name', 50),
    last_name: requiredString(body.last_name, 'Last name', 50),
    date_of_birth: requiredDate(body.date_of_birth, 'Date of birth'),
    gender: oneOf(body.gender, GENDERS, 'Gender'),
    phone: requiredString(body.phone, 'Phone', 15),
    email: optionalEmail(body.email, 'Email'),
    address: requiredString(body.address, 'Address'),
    blood_group: optionalOneOf(body.blood_group, BLOOD_GROUPS, 'Blood group')
  };
}

// GET /api/patients
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT
        patient_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone,
        email,
        address,
        blood_group
      FROM patient
      ORDER BY patient_id
    `);

    res.json(rows);
  })
);

// GET /api/patients/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Patient ID');
    const patient = await findById('patient', 'patient_id', id);

    if (!patient) {
      throw httpError(404, 'Patient not found.');
    }

    res.json(patient);
  })
);

// POST /api/patients
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const patient = patientPayload(req.body);

    const [result] = await pool.query(
      `INSERT INTO patient
         (first_name, last_name, date_of_birth, gender, phone, email,
          address, blood_group)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient.first_name,
        patient.last_name,
        patient.date_of_birth,
        patient.gender,
        patient.phone,
        patient.email,
        patient.address,
        patient.blood_group
      ]
    );

    const created = await findById('patient', 'patient_id', result.insertId);
    res.status(201).json(created);
  })
);

// PUT /api/patients/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Patient ID');
    const existing = await findById('patient', 'patient_id', id);

    if (!existing) {
      throw httpError(404, 'Patient not found.');
    }

    const patient = patientPayload(req.body);

    await pool.query(
      `UPDATE patient
       SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?,
           phone = ?, email = ?, address = ?, blood_group = ?
       WHERE patient_id = ?`,
      [
        patient.first_name,
        patient.last_name,
        patient.date_of_birth,
        patient.gender,
        patient.phone,
        patient.email,
        patient.address,
        patient.blood_group,
        id
      ]
    );

    const updated = await findById('patient', 'patient_id', id);
    res.json(updated);
  })
);

// DELETE /api/patients/:id
// Appointments and medical records are deleted by ON DELETE CASCADE.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Patient ID');
    const existing = await findById('patient', 'patient_id', id);

    if (!existing) {
      throw httpError(404, 'Patient not found.');
    }

    await pool.query('DELETE FROM patient WHERE patient_id = ?', [id]);
    res.json({ message: 'Patient deleted successfully.' });
  })
);

module.exports = router;
