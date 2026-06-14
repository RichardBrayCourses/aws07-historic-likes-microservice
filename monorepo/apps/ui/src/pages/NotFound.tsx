import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="max-w-5xl mx-auto p-4 pt-0">
      <div className="border rounded-lg bg-card shadow p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">404</p>
        <h1 className="text-lg font-semibold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-6">
          The page you are looking for does not exist.
        </p>
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
