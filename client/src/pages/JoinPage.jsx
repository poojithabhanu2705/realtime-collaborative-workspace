import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import api from "../services/api";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("joining");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const token = searchParams.get("token");

  useEffect(() => {
    const joinDoc = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid or missing sharing link.");
        return;
      }

      try {
        const res = await api.post("/documents/join", { token });
        setStatus("success");
        setMessage("Redirecting to document...");
        setTimeout(() => navigate(`/document/${res.data.documentId}`), 500);
      } catch (err) {
        setStatus("error");
        setMessage(err.response?.data?.message || "Failed to join document.");
      }
    };

    joinDoc();
  }, [token, navigate]);

  return (
    <AuthLayout title="Joining document" subtitle="Please wait a moment">
      <div className="flex flex-col items-center gap-6 py-8">
        {status === "joining" && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Loader2 size={32} className="text-secondary" />
          </motion.div>
        )}

        {status === "error" && (
          <div className="w-full bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold border border-red-100 text-center">
            {message}
          </div>
        )}

        {status === "success" && (
          <div className="w-full bg-accent/10 text-accent p-4 rounded-2xl text-sm font-bold border border-accent/20 text-center">
            {message}
          </div>
        )}

        <Button variant="ghost" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </div>
    </AuthLayout>
  );
}
