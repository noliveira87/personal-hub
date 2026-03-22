import { WarrantyApp } from "@/components/WarrantyApp";
import { useEffect } from "react";

const Warranties = () => {
	useEffect(() => {
		document.title = "D12 Warranties";
	}, []);

	return <WarrantyApp />;
};

export default Warranties;
