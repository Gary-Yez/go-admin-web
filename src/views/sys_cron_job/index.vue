<template>
  <el-card class="container" shadow="never">
    <PageHeader title="计划任务" description="配置执行计划，查看任务状态与运行记录" />
    <div v-if="listError" class="mb-[12px]">
      <el-alert :title="listError" type="error" :closable="false" show-icon />
    </div>
    <ColumnTable @sort-change="handleSortChange" storage-key="core/views/sys_cron_job/index:table-1" v-loading="pageLoading" size="large" :data="tableData"  @selection-change="handleSelectionChange">
      <template #toolbar>
        <el-button v-if="multipleSelection.length <= 0" icon="Refresh" :loading="pageLoading" @click="getPageData">刷新</el-button>
        <el-button v-if="multipleSelection.length <= 0" type="primary" icon="Plus" @click="()=>handleAdd({enable:true})">新增</el-button>
        <el-button v-if="multipleSelection.length > 0" type="danger" icon="Delete" @click="()=>handleDelete(multipleSelection)">批量删除</el-button>
      </template>
      <el-table-column type="selection"></el-table-column>
      <el-table-column label="编号" prop="id" sortable="custom" :width="100"></el-table-column>
      <el-table-column label="名称" prop="name"></el-table-column>
      <el-table-column label="执行任务" prop="handler_key">
        <template #default="{ row }">
          <el-tag v-if="handlers[row.handler_key]">{{ handlers[row.handler_key]?.name }}</el-tag>
          <el-tag v-else type="warning">未注册（{{ row.handler_key }}）</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="执行周期" prop="cron">
        <template #default="{ row }">
          <span class="text-[14px]">{{ transSpecToStr(row.cron) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="是否启用" prop="enable">
        <template #default="{ row }">
          <el-tag v-if="row.enable" type="success">运行中</el-tag>
          <el-tag v-else type="danger">未运行</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近执行时间" prop="last_run_time">
        <template #default="{ row }">
          <TableTime :value="row.last_run_time" />
        </template>
      </el-table-column>
      <el-table-column label="下次执行时间" prop="next_run_time">
        <template #default="{ row }">
          <TableTime :value="row.next_run_time" />
        </template>
      </el-table-column>
      <el-table-column label="操作" :width="300" fixed="right" align="center">
        <template #default="{ row }">
          <div class="table-btn-group">
            <el-button type="primary" icon="Edit" plain size="small" @click="()=>handleAdd(row)">编辑</el-button>
            <el-button type="primary" icon="Tickets" plain size="small" @click="()=>handleShowLog(row)">查看日志</el-button>
            <el-button type="danger" icon="Delete" plain size="small" @click="()=>handleDelete([row.id])">删除</el-button>
          </div>
        </template>
      </el-table-column>
    <template #empty><el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : '暂无计划任务'" :image-size="70" /></template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.limit"
          :page-sizes="[10, 30, 50, 100]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          
      />
    </div>
    <FormDialog description="选择执行任务并设置运行计划，可通过执行日志查看运行结果。" note-icon="Clock" v-model="dialogOpen" v-model:form="submitForm" :title="`${ submitForm.id ? '修改' : '新增' }计划任务`" :on-confirm="handleSubmit">
      <el-form-item label="名称" prop="name" :rules="[{required:true,message:'名称不能为空'}]">
        <el-input size="large" v-model="submitForm.name" placeholder="请输入名称"></el-input>
      </el-form-item>
      <el-form-item label="执行任务" prop="handler_key" :rules="[{required:true,message:'执行任务不能为空'}]">
        <el-select size="large" v-model="submitForm.handler_key">
          <el-option v-for="(handler,key) in handlers" :label="handler.name" :value="key"></el-option>
        </el-select>
      </el-form-item>
      <template v-if="handlers[submitForm.handler_key]?.params">
        <el-form-item v-for="item in handlers[submitForm.handler_key]?.params" :label="item.name" :prop="`params.${item.key}`" :rules="[{required:item.required,message:`${item.name}是必需的`}]">
          <el-input size="large" v-if="item.type === 'string'" v-model="submitForm.params[item.key]" :placeholder="`请输入${item.name}`"></el-input>
          <el-input-number size="large" v-if="item.type === 'int'" v-model="submitForm.params[item.key]" :placeholder="item.name"></el-input-number>
          <el-switch v-if="item.type === 'bool'" v-model="submitForm.params[item.key]" :active-value="true" :inactive-value="false"></el-switch>
        </el-form-item>
      </template>
      <el-form-item label="执行时区">
        <span>{{ submitForm.timezone === 'Asia/Shanghai' ? '北京时间（Asia/Shanghai）' : submitForm.timezone || '北京时间' }}</span>
      </el-form-item>
      <el-form-item label="执行周期" prop="cron" :rules="[{validator:checkCron}]">
        <el-row :gutter="10" class="w-full">
          <el-col :span="6">
            <el-select size="large" v-model="submitForm.specType" class="w-full">
              <el-option v-for="(item,key) in cronMethod" :label="item.label" :value="key"></el-option>
            </el-select>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'week')" :span="6">
            <el-select size="large" v-model="submitForm.week">
              <el-option v-for="(value,index) in weeks" :label="value" :value="index + 1"></el-option>
            </el-select>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'day')" :span="6">
            <el-input-number size="large" v-model="submitForm.day" :controls="false" class="w-[100%!important]" :min="1" :max="31" :value-on-clear="1">
              <template #suffix>日</template>
            </el-input-number>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'hour')" :span="6">
            <el-input-number size="large" v-model="submitForm.hour" :controls="false" class="w-[100%!important]" :min="0" :max="24" :value-on-clear="0">
              <template #suffix>小时</template>
            </el-input-number>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'minute')" :span="6">
            <el-input-number size="large" v-model="submitForm.minute" :controls="false" class="w-[100%!important]" :min="submitForm.specType =='perNMinute' ? 1 : 0 " :max="59" :value-on-clear="submitForm.specType =='perNMinute' ? 1 : 0">
              <template #suffix>分钟</template>
            </el-input-number>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'second')" :span="6">
            <el-input-number size="large" v-model="submitForm.second" :controls="false" class="w-[100%!important]" :min="1" :max="3600" :value-on-clear="1">
              <template #suffix>秒</template>
            </el-input-number>
          </el-col>
        </el-row>
      </el-form-item>
      <el-form-item label="是否启用" prop="enable">
        <el-switch v-model="submitForm.enable" :active-value="true" :inactive-value="false"></el-switch>
      </el-form-item>
    </FormDialog>
    <Logs ref="logRef"></Logs>
  </el-card>
