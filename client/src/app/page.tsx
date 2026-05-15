import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/25 via-transparent to-transparent dark:from-indigo-500/15" />
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <div className="glass-panel animate-fade-in rounded-2xl px-6 py-3 text-sm font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Full-stack AI notes workspace
          </span>
        </div>
        <h1 className="animate-fade-in max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          Write faster. Think clearer. Share beautifully.
        </h1>
        <p className="animate-fade-in max-w-2xl text-pretty text-lg text-muted-foreground" style={{ animationDelay: "0.05s" }}>
          Peblo Notes pairs a polished workspace with Gemini or OpenAI — summaries, action items, public links, and
          productivity insights in one place.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="animate-fade-in rounded-full px-8" style={{ animationDelay: "0.1s" }}>
            <Link href="/signup">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="animate-fade-in rounded-full px-8" style={{ animationDelay: "0.12s" }}>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
