/** 统一触发块格式 —— 与全局玩法世界书条目标题/关键词对齐 */

import { projectSupportsBodySwitch } from './catalog.js';

const FOOTER_SCRIPT = '请根据已挂载的全局世界书中与「项目」名称对应的条目，遵循该玩法的规矩与流程展开。描写过程允许并鼓励意外、停顿、反复与戏剧性转折，按总纲的叙事基调自由演绎。本玩法为可选拓展；未写明的设定仍遵循当前世界书。不要复述本触发块条目列表。';

const FOOTER_REWRITE = '下一条叙述必须已是改写完全生效后的状态：禁止描写 APP 界面、適用瞬间、认知切换或角色察觉被改写。对象将新常识视为自古如此。';

const FOOTER_BODY_SWITCH = '若触发块启用了排尿/绝顶联动，请同时遵循世界书「排尿开关系统」「绝顶开关系统」中对应等级与触发方式，与主玩法同一时间线展开，不要解释系统机制本身。';

function yn(v) {
    if (v === true || v === 'true' || v === '1' || v === '是' || v === 'on') return '是';
    if (v === false || v === 'false' || v === '0' || v === '否' || v === 'off' || v === '') return '否';
    return String(v ?? '').trim() || '否';
}

function line(label, value) {
    const v = String(value ?? '').trim();
    if (!v) return '';
    return `${label}：${v}`;
}

function isOn(v) {
    return yn(v) === '是';
}

/**
 * @param {object} project catalog project
 * @param {Record<string, string|boolean>} values field values
 */
export function buildExport(project, values = {}) {
    if (!project) return '';
    const v = { ...values };
    const type = project.type || 'script';

    if (type === 'system') {
        return buildRewriteExport(project, v);
    }

    const lines = ['【拓展玩法触发】'];
    lines.push(line('项目', project.worldbookKey || project.name));
    if (project.worldbookKey && project.worldbookKey !== project.name) {
        lines.push(line('显示名', project.name));
    }

    const chars = String(v.chars || '').trim();
    if (chars) lines.push(line('对象', chars));
    if (v.holder) lines.push(line('持有者', v.holder));
    if (v.charsNext) lines.push(line('接棒/关联', v.charsNext));
    if (v.part) lines.push(line('连接部位', v.part));
    if (v.cavitySync) lines.push(line('内腔同步', v.cavitySync));
    if (v.poseLink) lines.push(line('姿态连动', v.poseLink));
    if (v.organ) lines.push(line('实体器官', v.organ));
    if (v.aware) lines.push(line('对象知情', v.aware));
    if (v.intensity) lines.push(line('强度', v.intensity));
    if (v.segment) lines.push(line('本轮段落', v.segment));
    if (v.userRole) lines.push(line('用户身份', v.userRole));
    if (v.scene) lines.push(line('场合', v.scene));
    if (Object.prototype.hasOwnProperty.call(v, 'accidents')) {
        lines.push(line('意外场景', yn(v.accidents)));
    }
    if (v.note) lines.push(line('补充', v.note));

    // 通用尿意/高潮联动（写入同一触发块，避免分两次覆盖输入框）
    if (projectSupportsBodySwitch(project)) {
        const urineOn = isOn(v.urineOn);
        const orgasmOn = isOn(v.orgasmOn);
        if (urineOn || orgasmOn) {
            lines.push('');
            lines.push('【身体开关联动】');
            if (urineOn) {
                lines.push(line('排尿开关', '启用'));
                lines.push(line('排尿等级', v.urineLevel || '2'));
                lines.push(line('排尿触发', v.urineMode || '尿意涌上'));
                lines.push(line('排尿规则条目', '排尿开关系统'));
            }
            if (orgasmOn) {
                lines.push(line('绝顶开关', '启用'));
                lines.push(line('绝顶等级', v.orgasmLevel || '2'));
                lines.push(line('绝顶触发', v.orgasmMode || '快感涌现'));
                lines.push(line('绝顶规则条目', '绝顶开关系统'));
            }
        }
    }

    lines.push('');
    lines.push(FOOTER_SCRIPT);
    if (projectSupportsBodySwitch(project) && (isOn(v.urineOn) || isOn(v.orgasmOn))) {
        lines.push(FOOTER_BODY_SWITCH);
    }

    return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim() + '\n';
}

function buildRewriteExport(project, v) {
    const name = String(v.chars || '').trim() || '对象';
    const id = project.id;

    if (id === 'rw_apply') {
        const content = String(v.content || '').trim();
        return [
            `打开常识APP，选中${name}，输入"${content}"，按下適用`,
            '',
            FOOTER_REWRITE
        ].join('\n') + '\n';
    }
    if (id === 'rw_body') {
        return [
            `打开常识APP，选中${name}，启动肉体托管`,
            '',
            FOOTER_REWRITE
        ].join('\n') + '\n';
    }
    if (id === 'rw_sense') {
        const part = String(v.part || '').trim() || '身体';
        const dir = String(v.dir || '上调').trim();
        const mult = String(v.mult || '2').trim();
        return [
            `打开常识APP，选中${name}，将${part}的敏感度${dir}至${mult}倍`,
            '',
            '描写感知变化后的首次触碰。',
            FOOTER_REWRITE
        ].join('\n') + '\n';
    }
    if (id === 'rw_undo') {
        const target = String(v.target || '全部').trim();
        return [
            `打开常识APP，选中${name}，撤销${target}`,
            '',
            '原始常识回流，认知框架恢复。此后按恢复后的常识描写。'
        ].join('\n') + '\n';
    }

    return buildExport({ ...project, type: 'script' }, v);
}
