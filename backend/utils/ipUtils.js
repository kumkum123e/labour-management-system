const isPrivateIp = (ip) => {
  if (!ip) return false;
  const trimmed = ip.trim().toLowerCase();
  
  // Handle zone index in IPv6 (e.g. fe80::abcd%12 or fe80::1%lo0 or ::1%1)
  const cleanIp = trimmed.split('%')[0].trim();

  // Directly check loopback and localhost
  if (
    cleanIp === '::1' || 
    cleanIp === 'localhost' || 
    cleanIp === '127.0.0.1' || 
    cleanIp === '::ffff:127.0.0.1'
  ) {
    return true;
  }

  // Check IPv6 private/local ranges
  // 1. Link-local (fe80::/10)
  if (cleanIp.startsWith('fe80:')) return true;
  // 2. Unique Local Address (fc00::/7)
  if (cleanIp.startsWith('fc00:') || cleanIp.startsWith('fd00:')) return true;

  // Clean IPv4-mapped IPv6 format (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
  const ipv4Match = cleanIp.match(/^(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) {
    const ipv4 = ipv4Match[1];
    
    // Check IPv4 private/local ranges
    // Loopback: 127.0.0.0/8
    if (ipv4.startsWith('127.')) return true;
    // Private Network: 10.0.0.0/8
    if (ipv4.startsWith('10.')) return true;
    // Link-local: 169.254.0.0/16
    if (ipv4.startsWith('169.254.')) return true;
    // Private Network: 192.168.0.0/16
    if (ipv4.startsWith('192.168.')) return true;
    // Private Network: 172.16.0.0/12 (172.16.* to 172.31.*)
    if (ipv4.startsWith('172.')) {
      const parts = ipv4.split('.');
      if (parts.length >= 2) {
        const secondOctet = parseInt(parts[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) return true;
      }
    }
  }

  return false;
};

module.exports = { isPrivateIp };
