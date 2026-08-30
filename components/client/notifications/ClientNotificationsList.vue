<script setup lang="ts">
import type { ClientNotification } from "~/config/clientNotifications";
import { notificationVisual } from "~/config/clientNotifications";

// Liste de présentation pure, réutilisée par le panneau desktop
// (ClientNotificationsPanel.vue) et la page mobile plein écran
// (pages/espace-client/notifications.vue) — chantier "centre de
// notifications" du 27/08/2026. Ne fait ni fetch ni marquage lu : le parent
// gère `markRead`/la redirection contextuelle via l'event `select`.
// Classes Tailwind uniquement (pas de nouvelle feuille SCSS) : même
// convention que la carte "Notifications" déjà présente sur le dashboard
// (pages/espace-client/index.vue), dont ce composant reprend exactement
// l'apparence (icône ronde colorée par type, ligne séparée par une bordure).
// Nommé au pluriel ("Notifications", pas "Notification") pour que le nom de
// composant auto-importé par Nuxt se réduise proprement à
// ClientNotificationsList (dossier components/client/notifications/ déjà
// préfixé "ClientNotifications" — un nom singulier aurait donné le nom
// composé ClientNotificationsClientNotificationList, jamais utilisé nulle
// part, vérifié dans .nuxt/components.d.ts).
defineProps<{
  notifications: ClientNotification[];
  // Squelette de premier chargement uniquement (isLoading && !hasLoaded côté
  // composable) : jamais affiché lors d'un rafraîchissement silencieux en
  // arrière-plan, qui laisse la liste déjà chargée visible (demande du
  // 27/08/2026, section 7).
  loading?: boolean;
}>();
defineEmits<{ select: [notification: ClientNotification] }>();
</script>

<template>
  <div>
    <ul v-if="loading" class="p-0 m-0 list-none" aria-hidden="true">
      <li v-for="n in 4" :key="n" class="flex items-center gap-3 py-4 border-b border-surface last:border-b-0">
        <Skeleton shape="circle" size="2.75rem" />
        <div class="flex-1 min-w-0">
          <Skeleton width="55%" height="0.85rem" class="mb-2" />
          <Skeleton width="85%" height="0.75rem" />
        </div>
      </li>
    </ul>

    <!-- Espacement (demande du 28/08/2026) : plus de padding vertical +
         ligne séparatrice légère (border-surface, déjà le token neutre ELM
         utilisé partout ailleurs) plutôt qu'un margin-bottom entre lignes —
         garde une liste dense lisible sans agrandir excessivement la cloche.
         Toujours un seul <button> par notification (bloc entier cliquable),
         jamais scindé par cet espacement. -->
    <ul v-else-if="notifications.length" class="p-0 m-0 list-none">
      <li v-for="notification in notifications" :key="notification.id">
        <button
          type="button"
          class="w-full flex items-center gap-3 py-4 px-2 -mx-2 border-b border-surface last:border-b-0 text-left rounded-border hover:bg-surface-50 dark:hover:bg-surface-800/60"
          :class="!notification.lu ? 'bg-primary-50/60 dark:bg-primary-400/5' : ''"
          @click="$emit('select', notification)"
        >
          <span
            class="shrink-0 text-[0.6rem] leading-none w-2"
            :class="notification.lu ? 'text-muted-color opacity-40' : 'text-primary'"
            aria-hidden="true"
          >{{ notification.lu ? "○" : "●" }}</span>
          <span :class="notificationVisual(notification.type).background" class="w-11 h-11 flex items-center justify-center rounded-full shrink-0">
            <i :class="[notificationVisual(notification.type).icon, notificationVisual(notification.type).iconColor]" class="!text-lg" />
          </span>
          <span class="flex-1 min-w-0 leading-normal text-surface-900 dark:text-surface-0" :class="{ 'font-semibold': !notification.lu }">
            <!-- Hiérarchie titre > montant > message > date (demande du
                 28/08/2026) : titre = événement, message = contexte SEUL
                 (jamais le montant concaténé dedans — celui-ci vient
                 uniquement de notification.montant, jamais parsé depuis
                 message), montant sur sa propre ligne, date la plus discrète.
                 Espacement interne volontairement asymétrique : petit espace
                 après le titre, message/montant regroupés (quasi collés,
                 même bloc "détail"), espace un peu plus marqué avant la date
                 (méta, dissociée du contenu). -->
            <strong class="block font-semibold truncate">{{ notification.titre || "Notification" }}</strong>
            <span v-if="notification.message" class="block text-muted-color text-sm mt-1 truncate">{{ notification.message }}</span>
            <span v-if="notification.montant != null" class="block text-sm mt-0.5 font-medium text-surface-900 dark:text-surface-0">{{ formatGnf(notification.montant) }}</span>
            <span v-if="notification.created_at" class="block text-muted-color text-xs mt-1.5">{{ formatRelativeDate(notification.created_at) }}</span>
          </span>
          <span class="sr-only">{{ notification.lu ? "Lue" : "Non lue" }}</span>
        </button>
      </li>
    </ul>

    <div v-else class="flex flex-col items-center text-center py-10 px-4 text-muted-color" role="status">
      <span class="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-400/10 text-green-500 mb-3">
        <i class="pi pi-check-circle !text-xl" aria-hidden="true" />
      </span>
      <strong class="text-surface-900 dark:text-surface-0">Vous êtes à jour</strong>
      <p class="mt-1 text-sm">Aucune nouvelle notification.</p>
    </div>
  </div>
</template>
