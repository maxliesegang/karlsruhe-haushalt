<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { lockBodyScroll, unlockBodyScroll } from '@/utils/scrollLock'

const props = withDefaults(
  defineProps<{
    open: boolean
    ariaLabel?: string
    labelledBy?: string
    align?: 'center' | 'end'
    closeOnBackdrop?: boolean
    closeOnEsc?: boolean
    panelClass?: string
    containerClass?: string
    overlayClass?: string
  }>(),
  {
    align: 'end',
    closeOnBackdrop: true,
    closeOnEsc: true,
    panelClass: '',
    containerClass: '',
    overlayClass: 'bg-slate-900/40 backdrop-blur-sm',
  },
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const alignmentClass = computed(() =>
  props.align === 'center' ? 'items-center' : 'items-end sm:items-center',
)

function handleBackdropClick() {
  if (!props.closeOnBackdrop) return
  emit('close')
}

const isClient = typeof window !== 'undefined'
let scrollLocked = false

function handleKeydown(event: KeyboardEvent) {
  if (!props.closeOnEsc || !props.open) return
  if (event.key === 'Escape') {
    emit('close')
  }
}

function attachKeyListener() {
  if (!isClient) return
  window.addEventListener('keydown', handleKeydown)
}

function detachKeyListener() {
  if (!isClient) return
  window.removeEventListener('keydown', handleKeydown)
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (!scrollLocked) {
        lockBodyScroll()
        scrollLocked = true
      }
      attachKeyListener()
    } else {
      if (scrollLocked) {
        unlockBodyScroll()
        scrollLocked = false
      }
      detachKeyListener()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  detachKeyListener()
  if (scrollLocked) {
    unlockBodyScroll()
    scrollLocked = false
  }
})
</script>

<template>
  <teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel || undefined"
        :aria-labelledby="labelledBy || undefined"
      >
        <div class="absolute inset-0" :class="overlayClass" aria-hidden="true"></div>
        <div
          class="relative flex h-full w-full justify-center px-4 py-8 sm:px-6"
          :class="[alignmentClass, containerClass]"
          @click.self="handleBackdropClick"
        >
          <div class="w-full" :class="panelClass">
            <slot />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
