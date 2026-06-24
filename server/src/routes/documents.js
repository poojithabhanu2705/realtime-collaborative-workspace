const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Document = require("../models/Document");
const Version = require("../models/Version");
const authMiddleware = require("../middleware/authMiddleware");
const { checkDocAccess } = require("../middleware/docAuth");
const {
  validate,
  createDocRules,
  renameDocRules,
  inviteRules,
  permissionRules,
  shareLinkRules,
} = require("../middleware/validation");

// ===================================
// DOCUMENT CRUD
// ===================================

// 1. Create document
router.post(
  "/",
  authMiddleware,
  createDocRules,
  validate,
  async (req, res) => {
    try {
      const documentId = crypto.randomBytes(12).toString("hex");
      const doc = await Document.create({
        documentId,
        title: req.body.title || "Untitled Document",
        content: "",
        owner: req.user.id,
      });

      // Create initial version
      await Version.create({
        documentId,
        versionNumber: 1,
        content: "",
        createdBy: req.user.id,
      });

      res.status(201).json({
        documentId: doc.documentId,
        title: doc.title,
        createdAt: doc.createdAt,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to create document", error: err.message });
    }
  }
);

// 2. List own documents
router.get("/", authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user.id })
      .select("documentId title updatedAt createdAt currentVersion")
      .sort({ updatedAt: -1 })
      .lean();

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch documents", error: err.message });
  }
});

// 3. List shared documents (where user is a collaborator)
router.get("/shared", authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({
      "collaborators.user": req.user.id,
    })
      .select("documentId title updatedAt createdAt currentVersion")
      .populate("owner", "username email")
      .sort({ updatedAt: -1 })
      .lean();

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch shared documents", error: err.message });
  }
});

