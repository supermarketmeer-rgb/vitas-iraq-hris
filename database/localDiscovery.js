import dgram from 'dgram';
import os from 'os';

const DISCOVERY_PORT = 48888;
const DISCOVERY_REQ = 'VITAS_HRIS_DISCOVERY_REQ';

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (!iface) continue;
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
}

let udpServer = null;

export function startLocalDiscoveryServer(serverInfo = {}) {
  try {
    if (udpServer) {
      try { udpServer.close(); } catch (e) {}
    }

    udpServer = dgram.createSocket('udp4');

    udpServer.on('error', (err) => {
      console.warn('[UDP DISCOVERY] Server error:', err.message);
    });

    udpServer.on('message', (msg, rinfo) => {
      const messageStr = msg.toString().trim();
      if (messageStr === DISCOVERY_REQ || messageStr.includes('VITAS_HRIS')) {
        const localIp = getLocalIpAddress();
        const responseData = JSON.stringify({
          service: 'VITAS_IRAQ_HRMS_LOCAL_SERVER',
          role: 'LOCAL_SERVER',
          ipAddress: localIp,
          port: serverInfo.port || 5000,
          serverId: serverInfo.serverId || `SERVER-${localIp.replace(/\./g, '-')}`,
          appVersion: serverInfo.appVersion || '1.0.0',
          timestamp: Date.now()
        });

        const responseBuf = Buffer.from(responseData);
        udpServer.send(responseBuf, 0, responseBuf.length, rinfo.port, rinfo.address, (err) => {
          if (err) console.warn('[UDP DISCOVERY] Response send error:', err.message);
        });
      }
    });

    udpServer.bind(DISCOVERY_PORT, () => {
      udpServer.setBroadcast(true);
      console.log(`[UDP DISCOVERY] Local Server Discovery active on UDP port ${DISCOVERY_PORT}`);
    });
  } catch (err) {
    console.warn('[UDP DISCOVERY] Discovery server start failed:', err.message);
  }
}

export function stopLocalDiscoveryServer() {
  if (udpServer) {
    try {
      udpServer.close();
      udpServer = null;
      console.log('[UDP DISCOVERY] Discovery server stopped.');
    } catch (e) {}
  }
}
