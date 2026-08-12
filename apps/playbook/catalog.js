/* 玩法目录：仅表单 + 触发模板。正文在全局世界书，App 不存储 MD 全文。 */

export const PLAYBOOK_CATALOG_VERSION = 1;

/** @typedef {'text'|'textarea'|'select'|'multiselect'|'toggle'} FieldType */

/**
 * exportTemplate 占位符：{{fieldId}}；布尔 toggle 输出 是/否
 * 固定头尾由 buildExport 统一加，模板只写项目专属行（也可写全块）
 */

export const PACKS = [
    { id: 'exam', name: '体检', icon: '🩺' },
    { id: 'sports', name: '大运动会', icon: '🏅' },
    { id: 'festival', name: '学园祭', icon: '🎪' },
    { id: 'switch', name: '尿意＆高潮', icon: '⚡' },
    { id: 'rewrite', name: '常识改变', icon: '🧠' },
    { id: 'magic', name: '魔法道具', icon: '✨' }
];

/** @type {Array<object>} */
export const PROJECTS = [
    // —— 体检 ——
    {
        id: 'exam_p1',
        packId: 'exam',
        name: '肉体体检·阶段一：静态基线',
        worldbookKey: '肉体体检·阶段一：静态基线',
        type: 'script',
        fields: [
            { id: 'chars', label: '受检角色', type: 'text', placeholder: '姓名，多人用顿号', required: true },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['完整阶段', '身高与体重', '围度测定', '姿态与脊柱检查'], default: '完整阶段' },
            { id: 'accidents', label: '启用意外场景', type: 'toggle', default: false },
            { id: 'userRole', label: '用户身份', type: 'select', options: ['检查者', '旁观记录'], default: '检查者' }
        ]
    },
    {
        id: 'exam_p2',
        packId: 'exam',
        name: '肉体体检·阶段二：体表触诊',
        worldbookKey: '肉体体检·阶段二：体表触诊',
        type: 'script',
        fields: [
            { id: 'chars', label: '受检角色', type: 'text', placeholder: '姓名', required: true },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['完整阶段', '颈侧与腋下', '腹部触诊', '乳房触诊', '腰窝与后腰', '四肢触诊'], default: '完整阶段' },
            { id: 'accidents', label: '启用意外场景', type: 'toggle', default: false },
            { id: 'userRole', label: '用户身份', type: 'select', options: ['检查者', '旁观记录'], default: '检查者' }
        ]
    },
    {
        id: 'exam_p3',
        packId: 'exam',
        name: '肉体体检·阶段三：胸部专项',
        worldbookKey: '肉体体检·阶段三：胸部专项',
        type: 'script',
        fields: [
            { id: 'chars', label: '受检角色', type: 'text', required: true },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['完整阶段', '自然站立', '前屈九十度', '站姿侧屈', '平躺'], default: '完整阶段' },
            { id: 'mode', label: '侧重', type: 'select', options: ['主动驱动+外力', '仅主动驱动', '仅外力辅助'], default: '主动驱动+外力' },
            { id: 'accidents', label: '启用意外场景', type: 'toggle', default: false },
            { id: 'userRole', label: '用户身份', type: 'select', options: ['检查者', '旁观记录'], default: '检查者' }
        ]
    },
    {
        id: 'exam_p4',
        packId: 'exam',
        name: '肉体体检·阶段四：小穴专项',
        worldbookKey: '肉体体检·阶段四：小穴专项',
        type: 'script',
        fields: [
            { id: 'chars', label: '受检角色', type: 'text', required: true },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['完整阶段', '外观基线', '外阴触诊', '盆底功能评估'], default: '完整阶段' },
            { id: 'accidents', label: '启用意外场景', type: 'toggle', default: false },
            { id: 'userRole', label: '用户身份', type: 'select', options: ['检查者', '旁观记录'], default: '检查者' }
        ]
    },

    // —— 大运动会 2.0（与世界书条目对齐；总纲可勾选引用）——
    {
        id: 'sports_outline',
        packId: 'sports',
        name: '大运动会·总纲',
        worldbookKey: '大运动会·总纲',
        type: 'script',
        fields: [
            { id: 'note', label: '补充（可选）', type: 'text', placeholder: '如：强调选手主体性 / 仅作基调提醒' }
        ]
    },
    {
        id: 'sports_nipple',
        packId: 'sports',
        name: '大运动会·乳首牵引赛',
        worldbookKey: '大运动会·乳首牵引赛',
        type: 'script',
        fields: [
            { id: 'chars', label: '选手', type: 'text', required: true },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['赛前准备', '起步', '中段', '脱落', '末段与冲线', '冲线后', '完整场次'], default: '中段' },
            { id: 'userRole', label: '用户身份', type: 'select', options: ['观众', '裁判', '选手'], default: '观众' },
            { id: 'refOutline', label: '同时引用总纲', type: 'toggle', default: true }
        ]
    },
    {
        id: 'sports_relay',
        packId: 'sports',
        name: '大运动会·核心紧致接力赛',
        worldbookKey: '大运动会·核心紧致接力赛',
        type: 'script',
        fields: [
            { id: 'chars', label: '本棒/交棒选手', type: 'text', required: true },
            { id: 'charsNext', label: '接棒选手（可选）', type: 'text', placeholder: '交接时填写' },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['赛前准备', '跑动', '交接', '冲线后', '完整场次'], default: '跑动' },
            { id: 'userRole', label: '用户身份', type: 'select', options: ['观众', '裁判', '接棒操作者', '选手'], default: '观众' },
            { id: 'refOutline', label: '同时引用总纲', type: 'toggle', default: true }
        ]
    },
    {
        id: 'sports_rope',
        packId: 'sports',
        name: '大运动会·跨池渡河赛',
        worldbookKey: '大运动会·跨池渡河赛',
        type: 'script',
        fields: [
            { id: 'chars', label: '选手', type: 'text', required: true },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['赛前准备', '起始段', '中段', '落水', '末段与冲线', '冲线后', '完整场次'], default: '中段' },
            { id: 'userRole', label: '用户身份', type: 'select', options: ['观众', '裁判', '选手'], default: '观众' },
            { id: 'refOutline', label: '同时引用总纲', type: 'toggle', default: true }
        ]
    },

    // —— 学园祭 ——
    {
        id: 'fest_dessert',
        packId: 'festival',
        name: '甜点部·体温甜品托盘',
        worldbookKey: '甜点部·体温甜品托盘',
        type: 'script',
        fields: [
            { id: 'chars', label: '托盘少女', type: 'text', required: true },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['摆盘', '品鉴', '清理', '完整活动'], default: '品鉴' },
            { id: 'userRole', label: '用户身份', type: 'select', options: ['品鉴者', '摆盘部员', '旁观'], default: '品鉴者' }
        ]
    },

    // —— 开关 ——
    {
        id: 'sw_urine',
        packId: 'switch',
        name: '排尿开关',
        worldbookKey: '排尿开关系统',
        type: 'switch',
        fields: [
            { id: 'chars', label: '对象', type: 'text', required: true },
            { id: 'level', label: '等级', type: 'select', options: ['1', '2', '3', '4'], default: '2' },
            { id: 'mode', label: '触发方式', type: 'select', options: ['尿意涌上', '强制排尿'], default: '尿意涌上' }
        ]
    },
    {
        id: 'sw_orgasm',
        packId: 'switch',
        name: '绝顶开关',
        worldbookKey: '绝顶开关系统',
        type: 'switch',
        fields: [
            { id: 'chars', label: '对象', type: 'text', required: true },
            { id: 'level', label: '等级', type: 'select', options: ['1', '2', '3', '4'], default: '2' },
            { id: 'mode', label: '触发方式', type: 'select', options: ['快感涌现', '强制绝顶'], default: '快感涌现' }
        ]
    },

    // —— 常识改写 ——
    {
        id: 'rw_apply',
        packId: 'rewrite',
        name: '常识改写·適用',
        worldbookKey: '常识改变APP',
        type: 'system',
        fields: [
            { id: 'chars', label: '对象名', type: 'text', required: true },
            { id: 'content', label: '改写内容', type: 'textarea', placeholder: '一条新常识…', required: true }
        ]
    },
    {
        id: 'rw_body',
        packId: 'rewrite',
        name: '常识改写·肉体托管',
        worldbookKey: '常识改变APP',
        type: 'system',
        fields: [
            { id: 'chars', label: '对象名', type: 'text', required: true }
        ]
    },
    {
        id: 'rw_sense',
        packId: 'rewrite',
        name: '常识改写·感知调节',
        worldbookKey: '常识改变APP',
        type: 'system',
        fields: [
            { id: 'chars', label: '对象名', type: 'text', required: true },
            { id: 'part', label: '身体位置', type: 'text', placeholder: '如：乳头、小穴', required: true },
            { id: 'dir', label: '方向', type: 'select', options: ['上调', '下调'], default: '上调' },
            { id: 'mult', label: '倍数', type: 'text', placeholder: '如 3', default: '2' }
        ]
    },
    {
        id: 'rw_undo',
        packId: 'rewrite',
        name: '常识改写·撤销',
        worldbookKey: '常识改变APP',
        type: 'system',
        fields: [
            { id: 'chars', label: '对象名', type: 'text', required: true },
            { id: 'target', label: '撤销范围', type: 'text', placeholder: '具体条目或「全部」', default: '全部' }
        ]
    },

    // —— 魔法道具（测试）——
    {
        id: 'magic_onahole',
        packId: 'magic',
        name: '魔法飞机杯',
        worldbookKey: '魔法飞机杯',
        type: 'script',
        fields: [
            { id: 'holder', label: '持有者', type: 'text', placeholder: '使用飞机杯的一方', required: true },
            { id: 'chars', label: '连接对象', type: 'text', placeholder: '被同步的女性', required: true },
            { id: 'part', label: '连接部位', type: 'select', options: ['阴道', '肛门'], default: '阴道' },
            { id: 'aware', label: '对象是否知情', type: 'select', options: ['不知情', '知情'], default: '不知情' },
            { id: 'intensity', label: '强度', type: 'select', options: ['轻', '中', '强'], default: '中' },
            { id: 'segment', label: '本轮段落', type: 'select', options: ['建立连接', '使用中', '暂停/断开', '完整过程'], default: '使用中' },
            { id: 'scene', label: '场合补充（可选）', type: 'text', placeholder: '如：对方正在上课/走路' }
        ]
    }
];

export function getPack(packId) {
    return PACKS.find((p) => p.id === packId) || null;
}

export function getProject(projectId) {
    return PROJECTS.find((p) => p.id === projectId) || null;
}

export function listProjectsByPack(packId) {
    return PROJECTS.filter((p) => p.packId === packId);
}
