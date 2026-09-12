<template>
  <el-card class="container" shadow="never" v-loading="sortSaving">
    <PageHeader title="菜单管理" description="管理导航结构、页面入口与显示顺序" />
    <div @dragover="handleDragOver" @drop="handleDrop" @dragleave="handleDragLeave">
    <div v-if="listError" class="mb-[12px]">
      <el-alert :title="listError" type="error" :closable="false" show-icon />
    </div>
    <ColumnTable storage-key="core/views/sys_menu/index:table-1" v-loading="pageLoading" ref="menuTableRef" size="large" :data="tableData" row-key="id" :row-class-name="rowClassName">
      <template #toolbar>
        <el-button icon="Refresh" :loading="pageLoading" @click="getPageData">刷新</el-button>
        <el-button type="primary" icon="Plus" @click="()=>handleAdd({})">新增根菜单</el-button>
        <span class="sort-hint">{{ dragHint }}</span>
      </template>

      <el-table-column label="ID" prop="id" :width="100"></el-table-column>

      <el-table-column label="菜单名称" prop="name"></el-table-column>
      <el-table-column label="字体图标" prop="icon">
        <template #default="{ row }">
          <div class="flex items-center gap-x-[8px]">
            <iconify-icon class="text-[24px]" :icon="row.icon"></iconify-icon>
            <span>{{ row.icon }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="路由地址" prop="path"><template #default="{ row }"><code class="table-code">{{ row.path }}</code></template></el-table-column>
      <el-table-column label="组件路径" prop="component">
        <template #default="{ row }">
          <el-tag v-if="row.component" type="success">{{ row.component }}</el-tag>
          <el-tag v-else type="primary">路由组件</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="父菜单ID" prop="parent_id" :width="100">
        <template #default="{ row }">
          <el-tag v-if="!row.parent_id" type="primary">根菜单</el-tag>
          <el-tag v-else type="success">{{ row.parent_id }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="是否隐藏" prop="hidden" :width="100">
        <template #default="{ row }">
          <el-switch v-model="row.hidden" :loading="row.loading" :before-change="()=>handleChangeSwitch(row,'hidden')"></el-switch>
        </template>
      </el-table-column>
      <el-table-column label="操作" :width="400" fixed="right" align="center">
        <template #default="{ row }">
          <div class="table-btn-group">
            <el-button class="drag-handle" type="primary" plain size="small" :draggable="!sortSaving" :disabled="sortSaving" :aria-label="`拖动排序：${row.name}`" title="拖动调整位置或父级" @dragstart="handleDragStart($event, row)" @dragend="clearDrag">
              <el-icon class="mr-[4px]"><iconify-icon icon="iconoir:drag" /></el-icon>排序
            </el-button>
            <el-button type="primary" icon="Plus"  :disabled="!!row.component" plain size="small" @click="()=>handleAdd({parent_id:row.id})">添加子菜单</el-button>
            <el-button type="primary" icon="Edit" plain size="small" @click="()=>handleAdd(row)">修改</el-button>
            <el-button type="danger" icon="Delete" plain size="small" @click="()=>handleDelete([row.id])">删除</el-button>
          </div>
        </template>
      </el-table-column>
    <template #empty><el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : '暂无菜单'" :image-size="70" /></template>
    </ColumnTable>
    </div>
    <FormDialog description="配置菜单名称、图标和页面入口，按需设置父级菜单。" note-icon="Menu" v-model="dialogOpen" v-model:form="submitForm" :title="submitForm.id ? '修改菜单' : '新增菜单'" :on-confirm="handleSubmit">
      <el-form-item label="父菜单" prop="parent_id">
        <el-cascader size="large" class="w-full" v-model="submitForm.parent_id" :options="parentMenu" :props="{ label:'name',value:'id',checkStrictly:true,emitPath:false,disabled:'component'}"></el-cascader>
      </el-form-item>
      <el-row :gutter="15">
        <el-col :span="10">
          <el-form-item label="字体图标" prop="icon" :rules="[{required:true,message:'请选择字体图标'}]">
            <IconSelect v-model="submitForm.icon"></IconSelect>
          </el-form-item>
        </el-col>
        <el-col :span="14">
          <el-form-item label="菜单名称" prop="name" :rules="[{required:true,message:'请输入菜单名称'}]">
            <el-input size="large" v-model="submitForm.name" placeholder="请输入菜单名称"></el-input>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="路由地址" prop="path" :rules="[{required:true,message:'请输入路由地址'}]">
        <el-input size="large" v-model="submitForm.path" placeholder="请输入路由地址">
          <template #prepend>{{ routePrefix }}</template>
        </el-input>
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="11">
          <el-form-item label="组件类型">
            <el-radio-group v-model="submitForm.menu_type">
              <el-radio-button :value="1" label="路由组件"></el-radio-button>
              <el-radio-button :value="2" label="页面组件"></el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="13" v-if="submitForm.menu_type === 2">
          <el-form-item label="组件路径" prop="component" :rules="[{required:true,message:'请选择组件'}]">
            <el-select size="large" v-model="submitForm.component" placeholder="请选择组件" filterable>
              <el-option v-for="item in SyncComponents" :value="item" :label="item"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
    </FormDialog>
  </el-card>
</template>

<script setup lang="ts">
import {confirmDelete} from "../../utils/confirmDelete";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import {computed, nextTick, onMounted, ref} from "vue";
import { SysMenuApi } from "../../apis/sys_menu.ts";
import FormDialog from "../../components/FormDialog.vue";
import {SyncComponents, addSyncRouter} from "../../routes/syncMenu.ts";
import { ElMessage } from "element-plus";
import IconSelect from "../../components/IconSelect.vue";
import { SysAuthApi } from "../../apis/sys_auth.ts";
import { useUserStore } from "../../stores/user.ts";
import { useRouter } from "vue-router";

const listError = ref('')
let listRequest = 0
const pageLoading = ref(true)
const dialogOpen = ref(false);
const tableData = ref<any[]>([])
const sortSaving = ref(false)
const dragged = ref<any>(null)
const dropTarget = ref<number | null>(null)
const dropPosition = ref<'before' | 'after' | 'inside'>('before')
const menuTableRef = ref()
const userStore = useUserStore()
const router = useRouter()
const dragHint = computed(() => {
  const target = dropTarget.value === null ? null : findMenu(dropTarget.value)
  if (!target) return '拖到行上方或下方调整位置，拖到目录中间移入子菜单'
  return dropPosition.value === 'inside' ? `移入“${target.name}”，成为子菜单` : `放到“${target.name}”${dropPosition.value === 'before' ? '前面' : '后面'}`
})
const clearDrag = () => { dragged.value = null; dropTarget.value = null; dropPosition.value = 'before' }
const rowClassName = ({ row }: { row:any }) => `menu-row-${row.id} ${dragged.value?.id === row.id ? 'is-dragging' : ''} ${dropTarget.value === row.id ? `drop-${dropPosition.value}` : ''}`
function siblingsOf(id:number, list:any[] = tableData.value):any[] | undefined {
  if (list.some(row => row.id === id)) return list
  for (const row of list) {
    const found = siblingsOf(id, row.children || [])
    if (found) return found
  }
}
function findMenu(id:number):any { return siblingsOf(id)?.find(row => row.id === id) }
function containsMenu(row:any, id:number):boolean {
  return row.id === id || (row.children || []).some((child:any) => containsMenu(child, id))
}
function menuLocation(menus:any[], matches:(row:any, path:string) => boolean, parent = '/dashboard'): { id:number; path:string } | undefined {
  for (const row of menus) {
    const path = row.path.startsWith('/') ? row.path : `${parent}/${row.path}`
    if (matches(row, path)) return { id:row.id, path }
    const found = menuLocation(row.children || [], matches, path)
    if (found) return found
  }
}
function handleDragStart(event:DragEvent, row:any) {
  if (sortSaving.value || pageLoading.value || !event.dataTransfer) { event.preventDefault(); return }
  dragged.value = row
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(row.id))
}
function handleDragOver(event:DragEvent) {
  dropTarget.value = null
  if (!dragged.value || sortSaving.value) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'none'
  const element = (event.target as Element).closest('tr.el-table__row')
  const match = element?.className.match(/(?:^|\s)menu-row-(\d+)(?:\s|$)/)
  if (!element || !match) return
  const target = findMenu(Number(match[1]))
  if (!target || containsMenu(dragged.value, target.id)) return
  const bounds = element.getBoundingClientRect()
  const ratio = (event.clientY - bounds.top) / bounds.height
  const position = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside'
  const parent = position === 'inside' ? target : target.parent_id ? findMenu(target.parent_id) : null
  if (parent && (parent.component || containsMenu(dragged.value, parent.id))) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dropTarget.value = target.id
  dropPosition.value = position
}
function handleDragLeave(event:DragEvent) {
  if (!(event.currentTarget as Element).contains(event.relatedTarget as Node | null)) dropTarget.value = null
}
async function handleDrop(event:DragEvent) {
  event.preventDefault()
  if (!dragged.value || dropTarget.value === null || sortSaving.value) { clearDrag(); return }
  const moved = dragged.value
  const target = findMenu(dropTarget.value)
  const source = siblingsOf(moved.id)
  const position = dropPosition.value
  if (!target || !source || containsMenu(moved, target.id)) { clearDrag(); return }
  const parentId = position === 'inside' ? target.id : target.parent_id ?? null
  const parent = parentId === null ? null : findMenu(parentId)
  if (parent && (parent.component || containsMenu(moved, parent.id))) { clearDrag(); return }
  const previous = JSON.parse(JSON.stringify(tableData.value))
  const destination = position === 'inside' ? (target.children ??= []) : siblingsOf(target.id)!
  const payload = {
    id:moved.id, target_id:target.id, position,
    source_parent_id:moved.parent_id ?? null, target_parent_id:parentId,
    source_ids:source.map(row => row.id), target_ids:destination.map((row:any) => row.id),
  }
  source.splice(source.indexOf(moved), 1)
  const index = position === 'inside' ? destination.length : destination.indexOf(target) + (position === 'after' ? 1 : 0)
  destination.splice(index, 0, moved)
  moved.parent_id = parentId
  clearDrag()
  if (source === destination && source.every((row, index) => row.id === payload.source_ids[index])) return
  source.forEach((row, index) => { row.sort = index })
  destination.forEach((row:any, index:number) => { row.sort = index })
  const currentRoute = router.currentRoute.value
  const activeMenu = menuLocation(userStore.UserMenu, (_, path) => path === currentRoute.path)
  sortSaving.value = true
  try {
    await SysMenuApi.Sort(payload)
  } catch (error) {
    tableData.value = previous
    sortSaving.value = false
    console.error(error)
    return
  }
  ElMessage.success('菜单位置已保存')
  if (position === 'inside') {
    await nextTick()
    menuTableRef.value?.toggleRowExpansion(target, true)
  }
  try {
    const response = await SysAuthApi.GetMe()
    userStore.UserData = response.data
    addSyncRouter(userStore.UserMenu)
    const updated = activeMenu && menuLocation(userStore.UserMenu, row => row.id === activeMenu.id)
    if (updated && updated.path !== currentRoute.path && router.currentRoute.value.fullPath === currentRoute.fullPath) {
      await router.replace({ path:updated.path, query:currentRoute.query, hash:currentRoute.hash })
    }
  } catch (error) {
    console.error(error)
    ElMessage.warning('菜单位置已保存，侧边栏更新失败，请刷新页面')
  } finally { sortSaving.value = false }
}

const submitForm:any = ref({})


const getPageData = async () => {
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  clearDrag()
  try {
    const response = await SysMenuApi.List()
    if (request !== listRequest) return
    tableData.value = response.data.list ?? []
  } catch (error) {
    if (request !== listRequest) return
    tableData.value = []
    listError.value = '列表加载失败，请点击刷新重试'
    console.error(error)
  } finally {
    if (request === listRequest) pageLoading.value = false
  }
}

const parentMenu = computed(()=>{
  return [{
    name:'根菜单',
    id:0,
    children:tableData.value,
    path:"dashboard",
  }]
})

onMounted(()=>{
  getPageData()
})

function findParentNodes(root:any, targetId:any) {
  const result:any = [];
  const traverse = (node:any, path:any) => {
    if (node.id === targetId) {
      // 找到目标节点，将路径中的父级存入结果
      result.push(...[...path, node]);
      return true;
    }
    if (node.children) {
      // 继续遍历子节点，并传递当前路径（父级 + 当前节点）
      for (const child of node.children) {
        if (traverse(child, [...path, node])) {
          return true; // 找到后提前终止遍历
        }
      }
    }
    return false;
  };
  traverse(root[0], []); // 初始路径为空
  return result;
}

const routePrefix = computed(()=>{
  console.log(parentMenu.value,submitForm.value.parent_id)
  let treeNode = findParentNodes(parentMenu.value,submitForm.value.parent_id)
  return treeNode.reduce((pre:string,cur:any)=>{
    return pre + cur.path + "/";
  },"/")
})

const handleAdd = (defaultForm:any)=>{
  submitForm.value = {
    ...defaultForm,
    sort:defaultForm.sort || 0,
    menu_type: defaultForm.component ? 2 : 1,
    parent_id:defaultForm.parent_id || 0,
  }
  dialogOpen.value = true
}

const handleDelete = (ids:Array<any>) => confirmDelete({
  subject:"菜单",
  count:ids.length,
  description:"删除后对应导航入口将被移除，请确认菜单层级。",
  onConfirm:async ()=>{
    await SysMenuApi.Delete(ids)
    ElMessage.success("删除成功")
    await getPageData()
  },
})

const handleChangeSwitch = async (row:any,key:string) => {
  row.loading = true
  try {
    await SysMenuApi.Edit({
      ...row,
      [key]:!row[key],
    })
    ElMessage.success("修改成功")
    row.loading = false
    return true
  }catch (e) {
    row.loading = false
    return false
  }
}

const handleSubmit = async () => {
  let form = JSON.parse(JSON.stringify(submitForm.value))
  form.parent_id = form.parent_id || null
  delete form.parents
  if (!form.id){
    await SysMenuApi.Create(form)
    ElMessage.success("创建成功")
  }else{
    await SysMenuApi.Edit(form)
    ElMessage.success("修改成功")
  }
  await getPageData()
  try {
    const currentRoute = router.currentRoute.value
    const activeMenu = menuLocation(userStore.UserMenu, (_, path) => path === currentRoute.path)
    const response = await SysAuthApi.GetMe()
    userStore.UserData = response.data
    addSyncRouter(userStore.UserMenu)
    const updated = activeMenu && menuLocation(userStore.UserMenu, row => row.id === activeMenu.id)
    if (router.currentRoute.value.fullPath === currentRoute.fullPath) {
      await router.replace({path:updated?.path || currentRoute.path, query:currentRoute.query, hash:currentRoute.hash})
    }
  } catch (error) {
    console.error(error)
    ElMessage.warning('菜单已保存，导航更新失败，请刷新页面')
  }
}

</script>

<style scoped>
.sort-hint { margin-left: 12px; color: var(--el-text-color-secondary); font-size: 12px; }
.drag-handle { cursor: grab; }
.drag-handle:active { cursor: grabbing; }
.drag-handle:disabled { cursor: not-allowed; }
:deep(.is-dragging > td) { opacity: 0.5; }
:deep(.drop-before > td) { box-shadow: inset 0 2px var(--el-color-primary); }
:deep(.drop-after > td) { box-shadow: inset 0 -2px var(--el-color-primary); }
:deep(.drop-inside > td) { background: var(--el-color-primary-light-9) !important; box-shadow: inset 0 1px var(--el-color-primary), inset 0 -1px var(--el-color-primary); }

</style>
