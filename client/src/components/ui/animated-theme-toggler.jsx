import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

function collapsedPolygon(point, vertexCount) {
  return `polygon(${Array.from({ length: vertexCount }, () => point).join(", ")})`;
}

function getClipPaths(variant, cx, cy, maxRadius, width, height) {
  const toX = (x) => `${(x / width) * 100}%`;
  const toY = (y) => `${(y / height) * 100}%`;
  const point = (x, y) => `${toX(x)} ${toY(y)}`;
  const origin = point(cx, cy);
  const radius = (value) => `${(value / (Math.hypot(width, height) / Math.SQRT2)) * 100}%`;

  switch (variant) {
    case "square": {
      const side = Math.max(cx, width - cx, cy, height - cy) * 1.05;
      const corners = [
        point(cx - side, cy - side),
        point(cx + side, cy - side),
        point(cx + side, cy + side),
        point(cx - side, cy + side),
      ];
      return [collapsedPolygon(origin, 4), `polygon(${corners.join(", ")})`];
    }
    case "triangle": {
      const side = maxRadius * 2.2;
      const halfWidth = (Math.sqrt(3) / 2) * side;
      const points = [
        point(cx, cy - side),
        point(cx + halfWidth, cy + side / 2),
        point(cx - halfWidth, cy + side / 2),
      ];
      return [collapsedPolygon(origin, 3), `polygon(${points.join(", ")})`];
    }
    case "diamond": {
      const distance = maxRadius * Math.SQRT2;
      const points = [
        point(cx, cy - distance),
        point(cx + distance, cy),
        point(cx, cy + distance),
        point(cx - distance, cy),
      ];
      return [collapsedPolygon(origin, 4), `polygon(${points.join(", ")})`];
    }
    case "hexagon": {
      const distance = maxRadius * Math.SQRT2;
      const points = Array.from({ length: 6 }, (_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI) / 3;
        return point(cx + distance * Math.cos(angle), cy + distance * Math.sin(angle));
      });
      return [collapsedPolygon(origin, 6), `polygon(${points.join(", ")})`];
    }
    case "rectangle": {
      const halfWidth = Math.max(cx, width - cx);
      const halfHeight = Math.max(cy, height - cy);
      const corners = [
        point(cx - halfWidth, cy - halfHeight),
        point(cx + halfWidth, cy - halfHeight),
        point(cx + halfWidth, cy + halfHeight),
        point(cx - halfWidth, cy + halfHeight),
      ];
      return [collapsedPolygon(origin, 4), `polygon(${corners.join(", ")})`];
    }
    case "star": {
      const outerRadius = maxRadius * Math.SQRT2 * 1.03;
      const star = (value) => {
        const points = [];
        for (let index = 0; index < 5; index += 1) {
          const outerAngle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
          const innerAngle = outerAngle + Math.PI / 5;
          points.push(point(cx + value * Math.cos(outerAngle), cy + value * Math.sin(outerAngle)));
          points.push(point(cx + value * 0.42 * Math.cos(innerAngle), cy + value * 0.42 * Math.sin(innerAngle)));
        }
        return `polygon(${points.join(", ")})`;
      };
      return [star(Math.max(2, outerRadius * 0.025)), star(outerRadius)];
    }
    case "circle":
    default:
      return [`circle(0% at ${origin})`, `circle(${radius(maxRadius)} at ${origin})`];
  }
}

export function AnimatedThemeToggler({
  className = "",
  duration = 400,
  variant = "circle",
  fromCenter = false,
  theme,
  onThemeChange,
  ...props
}) {
  const buttonRef = useRef(null);
  const transitioningRef = useRef(false);
  const animationRef = useRef(null);
  const isDark = theme === "dark";

  const cancelAnimation = useCallback(() => {
    animationRef.current?.cancel();
    animationRef.current = null;
  }, []);

  useEffect(() => () => {
    cancelAnimation();
    const root = document.documentElement;
    if (root.dataset.magicuiThemeVt !== "active") return;
    delete root.dataset.magicuiThemeVt;
    root.style.removeProperty("--magicui-theme-toggle-vt-duration");
    root.style.removeProperty("--magicui-theme-vt-clip-from");
  }, [cancelAnimation]);

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current;
    const root = document.documentElement;
    if (!button || transitioningRef.current || root.dataset.magicuiThemeVt === "active") return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const bounds = button.getBoundingClientRect();
    const x = fromCenter ? width / 2 : bounds.left + bounds.width / 2;
    const y = fromCenter ? height / 2 : bounds.top + bounds.height / 2;
    const maxRadius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
    const clipPaths = getClipPaths(variant, x, y, maxRadius, width, height);
    const applyTheme = () => onThemeChange?.(isDark ? "light" : "dark");

    if (typeof document.startViewTransition !== "function") {
      applyTheme();
      return;
    }

    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty("--magicui-theme-toggle-vt-duration", `${duration}ms`);
    root.style.setProperty("--magicui-theme-vt-clip-from", clipPaths[0]);
    transitioningRef.current = true;

    const cleanup = () => {
      transitioningRef.current = false;
      delete root.dataset.magicuiThemeVt;
      root.style.removeProperty("--magicui-theme-toggle-vt-duration");
      root.style.removeProperty("--magicui-theme-vt-clip-from");
      cancelAnimation();
    };

    const transition = document.startViewTransition(() => flushSync(applyTheme));
    transition.finished.finally(cleanup).catch(() => {});
    transition.ready.then(() => {
      animationRef.current = root.animate({ clipPath: clipPaths }, {
        duration,
        easing: variant === "star" ? "linear" : "ease-in-out",
        fill: "forwards",
        pseudoElement: "::view-transition-new(root)",
      });
    }).catch(() => {});
  }, [cancelAnimation, duration, fromCenter, isDark, onThemeChange, variant]);

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      className={className}
      {...props}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
