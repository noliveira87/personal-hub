import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChartLine, FileCheck2, House, Moon, ShieldCheck, Sun } from "lucide-react";
import { useEffect } from "react";
import { useDarkMode } from "@shared-ui/use-dark-mode";

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
		<section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
			<div className="w-full">
				{/* D12 Couple Illustration */}
				<div className="mb-6 flex justify-center sm:mb-8">
					<img
						src="/d12.jpg"
						alt="D12 Couple"
						className="h-auto max-h-44 w-auto max-w-[70vw] rounded-2xl object-contain shadow-lg sm:max-h-64 sm:max-w-xs"
					/>
				</div>

				<header className="mb-10 sm:mb-12">
					<div className="mb-4 flex justify-end">
						<Button variant="ghost" size="icon" onClick={toggleDark} className="text-muted-foreground">
							{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
						</Button>
					</div>
					<div className="text-center">
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">D12 Hub</h1>
					<p className="mt-2 text-sm text-muted-foreground sm:text-base">App launcher</p>
					</div>
				</header>

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
