const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const User = require("../models/User");
const Document = require("../models/Document");
const authMiddleware = require("../middleware/authMiddleware");
const { checkDocAccess } = require("../middleware/docAuth");

// 1. Invite a collaborator by email
router.post("/:id/invite", authMiddleware, checkDocAccess("owner"), async (req, res) => {
  const { email, role = "editor" } = req.body;
  const doc = req.doc;

  try {
    const collaborator = await User.findOne({ email });
    if (!collaborator) return res.status(404).json({ message: "User not found" });

    // Check if already a collaborator or owner
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
});

// 2. Generate/Update a shareable link
router.post("/:id/share-link", authMiddleware, checkDocAccess("owner"), async (req, res) => {
  const { role = "viewer", expiryHours = 24 } = req.body;
  const doc = req.doc;

  try {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    doc.shareableLinks.push({
      token,
      role,
      expiresAt,
    });

    await doc.save();

    res.json({
      message: "Shareable link generated",
      link: `http://localhost:5173/join?token=${token}`,
      role,
      expiresAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Update collaborator permissions
router.patch("/:id/permissions", authMiddleware, checkDocAccess("owner"), async (req, res) => {
  const { userId, role } = req.body;
  const doc = req.doc;

  try {
    const collaborator = doc.collaborators.find((c) => c.user.toString() === userId);
    if (!collaborator) return res.status(404).json({ message: "Collaborator not found" });

    collaborator.role = role;
    await doc.save();

    res.json({ message: "Permissions updated successfully", role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Transfer Ownership
router.post("/:id/transfer", authMiddleware, checkDocAccess("owner"), async (req, res) => {
  const { newOwnerId } = req.body;
  const doc = req.doc;

  try {
    const newOwner = await User.findById(newOwnerId);
    if (!newOwner) return res.status(404).json({ message: "New owner not found" });

    // Move current owner to collaborators as editor
    doc.collaborators.push({ user: doc.owner, role: "editor" });
    doc.owner = newOwner._id;

    // Remove new owner from collaborators if they were there
    doc.collaborators = doc.collaborators.filter(
      (c) => c.user.toString() !== newOwnerId.toString()
    );

    await doc.save();
    res.json({ message: "Ownership transferred successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Revoke access
router.delete("/:id/access/:userId", authMiddleware, checkDocAccess("owner"), async (req, res) => {
  const { userId } = req.params;
  const doc = req.doc;

  try {
    doc.collaborators = doc.collaborators.filter((c) => c.user.toString() !== userId);
    await doc.save();
    res.json({ message: "Access revoked successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Join via Token (Public/Link Join)
router.post("/join", authMiddleware, async (req, res) => {
  const { token } = req.body;
  
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

    // Add user as collaborator if not already
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

module.exports = router;
