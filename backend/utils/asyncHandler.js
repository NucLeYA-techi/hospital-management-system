// Express 4 does not automatically catch rejected promises from async route
// handlers. This wrapper forwards any error to the central error handler.
function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
