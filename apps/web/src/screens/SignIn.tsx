import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { EmailSignInBody, type EmailSignInStage } from "@pro-now/ui";

import { authClient } from "../auth";
import { useFrame } from "../frame";

const RESEND_SECONDS = 30;

/**
 * Sign-in: the demo's AuthGate (tools/design-preview/src/App.tsx) with the
 * two stages, the 30-second resend timer and back-to-the-first-stage, but
 * against the real server: an email link, or Google.
 *
 * Once the link is opened (or Google answers), Better Auth sets the session
 * cookie and redirects to `callbackURL`.
 */
export function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const side = params.get("side") === "pro" ? "pro" : "customer";
  const { width, height } = useFrame();

  const [stage, setStage] = useState<EmailSignInStage>("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const sendLink = async () => {
    setBusy(true);
    setError(null);
    const { error: failed } = await authClient.signIn.magicLink({
      email: email.trim(),
      callbackURL: "/",
      errorCallbackURL: "/sign-in?expired=1",
    });
    setBusy(false);
    if (failed) {
      setError("לא הצלחנו לשלוח את הקישור. בדקו את הכתובת ונסו שוב.");
      return;
    }
    setStage("sent");
    setResendIn(RESEND_SECONDS);
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    const { error: failed } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/sign-in?expired=1",
    });
    // On success the browser is already leaving for Google.
    if (failed) {
      setBusy(false);
      setError("הכניסה עם Google לא הצליחה. אפשר לנסות שוב או להיכנס עם מייל.");
    }
  };

  const expired = params.get("expired") === "1";

  return (
    <EmailSignInBody
      side={side}
      stage={stage}
      email={email}
      onChangeEmail={(v) => {
        setEmail(v);
        setError(null);
      }}
      resendInSeconds={resendIn}
      errorHe={error ?? (expired && stage === "email" ? "הקישור כבר לא בתוקף. נשלח לכם חדש." : null)}
      busy={busy}
      onSubmitEmail={sendLink}
      onGoogle={google}
      onResend={sendLink}
      onBack={() => (stage === "sent" ? setStage("email") : navigate("/welcome"))}
      width={width}
      height={height}
    />
  );
}
