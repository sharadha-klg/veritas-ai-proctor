import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 1600);
    const navTimer = setTimeout(() => navigate("/select-role"), 2200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div
      className={`fixed inset-0 gradient-bg flex flex-col items-center justify-center transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
    >
      <div
        className="flex flex-col items-center gap-5"
        style={{ animation: "logo-reveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}
      >
        <div className="w-20 h-20 rounded-2xl glass-card flex items-center justify-center"
          style={{ animation: "pulse-glow 2s ease-in-out infinite" }}>
          <Shield className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-5xl md:text-6xl font-display font-bold text-primary-foreground tracking-tight">
          Veritas AI
        </h1>
        <p className="text-primary-foreground/60 text-lg font-light tracking-wide">
          Intelligent Exam Proctoring
        </p>
      </div>

      <div className="absolute bottom-12 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-primary-foreground/40"
            style={{
              animation: `pulse-glow 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
