import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

// SVG icons for social providers
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const ManusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="url(#manus_grad)"/>
    <path d="M8 16V8l4 4 4-4v8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="manus_grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FBBC05"/>
        <stop offset="1" stopColor="#EA4335"/>
      </linearGradient>
    </defs>
  </svg>
);

function SocialButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 hover:scale-[1.01] active:scale-[0.98] text-sm font-medium"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.85)",
      }}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-center">{label}</span>
    </button>
  );
}

export default function AuthPage() {
  const { t } = useTranslation();

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 relative"
      style={{
        background: "linear-gradient(135deg, #0a0a1a 0%, #0d1b3e 40%, #0a2240 70%, #0d1b2a 100%)",
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 -left-24 w-[350px] h-[350px] rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, var(--color-gold-dark) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={15} />
          Retour à l'accueil
        </Link>

        {/* Card */}
        <div
          className="rounded-3xl p-8 md:p-10"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="/manus-storage/thunderfam_logo_dark_e8f49927.jpg"
              alt="Thunderfam Group Limited"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-display font-bold text-white text-center mb-2">
            {t("auth.loginTitle")}
          </h1>
          <p className="text-white/50 text-sm text-center mb-8">
            Accédez à votre espace client Thunderfam Group Limited
          </p>

          {/* Social login buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <SocialButton
              icon={<GoogleIcon />}
              label={t("auth.googleLogin")}
              onClick={handleLogin}
            />
            <SocialButton
              icon={<FacebookIcon />}
              label={t("auth.facebookLogin")}
              onClick={handleLogin}
            />
            <SocialButton
              icon={<AppleIcon />}
              label={t("auth.appleLogin")}
              onClick={handleLogin}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
            <span className="text-xs text-white/40 font-medium">{t("auth.orContinueWith")}</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))",
            }}
          >
            <ManusIcon />
            <span className="flex-1 text-center">Se connecter avec Manus</span>
          </button>

          <p className="text-xs text-white/30 text-center mt-6 leading-relaxed">
            En vous connectant, vous acceptez nos{" "}
            <span className="text-white/50 underline cursor-pointer">Conditions d'utilisation</span>{" "}
            et notre{" "}
            <span className="text-white/50 underline cursor-pointer">Politique de confidentialité</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
