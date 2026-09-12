// 返回独立的排序字段映射，业务可追加表格属性名与数据库列名的对应关系。
export function defaultSortFields(extra:Record<string,string> = {}):Record<string,string> {
    return {id:'id', created_at:'created_at', updated_at:'updated_at', ...extra}
}
