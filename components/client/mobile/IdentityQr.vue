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
    <button type="button" class="client-mobile-qr-trigger" aria-label="Agrandir mon QR code" @click="expanded = true">
      <span class="client-mobile-qr-frame">
        <QrcodeVue :value="qrValue" :size="112" level="M" render-as="svg" foreground="#111827" background="#ffffff" />
      </span>
      <span class="client-mobile-qr-hint"><i class="pi pi-expand" /> Appuyer pour agrandir</span>
    </button>

    <div class="client-mobile-owner-copy">
      <h1 id="mobile-owner-name">{{ name }}</h1>
      <p>{{ phone }}</p>
    </div>

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
