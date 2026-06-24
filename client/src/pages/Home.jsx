import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Globe,
  Plus,
  FileText,
  Trash2,
  Clock,
  Users,
  Edit3,
  Check,
  X,
} from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import Modal from "../components/ui/Modal";
import Navbar from "../components/layout/Navbar";
import api from "../services/api";

export default function Home() {
  const [docId, setDocId] = useState("");
  const [ownDocs, setOwnDocs] = useState([]);
  const [sharedDocs, setSharedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const [ownRes, sharedRes] = await Promise.all([
        api.get("/documents"),
        api.get("/documents/shared"),
      ]);
      setOwnDocs(ownRes.data);
      setSharedDocs(sharedRes.data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  const joinDocument = (e) => {
    e.preventDefault();
    if (!docId.trim()) return;

    // Check if it's a full URL and extract the ID
    const urlPattern = /\/document\/([a-zA-Z0-9_-]+)/;
    const match = docId.match(urlPattern);
    const finalId = match ? match[1] : docId.trim();

    navigate(`/document/${finalId}`);
  };

  const createNew = async () => {
    setCreating(true);
    try {
      const { data } = await api.post("/documents", {
        title: newTitle || "Untitled Document",
      });
      setNewTitle("");
      navigate(`/document/${data.documentId}`);
    } catch (err) {
      console.error("Failed to create document", err);
    } finally {
      setCreating(false);
    }
  };

  const deleteDocument = async (documentId) => {
    if (!confirm("Delete this document? This action cannot be undone.")) return;
    try {
      await api.delete(`/documents/${documentId}`);
      setOwnDocs((prev) => prev.filter((d) => d.documentId !== documentId));
    } catch (err) {
      console.error("Failed to delete document", err);
    }
  };

  const startRename = (doc) => {
    setEditingId(doc.documentId);
    setEditTitle(doc.title);
  };

  const saveRename = async (documentId) => {
    if (!editTitle.trim()) return;
    try {
      await api.patch(`/documents/${documentId}`, { title: editTitle });
      setOwnDocs((prev) =>
        prev.map((d) => (d.documentId === documentId ? { ...d, title: editTitle } : d))
      );
      setEditingId(null);
    } catch (err) {
      console.error("Failed to rename document", err);
    }
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-background text-primary selection:bg-secondary/20">
      <Navbar />

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 border border-secondary/20 rounded-full text-secondary text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Sparkles size={14} />
            <span>Real-time collaboration reimagined</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 leading-[1.1]"
          >
            Create together, <br />
            <span className="text-secondary italic">instantly.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-primary/60 max-w-2xl mb-12 font-medium"
          >
            The world's most elegant collaborative editor. Minimalist design,
            lightning-fast syncing, and production-grade security.
          </motion.p>

          {/* Join / Create Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full max-w-md"
          >
            <Card className="p-2 border-white/50 shadow-elevated bg-white/60">
              <form onSubmit={joinDocument} className="flex gap-2 p-1">
                <Input
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="Paste shared document link or document ID"
                  className="bg-transparent border-none focus:ring-0 text-base py-4"
                />
                <Button type="submit" className="gap-2 shrink-0">
                  Join <ArrowRight size={18} />
                </Button>
              </form>
            </Card>

              <div className="mt-6 flex items-center justify-center gap-4">
                <span className="text-sm text-primary/40 font-medium">Or</span>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-sm font-bold text-primary hover:text-secondary transition-colors underline decoration-2 underline-offset-4 inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Create a new document
                </button>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Create Document Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create Document"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createNew();
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary/40">
                Document Title
              </label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. System Design Notes"
                autoFocus
                required
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </Modal>

      {/* Documents Dashboard */}
      <section className="py-16 bg-primary/[0.02] border-y border-primary/5">
        <div className="max-w-7xl mx-auto px-6">
          {loading ? (
            <p className="text-center text-primary/30 font-medium py-12">Loading documents...</p>
          ) : (
            <div className="space-y-12">
              {/* Own Documents */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-primary/40 mb-6 flex items-center gap-2">
                  <FileText size={14} /> My Documents
                  <span className="bg-primary/5 px-2 py-0.5 rounded-full text-[10px]">
                    {ownDocs.length}
                  </span>
                </h2>

                {ownDocs.length === 0 ? (
                  <Card className="border-dashed border-primary/10 p-8 text-center">
                    <p className="text-sm text-primary/30 font-medium">
                      No documents yet. Create one above to get started!
                    </p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ownDocs.map((doc) => (
                      <Card
                        key={doc.documentId}
                        className="group hover:border-primary/10 transition-all p-6 cursor-pointer"
                        onClick={() => {
                          if (editingId !== doc.documentId) {
                            navigate(`/document/${doc.documentId}`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          {editingId === doc.documentId ? (
                            <div
                              className="flex items-center gap-2 flex-1 mr-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="text-lg font-bold text-primary bg-transparent border-b-2 border-secondary focus:outline-none w-full"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveRename(doc.documentId);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                              />
                              <button
                                onClick={() => saveRename(doc.documentId)}
                                className="p-1 hover:bg-accent/10 rounded-lg text-accent"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 hover:bg-primary/5 rounded-lg text-primary/40"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-bold text-primary truncate flex-1">
                              {doc.title || "Untitled"}
                            </h3>
                          )}

                          <div
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => startRename(doc)}
                              className="p-1.5 hover:bg-primary/5 rounded-lg text-primary/30 hover:text-primary"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => deleteDocument(doc.documentId)}
                              className="p-1.5 hover:bg-red-50 text-red-300 hover:text-red-500 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-primary/30 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> {timeAgo(doc.updatedAt)}
                          </span>
                          <span>v{doc.currentVersion || 1}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Shared Documents */}
              {sharedDocs.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-primary/40 mb-6 flex items-center gap-2">
                    <Users size={14} /> Shared with me
                    <span className="bg-primary/5 px-2 py-0.5 rounded-full text-[10px]">
                      {sharedDocs.length}
                    </span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sharedDocs.map((doc) => (
                      <Card
                        key={doc.documentId}
                        className="group hover:border-primary/10 transition-all p-6 cursor-pointer"
                        onClick={() => navigate(`/document/${doc.documentId}`)}
                      >
                        <h3 className="text-lg font-bold text-primary truncate mb-2">
                          {doc.title || "Untitled"}
                        </h3>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-primary/30 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Clock size={10} /> {timeAgo(doc.updatedAt)}
                          </span>
                          {doc.owner && (
                            <span>by {doc.owner.username}</span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Zap className="text-secondary" />}
            title="Real-time Sync"
            description="Powered by high-performance Socket.io and Redis for sub-millisecond updates."
          />
          <FeatureCard
            icon={<Shield className="text-accent" />}
            title="Secure sharing"
            description="Granular permissions with owner-controlled access and invite management."
          />
          <FeatureCard
            icon={<Globe className="text-primary" />}
            title="Anywhere access"
            description="Perfectly responsive design for mobile, tablet, and desktop experiences."
          />
        </div>
      </section>

      <footer className="py-12 border-t border-primary/5 text-center text-primary/30 text-xs font-bold uppercase tracking-widest">
        &copy; 2026 collab.io - build the future of work
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <Card className="bg-transparent border-primary/5 hover:border-primary/10 transition-all p-8 group">
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-primary/60 text-sm font-medium leading-relaxed">{description}</p>
    </Card>
  );
}