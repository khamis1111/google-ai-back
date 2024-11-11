import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema({
  role: { type: String, required: true }, // "user" or "model"
  text: { type: String },
  parts: [
    {
      fileData: {
        mimeType: String,
        fileUri: String,
      },
      text: { type: String },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("ChatHistory", chatHistorySchema);

/* 
{
        role: "user",
        parts: [
          {
            fileData: {
              mimeType: files[0].mimeType,
              fileUri: files[0].uri,
            },
          },
          {text: "read this file and answer the following choose questions\n"},
        ],
      },
*/
