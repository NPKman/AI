# EA_USDJPY – Expert Advisor เพื่อความปลอดภัยระยะยาวบน USDJPY

> **คำเตือน**: ห้ามนำ EA นี้ไปใช้งานจริงโดยไม่ทำการ Backtest และ Forward Test อย่างละเอียด พร้อมปรับความเสี่ยงให้เหมาะสมกับพอร์ตของคุณ

## ภาพรวม
EA_USDJPY ถูกออกแบบให้เทรดเฉพาะคู่เงิน USDJPY โดยให้ความสำคัญกับการจำกัดความเสี่ยงในแต่ละดีลและทั้งวันเป็นอันดับแรก ตัวระบบประกอบด้วยโมดูลย่อยที่แบ่งหน้าที่ชัดเจน ทำให้ง่ายต่อการอ่าน ทดสอบ และปรับแต่งเพิ่มเติม

## โครงสร้างไฟล์
```
mql5/EA_USDJPY/
├── EA_USDJPY.mq5               // ไฟล์หลักของ EA
├── modules/
│   ├── Logger.mqh              // ระบบบันทึก log
│   ├── NewsFilter.mqh          // ฟิลเตอร์ข่าว (โครงสำหรับต่อยอด)
│   ├── Regime.mqh              // วิเคราะห์สภาวะตลาด Trend/Range
│   ├── RiskManager.mqh         // คำนวณความเสี่ยงต่อดีลและควบคุม Daily Loss
│   ├── Signals.mqh             // เงื่อนไขสัญญาณเข้าออกสองโหมด
│   ├── TradeManager.mqh        // จัดการคำสั่ง ซื้อ/ขาย/Trail
│   └── Utils.mqh               // ฟังก์ชันอรรถประโยชน์ เช่น PipSize, TimeWindow
└── sample_log.csv              // ตัวอย่างรูปแบบ Log CSV
```

## วิธีติดตั้ง
1. เปิด MetaTrader 5 และไปที่ `File > Open Data Folder`
2. คัดลอกโฟลเดอร์ `mql5/EA_USDJPY` ทั้งชุดไปยัง `MQL5/Experts/EA_USDJPY`
3. เปิด MetaEditor 5 แล้วทำการคอมไพล์ไฟล์ `EA_USDJPY.mq5`
4. ลาก EA ไปใส่กราฟ `USDJPY` เท่านั้นและตรวจสอบว่าอนุญาต Algo Trading

## การตั้งค่าหลัก (Inputs)
- **System**
  - `InpMagic`: Magic Number เฉพาะของ EA
  - `InpAllowLong / InpAllowShort`: เปิด/ปิดฝั่ง Buy หรือ Sell
  - `InpOneTradePerBar`: ป้องกันไม่ให้เปิดซ้ำภายในแท่งเดียว
- **Risk Management**
  - `InpRiskPerTradePct`: % ของ Equity ที่ยอมเสี่ยงต่อดีล
  - `InpDailyLossPctCap`: % ขาดทุนต่อวันที่ยอมรับ (หยุดเทรดเมื่อแตะ)
  - `InpMaxPositions`: จำนวนโพสิชั่นเปิดพร้อมกันสูงสุด (แนะนำ 1)
- **Filters**
  - `InpUseNewsFilter`: เปิดใช้ตัวกรองข่าว (ปัจจุบันเป็น Stub)
  - `InpMaxSpreadPips`: ไม่เทรดเมื่อสเปรดสูงกว่าค่านี้
- **Regime & Signals**
  - พารามิเตอร์ของ MA/ADX/RSI/Bollinger เพื่อตรวจจับสภาวะตลาด
  - `InpStrategyMode`: โหมดทดสอบ – Auto / Trend Only / Mean-Only
- **Stops / Targets**
  - `InpSL_ATR_Mult`, `InpTP_RR`: ตั้งค่า SL/TP จาก ATR
  - `InpUseATRTrailing`: ใช้ Trail SL จาก ATR หรือไม่
- **Time Window**
  - กำหนดชั่วโมงที่อนุญาตให้ EA ทำงาน

## กลยุทธ์โดยสรุป
- **Regime Filter**: แยกระหว่างช่วงแนวโน้ม (Trend) และแกว่งตัว (Mean Reversion) โดยดูจาก MA50/200 และค่า ADX
- **Trend Mode**: เทรดตามทิศที่ MA จัดเรียง + ADX สูงกว่าค่ากำหนด และมีสัญญาณ Pullback
- **Mean Reversion Mode**: ใช้ Bollinger Bands + RSI + ATR เพื่อหาจุดกลับตัวในกรอบราคา และเลี่ยงเมื่อ ADX สูง (เทรนด์แรง)
- **Risk**: คำนวณ Lot จากเปอร์เซ็นต์ความเสี่ยงที่ตั้งไว้ ควบคุมยอดขาดทุนรวมต่อวัน และป้องกันการเปิดซ้ำหลายโพสิชั่น

