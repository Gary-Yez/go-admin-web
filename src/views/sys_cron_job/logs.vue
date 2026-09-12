<template>
  <el-drawer v-model="show" size="50vw" title="执行日志">
    <FormNote title="执行记录" description="查看各批次的计划时间、执行实例与运行结果。" icon="Tickets" />
    <div v-if="listError" class="mb-[12px]">
      <el-alert :title="listError" type="error" :closable="false" show-icon />
    </div>
    <ColumnTable storage-key="core/views/sys_cron_job/logs:table-1" size="large" :data="tableData" v-loading="pageLoading" row-key="id">
      <template #toolbar>
        <el-button icon="Refresh" :loading="pageLoading" @click="getPageData">刷新</el-button>
      </template>
      <el-table-column label="ID" prop="id" :width="100">
        <template #default="{ row }">
          <span class="text-[12px]">{{ row.id }}</span>
        </template>
      </el-table-column>
      <el-table-column label="计划时间" prop="scheduled_at" :width="150">
        <template #default="{ row }"><TableTime :value="row.scheduled_at" /></template>
      </el-table-column>
      <el-table-column label="执行实例" prop="instance" :min-width="160" />
      <el-table-column label="开始时间" prop="start_time" :width="150">
        <template #default="{ row }">
          <TableTime :value="row.start_time" />
        </template>
      </el-table-column>
      <el-table-column label="结束时间" prop="end_time" :width="150">
        <template #default="{ row }">
          <TableTime :value="row.end_time" />
        </template>
      </el-table-column>
      <el-table-column label="用时" :width="100">
        <template #default="{ row }">
          <el-tag v-if="row.end_time" type="primary">{{ ((+new Date(row.end_time) - +new Date(row.start_time))/ 1000).toFixed(2)}} 秒</el-tag><span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="执行结果" :width="100">
        <template #default="{ row }">
          <el-tag v-if="row.status === 'running'" type="warning">执行中</el-tag><el-tag v-else-if="row.status === 'interrupted'" type="info">已中断</el-tag><el-tag v-else-if="row.status === 'success'" type="success">成功</el-tag>
          <el-tag v-else type="danger">失败</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="失败原因">
        <template #default="{ row }">
          <span class="text-[12px]">{{ row.error || (row.status === 'running' ? '等待执行结束；若实例已退出，此批次不会自动重试' : '—') }}</span>
        </template>
      </el-table-column>
    <template #empty><el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : '暂无执行日志'" :image-size="70" /></template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.limit"
          :page-sizes="[10, 30, 50, 100]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @change="getPageData"
      />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import FormNote from "../../components/FormNote.vue";
import TableTime from "../../components/TableTime.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import {onMounted, ref} from "vue";
  import {SysCronJobApi} from "../../apis/sys_cron_job.ts";
  const props:any = defineProps({
    job:{
      type:Object,
    }
  })
  const listError = ref('')
  let listRequest = 0
  const pageLoading = ref(true);
  const show = ref(false);
  const tableData = ref([])
  const total = ref(0)
  const queryForm:any = ref({
    page:1,
    limit:10,
  })

  onMounted(()=>{
    console.log(props.job)
  })

const getPageData = async () => {
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  try {
    const response = await SysCronJobApi.GetLogs({ ...queryForm.value })
    if (request !== listRequest) return
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

  defineExpose({
    showLog(row:any){
      tableData.value = []
      total.value = 0
      queryForm.value = {
        page: 1,
        limit: 10,
        filters:[{
          field:"job_id",
          operator:"=",
          value:`${row.id}`
        }]
      }
      show.value = true
      getPageData()
    },
  })
</script>

<style scoped lang="less">
</style>
