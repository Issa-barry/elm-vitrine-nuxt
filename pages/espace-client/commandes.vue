<script setup lang="ts">
import QrcodeVue from "qrcode.vue";
import type { ActivityLien, ActivityPeriod, ActivityType, ClientActivityItem } from "~/config/clientActivity";
import {
  ACTIVITY_PERIODS,
  activityPayment,
  activityPeriodLabel,
  activityTypeLabel,
  avancementSeverity,
  lienLabel,
  liensDuCompte,
  operationBadges,
} from "~/config/clientActivity";
import type { PeriodeComptable } from "~/config/clientPeriodeComptable";
import { periodeComptableQuery } from "~/config/clientPeriodeComptable";

// Liste unique « Commandes » (ADR 0058 côté elm-monolithe) : commandes du
// client, livraisons du livreur et ventes des véhicules du propriétaire, sans
// rubrique. Le serveur décide du périmètre et des données visibles selon les
// liens du compte ; cette page ne fait que les présenter, en lecture seule.
definePageMeta({ layout: "client", middleware: "auth" });
useHead({ title: "Commandes — Eau La Maman" });

const { response, isLoading, isLoadingMore, error, loadMoreError, hasLoaded, hasMore, fetchActivity, loadMore } = useClientActivity();
const { operation, isLoading: isLoadingDetail, error: detailError, fetchOperation } = useClientOperation();
const { vehicles: ownedVehicles, fetchVehicles } = useClientVehicles();
const { periodeComptable, revenirAuMoisCourant } = useClientPeriodeComptable();
const { context } = useAuth();
const route = useRoute();

// "tous" plutôt que "" comme valeur par défaut des Select : PrimeVue affiche
// son placeholder (jamais défini ici) tant que la modelValue est vide, même
// avec une option `{ value: "" }` présente (même correctif sur depenses.vue et
// commissions.vue). Ne concerne ni `date` (input natif) ni `periode` (boutons).
const ALL = "tous";

interface ActivityFiltersState {
  type: typeof ALL | ActivityType;
  lien: typeof ALL | ActivityLien;
  vehiculeId: string;
  periode: "" | ActivityPeriod;
  date: string;
}

const createEmptyFilters = (): ActivityFiltersState => ({ type: ALL, lien: ALL, vehiculeId: ALL, periode: "", date: "" });

const search = ref("");
const filterPanelVisible = ref(false);
const appliedFilters = reactive<ActivityFiltersState>(createEmptyFilters());
const draftFilters = reactive<ActivityFiltersState>(createEmptyFilters());

// Une notification ouvre une opération qui peut dater d'un autre mois, et
// « Voir toutes les périodes » sort de la période comptable : la liste charge
// alors toutes les périodes, jusqu'à ce que l'utilisateur touche au filtre.
const toutesLesPeriodes = ref(typeof route.query.commande === "string");
const periodeComptableActive = computed(() => !toutesLesPeriodes.value && !appliedFilters.periode && !appliedFilters.date);

// Filtre par lien : seulement pour un compte qui en a au moins deux.
const liens = computed(() => liensDuCompte(context.value));
const lienOptions = computed(() => [
  { label: "Tous les liens", value: ALL },
  ...liens.value.map((lien) => ({ label: lienLabel(lien), value: lien })),
]);

async function loadActivity() {
  await fetchActivity({
    type: appliedFilters.type !== ALL ? appliedFilters.type : undefined,
    lien: appliedFilters.lien !== ALL ? appliedFilters.lien : undefined,
    vehicule_id: appliedFilters.vehiculeId !== ALL ? appliedFilters.vehiculeId : undefined,
    ...(periodeComptableActive.value ? periodeComptableQuery(periodeComptable.value) : {}),
    periode: appliedFilters.periode || undefined,
    date_debut: appliedFilters.date || undefined,
    date_fin: appliedFilters.date || undefined,
    per_page: 50,
  });
}

// Notification « commande validée » : `?commande=<id de vente>` ouvre son
// détail par la route de détail, qu'elle figure ou non dans la page chargée.
onMounted(async () => {
  const commandeId = route.query.commande;
  if (typeof commandeId === "string") openDetailById("vente", commandeId);

  await Promise.all([loadActivity(), fetchVehicles()]);
});

watch([appliedFilters, periodeComptable, toutesLesPeriodes], loadActivity);

const choisirPeriodeComptable = (periode: PeriodeComptable) => {
  periodeComptable.value = periode;
  toutesLesPeriodes.value = false;
  Object.assign(appliedFilters, { periode: "", date: "" });
};

