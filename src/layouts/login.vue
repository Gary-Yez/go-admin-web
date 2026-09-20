<template>
  <main class="login-page">
    <section aria-labelledby="login-title" class="login-card">
      <div class="login-brand">
        <img :src="siteStore.logoURL" alt="" height="36" width="36">
        <span>{{ siteStore.info.name || 'Go Admin' }}</span>
      </div>
      <div class="login-heading">
        <h1 id="login-title">欢迎登录</h1>
        <p>使用管理员账号登录，开始管理你的工作。</p>
      </div>
      <el-form ref="formRef" :model="submitForm" label-position="top" @submit.prevent="handleSubmit">
        <el-form-item :rules="[{ required:true,message:'请输入用户名',trigger:'blur' }]" label="用户名" prop="username">
          <el-input v-model="submitForm.username" :disabled="submitting" :prefix-icon="User" autocomplete="username"
                    name="username" placeholder="请输入用户名" size="large"/>
        </el-form-item>
        <el-form-item :rules="[{ required:true,message:'请输入密码',trigger:'blur' }]" label="密码" prop="password">
          <el-input v-model="submitForm.password" :disabled="submitting" :prefix-icon="Lock" autocomplete="current-password"
                    name="password" placeholder="请输入密码" show-password size="large"
                    type="password"/>
        </el-form-item>
        <div class="login-options">
          <el-checkbox v-model="isRemember" :disabled="submitting" @change="handleRememberChange">记住账号</el-checkbox>
          <span>密码可由浏览器保存</span>
        </div>
        <el-button :loading="submitting" class="login-button" native-type="submit" type="primary">
          {{ submitting ? '正在登录' : '登录' }}
        </el-button>
      </el-form>
      <div class="login-footer">
        <el-icon>
          <Lock/>
        </el-icon>
        <span>请妥善保管你的账号信息</span></div>
      <div v-if="siteStore.info.copyright" class="login-copyright">{{ siteStore.info.copyright }}</div>
    </section>
  </main>
</template>

<script lang="ts" setup>
import {ref} from "vue";
import type {FormInstance} from "element-plus";
import {ElMessage} from "element-plus";
import {Lock, User} from "@element-plus/icons-vue";
import {SysAuthApi} from "../apis/sys_auth";
import {useUserStore} from "../stores/user";
import {useRouter} from "vue-router";
import {readRememberedUsername, saveRememberedUsername} from "../utils/rememberAccount";

import {useSiteStore} from "../stores/site";

const siteStore = useSiteStore()
const userStore = useUserStore()
const router = useRouter()
const formRef = ref<FormInstance>()
const username = readRememberedUsername()
const submitForm = ref({username, password: ""})
const isRemember = ref(!!username)
const submitting = ref(false)

const handleRememberChange = () => {
  if (!isRemember.value && !saveRememberedUsername("")) {
    ElMessage.warning("浏览器无法清除已保存的账号，请检查存储设置")
  }
}

const handleSubmit = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    const response = await SysAuthApi.Login(submitForm.value)
    userStore.setAccessToken(response.data.token)
    if (!saveRememberedUsername(isRemember.value ? submitForm.value.username : "")) {
      ElMessage.warning("账号记忆设置未能保存")
    }
    await router.replace('/dashboard')
  } catch { /* 登录错误由请求拦截器统一提示。 */
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  overflow-y: auto;
  padding: 40px 20px;
  background: var(--main-bg-light-color);
}

.login-card {
  width: 440px;
  max-width: 100%;
  flex-shrink: 0;
  margin: auto;
  padding: 40px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  background: var(--el-bg-color);
  box-shadow: 0 12px 40px rgb(15 23 42 / 5%);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 32px;
  color: var(--el-text-color-primary);
  font-size: 15px;
  font-weight: 600;
}

.login-copyright {
  margin-top: 16px;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.login-brand img {
  display: block;
  flex-shrink: 0;
  object-fit: contain;
}

.login-brand span {
  min-width: 0;
  line-height: 24px;
  overflow-wrap: anywhere;
}

.login-heading {
  margin-bottom: 28px;
}

.login-heading h1 {
  margin: 0 0 10px;
  color: var(--el-text-color-primary);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 1px;
}

.login-heading p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.login-card :deep(.el-form-item) {
  margin-bottom: 22px;
}

.login-card :deep(.el-form-item__label) {
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}

.login-card :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: -4px 0 20px;
}

.login-options .el-checkbox {
  margin-right: 0;
}

.login-options > span {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.login-button {
  width: 100%;
  height: 42px;
  border-radius: 8px;
  font-weight: 500;
}

.login-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 28px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

@media (max-width: 480px) {
  .login-page {
    padding: 24px 16px;
  }

  .login-card {
    padding: 28px 24px;
  }

  .login-brand {
    margin-bottom: 26px;
  }
}
</style>
