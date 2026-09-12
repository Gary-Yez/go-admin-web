import {request} from "../utils/request.ts";

export const SysRoleApi  = {
    Get(id:number){
        return request.get("/sys_role/get",{
            params:{
                id:id
            }
        });
    },
    List(query:{page:number;limit:number;sorts:{field:string;order:string}[]}){
        return request.get("/sys_role/list", {
            params:{...query,sorts:query.sorts.map(sort=>JSON.stringify(sort))},
            paramsSerializer:{indexes:null},
        });
    },
    Copy(id:number,name:string){
        return request.post("/sys_role/copy",{id,name});
    },
    Create(formData:any){
        return request.post("/sys_role/create",formData);
    },
    Edit(formData:any){
        return request.post("/sys_role/edit",formData);
    },
    Delete(ids:Array<any>){
        return request.post("/sys_role/delete",{
            ids
        });
    },
    UpdatePermission(roleId:number,menuIds:Array<any>,apis:Array<any>,defaultMenu:string){
        return request.post("/sys_role/permission",{
            id:roleId,
            default_menu:defaultMenu,
            menus:menuIds.map(item=>({
                id:item
            })),
            apis:apis,
        })
    }
}