const typeOptions = [
  { label: "Tous les types", value: ALL },
  { label: activityTypeLabel("vente"), value: "vente" },
  { label: activityTypeLabel("logistique"), value: "logistique" },
];
const vehiculeOptions = computed(() => [
  { label: "Tous les véhicules", value: ALL },
  ...ownedVehicles.value.map((vehicle) => ({ label: `${vehicle.nom} · ${vehicle.immatriculation}`, value: vehicle.id })),
]);

const items = computed(() => response.value?.data ?? []);
const normalizeText = (value: string) => value.trim().toLocaleLowerCase("fr");

// Recherche texte : uniquement sur le lot déjà chargé (aucun `q` côté
// backend) — elle resserre la page courante, sans remplacer les vrais filtres.
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

// Le détail affiche d'abord la ligne de la liste, puis ce que la route de
// détail ajoute (produits, total, contact, remise) selon les liens du compte.
const selectedItem = ref<ClientActivityItem | null>(null);
const detailVisible = ref(false);
const lastTrigger = ref<HTMLElement | null>(null);
const detail = computed(() => operation.value ?? selectedItem.value);

const openDetail = (item: ClientActivityItem, event?: MouseEvent) => {
  lastTrigger.value = (event?.currentTarget as HTMLElement) ?? null;
  selectedItem.value = item;
  detailVisible.value = true;
  fetchOperation(item.type, item.id);
};

function openDetailById(type: ActivityType, id: string) {
  selectedItem.value = null;
  detailVisible.value = true;
  fetchOperation(type, id);
}

const detailIntrouvable = computed(() => detailError.value?.status === 404);

