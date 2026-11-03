<script setup lang="ts">
import type { PeriodeComptable, PeriodeRapide } from "~/config/clientPeriodeComptable";
import { PERIODES_RAPIDES, estMoisCourant } from "~/config/clientPeriodeComptable";

defineProps<{ chargement?: boolean }>();

const { periodeComptable, periodeRapide, label, appliquer } = useClientPeriodeAccueil();

const panneauVisible = ref(false);
const formulaireId = useId();
const brouillonRapide = ref<PeriodeRapide | null>(null);
const brouillonComptable = ref<PeriodeComptable>(periodeComptable.value);

const ouvrir = () => {
  brouillonRapide.value = periodeRapide.value ?? (estMoisCourant(periodeComptable.value) ? "ce_mois" : null);
  brouillonComptable.value = periodeComptable.value;
  panneauVisible.value = true;
};
const choisirPeriodeRapide = (periode: PeriodeRapide) => { brouillonRapide.value = periode; };
const choisirPeriodeComptable = (periode: PeriodeComptable) => {
  brouillonComptable.value = periode;
  brouillonRapide.value = null;
};
const reinitialiser = () => { brouillonRapide.value = "ce_mois"; };
const valider = () => {
  appliquer(brouillonRapide.value, brouillonComptable.value);
  panneauVisible.value = false;
};
</script>

<template>
  <div class="client-periode-accueil">
    <button type="button" class="client-periode-accueil__bouton" aria-haspopup="dialog" :aria-busy="chargement" @click="ouvrir">
      <i class="pi pi-calendar" aria-hidden="true" />
      <span>Période : <strong>{{ label }}</strong></span>
      <i :class="chargement ? 'pi pi-spin pi-spinner' : 'pi pi-chevron-down'" aria-hidden="true" />
    </button>

    <Drawer
      v-model:visible="panneauVisible"
      position="right"
      modal
      dismissable
      close-on-escape
      block-scroll
      header="Période"
      class="client-delivery-filter-drawer"
    >
      <form :id="formulaireId" class="client-delivery-filter" @submit.prevent="valider">
        <p>Tous les montants de l’accueil suivent la période choisie.</p>
        <div class="client-delivery-filter__grid">
          <div class="client-delivery-filter__field" role="group" aria-label="Périodes rapides">
            <span>Périodes rapides</span>
            <div class="client-delivery-filter__periods">
              <button
                v-for="periode in PERIODES_RAPIDES"
                :key="periode.value"
                type="button"
                :class="{ 'is-active': brouillonRapide === periode.value }"
                :aria-pressed="brouillonRapide === periode.value"
                @click="choisirPeriodeRapide(periode.value)"
              >
                {{ periode.label }}
              </button>
            </div>
          </div>
          <div class="client-delivery-filter__field">
            <span>Année, mois et quinzaine</span>
            <ClientPeriodeComptableFilter
              :model-value="brouillonComptable"
              :actif="brouillonRapide === null"
              compact
              @update:model-value="choisirPeriodeComptable"
            />
          </div>
        </div>
      </form>
      <template #footer>
        <div class="client-delivery-filter__actions">
          <Button type="button" label="Réinitialiser" severity="secondary" text @click="reinitialiser" />
          <Button type="submit" :form="formulaireId" label="Appliquer" />
        </div>
      </template>
    </Drawer>
  </div>
</template>

<style lang="scss" scoped>
.client-periode-accueil {
  margin-top: 0.75rem;
}

.client-periode-accueil__bouton {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  min-height: 2.5rem;
  padding: 0.35rem 0.85rem;
  color: var(--p-text-color);
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: 999px;
  font-size: 0.8125rem;
  cursor: pointer;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-weight: 700;
  }

  .pi {
    flex: 0 0 auto;
    color: var(--p-primary-color);
    font-size: 0.8125rem;
  }

  &:focus-visible {
    outline: 2px solid var(--p-primary-color);
    outline-offset: 2px;
  }
}
</style>
