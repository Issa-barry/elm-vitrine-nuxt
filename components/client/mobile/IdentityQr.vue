<script setup lang="ts">
import QrcodeVue from "qrcode.vue";

defineProps<{
  name: string;
  phone: string;
  role: string;
}>();

const expanded = ref(false);
const qrValue = "ELM:IDENTITY:MOCK:OWNER:4F92C1";
</script>

<template>
  <section class="client-mobile-identity-card" aria-labelledby="mobile-owner-name">
    <button
      type="button"
      class="client-mobile-identity-trigger"
      aria-haspopup="dialog"
      :aria-label="`Identité ${name}, ${role}, ${phone}. Agrandir le QR code.`"
      @click="expanded = true"
    >
      <span class="client-mobile-identity-qr">
        <QrcodeVue :value="qrValue" :size="72" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
      </span>

      <span class="client-mobile-identity-info">
        <strong id="mobile-owner-name">{{ name }}</strong>
        <span class="client-mobile-identity-meta">{{ role }} · {{ phone }}</span>
      </span>

      <span class="client-mobile-identity-expand" aria-hidden="true">
        <i class="pi pi-expand" />
        <span>Agrandir</span>
      </span>
    </button>

    <Dialog v-model:visible="expanded" modal header="Mon QR Eau La Maman" class="client-mobile-qr-dialog" :style="{ width: 'min(92vw, 24rem)' }">
      <div class="client-mobile-qr-dialog-content">
        <div class="client-mobile-qr-frame is-large">
          <QrcodeVue :value="qrValue" :size="230" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
        </div>
        <strong>{{ name }}</strong>
        <span>{{ role }}</span>
        <small>Code mock · aucune donnée personnelle n’est enregistrée dans le QR.</small>
      </div>
    </Dialog>
  </section>
</template>