const showLoading = computed(() => isLoading.value || !hasLoaded.value);
const resultLabel = computed(() => {
  const count = normalizeText(search.value) ? filteredItems.value.length : (response.value?.meta.total ?? 0);
  return `${formatNumber(count)} ${count > 1 ? "opérations" : "opération"}`;
});

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${value}T00:00:00Z`));

const activeFilters = computed(() => {
  // Le libellé du véhicule vient de vehiculeOptions : appliqué avant la fin du
  // chargement des véhicules, il retombe sur l'id brut plutôt que de masquer un
  // filtre pourtant actif.
  const vehiculeLabel = appliedFilters.vehiculeId !== ALL
    ? vehiculeOptions.value.find((o) => o.value === appliedFilters.vehiculeId)?.label || appliedFilters.vehiculeId
    : "";
  const filters: Array<{ key: keyof ActivityFiltersState; label: string; value: string }> = [
    { key: "type", label: "Type", value: appliedFilters.type !== ALL ? activityTypeLabel(appliedFilters.type) : "" },
    { key: "lien", label: "Lien", value: appliedFilters.lien !== ALL ? lienLabel(appliedFilters.lien) : "" },
    { key: "vehiculeId", label: "Véhicule", value: vehiculeLabel },
    { key: "periode", label: "Période", value: appliedFilters.periode ? activityPeriodLabel(appliedFilters.periode) : "" },
    { key: "date", label: "Date", value: appliedFilters.date ? formatDate(appliedFilters.date) : "" },
  ];
  return filters.filter((filter) => Boolean(filter.value));
});
const activeFilterCount = computed(() => activeFilters.value.length);

// Trois états vides : jamais aucune opération (calculé sans filtre par le
// serveur), rien sur la période comptable affichée, rien pour les filtres.
const etatVide = computed<"jamais" | "periode" | "filtres">(() => {
  if (response.value && !response.value.compte_a_des_operations) return "jamais";
  if (periodeComptableActive.value && !activeFilterCount.value && !normalizeText(search.value)) return "periode";
  return "filtres";
});

const openFilterPanel = () => {
  Object.assign(draftFilters, appliedFilters);
  filterPanelVisible.value = true;
};
const applyFilters = () => {
  Object.assign(appliedFilters, draftFilters);
  filterPanelVisible.value = false;
};
const resetDraftFilters = () => Object.assign(draftFilters, createEmptyFilters());
const removeFilter = (key: keyof ActivityFiltersState) => {
  (appliedFilters as ActivityFiltersState)[key] = (key === "date" || key === "periode" ? "" : ALL) as never;
};
// Une seule période à la fois : le backend refuse `periode` avec des dates,
// choisir l'une efface donc l'autre. Un second appui désélectionne la période.
const togglePeriod = (period: ActivityPeriod) => {
  draftFilters.periode = draftFilters.periode === period ? "" : period;
  if (draftFilters.periode) draftFilters.date = "";
};
watch(() => draftFilters.date, (date) => {
  if (date) draftFilters.periode = "";
});
const clearAppliedFilters = () => Object.assign(appliedFilters, createEmptyFilters());
const resetAllFilters = () => {
  search.value = "";
  clearAppliedFilters();
  toutesLesPeriodes.value = false;
  revenirAuMoisCourant();
};
const voirToutesLesPeriodes = () => {
  toutesLesPeriodes.value = true;
};

const cardAriaLabel = (item: ClientActivityItem) =>
  [item.reference, ...operationBadges(item), item.avancement.label, activityPayment(item)?.label].filter(Boolean).join(", ") + ". Voir les détails.";
</script>

<template>
  <div>
  <section class="client-mobile-deliveries" aria-labelledby="mobile-orders-title">
    <ClientMobilePageTopbar
      title="Commandes"
      title-id="mobile-orders-title"
      filter-label="Filtrer les commandes"
      :filter-count="activeFilterCount"
      @filter="openFilterPanel"
    />

    <ClientPeriodeComptableFilter
      :model-value="periodeComptable"
      :actif="periodeComptableActive"
      :chargement="isLoading"
      :debut="response?.filters.date_debut"
      :fin="response?.filters.date_fin"
      @update:model-value="choisirPeriodeComptable"
    />

    <div v-if="error" class="p-4 text-red-500" role="alert">
      <p class="mt-0 mb-3">{{ error.message }}</p>
      <Button label="Réessayer" severity="secondary" outlined size="small" @click="loadActivity" />
    </div>

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
        <span>{{ showLoading ? "…" : resultLabel }}</span>
      </div>

      <section v-if="showLoading" class="p-4 text-muted-color" role="status">Chargement des commandes…</section>

      <template v-else-if="filteredItems.length">
        <template v-for="group in groupedItems" :key="group.label">
          <div class="client-delivery-group-heading">
            <h3>{{ group.label }}</h3>
          </div>
          <div class="client-mobile-deliveries__list">
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="client-mobile-deliveries__card is-compact"
              aria-haspopup="dialog"
              :aria-label="cardAriaLabel(item)"
              :data-type="item.type"
              @click="openDetail(item, $event)"
            >
              <div class="client-mobile-deliveries__details">
                <strong>{{ item.reference }}</strong>
                <span class="client-orders-badges">
                  <span v-for="badge in operationBadges(item)" :key="badge" class="client-orders-badge" data-testid="badge-lien">{{ badge }}</span>
                </span>
                <span v-if="item.vehicule"><i class="pi pi-car" aria-hidden="true" /> {{ item.vehicule.nom_vehicule }} {{ item.vehicule.immatriculation }}</span>
              </div>
              <span class="client-mobile-deliveries__statuses">
                <Tag :value="item.avancement.label" :severity="avancementSeverity(item.avancement.code)" />
                <Tag v-if="activityPayment(item)" :value="activityPayment(item)!.label" :severity="activityPayment(item)!.severity" />
              </span>
            </button>
          </div>
        </template>
      </template>

      <div v-else-if="!hasMore" class="client-mobile-deliveries__empty" role="status" :data-etat="etatVide">
        <span aria-hidden="true"><i class="pi pi-inbox" /></span>
        <template v-if="etatVide === 'jamais'">
          <strong>Aucune commande pour le moment</strong>
          <p>Vos commandes, livraisons et ventes sur véhicule apparaîtront ici.</p>
        </template>
        <template v-else-if="etatVide === 'periode'">
          <strong>Aucune opération sur cette période</strong>
          <p>Vos opérations plus anciennes restent consultables.</p>
          <button type="button" @click="voirToutesLesPeriodes">Voir toutes les périodes</button>
        </template>
        <template v-else>
          <strong>Aucune opération trouvée</strong>
          <p>Modifiez votre recherche ou vos filtres.</p>
          <button type="button" @click="resetAllFilters">Réinitialiser</button>
        </template>
      </div>

      <div v-if="hasMore && !showLoading" class="client-delivery-load-more">
        <p v-if="loadMoreError" role="alert">{{ loadMoreError.message }}</p>
        <Button label="Afficher plus" severity="secondary" outlined size="small" :loading="isLoadingMore" @click="loadMore" />
      </div>
    </template>
  </section>

  <section class="client-desktop-deliveries" aria-labelledby="desktop-orders-title">
    <div class="mb-6">
      <div>
        <h1 id="desktop-orders-title" class="text-3xl font-semibold mb-2">Commandes</h1>
        <p class="text-muted-color m-0">Retrouvez vos commandes, livraisons et ventes sur véhicule.</p>
      </div>
    </div>

    <ClientPeriodeComptableFilter
      class="!mb-6"
      :model-value="periodeComptable"
      :actif="periodeComptableActive"
      :chargement="isLoading"
      :debut="response?.filters.date_debut"
      :fin="response?.filters.date_fin"
      @update:model-value="choisirPeriodeComptable"
    />

    <div v-if="error" class="card text-red-500" role="alert">
      <p class="mt-0 mb-3">{{ error.message }}</p>
      <Button label="Réessayer" severity="secondary" outlined size="small" @click="loadActivity" />
    </div>

    <div v-else class="card">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 class="font-semibold text-xl m-0">Opérations</h2>
          <span class="text-muted-color text-sm">{{ showLoading ? "…" : resultLabel }}</span>
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

      <div v-if="showLoading" class="py-12 text-center text-muted-color" role="status">Chargement des commandes…</div>

      <DataTable
        v-else-if="filteredItems.length"
        :value="filteredItems"
        data-key="id"
        paginator
        :rows="10"
        responsive-layout="scroll"
        striped-rows
        row-hover
        class="cursor-pointer"
        @row-click="openDetail($event.data)"
      >
        <Column field="reference" header="Référence" sortable />
        <Column header="Type">
          <template #body="{ data }">
            <span class="client-orders-badges">
              <span v-for="badge in operationBadges(data)" :key="badge" class="client-orders-badge">{{ badge }}</span>
            </span>
          </template>
        </Column>
        <Column header="Véhicule"><template #body="{ data }">{{ data.vehicule ? `${data.vehicule.nom_vehicule} ${data.vehicule.immatriculation}` : "—" }}</template></Column>
        <Column header="Date" field="date" sortable><template #body="{ data }">{{ formatDate(data.date) }}</template></Column>
        <Column header="Avancement"><template #body="{ data }"><Tag :value="data.avancement.label" :severity="avancementSeverity(data.avancement.code)" /></template></Column>
        <Column header="Paiement"><template #body="{ data }"><Tag v-if="activityPayment(data)" :value="activityPayment(data)!.label" :severity="activityPayment(data)!.severity" /><span v-else class="text-muted-color">—</span></template></Column>
      </DataTable>

      <div v-else-if="!hasMore" class="flex flex-col items-center justify-center text-center py-12" role="status" :data-etat="etatVide">
        <i class="pi pi-inbox text-muted-color !text-3xl mb-3" aria-hidden="true" />
        <template v-if="etatVide === 'jamais'">
          <strong class="text-lg">Aucune commande pour le moment</strong>
          <p class="text-muted-color mt-2 mb-0">Vos commandes, livraisons et ventes sur véhicule apparaîtront ici.</p>
        </template>
        <template v-else-if="etatVide === 'periode'">
          <strong class="text-lg">Aucune opération sur cette période</strong>
          <p class="text-muted-color mt-2 mb-4">Vos opérations plus anciennes restent consultables.</p>
          <Button label="Voir toutes les périodes" severity="secondary" outlined @click="voirToutesLesPeriodes" />
        </template>
        <template v-else>
          <strong class="text-lg">Aucune opération trouvée</strong>
          <p class="text-muted-color mt-2 mb-4">Modifiez votre recherche ou vos filtres.</p>
          <Button label="Réinitialiser" severity="secondary" outlined @click="resetAllFilters" />
        </template>
      </div>

      <div v-if="hasMore && !showLoading" class="client-delivery-load-more">
        <p v-if="loadMoreError" role="alert">{{ loadMoreError.message }}</p>
        <Button label="Afficher plus" severity="secondary" outlined size="small" :loading="isLoadingMore" @click="loadMore" />
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
    header="Filtrer les commandes"
    class="client-delivery-filter-drawer"
  >
    <form id="client-delivery-filter-form" class="client-delivery-filter" @submit.prevent="applyFilters">
      <p>Affinez la liste avec un ou plusieurs critères.</p>
      <div class="client-delivery-filter__grid">
        <div class="client-delivery-filter__field" role="group" aria-labelledby="client-delivery-filter-period">
          <span id="client-delivery-filter-period">Période</span>
          <div class="client-delivery-filter__periods">
            <button
              v-for="period in ACTIVITY_PERIODS"
              :key="period.value"
              type="button"
              :class="{ 'is-active': draftFilters.periode === period.value }"
              :aria-pressed="draftFilters.periode === period.value"
              @click="togglePeriod(period.value)"
            >
              {{ period.label }}
            </button>
          </div>
        </div>
        <label class="client-delivery-filter__field">
          <span>Type</span>
          <Select v-model="draftFilters.type" :options="typeOptions" option-label="label" option-value="value" fluid />
        </label>
        <label v-if="liens.length > 1" class="client-delivery-filter__field" data-testid="filtre-lien">
          <span>Lien</span>
          <Select v-model="draftFilters.lien" :options="lienOptions" option-label="label" option-value="value" fluid />
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

    <div v-if="detailIntrouvable" class="client-delivery-detail p-4 text-center" role="status" data-testid="operation-introuvable">
      <strong>Opération introuvable</strong>
      <p class="text-muted-color">Cette opération n’existe pas ou ne vous concerne pas.</p>
    </div>

    <div v-else-if="detail" class="client-delivery-detail">
      <div class="client-delivery-detail__top">
        <strong>{{ detail.reference }}</strong>
        <Tag :value="detail.avancement.label" :severity="avancementSeverity(detail.avancement.code)" />
      </div>

      <span class="client-orders-badges">
        <span v-for="badge in operationBadges(detail)" :key="badge" class="client-orders-badge">{{ badge }}</span>
      </span>

      <div class="client-delivery-detail__qr">
        <QrcodeVue :value="detail.reference" :size="176" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
        <span class="client-delivery-detail__qr-hint">Scannez pour identifier l’opération</span>
        <span class="client-delivery-detail__qr-ref">{{ detail.reference }}</span>
      </div>

      <div class="client-delivery-detail__rows">
        <div class="client-delivery-detail__row">
          <span>Nature</span>
          <strong>{{ detail.nature.label }}</strong>
        </div>
        <div v-if="activityPayment(detail)" class="client-delivery-detail__row">
          <span>Paiement</span>
          <Tag :value="activityPayment(detail)!.label" :severity="activityPayment(detail)!.severity" />
        </div>
        <div class="client-delivery-detail__row">
          <span>Date</span>
          <strong>{{ formatDate(detail.date) }}</strong>
        </div>
        <div v-if="operation?.remise?.date" class="client-delivery-detail__row">
          <span>{{ operation.remise.source === "retrait" ? "Retirée le" : "Réceptionnée le" }}</span>
          <strong>{{ formatDate(operation.remise.date) }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Origine</span>
          <strong>{{ detail.site_source }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>{{ detail.type === "vente" ? "Client" : "Destination" }}</span>
          <strong>{{ detail.site_destination }}</strong>
        </div>
        <div v-if="detail.vehicule" class="client-delivery-detail__row">
          <span>Véhicule</span>
          <strong>{{ detail.vehicule.nom_vehicule }} · {{ detail.vehicule.immatriculation }}</strong>
        </div>
        <div class="client-delivery-detail__row">
          <span>Nombre de packs</span>
          <strong>{{ formatNumber(detail.nb_packs) }}</strong>
        </div>
      </div>

      <p v-if="isLoadingDetail" class="text-muted-color text-sm" role="status">Chargement du détail…</p>
      <p v-else-if="detailError" class="text-red-500 text-sm" role="alert">{{ detailError.message }}</p>

      <template v-if="operation">
        <div v-if="operation.lignes.length" class="client-delivery-detail__rows" data-testid="operation-lignes">
          <div v-for="ligne in operation.lignes" :key="ligne.id" class="client-delivery-detail__row">
            <span>{{ ligne.libelle ?? "Produit" }} × {{ formatNumber(ligne.quantite) }}</span>
            <strong v-if="ligne.total !== null">{{ formatGnf(ligne.total) }}</strong>
          </div>
          <div v-if="operation.total !== null" class="client-delivery-detail__row">
            <span>Total</span>
            <strong>{{ formatGnf(operation.total) }}</strong>
          </div>
        </div>

        <div v-if="operation.contact" class="client-delivery-detail__rows" data-testid="operation-contact">
          <div v-if="operation.contact.telephone" class="client-delivery-detail__row">
            <span>Téléphone</span>
            <a :href="`tel:${operation.contact.telephone}`">{{ formatPhoneNumber(operation.contact.telephone) }}</a>
          </div>
          <div v-if="operation.contact.adresse" class="client-delivery-detail__row">
            <span>Adresse</span>
            <strong>{{ operation.contact.adresse }}</strong>
          </div>
        </div>
      </template>
    </div>

    <p v-else-if="isLoadingDetail" class="p-4 text-muted-color" role="status">Chargement du détail…</p>
    <p v-else-if="detailError" class="p-4 text-red-500" role="alert">{{ detailError.message }}</p>
  </Drawer>
  </div>
</template>

<style scoped>
.client-mobile-deliveries__card.is-compact {
  grid-template-columns: minmax(0, 1fr) auto;
}

.client-orders-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.client-orders-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--p-content-border-color);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--p-text-muted-color);
}
</style>
