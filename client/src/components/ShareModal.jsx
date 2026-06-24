import { useState, useEffect } from "react";
import { Share2, Copy, Check, Trash2, Shield, UserPlus } from "lucide-react";
import api from "../services/api";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Badge from "./ui/Badge";

export default function ShareModal({ isOpen, onClose, documentId }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [collaborators, setCollaborators] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchCollaborators();
  }, [isOpen]);

  const fetchCollaborators = async () => {
    try {
      const { data } = await api.get(`/documents/${documentId}/collaborators`);
      setCollaborators(data);
    } catch (err) {
      console.error("Failed to fetch collaborators");
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post(`/documents/${documentId}/invite`, { email, role });
      setEmail("");
      fetchCollaborators();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to share");
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermission = async (userId, newRole) => {
    try {
      await api.patch(`/documents/${documentId}/permissions`, { userId, role: newRole });
      fetchCollaborators();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update permissions");
    }
  };

  const removePermission = async (userId) => {
    if (!confirm("Remove this user's access?")) return;
    try {
      await api.delete(`/documents/${documentId}/access/${userId}`);
      fetchCollaborators();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove user");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Document">
      <div className="space-y-8">
        {/* Invite Form */}
        <form onSubmit={handleShare} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-4 py-3 bg-white/50 border border-primary/10 rounded-2xl text-primary text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full gap-2">
            <UserPlus size={18} /> {isLoading ? "Inviting..." : "Invite User"}
          </Button>
        </form>

        {/* Collaborators List */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary/40 flex items-center gap-2">
            <Shield size={14} /> Who has access
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {collaborators.map((collab) => (
              <div
                key={collab.user._id}
                className="flex items-center justify-between p-3 rounded-2xl bg-primary/[0.02] border border-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${collab.isOwner ? 'bg-amber-100 text-amber-600' : 'bg-secondary/10 text-secondary'}`}>
                    {collab.user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{collab.user.username}</p>
                    <p className="text-[10px] font-medium text-primary/40">{collab.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {collab.isOwner ? (
                    <Badge variant="secondary">OWNER</Badge>
                  ) : (
                    <>
                      <select
                        value={collab.role}
                        onChange={(e) => updatePermission(collab.user._id, e.target.value)}
                        className="bg-transparent border-none text-[10px] font-bold text-primary focus:outline-none cursor-pointer hover:underline uppercase"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        onClick={() => removePermission(collab.user._id)}
                        className="p-1.5 hover:bg-red-50 text-red-300 hover:text-red-500 rounded-lg transition-colors"
                        title="Revoke access"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Copy Link */}
        <div className="pt-6 border-t border-primary/5">
          <button
            onClick={copyLink}
            className="flex items-center justify-between w-full px-4 py-3 bg-primary/5 rounded-2xl text-xs font-bold text-primary group transition-all active:scale-95"
          >
            <span className="flex items-center gap-2">
              <Share2 size={14} className="text-primary/40" /> Copy share link
            </span>
            {copied ? (
              <Check size={14} className="text-accent" />
            ) : (
              <Copy size={14} className="text-primary/40 group-hover:text-primary" />
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
