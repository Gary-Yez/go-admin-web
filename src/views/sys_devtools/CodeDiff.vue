<template>
  <div class="code-diff">
    <div class="diff-toolbar">
      <div class="diff-counts"><span class="count-add">+ {{ added }} 行新增</span><span class="count-remove">− {{ removed }} 行删除</span><span v-if="!added && !removed">{{ before === after ? '内容相同' : '仅换行格式（CRLF / LF）不同' }}</span></div>
      <el-button text size="small" @click="toggleExpansion">{{ hasExpansion ? '折叠未修改代码' : '展开全部代码' }}</el-button>
    </div>
    <div class="diff-panels">
      <section v-for="side in sides" :key="side" class="diff-panel">
        <div class="diff-heading">{{ side === 'left' ? '当前文件' : '生成后内容' }}</div>
        <div :ref="element => setScrollPane(side, element)" class="diff-scroll" tabindex="0" :aria-label="side === 'left' ? '当前文件，可独立横向滚动' : '生成后内容，可独立横向滚动'" @scroll="syncVertical(side)">
          <div class="diff-lines">
            <template v-for="entry in visibleRows" :key="entry.key">
              <button v-if="entry.hidden" class="diff-fold" @click="expanded.add(entry.key)">展开 {{ entry.hidden }} 行未修改代码</button>
              <div v-else-if="entry.row" class="diff-cell" :class="cellClass(entry.row, side)">
                <span class="line-number">{{ side === 'left' ? entry.row.leftNo : entry.row.rightNo }}</span>
                <span class="line-sign" aria-hidden="true">{{ entry.row.kind === 'change' && entry.row[side] !== undefined ? (side === 'left' ? '−' : '+') : '' }}</span>
                <code class="line-code"><span v-for="(token, index) in entry.row[side + 'Tokens' as 'leftTokens' | 'rightTokens']" :key="index" :class="[token.className, { 'inline-change': token.changed }]">{{ token.text }}</span><span v-if="entry.row[side] !== undefined && !entry.row[side]!.endsWith('\n')" class="no-newline"> ⏎ 无末尾换行</span></code>
              </div>
            </template>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import hljs from 'highlight.js/lib/core'
import go from 'highlight.js/lib/languages/go'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import 'highlight.js/styles/github-dark.css'
import { buildRows, changedRanges } from './codeDiff'
import type { DiffRow } from './codeDiff'

for (const [name, grammar] of Object.entries({ go, typescript, javascript, xml, css })) hljs.registerLanguage(name, grammar)
const props = defineProps<{ before: string; after: string; path: string }>()
const showAll = ref(false)
const expanded = ref(new Set<number>())
const hasExpansion = computed(() => showAll.value || expanded.value.size > 0)
function resetExpansion() {
  showAll.value = false
  expanded.value = new Set()
}
function toggleExpansion() {
  if (hasExpansion.value) resetExpansion()
  else showAll.value = true
}
const sides = ['left', 'right'] as const
const scrollPanes: Record<'left' | 'right', HTMLElement | null> = { left:null, right:null }
function setScrollPane(side:'left' | 'right', element:unknown) {
  scrollPanes[side] = element instanceof HTMLElement ? element : null
}
// 只同步纵向位置，让两侧对应行对齐；横向位置各自保留。
function syncVertical(side:'left' | 'right') {
  const current = scrollPanes[side]
  const other = scrollPanes[side === 'left' ? 'right' : 'left']
  if (current && other && other.scrollTop !== current.scrollTop) other.scrollTop = current.scrollTop
}

interface Token { text: string; className: string; changed?: boolean }
interface RenderRow extends DiffRow { leftTokens: Token[]; rightTokens: Token[] }
interface VisibleRow { key: number; row?: RenderRow; hidden?: number }

// Tokenize the complete document first, preserving syntax across multiline comments.
function syntaxLines(code: string): Token[][] {
  const source = code.replace(/\r\n/g, '\n')
  const extension = props.path.split('.').pop()?.toLowerCase() ?? ''
  const language = ({ go: 'go', ts: 'typescript', js: 'javascript', vue: 'xml', html: 'xml', css: 'css' } as Record<string, string>)[extension]
  const lines: Token[][] = [[]]
  const append = (text: string, className: string) => {
    text.split('\n').forEach((part, i) => {
      if (i) lines.push([])
      if (part) lines[lines.length - 1]!.push({ text: part, className })
    })
  }
  if (!language) { append(source, ''); return lines }
  try {
    const root = document.createElement('template')
    root.innerHTML = hljs.highlight(source, { language, ignoreIllegals: true }).value
    const walk = (node: Node, classes: string) => {
      if (node.nodeType === Node.TEXT_NODE) { append(node.textContent ?? '', classes); return }
      const next = node instanceof Element ? `${classes} ${node.getAttribute('class') ?? ''}`.trim() : classes
      node.childNodes.forEach(child => walk(child, next))
    }
    walk(root.content, '')
    return lines
  } catch { return source.split('\n').map(text => [{ text, className: '' }]) }
}

