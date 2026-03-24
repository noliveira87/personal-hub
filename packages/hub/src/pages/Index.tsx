import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChartLine, FileCheck2, House, Moon, Settings, ShieldCheck, Sun } from "lucide-react";
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
		to: "/portfolio",
		icon: ChartLine,
	},
	{
		title: "Home Expenses",
		subtitle: "Expenses",
		to: "/home-expenses",
		icon: House,
	},
	{
		title: "Contract Manager",
		subtitle: "Renewals",
		to: "/contracts",
		icon: FileCheck2,
	},
] as const;

const Index = () => {
	const { isDark, toggleDark } = useDarkMode();

	return (
	<main className="min-h-screen bg-background">
		<div className="fixed right-4 top-4 z-40 flex items-center gap-2">
			<Button variant="outline" size="icon" onClick={toggleDark} className="h-9 w-9 rounded-lg bg-card/90">
				{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
			</Button>
			<Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-lg bg-card/90">
				<Link to="/settings" aria-label="Open settings">
					<Settings className="h-4 w-4" />
				</Link>
			</Button>
		</div>

		<section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
			<div className="w-full">
				{/* D12 Couple Illustration */}
				<div className="mb-8 flex justify-center sm:mb-10">
					<img
						src="/d12-new.png"
						alt="D12 Couple"
						className="h-auto w-full max-w-xs rounded-2xl shadow-lg dark:shadow-lg sm:max-w-sm"
					/>
				</div>

				<header className="mb-10 text-center sm:mb-12">
					<h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Projects</h1>
					<p className="mt-2 text-sm text-muted-foreground sm:text-base">App launcher</p>
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
