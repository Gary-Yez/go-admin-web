import {request} from "../utils/request.ts";

export interface ManagedToken {
    id:number
    admin_id:number
    username:string
    nickname:string
    role_id:number
    role_name:string
    prefix:string
    remark:string
    created_at:string
    expires_at:string | null
    status:'active' | 'permanent' | 'expired' | 'invalid'
}
export interface TokenQuery {
    sorts?:{field:string;order:string}[]
    page:number
    limit:number
    filters:{field:string;operator:string;value:string | number | string[]}[]
}
export const SysApiTokenManageApi = {
    List(query:TokenQuery){
        return request.post<unknown,{data:{list:ManagedToken[];total:number;role_options:{id:number;name:string}[]}}>('/sys_api_token/list',query)
    },
    Delete(ids:number[]){return request.post('/sys_api_token/delete',{ids})},
}
