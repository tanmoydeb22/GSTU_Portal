const crypto = require('crypto');

function generateStudentPassword() {
  // Format: GSTU@XXXX1234
  // Letters + numbers = hard to guess, easy to type
  
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I, O (confusing)
  const numbers = '23456789';                  // no 0, 1 (confusing)
  
  let pass = 'GSTU@';
  
  // 4 random letters
  for (let i = 0; i < 4; i++) {
    pass += letters[crypto.randomInt(0, letters.length)];
  }
  
  // 4 random numbers
  for (let i = 0; i < 4; i++) {
    pass += numbers[crypto.randomInt(0, numbers.length)];
  }
  
  return pass; // e.g. GSTU@XKMP2387
}

function generateAdminTempPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Admin@GSTU${suffix}`;
}

module.exports = { generateStudentPassword, generateAdminTempPassword };
