import { useIsPresent } from "framer-motion";
import { useLayoutEffect, useState } from "react";

type ShimmerVariant = "dark" | "light";

/**
 * One-shot radial shimmer on top of content while the parent `motion` node exits
 * (must live inside an `AnimatePresence` + `motion` subtree).
 */
export function ReviewExitShimmerOverlay({
  variant = "dark",
}: {
  variant?: ShimmerVariant;
}) {
  const isPresent = useIsPresent();
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    if (!isPresent) setActive(true);
  }, [isPresent]);

  if (!active) return null;

  const tone =
    variant === "light"
      ? "review-exit-shimmer-overlay review-exit-shimmer-overlay--light"
      : "review-exit-shimmer-overlay review-exit-shimmer-overlay--dark";

  return <div className={tone} aria-hidden />;
}
