import {request} from "../utils/request.ts";

export const SysAdminApi = {
    List(query:{role_id?:number;page:number;limit:number;sorts?:{field:string;order:string}[];filters?:{field:string;operator:string;value:unknown}[]}){
        return request.get("/sys_admin/list",{
            params:{...query,sorts:query.sorts?.map(sort=>JSON.stringify(sort)),filters:query.filters?.map(filter=>JSON.stringify(filter))},
            paramsSerializer:{indexes:null},
        });
    },
    Create(form:Object){
        return request.post("/sys_admin/create",form);
    },
    Delete(ids:Array<number>){
        return request.post("/sys_admin/delete", {
            ids:ids
        });
    },
    Edit(form:Object){
        return request.post("/sys_admin/edit", form);
    }
}
