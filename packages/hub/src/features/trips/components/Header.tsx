import AppSectionHeader from "@/components/AppSectionHeader";
import { Compass } from "lucide-react";

export function Header() {
  return (
    <>
      <AppSectionHeader
        title="Journey Book"
        icon={Compass}
        backTo="/"
        backLabel="Back to projects"
      />
      <div className="h-16" aria-hidden="true" />
    </>
  );
}
