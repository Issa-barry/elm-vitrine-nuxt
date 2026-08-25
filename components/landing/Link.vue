<script setup lang="ts">
interface Props {
  href: string;
  size?: "md" | "lg";
  block?: boolean;
  styleName?: "outline" | "primary" | "inverted" | "muted";
  className?: string;
  [x: string]: any;
}

withDefaults(defineProps<Props>(), {
  size: "lg",
  styleName: "primary",
});

const sizes = {
  lg: "px-5 py-2.5",
  md: "px-4 py-2",
};

const styles = {
  outline: "landing-theme-action--outline border-2",
  primary: "landing-theme-action--primary border-2",
  inverted: "landing-theme-action--inverted border-2",
  muted: "landing-theme-action--muted border-2",
};
</script>

<template>
  <NuxtLink
    :href="href"
    :class="[
      'landing-theme-action rounded text-center transition',
      block && 'w-full',
      sizes[size],
      styles[styleName],
    ]"
    ><slot />
  </NuxtLink>
</template>
