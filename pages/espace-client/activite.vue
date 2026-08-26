<script setup lang="ts">
import QrcodeVue from "qrcode.vue";
import type { ActivityType, ClientActivityItem } from "~/config/clientActivity";
import { activityTypeLabel } from "~/config/clientActivity";

definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Activité — Eau La Maman" });

const { response, isLoading, error, hasLoaded, fetchActivity } = useClientActivity();
const { vehicles: ownedVehicles, fetchVehicles } = useClientVehicles();

interface ActivityFiltersState {
  type: "" | ActivityType;
  vehiculeId: string;
  date: string;
}

const createEmptyFilters = (): ActivityFiltersState => ({ type: "", vehiculeId: "", date: "" });

const search = ref("");
const filterPanelVisible = ref(false);
const appliedFilters = reactive<ActivityFiltersState>(createEmptyFilters());
const draftFilters = reactive<ActivityFiltersState>(createEmptyFilters());

// `statut` volontairement absent de ces filtres : le backend l'exige
// accompagné de `type` avec deux vocabulaires distincts (vente/logistique) —
// voir config/clientActivity.ts pour le détail de cette limitation assumée.
async function loadActivity() {
  await fetchActivity({
    type: appliedFilters.type || undefined,
    vehicule_id: appliedFilters.vehiculeId || undefined,
    date_debut: appliedFilters.date || undefined,
    date_fin: appliedFilters.date || undefined,
    per_page: 50,
  });
}

onMounted(() => {
  loadActivity();
  fetchVehicles();
});

watch(appliedFilters, loadActivity);

const typeOptions = [
  { label: "Tous les types", value: "" },
  { label: activityTypeLabel("vente"), value: "vente" },
  { label: activityTypeLabel("logistique"), value: "logistique" },
];
const vehiculeOptions = computed(() => [
  { label: "Tous les véhicules", value: "" },
  ...ownedVehicles.value.map((vehicle) => ({ label: `${vehicle.nom} · ${vehicle.immatriculation}`, value: vehicle.id })),
]);

const items = computed(() => response.value?.data ?? []);
const normalizeText = (value: string) => value.trim().toLocaleLowerCase("fr");

// Recherche texte : uniquement sur le lot déjà chargé (pas un paramètre
// backend, voir docs/api-espace-client-contract.md §5 — aucun `q` documenté
// sur cet endpoint) : narrows visuellement la page courante, ne remplace pas
// les vrais filtres (type/véhicule/date) ci-dessus.
const filteredItems = computed(() => {
  const query = normalizeText(search.value);
  if (!query) return items.value;
  return items.value.filter((item) =>
    normalizeText(item.reference).includes(query)
    || (item.vehicule && normalizeText(item.vehicule.nom_vehicule).includes(query))
    || (item.vehicule && normalizeText(item.vehicule.immatriculation).includes(query)),
  );
});

// Regroupement chronologique — parsé en UTC pour éviter tout décalage de
// fuseau horaire sur des dates stockées au format YYYY-MM-DD sans heure.
const parseUtcDate = (value: string) => new Date(`${value}T00:00:00Z`);
const utcDayNumber = (date: Date) => Math.floor(date.getTime() / 86_400_000);
const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const weekdayDateFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthYearFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

const groupLabelForDate = (value: string, today: Date, todayDayNumber: number) => {
  const date = parseUtcDate(value);
  const diffDays = todayDayNumber - utcDayNumber(date);

  if (diffDays === 0) return "Aujourd’hui";
  if (diffDays === 1) return "Hier";

  const sameMonth = date.getUTCFullYear() === today.getUTCFullYear() && date.getUTCMonth() === today.getUTCMonth();
  return sameMonth ? capitalizeFirst(weekdayDateFormatter.format(date)) : capitalizeFirst(monthYearFormatter.format(date));
};

