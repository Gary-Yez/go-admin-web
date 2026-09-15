import {request} from "../utils/request";

export type StorageEngine = 'local' | 'tencent' | 'aliyun' | 's3'
export const storageEngines: Record<string, string> = {local:'本地存储', tencent:'腾讯云 COS', aliyun:'阿里云 OSS', s3:'S3 兼容存储'}
export interface StorageOption {id:number; name:string; engine:StorageEngine; is_default:boolean; enabled:boolean}
export interface StorageAccount extends StorageOption { created_at:string; updated_at:string}
export interface StorageParams {
    root:string; endpoint:string; region:string; bucket:string; access_key:string; secret_key:string
    public_url:string; path_style:boolean
}
export interface StorageForm {
    id:number; name:string; engine:StorageEngine; enabled:boolean; is_default:boolean
    params:StorageParams
}
export interface StorageQuery {
    page:number; limit:number
    filters:{field:string; operator:string; value:string | boolean}[]
    sorts:{field:string; order:string}[]
}
export const emptyStorageParams = (): StorageParams => ({
    root:'', endpoint:'', region:'', bucket:'', access_key:'', secret_key:'',
    public_url:'', path_style:false,
})
export const SysStorageApi = {
    List(query:StorageQuery) {
        return request.post<unknown,{data:{list:StorageAccount[]; total:number}}>('/sys_storage/list',query)
    },
    Get(id:number) {
        return request.get<unknown,{data:{storage:StorageAccount; params:StorageParams; in_use:boolean}}>('/sys_storage/get',{params:{id}})
    },
    Save(body:StorageForm) {return request.post('/sys_storage/save',body)},
    SetDefault(id:number) {return request.post('/sys_storage/default',{id})},
    SetEnabled(id:number,enabled:boolean) {return request.post('/sys_storage/enabled',{id,enabled})},
    Delete(ids:number[]) {return request.post('/sys_storage/delete',{ids})},
}