// 4. Get document details
router.get("/:id", authMiddleware, checkDocAccess("viewer"), async (req, res) => {
  try {
    const doc = await Document.findOne({ documentId: req.params.id })
      .populate("owner", "username email")
      .populate("collaborators.user", "username email");

    res.json({
      documentId: doc.documentId,
      title: doc.title,
      owner: doc.owner,
      collaborators: doc.collaborators,
      currentVersion: doc.currentVersion,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch document", error: err.message });
  }
});

// 5. Rename document
router.patch(
  "/:id",
  authMiddleware,
  checkDocAccess("editor"),
  renameDocRules,
  validate,
  async (req, res) => {
    try {
      const doc = await Document.findOneAndUpdate(
        { documentId: req.params.id },
        { title: req.body.title },
        { new: true }
      );
      res.json({ documentId: doc.documentId, title: doc.title });
    } catch (err) {
      res.status(500).json({ message: "Failed to rename document", error: err.message });
    }
  }
);

// 6. Delete document (owner only)
router.delete("/:id", authMiddleware, checkDocAccess("owner"), async (req, res) => {
  try {
    await Document.deleteOne({ documentId: req.params.id });
    await Version.deleteMany({ documentId: req.params.id });
    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete document", error: err.message });
  }
});

// ===================================
// COLLABORATOR MANAGEMENT
// ===================================

// 7. Get collaborators list (for ShareModal)
router.get("/:id/collaborators", authMiddleware, checkDocAccess("viewer"), async (req, res) => {
  try {
    const doc = await Document.findOne({ documentId: req.params.id })
      .populate("collaborators.user", "username email")
      .populate("owner", "username email");

    const participants = [
      {
        user: doc.owner,
        role: "owner",
        isOwner: true,
      },
      ...doc.collaborators.map((c) => ({
        user: c.user,
        role: c.role,
        isOwner: false,
      })),
    ];

    res.json(participants);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch collaborators", error: err.message });
  }
});

// 8. Invite a collaborator by email
router.post(
  "/:id/invite",
  authMiddleware,
  checkDocAccess("owner"),
  inviteRules,
  validate,
  async (req, res) => {
    const { email, role = "editor" } = req.body;
    const doc = req.doc;

    try {
      const collaborator = await User.findOne({ email });
      if (!collaborator) return res.status(404).json({ message: "User not found" });

      const isOwner = doc.owner.toString() === collaborator._id.toString();
      const isAlreadyCollaborator = doc.collaborators.some(
        (c) => c.user.toString() === collaborator._id.toString()
      );

      if (isOwner || isAlreadyCollaborator) {
        return res.status(400).json({ message: "User already has access to this document" });
      }

      doc.collaborators.push({ user: collaborator._id, role });
      await doc.save();

      res.json({ message: "Collaborator added successfully", role });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 9. Generate a shareable link
router.post(
  "/:id/share-link",
  authMiddleware,
  checkDocAccess("owner"),
  shareLinkRules,
  validate,
  async (req, res) => {
    const { role = "viewer", expiryHours = 24 } = req.body;
    const doc = req.doc;

    try {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      doc.shareableLinks.push({ token, role, expiresAt });
      await doc.save();

      const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
      res.json({
        message: "Shareable link generated",
        link: `${baseUrl}/join?token=${token}`,
        role,
        expiresAt,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 10. Update collaborator permissions
router.patch(
  "/:id/permissions",
  authMiddleware,
  checkDocAccess("owner"),
  permissionRules,
  validate,
  async (req, res) => {
    const { userId, role } = req.body;
    const doc = req.doc;

    try {
      if (userId === doc.owner.toString()) {
        return res.status(400).json({ message: "Cannot change the primary owner's role directly. Use transfer ownership instead." });
      }

      const collaborator = doc.collaborators.find(
        (c) => c.user.toString() === userId
      );
      if (!collaborator) return res.status(404).json({ message: "Collaborator not found" });

      collaborator.role = role;
      await doc.save();

      res.json({ message: "Permissions updated successfully", role });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 11. Transfer ownership
router.post("/:id/transfer", authMiddleware, checkDocAccess("owner"), async (req, res) => {
  const { newOwnerId } = req.body;
  const doc = req.doc;

  try {
    if (!mongoose.Types.ObjectId.isValid(newOwnerId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const newOwner = await User.findById(newOwnerId);
    if (!newOwner) return res.status(404).json({ message: "New owner not found" });

    doc.collaborators.push({ user: doc.owner, role: "editor" });
    doc.owner = newOwner._id;
    doc.collaborators = doc.collaborators.filter(
      (c) => c.user.toString() !== newOwnerId.toString()
    );

    await doc.save();
    res.json({ message: "Ownership transferred successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 12. Revoke access
router.delete(
  "/:id/access/:userId",
  authMiddleware,
  checkDocAccess("owner"),
  async (req, res) => {
    const { userId } = req.params;
    const doc = req.doc;

    try {
      if (userId === doc.owner.toString()) {
        return res.status(400).json({ message: "Cannot remove the primary owner. Transfer ownership first." });
      }

      doc.collaborators = doc.collaborators.filter(
        (c) => c.user.toString() !== userId
      );
      await doc.save();
      res.json({ message: "Access revoked successfully" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// 13. Join via shareable token
router.post("/join", authMiddleware, async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  try {
    const doc = await Document.findOne({
      "shareableLinks.token": token,
      "shareableLinks.active": true,
    });

    if (!doc) return res.status(404).json({ message: "Invalid or expired sharing link" });

    const link = doc.shareableLinks.find((l) => l.token === token);
    if (new Date() > link.expiresAt) {
      link.active = false;
      await doc.save();
      return res.status(410).json({ message: "Sharing link has expired" });
    }

    const isAlreadyCollaborator = doc.collaborators.some(
      (c) => c.user.toString() === req.user.id
    );

    if (doc.owner.toString() !== req.user.id && !isAlreadyCollaborator) {
      doc.collaborators.push({ user: req.user.id, role: link.role });
      await doc.save();
    }

    res.json({ message: "Joined document successfully", documentId: doc.documentId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===================================
// VERSION HISTORY
// ===================================

// 14. List versions for a document
router.get("/:id/versions", authMiddleware, checkDocAccess("viewer"), async (req, res) => {
  try {
    const versions = await Version.find({ documentId: req.params.id })
      .select("versionNumber createdBy createdAt")
      .populate("createdBy", "username")
      .sort({ versionNumber: -1 })
      .limit(50)
      .lean();

    res.json(versions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch versions", error: err.message });
  }
});

// 15. Manually save a version snapshot
router.post("/:id/versions", authMiddleware, checkDocAccess("editor"), async (req, res) => {
  try {
    const doc = await Document.findOne({ documentId: req.params.id });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    doc.currentVersion += 1;
    await doc.save();

    const version = await Version.create({
      documentId: req.params.id,
      versionNumber: doc.currentVersion,
      content: doc.content,
      createdBy: req.user.id,
    });

    res.status(201).json({
      versionNumber: version.versionNumber,
      createdAt: version.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to save version", error: err.message });
  }
});

// 16. Restore a previous version
router.post(
  "/:id/versions/:versionId/restore",
  authMiddleware,
  checkDocAccess("editor"),
  async (req, res) => {
    try {
      const version = await Version.findById(req.params.versionId);
      if (!version || version.documentId !== req.params.id) {
        return res.status(404).json({ message: "Version not found" });
      }

      const doc = await Document.findOne({ documentId: req.params.id });
      // Save current state as a new version before restoring
      doc.currentVersion += 1;
      await Version.create({
        documentId: req.params.id,
        versionNumber: doc.currentVersion,
        content: doc.content,
        createdBy: req.user.id,
      });

      // Restore
      doc.content = version.content;
      doc.currentVersion += 1;
      await doc.save();

      // Also save the restored content as the latest version
      await Version.create({
        documentId: req.params.id,
        versionNumber: doc.currentVersion,
        content: version.content,
        createdBy: req.user.id,
      });

      res.json({
        message: "Version restored successfully",
        versionNumber: doc.currentVersion,
        content: doc.content,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to restore version", error: err.message });
    }
  }
);

module.exports = router;
