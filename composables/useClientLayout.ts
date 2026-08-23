type ClientMenuMode = "static" | "overlay";

type ClientLayoutConfig = {
  darkTheme: boolean;
  menuMode: ClientMenuMode;
};

type ClientLayoutState = {
  staticMenuInactive: boolean;
  overlayMenuActive: boolean;
  mobileMenuActive: boolean;
  configMenuVisible: boolean;
  topbarMenuVisible: boolean;
};

export function useClientLayout() {
  const config = useState<ClientLayoutConfig>("elm-client-config", () => ({
    darkTheme: false,
    menuMode: "static",
  }));

  const state = useState<ClientLayoutState>("elm-client-layout", () => ({
    staticMenuInactive: false,
    overlayMenuActive: false,
    mobileMenuActive: false,
    configMenuVisible: false,
    topbarMenuVisible: false,
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

  const toggleDarkMode = () => {
    config.value.darkTheme = !config.value.darkTheme;
  };

  const toggleConfigMenu = () => {
    state.value.configMenuVisible = !state.value.configMenuVisible;
    state.value.topbarMenuVisible = false;
  };

  const toggleTopbarMenu = () => {
    state.value.topbarMenuVisible = !state.value.topbarMenuVisible;
    state.value.configMenuVisible = false;
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
    changeMenuMode,
    closeOverlays,
  };
}
