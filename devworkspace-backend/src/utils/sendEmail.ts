import { Resend } from "resend";



export async function sendVerificationEmail(to: string, code: string) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: "DevWorkspace <onboarding@resend.dev>",  // TEMP SAFE OPTION
    to,
    subject: "Verify your DevWorkspace account",
    html: `
      <p>Your verification code is:</p>
      <h2>${code}</h2>
      <p>It expires in 10 minutes.</p>
    `,
  });
}
