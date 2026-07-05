// utils/imeiValidator.js

/**
 * Kiểm tra IMEI hợp lệ
 * @param {string} imei - Chuỗi IMEI cần kiểm tra
 * @param {boolean} strict - Nếu true, kiểm tra Luhn cho IMEI 15 số
 * @returns {boolean}
 */
const isValidIMEI = (imei, strict = false) => {
  if (typeof imei !== 'string') return false;
  const trimmed = imei.trim();
  
  if (!/^\d{14,16}$/.test(trimmed)) return false;

  if (strict && trimmed.length === 15) {
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(trimmed[i], 10);
      if (i % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(trimmed[14], 10);
  }

  return true;
};

module.exports = { isValidIMEI };