<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  digit: [value: number]
  erase: []
}>()
</script>

<template>
  <section class="numpad" aria-label="Number input">
    <button v-for="digit in 9" :key="digit" :disabled="disabled" @click="emit('digit', digit)">{{ digit }}</button>
    <button class="erase" :disabled="disabled" @click="emit('erase')">Erase</button>
  </section>
</template>
