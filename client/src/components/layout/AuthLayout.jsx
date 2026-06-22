import { motion } from "framer-motion";
import Card from "../ui/Card";

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_#E7F0C3,_transparent)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="mb-12 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-elevated">
            <svg /* Logo Icon */ viewBox="0 0 24 24" className="w-8 h-8 fill-current">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2 italic">
            {title}
          </h1>
          <p className="text-secondary font-medium uppercase tracking-widest text-xs">
            {subtitle}
          </p>
        </div>

        <Card className="shadow-elevated border-white">
          {children}
        </Card>
      </motion.div>
    </div>
  );
}
