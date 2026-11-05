<script setup lang="ts">
import type { ActiviteGains } from "~/config/clientCommissionsCompte";

// Répartition des gains par activité (ADR 0054 côté elm-monolithe) : une ligne
// par activité du compte, montants du backend (`par_activite`, dont la somme est
// `summary`). La page ne l'affiche qu'à partir de deux activités
// (repartitionVisible()).
defineProps<{
  parActivite: ActiviteGains[];
}>();

const titreId = useId();
</script>

<template>
  <section class="client-repartition" :aria-labelledby="titreId" data-testid="repartition-activites">
    <h2 :id="titreId" class="client-repartition__titre">Répartition par activité</h2>
    <ul class="client-repartition__liste">
      <li v-for="ligne in parActivite" :key="ligne.activite" class="client-repartition__ligne" :data-activite="ligne.activite">
        <ClientActiviteBadge :activite="ligne.activite" />
        <span class="client-repartition__montants">
          <strong>{{ formatGnf(ligne.total_earned) }}</strong>
          <small>Reste à payer : {{ formatGnf(ligne.balance) }}</small>
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.client-repartition {
  margin: 0 0 1rem;
  padding: 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-content-border-radius);
  background: var(--p-content-background);
}

.client-repartition__titre {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  font-weight: 600;
}

.client-repartition__liste {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.client-repartition__ligne {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.client-repartition__montants {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.client-repartition__montants small {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}
</style>
