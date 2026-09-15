<template>
  <pre class="code-highlight"><code :class="`language-${language}`" class="hljs" v-html="highlightedCode"></code></pre>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import hljs from 'highlight.js/lib/core'
import go from 'highlight.js/lib/languages/go'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import 'highlight.js/styles/github-dark.css'

hljs.registerLanguage('go', go)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)

const props = defineProps<{ code: string; path: string }>()
const language = computed(() => {
  const extension = props.path.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'go':
      return 'go'
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'vue':
    case 'html':
    case 'xml':
      return 'xml'
    case 'css':
      return 'css'
    default:
      return 'plaintext'
  }
})

function escapeCode(code: string) {
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const highlightedCode = computed(() => {
  if (language.value === 'plaintext') return escapeCode(props.code)
  try {
    // Only render escaped highlighter output, never the source code as HTML.
    return hljs.highlight(props.code, {language: language.value, ignoreIllegals: true}).value
  } catch {
    return escapeCode(props.code)
  }
})
</script>

<style scoped>
.code-highlight {
  margin: 0;
  font: 13px/1.6 Consolas, 'Courier New', monospace;
  tab-size: 4;
  white-space: pre;
}

.code-highlight > code.hljs {
  display: block;
  padding: 0;
  overflow: visible;
  background: transparent;
  font: inherit;
}
</style>
