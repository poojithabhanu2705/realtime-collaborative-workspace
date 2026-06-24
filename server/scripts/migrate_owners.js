const mongoose = require("mongoose");
require("dotenv").config();
const Document = require("../src/models/Document");
const Version = require("../src/models/Version");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for migration");

    const docs = await Document.find({});
    console.log(`Found ${docs.length} documents`);

    for (const doc of docs) {
      if (!doc.owner) {
        // Try to find the creator from version history
        const firstVersion = await Version.findOne({ documentId: doc.documentId }).sort({ createdAt: 1 });
        if (firstVersion && firstVersion.createdBy) {
          doc.owner = firstVersion.createdBy;
          await doc.save();
          console.log(`Fixed owner for doc ${doc.documentId} -> ${doc.owner}`);
        } else {
          console.log(`Could not fix owner for doc ${doc.documentId}: No version history creator found.`);
        }
      }
    }

    console.log("Migration complete");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
