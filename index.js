// Google Cloud Vision API - OCR Service
import vision from '@google-cloud/vision';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

// ตั้งค่า Google Cloud Vision client
let client;

if (process.env.GOOGLE_CLOUD_API_KEY) {
  // ใช้ API Key
  client = new vision.ImageAnnotatorClient({
    apiKey: process.env.GOOGLE_CLOUD_API_KEY,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
  });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // ใช้ Service Account JSON file
  client = new vision.ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
  });
} else {
  console.log('Warning: No Google Cloud credentials found. OCR will run in mock mode.');
}

export class OCRService {
  /**
   * อ่านข้อความจากรูปภาพ
   * @param {string|Buffer} imageInput - path ของรูป หรือ buffer
   * @returns {Promise<Object>} - ผลลัพธ์การอ่าน OCR
   */
  static async detectText(imageInput) {
    try {
      console.log('Starting OCR text detection...');
      
      // สำหรับการทดสอบ - ถ้าไม่มี Google credentials จะใช้ mock data
      if (!process.env.GOOGLE_CLOUD_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('Using mock OCR data for testing...');
        
        return {
          success: true,
          message: 'อ่านข้อความจากรูปภาพสำเร็จ (Mock Mode)',
          text: 'Mock OCR Result: This is a sample text detected from image. เนื่องจากยังไม่ได้ตั้งค่า Google Cloud Vision API',
          wordCount: 20,
          details: [
            {
              text: 'Mock',
              confidence: 0.95,
              boundingBox: { vertices: [] }
            },
            {
              text: 'OCR',
              confidence: 0.98,
              boundingBox: { vertices: [] }
            },
            {
              text: 'Result',
              confidence: 0.92,
              boundingBox: { vertices: [] }
            }
          ],
          metadata: {
            totalWords: 3,
            timestamp: new Date().toISOString(),
            mode: 'mock'
          }
        };
      }
      
      // เรียกใช้ Google Cloud Vision API
      const [result] = await client.textDetection(imageInput);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        return {
          success: false,
          message: 'ไม่พบข้อความในรูปภาพ',
          text: '',
          details: []
        };
      }
      
      // ข้อความทั้งหมดที่อ่านได้
      const fullText = detections[0].description || '';
      
      // รายละเอียดแต่ละส่วนของข้อความ
      const textDetails = detections.slice(1).map(text => ({
        text: text.description,
        confidence: text.score || 0,
        boundingBox: text.boundingPoly
      }));

      // จัดเรียงข้อความตามบรรทัด (ใช้ Y-coordinate)
      const organizedByLines = this.organizeTextByLines(textDetails);
      
      console.log('OCR detection completed successfully');
      
      return {
        success: true,
        message: 'อ่านข้อความจากรูปภาพสำเร็จ',
        text: fullText.trim(),
        wordCount: fullText.trim().split(/\s+/).length,
        lines: organizedByLines,
        details: textDetails,
        metadata: {
          totalWords: textDetails.length,
          totalLines: organizedByLines.length,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('OCR Error:', error);
      
      return {
        success: false,
        message: `เกิดข้อผิดพลาด: ${error.message}`,
        text: '',
        details: [],
        error: {
          code: error.code,
          message: error.message
        }
      };
    }
  }

  /**
   * อ่านข้อความจาก URL ของรูปภาพ
   * @param {string} imageUrl - URL ของรูปภาพ
   * @returns {Promise<Object>} - ผลลัพธ์การอ่าน OCR
   */
  static async detectTextFromUrl(imageUrl) {
    try {
      console.log('Fetching image from URL:', imageUrl);
      
      // ดาวน์โหลดรูปจาก URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      // แปลงเป็น Buffer
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      
      // ส่งต่อไปยัง detectText
      return await this.detectText(imageBuffer);
      
    } catch (error) {
      console.error('OCR URL Error:', error);
      
      return {
        success: false,
        message: `ไม่สามารถดาวน์โหลดรูปภาพได้: ${error.message}`,
        text: '',
        details: []
      };
    }
  }

  /**
   * อ่านข้อความจาก Base64 string
   * @param {string} base64String - รูปภาพในรูปแบบ base64
   * @returns {Promise<Object>} - ผลลัพธ์การอ่าน OCR
   */
  static async detectTextFromBase64(base64String) {
    try {
      // ลบ data URL prefix ถ้ามี
      const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // แปลงเป็น Buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // ส่งต่อไปยัง detectText
      return await this.detectText(imageBuffer);
      
    } catch (error) {
      console.error('OCR Base64 Error:', error);
      
      return {
        success: false,
        message: `ไม่สามารถประมวลผลรูปภาพได้: ${error.message}`,
        text: '',
        details: []
      };
    }
  }

  /**
   * ตรวจหาเอกสาร (Document Text Detection) - เหมาะสำหรับเอกสารที่มีโครงสร้าง
   * @param {string|Buffer} imageInput - path ของรูป หรือ buffer
   * @returns {Promise<Object>} - ผลลัพธ์การอ่านเอกสาร
   */
  static async detectDocumentText(imageInput) {
    try {
      console.log('Starting document text detection...');
      
      const [result] = await client.documentTextDetection(imageInput);
      const fullTextAnnotation = result.fullTextAnnotation;
      
      if (!fullTextAnnotation) {
        return {
          success: false,
          message: 'ไม่พบข้อความในเอกสาร',
          text: '',
          pages: []
        };
      }
      
      const text = fullTextAnnotation.text;
      const pages = fullTextAnnotation.pages.map(page => ({
        width: page.width,
        height: page.height,
        blocks: page.blocks.length,
        confidence: page.confidence || 0
      }));
      
      console.log('Document detection completed successfully');
      
      return {
        success: true,
        message: 'อ่านเอกสารสำเร็จ',
        text: text.trim(),
        pages: pages,
        metadata: {
          totalPages: pages.length,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Document OCR Error:', error);
      
      return {
        success: false,
        message: `เกิดข้อผิดพลาดในการอ่านเอกสาร: ${error.message}`,
        text: '',
        pages: [],
        error: {
          code: error.code,
          message: error.message
        }
      };
    }
  }

  /**
   * จัดกลุ่มข้อความตามบรรทัด (ใช้ Y-coordinate)
   * @param {Array} textDetails - รายละเอียดข้อความแต่ละคำ
   * @returns {Array} - ข้อความที่จัดกลุ่มตามบรรทัด
   */
  static organizeTextByLines(textDetails) {
    if (!textDetails || textDetails.length === 0) {
      return [];
    }

    // สำคัญ: จัดเรียงตาม Y-coordinate ก่อน
    const sortedTexts = textDetails.slice().sort((a, b) => {
      const aY = a.boundingBox?.vertices?.[0]?.y || 0;
      const bY = b.boundingBox?.vertices?.[0]?.y || 0;
      return aY - bY;
    });

    const lines = [];
    let currentLine = null;
    const lineThreshold = 20; // ระยะห่างของบรรทัด (pixels)

    for (const text of sortedTexts) {
      const textY = text.boundingBox?.vertices?.[0]?.y || 0;
      const textX = text.boundingBox?.vertices?.[0]?.x || 0;

      // เช็คว่าเป็นบรรทัดใหม่หรือไม่
      if (!currentLine || Math.abs(textY - currentLine.averageY) > lineThreshold) {
        // สร้างบรรทัดใหม่
        currentLine = {
          lineNumber: lines.length + 1,
          averageY: textY,
          words: [text],
          text: text.text,
          boundingBox: {
            minX: textX,
            maxX: textX,
            minY: textY,
            maxY: textY
          }
        };
        lines.push(currentLine);
      } else {
        // เพิ่มคำในบรรทัดปัจจุบัน
        currentLine.words.push(text);
        currentLine.text += ' ' + text.text;
        
        // อัพเดท bounding box
        const textMaxX = text.boundingBox?.vertices?.[1]?.x || textX;
        const textMaxY = text.boundingBox?.vertices?.[2]?.y || textY;
        
        currentLine.boundingBox.minX = Math.min(currentLine.boundingBox.minX, textX);
        currentLine.boundingBox.maxX = Math.max(currentLine.boundingBox.maxX, textMaxX);
        currentLine.boundingBox.minY = Math.min(currentLine.boundingBox.minY, textY);
        currentLine.boundingBox.maxY = Math.max(currentLine.boundingBox.maxY, textMaxY);
      }
    }

    // จัดเรียงคำในแต่ละบรรทัดตาม X-coordinate (ซ้ายไปขวา)
    lines.forEach(line => {
      line.words.sort((a, b) => {
        const aX = a.boundingBox?.vertices?.[0]?.x || 0;
        const bX = b.boundingBox?.vertices?.[0]?.x || 0;
        return aX - bX;
      });
      
      // สร้างข้อความใหม่จากคำที่เรียงแล้ว
      line.text = line.words.map(w => w.text).join(' ');
    });

    return lines.map(line => ({
      lineNumber: line.lineNumber,
      text: line.text,
      wordCount: line.words.length,
      words: line.words.map(w => ({
        text: w.text,
        confidence: w.confidence,
        position: {
          x: w.boundingBox?.vertices?.[0]?.x || 0,
          y: w.boundingBox?.vertices?.[0]?.y || 0
        }
      })),
      boundingBox: line.boundingBox
    }));
  }
}
