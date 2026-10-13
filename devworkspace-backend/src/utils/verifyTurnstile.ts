import axios from "axios";

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

const verificationFailed = () =>
  Object.assign(new Error("Security verification failed. Please try again."), { statusCode: 400 });

export const verifyTurnstile = async (token: string | undefined) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new Error("Turnstile secret key missing");
  }
  if (!token) throw verificationFailed();

  // Cloudflare answers bad tokens with HTTP 400 + JSON; read it instead of throwing.
  const response = await axios.post<TurnstileResponse>(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    new URLSearchParams({
      secret,
      response: token,
    }),
    { validateStatus: (status) => status < 500 }
  );

  if (!response.data.success) {
    console.error("Turnstile errors:", response.data["error-codes"]);
    throw verificationFailed();
  }
};
