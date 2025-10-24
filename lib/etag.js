const crypto = require('crypto');

function etagFor(obj) {
  const json = JSON.stringify(obj);
  const hash = crypto.createHash('sha256').update(json).digest('base64url');
  return `"perm-${hash}"`;
}

module.exports = { etagFor };
