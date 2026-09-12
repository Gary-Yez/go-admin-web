import {h, ref} from "vue";
import {ElMessageBox} from "element-plus";
import DeleteNotice from "../components/DeleteNotice.vue";

type DeleteOptions = {
    subject:string
    count:number
    description?:string
    target?:string
    onConfirm:()=>Promise<unknown>
}

// 删除失败保留弹窗；提交中阻止重复确认、关闭及取消。
export async function confirmDelete(options:DeleteOptions):Promise<void> {
    if (options.count <= 0) return
    const error = ref('')
    try {
        await ElMessageBox({
            title:'删除确认',
            message:()=>h(DeleteNotice, {...options,error:error.value}),
            customClass:'delete-confirm-box',
            showCancelButton:true,
            confirmButtonText:'确认删除',
            cancelButtonText:'取消',
            confirmButtonClass:'delete-confirm-button',
            closeOnClickModal:false,
            autofocus:false,
            beforeClose:async (action,instance,done)=>{
                if (instance.confirmButtonLoading) return
                if (action !== 'confirm') { done(); return }
                instance.confirmButtonLoading = true
                instance.confirmButtonText = '正在删除…'
                error.value = ''
                try {
                    await options.onConfirm()
                    done()
                } catch (reason) {
                    error.value = typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : '删除失败，请重试'
                } finally {
                    instance.confirmButtonLoading = false
                    instance.confirmButtonText = '确认删除'
                }
            },
        })
    } catch { /* 取消或关闭不产生错误提示。 */ }
}
