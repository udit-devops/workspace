import axios from "axios";

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export const verifyTurnstile = async (token: string) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new Error("Turnstile secret key missing");
  }

  const response = await axios.post<TurnstileResponse>(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    new URLSearchParams({
      secret,
      response: token,
    })
  );

  if (!response.data.success) {
    console.error("Turnstile errors:", response.data["error-codes"]);
    throw new Error("Turnstile verification failed");
  }
};
