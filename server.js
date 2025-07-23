// OCR API Server - Express.js
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { OCRService } from './index.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer สำหรับรับไฟล์รูป
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบ file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Routes

// 🏠 Home - API Info
app.get('/', (req, res) => {
  res.json({
    service: 'TEXTBot OCR API',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      'GET /': 'API information',
      'POST /ocr/text': 'Text detection from uploaded image',
      'POST /ocr/url': 'Text detection from image URL',
      'POST /ocr/base64': 'Text detection from base64 image',
      'POST /ocr/document': 'Document text detection from uploaded image',
      'GET /health': 'Health check'
    },
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 🔍 OCR: Text Detection from uploaded file
app.post('/ocr/text', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาอัพโหลดไฟล์รูปภาพ',
        error: 'No image file provided'
      });
    }

    console.log('📷 Processing uploaded image:', req.file.originalname);
    
    const result = await OCRService.detectText(req.file.buffer);
    
    res.json({
      ...result,
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      },
      api: {
        endpoint: '/ocr/text',
        method: 'POST',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('OCR Text Error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ',
      error: error.message,
      api: {
        endpoint: '/ocr/text',
        method: 'POST',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 🌐 OCR: Text Detection from URL
app.post('/ocr/url', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ URL ของรูปภาพ',
        error: 'No imageUrl provided'
      });
    }

    console.log('🌐 Processing image URL:', imageUrl);
    
    const result = await OCRService.detectTextFromUrl(imageUrl);
    
    res.json({
      ...result,
      input: {
        imageUrl: imageUrl
      },
      api: {
        endpoint: '/ocr/url',
        method: 'POST',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('OCR URL Error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผล URL',
      error: error.message,
      api: {
        endpoint: '/ocr/url',
        method: 'POST',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 📄 OCR: Text Detection from Base64
app.post('/ocr/base64', async (req, res) => {
  try {
    const { base64Image } = req.body;
    
    if (!base64Image) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ base64 ของรูปภาพ',
        error: 'No base64Image provided'
      });
    }

    console.log('📄 Processing base64 image');
    
    const result = await OCRService.detectTextFromBase64(base64Image);
    
    res.json({
      ...result,
      input: {
        base64Length: base64Image.length
      },
      api: {
        endpoint: '/ocr/base64',
        method: 'POST',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('OCR Base64 Error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผล base64',
      error: error.message,
      api: {
        endpoint: '/ocr/base64',
        method: 'POST',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 📑 OCR: Document Text Detection from uploaded file
app.post('/ocr/document', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาอัพโหลดไฟล์เอกสาร',
        error: 'No document file provided'
      });
    }

    console.log('📑 Processing document:', req.file.originalname);
    
    const result = await OCRService.detectDocumentText(req.file.buffer);
    
    res.json({
      ...result,
      file: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      },
      api: {
        endpoint: '/ocr/document',
        method: 'POST',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('OCR Document Error:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผลเอกสาร',
      error: error.message,
      api: {
        endpoint: '/ocr/document',
        method: 'POST',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 💊 Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'OCR API',
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'ไฟล์ใหญ่เกินไป (สูงสุด 10MB)',
        error: 'File too large'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
    error: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'ไม่พบ endpoint ที่ต้องการ',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'POST /ocr/text',
      'POST /ocr/url', 
      'POST /ocr/base64',
      'POST /ocr/document',
      'GET /health'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 OCR API Server started successfully!');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/`);
  console.log(`💊 Health Check: http://localhost:${PORT}/health`);
  console.log('🔍 Available endpoints:');
  console.log('   POST /ocr/text     - Upload image file');
  console.log('   POST /ocr/url      - Image from URL'); 
  console.log('   POST /ocr/base64   - Base64 image');
  console.log('   POST /ocr/document - Document OCR');
  console.log('   GET  /health       - Health check');
  console.log('\n✨ Ready to process OCR requests!');
});

export default app;
