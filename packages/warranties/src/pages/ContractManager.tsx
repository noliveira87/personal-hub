import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileCheck2 } from "lucide-react";

const ContractManager = () => {
  const contractManagerUrl = `${window.location.protocol}//${window.location.hostname}:8083`;

  useEffect(() => {
    window.location.replace(contractManagerUrl);
  }, [contractManagerUrl]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-2xl px-4 py-10">
        <Card className="w-full">
          <CardHeader>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <FileCheck2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>D12 Contracts</CardTitle>
            <CardDescription>Opening D12 Contracts...</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              If not redirected automatically,{" "}
              <a href={contractManagerUrl} className="underline hover:text-primary">
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

export default ContractManager;
