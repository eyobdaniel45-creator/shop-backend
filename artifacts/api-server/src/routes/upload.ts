import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import { logger } from '../lib/logger';
import { requireAuth } from '../middlewares/auth';

dotenv.config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: 'gebiya_uploads',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov'],
    };
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Maximum 50MB file size
});

export const uploadRouter = Router();

// Single file upload endpoint (POST /api/upload/single)
uploadRouter.post('/single', requireAuth, upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    return res.status(200).json({
      message: 'File uploaded successfully',
      url: req.file.path,
      public_id: req.file.filename,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Single file upload failed');
    return res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

// Multiple files upload endpoint (POST /api/upload/multiple)
uploadRouter.post('/multiple', requireAuth, upload.array('files', 5), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedUrls = files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));

    return res.status(200).json({
      message: 'Files uploaded successfully',
      files: uploadedUrls,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Multiple file upload failed');
    return res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});
