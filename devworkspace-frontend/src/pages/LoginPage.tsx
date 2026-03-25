import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import logo from "../assets/logo.png";

declare global {
  interface Window {
    turnstile: any;
  }
}

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const el = document.getElementById("cf-login");
    if (el && el.childElementCount === 0 && window.turnstile) {
      window.turnstile.render("#cf-login", {
        sitekey: "0x4AAAAAACCcd2b8x6PCWQ_p",
        theme: "dark",
        callback: (token: string) => setCaptchaToken(token),
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
      await login(email, password,captchaToken);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err); // 👈 ADD THIS
      console.error("Error response:", err.response?.data); // 👈 ADD THIS
      setError(err.message || "Login failed. Please try again.");
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
    } catch (err: any) {
      setError("Google login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="graphite-auth-container">
      {/* Animated Background */}
      <div className="graphite-bg">
        <div className="graphite-grid"></div>
        <div className="graphite-gradient gradient-1"></div>
        <div className="graphite-gradient gradient-2"></div>
        <div className="graphite-gradient gradient-3"></div>
      </div>

      {/* Main Content */}
      <div className="graphite-content">
        {/* Left Side - Branding */}
        <div className="graphite-left">
          <div className="graphite-logo-section">
            <img src={logo} alt="DevWorkspace" className="graphite-logo" />
            <h1 className="graphite-brand">DevWorkspace</h1>
          </div>

          <div className="graphite-hero">
            <h2 className="graphite-hero-title">
              Welcome back to your
              <span className="graphite-gradient-text"> development hub</span>
            </h2>
            <p className="graphite-hero-subtitle">
              Sign in to access your projects, collaborate with your team, and deploy with confidence.
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

        {/* Right Side - Form */}
        <div className="graphite-right">
          <div className="graphite-form-card">
            <div className="graphite-form-header">
              <h3>Sign in</h3>
              <p>Enter your credentials to continue</p>
            </div>

            {error && (
              <div className="graphite-error">
                <span>{error}</span>
              </div>
            )}

            {/* Google Login */}
            <div className="graphite-google-btn">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google login failed")}
                size="large"
                text="continue_with"
                shape="rectangular"
                width="100%"
                theme="filled_black"
              />
            </div>

            <div className="graphite-divider">
              <span>or</span>
            </div>

            <form onSubmit={handleSubmit} className="graphite-form">
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="graphite-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* <div className="graphite-form-footer">
                <Link to="/forgot-password" className="graphite-link">
                  Forgot password?
                </Link>
              </div> */}

              <div id="cf-login" className="graphite-captcha"></div>

              <button 
                type="submit" 
                className="graphite-submit-btn" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="graphite-btn-loading">
                    <span className="graphite-spinner"></span>
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="graphite-signup-link">
              Don't have an account? <Link to="/signup">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}