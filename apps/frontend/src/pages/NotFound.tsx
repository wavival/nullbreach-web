import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

export function NotFound() {
  usePageTitle("404");
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-foreground-muted">Page not found</p>
      <Button asChild>
        <Link to="/">Home</Link>
      </Button>
    </div>
  );
}
