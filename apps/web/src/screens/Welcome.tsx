import { useNavigate } from "react-router";
import { WelcomeBody } from "@pro-now/ui";

import { WelcomeScene } from "../art/WelcomeScene";
import { useFrame } from "../frame";

/** The demo's welcome screen, over the demo's painted neon street. */
export function Welcome() {
  const navigate = useNavigate();
  const { width, height } = useFrame();
  return (
    <WelcomeBody
      background={<WelcomeScene />}
      onCustomer={() => navigate("/sign-in")}
      onProfessional={() => navigate("/sign-in?side=pro")}
      width={width}
      height={height}
    />
  );
}
