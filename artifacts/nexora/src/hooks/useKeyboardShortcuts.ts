import { useEffect } from "react";
import { useLocation } from "wouter";

export function useKeyboardShortcuts() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "h":
            e.preventDefault();
            setLocation("/dashboard");
            break;
          case "p":
            e.preventDefault();
            setLocation("/projects");
            break;
          case "i":
            e.preventDefault();
            setLocation("/ide");
            break;
          case "n":
            e.preventDefault();
            setLocation("/projects/new");
            break;
          case "b":
            e.preventDefault();
            setLocation("/blueprints");
            break;
          case ",":
            e.preventDefault();
            setLocation("/settings");
            break;
          case "k":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("nexora:open-search"));
            break;
          case "/":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("nexora:toggle-ai-panel"));
            break;
          case "s":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("nexora:save-code"));
            break;
          case "[":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("nexora:toggle-left-panel"));
            break;
          case "l":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("nexora:toggle-library-tab"));
            break;
        }
      }

      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "c":
            e.preventDefault();
            document.dispatchEvent(new CustomEvent("nexora:copy-code"));
            break;
          case "f":
            e.preventDefault();
            break;
        }
      }

      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("nexora:complete-step"));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation]);
}
