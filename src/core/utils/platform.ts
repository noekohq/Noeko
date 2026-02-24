type IOSOptions = "unknown" | "windows" | "macos" | "unix" | "linux" | "android" | "ios";

export function getOS(): IOSOptions {
  const userAgent = navigator.userAgent;

  if (userAgent.indexOf("Win") != -1) return "windows";
  if (userAgent.indexOf("Mac") != -1) return "macos";
  if (userAgent.indexOf("X11") != -1) return "unix";
  if (userAgent.indexOf("Linux") != -1) return "linux";
  if (userAgent.indexOf("Android") != -1) return "android";
  if (userAgent.indexOf("iOS") != -1) return "ios";

  return "unknown";
}

export interface MetaKeys {
  primary: string | null;
  secondary: string | null;
  control: string | null;
  shift: string | null;
}

export function getMetaKeys(): MetaKeys {
  const os = getOS();

  switch (os) {
    case "macos":
      return {
        primary: "⌘", // Command
        secondary: "⌥", // Option
        control: "Ctrl", // Control key on Mac
        shift: "Shift",
      };
    case "windows":
    case "linux":
    case "unix":
      return {
        primary: "Ctrl",
        secondary: "Alt",
        control: "Ctrl",
        shift: "Shift",
      };
    case "ios":
    case "android":
      // Mobile OSes don't typically use meta keys in the same way for keyboard shortcuts
      // However, if an external keyboard is connected, they might follow platform conventions
      // For simplicity, we can return null or common defaults.
      // Let's assume for external keyboards, iOS might lean towards Mac-like, Android towards PC-like
      // but this is a broad generalization.
      // Returning null clearly indicates they aren't standard like on desktop.
      // Or, for a more generic approach if a keyboard *is* present:
      // if (os === 'ios') return { primary: 'Cmd', secondary: 'Opt', control: 'Ctrl', shift: 'Shift' };
      // if (os === 'android') return { primary: 'Ctrl', secondary: 'Alt', control: 'Ctrl', shift: 'Shift' };
      return {
        primary: null, // Or "Ctrl" as a general fallback if a physical keyboard is assumed
        secondary: null, // Or "Alt"
        control: null,
        shift: null, // Shift might still be relevant with virtual keyboards for capitalization
      };
    case "unknown":
    default:
      // Default to Windows-like keys as a common fallback
      return {
        primary: "Ctrl",
        secondary: "Alt",
        control: "Ctrl",
        shift: "Shift",
      };
  }
}
