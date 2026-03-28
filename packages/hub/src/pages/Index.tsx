import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChartLine, FileCheck2, House, Map, Moon, Settings, ShieldCheck, Sun } from "lucide-react";
import { useDarkMode } from "@shared-ui/use-dark-mode";

const projects = [
	{
		title: "Home Expenses",
		subtitle: "Expenses",
		to: "/home-expenses",
		icon: House,
	},
	{
		title: "Portfolio Tracker",
		subtitle: "Investments",
		to: "/portfolio",
		icon: ChartLine,
	},
	{
		title: "Journey Book",
		subtitle: "Trips",
		to: "/trips",
		icon: Map,
	},
	{
		title: "Contracts Manager",
		subtitle: "Renewals",
		to: "/dashboard",
		icon: FileCheck2,
	},
	{
		title: "Warranties Vault",
		subtitle: "Warranties",
		to: "/warranties",
		icon: ShieldCheck,
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
				<Link to="/settings" state={{ fromPath: '/' }} aria-label="Open settings">
					<Settings className="h-4 w-4" />
				</Link>
			</Button>
		</div>

		<section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 pt-14 pb-4 sm:px-6 sm:py-8">
			<div className="w-full">
				{/* D12 Couple Illustration */}
				<div className="mb-1 flex justify-center sm:mb-3">
					<div className="relative inline-flex items-center justify-center">
						<div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/12 blur-3xl" />
						<img
							src="/d12-new.png"
							alt="D12 Couple"
							className="h-auto w-full max-w-[11rem] object-contain object-center sm:max-w-[20rem]"
						/>
					</div>
				</div>

				<header className="mb-3 text-center sm:mb-5">
					<h1 className="text-2xl font-bold tracking-tight sm:text-4xl">D12 Projects</h1>
				</header>

				<div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
					{projects.map((project) => {
						const Icon = project.icon;

						return (
							<div key={project.to} className="text-center">
								<Button
									asChild
									variant="ghost"
									className="group h-auto w-full justify-start rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-card px-4 py-3 text-left text-foreground shadow-xl ring-1 ring-primary/20 transition-all hover:-translate-y-1 hover:border-primary/50 hover:from-primary/25 hover:via-primary/15 hover:shadow-2xl sm:px-6 sm:py-5"
								>
									<Link to={project.to} aria-label={`Open ${project.title}`}>
										<div className="flex w-full items-center justify-between gap-4">
											<div className="space-y-1">
												<p className="text-base font-semibold text-foreground sm:text-lg">{project.title}</p>
												<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{project.subtitle}</p>
											</div>
											<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md transition-transform duration-200 group-hover:scale-110 sm:h-14 sm:w-14">
												<Icon className="h-6 w-6 sm:h-7 sm:w-7" />
											</div>
										</div>
									</Link>
								</Button>
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
