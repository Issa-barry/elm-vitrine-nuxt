<script setup lang="ts">
import QrcodeVue from "qrcode.vue";

// `qrValue` : GET /api/auth/me expose désormais un vrai `qr_payload` (voir
// docs/api-espace-client-contract.md côté elm-monolithe) — repli sur un
// libellé neutre (pas de QR "mock" affiché comme réel) si absent, ex. compte
// sans profil métier réellement rattaché.
const props = withDefaults(defineProps<{
  name: string;
  phone: string;
  role: string;
  qrValue?: string | null;
}>(), {
  qrValue: null,
});

const expanded = ref(false);
const hasQr = computed(() => Boolean(props.qrValue));
</script>

<template>
  <section class="client-mobile-identity-card" aria-labelledby="mobile-owner-name">
    <button
      v-if="hasQr"
      type="button"
      class="client-mobile-identity-qr-trigger"
      aria-label="Agrandir mon QR code"
      aria-haspopup="dialog"
      @click="expanded = true"
    >
      <span class="client-mobile-identity-qr">
        <QrcodeVue :value="qrValue!" :size="72" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
        <i class="pi pi-expand client-mobile-identity-qr-badge" aria-hidden="true" />
      </span>
      <span class="client-mobile-identity-expand-label" aria-hidden="true">Agrandir</span>
    </button>

    <div class="client-mobile-identity-info">
      <strong id="mobile-owner-name">{{ name }}</strong>
      <span class="client-mobile-identity-meta">{{ role }} · {{ phone }}</span>
    </div>

    <Dialog v-model:visible="expanded" modal header="Mon QR Eau La Maman" class="client-mobile-qr-dialog" :style="{ width: 'min(92vw, 24rem)' }">
      <div class="client-mobile-qr-dialog-content">
        <div class="client-mobile-qr-frame is-large">
          <QrcodeVue v-if="hasQr" :value="qrValue!" :size="230" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
        </div>
        <strong>{{ name }}</strong>
        <span>{{ role }}</span>
      </div>
    </Dialog>
  </section>
</template>
