import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import ChatHistoryModel from "../models/ChatHistory.model.js";

export const aiConfigration = async (req, res, next) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    const generationConfig = {
      temperature: 2,
      topP: 1,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    req.model = model;
    req.config = generationConfig;

    next();
  } catch (error) {
    return res.status(401).json({ status: "fail", err: error });
  }
};

export const aiGemini = async (req, res) => {
  try {
    const { text } = req.body;
    const file = req.file;

    const result = await req.model.generateContent({
      contents: [{ role: "user", parts: { text } }],
      generationConfig: req.config,
    });

    return res
      .status(200)
      .json({ status: "success", data: result.response.text(), file });
  } catch (error) {
    return res.status(401).json({ status: "fail", err: error });
  }
};

export const aiGeminiFile = async (req, res) => {
  const { text } = req.body;
  const file = req.file;
  const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
  let files;

  if (file) {
    // Function to upload file to Gemini
    async function uploadToGemini(path, mimeType) {
      try {
        const uploadResult = await fileManager.uploadFile(path, {
          mimeType,
          displayName: path,
        });
        console.log(
          `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.name}`
        );
        return uploadResult.file;
      } catch (error) {
        return res.status(401).json({
          status: "fail",
          err: `File upload failed: ${error.message}`,
        });
      }
    }

    // Wait for files to be processed and active
    async function waitForFilesActive(files) {
      console.log("Waiting for file processing...");
      for (const name of files.map((file) => file.name)) {
        let file = await fileManager.getFile(name);
        while (file.state === "PROCESSING") {
          process.stdout.write(".");
          await new Promise((resolve) => setTimeout(resolve, 10000));
          file = await fileManager.getFile(name);
        }
        if (file.state !== "ACTIVE") {
          return res.status(401).json({
            status: "fail",
            err: `File ${file.name} failed to process`,
          });
        }
      }
      console.log("...all files ready\n");
    }

    // Upload the image file
    const uploadedFile = await uploadToGemini(file.path, file.mimetype);
    files = [uploadedFile];

    // Wait for the file to be ready for processing
    await waitForFilesActive(files);
  }
  // Initiate the chat session with uploaded file and user text
  const chatSession = req.model.startChat({
    generationConfig: req.config,
    history: [
      req.file
        ? {
            role: "user",
            parts: [
              {
                fileData: {
                  mimeType: files[0].mimeType,
                  fileUri: files[0].uri,
                },
              },
              {
                text:
                  "read this file and choose the correct answer and return the correct answer only and choose one answer: " +
                  text,
              },
            ],
          }
        : { role: "user", parts: [{ text }] },
    ],
  });

  // Send the user-provided text to the chat session
  const result = await chatSession.sendMessage(text);
  console.log(result.response.text());

  const deleteFilesInUploads = () => {
    const uploadsDir = path.resolve("uploads"); // Specify the uploads directory

    // Read the files in the 'uploads' directory
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        return res.status(401).json({
          status: "fail",
          err: `Error reading the directory: ${err}`,
        });
      }

      // Loop through each file and delete it
      files.forEach((file) => {
        const filePath = path.join(uploadsDir, file);

        // Delete the file
        fs.unlink(filePath, (err) => {
          if (err) {
            return res.status(401).json({
              status: "fail",
              err: `Error deleting file: ${filePath}, ${err}`,
            });
          } else {
            console.log(`File deleted: ${filePath}`);
          }
        });
      });
    });
  };

  // Call the function to delete files
  deleteFilesInUploads();

  // Respond with AI response
  return res
    .status(200)
    .json({ status: "success", data: result.response.text() });
};

