<template>
  <Transition
    enter-active-class="transform ease-out duration-300 transition"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="snackbar.show"
      class="fixed bottom-4 right-4 z-[9999] flex w-full max-w-sm overflow-hidden bg-white rounded-lg shadow-md border pointer-events-auto"
      :class="{
        'border-green-100': snackbar.type === 'success',
        'border-red-100': snackbar.type === 'error',
        'border-blue-100': snackbar.type === 'info',
        'border-yellow-100': snackbar.type === 'warning'
      }"
    >
      <div 
        class="w-2"
        :class="{
          'bg-green-500': snackbar.type === 'success',
          'bg-red-500': snackbar.type === 'error',
          'bg-blue-500': snackbar.type === 'info',
          'bg-yellow-500': snackbar.type === 'warning'
        }"
      ></div>

      <div class="flex items-center px-4 py-3 flex-1">
        <div class="mx-3">
          <span 
            class="font-semibold"
            :class="{
              'text-green-500': snackbar.type === 'success',
              'text-red-500': snackbar.type === 'error',
              'text-blue-500': snackbar.type === 'info',
              'text-yellow-500': snackbar.type === 'warning'
            }"
          >
            {{ snackbar.type === 'success' ? 'Succès' : snackbar.type === 'error' ? 'Erreur' : 'Info' }}
          </span>
          <p class="text-sm text-gray-600">{{ snackbar.message }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useSnackbar } from './useSnackbar'
const { snackbar } = useSnackbar()
</script>
