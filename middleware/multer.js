import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

export const uploadFile = multer({ dest: 'uploads/' });

export default upload