// OCR API Server - Express.js
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { OCRService } from './index.js';

const app = express();
const PORT = 3001;

// Debug environment variables
console.log('🔍 Debug Environment Variables:');
console.log('GOOGLE_CLOUD_API_KEY:', process.env.GOOGLE_CLOUD_API_KEY ? '✅ Found' : '❌ Missing');
console.log('GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID ? '✅ Found' : '❌ Missing');
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ Found' : '❌ Missing');

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

// ===== API v1 Routes (Simple Response) =====
// API v1 Home - รองรับทั้ง GET และ POST
app.get('/api/v1/', (req, res) => {
  res.json({
    service: 'TEXTBot OCR API v1',
    version: '1.0.0',
    description: 'Simple OCR API - returns only text results',
    endpoints: {
      'GET /api/v1/': 'API v1 information',
      'POST /api/v1/': 'Universal endpoint - accepts base64 image data',
      'POST /api/v1/ocr/url': 'Image from URL (returns: {"text":"..."})',
      'POST /api/v1/ocr/text': 'Upload image file (returns: {"text":"..."})',
      'POST /api/v1/ocr/base64': 'Base64 image (returns: {"text":"..."})',
      'GET /api/v1/health': 'Health check'
    },
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 🌐 OCR: รองรับ URL parameter - GET /?url=https://example.com/image.jpg
app.get('/', async (req, res) => {
  const { url } = req.query;
  
  // ถ้ามี URL parameter ให้ทำ OCR
  if (url) {
    try {
      console.log(`🌐 Processing image from URL parameter: ${url}`);
      
      // ตรวจสอบ authorization header
      const authHeader = req.headers.authorization;
      const options = {};
      
      if (authHeader) {
        options.headers = {
          'Authorization': authHeader
        };
        console.log('🔐 Using authorization header for image download');
      }
      
      const result = await OCRService.detectTextFromUrl(url, options);
      
      if (result.success) {
        // Return simple text response for URL parameter usage
        res.json({ text: result.text });
      } else {
        res.status(400).json({ text: "Error: " + result.message });
      }
    } catch (error) {
      console.error('Error processing URL parameter:', error);
      res.status(500).json({ text: "Error: Failed to process image from URL" });
    }
    return;
  }

  // ถ้าไม่มี URL parameter ให้แสดง API info ปกติ
  res.json({
    service: 'TEXTBot OCR API',
    version: '1.0.0',
    port: PORT,
    usage: {
      'URL Parameter': 'GET /?url=https://example.com/image.jpg (returns: {"text":"..."})',
      'Simple OCR': 'Just add ?url=IMAGE_URL to get OCR result'
    },
    endpoints: {
      // API v1 (Simple Response)
      'POST /api/v1/ocr/text': 'Upload image file (returns: {"text":"..."})',
      'POST /api/v1/ocr/url': 'Image from URL (returns: {"text":"..."})',
      'POST /api/v1/ocr/base64': 'Base64 image (returns: {"text":"..."})',
      'GET /api/v1/health': 'API v1 Health check',
      // Original API (Full Response)
      'GET /': 'API information or OCR from URL parameter',
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

// Universal endpoint - รองรับทุกอย่างในลิงก์เดียว
app.post('/api/v1/', async (req, res) => {
  try {
    const { imageData, base64Image, imageUrl, url, authorization } = req.body;
    const targetUrl = imageUrl || url;
    
    // ตรวจสอบว่ามีข้อมูลรูปภาพหรือไม่
    if (!imageData && !base64Image && !targetUrl) {
      return res.status(400).json({ text: "Error: Image data is required (imageData, base64Image, url, or imageUrl)" });
    }

    let result;
    
    // ตรวจสอบประเภทของข้อมูลและเรียกใช้ OCR service ที่เหมาะสม
    if (targetUrl) {
      console.log(`🌐 Processing image URL: ${targetUrl}`);
      
      // ตั้งค่า authorization header ถ้ามี
      const options = {};
      const authHeader = authorization || req.headers.authorization;
      
      if (authHeader) {
        options.headers = {
          'Authorization': authHeader
        };
        console.log('🔐 Using authorization header for image download');
      }
      
      result = await OCRService.detectTextFromUrl(targetUrl, options);
    } else if (imageData || base64Image) {
      const base64Data = imageData || base64Image;
      console.log(`🔢 Processing base64 image data (${base64Data.length} characters)`);
      result = await OCRService.detectTextFromBase64(base64Data);
    }
    
    if (result.success) {
      // Return only the text
      res.json({ text: result.text });
    } else {
      res.status(400).json({ text: "Error: " + result.message });
    }
  } catch (error) {
    console.error('Error in universal /api/v1/ endpoint:', error);
    res.status(500).json({ text: "Error: Failed to process image" });
  }
});

app.post('/api/v1/ocr/url', async (req, res) => {
  try {
    const { imageUrl, url, authorization } = req.body;
    const targetUrl = imageUrl || url; // รองรับทั้ง imageUrl และ url
    
    if (!targetUrl) {
      return res.status(400).json({ text: "Error: Image URL is required (use 'url' or 'imageUrl' field)" });
    }

    console.log(`🌐 Processing image URL: ${targetUrl}`);
    
    // ตั้งค่า authorization header ถ้ามี
    const options = {};
    const authHeader = authorization || req.headers.authorization;
    
    if (authHeader) {
      options.headers = {
        'Authorization': authHeader
      };
      console.log('🔐 Using authorization header for image download');
    }
    
    const result = await OCRService.detectTextFromUrl(targetUrl, options);
    
    if (result.success) {
      // Return only the text
      res.json({ text: result.text });
    } else {
      res.status(400).json({ text: "Error: " + result.message });
    }
  } catch (error) {
    console.error('Error in /api/v1/ocr/url:', error);
    res.status(500).json({ text: "Error: Failed to process image" });
  }
});

app.post('/api/v1/ocr/text', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ text: "Error: No image file provided" });
    }

    console.log(`📷 Processing uploaded image: ${req.file.originalname}`);
    
    const result = await OCRService.detectText(req.file.buffer);
    
    if (result.success) {
      // Return only the text
      res.json({ text: result.text });
    } else {
      res.status(400).json({ text: "Error: " + result.message });
    }
  } catch (error) {
    console.error('Error in /api/v1/ocr/text:', error);
    res.status(500).json({ text: "Error: Failed to process image" });
  }
});

app.post('/api/v1/ocr/base64', async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ text: "Error: Base64 image data is required" });
    }

    console.log(`🔢 Processing base64 image data`);
    
    const result = await OCRService.detectTextFromBase64(imageData);
    
    if (result.success) {
      // Return only the text
      res.json({ text: result.text });
    } else {
      res.status(400).json({ text: "Error: " + result.message });
    }
  } catch (error) {
    console.error('Error in /api/v1/ocr/base64:', error);
    res.status(500).json({ text: "Error: Failed to process image" });
  }
});

// API v1 Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ text: "OCR API v1 is running" });
});

// ===== Original API Routes (Full Response) =====

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
    const { imageUrl, authorization, headers } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ URL ของรูปภาพ',
        error: 'No imageUrl provided'
      });
    }

    console.log('🌐 Processing image URL:', imageUrl);
    
    // ตั้งค่า authorization header ถ้ามี
    const options = {};
    const authHeader = authorization || req.headers.authorization;
    const customHeaders = headers || {};
    
    if (authHeader || Object.keys(customHeaders).length > 0) {
      options.headers = {
        ...customHeaders
      };
      
      if (authHeader) {
        options.headers['Authorization'] = authHeader;
        console.log('🔐 Using authorization header for image download');
      }
      
      if (Object.keys(customHeaders).length > 0) {
        console.log('📋 Using custom headers:', Object.keys(customHeaders));
      }
    }
    
    const result = await OCRService.detectTextFromUrl(imageUrl, options);
    
    res.json({
      ...result,
      input: {
        imageUrl: imageUrl,
        hasAuthorization: !!authHeader,
        hasCustomHeaders: Object.keys(customHeaders).length > 0
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
