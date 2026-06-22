import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Share2, Users, FileText, ChevronLeft, Save } from "lucide-react";
import { socket } from "../socket";
import { useAuth } from "../contexts/AuthContext";
import ShareModal from "../components/ShareModal";
import Navbar from "../components/layout/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function Document() {
  const { id } = useParams();
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [role, setRole] = useState("viewer");
  const [ownerId, setOwnerId] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    socket.auth.token = localStorage.getItem("accessToken");
    if (!socket.connected) socket.connect();

    socket.on("receive-changes", (content) => {
      setText(content);
    });

    socket.on("load-document", ({ content, role, ownerId }) => {
      setText(content);
      setRole(role);
      setOwnerId(ownerId);
    });

    socket.on("presence-update", (count) => {
      setOnlineUsers(count);
    });

    socket.emit("join-document", id);

    return () => {
      socket.off("receive-changes");
      socket.off("load-document");
      socket.off("presence-update");
    };
  }, [id, user]);

  const handleChange = (e) => {
    if (role !== "editor") return;
    setIsSaving(true);
    setText(e.target.value);
    socket.emit("text-change", {
      documentId: id,
      content: e.target.value,
    });
    
    // Simulate save status indicator cleanup after debounce
    const timer = setTimeout(() => setIsSaving(false), 2000);
    return () => clearTimeout(timer);
  };

  const isOwner = user?.id === ownerId;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-8"
        >
          {/* Document Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-primary/5">
            <div className="space-y-4">
              <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary/40 hover:text-primary transition-colors uppercase tracking-widest">
                <ChevronLeft size={14} /> Back to dashboard
              </Link>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-primary">{id}</h1>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={role === "editor" ? "success" : "default"}>{role}</Badge>
                    {isOwner && <Badge variant="secondary">Owner</Badge>}
                    {isSaving && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary/30 uppercase tracking-widest animate-pulse ml-2">
                        <Save size={10} /> Saving...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-2xl border border-primary/5 mr-2">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(onlineUsers, 3))].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-accent border-2 border-white flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      u{i+1}
                    </div>
                  ))}
                  {onlineUsers > 3 && (
                    <div className="w-8 h-8 rounded-full bg-secondary border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                      +{onlineUsers - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-primary/60 ml-2">{onlineUsers} Online</span>
              </div>
              
              {isOwner && (
                <Button onClick={() => setIsShareModalOpen(true)} className="gap-2">
                  <Share2 size={18} /> Share
                </Button>
              )}
            </div>
          </header>

          <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} documentId={id} />

          {/* Editor Container */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-secondary/5 to-accent/5 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white rounded-[2rem] p-4 sm:p-12 shadow-elevated min-h-[70vh]">
              <textarea
                className="w-full min-h-[60vh] bg-transparent border-none text-primary text-xl leading-relaxed focus:outline-none placeholder:text-primary/10 resize-none font-medium"
                value={text}
                onChange={handleChange}
                readOnly={role !== "editor"}
                placeholder={role === "viewer" ? "You only have viewing permissions" : "Start your masterpiece..."}
              />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}