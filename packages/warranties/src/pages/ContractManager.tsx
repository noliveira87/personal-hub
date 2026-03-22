import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileCheck2 } from "lucide-react";

const ContractManager = () => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto flex max-w-2xl px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <FileCheck2 className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Contract Manager</CardTitle>
          <CardDescription>
            Track active contracts and renewal dates to avoid missing deadlines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/">Back to projects</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default ContractManager;
