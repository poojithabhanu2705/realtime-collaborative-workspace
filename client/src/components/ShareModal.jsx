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
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Access">
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
                        <option value="owner">Promote to Owner</option>
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

        {/* Copy Link Section */}
        <div className="pt-6 border-t border-primary/5 space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-primary/40">
            Shareable document link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-3 bg-primary/5 rounded-2xl text-[13px] font-medium text-primary/70 truncate border border-primary/10 select-all">
              {window.location.origin}/document/{documentId}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/document/${documentId}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className={`px-4 rounded-2xl flex items-center justify-center transition-all active:scale-95 border ${copied ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-primary text-white border-transparent hover:bg-primary/90'}`}
              title="Copy to clipboard"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          {copied && (
            <p className="text-[10px] font-bold text-accent uppercase tracking-widest animate-pulse">
              Link copied to clipboard!
            </p>
          )}
        </div>

        {/* Back/Cancel Button */}
        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={onClose}>
            ← Back to Document
          </Button>
        </div>
      </div>
    </Modal>
  );
}
