import os from 'os';
import { NextRequest, NextResponse } from 'next/server';

export interface NetworkInterfaceInfo {
  address: string;
  family: string;
  interfaceName: string;
  isPrivate: boolean;
  url: string;
}

export async function GET(req: NextRequest) {
  try {
    const interfaces = os.networkInterfaces();
    const addresses: NetworkInterfaceInfo[] = [];

    const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
    const protoHeader = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http');
    const port = hostHeader.includes(':') ? hostHeader.split(':')[1] : (protoHeader === 'https' ? '443' : '3000');

    for (const [name, netInterface] of Object.entries(interfaces)) {
      if (!netInterface) continue;
      for (const iface of netInterface) {
        // Only IPv4 and non-internal
        if (iface.family === 'IPv4' && !iface.internal) {
          const isPrivate =
            iface.address.startsWith('192.168.') ||
            iface.address.startsWith('10.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(iface.address);

          addresses.push({
            address: iface.address,
            family: iface.family,
            interfaceName: name,
            isPrivate,
            url: `${protoHeader}://${iface.address}${port && port !== '80' && port !== '443' ? `:${port}` : ''}`,
          });
        }
      }
    }

    // Default current URL (useful in cloud preview or local browser)
    const currentUrl = `${protoHeader}://${hostHeader}`;

    return NextResponse.json({
      localIps: addresses,
      currentUrl,
      detectedHost: hostHeader,
      protocol: protoHeader,
      port: port || '3000',
    });
  } catch (error: any) {
    console.error('Error in network-info route:', error);
    return NextResponse.json(
      {
        localIps: [],
        currentUrl: 'http://localhost:3000',
        detectedHost: 'localhost:3000',
        protocol: 'http',
        port: '3000',
      },
      { status: 200 }
    );
  }
}