</template>

<script setup lang="ts">
import {watch} from "vue";
import {confirmDelete} from "../../utils/confirmDelete";
import TableTime from "../../components/TableTime.vue";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import { SysCronJobApi } from "../../apis/sys_cron_job";
import { ElMessage } from "element-plus";
import FormDialog from "../../components/FormDialog.vue";
import {onMounted, ref} from "vue";
import {cronMethod, needShow, transObjToSpec, transSpecToObj, transSpecToStr, weeks} from "./helper.ts";
import Logs from "./logs.vue";
const logRef = ref();
const dialogOpen = ref(false)
const queryForm = ref({
  page:1,
    sorts:[] as Array<{field:string;order:string}>,
  limit:10
})
const listError = ref('')
let listRequest = 0
const pageLoading = ref(true)
const total = ref(0)
const multipleSelection:any = ref([])
const handlers = ref<Record<string, {
  name:string
  params?:{name:string;key:string;type:string;required:boolean}[]
}>>({})
const tableData = ref([])
const submitForm:any = ref({})

const checkCron = (_rule:any, _value:any, callback: any) => {
  let result = transObjToSpec(
      submitForm.value.specType,
      submitForm.value.week,
      submitForm.value.day,
      submitForm.value.hour,
      submitForm.value.minute,
      submitForm.value.second,
      submitForm.value.timezone,
  )
  if (!result){
    callback("执行周期设置不正确，请检查")
  }else{
    callback()
  }
}


const getPageData = async () => {
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  multipleSelection.value = []
  try {
    const [response, handlerResponse] = await Promise.all([
      SysCronJobApi.List({ ...queryForm.value }),
      SysCronJobApi.GetRegisteredHandler(),
    ])
    if (request !== listRequest) return
    handlers.value = handlerResponse.data ?? {}
    tableData.value = response.data.list ?? []
    total.value = response.data.total
  } catch (error) {
    if (request !== listRequest) return
    tableData.value = []
    total.value = 0
    listError.value = '列表加载失败，请点击刷新重试'
    console.error(error)
  } finally {
    if (request === listRequest) pageLoading.value = false
  }
}


const handleSelectionChange = (val:Array<any>) => {
  multipleSelection.value = val.map(item=>item.id)
}

const handleAdd = (defaultForm:any)=>{
  submitForm.value = {
    ...defaultForm,
    params: defaultForm.params ? JSON.parse(defaultForm.params)  : {},
    ...transSpecToObj(defaultForm.cron),
    max_concurrency:defaultForm.max_concurrency || 1
  }
  dialogOpen.value = true
}

const handleShowLog = (row:any)=>{
  // logsOpen.value = true
  logRef.value.showLog(row)
}

const handleDelete = (ids:Array<any>) => confirmDelete({
  subject:"计划任务",
  count:ids.length,
  description:"删除后不再安排该任务的新批次，已经开始的执行不会因此中止。",
  onConfirm:async ()=>{
    await SysCronJobApi.Delete(ids)
    ElMessage.success("删除成功")
    await getPageData()
  },
})

const handleSubmit = async ()=>{
  submitForm.value.cron = transObjToSpec(
      submitForm.value.specType,
      submitForm.value.week,
      submitForm.value.day,
      submitForm.value.hour,
      submitForm.value.minute,
      submitForm.value.second,
      submitForm.value.timezone,
  )
  if (!submitForm.value.id){
    await SysCronJobApi.Create(submitForm.value)
    ElMessage.success("创建成功")
  }else{
    await SysCronJobApi.Edit(submitForm.value)
    ElMessage.success("修改成功")
  }
  getPageData()
}

onMounted(()=>{
  getPageData()
})
const handleSortChange = ({prop,order}:{prop:string;order:'ascending'|'descending'|null})=>{
  queryForm.value.sorts = ['id'].includes(prop) && order ? [{field:prop,order:order === 'ascending' ? 'asc' : 'desc'}] : []
  queryForm.value.page = 1
}
watch(queryForm, ()=>{ getPageData() }, {deep:true})
</script>


<style scoped>

</style>
