// Central error handler. Database errors are translated into messages that
// make sense to a user instead of exposing raw SQL.
function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  // Log the full error on the server for debugging.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.error(error);

  // Validation errors and "not found" errors thrown by our routes.
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }

  // MySQL error codes:
  // https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
  if (error.code === 'ER_DUP_ENTRY') {
    const message = String(error.sqlMessage || '');

    if (message.includes('uq_doctor_slot')) {
      return res.status(409).json({
        error:
          'This doctor already has an appointment at the selected date and time. Please choose another slot.'
      });
    }

    if (message.includes('email')) {
      return res.status(409).json({
        error: 'That email address is already registered. Please use another one.'
      });
    }

    if (message.includes('department_name')) {
      return res.status(409).json({
        error: 'A department with that name already exists.'
      });
    }

    return res.status(409).json({
      error: 'This record would create a duplicate value. Please check the form.'
    });
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      error:
        'This record cannot be deleted because other records still depend on it. Remove or reassign them first.'
    });
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      error: 'A related record selected in the form does not exist.'
    });
  }

  if (
    error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ||
    error.code === 'ER_CONSTRAINT_FAILED'
  ) {
    return res.status(400).json({
      error: 'One of the values entered is not allowed by the database rules.'
    });
  }

  if (error.code === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({
      error: 'One of the values entered is too long for its database column.'
    });
  }

  // Anything unexpected: log the details above, but keep the response generic.
  return res.status(500).json({
    error: 'An unexpected server error occurred. Please try again.'
  });
}

module.exports = errorHandler;
