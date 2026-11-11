const path = require('path');

// Load backend/.env regardless of the directory from which node is started.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { pool, testConnection } = require('./config/database');
const asyncHandler = require('./utils/asyncHandler');
const errorHandler = require('./middleware/errorHandler');

const departmentRoutes = require('./routes/departments');
const doctorRoutes = require('./routes/doctors');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const medicalRecordRoutes = require('./routes/medicalRecords');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const frontendDirectory = path.join(__dirname, '..', 'frontend');

// Parse JSON request bodies (fetch sends application/json).
app.use(express.json());

// Make req.body safe to read even when a request has no JSON body.
app.use((req, res, next) => {
  req.body = req.body || {};
  next();
});

app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.get(
  '/api/health',
  asyncHandler(async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  })
);

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);

// Unknown API URL -> JSON 404 rather than the HTML page.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ---------------------------------------------------------------------------
// Static frontend
// Express serves the HTML/CSS/JS files, so the browser, API and database all
// use one origin: http://localhost:3000
// ---------------------------------------------------------------------------
app.use(express.static(frontendDirectory));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDirectory, 'index.html'));
});

app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start the server only after confirming MySQL is reachable.
// ---------------------------------------------------------------------------
async function startServer() {
  try {
    await testConnection();
    console.log('Connected to MySQL database successfully.');

    app.listen(PORT, () => {
      console.log(`Hospital Management System is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('\nCould not connect to MySQL.');
    console.error(`Reason: ${error.message}\n`);
    console.error('Checklist:');
    console.error('  1. Is the MySQL service running?');
    console.error('  2. Did you import database/hospital_management.sql?');
    console.error('  3. Does backend/.env contain the correct DB_USER and DB_PASSWORD?');
    console.error('  4. Does the database name in .env match hospital_management?\n');
    process.exit(1);
  }
}

startServer();

// Close the pool cleanly when the server is stopped with Ctrl+C.
process.on('SIGINT', async () => {
  await pool.end();
  console.log('\nDatabase pool closed. Server stopped.');
  process.exit(0);
});
