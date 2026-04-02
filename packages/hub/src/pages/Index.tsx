import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { ChartLine, Eye, EyeOff, FileCheck2, House, Map, Moon, Settings, ShieldCheck, Sun } from "lucide-react";
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
  { key: "trips", to: "/trips", icon: Map },
  { key: "contracts", to: "/dashboard", icon: FileCheck2 },
  { key: "warranties", to: "/warranties", icon: ShieldCheck },
] as const;

const Index = () => {
	const { t, hideAmounts, language, setLanguage, toggleHideAmounts } = useI18n();
	const { isDark, toggleDark } = useDarkMode();

	const projects = projectDefinitions.map((project) => ({
	  ...project,
	  title: t(`index.projects.${project.key}.title`),
	  subtitle: t(`index.projects.${project.key}.subtitle`),
	}));

	return (
	<main className="min-h-screen bg-background">
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

		<section className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 pt-14 pb-4 sm:px-6 sm:py-8">
			<div className="w-full">
				{/* D12 Couple Illustration */}
				<div className="mb-1 flex justify-center sm:mb-3">
					<div className="relative inline-flex items-center justify-center">
						<div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/12 blur-3xl" />
						<img
							src="/d12-new.png"
							alt={t("index.heroAlt")}
							className="h-auto w-full max-w-[11rem] object-contain object-center sm:max-w-[20rem]"
						/>
					</div>
				</div>

				<header className="mb-3 text-center sm:mb-5">
					<h1 className="text-2xl font-bold tracking-tight sm:text-4xl">{t("index.title")}</h1>
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
									<Link to={project.to} aria-label={t("index.openProject", { title: project.title })}>
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
