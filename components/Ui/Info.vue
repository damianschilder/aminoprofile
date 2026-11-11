<template lang="pug">
//- An (i) button with an explanation, for text that would otherwise stand on the page. It opens
//- on hover, on keyboard focus and on a tap (phones have no hover). A click opens and never
//- toggles: the focus that comes with it has already opened it, so a toggle would close it again.
//- The panel ends with its sources as links (<UiSource>), so it stays open while the pointer or
//- the focus is anywhere inside it, and closes when the pointer leaves for a moment, the focus
//- moves elsewhere, something outside is tapped, or on Escape. A toggletip, not a tooltip:
//- role="tooltip" may not hold links. The text is always in the HTML, so screen readers and
//- search engines have it too.
span.info-wrapper(
  ref="wrapper"
  @mouseenter="show"
  @mouseleave="hideSoon"
  @focusout="onFocusOut"
  @keydown.esc="closeAndReturn"
)
  button.info-button.bare-button(
    ref="button"
    type="button"
    :aria-label="label"
    :aria-describedby="id"
    :aria-controls="id"
    :aria-expanded="open ? 'true' : 'false'"
    @focus="show"
    @click="show"
  )
    nuxt-icon(name="info" aria-hidden="true")
  span.info-panel(
    ref="panel"
    :id="id"
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
const wrapper = ref<HTMLElement | null>(null);
const button = ref<HTMLButtonElement | null>(null);

// Moving from the button to the panel crosses a 4px gap, which counts as leaving: wait a moment.
const LEAVE_DELAY_MS = 150;
let leaveTimer: ReturnType<typeof setTimeout> | undefined;
function show() {
  clearTimeout(leaveTimer);
  open.value = true;
}
function hideSoon() {
  clearTimeout(leaveTimer);
  // Opened by keyboard or a tap: the pointer leaving is no reason to close.
  if (wrapper.value?.contains(document.activeElement)) return;
  leaveTimer = setTimeout(() => { open.value = false; }, LEAVE_DELAY_MS);
}
function close() {
  clearTimeout(leaveTimer);
  open.value = false;
}
function closeAndReturn() {
  close();
  button.value?.focus({ preventScroll: true });
  // Focusing the button would open it again.
  open.value = false;
}

// Focus going to a link in the panel keeps it open, focus going anywhere else closes it. When the
// browser doesn't say where focus goes (a tap on text, Safari on a link), the tap outside closes it.
function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as Node | null;
  if (next && !wrapper.value?.contains(next)) close();
}
function onPointerDown(event: PointerEvent) {
  if (!wrapper.value?.contains(event.target as Node)) close();
}

// On a phone an (i) near the right edge would open its panel off the screen. On opening, once the
// panel is laid out, it is measured and moved sideways to stay 16 px inside.
const panel = ref<HTMLElement | null>(null);
const shift = ref(0);
const MARGIN = 16;
watch(open, async (isOpen) => {
  if (!isOpen) {
    document.removeEventListener('pointerdown', onPointerDown, true);
    return;
  }
  document.addEventListener('pointerdown', onPointerDown, true);
  shift.value = 0;
  await nextTick();
  const rect = panel.value?.getBoundingClientRect();
  if (!rect) return;
  const width = document.documentElement.clientWidth;
  if (rect.right > width - MARGIN) shift.value = width - MARGIN - rect.right;
  if (rect.left + shift.value < MARGIN) shift.value = MARGIN - rect.left;
});

onBeforeUnmount(() => {
  clearTimeout(leaveTimer);
  document.removeEventListener('pointerdown', onPointerDown, true);
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
  // Closed, the panel takes no space: hidden with visibility it was still laid out, and one near
  // the right edge made the whole page wider than a phone screen. The fade in and out stays,
  // through allow-discrete and @starting-style; browsers without them show it without a fade.
  display: none;
  opacity: 0;
  transition: opacity 0.2s, display 0.2s allow-discrete;
  &.end {
    left: auto;
    right: -8px;
  }
  &.above {
    top: auto;
    bottom: calc(100% + 4px);
  }
  &.show {
    display: block;
    opacity: 1;
    @starting-style {
      opacity: 0;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .info-panel {
    transition: none;
  }
}
</style>
