const mongoose = require("mongoose");

const VersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient version lookups
VersionSchema.index({ documentId: 1, versionNumber: -1 });
VersionSchema.index({ documentId: 1, createdAt: -1 });

module.exports = mongoose.model("Version", VersionSchema);
