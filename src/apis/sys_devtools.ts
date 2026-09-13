import {request} from "../utils/request.ts";

export interface GeneratorField {
    id: number
    name: string
    key: string
    type: string
    chinese_name: string
    index_type: string
    query_type: string
    sortable: boolean
    table_show: boolean
    editable: boolean
    required: boolean
}

// 内置字段固定显示并支持排序，不从历史配置恢复。
export function createBuiltinFields():GeneratorField[] {
    return [
        {name:'id',key:'Id',type:'uint',chinese_name:'编号'},
        {name:'created_at',key:'CreatedAt',type:'time.Time',chinese_name:'创建时间'},
        {name:'updated_at',key:'UpdatedAt',type:'time.Time',chinese_name:'更新时间'},
    ].map((field,index)=>{
        return {...field,id:-(index+1),index_type:field.name === 'id' ? 'primaryKey' : '',query_type:'',editable:false,required:false,
            table_show:true,sortable:true}
    })
}

export interface GenerateConfig {
    create_menu: boolean
    menu_name: string
    menu_parent_key: string
    menu_icon: string
    module_name: string
    chinese_module_name: string
    model_name: string
    use_soft_delete: boolean
    create_curd: boolean
    allow_create: boolean
    allow_edit: boolean
    allow_delete: boolean
    fields: GeneratorField[]
    overwrite_files?: Record<string, string>
}

export interface PreviewFile {
    path: string
    content: string
    action: 'create' | 'unchanged' | 'modify' | 'conflict'
    existing_content?: string
    existing_hash?: string
    requires_overwrite: boolean
}

export interface HistoryQuery { page: number; limit: number; keyword?: string }
export interface HistoryDeletePlan {
    token: string
    files: Array<{ path: string; action: 'delete' | 'modify' | 'missing' | 'unchanged'; existing_hash?: string }>
}
export interface GeneratorHistory {
    id: number
    module_name: string
    model_name: string
    created_at: string
    updated_at: string
    chinese_module_name: string
    field_count: number
    create_curd: boolean
    use_soft_delete: boolean
    config_valid: boolean
}

export function parseHistoryConfig(form: string): GenerateConfig {
    const saved = JSON.parse(form)
    if (!saved || typeof saved.module_name !== 'string' || !saved.module_name ||
        typeof saved.model_name !== 'string' || !saved.model_name || typeof saved.create_curd !== 'boolean' ||
        (saved.create_curd && !Array.isArray(saved.fields))) throw new Error('历史配置不完整，无法回填')
    const fields: GeneratorField[] = saved.create_curd ? saved.fields.map((field: any, index: number) => {
        if (!field || typeof field.name !== 'string' || typeof field.key !== 'string' || typeof field.type !== 'string') {
            throw new Error(`历史配置的第 ${index + 1} 个字段不完整`)
        }
        return {
            id: index + 1, name: field.name, key: field.key, type: field.type,
            chinese_name: typeof field.chinese_name === 'string' ? field.chinese_name : '',
            index_type: typeof field.index_type === 'string' ? field.index_type : '',
            query_type: typeof field.query_type === 'string' ? field.query_type : '',
            sortable: field.sortable === true,
            table_show: field.table_show === true, editable: field.editable === true,
            required: field.required === true,
        }
    }) : []
    // Restore only editable configuration, never file overwrite approval.
    return {
        create_menu: saved.create_menu === true, menu_name: saved.menu_name || '',
        menu_parent_key: saved.menu_parent_key || '', menu_icon: saved.menu_icon || '',
        module_name: saved.module_name, model_name: saved.model_name,
        chinese_module_name: typeof saved.chinese_module_name === 'string' ? saved.chinese_module_name : '',
        allow_create: saved.allow_create === true, allow_edit: saved.allow_edit === true, allow_delete: saved.allow_delete === true,
        create_curd: saved.create_curd, use_soft_delete: saved.create_curd && saved.use_soft_delete === true, fields,
    }
}

export const SysDevtoolsApi = {
    MenuOptions(){
        return request.get("/sys_devtools/menu_options")
    },
    Preview(formData:GenerateConfig){
        return request.post("/sys_devtools/preview", formData)
    },
    Generate(formData:GenerateConfig){
        return request.post("/sys_devtools/generate", formData)
    },
    History(query:HistoryQuery){
        return request.get("/sys_devtools/history", {
            params:query
        })
    },
    GetHistory(id:any){
        return request.get("/sys_devtools/get_history", {
            params: {
                id
            }
        })
    },
    PreviewDelete(ids:number[]){
        return request.post("/sys_devtools/preview_delete_history", { ids })
    },
    Delete(ids:number[], deleteFiles = false, previewToken = ''){
        return request.post("/sys_devtools/delete_history", {
            ids, delete_files: deleteFiles, preview_token: previewToken
        })
    }
}
