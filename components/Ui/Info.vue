<template lang="pug">
//- An (i) button with an explanation, for text that would otherwise stand on the page. It opens
//- on hover, on keyboard focus and on a tap (phones have no hover). A click opens and never
//- toggles: the focus that comes with it has already opened it, so a toggle would close it again.
//- Moving away, tapping elsewhere (blur) or Escape closes it. The text is always in the HTML, so
//- screen readers and search engines have it too. The same pattern as the Nutrients column of
//- the search results (components/Ui/Search.vue).
span.info-wrapper
  button.info-button.bare-button(
    type="button"
    :aria-label="label"
    :aria-describedby="id"
    :aria-expanded="open ? 'true' : 'false'"
    @mouseenter="open = true"
    @mouseleave="open = false"
    @focus="open = true"
    @blur="open = false"
    @click="open = true"
    @keydown.esc="open = false"
  )
    nuxt-icon(name="info" aria-hidden="true")
  span.info-panel(
    ref="panel"
    :id="id"
    role="tooltip"
    :class="{ show: open, end: align === 'end', above: placement === 'above' }"
    :style="shift ? { transform: `translateX(${shift}px)` } : undefined"
  )
    slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** What the button is about, for screen readers: "About the Needed row". */
  label: string
  /** 'end' opens the panel towards the left, for an icon near the right edge. */
  align?: 'start' | 'end'
  /** 'above' for an icon near the bottom of something that clips. */
  placement?: 'below' | 'above'
}>(), { align: 'start', placement: 'below' });

const id = useId();
const open = ref(false);

// On a phone an (i) near the right edge would open its panel off the screen. The hidden panel is
// laid out all the time, so on opening it is measured and moved sideways to stay 16 px inside.
const panel = ref<HTMLElement | null>(null);
const shift = ref(0);
const MARGIN = 16;
watch(open, async (isOpen) => {
  if (!isOpen) return;
  shift.value = 0;
  await nextTick();
  const rect = panel.value?.getBoundingClientRect();
  if (!rect) return;
  const width = document.documentElement.clientWidth;
  if (rect.right > width - MARGIN) shift.value = width - MARGIN - rect.right;
  if (rect.left + shift.value < MARGIN) shift.value = MARGIN - rect.left;
});
</script>

<style lang="scss" scoped>
.info-wrapper {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
  margin-left: 0.25rem;
}

.info-button {
  display: inline-flex;
  color: $neutral-variant50-text;
  &:hover, &:focus-visible {
    color: black;
  }
  &:deep(.nuxt-icon svg) {
    height: fit-content;
    width: 1.1rem;
    margin: 0;
  }
}

// Material rich tooltip: a white card with a shadow, plain text, at most 18rem wide.
.info-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: -8px;
  z-index: 3;
  width: max-content;
  max-width: min(18rem, calc(100vw - 2rem));
  padding: 0.75rem 1rem;
  border-radius: 5px;
  background-color: white;
  filter: drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.15));
  color: $neutral-variant30;
  font: 400 14px/20px $mulish;
  letter-spacing: normal;
  text-align: left;
  white-space: normal;
  visibility: hidden;
  opacity: 0;
  transition: visibility 0.2s, opacity 0.2s;
  &.end {
    left: auto;
    right: -8px;
  }
  &.above {
    top: auto;
    bottom: calc(100% + 4px);
  }
  &.show {
    visibility: visible;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .info-panel {
    transition: none;
  }
}
</style>
