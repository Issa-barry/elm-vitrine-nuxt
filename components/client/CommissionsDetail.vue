<script setup lang="ts">
import { activiteLabel, type ActiviteCompte } from "~/config/clientActivites";
import { commissionStatutSeverity, dateCommission, vehiculeCommission, type CommissionCompte } from "~/config/clientCommissionsCompte";

// Détail des commissions du compte (ADR 0054 côté elm-monolithe) : une ligne par
// part, son origine (badge lu sur la part enregistrée), son opération, son
// véhicule, sa date de gain et son statut. Une commission annulée reste listée
// avec son statut, hors des montants (le total vient du résumé du backend).
const props = defineProps<{
  lignes: CommissionCompte[];
  total: number | null;
  nombre: number | null;
  chargement: boolean;
  erreur: string | null;
  aDAutresPages: boolean;
  activites: ActiviteCompte[];
}>();

const emit = defineEmits<{ "voir-plus": [] }>();

const TOUTES = "toutes";
const activite = defineModel<ActiviteCompte | typeof TOUTES>("activite", { default: TOUTES });
const recherche = defineModel<string>("recherche", { default: "" });

const titreId = useId();
const optionsActivite = computed(() => [
  { label: "Toutes les activités", value: TOUTES },
  ...props.activites.map((value) => ({ label: activiteLabel(value), value })),
]);
</script>

<template>
  <section class="client-commissions-detail" :aria-labelledby="titreId" data-testid="commissions-detail">
    <div class="client-commissions-detail__entete">
      <h2 :id="titreId">Détail des commissions</h2>
      <span v-if="nombre !== null" data-testid="commissions-detail-resume">
        {{ nombre }} commission{{ nombre > 1 ? "s" : "" }}<template v-if="total !== null"> · {{ formatGnf(total) }}</template>
      </span>
    </div>

    <div class="client-commissions-detail__filtres">
      <Select
        v-if="activites.length > 1"
        v-model="activite"
        :options="optionsActivite"
        option-label="label"
        option-value="value"
        aria-label="Filtrer par activité"
        fluid
      />
      <IconField class="client-commissions-detail__recherche">
        <InputIcon class="pi pi-search" />
        <InputText v-model="recherche" type="search" placeholder="Référence, véhicule ou immatriculation" aria-label="Rechercher une commission" fluid />
      </IconField>
    </div>

    <p v-if="erreur" class="client-commissions-detail__etat text-red-500" role="alert">{{ erreur }}</p>
    <p v-else-if="chargement && !lignes.length" class="client-commissions-detail__etat" role="status">Chargement du détail…</p>
    <p v-else-if="!lignes.length" class="client-commissions-detail__etat" role="status">
      {{ recherche ? "Aucune commission ne correspond à cette recherche." : "Aucune commission sur cette période." }}
    </p>

    <ul v-else class="client-commissions-detail__liste">
      <li
        v-for="ligne in lignes"
        :key="ligne.id"
        class="client-commissions-detail__ligne"
        :class="{ 'is-annulee': ligne.statut === 'annulee' }"
        data-testid="commission-ligne"
        :data-activite="ligne.activite ?? undefined"
      >
        <div class="client-commissions-detail__haut">
          <strong>{{ ligne.reference || "—" }}</strong>
          <span class="client-commissions-detail__montant">{{ formatGnf(ligne.montant_a_payer) }}</span>
        </div>
        <div class="client-commissions-detail__badges">
          <ClientActiviteBadge v-if="ligne.activite" :activite="ligne.activite" :precision="ligne.beneficiaire_libelle" />
          <Tag :value="ligne.statut_label" :severity="commissionStatutSeverity(ligne.statut)" />
        </div>
        <div class="client-commissions-detail__meta">
          <span>{{ ligne.operation_label ?? (ligne.operation === "logistique" ? "Transfert" : "Vente") }}</span>
          <span>{{ vehiculeCommission(ligne) }}</span>
          <span>{{ dateCommission(ligne.date) }}</span>
          <span v-if="ligne.montant_verse > 0 && ligne.statut !== 'annulee'">Déjà payé : {{ formatGnf(ligne.montant_verse) }}</span>
        </div>
      </li>
    </ul>

    <Button
      v-if="aDAutresPages"
      class="client-commissions-detail__plus"
      label="Voir plus"
      severity="secondary"
      outlined
      :loading="chargement"
      @click="emit('voir-plus')"
    />
  </section>
</template>

<style scoped>
.client-commissions-detail {
  margin-top: 1rem;
}

.client-commissions-detail__entete {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.client-commissions-detail__entete h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.client-commissions-detail__entete span,
.client-commissions-detail__etat {
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
}

.client-commissions-detail__filtres {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.client-commissions-detail__liste {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.client-commissions-detail__ligne {
  padding: 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
}

.client-commissions-detail__ligne.is-annulee .client-commissions-detail__montant {
  color: var(--p-text-muted-color);
  text-decoration: line-through;
}

.client-commissions-detail__haut {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.client-commissions-detail__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0.5rem 0;
}

.client-commissions-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  color: var(--p-text-muted-color);
  font-size: 0.8rem;
}

.client-commissions-detail__plus {
  width: 100%;
  margin-top: 0.75rem;
}

@media (min-width: 768px) {
  .client-commissions-detail__filtres {
    flex-direction: row;
  }

  .client-commissions-detail__filtres > * {
    flex: 1;
  }
}
</style>
