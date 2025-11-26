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
      socketUrl: process.env.SOCKET_URL || 'http://localhost:3001'
    }
  },
  
  typescript: {
    strict: false, // On relâche la pression sur le typage strict pour le build Docker
    typeCheck: false
  },

  // Proxy interne pour éviter les problèmes CORS et Docker Network
  routeRules: {
    '/api/**': { proxy: `${process.env.API_URL || 'http://backend:3001'}/api/**` }
  }
})
