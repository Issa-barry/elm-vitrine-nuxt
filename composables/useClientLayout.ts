type ClientMenuMode = "static" | "overlay";

type ClientLayoutConfig = {
  preset: "Aura" | "Lara" | "Nora";
  primary: string;
  surface: string | null;
  darkTheme: boolean;
  menuMode: ClientMenuMode;
};

type ClientLayoutState = {
  staticMenuInactive: boolean;
  overlayMenuActive: boolean;
  mobileMenuActive: boolean;
  configMenuVisible: boolean;
  topbarMenuVisible: boolean;
  // Indépendant de configMenuVisible/topbarMenuVisible (chantier "centre de
  // notifications" du 27/08/2026, demande explicite : Notifications et
  // Profil doivent rester deux fonctionnalités indépendantes) — jamais
  // fermé en même temps que les deux autres par toggleConfigMenu/
  // toggleTopbarMenu, seulement par closeOverlays() (navigation, Escape,
  // clic extérieur).
  notificationsMenuVisible: boolean;
};

export function useClientLayout() {
  const config = useState<ClientLayoutConfig>("elm-client-config", () => ({
    preset: "Aura",
    primary: "blue",
    surface: null,
    darkTheme: false,
    menuMode: "static",
  }));

  const state = useState<ClientLayoutState>("elm-client-layout", () => ({
    staticMenuInactive: false,
    overlayMenuActive: false,
    mobileMenuActive: false,
    configMenuVisible: false,
    topbarMenuVisible: false,
    notificationsMenuVisible: false,
  }));

  const isDarkTheme = computed(() => config.value.darkTheme);
  const isDesktop = () => import.meta.client && window.innerWidth > 991;

  const toggleMenu = () => {
    if (!isDesktop()) {
      state.value.mobileMenuActive = !state.value.mobileMenuActive;
      return;
    }

    if (config.value.menuMode === "overlay") {
      state.value.overlayMenuActive = !state.value.overlayMenuActive;
      return;
    }

    state.value.staticMenuInactive = !state.value.staticMenuInactive;
  };

  const executeDarkModeToggle = () => {
    config.value.darkTheme = !config.value.darkTheme;

    if (import.meta.client) {
      document.documentElement.classList.toggle("app-dark", config.value.darkTheme);
    }
  };

  const toggleDarkMode = () => {
    if (!import.meta.client) return;

    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    };

    if (!transitionDocument.startViewTransition) {
      executeDarkModeToggle();
      return;
    }

    transitionDocument.startViewTransition(executeDarkModeToggle);
  };

  const toggleConfigMenu = () => {
    state.value.configMenuVisible = !state.value.configMenuVisible;
    state.value.topbarMenuVisible = false;
  };

  const toggleTopbarMenu = () => {
    state.value.topbarMenuVisible = !state.value.topbarMenuVisible;
    state.value.configMenuVisible = false;
  };

  const toggleNotificationsMenu = () => {
    state.value.notificationsMenuVisible = !state.value.notificationsMenuVisible;
  };

  const changeMenuMode = (menuMode: ClientMenuMode) => {
    config.value.menuMode = menuMode;
    state.value.staticMenuInactive = false;
    state.value.overlayMenuActive = false;
    state.value.mobileMenuActive = false;
  };

  const closeOverlays = () => {
    state.value.overlayMenuActive = false;
    state.value.mobileMenuActive = false;
    state.value.configMenuVisible = false;
    state.value.topbarMenuVisible = false;
    state.value.notificationsMenuVisible = false;
  };

  return {
    config,
    state,
    isDarkTheme,
    isDesktop,
    toggleMenu,
    toggleDarkMode,
    toggleConfigMenu,
    toggleTopbarMenu,
    toggleNotificationsMenu,
    changeMenuMode,
    closeOverlays,
  };
}
