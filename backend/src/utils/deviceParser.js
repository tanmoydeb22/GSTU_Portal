const UAParser = require('ua-parser-js');

function parseDevice(userAgentString) {
  // If no UA or it's axios/fetch → return unknown
  if (!userAgentString ||
      userAgentString.startsWith('axios') ||
      userAgentString.startsWith('node-fetch')) {
    return {
      browser_name: 'Unknown',
      browser_version: null,
      os_name: 'Unknown',
      os_version: null,
      device_type: 'desktop',
      device_vendor: null,
      display_name: 'Unknown Device'
    };
  }

  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  const browser = result.browser.name || 'Unknown Browser';
  const browserVer = result.browser.major || null;
  const os = result.os.name || 'Unknown OS';
  const osVer = result.os.version || null;
  const deviceType = result.device.type || 'desktop';
  const vendor = result.device.vendor || null;

  // Note: Brave identifies as Chrome in UA
  // Cannot distinguish Brave from Chrome via UA alone
  // That's browser privacy by design

  return {
    browser_name: browser,
    browser_version: browserVer,
    os_name: os,
    os_version: osVer,
    device_type: deviceType,  // desktop/mobile/tablet
    device_vendor: vendor,
    display_name: `${browser} on ${os}`
  };
}

function getClientIP(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '0.0.0.0';

  // Clean up IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1'; // Show as IPv4 localhost
  }
  // Clean up IPv4-mapped IPv6
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

module.exports = { parseDevice, getClientIP };
