import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import { LogOut, FileText, Share2, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-primary/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-105">
            <FileText size={24} />
          </div>
          <span className="text-xl font-extrabold tracking-tighter text-primary">collab.io</span>
        </Link>

        {user && (
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4 text-sm font-semibold text-primary/60">
               <span className="flex items-center gap-1.5"><Users size={16}/> {user.username}</span>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="gap-2">
              <LogOut size={16} />
              <span className="hidden xs:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
