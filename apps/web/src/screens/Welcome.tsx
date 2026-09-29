import { useNavigate } from "react-router";
import { WelcomeBody } from "@pro-now/ui";

import { WelcomeScene } from "../art/WelcomeScene";
import { useFrame } from "../frame";

/**
 * The demo's welcome screen, over the demo's painted neon street.
 *
 * "אני בעל מקצוע" and the business link are shown disabled until their
 * epics ship (the professional's app is W7; business leads have no backend
 * yet), per docs/21 W2 option (a).
 */
export function Welcome() {
  const navigate = useNavigate();
  const { width, height } = useFrame();
  return (
    <WelcomeBody
      background={<WelcomeScene />}
      onCustomer={() => navigate("/sign-in")}
      advertiseUpcoming
      width={width}
      height={height}
    />
  );
}