## การทดสอบ Backtest / Forward Test
1. เปิด Strategy Tester และเลือก EA_USDJPY บนกราฟ `USDJPY`
2. เลือกโหมด `Every tick based on real ticks` เพื่อความแม่นยำ
3. ตั้ง `InpStrategyMode` เป็น `MODE_AUTO` เพื่อให้ EA เลือกโหมดตาม Regime
4. สำหรับการทดสอบเฉพาะสถานการณ์:
   - เทรนด์อย่างเดียว: เลือก `MODE_TREND_ONLY`
   - แกว่งตัวอย่างเดียว: เลือก `MODE_MEAN_ONLY`
5. ช่วงเวลาที่แนะนำสำหรับ Backtest: H1 หรือ M15 พร้อม Spread ที่สมจริง
6. หลังจบ Backtest ตรวจสอบผลใน Journal (สถิติรวมจะถูก Log ผ่าน Logger)
7. Forward Test บนบัญชีเดโม่อย่างน้อย 4–6 สัปดาห์เพื่อยืนยันเสถียรภาพ

## โปรไฟล์ความเสี่ยงที่แนะนำ
| โปรไฟล์ | InpRiskPerTradePct | InpDailyLossPctCap | InpMaxPositions |
|---------|--------------------|--------------------|-----------------|
| ปลอดภัยมาก | 0.25 | 1.0 | 1 |
| ปกติ | 0.50 | 2.0 | 1 |
| เชิงรุก (ยังคงปลอดภัย) | 0.70 | 2.0 | 1 |

> ปรับเวลาเทรดและค่าสเปรดสูงสุดให้เหมาะสมกับโบรกเกอร์ของคุณ โดยเฉพาะช่วง Tokyo/London overlap ซึ่งให้สภาพคล่องดีที่สุดสำหรับ USDJPY

## การเชื่อมต่อ News Filter (แนวทางต่อยอด)
- ปัจจุบัน `NewsFilter.mqh` เป็นโครงสร้างให้สามารถเชื่อมต่อไฟล์ CSV หรือ API ภายนอกได้ในอนาคต
- เมื่อพร้อมใช้งาน ให้ปรับให้เมธอด `ShouldBlock()` คืนค่า `true` เมื่อเข้าโซนข่าวแรง (ภายในเวลาบัฟเฟอร์ก่อน/หลัง)

## ตัวอย่างผล Log CSV
ดูรูปแบบในไฟล์ `sample_log.csv`
```
timestamp,event,message,extra
2024-03-01 08:00:01,INFO,Init,Starting EA
2024-03-01 09:15:02,INFO,Signal,Trade executed|REGIME_TREND
2024-03-01 10:45:00,WARN,RiskManager,Daily loss cap reached|2.10
```

## การวิเคราะห์ผลหลังเทรด
- ตรวจสอบค่าเฉลี่ย R:R และ Max Drawdown จาก Logger
- เทียบจำนวน Win/Loss กับความเสี่ยงต่อดีลที่ตั้งไว้
- หาก Daily Loss Cap ถูกทริกเกอร์บ่อย ให้ลดความเสี่ยงต่อดีลหรือปรับ Time Window

## ข้อควรระวังสำหรับผู้พัฒนา
- ระบบนี้ไม่รองรับการเฉลี่ยขาดทุนหรือ Martingale ทุกกรณี
- หากต้องเพิ่มคุณสมบัติใหม่ ให้รักษาโครงสร้างโมดูลเดิมเพื่อความง่ายในการทดสอบ
- ใช้ `HistorySelect` ให้ครอบคลุมช่วงเวลาที่ต้องการก่อนอ่านประวัติคำสั่ง

## พารามิเตอร์แนะนำสำหรับ USDJPY
- Timeframe: H1 (สามารถลอง M30/M15)
- `InpMaxSpreadPips`: 2.0 หรือต่ำกว่า
- `InpStartHour = 6`, `InpEndHour = 22` (ปรับตามเวลาเซิร์ฟเวอร์โบรกเกอร์)
- `InpUseATRTrailing = true` พร้อม `InpTrail_ATR_Mult = 1.5`

> **จำอีกครั้ง**: ความเสี่ยงอยู่ที่คุณ ผู้พัฒนาจะไม่รับผิดชอบความเสียหายจากการใช้งานจริง
