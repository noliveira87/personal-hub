import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChartLine, FileCheck2, House, Moon, ShieldCheck, Sun } from "lucide-react";
import { useEffect } from "react";
import { useDarkMode } from "@shared-ui/use-dark-mode";
import d12NewImage from "@shared-ui/assets/d12-new.png";

const projects = [
	{
		title: "Warranty Vault",
		subtitle: "Warranties",
		to: "/warranties",
		icon: ShieldCheck,
	},
	{
		title: "Portfolio Tracker",
		subtitle: "Investments",
		to: "/portfolio-tracker",
		icon: ChartLine,
	},
	{
		title: "Home Expenses",
		subtitle: "Expenses",
		to: "/home-expenses",
		icon: House,
	},
	{
		title: "Home Contracts",
		subtitle: "Contracts",
		to: "/home-contracts",
		icon: FileCheck2,
	},
] as const;

const Index = () => {
	const { isDark, toggleDark } = useDarkMode();

	useEffect(() => {
		document.title = "D12 Hub";
	}, []);

	return (
	<main className="min-h-screen bg-background">
		<section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
			<div className="w-full">
				<div className="mb-2 flex justify-end">
					<Button variant="ghost" size="icon" onClick={toggleDark} className="text-muted-foreground">
						{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</Button>
				</div>

				{/* D12 Couple Illustration */}
				<div className="mb-2 flex justify-center sm:mb-3">
					<div className="relative flex w-full max-w-[480px] items-center justify-center px-2 py-2 sm:max-w-[620px] sm:px-4 sm:py-3">
						<div className="pointer-events-none absolute bottom-2 h-20 w-64 rounded-full bg-primary/10 blur-3xl sm:bottom-4 sm:h-28 sm:w-80" />
						<img
							src={d12NewImage}
							alt="D12 couple illustration"
							className="relative z-10 h-auto max-h-[21rem] w-auto max-w-full object-contain drop-shadow-[0_18px_30px_hsl(var(--foreground)/0.14)] sm:max-h-[26rem]"
						/>
					</div>
				</div>

				<div className="mx-auto grid max-w-md grid-cols-2 gap-x-6 gap-y-8 sm:max-w-none sm:grid-cols-4 sm:gap-x-8 sm:gap-y-10">
					{projects.map((project) => {
						const Icon = project.icon;

						return (
							<div key={project.to} className="text-center">
								<Button
									asChild
									variant="outline"
									size="icon"
									className="h-20 w-20 rounded-3xl border-border/70 bg-card text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:h-24 sm:w-24"
								>
									<Link to={project.to} aria-label={`Open ${project.title}`}>
										<Icon className="h-8 w-8 sm:h-9 sm:w-9" />
									</Link>
								</Button>
								<p className="mt-3 text-sm font-medium text-foreground">{project.title}</p>
								<p className="text-xs text-muted-foreground">{project.subtitle}</p>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	</main>
);
};

export default Index;
