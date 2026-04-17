import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { ArrowUpRight, Building2, ChartLine, Coins, Eye, EyeOff, FileCheck2, HeartPulse, House, Map, Moon, Settings, ShieldCheck, Sun, UtensilsCrossed } from "lucide-react";
import { useDarkMode } from '@shared-ui/use-dark-mode';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const projectDefinitions = [
  { key: "homeExpenses", to: "/home-expenses", icon: House },
  { key: "portfolio", to: "/portfolio", icon: ChartLine },
	{ key: "cashbackHero", to: "/cashback-hero", icon: Coins },
	{ key: "propertyDeals", to: "/property-deals", icon: Building2 },
  { key: "trips", to: "/trips", icon: Map },
	{ key: "journeyBites", to: "/journey-bites", icon: UtensilsCrossed },
	{ key: "health", to: "/health", icon: HeartPulse },
  { key: "contracts", to: "/dashboard", icon: FileCheck2 },
  { key: "warranties", to: "/warranties", icon: ShieldCheck },
] as const;

const managementCardStyles = {
	homeExpenses: "border-emerald-500/35 bg-[radial-gradient(circle_at_15%_15%,hsl(160_84%_39%/0.18),transparent_45%),linear-gradient(150deg,hsl(var(--card)),hsl(var(--background)))]",
	portfolio: "border-sky-500/35 bg-[radial-gradient(circle_at_18%_20%,hsl(200_98%_39%/0.2),transparent_46%),linear-gradient(150deg,hsl(var(--card)),hsl(var(--background)))]",
	cashbackHero: "border-lime-500/35 bg-[radial-gradient(circle_at_18%_20%,hsl(88_65%_52%/0.2),transparent_46%),linear-gradient(150deg,hsl(var(--card)),hsl(var(--background)))]",
	propertyDeals: "border-indigo-500/35 bg-[radial-gradient(circle_at_18%_20%,hsl(231_84%_60%/0.18),transparent_46%),linear-gradient(150deg,hsl(var(--card)),hsl(var(--background)))]",
	contracts: "border-amber-500/35 bg-[radial-gradient(circle_at_15%_15%,hsl(35_92%_50%/0.2),transparent_45%),linear-gradient(150deg,hsl(var(--card)),hsl(var(--background)))]",
	warranties: "border-rose-500/35 bg-[radial-gradient(circle_at_18%_20%,hsl(352_83%_58%/0.18),transparent_46%),linear-gradient(150deg,hsl(var(--card)),hsl(var(--background)))]",
} as const;

