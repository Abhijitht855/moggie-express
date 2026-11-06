import { Request, Response } from 'express';
import imagekit from '../config/imagekit';

/**
 * @desc    Upload images or videos to ImageKit
 * @route   POST /api/upload
 * @access  Private/Admin
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const folder = (req.body.folder as string) || '/moggie/products';

    const uploadPromises = files.map(async (file) => {
      const sanitizedName = file.originalname.replace(/\s+/g, '-').replace(/[^\w.-]/g, '');
      const uniqueFileName = `${Date.now()}-${sanitizedName}`;

      const uploadResult = await imagekit.upload({
        file: file.buffer,
        fileName: uniqueFileName,
        folder: folder,
        useUniqueFileName: true,
      });

      return {
        url: uploadResult.url,
        fileId: uploadResult.fileId,
        originalName: file.originalname,
        thumbnailUrl: uploadResult.thumbnailUrl,
        fileType: uploadResult.fileType,
      };
    });

    const uploadedUrls = await Promise.all(uploadPromises);

    res.status(200).json({
      success: true,
      message: `${uploadedUrls.length} file(s) uploaded successfully to ImageKit`,
      urls: uploadedUrls,
    });
  } catch (error: any) {
    console.error('ImageKit Upload Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a file from ImageKit
 * @route   DELETE /api/upload/:fileId
 * @access  Private/Admin
 */
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const fileId = String(req.params.fileId);

    if (!fileId) {
      return res.status(400).json({ success: false, message: 'fileId is required' });
    }

    await imagekit.deleteFile(fileId);
    res.json({ success: true, message: 'File deleted successfully from ImageKit' });
  } catch (error: any) {
    console.error('ImageKit Delete Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
