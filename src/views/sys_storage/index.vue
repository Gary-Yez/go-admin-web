<template>
  <el-card class="container" shadow="never">
    <PageHeader title="存储管理" description="配置多个存储账号，统一管理默认上传位置和访问凭据"/>
    <el-form class="search-form" @submit.prevent="handleSearch">
      <el-input v-model="search.name" size="large" clearable prefix-icon="Search" placeholder="搜索存储名称" @blur="handleSearch" @clear="handleSearch"/>
      <el-select v-model="search.engine" size="large" clearable value-on-clear="" placeholder="全部存储引擎" @change="handleSearch">
        <el-option v-for="(label,key) in storageEngines" :key="key" :label="label" :value="key"/>
      </el-select>
      <el-select v-model="search.enabled" size="large" clearable value-on-clear="" placeholder="全部状态" @change="handleSearch">
        <el-option label="启用" :value="true"/><el-option label="停用" :value="false"/>
      </el-select>
      <el-button icon="RefreshLeft" @click="reset">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]"><el-alert :closable="false" :title="listError" type="error" show-icon/></div>
    <ColumnTable v-loading="loading" :data="rows" size="large" row-key="id" storage-key="core/views/sys_storage/index:table-1"
                 @selection-change="(items:StorageAccount[]) => selectedIds = items.map(item => item.id)" @sort-change="sortChange">
      <template #toolbar>
        <el-button v-if="!selectedIds.length" :loading="loading" icon="Refresh" @click="load">刷新</el-button>
        <el-button v-if="!selectedIds.length" type="primary" icon="Plus" @click="create">新增存储</el-button>
        <el-button v-if="selectedIds.length" type="danger" icon="Delete" :disabled="deleting" @click="remove(selectedIds)">批量删除</el-button>
      </template>
      <el-table-column type="selection" width="48"/>
      <el-table-column prop="id" label="编号" width="90" sortable="custom"/>
      <el-table-column prop="name" label="存储名称" min-width="200">
        <template #default="{row}">{{ row.name }} <el-tag v-if="row.is_default" type="primary" effect="light">默认</el-tag></template>
      </el-table-column>
      <el-table-column prop="engine" label="存储引擎" min-width="150">
        <template #default="{row}">{{ storageEngines[row.engine] || row.engine }}</template>
      </el-table-column>
      <el-table-column prop="enabled" label="允许新上传" width="130">
        <template #default="{row}"><el-switch :model-value="row.enabled"  :loading="changingId === row.id" :disabled="!!changingId" :before-change="() => toggleEnabled(row)"/></template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="170" sortable="custom">
        <template #default="{row}"><TableTime :value="row.created_at"/></template>
      </el-table-column>
      <el-table-column label="操作" width="290" fixed="right" align="center">
        <template #default="{row}">
          <div class="table-btn-group">
            <el-button v-if="!row.is_default" size="small" plain type="primary" icon="Star" :disabled="!row.enabled || !!changingId" @click="setDefault(row)">设为默认</el-button>
            <el-button size="small" plain type="primary" icon="Edit" :disabled="editing" @click="edit(row.id)">编辑</el-button>
            <el-button size="small" plain type="danger" icon="Delete" :disabled="deleting" @click="remove([row.id])">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty><el-empty v-if="!loading" :image-size="70" :description="listError ? '加载失败，请刷新重试' : '暂无存储账号，请先新增存储'"/></template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.limit" :total="total" :page-sizes="[10,30,50,100]" background layout="total, sizes, prev, pager, next, jumper"/>
    </div>
    <FormDialog v-model="open" v-model:form="form" :title="dialogTitle" :max-width="600" :on-confirm="save"
                description="同一引擎可以添加多个账号。停用只阻止新上传，已有文件仍可访问。">
      <template v-if="form.params">
        <el-form-item label="存储名称" prop="name" :rules="[{required:true, whitespace:true, message:'请输入存储名称', trigger:'blur'}]">
          <el-input v-model="form.name" size="large" maxlength="191" placeholder="例如 商品图片、业务附件"/>
        </el-form-item>
        <el-form-item label="存储引擎" prop="engine">
          <el-select v-model="form.engine" size="large" :disabled="inUse" @change="changeEngine">
            <el-option v-for="(label,key) in storageEngines" :key="key" :label="label" :value="key"/>
          </el-select>
        </el-form-item>
        <div v-if="inUse" class="mb-[12px]">
          <el-alert :closable="false" title="已有文件引用此存储，位置参数不可更改；访问凭据可以更新。" type="info" show-icon/>
        </div>
        <el-form-item v-for="field in storageFields[form.engine]" :key="field.key" :label="field.label" :prop="'params.' + field.key"
                      :rules="field.required ? [{required:true, whitespace:true, message:'请填写' + field.label, trigger:'blur'}] : []">
          <el-input :model-value="String(form.params[field.key])" size="large" :type="field.secret ? 'password' : 'text'"
                    :show-password="field.secret" :disabled="inUse && field.location"
                    :placeholder="field.secret && form.id ? '留空保留原值，填写则替换' : field.placeholder"
                    autocomplete="off" @update:model-value="(value: string) => setParam(field.key, value)"/>
        </el-form-item>
        <el-form-item v-if="form.engine === 's3'" label="路径式访问">
          <el-switch v-model="form.params.path_style" :disabled="inUse"/><span class="storage-hint">MinIO 可按部署设置开启</span>
        </el-form-item>
        <el-form-item label="允许新上传"><el-switch v-model="form.enabled" /></el-form-item>
        <el-form-item label="设为默认存储"><el-switch v-model="form.is_default" :disabled="!form.enabled"/></el-form-item>
      </template>
    </FormDialog>
  </el-card>
