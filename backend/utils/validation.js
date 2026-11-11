const { httpError } = require('./errors');

// These helpers keep input checks in one place. They throw an HttpError with
// status 400 when the request body contains an invalid value.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function requiredString(value, fieldName, maxLength) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw httpError(400, `${fieldName} is required.`);
  }

  const text = value.trim();

  if (maxLength && text.length > maxLength) {
    throw httpError(400, `${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return text;
}

function optionalString(value, fieldName, maxLength) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  return requiredString(String(value), fieldName, maxLength);
}

function requiredEmail(value, fieldName) {
  const email = requiredString(value, fieldName, 100).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw httpError(400, `${fieldName} must be a valid email address.`);
  }

  return email;
}

function optionalEmail(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  return requiredEmail(value, fieldName);
}

function requiredInt(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    throw httpError(400, `${fieldName} is required.`);
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw httpError(400, `${fieldName} must be a positive whole number.`);
  }

  return number;
}

function requiredDate(value, fieldName) {
  const text = requiredString(value, fieldName);

  if (!DATE_PATTERN.test(text)) {
    throw httpError(400, `${fieldName} must use the YYYY-MM-DD format.`);
  }

  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) {
    throw httpError(400, `${fieldName} is not a real calendar date.`);
  }

  return text;
}

function requiredTime(value, fieldName) {
  const text = requiredString(value, fieldName);

  if (!TIME_PATTERN.test(text)) {
    throw httpError(400, `${fieldName} must use the HH:MM or HH:MM:SS format.`);
  }

  // MySQL accepts HH:MM, but normalizing to HH:MM:SS keeps responses uniform.
  return text.length === 5 ? `${text}:00` : text;
}

function requiredDecimal(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw httpError(400, `${fieldName} is required.`);
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw httpError(400, `${fieldName} must be a number.`);
  }

  if (number < 0) {
    throw httpError(400, `${fieldName} cannot be negative.`);
  }

  return number.toFixed(2);
}

function oneOf(value, allowedValues, fieldName, defaultValue) {
  if (
    (value === undefined || value === null || String(value).trim() === '') &&
    defaultValue !== undefined
  ) {
    return defaultValue;
  }

  if (!allowedValues.includes(value)) {
    throw httpError(
      400,
      `${fieldName} must be one of: ${allowedValues.join(', ')}.`
    );
  }

  return value;
}

function optionalOneOf(value, allowedValues, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  if (!allowedValues.includes(value)) {
    throw httpError(
      400,
      `${fieldName} must be one of: ${allowedValues.join(', ')}.`
    );
  }

  return value;
}

module.exports = {
  requiredString,
  optionalString,
  requiredEmail,
  optionalEmail,
  requiredInt,
  requiredDate,
  requiredTime,
  requiredDecimal,
  oneOf,
  optionalOneOf
};
