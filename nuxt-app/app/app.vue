<template>
  <div class="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Navigation -->
      <div class="mb-6 flex gap-4">
        <NuxtLink
          to="/"
          class="px-4 py-2 rounded-lg transition-colors shadow"
          :class="
            $route.path === '/'
              ? 'bg-emerald-500 text-white'
              : 'bg-white hover:bg-gray-50'
          "
        >
          Dashboard
        </NuxtLink>
        <NuxtLink
          to="/logs"
          class="px-4 py-2 rounded-lg transition-colors shadow"
          :class="
            $route.path === '/logs'
              ? 'bg-emerald-500 text-white'
              : 'bg-white hover:bg-gray-50'
          "
        >
          Logs
        </NuxtLink>
      </div>

      <NuxtPage />
    </div>
  </div>
</template>