function markTokens(tokens: Token[], ranges: [number, number][]): Token[] {
  if (!ranges.length) return tokens
  let offset = 0
  const output: Token[] = []
  for (const token of tokens) {
    for (const character of Array.from(token.text)) {
      const changed = ranges.some(([start, end]) => offset < end && offset + character.length > start)
      const last = output[output.length - 1]
      if (last && last.className === token.className && last.changed === changed) last.text += character
      else output.push({ text: character, className: token.className, changed })
      offset += character.length
    }
  }
  return output
}

const rows = computed<RenderRow[]>(() => {
  const left = syntaxLines(props.before), right = syntaxLines(props.after)
  return buildRows(props.before, props.after).map(row => {
    const ranges = row.kind === 'change' && row.left !== undefined && row.right !== undefined
      ? changedRanges(row.left, row.right) : { left: [], right: [] }
    return { ...row,
      leftTokens: markTokens(row.leftNo ? left[row.leftNo - 1] ?? [] : [], ranges.left),
      rightTokens: markTokens(row.rightNo ? right[row.rightNo - 1] ?? [] : [], ranges.right),
    }
  })
})
const added = computed(() => rows.value.filter(row => row.kind === 'change' && row.right !== undefined).length)
const removed = computed(() => rows.value.filter(row => row.kind === 'change' && row.left !== undefined).length)
const visibleRows = computed<VisibleRow[]>(() => {
  const result: VisibleRow[] = []
  const all = rows.value
  for (let i = 0; i < all.length;) {
    if (showAll.value || all[i]!.kind === 'change') { result.push({ key: i, row: all[i] }); i++; continue }
    let end = i
    while (end < all.length && all[end]!.kind === 'same') end++
    const keepStart = i === 0 ? 0 : 3
    const keepEnd = end === all.length ? 0 : 3
    const foldStart = i + keepStart, foldEnd = end - keepEnd
    if (foldEnd - foldStart > 2 && !expanded.value.has(foldStart)) {
      for (; i < foldStart; i++) result.push({ key: i, row: all[i] })
      result.push({ key: foldStart, hidden: foldEnd - foldStart })
      for (i = foldEnd; i < end; i++) result.push({ key: i, row: all[i] })
    } else { for (; i < end; i++) result.push({ key: i, row: all[i] }) }
  }
  return result
})
function cellClass(row: RenderRow, side: 'left' | 'right') {
  if (row[side] === undefined) return 'diff-empty'
  return row.kind === 'change' ? (side === 'left' ? 'diff-removed' : 'diff-added') : ''
}
watch(() => [props.before, props.after, props.path], resetExpansion)
</script>

<style scoped>
.code-diff { margin-top: 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; overflow: hidden; }
.diff-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 12px; background: var(--el-fill-color-light); }
.diff-counts { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; }
.count-add { color: #238636; }.count-remove { color: #cf222e; }
.diff-panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.diff-panel { min-width: 0; overflow: hidden; background: #0d1117; color: #c9d1d9; }
.diff-panel + .diff-panel { border-left: 1px solid #30363d; }
.diff-scroll { overflow-x: scroll; overflow-y: auto; max-height: 52vh; scrollbar-gutter: stable; }
.diff-lines { min-width: 100%; width: max-content; }
.diff-heading { background: #161b22; padding: 9px 14px; border-bottom: 1px solid #30363d; font-size: 12px; color: #8b949e; }
.diff-cell { display: flex; align-items: stretch; min-height: 22px; font: 12px/22px Consolas, 'Courier New', monospace; }
.line-number { flex: 0 0 44px; text-align: right; padding-right: 8px; color: #8b949e; user-select: none; background: #ffffff03; }
.line-sign { flex: 0 0 20px; text-align: center; user-select: none; }
.line-code { display: block; padding-right: 16px; white-space: pre; tab-size: 4; font: inherit; min-height: 22px; }
.diff-added { background: #122c22; }.diff-added .line-sign { color: #7ee787; }
.diff-removed { background: #351b22; }.diff-removed .line-sign { color: #ff7b72; }
.diff-added .inline-change { background: #23863688; border-radius: 2px; }
.diff-removed .inline-change { background: #da363388; border-radius: 2px; }
.diff-empty { background: repeating-linear-gradient(135deg, #161b22, #161b22 4px, #0d1117 4px, #0d1117 8px); }
.diff-fold { display: block; width: 100%; height: 34px; white-space: nowrap; cursor: pointer; border: 0; border-block: 1px solid #30363d; background: #172537; color: #79c0ff; padding: 8px; text-align: center; font-size: 12px; }
.diff-fold:hover { background: #213753; }.no-newline { color: #8b949e; font-size: 10px; user-select: none; }
</style>
