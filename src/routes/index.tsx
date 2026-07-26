import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const TITLE = "PrepDeck — Placement Preparation Portal";
const DESC =
  "Track placement mock tests, average scores, strong and weak topics, and recent activity in one modern dashboard.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    window.location.replace("/portal/index.html");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">
        Loading PrepDeck… <a className="underline" href="/portal/index.html">continue</a>
      </p>
    </div>
  );
}
