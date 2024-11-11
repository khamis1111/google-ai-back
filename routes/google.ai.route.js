import express from 'express'
import { aiConfigration, aiGeminiFile } from '../controllers/google.ai.controller.js'
import { uploadFile } from '../middleware/multer.js'
const router = express.Router()

router.route('/generate').post(aiConfigration, uploadFile.single('file'), aiGeminiFile)

export default router