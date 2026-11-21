import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SoundContext } from "./soundContextValue.js";
import hoverSound from "../assets/sounds/hover sound effect.wav";
import clickSound from "../assets/sounds/main clicking sound effect.wav";
import themeSound from "../assets/sounds/light and darkmode sound effect.wav";
import toggleOnSound from "../assets/sounds/sound toggle on sound effect.wav";

const soundSources = {
  hover: hoverSound,
  click: clickSound,
  theme: themeSound,
  toggle: toggleOnSound,
};

const audioPlayers = Object.fromEntries(
  Object.entries(soundSources).map(([name, source]) => {
    const audio = new Audio(source);
    audio.preload = "auto";
    audio.load();
    return [name, audio];
  }),
);

function getInitialSoundEnabled() {
  return localStorage.getItem("soundEnabled") === "true";
}

function getInteractiveTarget(target) {
  return target instanceof Element
    ? target.closest("button, a, [role='button']")
    : null;
}

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(getInitialSoundEnabled);
  const enabledRef = useRef(enabled);

  const setSoundEnabled = useCallback((nextEnabled) => {
    const value = typeof nextEnabled === "function"
      ? nextEnabled(enabledRef.current)
      : nextEnabled;
    enabledRef.current = value;
    localStorage.setItem("soundEnabled", String(value));
    if (!value) Object.values(audioPlayers).forEach((audio) => audio.pause());
    setEnabled(value);
  }, []);

  const playSound = useCallback((name) => {
    if (!enabledRef.current) return;

    const source = soundSources[name];
    if (!source) return;

    try {
      const audio = audioPlayers[name];
      audio.pause();
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {
      // Sound playback should never block the control that triggered it.
    }
  }, []);

  const toggleSound = useCallback(() => {
    const nextEnabled = !enabledRef.current;
    setSoundEnabled(nextEnabled);
    if (nextEnabled) playSound("toggle");
  }, [playSound, setSoundEnabled]);

  useEffect(() => {
    const handleClick = (event) => {
      if (window.location.pathname === "/login") return;

      const control = getInteractiveTarget(event.target);
      if (!control || control.disabled || control.getAttribute("aria-disabled") === "true") return;

      const effect = control.dataset.soundEffect;
      if (effect === "none") return;
      if (effect === "theme") {
        playSound("theme");
        return;
      }
      if (effect === "toggle") return;
      playSound("click");
    };

    const handlePointerOver = (event) => {
      if (window.location.pathname === "/login") return;

      const control = getInteractiveTarget(event.target);
      const previousControl = getInteractiveTarget(event.relatedTarget);
      if (
        !control ||
        !control.closest("aside") ||
        control === previousControl ||
        control.disabled
      ) return;
      if (control.dataset.soundEffect === "none") return;
      playSound("hover");
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("pointerover", handlePointerOver);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("pointerover", handlePointerOver);
    };
  }, [playSound]);

  const value = useMemo(
    () => ({ enabled, setSoundEnabled, toggleSound }),
    [enabled, setSoundEnabled, toggleSound],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
