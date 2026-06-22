const Document = require("../models/Document");

const checkDocAccess = (requiredRole) => {
  return async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const doc = await Document.findOne({ documentId: id });
      if (!doc) {
        return res.status(404).json({ message: "Document not found" });
      }

      const isOwner = doc.owner.toString() === userId;
      const collaborator = doc.collaborators.find(
        (c) => c.user.toString() === userId
      );

      const userRole = isOwner ? "owner" : collaborator?.role;

      if (!userRole) {
        return res.status(403).json({ message: "No access to this document" });
      }

      // Permission check logic
      const roles = ["viewer", "editor", "owner"];
      const userLevel = roles.indexOf(userRole);
      const requiredLevel = roles.indexOf(requiredRole);

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          message: `Required role: ${requiredRole}. Your role: ${userRole}`,
        });
      }

      req.doc = doc;
      req.userRole = userRole;
      next();
    } catch (err) {
      res.status(500).json({ message: "Authorization error", error: err.message });
    }
  };
};

module.exports = { checkDocAccess };
