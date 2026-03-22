import { WarrantyApp } from "@/components/WarrantyApp";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
const Warranties = () => (
	<div>
		<div className="mx-auto max-w-lg px-4 pt-3">
			<Button 
				size="sm" 
				variant="outline" 
				className="gap-1.5"
				onClick={() => window.location.href = `${window.location.protocol}//${window.location.hostname}:8081/`}
			>
				<ArrowLeft className="h-4 w-4" />
				<span className="hidden sm:inline">Back to projects</span>
			</Button>
		</div>
		<WarrantyApp />
	</div>
);

export default Warranties;
