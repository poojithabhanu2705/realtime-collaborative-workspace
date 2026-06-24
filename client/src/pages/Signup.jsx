import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import AuthLayout from "../components/layout/AuthLayout";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signup(username, email, password);
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        // Handle validation errors array
        const messages = data.errors.map(e => e.message).join(". ");
        setError(messages);
      } else {
        // Handle single message or generic error
        setError(data?.message || "Unable to sign up. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Join the loop" 
      subtitle="Start collaborating in seconds"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold border border-red-100">
            {error}
          </div>
        )}

        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          placeholder="johndoe"
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@collab.io"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="••••••••"
        />

        <Button 
          type="submit" 
          className="w-full py-4 text-xs tracking-widest uppercase font-bold" 
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Get Started"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-primary/40 font-medium">
        Already have an account?{" "}
        <Link to="/login" className="text-secondary font-bold hover:underline underline-offset-4">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
