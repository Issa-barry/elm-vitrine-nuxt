<script setup lang="ts">
// Carte KPI desktop / tablette paysage : un seul composant factorisé pour les
// 3 cartes "commissions" du tableau de bord (voir pages/espace-client/index.vue),
// au lieu de dupliquer le balisage. Hiérarchie volontairement simple —
// libellé -> montant -> information secondaire — inspirée d'une référence
// visuelle externe (composition uniquement, aucune donnée ni texte repris).
interface Props {
  label: string;
  amount: string;
  /** Variante "primary" : carte mise en avant (fond coloré), pour LE KPI
   * dominant du tableau de bord. Les autres cartes restent neutres. */
  variant?: "primary" | "default";
  icon?: string;
  iconBackground?: string;
  iconColor?: string;
  secondaryLabel?: string;
  secondaryValue?: string;
}

withDefaults(defineProps<Props>(), {
  variant: "default",
});
</script>

<template>
  <div class="client-kpi-card" :class="`client-kpi-card--${variant}`">
    <svg
      v-if="variant === 'primary'"
      class="client-kpi-card__wave"
      viewBox="0 0 600 180"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0 65 C105 18 174 38 260 70 C360 108 425 38 600 62 L600 180 L0 180 Z" fill="currentColor" />
    </svg>

    <div class="client-kpi-card__body">
      <div class="client-kpi-card__head">
        <span class="client-kpi-card__label">{{ label }}</span>
        <span v-if="icon" class="client-kpi-card__icon" :class="iconBackground">
          <i :class="[icon, iconColor]" />
        </span>
      </div>

      <strong class="client-kpi-card__amount">{{ amount }}</strong>

      <div v-if="secondaryLabel" class="client-kpi-card__secondary">
        <span>{{ secondaryValue ? `${secondaryLabel} :` : secondaryLabel }}</span>
        <strong v-if="secondaryValue">{{ secondaryValue }}</strong>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.client-kpi-card {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 1.75rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--content-border-radius);
}

.client-kpi-card__wave {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 55%;
  color: color-mix(in srgb, var(--primary-contrast-color) 16%, transparent);
  pointer-events: none;
}

.client-kpi-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
}

.client-kpi-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.client-kpi-card__label {
  color: var(--text-color-secondary);
  font-size: 0.95rem;
  font-weight: 600;
}

.client-kpi-card__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--content-border-radius);
  font-size: 1.15rem;
}

.client-kpi-card__amount {
  margin: auto 0 0.9rem;
  color: var(--text-color);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.client-kpi-card__secondary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-color-secondary);
  font-size: 0.88rem;
}

.client-kpi-card__secondary strong {
  color: var(--text-color);
  font-weight: 700;
}

// Variante mise en avant : même fond/vague que la carte "Cumul des
// commissions" du dashboard mobile (client-mobile-balance-card), pour une
// continuité visuelle réelle entre mobile et desktop plutôt qu'un habillage
// desktop inventé.
.client-kpi-card--primary {
  border-color: transparent;
  background: var(--primary-color);
}

.client-kpi-card--primary .client-kpi-card__label,
.client-kpi-card--primary .client-kpi-card__secondary,
.client-kpi-card--primary .client-kpi-card__amount {
  color: var(--primary-contrast-color);
}

.client-kpi-card--primary .client-kpi-card__secondary strong {
  color: var(--primary-contrast-color);
}

.client-kpi-card--primary .client-kpi-card__label {
  opacity: 0.92;
}

.client-kpi-card--primary .client-kpi-card__secondary {
  opacity: 0.85;
}
</style>
