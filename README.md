# OCR Service - Google Cloud Vision API

## การตั้งค่า

### 1. ติดตั้ง Dependencies
```bash
cd backend/ocr
npm install
```

### 2. ตั้งค่า Google Cloud Credentials

#### วิธีที่ 1: ใช้ API Key (แนะนำ - ง่ายกว่า)
1. สร้าง API Key ใน Google Cloud Console
2. เปิดใช้งาน Cloud Vision API สำหรับ project
3. ตั้งค่า environment variables:
```bash
export GOOGLE_CLOUD_API_KEY="your-api-key-here"
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
```

#### วิธีที่ 2: ใช้ Service Account Key File
1. สร้าง Service Account ใน Google Cloud Console
2. ดาวน์โหลด JSON key file
3. วางไฟล์ในโฟลเดอร์ `backend/ocr/` ชื่อ `google-credentials.json`
4. ตั้งค่า environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
```

#### วิธีที่ 3: ใช้ Default Application Credentials
```bash
gcloud auth application-default login
```

### 3. เปิดใช้งาน API
ใน Google Cloud Console เปิดใช้งาน:
- Cloud Vision API

## การใช้งาน

### อ่านข้อความจากไฟล์รูป
```javascript
import { OCRService } from './index.js';

const result = await OCRService.detectText('./image.jpg');
console.log(result.text);
```

### อ่านข้อความจาก URL
```javascript
const result = await OCRService.detectTextFromUrl('https://example.com/image.jpg');
console.log(result.text);
```

### อ่านข้อความจาก Base64
```javascript
const result = await OCRService.detectTextFromBase64(base64String);
console.log(result.text);
```

### อ่านเอกสาร (Document Text Detection)
```javascript
const result = await OCRService.detectDocumentText('./document.pdf');
console.log(result.text);
```

## Response Format

```javascript
{
  success: true,
  message: "อ่านข้อความจากรูปภาพสำเร็จ",
  text: "ข้อความที่อ่านได้",
  wordCount: 10,
  details: [
    {
      text: "คำ",
      confidence: 0.95,
      boundingBox: {...}
    }
  ],
  metadata: {
    totalWords: 5,
    timestamp: "2025-07-22T..."
  }
}
```

## ตัวอย่างการใช้งานใน LINE Bot

เมื่อผู้ใช้ส่งรูปมา สามารถใช้ OCR อ่านข้อความและตอบกลับได้:

```javascript
import { OCRService } from './ocr/index.js';

// ใน webhook handler
if (event.type === 'message' && event.message.type === 'image') {
  // ดาวน์โหลดรูปจาก LINE
  const imageBuffer = await line.getMessageContent(event.message.id);
  
  // อ่านข้อความ
  const ocrResult = await OCRService.detectText(imageBuffer);
  
  // ตอบกลับ
  await line.replyMessage(event.replyToken, {
    type: 'text',
    text: `ข้อความที่อ่านได้: ${ocrResult.text}`
  });
}
```
