import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadRoot = path.resolve(process.cwd(), 'uploads');

export const getBranchUploadDirName = (branchId?: string) => {
    const safeBranchId = (branchId || 'unassigned').replace(/[^a-zA-Z0-9_-]/g, '');
    return safeBranchId || 'unassigned';
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const branchDirName = getBranchUploadDirName(req.body?.branchId);
        const targetDir = path.join(uploadRoot, branchDirName);
        fs.mkdirSync(targetDir, { recursive: true });
        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
        const safeBase = baseName || 'image';
        cb(null, `${safeBase}-${Date.now()}${ext}`);
    },
});

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
};

export const uploadMenuImage = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});
