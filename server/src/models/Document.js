const mongoose = require("mongoose");

const DocumentSchema =
  new mongoose.Schema(
    {
      documentId: {
        type: String,
        required: true,
        unique: true,
      },

      content: {
        type: String,
        default: "",
      },
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      collaborators: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          role: {
            type: String,
            enum: ["editor", "viewer"],
            default: "viewer",
          },
        },
      ],
      shareableLinks: [
        {
          token: { type: String, unique: true },
          role: { type: String, enum: ["editor", "viewer"] },
          expiresAt: Date,
          active: { type: Boolean, default: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  "Document",
  DocumentSchema
);