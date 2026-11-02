<template>
  <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <filter id="elm-brand-symbol" color-interpolation-filters="sRGB">
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 1
                  0 0 0 0 1
                  0 0 0 0 1
                  1.169725 0 0 0 -0.169725"
        />
      </filter>
    </defs>
    <rect width="1024" height="1024" rx="160" fill="var(--primary-color, var(--p-primary-color, #2563eb))" />
    <image href="/logo_grand.png" width="1024" height="1024" filter="url(#elm-brand-symbol)" />
  </svg>
</template>
