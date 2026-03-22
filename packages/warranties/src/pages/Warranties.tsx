import { WarrantyApp } from "@/components/WarrantyApp";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Warranties = () => (
	<div>
		<div className="mx-auto max-w-lg px-4 pt-3">
			<Button asChild size="sm" variant="outline" className="rounded-full">
				<Link to="/" className="gap-1.5">
					<ArrowLeft className="h-4 w-4" />
					<span className="hidden sm:inline">Back to projects</span>
				</Link>
			</Button>
		</div>
		<WarrantyApp />
	</div>
);

export default Warranties;
