<template>
  <div class="profile-page">
    <el-card class="profile-title" shadow="never">
      <PageHeader title="个人信息" description="管理你的账号资料、安全设置与联系方式" />
    </el-card>
    <div class="profile-layout">
      <el-card class="profile-card" shadow="never">
        <div class="profile-identity">
          <el-avatar :src="userStore.UserData.avatar || '/img/user.png'" :size="112" />
          <div class="profile-name">
            <h3>{{ userStore.UserData.nickname || userStore.UserData.username }}</h3>
            <el-button text :icon="EditPen" aria-label="修改昵称" @click="openInfo('nickname')" />
          </div>
          <el-tag v-if="userStore.UserData.role?.name" type="primary" effect="light">{{ userStore.UserData.role.name }}</el-tag>
        </div>
        <dl class="profile-details">
          <div><el-icon><User /></el-icon><dt>登录账号</dt><dd>{{ userStore.UserData.username || '未设置' }}</dd></div>
          <div><el-icon><Phone /></el-icon><dt>手机号码</dt><dd>{{ userStore.UserData.phone || '未设置' }}</dd></div>
          <div><el-icon><Message /></el-icon><dt>邮箱地址</dt><dd>{{ userStore.UserData.email || '未设置' }}</dd></div>
        </dl>
      </el-card>
      <el-card class="settings-card" shadow="never">
        <template #header><h3>账号资料设置</h3><p>统一管理联系方式与账号密码</p></template>
        <div class="setting-row">
          <div class="setting-label"><h4>头像</h4><p>用于系统内个人资料展示</p></div>
          <div class="setting-value"><el-avatar :src="userStore.UserData.avatar || '/img/user.png'" :size="36" /></div>
        </div>
        <div class="setting-row">
          <div class="setting-label"><h4>昵称</h4><p>用于系统内显示的个人名称</p></div>
          <div class="setting-value">{{ userStore.UserData.nickname || '未设置' }}</div>
          <el-button @click="openInfo('nickname')">修改昵称</el-button>
        </div>
        <div class="setting-row">
          <div class="setting-label"><h4>手机号码</h4><p>保持你的联系方式为最新状态</p></div>
          <div class="setting-value">{{ userStore.UserData.phone || '未设置' }}</div>
          <el-button @click="openInfo('phone')">修改手机</el-button>
        </div>
        <div class="setting-row">
          <div class="setting-label"><h4>邮箱地址</h4><p>管理账号的联系邮箱</p></div>
          <div class="setting-value">{{ userStore.UserData.email || '未设置' }}</div>
          <el-button @click="openInfo('email')">修改邮箱</el-button>
        </div>
        <div class="setting-row">
          <div class="setting-label"><h4>账号密码</h4><p>修改成功后，需要重新登录</p></div>
          <div class="setting-value password-value">••••••••</div>
          <el-button @click="openPassword">修改密码</el-button>
        </div>
      </el-card>
    </div>
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px" class="profile-dialog" :before-close="closeDialog" :close-on-click-modal="false" destroy-on-close @closed="clearForms">
      <el-form v-if="dialog === 'info'" ref="infoRef" :model="infoForm" label-position="top" :disabled="submitting" @submit.prevent="saveInfo">
        <el-form-item :label="fieldLabels[infoField]" :prop="infoField" :rules="[{required:true,message:'请输入' + fieldLabels[infoField],trigger:'blur'}]">
          <el-input size="large" v-model="infoForm[infoField]" :placeholder="'请输入' + fieldLabels[infoField]" />
        </el-form-item>
      </el-form>
      <el-form v-else-if="dialog === 'password'" ref="passwordRef" :model="passwordForm" label-position="top" :disabled="submitting" @submit.prevent="savePassword">
        <el-form-item label="旧密码" prop="old_password" :rules="[{required:true,message:'请输入旧密码',trigger:'blur'}]">
          <el-input size="large" v-model="passwordForm.old_password" type="password" show-password autocomplete="current-password" placeholder="请输入旧密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="new_password" :rules="passwordRules">
          <el-input size="large" v-model="passwordForm.new_password" type="password" show-password autocomplete="new-password" :placeholder="passwordHint" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm_password" :rules="[{required:true,message:'请再次输入新密码',trigger:'blur'},{validator:validatePassword,trigger:'blur'}]">
          <el-input size="large" v-model="passwordForm.confirm_password" type="password" show-password autocomplete="new-password" placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="submitting" @click="closeDialog()">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="dialog === 'info' ? saveInfo() : savePassword()">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {usePasswordPolicy} from "../../utils/passwordPolicy.ts";
