import {loadZero} from "../../utils/utils";

export const needShow = function (method: string, key: string) {
    if (cronMethod[method]) {
        return cronMethod[method]?.forms.includes(key)
    } else {
        return false
    }
}
export const weeks = [
    "周一",
    "周二",
    "周三",
    "周四",
    "周五",
    "周六",
    "周日",
]
export const cronMethod: any = {
    "perMonth": {
        label: "每月",
        forms: ["day", "hour", "minute"],
    },
    "perWeek": {
        label: "每周",
        forms: ["week", "hour", "minute"],
    },
    "perDay": {
        label: "每天",
        forms: ["hour", "minute"],
    },
    "perHour": {
        label: "每小时",
        forms: ["minute"],
    },
    "perNDay": {
        label: "每N天",
        forms: ["day", "hour", "minute"],
    },
    "perNHour": {
        label: "每N时",
        forms: ["hour", "minute"],
    },
    "perNMinute": {
        label: "每N分钟",
        forms: ["minute"],
    },
    "perNSecond": {
        label: "每N秒",
        forms: ["second"],
    },
}

export function transObjToSpec(specType: string, week: number, day: number, hour: number, minute: number, second: number, timezone = ''): string {
    const expression = transObjToExpression(specType, week, day, hour, minute, second);
    return expression && timezone ? `CRON_TZ=${timezone} ${expression}` : expression;
}

function transObjToExpression(specType: string, week: number, day: number, hour: number, minute: number, second: number): string {
    switch (specType) {
        case 'perMonth':
            return `${minute} ${hour} ${day} * *`;
        case 'perWeek':
            return `${minute} ${hour} * * ${week}`;
        case 'perNDay':
            return `${minute} ${hour} */${day} * *`;
        case 'perDay':
            return `${minute} ${hour} * * *`;
        case 'perNHour':
            return `${minute} */${hour} * * *`;
        case 'perHour':
            return `${minute} * * * *`;
        case 'perNMinute':
            return `@every ${minute}m`;
        case 'perNSecond':
            return `@every ${second}s`;
        default:
            return '';
    }
}

export function transSpecToObj(spec: string) {
    let specItem = {
        timezone: '',
        specType: 'perNMinute',
        week: 1,
        day: 0,
        hour: 0,
        minute: 0,
        second: 0,
    };
    if (!spec) {
        return {
            ...specItem,
            minute: 1
        };
    }
    const timezone = spec.trim().match(/^(?:CRON_TZ|TZ)=([^\s]+)\s+/);
    specItem.timezone = timezone?.[1] ?? '';
    let specs = spec.trim().slice(timezone?.[0].length ?? 0).split(/\s+/);
    if (specs.length === 2) {
        if (specs[1].indexOf('m') !== -1) {
            specItem.specType = 'perNMinute';
            specItem.minute = Number(specs[1].replace(/m/g, ''));
            return specItem;
        } else {
            specItem.specType = 'perNSecond';
            specItem.second = Number(specs[1].replace(/s/g, ''));
            return specItem;
        }
    }
    if (specs.length !== 5 || specs[0] === '*') {
        return null;
    }
    specItem.minute = Number(specs[0]);
    if (specs[1] === '*') {
        specItem.specType = 'perHour';
        return specItem;
    }
    if (specs[1].indexOf('*/') !== -1) {
        specItem.specType = 'perNHour';
        specItem.hour = Number(specs[1].replace(/\*\//g, ''));
        return specItem;
    }
    specItem.hour = Number(specs[1]);
    if (specs[2].indexOf('*/') !== -1) {
        specItem.specType = 'perNDay';
        specItem.day = Number(specs[2].replace(/\*\//g, ''));
        return specItem;
    }
    if (specs[2] !== '*') {
        specItem.specType = 'perMonth';
        specItem.day = Number(specs[2]);
        return specItem;
    }
    if (specs[4] !== '*') {
        specItem.specType = 'perWeek';
        specItem.week = Number(specs[4]);
        return specItem;
    }
    specItem.specType = 'perDay';
    return specItem;
}

export function transSpecToStr(spec: string): string {
    const description = formatSpec(spec);
    const timezone = transSpecToObj(spec)?.timezone;
    const zoneLabel = timezone === 'Asia/Shanghai' ? '北京时间' : timezone || '北京时间';
    return description ? `${description}（${zoneLabel}）` : spec || '未设置';
}

function formatSpec(spec: string): string {
    const specObj = transSpecToObj(spec);
    if (!specObj) {
        return '';
    }
    switch (specObj.specType) {
        case 'perMonth':
            return `每月 ${specObj.day} 日 ${loadZero(specObj.hour)}:${loadZero(specObj.minute)} 执行`;
        case 'perWeek':
            return `每周 ${weeks[specObj.week - 1]} ${loadZero(specObj.hour)}:${loadZero(specObj.minute)} 执行`
        case 'perDay':
            return `每日 ${loadZero(specObj.hour)}:${loadZero(specObj.minute)} 执行`
        case 'perHour':
            return `每小时 ${loadZero(specObj.minute)}分 执行`
        case 'perNDay':
            return `每 ${specObj.day} 天 ${loadZero(specObj.hour)}:${loadZero(specObj.minute)} 执行`
        case 'perNHour':
            return `每 ${specObj.hour}小时 ${loadZero(specObj.minute)}分 执行`
        case 'perNMinute':
            return `每 ${loadZero(specObj.minute)}分 执行`
        case 'perNSecond':
            return `每 ${specObj.second}秒 执行`
        default:
            return '';
    }
}
