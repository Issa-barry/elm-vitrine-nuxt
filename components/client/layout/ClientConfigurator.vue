<script setup lang="ts">
import { updatePreset, updateSurfacePalette } from "@primeuix/themes";

const { config, changeMenuMode } = useClientLayout();

const primaryColors = [
  { name: "emerald", value: "#10b981", palette: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b", 950: "#022c22" } },
  { name: "green", value: "#22c55e", palette: { 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d", 950: "#052e16" } },
  { name: "orange", value: "#f97316", palette: { 50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12", 950: "#431407" } },
  { name: "teal", value: "#14b8a6", palette: { 50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a", 950: "#042f2e" } },
  { name: "cyan", value: "#06b6d4", palette: { 50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490", 800: "#155e75", 900: "#164e63", 950: "#083344" } },
  { name: "blue", value: "#3b82f6", palette: { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a", 950: "#172554" } },
  { name: "indigo", value: "#6366f1", palette: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81", 950: "#1e1b4b" } },
  { name: "violet", value: "#8b5cf6", palette: { 50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065" } },
];

const surfaces = [
  { name: "slate", value: "#64748b", palette: { 0: "#ffffff", 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a", 950: "#020617" } },
  { name: "gray", value: "#6b7280", palette: { 0: "#ffffff", 50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db", 400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151", 800: "#1f2937", 900: "#111827", 950: "#030712" } },
  { name: "zinc", value: "#71717a", palette: { 0: "#ffffff", 50: "#fafafa", 100: "#f4f4f5", 200: "#e4e4e7", 300: "#d4d4d8", 400: "#a1a1aa", 500: "#71717a", 600: "#52525b", 700: "#3f3f46", 800: "#27272a", 900: "#18181b", 950: "#09090b" } },
  { name: "stone", value: "#78716c", palette: { 0: "#ffffff", 50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1", 400: "#a8a29e", 500: "#78716c", 600: "#57534e", 700: "#44403c", 800: "#292524", 900: "#1c1917", 950: "#0c0a09" } },
];

const selectedPrimary = ref("emerald");
const selectedSurface = ref("slate");

const selectPrimary = (color: (typeof primaryColors)[number]) => {
  selectedPrimary.value = color.name;
  updatePreset({ semantic: { primary: color.palette } });
};

const selectSurface = (surface: (typeof surfaces)[number]) => {
  selectedSurface.value = surface.name;
  updateSurfacePalette(surface.palette);
};
</script>

<template>
  <div class="config-panel absolute top-[3.25rem] right-0 w-64 p-4 bg-surface-0 dark:bg-surface-900 border border-surface rounded-border origin-top shadow-lg">
    <div class="flex flex-col gap-4">
      <div>
        <span class="config-panel-label">Couleur principale</span>
        <div class="config-panel-colors">
          <button
            v-for="color in primaryColors"
            :key="color.name"
            type="button"
            :title="color.name"
            :class="{ 'active-color': selectedPrimary === color.name }"
            :style="{ backgroundColor: color.value }"
            @click="selectPrimary(color)"
          />
        </div>
      </div>
      <div>
        <span class="config-panel-label">Surface</span>
        <div class="config-panel-colors">
          <button
            v-for="surface in surfaces"
            :key="surface.name"
            type="button"
            :title="surface.name"
            :class="{ 'active-color': selectedSurface === surface.name }"
            :style="{ backgroundColor: surface.value }"
            @click="selectSurface(surface)"
          />
        </div>
      </div>
      <div class="config-panel-settings">
        <span class="config-panel-label">Mode du menu</span>
        <SelectButton
          :model-value="config.menuMode"
          :options="[{ label: 'Statique', value: 'static' }, { label: 'Superposé', value: 'overlay' }]"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="changeMenuMode"
        />
      </div>
    </div>
  </div>
</template>
