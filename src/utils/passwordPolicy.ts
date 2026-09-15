import {computed, ref} from "vue";
import type {FormItemRule} from "element-plus";
import {SysAuthApi, type PasswordPolicy} from "../apis/sys_auth";

// 每次打开密码表单重新获取，避免配置调整后继续使用旧限制。
export function usePasswordPolicy(required:()=>boolean = ()=>true) {
    const policy = ref<PasswordPolicy>()
    const hint = computed(()=>policy.value ? `至少 ${policy.value.min_length} 个字符，最多 ${policy.value.max_bytes} 字节` : '正在读取密码规则')
    const rules:FormItemRule[] = [{
        trigger:'blur',
        validator:(_rule, value:string, callback)=>{
            if (!value) {
                callback(required() ? new Error('请输入密码') : undefined)
                return
            }
            if (!policy.value) {
                callback(new Error('密码规则未加载，请重新打开表单'))
                return
            }
            if (Array.from(value).length < policy.value.min_length) {
                callback(new Error(`密码至少需要 ${policy.value.min_length} 个字符`))
                return
            }
            if (new TextEncoder().encode(value).length > policy.value.max_bytes) {
                callback(new Error(`密码不能超过 ${policy.value.max_bytes} 字节`))
                return
            }
            callback()
        },
    }]
    const load = async ()=>{
        policy.value = undefined
        const response = await SysAuthApi.PasswordPolicy()
        policy.value = response.data
    }
    return {hint, rules, load}
}
