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

export default function SignupPage() {
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const el = document.getElementById("cf-signup");
    if (el && el.childElementCount === 0 && window.turnstile) {
      window.turnstile.render("#cf-signup", {
        sitekey: "0x4AAAAAACCcd2b8x6PCWQ_p",
        theme: "dark",
        callback: (token: string) => setCaptchaToken(token),
      });
    }
  }, []);

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
    } catch (err: any) {
      setError("Google signup failed. Please try again.");
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
              Start building the
              <span className="graphite-gradient-text"> future today</span>
            </h2>
            <p className="graphite-hero-subtitle">
              Join thousands of developers who trust DevWorkspace for their development needs.
            </p>
          </div>

          <div className="graphite-features">
            <div className="graphite-feature-item">
              <div className="graphite-feature-icon">
                <Check size={16} />
              </div>
              <span>Free account with no credit card</span>
            </div>
            <div className="graphite-feature-item">
              <div className="graphite-feature-icon">
                <Check size={16} />
              </div>
              <span>Full access to all features</span>
            </div>
            <div className="graphite-feature-item">
              <div className="graphite-feature-icon">
                <Check size={16} />
              </div>
              <span>Set up in under 60 seconds</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="graphite-right">
          <div className="graphite-form-card">
            <div className="graphite-form-header">
              <h3>Create your account</h3>
              <p>Get started with DevWorkspace for free</p>
            </div>

            {error && (
              <div className="graphite-error">
                <span>{error}</span>
              </div>
            )}

            {/* Google Signup */}
            <div className="graphite-google-btn">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google signup failed")}
                size="large"
                text="signup_with"
                shape="rectangular"
                width="100%"
                theme="filled_black"
              />
            </div>

            <div className="graphite-divider">
              <span>or</span>
            </div>

            <form onSubmit={handleSignup} className="graphite-form">
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
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="graphite-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="graphite-input-hint">Must be at least 8 characters</p>
              </div>

              <div id="cf-signup" className="graphite-captcha"></div>

              <button 
                type="submit" 
                className="graphite-submit-btn" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="graphite-btn-loading">
                    <span className="graphite-spinner"></span>
                    Creating account...
                  </span>
                ) : (
                  <>
                    Create account
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="graphite-terms">
              By signing up, you agree to our{" "}
              <Link to="/terms">Terms of Service</Link> and{" "}
              <Link to="/privacy">Privacy Policy</Link>
            </div>

            <div className="graphite-signup-link">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}