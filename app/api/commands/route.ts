import { NextResponse } from 'next/server';
import { publishJson } from '@/lib/rabbitmq';
import { FIRMWARE_CONFIG, type FirmwareOption } from '@/lib/config';

const FIRMWARE_BASE_URL = 'http://10.101.1.34:8080/fw';

export async function POST(request: Request) {
  const body = await request.json();
  const action: string | undefined = body?.action;
  const ip: string | undefined = body?.ip;

  if (!ip) {
    return NextResponse.json({ message: 'กรุณาระบุ IP ของชาร์จเจอร์' }, { status: 400 });
  }

  if (!action) {
    return NextResponse.json({ message: 'กรุณาระบุประเภทคำสั่ง' }, { status: 400 });
  }

  try {
    if (action === 'update_firmware') {
      const option = body?.option as FirmwareOption | undefined;
      const firmwareKey: string | undefined = body?.firmwareKey;

      if (!option || !FIRMWARE_CONFIG[option]) {
        return NextResponse.json({ message: 'ตัวเลือกเฟิร์มแวร์ไม่ถูกต้อง' }, { status: 400 });
      }

      const availableFiles = FIRMWARE_CONFIG[option];
      if (!firmwareKey || !availableFiles.includes(firmwareKey)) {
        return NextResponse.json({ message: 'ไม่พบไฟล์เฟิร์มแวร์ที่เลือก' }, { status: 400 });
      }

      const payload = {
        charger: {
          ipaddress: ip,
          command: 'update_firmware',
          key_name: `${FIRMWARE_BASE_URL}/${option}/${firmwareKey}`
        }
      };
      await publishJson(payload);
      return NextResponse.json({ success: true });
    }

    if (action === 'soft_reset') {
      const payload = {
        charger: {
          ipaddress: ip,
          command: 'soft_reset'
        }
      };
      await publishJson(payload);
      return NextResponse.json({ success: true });
    }

    if (action === 'custom_config') {
      const customPayload = body?.payload;
      if (!customPayload || typeof customPayload !== 'object') {
        return NextResponse.json({ message: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 });
      }
      await publishJson(customPayload);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: 'ไม่รองรับคำสั่งนี้' }, { status: 400 });
  } catch (error) {
    console.error('RabbitMQ publish error', error);
    return NextResponse.json({ message: 'ส่งคำสั่งไม่สำเร็จ' }, { status: 500 });
  }
}
