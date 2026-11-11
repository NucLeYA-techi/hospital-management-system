const express = require('express');
const { pool, findById } = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../utils/errors');
const { requiredString, requiredInt } = require('../utils/validation');

const router = express.Router();

// Convert the request body into the exact fields used by the department table.
function departmentPayload(body) {
  return {
    department_name: requiredString(body.department_name, 'Department name', 100),
    location: requiredString(body.location, 'Location', 100),
    phone: requiredString(body.phone, 'Phone', 15)
  };
}

// GET /api/departments
// LEFT JOIN means departments with no doctors still appear (doctor_count = 0).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(`
      SELECT
        dep.department_id,
        dep.department_name,
        dep.location,
        dep.phone,
        COUNT(doc.doctor_id) AS doctor_count
      FROM department dep
      LEFT JOIN doctor doc ON dep.department_id = doc.department_id
      GROUP BY dep.department_id, dep.department_name, dep.location, dep.phone
      ORDER BY dep.department_name
    `);

    res.json(rows);
  })
);

// GET /api/departments/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Department ID');
    const department = await findById('department', 'department_id', id);

    if (!department) {
      throw httpError(404, 'Department not found.');
    }

    res.json(department);
  })
);

// POST /api/departments
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const department = departmentPayload(req.body);

    const [result] = await pool.query(
      `INSERT INTO department (department_name, location, phone)
       VALUES (?, ?, ?)`,
      [department.department_name, department.location, department.phone]
    );

    const created = await findById(
      'department',
      'department_id',
      result.insertId
    );
    res.status(201).json(created);
  })
);

// PUT /api/departments/:id
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Department ID');
    const existing = await findById('department', 'department_id', id);

    if (!existing) {
      throw httpError(404, 'Department not found.');
    }

    const department = departmentPayload(req.body);

    await pool.query(
      `UPDATE department
       SET department_name = ?, location = ?, phone = ?
       WHERE department_id = ?`,
      [
        department.department_name,
        department.location,
        department.phone,
        id
      ]
    );

    const updated = await findById('department', 'department_id', id);
    res.json(updated);
  })
);

// DELETE /api/departments/:id
// The database's ON DELETE RESTRICT rule rejects this if doctors are assigned.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requiredInt(req.params.id, 'Department ID');
    const existing = await findById('department', 'department_id', id);

    if (!existing) {
      throw httpError(404, 'Department not found.');
    }

    await pool.query('DELETE FROM department WHERE department_id = ?', [id]);
    res.json({ message: 'Department deleted successfully.' });
  })
);

module.exports = router;
