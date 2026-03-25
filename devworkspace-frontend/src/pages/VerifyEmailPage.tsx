import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Check, ArrowRight, RefreshCw } from "lucide-react";
import logo from "../assets/logo.png";
import { api } from "../api/api";
import "../VerifyEmail.css";

export default function VerifyEmailPage() {
    const [params] = useSearchParams();
    const userId = params.get("userId");
    const navigate = useNavigate();

    const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [timer, setTimer] = useState(60);
    const [resending, setResending] = useState(false);

    // ⏱️ Countdown for resend
    useEffect(() => {
        if (timer === 0) return;
        const interval = setInterval(() => {
            setTimer((t) => t - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    // 🔢 OTP Input handling
    const handleChange = (value: string, index: number) => {
        if (!/^\d?$/.test(value)) return;

        const updated = [...otp];
        updated[index] = value;
        setOtp(updated);

        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const updated = [...otp];
        pastedData.split("").forEach((char, idx) => {
            if (idx < 6) updated[idx] = char;
        });
        setOtp(updated);
        
        const nextEmpty = updated.findIndex(digit => !digit);
        if (nextEmpty !== -1) {
            inputsRef.current[nextEmpty]?.focus();
        } else {
            inputsRef.current[5]?.focus();
        }
    };

    // ✅ VERIFY OTP
    const handleVerify = async () => {
        setError("");
        setSuccess("");

        const code = otp.join("");
        if (code.length !== 6) {
            setError("Please enter the complete 6-digit code");
            return;
        }

        try {
            setLoading(true);
            await api.post("/auth/verify-email", {
                userId,
                otp: code,
            });

            setSuccess("Email verified successfully! 🎉");
            setTimeout(() => navigate("/dashboard"), 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || "Invalid or expired code. Please try again.");
            setOtp(Array(6).fill(""));
            inputsRef.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // 🔁 RESEND OTP
    const resendOtp = async () => {
        try {
            setResending(true);
            setError("");
            await api.post("/auth/resend-otp", { userId });
            setTimer(60);
            setSuccess("New code sent to your email!");
            setTimeout(() => setSuccess(""), 3000);
        } catch {
            setError("Failed to resend code. Please try again.");
        } finally {
            setResending(false);
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
                            Verify your
                            <span className="graphite-gradient-text"> email address</span>
                        </h2>
                        <p className="graphite-hero-subtitle">
                            We've sent a 6-digit verification code to your email. 
                            Enter it below to activate your account and start building.
                        </p>
                    </div>

                    <div className="graphite-features">
                        <div className="graphite-feature-item">
                            <div className="graphite-feature-icon">
                                <Check size={16} />
                            </div>
                            <span>Secure verification process</span>
                        </div>
                        <div className="graphite-feature-item">
                            <div className="graphite-feature-icon">
                                <Check size={16} />
                            </div>
                            <span>Code expires in 10 minutes</span>
                        </div>
                        <div className="graphite-feature-item">
                            <div className="graphite-feature-icon">
                                <Check size={16} />
                            </div>
                            <span>Can't find it? Check spam folder</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - OTP Form */}
                <div className="graphite-right">
                    <div className="graphite-form-card">
                        <div className="graphite-form-header">
                            <div className="otp-icon-wrapper">
                                <Mail size={32} />
                            </div>
                            <h3>Enter verification code</h3>
                            <p>Check your inbox for the 6-digit code</p>
                        </div>

                        {/* Error / Success Messages */}
                        {error && (
                            <div className="graphite-error">
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="graphite-success">
                                <span>{success}</span>
                            </div>
                        )}

                        {/* OTP Inputs */}
                        <div className="otp-inputs-container" onPaste={handlePaste}>
                            {otp.map((digit, idx) => (
                                <input
                                    key={idx}
                                    ref={(el) => {
                                        inputsRef.current[idx] = el;
                                    }}
                                    value={digit}
                                    onChange={(e) => handleChange(e.target.value, idx)}
                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                    maxLength={1}
                                    className="otp-input"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    autoFocus={idx === 0}
                                />
                            ))}
                        </div>

                        {/* Verify Button */}
                        <button 
                            type="button"
                            className="graphite-submit-btn" 
                            disabled={loading || otp.join("").length !== 6}
                            onClick={handleVerify}
                        >
                            {loading ? (
                                <span className="graphite-btn-loading">
                                    <span className="graphite-spinner"></span>
                                    Verifying...
                                </span>
                            ) : (
                                <>
                                    Verify Email
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>

                        {/* Resend Section */}
                        <div className="otp-resend-section">
                            {timer > 0 ? (
                                <p className="otp-timer">
                                    Didn't receive the code? Resend in <span>{timer}s</span>
                                </p>
                            ) : (
                                <button
                                    type="button"
                                    className="otp-resend-btn"
                                    onClick={resendOtp}
                                    disabled={resending}
                                >
                                    {resending ? (
                                        <>
                                            <span className="graphite-spinner small"></span>
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={16} />
                                            Resend verification code
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Back to Login */}
                        <div className="graphite-signup-link">
                            Wrong email? <a href="/signup">Sign up again</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}