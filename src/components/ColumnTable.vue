<script lang="ts">
import { cloneVNode, defineComponent, Fragment, h, isVNode, nextTick, ref, watch } from 'vue'
import type { VNode } from 'vue'
import { ElButton, ElCheckbox, ElMessage, ElPopover, ElTable, ElTableColumn } from 'element-plus'
import { Grid } from '@element-plus/icons-vue'

// 保留 el-table 的属性、事件、插槽和常用实例方法，只增加列显示设置。
export default defineComponent({
  name: 'ColumnTable',
  inheritAttrs: false,
  props: {
    storageKey: { type:String, required:true },
    columnSettings: { type:Boolean, default:true },
  },
  setup(props, { attrs, slots, expose }) {
    const tableRef = ref<any>()
    const settingsOpen = ref(false)
    const hidden = ref<string[]>([])
    const storageKey = () => `go-admin:table-columns:v1:${props.storageKey}`
    watch(() => [props.storageKey, props.columnSettings], () => {
      settingsOpen.value = false
      hidden.value = []
      void nextTick(() => tableRef.value?.doLayout())
      if (!props.columnSettings) return
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey()) || '[]')
        hidden.value = Array.isArray(saved) ? saved.filter((key):key is string => typeof key === 'string') : []
      } catch { hidden.value = [] }
    }, { immediate:true })

    function save(reset = false) {
      try {
        if (reset) localStorage.removeItem(storageKey())
        else localStorage.setItem(storageKey(), JSON.stringify(hidden.value))
      } catch { ElMessage.warning('浏览器无法保存列设置，本次调整仍然有效') }
      void nextTick(() => tableRef.value?.doLayout())
    }
    const methods = ['clearSelection', 'getSelectionRows', 'toggleRowSelection', 'toggleAllSelection', 'toggleRowExpansion', 'setCurrentRow', 'clearSort', 'clearFilter', 'doLayout', 'sort', 'scrollTo', 'setScrollTop', 'setScrollLeft', 'updateKeyChildren']
    expose(Object.fromEntries(methods.map(name => [name, (...args:any[]) => tableRef.value?.[name]?.(...args)])))

    function flatten(nodes:VNode[]):VNode[] {
      return nodes.flatMap(node => node.type === Fragment && Array.isArray(node.children)
        ? flatten(node.children.filter(isVNode)) : [node])
    }

    return () => {
      const nodes = flatten(slots.default?.() || [])
      const counts = new Map<string, number>()
      const columns = nodes.filter(node => node.type === ElTableColumn || (node.type as { name?:string })?.name === 'ElTableColumn').map(node => {
        const data = node.props || {}
        const base = String(data.columnKey || data['column-key'] || data.prop || data.property || data.label || data.type || 'column')
        const occurrence = counts.get(base) || 0
        counts.set(base, occurrence + 1)
        const key = `${base}:${occurrence}`
        const label = String(data.label || ({ selection:'勾选列', index:'序号', expand:'展开列' } as Record<string,string>)[data.type] || base)
        return { node, key, label, locked:data.type === 'selection' || data.label === '操作' }
      })
      // 选择列和操作列始终显示，业务列至少保留一列，兼容旧的本地设置。
      const configurable = columns.filter(column => !column.locked)
      const visible = configurable.filter(column => !hidden.value.includes(column.key))
      const visibleKeys = new Set((visible.length ? visible : configurable.slice(0, 1)).map(column => column.key))
      const columnByNode = new Map(columns.map(column => [column.node, column]))
      const displayed = nodes.flatMap(node => {
        const column = columnByNode.get(node)
        if (!column) return [node]
        return !props.columnSettings || column.locked || visibleKeys.has(column.key) ? [cloneVNode(node, { key:column.key })] : []
      })

      const { toolbar, ...tableSlots } = slots
      return h('div', { class:'column-table' }, [
        toolbar || props.columnSettings ? h('div', { class:'column-table-tools' }, [
          h('div', { class:'column-table-actions' }, toolbar?.()),
          props.columnSettings ? h(ElPopover, { trigger:'click', width:240, placement:'bottom-end', visible:settingsOpen.value, 'onUpdate:visible':(value:boolean) => { settingsOpen.value = value } }, {
            reference: () => h(ElButton, { class:['column-table-trigger', { 'is-active':settingsOpen.value }], icon:Grid, text:true, title:'列显示', 'aria-label':'列显示', 'aria-expanded':settingsOpen.value, disabled:!configurable.length }),
            default: () => [
              h('div', { class:'column-table-heading' }, [
                h('span', '显示列'),
                h(ElButton, { link:true, type:'primary', size:'small', onClick:() => { hidden.value = []; save(true) } }, () => '恢复默认'),
              ]),
              h('div', { class:'column-table-options' }, configurable.map(column => h(ElCheckbox, {
                key:column.key,
                modelValue:visibleKeys.has(column.key),
                disabled:visibleKeys.size === 1 && visibleKeys.has(column.key),
                'onUpdate:modelValue': (checked:unknown) => {
                  const next = new Set(hidden.value.filter(key => configurable.some(column => column.key === key)))
                  if (checked) next.delete(column.key)
                  else next.add(column.key)
                  hidden.value = [...next]
                  save()
                },
              }, () => column.label))),
            ],
          }) : null,
        ]) : null,
        h(ElTable, { ...attrs, ref:tableRef }, { ...tableSlots, default:() => displayed }),
      ])
    }
  },
})
</script>

<style scoped>
.column-table :deep(.el-table th.el-table__cell) { background: var(--el-fill-color-extra-light); font-weight: 500; color: var(--el-text-color-secondary); }
.column-table { min-width: 0; width: 100%; }
.column-table-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.column-table-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; }
.column-table-actions :deep(.el-button + .el-button) { margin-left: 0; }
.column-table-trigger { flex-shrink: 0; width: 32px; height: 32px; padding: 0; border-radius: 6px; color: var(--el-text-color-regular); background: var(--el-fill-color-light); transition: color .2s, background-color .2s; }
.column-table-trigger :deep(.el-icon) { font-size: 17px; }
.column-table-trigger:not(.is-disabled):hover,
.column-table-trigger.is-active { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
.column-table-trigger:focus-visible { outline: 2px solid var(--el-color-primary-light-5); outline-offset: 2px; }
.column-table-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.column-table-options { display: flex; flex-direction: column; max-height: 300px; overflow-y: auto; }
.column-table-options :deep(.el-checkbox) { margin-right: 0; }
</style>