import PageHeader from "../../components/PageHeader.vue";
  import {computed, ref} from "vue";
  import {ElMessage} from "element-plus";
  import type {FormInstance} from "element-plus";
  import {EditPen, Message, Phone, User} from "@element-plus/icons-vue";
  import {useUserStore} from "../../stores/user.ts";
  import {SysAuthApi} from "../../apis/sys_auth.ts";

  const userStore = useUserStore()
  const {hint:passwordHint, rules:passwordRules, load:loadPasswordPolicy} = usePasswordPolicy()
  const dialog = ref<'info' | 'password'>('info')
  const dialogVisible = ref(false)
  const submitting = ref(false)
  const fieldLabels = {nickname:'昵称',phone:'手机号码',email:'邮箱地址'}
  const infoField = ref<keyof typeof fieldLabels>('nickname')
  const infoRef = ref<FormInstance>()
  const passwordRef = ref<FormInstance>()
  const infoForm = ref({nickname:'',phone:'',email:''})
  const newPasswordForm = ()=>({old_password:'',new_password:'',confirm_password:''})
  const passwordForm = ref(newPasswordForm())
  const dialogTitle = computed(()=>dialog.value === 'info' ? '修改' + fieldLabels[infoField.value] : '修改密码')
  const openInfo = (field:keyof typeof fieldLabels)=>{
    infoForm.value = {nickname:userStore.UserData.nickname || '',phone:userStore.UserData.phone || '',email:userStore.UserData.email || ''}
    infoField.value = field
    dialog.value = 'info'
    dialogVisible.value = true
  }
  const openPassword = async ()=>{
    try { await loadPasswordPolicy() }
    catch { return }
    passwordForm.value = newPasswordForm()
    dialog.value = 'password'
    dialogVisible.value = true
  }
  const closeDialog = (done?:()=>void)=>{
    if (submitting.value) return
    dialogVisible.value = false
    done?.()
  }
  const clearForms = ()=>{ passwordForm.value = newPasswordForm(); infoRef.value?.clearValidate(); passwordRef.value?.clearValidate() }
  const validatePassword = (_rule:unknown,value:string,callback:(error?:Error)=>void)=>{
    callback(value !== passwordForm.value.new_password ? new Error('两次输入的密码不一致') : undefined)
  }
  const saveInfo = async ()=>{
    if (submitting.value) return
    submitting.value = true
    try {
      if (!await infoRef.value?.validate().catch(()=>false)) return
      await SysAuthApi.ChangeInfo({...infoForm.value})
      await userStore.getUserData()
      ElMessage.success('修改成功')
      dialogVisible.value = false
    } catch { /* 请求错误由拦截器统一提示。 */ }
    finally { submitting.value = false }
  }
  const savePassword = async ()=>{
    if (submitting.value) return
    submitting.value = true
    try {
      if (!await passwordRef.value?.validate().catch(()=>false)) return
      const response = await SysAuthApi.ChangePassword({...passwordForm.value})
      userStore.setAccessToken(response.data.token)
      dialogVisible.value = false
      ElMessage.success('密码已修改，其他登录已失效')
    } catch { /* 请求错误由拦截器统一提示。 */ }
    finally { submitting.value = false }
  }
</script>

<style scoped lang="less">
.profile-page { width: 100%; }
.profile-title {
  margin-bottom: 12px;
  :deep(.el-card__body) { padding: 16px 20px; }
}
.profile-layout { display: grid; grid-template-columns: minmax(250px, 1fr) minmax(0, 2fr); gap: 12px; align-items: stretch; }
.profile-card, .settings-card, .profile-title { border-radius: 6px; }
.profile-card :deep(.el-card__body) { padding: 20px; }
.profile-identity { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 0 22px; }
.profile-name {
  display: flex; align-items: center; justify-content: center; gap: 4px; max-width: 100%;
  h3 { margin: 0; font-size: 18px; font-weight: 600; overflow-wrap: anywhere; color: var(--el-text-color-primary); }
  .el-button { padding: 4px; height: auto; color: var(--el-text-color-secondary); }
}
.profile-details {
  margin: 0; border-top: 1px solid var(--el-border-color-lighter);
  > div { position: relative; padding: 18px 0 0 24px; }
  .el-icon { position: absolute; top: 20px; left: 0; color: var(--el-text-color-placeholder); }
  dt { color: var(--el-text-color-secondary); font-size: 13px; }
  dd { margin: 6px 0 0; font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; color: var(--el-text-color-primary); }
}
.settings-card {
  min-width: 0;
  :deep(.el-card__header) { padding: 16px 20px; }
  :deep(.el-card__body) { padding: 0 20px; }
  h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--el-text-color-primary); }
  :deep(.el-card__header) p { margin: 8px 0 0; font-size: 13px; color: var(--el-text-color-secondary); }
}
.setting-row {
  display: grid; grid-template-columns: minmax(180px, 1fr) minmax(0, 1.2fr) auto; align-items: center; gap: 20px; min-height: 76px; padding: 14px 0; box-sizing: border-box; border-bottom: 1px solid var(--el-border-color-lighter);
  &:last-child { border-bottom: 0; }
  h4 { margin: 0; font-size: 14px; font-weight: 400; color: var(--el-text-color-primary); }
  > .el-button { min-width: 88px; }
}
.setting-value { font-size: 14px; line-height: 1.6; color: var(--el-text-color-regular); overflow-wrap: anywhere; }
.password-value { letter-spacing: 3px; }
:deep(.profile-dialog) { max-width: calc(100vw - 32px); }
@media (max-width: 900px) {
  .profile-layout { grid-template-columns: minmax(0, 1fr); }
  .profile-identity { padding-bottom: 16px; }
  .profile-details { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
}
@media (max-width: 580px) {
  .profile-details { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .setting-row { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; padding: 16px 0; }
  .setting-label { grid-column: 1; }
  .setting-value { grid-column: 1; grid-row: 2; }
  .setting-row > .el-button { grid-column: 2; grid-row: 1 / 3; }
  .settings-card :deep(.el-card__body) { padding: 0 16px; }
}
</style>