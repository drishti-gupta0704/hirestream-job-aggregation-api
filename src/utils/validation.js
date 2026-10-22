function requiredString(value, field, max = 255) {
  if (typeof value !== 'string' || !value.trim()) {
    const error = new Error(`${field} is required.`);
    error.status = 400;
    throw error;
  }
  if (value.trim().length > max) {
    const error = new Error(`${field} must be at most ${max} characters.`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function optionalNumber(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    const error = new Error(`${field} must be a non-negative number.`);
    error.status = 400;
    throw error;
  }
  return number;
}

function parseSkills(value) {
  if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean).slice(0, 50);
  if (typeof value === 'string') return value.split(/[;,]/).map(s => s.trim()).filter(Boolean).slice(0, 50);
  return [];
}

module.exports = { requiredString, optionalNumber, parseSkills };