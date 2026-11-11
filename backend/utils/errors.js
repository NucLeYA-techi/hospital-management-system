// A tiny error helper. Routes throw these errors and the central error
// handler turns them into clean JSON responses for the frontend.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function httpError(status, message) {
  return new HttpError(status, message);
}

module.exports = { httpError };