</template>
<script setup lang="ts">
import {onMounted, onBeforeUnmount, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import TableTime from "../../components/TableTime.vue";
import FormDialog from "../../components/FormDialog.vue";
import {confirmDelete} from "../../utils/confirmDelete";
import {SysStorageApi, storageEngines, emptyStorageParams, type StorageAccount, type StorageForm, type StorageParams, type StorageQuery} from "../../apis/sys_storage";
import {storageFields} from "./fields";

const emptySearch = () => ({name:'',engine:'',enabled:'' as boolean | ''})
const search = ref(emptySearch())
const query = ref<StorageQuery>({page:1,limit:10,filters:[],sorts:[]})
const rows = ref<StorageAccount[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])
const loading = ref(false)
const editing = ref(false)
const deleting = ref(false)
const changingId = ref(0)
const listError = ref('')
const open = ref(false)
const dialogTitle = ref('')
const inUse = ref(false)
const emptyForm = ():StorageForm => ({id:0,name:'',engine:'local',enabled:true,is_default:false,params:emptyStorageParams()})
const form = ref<StorageForm>(emptyForm())
let requestId = 0
async function load() {
  const id = ++requestId
  loading.value = true; listError.value = ''; selectedIds.value = []
  try {
    const response = await SysStorageApi.List({...query.value})
    if (id !== requestId) return
    rows.value = response.data.list || []; total.value = response.data.total
  } catch {
    if (id !== requestId) return
    rows.value = []; total.value = 0; listError.value = '存储列表加载失败，请刷新重试'
  } finally { if (id === requestId) loading.value = false }
}
function handleSearch() {
  const filters:StorageQuery['filters'] = []
  if (search.value.name.trim()) filters.push({field:'name',operator:'like',value:search.value.name.trim()})
  if (search.value.engine) filters.push({field:'engine',operator:'=',value:search.value.engine})
  if (search.value.enabled !== '') filters.push({field:'enabled',operator:'=',value:search.value.enabled})
  query.value = {...query.value,page:1,filters}
}
function reset() {search.value = emptySearch();handleSearch()}
function sortChange({prop,order}:{prop:string;order:string | null}) {
  query.value = {...query.value,page:1,sorts:order && ['id','created_at'].includes(prop) ? [{field:prop,order:order === 'ascending' ? 'asc' : 'desc'}] : []}
}
function create() {
  form.value = emptyForm(); form.value.params.root = './uploads'
  dialogTitle.value = '新增存储'; inUse.value = false; open.value = true
}
async function edit(id:number) {
  editing.value = true
  try {
    const response = await SysStorageApi.Get(id)
    form.value = {...response.data.storage,params:response.data.params}
    inUse.value = response.data.in_use
    dialogTitle.value = '编辑存储'; open.value = true
  } catch { /* 请求层统一提示。 */ }
  finally { editing.value = false }
}
function changeEngine() {
  form.value.params = emptyStorageParams()
  if (form.value.engine === 'local') form.value.params.root = './uploads'
}
function setParam(key:keyof StorageParams,value:string) {
  if (key !== 'path_style') form.value.params[key] = value
}
async function setDefault(row:StorageAccount) {
  if (changingId.value) return
  changingId.value = row.id
  try {
    await SysStorageApi.SetDefault(row.id)
    ElMessage.success('已设为默认存储')
    await load()
  } catch { /* 请求层统一提示。 */ }
  finally { changingId.value = 0 }
}
async function toggleEnabled(row:StorageAccount):Promise<boolean> {
  if (changingId.value) return false
  changingId.value = row.id
  const enabled = !row.enabled
  try {
    await SysStorageApi.SetEnabled(row.id, enabled)
    row.enabled = enabled
    if (!enabled) row.is_default = false
    ElMessage.success(enabled ? '已启用存储' : '已停用存储')
    await load()
  } catch { /* 请求失败保留原状态，请求层统一提示。 */ }
  finally { changingId.value = 0 }
  // 状态由接口结果更新，阻止开关在刷新列表后再次反转。
  return false
}
async function save() {
  await SysStorageApi.Save(form.value)
  ElMessage.success('存储已保存')
  await load()
}
async function remove(ids:number[]) {
  const selected = [...ids]
  await confirmDelete({subject:'存储账号',count:selected.length,description:'只删除未被文件或上传会话引用的账号，不删除存储桶及目录。',onConfirm:async () => {
    deleting.value = true
    try {await SysStorageApi.Delete(selected);ElMessage.success('存储账号已删除')}
    finally {deleting.value = false;await load()}
  }})
}
watch(() => form.value.enabled, enabled => { if (!enabled) form.value.is_default = false })
watch(query, load, {deep:true})
onMounted(load)
onBeforeUnmount(() => {requestId++})
</script>
<style scoped>
.storage-hint { margin-left: 10px; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
