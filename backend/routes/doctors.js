const express = require('express');
const { pool, findById } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/errors');
const {
  requiredString,
  requiredEmail,
  requiredInt,
  requiredDecimal
} = require('../utils/validation');

const router = express.Router();

// Reusable SELECT so GET, POST and PUT all return the same shape, including
// the department name instead of only department_id.
async function getDoctorById(id) {
  const [rows] = await pool.query(
    `SELECT
       doc.doctor_id,
       doc.first_name,
       doc.last_name,
       doc.specialization,
       doc.phone,
       doc.email,
       doc.consultation_fee,
       doc.department_id,
       dep.department_name
     FROM doctor doc
     JOIN department dep ON doc.department_id = dep.department_id
     WHERE doc.doctor_id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

function doctorPayload(body) {
  const feeValue =
    body.consultation_fee === undefined ||
    body.consultation_fee === null ||
    String(body.consultation_fee).trim() === ''
      ? 0
      : body.consultation_fee;

  return {
    first_name: requiredString(body.first_name, 'First name', 50),
    last_name: requiredString(body.last_name, 'Last name', 50),
    specialization: requiredString(
      body.specialization,
      'Specialization',
      100
    ),
    phone: requiredString(body.phone, 'Phone', 15),
    email: requiredEmail(body.email, 'Email'),
    consultation_fee: requiredDecimal(feeValue, 'Consultation fee'),
    department_id: requiredInt(body.department_id, 'Department')
  };
}

async function ensureDepartmentExists(departmentId) {
  const department = await findById(
    'department',
    'department_id',
    departmentId
  );

  if (!department) {
    throw httpError(400, 'The selected department does not exist.');
  }
}

// GET /api/doctors
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT
        doc.doctor_id,
        doc.first_name,
        doc.last_name,
        doc.specialization,
        doc.phone,
        doc.email,
        doc.consultation_fee,
        doc.department_id,
        dep.department_name
      FROM doctor doc
      JOIN department dep ON doc.department_id = dep.department_id
      ORDER BY dep.department_name, doc.first_name, doc.last_name
    `);

    res.json(rows);
  })
);

// GET /api/doctors/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Doctor ID');
    const doctor = await getDoctorById(id);

    if (!doctor) {
      throw httpError(404, 'Doctor not found.');
    }

    res.json(doctor);
  })
);

// POST /api/doctors
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const doctor = doctorPayload(req.body);
    await ensureDepartmentExists(doctor.department_id);

    const [result] = await pool.query(
      `INSERT INTO doctor
         (first_name, last_name, specialization, phone, email,
          consultation_fee, department_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        doctor.first_name,
        doctor.last_name,
        doctor.specialization,
        doctor.phone,
        doctor.email,
        doctor.consultation_fee,
        doctor.department_id
      ]
    );

    const created = await getDoctorById(result.insertId);
    res.status(201).json(created);
  })
);

// PUT /api/doctors/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Doctor ID');
    const existing = await findById('doctor', 'doctor_id', id);

    if (!existing) {
      throw httpError(404, 'Doctor not found.');
    }

    const doctor = doctorPayload(req.body);
    await ensureDepartmentExists(doctor.department_id);

    await pool.query(
      `UPDATE doctor
       SET first_name = ?, last_name = ?, specialization = ?, phone = ?,
           email = ?, consultation_fee = ?, department_id = ?
       WHERE doctor_id = ?`,
      [
        doctor.first_name,
        doctor.last_name,
        doctor.specialization,
        doctor.phone,
        doctor.email,
        doctor.consultation_fee,
        doctor.department_id,
        id
      ]
    );

    const updated = await getDoctorById(id);
    res.json(updated);
  })
);

// DELETE /api/doctors/:id
// Appointments and medical records for this doctor are removed by the
// database's ON DELETE CASCADE rules, as specified by the report.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Doctor ID');
    const existing = await findById('doctor', 'doctor_id', id);

    if (!existing) {
      throw httpError(404, 'Doctor not found.');
    }

    await pool.query('DELETE FROM doctor WHERE doctor_id = ?', [id]);
    res.json({ message: 'Doctor deleted successfully.' });
  })
);

module.exports = router;
