// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],

  icon: {
    serverBundle: 'local',
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
  },

  runtimeConfig: {
    public: {
      // En prod, on utilise SOCKET_URL=/ pour passer par Nginx (port 80)
      // En dev local, on utilise directement le backend sur le port 3001
      // Vous pouvez surcharger avec NUXT_PUBLIC_SOCKET_URL=http://localhost:3001
      socketUrl: process.env.NUXT_PUBLIC_SOCKET_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '/'),
      // mqttPrefix removed
    }
  },

  typescript: {
    strict: false,
    typeCheck: false
  },

  // SSR réactivé maintenant que le problème est résolu
  // ssr: false,

  // Proxy interne pour éviter les problèmes CORS et Docker Network
  routeRules: {
    // En dev local sans docker, fallback sur 127.0.0.1:3001 (IPv4 explicite)
    '/api/**': { proxy: `${process.env.API_URL || 'http://127.0.0.1:3001'}/api/**` }
  }
})