const groupedItems = computed(() => {
  const today = parseUtcDate(new Date().toISOString().slice(0, 10));
  const todayDayNumber = utcDayNumber(today);

  const groups: Array<{ label: string; items: ClientActivityItem[] }> = [];
  for (const item of filteredItems.value) {
    const label = groupLabelForDate(item.date, today, todayDayNumber);
    const currentGroup = groups[groups.length - 1];

    if (currentGroup && currentGroup.label === label) {
      currentGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
});

const selectedItem = ref<ClientActivityItem | null>(null);
const detailVisible = ref(false);
const lastTrigger = ref<HTMLElement | null>(null);

const openDetail = (item: ClientActivityItem, event: MouseEvent) => {
  lastTrigger.value = event.currentTarget as HTMLElement;
  selectedItem.value = item;
  detailVisible.value = true;
};

const resultLabel = computed(() => {
  const count = filteredItems.value.length;
  return `${count} ${count > 1 ? "opérations" : "opération"}`;
});

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${value}T00:00:00Z`));

const activeFilters = computed(() => {
  // Le libellé du véhicule vient de vehiculeOptions (useClientVehicles()) :
  // si le filtre est appliqué avant la fin du chargement des véhicules, le
  // libellé retombe sur l'id brut plutôt que de masquer un filtre pourtant
  // bien actif.
  const vehiculeLabel = appliedFilters.vehiculeId
    ? vehiculeOptions.value.find((o) => o.value === appliedFilters.vehiculeId)?.label || appliedFilters.vehiculeId
    : "";
  const filters: Array<{ key: keyof ActivityFiltersState; label: string; value: string }> = [
    { key: "type", label: "Type", value: appliedFilters.type ? activityTypeLabel(appliedFilters.type) : "" },
    { key: "vehiculeId", label: "Véhicule", value: vehiculeLabel },
    { key: "date", label: "Date", value: appliedFilters.date ? formatDate(appliedFilters.date) : "" },
  ];
  return filters.filter((filter) => Boolean(filter.value));
});
const activeFilterCount = computed(() => activeFilters.value.length);

const openFilterPanel = () => {
  Object.assign(draftFilters, appliedFilters);
  filterPanelVisible.value = true;
};
const applyFilters = () => {
  Object.assign(appliedFilters, draftFilters);
  filterPanelVisible.value = false;
};
const resetDraftFilters = () => Object.assign(draftFilters, createEmptyFilters());
const removeFilter = (key: keyof ActivityFiltersState) => { (appliedFilters as ActivityFiltersState)[key] = "" as never; };
const clearAppliedFilters = () => Object.assign(appliedFilters, createEmptyFilters());
const resetAllFilters = () => { search.value = ""; clearAppliedFilters(); };

// Sévérité purement présentationnelle, dérivée du texte réel de `statut`
// (jamais une valeur inventée) : les deux modèles (vente/logistique) ont des
// vocabulaires distincts et ouverts (voir config/clientActivity.ts), ce
// mapping se contente de reconnaître des motifs usuels sans prétendre
// couvrir tous les statuts possibles — repli neutre (info) sinon.
const severity = (statut: string): "success" | "info" | "danger" => {
  if (/livre|cloture|termine/.test(statut)) return "success";
  if (/annule|rejete|litige/.test(statut)) return "danger";
  return "info";
};
</script>

<template>
  <div>
  <section class="client-mobile-deliveries" aria-labelledby="mobile-deliveries-title">
    <ClientMobilePageTopbar
      title="Activité"
      title-id="mobile-deliveries-title"
      filter-label="Filtrer l’activité"
      :filter-count="activeFilterCount"
      @filter="openFilterPanel"
    />
    <p class="client-mobile-page-intro">Retrouvez vos commandes et transferts logistiques.</p>

    <div v-if="error" class="p-4 text-red-500" role="alert">{{ error.message }}</div>

    <template v-else>
      <div class="client-mobile-deliveries__toolbar is-search-only">
        <label class="client-mobile-deliveries__search">
          <i class="pi pi-search" aria-hidden="true" />
          <span class="sr-only">Rechercher une opération</span>
          <input v-model="search" type="search" inputmode="search" placeholder="Référence ou véhicule" autocomplete="off">
          <button v-if="search" type="button" aria-label="Effacer la recherche" @click="search = ''">
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </label>
      </div>

      <div v-if="activeFilters.length" class="client-delivery-active-filters" aria-label="Filtres actifs">
        <button v-for="filter in activeFilters" :key="filter.key" type="button" :aria-label="`Retirer le filtre ${filter.label} : ${filter.value}`" @click="removeFilter(filter.key)">
          <span>{{ filter.label }} : {{ filter.value }}</span>
          <i class="pi pi-times" aria-hidden="true" />
        </button>
        <button type="button" class="is-reset" @click="clearAppliedFilters">Tout effacer</button>
      </div>

      <div class="client-mobile-deliveries__list-heading">
        <h2>Opérations</h2>
        <span>{{ isLoading && !hasLoaded ? "…" : resultLabel }}</span>
      </div>

      <section v-if="isLoading && !hasLoaded" class="p-4 text-muted-color" role="status">Chargement de l’activité…</section>

      <template v-else-if="filteredItems.length">
        <template v-for="group in groupedItems" :key="group.label">
          <div class="client-delivery-group-heading">
            <h3>{{ group.label }}</h3>
            <span>{{ group.items.length }}</span>
          </div>
          <div class="client-mobile-deliveries__list">
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="client-mobile-deliveries__card"
              aria-haspopup="dialog"
              :aria-label="`${item.reference}, ${item.statut_label}. Voir les détails.`"
              @click="openDetail(item, $event)"
            >
              <span class="client-mobile-deliveries__package" aria-hidden="true"><i class="pi pi-box" /></span>
              <div class="client-mobile-deliveries__details">
                <strong>{{ item.reference }}</strong>
                <span v-if="item.vehicule"><i class="pi pi-car" aria-hidden="true" /> {{ item.vehicule.nom_vehicule }} {{ item.vehicule.immatriculation }}</span>
              </div>
              <Tag :value="item.statut_label" :severity="severity(item.statut)" />
              <i class="pi pi-chevron-right client-mobile-deliveries__chevron" aria-hidden="true" />
            </button>
          </div>
        </template>
      </template>

      <div v-else class="client-mobile-deliveries__empty" role="status">
        <span aria-hidden="true"><i class="pi pi-inbox" /></span>
        <strong>Aucune opération trouvée</strong>
        <p>Modifiez votre recherche ou vos filtres.</p>
        <button type="button" @click="resetAllFilters">Réinitialiser</button>
      </div>
    </template>
  </section>

  <section class="client-desktop-deliveries" aria-labelledby="desktop-deliveries-title">
    <div class="mb-6">
      <h1 id="desktop-deliveries-title" class="text-3xl font-semibold mb-2">Activité</h1>
      <p class="text-muted-color m-0">Retrouvez vos commandes et transferts logistiques.</p>
    </div>

    <div v-if="error" class="card text-red-500" role="alert">{{ error.message }}</div>

    <div v-else class="card">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 class="font-semibold text-xl m-0">Opérations</h2>
          <span class="text-muted-color text-sm">{{ isLoading && !hasLoaded ? "…" : resultLabel }}</span>
        </div>
        <div class="flex gap-2 w-full sm:w-auto">
          <IconField class="flex-1 sm:w-64">
            <InputIcon class="pi pi-search" />
            <InputText v-model="search" class="w-full" placeholder="Référence ou véhicule" />
          </IconField>
          <Button label="Filtres" icon="pi pi-sliders-h" severity="secondary" outlined :badge="activeFilterCount ? String(activeFilterCount) : undefined" @click="openFilterPanel" />
        </div>
      </div>

      <div v-if="activeFilters.length" class="client-delivery-active-filters mb-5" aria-label="Filtres actifs">
        <button v-for="filter in activeFilters" :key="filter.key" type="button" :aria-label="`Retirer le filtre ${filter.label} : ${filter.value}`" @click="removeFilter(filter.key)">
          <span>{{ filter.label }} : {{ filter.value }}</span>
          <i class="pi pi-times" aria-hidden="true" />
        </button>
        <button type="button" class="is-reset" @click="clearAppliedFilters">Tout effacer</button>
      </div>

      <DataTable v-if="filteredItems.length" :value="filteredItems" data-key="id" paginator :rows="10" responsive-layout="scroll" striped-rows>
        <Column field="reference" header="Référence" sortable />
        <Column header="Type"><template #body="{ data }">{{ activityTypeLabel(data.type) }}</template></Column>
        <Column header="Véhicule"><template #body="{ data }">{{ data.vehicule ? `${data.vehicule.nom_vehicule} ${data.vehicule.immatriculation}` : "—" }}</template></Column>
        <Column header="Date" field="date" sortable><template #body="{ data }">{{ formatDate(data.date) }}</template></Column>
        <Column header="Statut"><template #body="{ data }"><Tag :value="data.statut_label" :severity="severity(data.statut)" /></template></Column>
      </DataTable>

      <div v-else-if="!(isLoading && !hasLoaded)" class="flex flex-col items-center justify-center text-center py-12" role="status">
        <i class="pi pi-inbox text-muted-color !text-3xl mb-3" aria-hidden="true" />
        <strong class="text-lg">Aucune opération trouvée</strong>
        <p class="text-muted-color mt-2 mb-4">Modifiez votre recherche ou vos filtres.</p>
        <Button label="Réinitialiser" severity="secondary" outlined @click="resetAllFilters" />
      </div>
    </div>
  </section>

  <Drawer
    v-model:visible="filterPanelVisible"
    position="right"
    modal
    dismissable
    close-on-escape
    block-scroll
    header="Filtrer l’activité"
    class="client-delivery-filter-drawer"
  >
    <form id="client-delivery-filter-form" class="client-delivery-filter" @submit.prevent="applyFilters">
      <p>Affinez la liste avec un ou plusieurs critères.</p>
      <div class="client-delivery-filter__grid">
        <label class="client-delivery-filter__field">
          <span>Type</span>
          <Select v-model="draftFilters.type" :options="typeOptions" option-label="label" option-value="value" fluid />
        </label>
        <label class="client-delivery-filter__field">
          <span>Véhicule</span>
          <Select v-model="draftFilters.vehiculeId" :options="vehiculeOptions" option-label="label" option-value="value" fluid />
        </label>
        <label class="client-delivery-filter__field">
          <span>Date</span>
          <input v-model="draftFilters.date" type="date" class="client-delivery-filter__date">
        </label>
      </div>
    </form>
    <template #footer>
      <div class="client-delivery-filter__actions">
        <Button type="button" label="Réinitialiser" severity="secondary" text @click="resetDraftFilters" />
        <Button type="submit" form="client-delivery-filter-form" label="Appliquer" />
      </div>
    </template>
  </Drawer>

  <Drawer
    v-model:visible="detailVisible"
    position="bottom"
    modal
    dismissable
    close-on-escape
    block-scroll
    :show-close-icon="false"
    class="client-delivery-detail-drawer"
    @hide="lastTrigger?.focus()"
  >
    <template #header>
      <div class="client-delivery-detail-header">
        <span class="client-delivery-detail-handle" aria-hidden="true" />
        <button type="button" class="client-delivery-detail-close" aria-label="Fermer les détails de l’opération" @click="detailVisible = false">
          <i class="pi pi-times" />
        </button>
      </div>
    </template>

    <div v-if="selectedItem" class="client-delivery-detail">
      <div class="client-delivery-detail__top">
        <strong>{{ selectedItem.reference }}</strong>
        <Tag :value="selectedItem.statut_label" :severity="severity(selectedItem.statut)" />
      </div>

      <div class="client-delivery-detail__qr">
        <QrcodeVue :value="selectedItem.reference" :size="176" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
        <span class="client-delivery-detail__qr-hint">Scannez pour identifier l’opération</span>
        <span class="client-delivery-detail__qr-ref">{{ selectedItem.reference }}</span>
      </div>

      <div class="client-delivery-detail__rows">
        <div class="client-delivery-detail__row">
          <span>Type</span>
          <strong>{{ activityTypeLabel(selectedItem.type) }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Date</span>
          <strong>{{ formatDate(selectedItem.date) }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Origine</span>
          <strong>{{ selectedItem.site_source }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Destination</span>
          <strong>{{ selectedItem.site_destination }}</strong>
        </div>
        <div v-if="selectedItem.vehicule" class="client-delivery-detail__row">
          <span>Véhicule</span>
          <strong>{{ selectedItem.vehicule.nom_vehicule }} · {{ selectedItem.vehicule.immatriculation }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Nombre de packs</span>
          <strong>{{ formatNumber(selectedItem.nb_packs) }}</strong>
        </div>
      </div>
    </div>
  </Drawer>
  </div>
</template>
