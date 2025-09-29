# EVMS Charger Dashboard

เว็บแอป Next.js 14 + TypeScript สำหรับติดตามสถานะสถานีชาร์จรถไฟฟ้าและสั่งงานผ่าน RabbitMQ ตามข้อกำหนดของระบบ EVMS

## คุณสมบัติหลัก

- แดชบอร์ดภาพรวม `/dashboard`
  - การ์ดสรุปจำนวนชาร์จเจอร์ Online / Offline / Fault (คลาสสิฟายจากค่า `cl.online`: 1 = Online, 0 = Offline, อื่น ๆ = Fault)
  - กราฟแท่งแนวนอนแสดงสัดส่วนสถานะแยกตาม `charger_point_model`
  - ตารางสรุปรุ่นชาร์จเจอร์พร้อม % Online
  - ฟิลเตอร์ช่วงเวลา (24 ชม./7 วัน/30 วัน), จังหวัด และประเภทสถานี พร้อมรีเฟรชอัตโนมัติ 60 วินาที

- หน้ารายการสถานี `/stations`
  - กล่องค้นหา + ฟิลเตอร์จังหวัด/ประเภท/สถานะ Online-Offline
  - การ์ดสถานีแสดง EC_ID, จังหวัด, จำนวนชาร์จเจอร์ พร้อมปุ่ม “ดูรายละเอียด”
  - รองรับ pagination (9 การ์ดต่อหน้า) และสถานะว่างเปล่าเมื่อไม่พบข้อมูล

- หน้ารายละเอียดสถานี `/stations/[id]`
  - แสดงข้อมูลหัวสถานีพร้อมสรุปและเวลาปรับปรุงล่าสุด (Asia/Bangkok)
  - Grid การ์ดชาร์จเจอร์พร้อมสถานะ (ONLINE/OFFLINE/FAULT/UNKNOWN), IP, Model, Firmware, OCPP, Connector, Server URL 1/2
  - ปุ่มคำสั่ง **Update Firmware / Custom Config / Reboot** พร้อมป๊อปอัปยืนยันและ Toast สถานะ
  - อัปเดตสถานะแบบเรียลไทม์ผ่าน SSE (fallback polling 60 วินาที)

## การเชื่อมต่อฐานข้อมูล MySQL

ตั้งค่าตัวแปรสภาพแวดล้อมตามไฟล์ `.env.example`

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=evms
MYSQL_PASSWORD=secret
MYSQL_DATABASE=evms_v2
MYSQL_TIMEZONE=Asia/Bangkok
```

แอปใช้ไลบรารี `mysql2/promise` สร้าง connection pool และทุกคำสั่ง SQL ใช้ prepared statement เพื่อป้องกัน SQL injection

### Mapping คอลัมน์ → ฟิลด์ UI

| คอลัมน์ฐานข้อมูล | ฟิลด์ UI |
| ------------------ | -------- |
| `s.ax_cost_center` | `EC_ID` |
| `COALESCE(s.station_name_th, s.station_name_en, s.station_name)` | `Station Name` |
| `p.province_name_th / province_name_en` | จังหวัด TH/EN |
| `COALESCE(st.name_th, st.name_en)` | Station Type |
| `cl.charger_point_name` | Charger ID/Name |
| `cl.ip_address` | IP Charger |
| `cl.charger_point_model` | Charger Point Model |
| `cl.firmware_version` | Firmware |
| `cl.online` | สถานะ (1 = ONLINE, 0 = OFFLINE, อื่น ๆ = FAULT/UNKNOWN) |
| `cl.heartbeat_timestamp` | Last Time (ปรับเป็น Asia/Bangkok) |
| `cl.server_url`, `cl.server_url2` | Server Url 1/2 |
| `c.ocpp_version` | OCPP |
| `cl.connector_count` | Connector count |

## RabbitMQ

ตั้งค่าตัวแปรสภาพแวดล้อม:

```env
# RabbitMQ (ใช้ RABBIT_URL ก่อน, ถ้าไม่ตั้ง ให้ประกอบจาก HOST/PARAMS)
# แบบรวมเดียว (ถ้ามีจะถูกใช้ก่อน)
RABBIT_URL=

