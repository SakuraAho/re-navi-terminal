/** 统一触发块格式 —— 与全局玩法世界书条目标题/关键词对齐 */

const FOOTER_SCRIPT = '请根据已挂载的全局世界书中与「项目」名称对应的条目，严格按该玩法的规矩、流程与描写锚点展开。本玩法为可选拓展；未写明的设定仍遵循当前世界书。不要复述本触发块条目列表。';

const FOOTER_SWITCH = '请立即按已挂载世界书中对应开关系统的该等级与触发方式执行，详细展开过程。不要解释系统机制本身。';

const FOOTER_REWRITE = '下一条叙述必须已是改写完全生效后的状态：禁止描写 APP 界面、適用瞬间、认知切换或角色察觉被改写。对象将新常识视为自古如此。';

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
    if (v.charsNext) lines.push(line('接棒/关联', v.charsNext));
    if (v.level) lines.push(line('等级', v.level));
    if (v.mode) lines.push(line('模式', v.mode));
    if (v.segment) lines.push(line('本轮段落', v.segment));
    if (v.userRole) lines.push(line('用户身份', v.userRole));
    if (Object.prototype.hasOwnProperty.call(v, 'accidents')) {
        lines.push(line('意外场景', yn(v.accidents)));
    }
    if (v.note) lines.push(line('补充', v.note));

    lines.push('');
    if (type === 'switch') lines.push(FOOTER_SWITCH);
    else lines.push(FOOTER_SCRIPT);

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
