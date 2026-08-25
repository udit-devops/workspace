import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Terminal,
  LogIn,
  UserPlus,
} from "lucide-react";
import logo from "../assets/logo.png";

type Mode = "login" | "signup";

export default function AuthPage() {
  const { login, signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [active, setActive] = useState<Mode | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCaptchaToken("");
    setError("");
    setEmail("");
    setPassword("");
  }, [active]);

  useEffect(() => {
    const id = active === "signup" ? "cf-signup" : "cf-login";
    const el = document.getElementById(id);
    if (el && el.childElementCount === 0 && window.turnstile) {
      window.turnstile.render(`#${id}`, {
        sitekey: "0x4AAAAAACCcd2b8x6PCWQ_p",
        theme: "dark",
        callback: (token: string) => setCaptchaToken(token),
      });
    }
  }, [active]);

  const pick = (mode: Mode) => {
    setActive(mode);
    navigate(mode === "signup" ? "/signup" : "/login", { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      setError("Please complete the security verification");
      return;
    }

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(email, password, captchaToken);
      navigate("/dashboard");
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || "Login failed. Please try again.";
      setError(msg);
      console.error("Login error:", err);
      console.error("Error response:", err.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      setError("Please complete the security verification");
      return;
    }

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const userId = await signup(email, password, captchaToken);
      navigate(`/verify-email?userId=${userId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (res: any) => {
    if (!res.credential) return;
    setIsLoading(true);
    setError("");

    try {
      await googleLogin(res.credential);
      navigate("/dashboard");
    } catch {
      setError("Google login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isForm = active !== null;
  const isLoginForm = active === "login";

  return (
    <div className="graphite-auth-container">
      <div className="graphite-bg">
        <div className="graphite-grid"></div>
        <div className="graphite-gradient gradient-1"></div>
        <div className="graphite-gradient gradient-2"></div>
        <div className="graphite-gradient gradient-3"></div>
      </div>

      <div className="graphite-content">
        <div className="graphite-left">
          <div className="graphite-logo-section">
            <img src={logo} alt="Devspaces" className="graphite-logo" />
            <h1 className="graphite-brand">
              Dev<span className="brand-accent">spaces</span>
            </h1>
          </div>

          <div className="graphite-hero">
            <h2 className="graphite-hero-title">
              {isForm ? (
                isLoginForm ? (
                  <>
                    Welcome back to the{" "}
                    <span className="graphite-gradient-text">devspaces</span>
                  </>
                ) : (
                  <>
                    Launch your next{" "}
                    <span className="graphite-gradient-text">build</span> today
                  </>
                )
              ) : (
                <>
                  Where ideas get{" "}
                  <span className="graphite-gradient-text">deployed</span>
                </>
              )}
            </h2>
            <p className="graphite-hero-subtitle">
              {isForm
                ? isLoginForm
                  ? "Sign in to access your projects, collaborate with your team, and ship with confidence."
                  : "Join the developers building at the speed of light. Free to start, set up in under 60 seconds."
                : "A vintage-grade developer workspace. Pick your entrance and keep building the future."}
            </p>
          </div>

          <div className="graphite-features">
            <div className="graphite-feature-item">
              <div className="graphite-feature-icon">
                <Check size={16} />
              </div>
              <span>Lightning-fast cloud IDE</span>
            </div>
            <div className="graphite-feature-item">
              <div className="graphite-feature-icon">
                <Check size={16} />
              </div>
              <span>Collaborative coding environment</span>
            </div>
            <div className="graphite-feature-item">
              <div className="graphite-feature-icon">
                <Check size={16} />
              </div>
              <span>One-click deployments</span>
            </div>
          </div>
        </div>

        <div className="graphite-right">
          {!isForm ? (
            <div className="graphite-form-card dev-gate">
              <div className="dev-gate-badge">
                <span className="dev-gate-status"></span>
                ready to boot
              </div>
              <h2 className="dev-gate-title">
                Choose your
                <br />
                entrance.
              </h2>
              <p className="dev-gate-subtitle">
                Welcome to Devspaces. Sign in to pick up where you left off, or
                create a fresh workspace to start shipping.
              </p>

              <div className="dev-gate-actions">
                <button type="button" className="dev-gate-btn primary" onClick={() => pick("login")}>
                  Sign in
                  <LogIn size={18} />
                </button>
                <button type="button" className="dev-gate-btn" onClick={() => pick("signup")}>
                  Create an account
                  <UserPlus size={18} />
                </button>
              </div>

              <p className="dev-gate-note">
                <Terminal size={13} style={{ verticalAlign: -2 }} /> google oauth
                available after sign in
              </p>
            </div>
          ) : (
            <div className="graphite-form-card">
              <div className="graphite-form-header">
                <h3>{isLoginForm ? "Sign in" : "Create your account"}</h3>
                <p>
                  {isLoginForm
                    ? "Enter your credentials to continue"
                    : "Get started with Devspaces for free"}
                </p>
              </div>

              {error && (
                <div className="graphite-error">
                  <span>{error}</span>
                </div>
              )}

              <div className="graphite-google-btn">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google login failed")}
                  size="large"
                  text={isLoginForm ? "continue_with" : "signup_with"}
                  shape="rectangular"
                  width="100%"
                  theme="filled_black"
                />
              </div>

              <div className="graphite-divider">
                <span>or</span>
              </div>

              <form
                onSubmit={isLoginForm ? handleLogin : handleSignup}
                className="graphite-form"
              >
                <div className="graphite-input-group">
                  <label>Email</label>
                  <div className="graphite-input-wrapper">
                    <Mail size={18} />
                    <input
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="graphite-input-group">
                  <label>Password</label>
                  <div className="graphite-input-wrapper">
                    <Lock size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        isLoginForm ? "Enter your password" : "Create a strong password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={isLoginForm ? undefined : 8}
                    />
                    <button
                      type="button"
                      className="graphite-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {!isLoginForm && (
                    <p className="graphite-input-hint">Must be at least 8 characters</p>
                  )}
                </div>

                <div id={isLoginForm ? "cf-login" : "cf-signup"} className="graphite-captcha"></div>

                <button
                  type="submit"
                  className="graphite-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="graphite-btn-loading">
                      <span className="graphite-spinner"></span>
                      {isLoginForm ? "Signing in..." : "Creating account..."}
                    </span>
                  ) : (
                    <>
                      {isLoginForm ? "Sign in" : "Create account"}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {!isLoginForm && (
                <div className="graphite-terms">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </div>
              )}

              <div className="graphite-signup-link">
                {isLoginForm ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="dev-inline-link"
                      onClick={() => pick("signup")}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="dev-inline-link"
                      onClick={() => pick("login")}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}