# แบบแยกส่วน (จะถูกใช้เมื่อ RABBIT_URL ว่าง)
RABBIT_HOST=host
RABBIT_PORT=5672
RABBIT_USER=user
RABBIT_PASSWORD=pass
RABBIT_VHOST=vhost

# Exchange settings
RABBIT_EXCHANGE=evmswss_command
RABBIT_EXCHANGE_TYPE=fanout
RABBIT_ROUTING_KEY=
```

ทุกคำสั่ง publish ไปยัง exchange `evmswss_command` (fanout) ด้วยคุณสมบัติ `contentType=application/json` และ `persistent=true`

### รูปแบบ Payload (ต้องตรงตามสเปก)

- **Update Firmware**

```json
{"charger":{"ipaddress":"<IP>","command":"update_firmware","key_name":"http://10.101.1.34:8080/fw/<หมวด>/<ไฟล์>"}}
```

- **Custom Config** — ส่ง JSON ที่ผู้ใช้กรอกโดยตรง (ไม่มีการห่อ/เพิ่มคีย์)

- **Reboot**

```json
{"charger":{"ipaddress":"<IP>","command":"soft_reset"}}
```

## การรันโปรเจกต์

```bash
pnpm install   # หรือ npm install / yarn
pnpm dev       # เริ่มเซิร์ฟเวอร์ development ที่ http://localhost:3000
```

> แนะนำให้สร้างไฟล์ `.env.local` จาก `.env.example` แล้วกรอกข้อมูลจริงก่อนรัน

## เช็กลิสต์การทดสอบ

- [ ] เชื่อมต่อ MySQL สำเร็จ (`/api/stations`, `/api/dashboard` คืนข้อมูลได้)
- [ ] ฟิลเตอร์หน้าดแดชบอร์ดและสถานีทำงานถูกต้อง (มีการจำกัดผลลัพธ์ + pagination)
- [ ] เปิดโมดอล Update Firmware เลือกหมวด/ไฟล์และส่งคำสั่งได้
- [ ] โมดอล Custom Config ตรวจสอบ JSON และส่ง payload ตรงตามที่กรอก
- [ ] โมดอล Reboot ต้องยืนยัน 2 ชั้นก่อนส่งคำสั่ง soft reset
- [ ] RabbitMQ รับ payload ได้ถูกต้องตามสเปกทั้ง 3 แบบ
- [ ] การอัปเดตสถานะชาร์จเจอร์แบบเรียลไทม์ทำงาน (SSE) และ fallback polling 60 วินาทีเมื่อเชื่อมต่อไม่ได้
- [ ] หน้าเว็บรองรับอุปกรณ์มือถือ/คีย์บอร์ด และคะแนน Lighthouse ≥ 90

## โครงสร้างสำคัญ

```
app/
  dashboard/          # หน้าแดชบอร์ด
  stations/           # หน้า Stations และรายละเอียด
  api/                # API เชื่อม MySQL + RabbitMQ
components/
  dashboard/, stations/, chargers/ และ shadcn/ui components
lib/
  db.ts, rabbitmq.ts, config.ts, time.ts, validators.ts
```

## หมายเหตุการปรับแต่ง

- หากไม่มีแหล่งข้อมูล WS จริง ระบบจะ fallback เป็นการ polling ผ่าน React Query/SSE ทุก 30-60 วินาที
- สามารถปรับรายการไฟล์เฟิร์มแวร์ใน `lib/config.ts` ตามสภาพแวดล้อมจริงได้ทันทีโดยไม่ต้องแก้โค้ดส่วนอื่น
