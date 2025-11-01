const multer = require("multer");
const path = require("path");
const fs = require("fs");

exports.FormFileData = (folderName, field_name, file_name) => {
    const uploadPath = path.join(__dirname, '../../public', folderName);

    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            cb(null, file_name + ext);
        },
    });

    const upload = multer({ storage }).single(field_name);

    return { success: true, upload, message: 'Upload setup ready' };
};
