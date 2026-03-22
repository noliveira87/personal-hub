import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartLine } from "lucide-react";

const PortfolioTracker = () => {
  useEffect(() => {
    // Redirect to portfolio immediately
    // Note: Portfolio app runs on 8080, dashboard on 8081
    window.location.replace("http://localhost:8080");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-2xl px-4 py-10">
        <Card className="w-full">
          <CardHeader>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <ChartLine className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Portfolio Tracker</CardTitle>
            <CardDescription>Opening your portfolio...</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              If not redirected automatically,{" "}
              <a href="http://localhost:8080" className="underline hover:text-primary">
                click here
              </a>
              .
            </p>
            <Button asChild variant="outline">
              <Link to="/">Back to projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortfolioTracker;
