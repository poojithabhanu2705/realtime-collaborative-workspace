const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      default: "Untitled Document",
      maxlength: 200,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    currentVersion: {
      type: Number,
      default: 1,
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
        token: { type: String },
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

// Performance indexes
DocumentSchema.index({ "collaborators.user": 1 });
DocumentSchema.index({ updatedAt: -1 });
DocumentSchema.index({ "shareableLinks.token": 1 });

module.exports = mongoose.model("Document", DocumentSchema);