const Index = () => {
	const { t, hideAmounts, language, setLanguage, toggleHideAmounts } = useI18n();
	const { isDark, toggleDark } = useDarkMode();

	const projects = projectDefinitions.map((project) => ({
	  ...project,
	  title: t(`index.projects.${project.key}.title`),
	  subtitle: t(`index.projects.${project.key}.subtitle`),
	}));

	const managementSectionTitle = t("index.sections.management.title").trim();
	const managementSectionDescription = t("index.sections.management.description").trim();
	const hasManagementSectionHeader = Boolean(managementSectionTitle || managementSectionDescription);
	const personalSectionDescription = t("index.sections.personal.description").trim();

	const personalProjects = projects.filter((project) => project.key === "trips" || project.key === "journeyBites" || project.key === "health");
	const managementProjects = projects.filter((project) => project.key !== "trips" && project.key !== "journeyBites" && project.key !== "health");

	return (
	<main className="relative min-h-screen overflow-hidden bg-background">
		<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,hsl(var(--primary)/0.12),transparent_28%),radial-gradient(circle_at_88%_20%,hsl(var(--accent)/0.14),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]" />
		<div className="fixed right-4 top-4 z-40 flex items-center gap-2">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-card/90" aria-label={t("common.settings")}>
						<Settings className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-72">
					<div className="px-2 py-3">
						<p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t('common.language')}</p>
						<div className="flex gap-2">
							<Badge
								variant={language === 'pt' ? 'default' : 'outline'}
								className="cursor-pointer transition-all"
								onClick={() => setLanguage('pt')}
							>
								{t('common.portuguese')}
							</Badge>
							<Badge
								variant={language === 'en' ? 'default' : 'outline'}
								className="cursor-pointer transition-all"
								onClick={() => setLanguage('en')}
							>
								{t('common.english')}
							</Badge>
						</div>
					</div>

					<DropdownMenuSeparator />

					<div className="px-2 py-3 flex items-center justify-between">
						<div className="flex items-center gap-2">
							{isDark ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
							<label htmlFor="index-theme-switch" className="text-sm font-medium cursor-pointer">
								{isDark ? t('common.darkMode') : t('common.lightMode')}
							</label>
						</div>
						<Switch id="index-theme-switch" checked={isDark} onCheckedChange={toggleDark} />
					</div>

					<DropdownMenuSeparator />

					<div className="px-2 py-3 flex items-center justify-between">
						<div className="flex items-center gap-2">
							{hideAmounts ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
							<label htmlFor="index-amounts-switch" className="text-sm font-medium cursor-pointer">
								{hideAmounts ? t('common.hideAmounts') : t('common.showAmounts')}
							</label>
						</div>
						<Switch id="index-amounts-switch" checked={hideAmounts} onCheckedChange={toggleHideAmounts} />
					</div>

					<DropdownMenuSeparator />

					<DropdownMenuItem asChild>
						<Link to="/settings" state={{ fromPath: '/' }} aria-label={t("index.openSettings")}>
							<Settings className="h-4 w-4 mr-2" />
							<span>{t('settingsPage.title')}</span>
						</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>

		<section className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 pt-14 pb-8 sm:px-6 sm:py-10">
			<div className="w-full">
				{/* D12 Couple Illustration */}
				<div className="mb-2 flex justify-center sm:mb-4">
					<div className="relative inline-flex items-center justify-center">
						<div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/12 blur-3xl" />
						<img
							src="/d12-new.png"
							alt={t("index.heroAlt")}
							className="h-auto w-full max-w-[11.5rem] object-contain object-center sm:max-w-[20rem]"
						/>
					</div>
				</div>

				<div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
					<div className="relative overflow-hidden rounded-[1.2rem_2.4rem_1.2rem_2.4rem] border border-border/70 bg-card/85 p-4 shadow-xl sm:p-6">
						<div className="pointer-events-none absolute -right-10 top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
						{hasManagementSectionHeader ? (
							<div className="mb-3 sm:mb-4">
								{managementSectionTitle ? (
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">{managementSectionTitle}</p>
								) : null}
								{managementSectionDescription ? (
									<p className="mt-1 text-sm text-muted-foreground">{managementSectionDescription}</p>
								) : null}
							</div>
						) : null}

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
							{managementProjects.map((project) => {
								const Icon = project.icon;

								return (
									<Button
										key={project.to}
										asChild
										variant="ghost"
										className={`group h-auto w-full justify-start rounded-[1.4rem_0.8rem_1.4rem_0.8rem] border px-4 py-3 text-left text-foreground shadow-sm transition-all hover:-translate-y-1 hover:shadow-md sm:px-5 sm:py-4 ${managementCardStyles[project.key as keyof typeof managementCardStyles] ?? "border-border/70 bg-background/65"}`}
									>
										<Link to={project.to} aria-label={t("index.openProject", { title: project.title })}>
											<div className="flex w-full items-center justify-between gap-4">
												<div className="space-y-1">
													<p className="text-base font-semibold text-foreground sm:text-lg">{project.title}</p>
													<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{project.subtitle}</p>
												</div>
												<div className="flex items-center gap-2">
													<div className="flex h-11 w-11 items-center justify-center rounded-[0.9rem_0.55rem_0.9rem_0.55rem] bg-primary/90 text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105 sm:h-12 sm:w-12">
														<Icon className="h-5 w-5 sm:h-6 sm:w-6" />
													</div>
													<ArrowUpRight className="h-4 w-4 text-primary/80 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
												</div>
											</div>
										</Link>
									</Button>
								);
							})}
						</div>
					</div>

					<div className="relative overflow-hidden rounded-[2.4rem_1.2rem_2.4rem_1.2rem] border border-primary/35 bg-gradient-to-br from-primary/22 via-primary/10 to-card p-4 shadow-2xl ring-1 ring-primary/20 sm:p-6">
						<div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />
						<div className="pointer-events-none absolute -bottom-8 -left-10 h-28 w-28 rounded-full bg-accent/30 blur-2xl" />
						<div className="mb-3 sm:mb-4">
							<p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-primary/80 sm:text-sm">{t("index.sections.personal.title")}</p>
							{personalSectionDescription ? (
								<p className="mt-1 text-sm text-muted-foreground">{personalSectionDescription}</p>
							) : null}
						</div>

						<div className="space-y-3 sm:space-y-4">
							{personalProjects.map((project) => {
								const Icon = project.icon;

								return (
									<Button
										key={project.to}
										asChild
										variant="ghost"
										className="group h-auto w-full justify-start rounded-[1.9rem_0.9rem_1.9rem_0.9rem] border border-violet-500/35 bg-[radial-gradient(circle_at_15%_15%,hsl(262_83%_58%/0.18),transparent_45%),linear-gradient(150deg,hsl(var(--card)),hsl(var(--background)))] px-4 py-4 text-left text-foreground shadow-lg transition-all hover:-translate-y-1 hover:border-violet-500/60 hover:shadow-md sm:px-5"
									>
										<Link to={project.to} aria-label={t("index.openProject", { title: project.title })}>
											<div className="flex w-full items-center justify-between gap-4">
												<div className="space-y-1.5">
													<p className="text-lg font-semibold text-foreground sm:text-xl">{project.title}</p>
													<p className="text-xs font-medium text-muted-foreground">{project.subtitle}</p>
												</div>
												<div className="flex items-center gap-2">
													<div className="flex h-12 w-12 items-center justify-center rounded-[1rem_0.6rem_1rem_0.6rem] bg-primary text-primary-foreground shadow-md transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14">
														<Icon className="h-6 w-6 sm:h-7 sm:w-7" />
													</div>
													<ArrowUpRight className="h-4 w-4 text-primary/90 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
												</div>
											</div>
										</Link>
									</Button>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</section>
	</main>
	);
};

export default Index;
