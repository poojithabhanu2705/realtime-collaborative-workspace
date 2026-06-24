import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Users,
  FileText,
  ChevronLeft,
  Save,
  Clock,
  RotateCcw,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { socket } from "../socket";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import ShareModal from "../components/ShareModal";
import Navbar from "../components/layout/Navbar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { Shield } from "lucide-react";

export default function Document() {
  const { id } = useParams();
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [role, setRole] = useState("viewer");
  const [ownerId, setOwnerId] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);

  const typingTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  // =========================
  // INITIAL LOAD & SOCKET
  // =========================
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const { data } = await api.get(`/documents/${id}`);
        setTitle(data.title || "Untitled Document");
        setOwnerId(data.owner._id || data.owner);
        // Find current user's role
        if (data.owner._id === user?.id || data.owner === user?.id) {
          setRole("owner");
        } else {
          const collab = data.collaborators?.find(c => (c.user._id || c.user) === user?.id);
          setRole(collab?.role || "viewer");
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch doc via REST:", err);
        // If REST fails, we still try socket, but maybe the doc doesn't exist
        if (err.response?.status === 404) {
          setError("Document not found.");
          setLoading(false);
        }
      }
    };

    fetchDoc();

    socket.auth.token = localStorage.getItem("accessToken");
    if (!socket.connected) socket.connect();

    const onConnect = () => {
      console.log("Connected", socket.id);
      setIsConnected(true);
    };
    const onDisconnect = () => {
      console.log("Disconnected");
      setIsConnected(false);
    };
    const onConnectError = (err) => {
      console.log("Connect Error:", err);
    };

    // Re-join document on reconnection
    const onReconnect = () => {
      console.log("Reconnecting to document:", id);
      socket.emit("join-document", id);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.io.on("reconnect", onReconnect);

    // Load document
    socket.on("load-document", (data) => {
      try {
        console.log("[SOCKET] load-document data:", data);
        const { content, title: docTitle, role: docRole, ownerId: owner } = data;
        console.log("[SOCKET] Setting role to:", docRole);

        setText(content || "");
        setTitle(docTitle || "Untitled Document");
        setRole(docRole || "viewer");
        setOwnerId(owner);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("Error processing load-document:", err);
        setError("Failed to initialize document data.");
        setLoading(false);
      }
    });

    // Receive changes from others
    socket.on("receive-changes", ({ content, delta, userId, username }) => {
      if (userId === user?.id) return; // Ignore own changes
      isRemoteUpdate.current = true;
      setText(content);
    });

    // Presence updates (now with user list)
    socket.on("presence-update", ({ count, users }) => {
      setOnlineUsers(users || []);
    });

    // Typing indicators
    socket.on("user-typing", ({ userId, username }) => {
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev;
        return [...prev, { userId, username }];
      });
    });

    socket.on("user-stopped-typing", ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    });

    // Cursor updates
    socket.on("cursor-update", ({ userId, username, position }) => {
      setCursors((prev) => ({
        ...prev,
        [userId]: { username, position },
      }));
    });

    // Title updates from other users
    socket.on("title-updated", ({ title: newTitle }) => {
      setTitle(newTitle);
    });

    // Join the document room
    socket.emit("join-document", id);

    // Timeout fallback for loading
    const loadTimeout = setTimeout(() => {
      if (loading) {
        console.error("Document load timed out");
        setError("Connection timeout. Please check your internet or try again.");
        setLoading(false);
      }
    }, 10000);

    return () => {
      clearTimeout(loadTimeout);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.io.off("reconnect", onReconnect);
      socket.off("load-document");
      socket.off("receive-changes");
      socket.off("presence-update");
      socket.off("user-typing");
      socket.off("user-stopped-typing");
      socket.off("cursor-update");
      socket.off("title-updated");
    };
  }, [id, user, loading]);

  // =========================
  // TEXT CHANGE HANDLER
  // =========================
  const handleChange = useCallback(
    (e) => {
      if (role !== "editor" && role !== "owner") return;

      const newText = e.target.value;
      setText(newText);

      // Emit change
      socket.emit("text-change", {
        documentId: id,
        content: newText,
      });

      // Save indicator
      setIsSaving(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 2500);

      // Typing indicator
      socket.emit("typing-start", id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing-stop", id);
      }, 1500);
    },
    [role, id]
  );

  // =========================
  // CURSOR POSITION TRACKING
  // =========================
  const handleSelect = useCallback(
    (e) => {
      const textarea = e.target;
      const position = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };
      socket.emit("cursor-move", { documentId: id, position });
    },
    [id]
  );

  // =========================
  // TITLE CHANGE
  // =========================
  const handleTitleChange = useCallback(
    (e) => {
      if (role !== "editor" && role !== "owner") return;
      const newTitle = e.target.value;
      setTitle(newTitle);
      socket.emit("title-change", { documentId: id, title: newTitle });
    },
    [role, id]
  );

  // =========================
  // VERSION HISTORY
  // =========================
  const fetchVersions = async () => {
    setVersionsLoading(true);
    try {
      const { data } = await api.get(`/documents/${id}/versions`);
      setVersions(data);
    } catch (err) {
      console.error("Failed to fetch versions");
    } finally {
      setVersionsLoading(false);
    }
  };

  const saveVersion = async () => {
    try {
      await api.post(`/documents/${id}/versions`);
      fetchVersions();
    } catch (err) {
      console.error("Failed to save version");
    }
  };

  const restoreVersion = async (versionId) => {
    if (!confirm("Restore this version? Current content will be saved as a new version first."))
      return;
    try {
      const { data } = await api.post(`/documents/${id}/versions/${versionId}/restore`);
      setText(data.content);
      fetchVersions();
    } catch (err) {
      console.error("Failed to restore version");
    }
  };

  const toggleVersions = () => {
    if (!showVersions) fetchVersions();
    setShowVersions(!showVersions);
  };

  const isOwner = user?.id === ownerId;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-primary/[0.02]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-bold text-primary/40 uppercase tracking-widest">Loading Document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <X size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary">Unable to load document</h2>
            <p className="text-primary/60">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} className="w-full">
            Try Again
          </Button>
          <Link to="/dashboard" className="block text-sm font-bold text-primary/40 hover:text-primary transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-8"
        >
          {/* Connection Status */}
          {!isConnected && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold">
              <WifiOff size={14} />
              Reconnecting...
            </div>
          )}

          {/* Document Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 border-b border-primary/5">
            <div className="space-y-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary/40 hover:text-primary transition-colors uppercase tracking-widest"
              >
                <ChevronLeft size={14} /> Back to Dashboard
              </Link>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                  <FileText size={24} />
                </div>
                <div>
                  {(role === "editor" || role === "owner") ? (
                    <input
                      type="text"
                      value={title}
                      onChange={handleTitleChange}
                      className="text-3xl font-extrabold tracking-tight text-primary bg-transparent border-none focus:outline-none w-full"
                      placeholder="Untitled Document"
                      maxLength={200}
                    />
                  ) : (
                    <h1 className="text-3xl font-extrabold tracking-tight text-primary">
                      {title || "Untitled Document"}
                    </h1>
                  )}
                  <div className="flex gap-2 mt-1 items-center">
                    <Badge
                      variant={role === "owner" ? "secondary" : role === "editor" ? "success" : "default"}
                    >
                      {role.toUpperCase()}
                    </Badge>
                    {isConnected && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-accent/60">
                        <Wifi size={10} /> Live
                      </span>
                    )}
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
              {/* Online Users */}
              <div className="flex items-center gap-2 px-4 py-2 bg-white/50 rounded-2xl border border-primary/5 mr-2">
                <div className="flex -space-x-2">
                  {onlineUsers.slice(0, 3).map((u, i) => (
                    <div
                      key={u.userId}
                      className="w-8 h-8 rounded-full bg-accent border-2 border-white flex items-center justify-center text-[10px] font-bold text-white uppercase"
                      title={u.username}
                    >
                      {u.username?.[0] || "?"}
                    </div>
                  ))}
                  {onlineUsers.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-secondary border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                      +{onlineUsers.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-primary/60 ml-2">
                  {onlineUsers.length} Online
                </span>
              </div>

              {/* Version History */}
              <Button variant="outline" size="sm" onClick={toggleVersions} className="gap-2">
                <Clock size={16} />
                <span className="hidden sm:inline">History</span>
              </Button>

              {/* Save Version */}
              {(role === "editor" || role === "owner") && (
                <Button variant="outline" size="sm" onClick={saveVersion} className="gap-2">
                  <Save size={16} />
                  <span className="hidden sm:inline">Save Version</span>
                </Button>
              )}

              {role === "owner" && (
                <Button onClick={() => setIsShareModalOpen(true)} className="gap-2 bg-accent hover:bg-accent/90">
                  <Share2 size={18} /> Share
                </Button>
              )}
            </div>
          </header>

          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            documentId={id}
          />

          {/* Main Content Area */}
          <div className="flex gap-6">
            {/* Editor Container */}
            <div className="relative group flex-1">
              <div className="absolute -inset-1 bg-gradient-to-r from-secondary/5 to-accent/5 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white rounded-[2rem] p-4 sm:p-12 shadow-elevated min-h-[70vh]">
                <textarea
                  className="w-full min-h-[60vh] bg-transparent border-none text-primary text-xl leading-relaxed focus:outline-none placeholder:text-primary/10 resize-none font-medium"
                  value={text}
                  onChange={handleChange}
                  onSelect={handleSelect}
                  readOnly={role === "viewer"}
                  placeholder={
                    role === "viewer"
                      ? "You only have viewing permissions"
                      : "Start your masterpiece..."
                  }
                />

                {/* Typing Indicators */}
                <AnimatePresence>
                  {typingUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-6 left-12 flex items-center gap-2 text-xs font-semibold text-primary/40"
                    >
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </span>
                      {typingUsers.map((u) => u.username).join(", ")}{" "}
                      {typingUsers.length === 1 ? "is" : "are"} typing...
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Version History Sidebar */}
            <AnimatePresence>
              {showVersions && (
                <motion.div
                  initial={{ opacity: 0, x: 20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 320 }}
                  exit={{ opacity: 0, x: 20, width: 0 }}
                  className="shrink-0 overflow-hidden"
                >
                  <div className="bg-white/80 backdrop-blur-sm border border-primary/5 rounded-2xl p-6 h-[70vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-primary/40 flex items-center gap-2">
                        <Clock size={14} /> Version History
                      </h3>
                      <button
                        onClick={() => setShowVersions(false)}
                        className="p-1.5 hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <X size={16} className="text-primary/40" />
                      </button>
                    </div>

                    {versionsLoading ? (
                      <p className="text-sm text-primary/30 text-center py-8">Loading...</p>
                    ) : versions.length === 0 ? (
                      <p className="text-sm text-primary/30 text-center py-8">No versions yet</p>
                    ) : (
                      <>
                        <div className="space-y-3 mb-6">
                          {versions.map((v) => (
                            <div
                              key={v._id}
                              className="p-3 rounded-xl bg-primary/[0.02] border border-primary/5 hover:border-primary/10 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-primary">
                                  v{v.versionNumber}
                                </span>
                                {(role === "editor" || role === "owner") && (
                                  <button
                                    onClick={() => restoreVersion(v._id)}
                                    className="text-xs font-bold text-secondary hover:underline flex items-center gap-1"
                                  >
                                    <RotateCcw size={12} /> Restore
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-primary/40 font-medium">
                                {v.createdBy?.username || "Unknown"} •{" "}
                                {new Date(v.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => setShowVersions(false)}
                        >
                          ← Back to Document
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}