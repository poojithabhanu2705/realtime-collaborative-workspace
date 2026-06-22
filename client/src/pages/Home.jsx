import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Shield, Globe, Code } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";
import Navbar from "../components/layout/Navbar";

export default function Home() {
  const [docId, setDocId] = useState("");
  const navigate = useNavigate();

  const joinDocument = (e) => {
    e.preventDefault();
    if (!docId.trim()) return;
    navigate(`/document/${docId}`);
  };

  const createNew = () => {
    const id = Math.random().toString(36).substring(7);
    navigate(`/document/${id}`);
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
                  placeholder="Enter document ID to join..."
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
                onClick={createNew}
                className="text-sm font-bold text-primary hover:text-secondary transition-colors underline decoration-2 underline-offset-4"
              >
                Create a new document
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Preview */}
      <section className="py-20 bg-primary/[0.02] border-y border-primary/5">
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
      <p className="text-primary/60 text-sm font-medium leading-relaxed">
        {description}
      </p>
    </Card>
  );
}