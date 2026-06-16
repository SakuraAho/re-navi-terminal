/* N.A.V.I. EroLinks v3.0 — 直接LINK */

(function(){if(document.getElementById('erolinks-styles'))return;const l=document.createElement('link');l.id='erolinks-styles';l.rel='stylesheet';l.href=new URL('./erolinks.css?v=3.0.0',import.meta.url).href;document.head.appendChild(l);})();

const TABS=[{key:'info',icon:'📋'},{key:'secret',icon:'🔞'},{key:'outfit',icon:'👗'},{key:'hypno',icon:'🧠'}];

export class EroLinksView{constructor(app){this.app=app;this.currentView='main';this.activeTab='info';this._loading=false;this._linkedData=null;this._wbRendered=false;this._outfitChanges={};window.VirtualPhone._erolinksView=this;}
_esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
render(){let h;if(this.currentView==='settings')h=this._renderSettings();else if(this.currentView==='linked'&&this._linkedData)h=this._renderLinked();else h=this._renderMain();this.app.phoneShell.setContent(h,'erolinks-'+this.currentView);if(this.currentView==='settings')this._bindSettings();}
goSettings(){this.currentView='settings';this._wbRendered=false;this.render();}
goBack(){this.currentView=this._linkedData?'linked':'main';this.render();}
goMain(){this.currentView='main';this._loading=false;this.render();}
switchTab(k){this.activeTab=k;this.render();}
disconnect(){this._linkedData=null;this._outfitChanges={};this.currentView='main';this.activeTab='info';this.render();}

// === 主页 LINK ===
_renderMain(){return`<div class="erolinks-app"><div class="erolinks-bar"><div class="erolinks-bar-btn" onclick="window.VirtualPhone._erolinksView.goSettings()">⚙️</div></div><div class="erolinks-main"><div class="erolinks-link-btn ${this._loading?'loading':''}" onclick="window.VirtualPhone._erolinksView._linkChar()"><div class="erolinks-link-ring"></div><div class="erolinks-link-text">${this._loading?'⏳':'LINK'}</div>${this._loading?'<div class="erolinks-link-sub">链接中...</div>':''}</div><div class="erolinks-hint">链接当前对话中的角色</div></div></div>`;}

// === 链接角色 ===
async _linkChar(){if(this._loading)return;this._loading=true;this.render();try{const ctx=(typeof SillyTavern!=='undefined'&&SillyTavern.getContext)?SillyTavern.getContext():null;const api=window.VirtualPhone?.apiManager;if(!api||!ctx)throw new Error('核心未就绪');const wbMsg=await window.VirtualPhone?.worldbookManager?.buildWorldbookMessage('erolinks');const worldbookText=wbMsg?.content||'';const chat=ctx.chat||[];const lastMsg=chat.length>0?chat[chat.length-1]:null;const lastMessageText=lastMsg?`${lastMsg.name||'??'}: ${String(lastMsg.mes||'')}`:'（无）';const systemPrompt=this._getLinkPrompt(worldbookText,lastMessageText);const result=await api.callAI([{role:'system',content:systemPrompt},{role:'user',content:'请建立链接并输出结果。'}],{appId:'erolinks',max_tokens:ctx.max_response_length||2048});if(!result?.success)throw new Error(result?.error||'连接失败');const text=String(result.summary||'');const ex=(label)=>{const idx=text.indexOf('【'+label+'】');if(idx===-1)return'';const start=idx+label.length+2;const rest=text.substring(start);const nb=rest.indexOf('\n【');const val=nb>0?rest.substring(0,nb):rest;return val.trim();};this._linkedData={charName:ex('链接角色')||'角色',race:ex('种族'),age:ex('年龄'),role:ex('身份'),affiliation:ex('所属'),activity:ex('当前活动'),location:ex('所在位置'),favorability:ex('好感度'),heartRate:ex('心率'),temp:ex('体温'),mood:ex('当前状态'),breast:ex('胸部'),vulva:ex('小穴'),sexExp:ex('性经验'),lastSex:ex('最近性行为'),mastFreq:ex('自慰频率'),lastMast:ex('最近自慰'),sensitive:ex('敏感部位'),wetness:ex('湿润状态'),arousal:ex('快感阶段'),cycle:ex('生理周期'),desire:ex('当前欲望'),fantasy:ex('幻想内容'),kink:ex('秘密嗜好'),bodyChange:ex('身体变化'),thought:ex('心理所想'),outfit:this._parseOutfit(ex('服装穿着'))};this._saveConfirmed();this.currentView='linked';this.activeTab='info';this._outfitChanges={};}catch(err){console.error('[EroLinks]',err);this.app.phoneShell?.showNotification?.('链接失败',err.message,'❌');}this._loading=false;this.render();}

// === 链接提示词 ===
_getLinkPrompt(worldbookText,chatText){return`你是EroLinks身心链接模块。请从下方聊天记录中识别当前正在发言或被提及的角色，链接该角色。

核心规则——世界书使用判断：
检查下方世界书中是否存在角色名恰好相同的条目。
→ 如果有：从该条目提取种族、年龄、身份、所属等基础信息。
→ 如果没有：完全忽略世界书的所有内容。世界书中即使有其他角色的详细数据，也与目标角色无关，严禁把其他角色的数据填给目标角色。所有字段改为从聊天记录中推断或填写"未知"。

按以下顺序输出（每个字段独占一行，严禁合并）。每个字段的填写指引见括号内：

第一步——基础信息（来源优先级：世界书同名条目 > 聊天记录 > 未知）：
种族（角色的种族或亚人种，如人类/妖精/精灵/魅魔/猫亚人等）
年龄（角色的外观年龄或实际年龄，填数字）
身份（角色在岛上的身份或职业，如学生/教师/社团成员/岛民等）
所属（角色所属的组织、班级、社团或势力）

第二步——动态状态：
心率（当前心率数值，仅填数字，范围60-120，平静时偏低兴奋时偏高）
体温（当前体温数值，仅填数字如36.5，正常约36.2-37.2，兴奋时略高0.3-0.8）
当前状态（角色当前的情绪和身体状态概述，一句话综合描述）
当前活动（角色此刻正在做什么，具体描述行为而非泛泛概括）
所在位置（角色所处的具体地点，越具体越好）
好感度（角色对体己师{{user}}的好感程度描述）
心理所想（角色此刻内心活动，以角色第一人称写一句，用「」包裹）

第三步——身体与秘密：
胸部（乳房的尺寸、形状、触感、色泽、挺翘度等详细描写，≥20字）
小穴（外阴的外观、色泽、外唇形态、湿润感、紧致度等详细描写，≥20字）
敏感部位（角色身体哪些部位对触碰格外敏感，具体列出部位并简述敏感特点）
湿润状态（小穴当前的湿润程度与状态描述）
快感阶段（当前处于以下哪个阶段：平静无波/微有涟漪/暗流涌动/呼吸渐促/酥麻蔓延/难耐轻吟/临界悬丝/决堤溃坝。选其一，可附加简短描述）
生理周期（角色当前处于生理周期的哪个阶段，如安全期/危险期/经期等，含天数或周期特征）
当前欲望（角色此刻的性欲望强度与大致倾向，描述渴望的程度和方向）
幻想内容（角色近期或此刻的性幻想或隐秘想法，描述具体幻想的情境或对象）
身体变化（角色身体最近值得注意的变化，如胸围增减、敏感度变化、皮肤状态等）

第四步——隐私（无法从世界书或聊天记录中确定的，一律填"未知"，禁止猜测编造）：
性经验（若世界书或已确认信息中能明确为处女/非处女才填写，否则填未知，不可从上下文胡乱推断）
最近性行为（最近一次性接触的时间、对象与大致内容，不确定则填未知）
自慰频率（角色自慰的大致频率，不确定则填未知）
最近自慰（最近一次自慰的时间与大致情境，不确定则填未知）
秘密嗜好（角色不为人知的性癖好或特殊喜好，不确定则填未知）

输出格式（每个字段独占一行，严禁合并）：
【链接角色】值
【种族】值
【年龄】值
【身份】值
【所属】值
【当前活动】值
【所在位置】值
【好感度】值
【心率】值
【体温】值
【当前状态】值
【胸部】值
【小穴】值
【性经验】值
【最近性行为】值
【自慰频率】值
【最近自慰】值
【敏感部位】值
【湿润状态】值
【快感阶段】值
【生理周期】值
【当前欲望】值
【幻想内容】值
【秘密嗜好】值
【身体变化】值
【心理所想】值
【服装穿着】
【头部】-物品（帽子、发饰、头巾、围脖等，每行一个以"- "开头。若无任何穿戴则写"- 无"）
【上身躯体】-物品（外套、内衬、胸罩等，每行一个以"- "开头。胸罩需根据人设或上下文推断是否穿着。若该部位赤裸则写"- 无"）
【双手】-物品（手套、手链、戒指等，每行一个以"- "开头。若该部位赤裸/无穿戴则写"- 无"）
【下身躯体】-物品（裤子、裙子、内裤等，每行一个以"- "开头。内裤需根据人设或上下文推断是否穿着。若该部位赤裸则写"- 无"）
【腿脚】-物品（袜子、鞋子、腿环等，每行一个以"- "开头。若该部位赤裸则写"- 无"）
【装饰】-物品（项链、耳环、手镯等配饰，每行一个以"- "开头，格式：部位-物品名。若未佩戴任何配饰则写"- 无"）
每件物品需写出颜色、款式、材质等简要描述，不可只写品类名。没穿的部位必须写"- 无"，不能省略。

世界书：${worldbookText||'无'}
聊天记录：${chatText||'无'}`;}

// === 持久化已确认 ===
_vpSet(k,v){const VP=window.VirtualPhone;if(VP?.storage){VP.storage.set(k,v);try{const ctx=(typeof SillyTavern!=='undefined'&&SillyTavern.getContext)?SillyTavern.getContext():null;if(ctx?.extensionSettings){if(!ctx.extensionSettings.variables)ctx.extensionSettings.variables={};if(!ctx.extensionSettings.variables.global)ctx.extensionSettings.variables.global={};ctx.extensionSettings.variables.global[k]=v;if(typeof ctx.saveSettingsDebounced==='function')ctx.saveSettingsDebounced();}}catch(e){}}try{localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));}catch(e){}}
_vpGet(k,def=''){const VP=window.VirtualPhone;if(VP?.storage){const v=VP.storage.get(k,null);if(v!==null&&v!==undefined)return v;}try{const ctx=(typeof SillyTavern!=='undefined'&&SillyTavern.getContext)?SillyTavern.getContext():null;const gv=ctx?.extensionSettings?.variables?.global?.[k];if(gv)return gv;}catch(e){}try{const s=localStorage.getItem(k);if(s){try{return JSON.parse(s);}catch(e){return s;}}}catch(e){}return def;}
_sanitizeName=n=>n.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g,'_').replace(/^[^a-zA-Z\u4e00-\u9fff]+/,'').replace(/[_\-]+$/,'')||'unknown';
_saveConfirmed(){const d=this._linkedData;if(!d)return;const key='navi_erolinks_'+this._sanitizeName(d.charName);const existing=this._loadConfirmed(key);const confirmed={};['charName','race','age','role','affiliation','sexExp','lastSex','mastFreq','lastMast','kink'].forEach(f=>{const v=d[f]||existing[f];if(v&&v!=='未知'&&v!=='—')confirmed[f]=v;});const text=Object.entries(confirmed).map(([k,v])=>k+'：'+v).join('\n');this._vpSet(key,text);}
_loadConfirmed(key){const text=this._vpGet(key,'');if(!text)return{};const result={};String(text).split('\n').forEach(line=>{const ci=line.indexOf('：');if(ci>0)result[line.substring(0,ci).trim()]=line.substring(ci+1).trim();});return result;}
_getConfirmedText(){const d=this._linkedData;if(!d)return'';return this._vpGet('navi_erolinks_'+this._sanitizeName(d.charName),'');}

// === 已链接页 ===
_renderLinked(){const d=this._linkedData;return`<div class="erolinks-app"><div class="erolinks-bar"><div class="erolinks-bar-btn" onclick="window.VirtualPhone._erolinksView._linkChar()">🔄</div><div class="erolinks-bar-btn" onclick="window.VirtualPhone._erolinksView.goSettings()">⚙️</div></div><div class="el-tabs">${TABS.map(t=>`<div class="el-tab${this.activeTab===t.key?' active':''}" onclick="window.VirtualPhone._erolinksView.switchTab('${t.key}')">${t.icon}</div>`).join('')}</div><div class="el-tab-content">${this._renderTabContent(d)}</div><div class="el-bottom-bar"><button class="el-disconnect-btn" onclick="window.VirtualPhone._erolinksView.disconnect()">🔌 断开链接</button></div></div>`;}
_renderTabContent(d){switch(this.activeTab){case'info':return this._renderInfoTab(d);case'secret':return this._renderSecretTab(d);case'outfit':return this._renderOutfitTab();case'hypno':return this._renderHypnoTab();default:return'';}}
_renderInfoTab(d){return`<div class="el-info-scroll"><div class="el-avatar-area"><div class="el-avatar-ring"><div class="el-avatar-inner">${this._esc(d.charName).charAt(0)}</div></div><div class="el-char-name">${this._esc(d.charName)}</div></div><div class="el-info-grid"><div class="el-info-item"><span class="el-info-label">种族</span><span class="el-info-val">${this._esc(d.race||'—')}</span></div><div class="el-info-item"><span class="el-info-label">年龄</span><span class="el-info-val">${this._esc(d.age||'—')}</span></div><div class="el-info-item"><span class="el-info-label">身份</span><span class="el-info-val">${this._esc(d.role||'—')}</span></div><div class="el-info-item"><span class="el-info-label">所属</span><span class="el-info-val">${this._esc(d.affiliation||'—')}</span></div></div><div style="display:flex;gap:6px;margin-bottom:8px;"><div class="el-heartrate-card" style="flex:1;"><div class="el-hr-icon">💓</div><div class="el-hr-value">${this._esc(d.heartRate||'72')}</div><div class="el-hr-unit">BPM</div><div class="el-hr-wave"></div></div><div class="el-heartrate-card" style="flex:1;border-color:rgba(255,140,60,0.15);background:rgba(255,140,60,0.06);"><div class="el-hr-icon" style="color:#ff8c40;">🌡</div><div class="el-hr-value" style="color:#ff8c40;">${this._esc(d.temp||'36.5')}</div><div class="el-hr-unit">°C</div></div></div><div class="el-info-grid"><div class="el-info-item"><span class="el-info-label">状态</span><span class="el-info-val">${this._esc(d.mood||'—')}</span></div><div class="el-info-item"><span class="el-info-label">活动</span><span class="el-info-val">${this._esc(d.activity||'—')}</span></div><div class="el-info-item"><span class="el-info-label">位置</span><span class="el-info-val">${this._esc(d.location||'—')}</span></div><div class="el-info-item"><span class="el-info-label">好感</span><span class="el-info-val">${this._esc(d.favorability||'—')}</span></div></div>${d.thought?`<div class="el-thought"><div class="el-thought-label">💭</div><div class="el-thought-text">${this._esc(d.thought)}</div></div>`:''}</div>`;}
_renderSecretTab(d){return`<div class="el-secret-scroll"><div class="el-secret-section"><div class="el-secret-section-title">🔞 胸穴状态</div><div class="el-secret-grid"><div class="el-secret-item wide"><span class="el-secret-label">胸部</span><span class="el-secret-val">${this._esc(d.breast||'—')}</span></div><div class="el-secret-item wide"><span class="el-secret-label">小穴</span><span class="el-secret-val">${this._esc(d.vulva||'—')}</span></div></div></div><div class="el-secret-section"><div class="el-secret-section-title">📊 性经验</div><div class="el-secret-grid"><div class="el-secret-item"><span class="el-secret-label">经验</span><span class="el-secret-val">${this._esc(d.sexExp||'—')}</span></div><div class="el-secret-item"><span class="el-secret-label">最近</span><span class="el-secret-val">${this._esc(d.lastSex||'—')}</span></div><div class="el-secret-item"><span class="el-secret-label">自慰频率</span><span class="el-secret-val">${this._esc(d.mastFreq||'—')}</span></div><div class="el-secret-item"><span class="el-secret-label">最近自慰</span><span class="el-secret-val">${this._esc(d.lastMast||'—')}</span></div></div></div><div class="el-secret-section"><div class="el-secret-section-title">🌡 生理</div><div class="el-secret-grid"><div class="el-secret-item"><span class="el-secret-label">敏感</span><span class="el-secret-val">${this._esc(d.sensitive||'—')}</span></div><div class="el-secret-item"><span class="el-secret-label">湿润</span><span class="el-secret-val">${this._esc(d.wetness||'—')}</span></div><div class="el-secret-item"><span class="el-secret-label">快感阶段</span><span class="el-secret-val">${this._esc(d.arousal||'—')}</span></div><div class="el-secret-item"><span class="el-secret-label">周期</span><span class="el-secret-val">${this._esc(d.cycle||'—')}</span></div></div></div><div class="el-secret-section"><div class="el-secret-section-title">💭 欲望</div><div class="el-secret-grid"><div class="el-secret-item wide"><span class="el-secret-label">欲望</span><span class="el-secret-val">${this._esc(d.desire||'—')}</span></div><div class="el-secret-item wide"><span class="el-secret-label">幻想</span><span class="el-secret-val">${this._esc(d.fantasy||'—')}</span></div><div class="el-secret-item wide"><span class="el-secret-label">嗜好</span><span class="el-secret-val">${this._esc(d.kink||'—')}</span></div><div class="el-secret-item wide"><span class="el-secret-label">变化</span><span class="el-secret-val">${this._esc(d.bodyChange||'—')}</span></div></div></div></div>`;}

// === 服装 ===
_renderOutfitTab(){const o=this._linkedData?.outfit||{};const zs=[{id:'head',l:'👒 头部',x:68,y:2,w:64,h:46},{id:'upper',l:'👚 上身躯体',x:52,y:48,w:96,h:120},{id:'hands',l:'🧤 双手',x:8,y:65,w:45,h:80,x2:147,y2:65,w2:45,h2:80},{id:'lower',l:'👖 下身躯体',x:52,y:168,w:96,h:92},{id:'legs',l:'🦵 腿脚',x:48,y:260,w:104,h:95},{id:'acc',l:'💍 装饰',x:82,y:0,w:36,h:18}];const zoneItems=z=>o[z.id]||[];const hasAny=Object.values(o).some(a=>a.length>0);const tooltip=z=>{const items=zoneItems(z);return items.length?items.join('、'):'无';};const svg=`<svg viewBox="0 0 200 360" class="el-figure-svg" xmlns="http://www.w3.org/2000/svg">
<defs><filter id="el-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<path d="M100,20 a14,14 0 0,1 0,28 a14,14 0 0,1 0,-28 M100,48 L100,54 M55,54 Q48,90 55,148 L145,148 Q152,90 140,54 M55,54 Q42,52 30,82 L22,140 L34,140 L40,86 Q48,60 60,58 M145,54 Q158,52 170,82 L178,140 L166,140 L160,86 Q152,60 140,58 M55,148 Q52,200 52,270 L148,270 Q148,200 145,148 M52,270 Q50,285 42,296 a12,4 0 0,0 24,0 Q60,285 58,270 M148,270 Q150,285 142,296 a12,4 0 0,0 24,0 Q160,285 158,270 M100,155 L100,265 M10,170 L10,150 M190,170 L190,150" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-linecap="round"/>
${zs.map((z,i)=>{const c=['rgba(0,188,212,0.08)','rgba(156,39,176,0.08)','rgba(255,152,0,0.08)','rgba(76,175,80,0.08)','rgba(33,150,243,0.08)','rgba(233,30,99,0.08)'][i];const hc=['rgba(0,188,212,0.35)','rgba(156,39,176,0.35)','rgba(255,152,0,0.35)','rgba(76,175,80,0.35)','rgba(33,150,243,0.35)','rgba(233,30,99,0.35)'][i];let rs=`<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" fill="${c}" stroke="transparent" stroke-width="1.5"/><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" class="el-fig-zone" data-zone="${z.id}" fill="transparent" stroke="transparent" stroke-width="2"/><title>${z.l}: ${tooltip(z)}</title>`;if(z.x2!==undefined)rs+=`<rect x="${z.x2}" y="${z.y2}" width="${z.w2}" height="${z.h2}" rx="6" fill="${c}" stroke="transparent" stroke-width="1.5"/><rect x="${z.x2}" y="${z.y2}" width="${z.w2}" height="${z.h2}" rx="6" class="el-fig-zone" data-zone="${z.id}" fill="transparent" stroke="transparent" stroke-width="2"/>`;return rs;}).join('')}
</svg>`;return`<div class="el-outfit-scroll"><div class="el-figure-wrap">${svg}</div>${hasAny?zs.map(z=>{const zi=zoneItems(z);return`<div class="el-outfit-zone"><div class="el-outfit-zone-title">${z.l}</div>${zi.map((name,idx)=>{const key=z.id+'_'+idx;const ch=this._outfitChanges[key]||{};const removed=ch.action==='remove';const replacing=ch.action==='replace';return`<div class="el-outfit-item${removed?' removed':''}"><div class="el-outfit-info"><span class="el-outfit-name">${this._esc(name)}</span></div><div class="el-outfit-actions"><button class="el-outfit-btn${removed?' active':''}" onclick="window.VirtualPhone._erolinksView._toggleOutfit('${key}','remove')">脱下</button><button class="el-outfit-btn${replacing?' active':''}" onclick="window.VirtualPhone._erolinksView._toggleOutfit('${key}','replace')">更换</button></div>${replacing?`<div class="el-outfit-replace"><input class="el-outfit-input" id="el-outfit-input-${key}" placeholder="输入更换为..." value="${this._esc(ch.value||'')}" oninput="window.VirtualPhone._erolinksView._outfitChanges['${key}'].value=this.value"></div>`:''}</div>`;}).join('')}</div>`;}).join(''):`<div class="el-placeholder"><div class="el-placeholder-icon">👗</div><div>暂无服装数据</div></div>`}${hasAny?`<div class="el-outfit-bottom"><button class="el-outfit-apply" onclick="window.VirtualPhone._erolinksView._applyOutfit()">📋 确定变更</button></div>`:''}</div>`;}
_toggleOutfit(key,action){const cur=this._outfitChanges[key]||{};if(cur.action===action){delete this._outfitChanges[key];}else{cur.action=action;if(action==='replace'&&!cur.value)cur.value='';this._outfitChanges[key]=cur;}this.render();}
_applyOutfit(){const parts=[];const o=this._linkedData?.outfit||{};Object.entries(this._outfitChanges).forEach(([key,ch])=>{const si=key.lastIndexOf('_');const zone=key.substring(0,si);const idx=parseInt(key.substring(si+1));const name=(o[zone]||[])[idx];if(!name)return;if(ch.action==='remove')parts.push('脱掉 '+name);else if(ch.action==='replace'){const to=ch.value?.trim();if(to)parts.push('更换 '+name+' 为 '+to);}});if(!parts.length)return;const ta=document.getElementById('send_textarea');if(ta){ta.value=ta.value+(ta.value&&!ta.value.endsWith('\n')?'\n\n':'')+parts.join('，');ta.dispatchEvent(new Event('input',{bubbles:true}));ta.focus();}}
_parseOutfit(raw){if(!raw)return{};const result={head:[],upper:[],hands:[],lower:[],legs:[],acc:[]};const lines=raw.split('\n');let cz='';const zmk={head:['头'],upper:['上','身','胸'],hands:['手'],lower:['下','裙','裤','内裤'],legs:['腿','脚','袜','鞋'],acc:['饰','装']};const getZone=z=>{for(const[k,ks]of Object.entries(zmk)){for(const s of ks){if(z.includes(s))return k;}}return'';};for(const line of lines){const t=line.trim();if(!t)continue;const m=t.match(/^【(.+?)】-?\s*(.*)/);if(m){cz=getZone(m[1]);const same=m[2]?.trim();if(same&&same!=='无'&&cz)result[cz].push(same.replace(/（.*?）$/g,'').trim());continue;}if(cz&&t.startsWith('-')){const n=t.replace(/^-\s*/,'').replace(/（.*?）$/,'').trim();if(n&&n!=='无')result[cz].push(n);}}return result;}

// === 催眠（UI占位） ===
_renderHypnoTab(){const modes=[{k:'mind_ctrl',n:'意识催眠',d:'完全听从指令的人偶状态',i:'🧿'},{k:'body_ctrl',n:'身体控制',d:'控制身体动作但不控制思想',i:'🦾'},{k:'common_sense',n:'常识改变',d:'将指定内容植入为理所当然的常识',i:'💉'},{k:'sense_ctrl',n:'感官操控',d:'放大或压制特定感官敏感度',i:'👁'},{k:'emotion',n:'情绪注入',d:'注入特定情绪状态',i:'💫'},{k:'trigger',n:'触发词',d:'设定条件反射触发器',i:'🔑'},{k:'memory',n:'记忆修改',d:'植入或抑制特定记忆',i:'📝'},{k:'persona',n:'人格覆盖',d:'在现有性格上叠加临时人格',i:'🎭'}];return`<div class="el-hypno-scroll"><div class="el-hypno-grid">${modes.map(m=>`<div class="el-hypno-card" onclick="window.VirtualPhone._erolinksView._selectHypno('${m.k}')"><div class="el-hypno-card-icon">${m.i}</div><div class="el-hypno-card-name">${m.n}</div><div class="el-hypno-card-desc">${m.d}</div></div>`).join('')}</div></div>`;}
_selectHypno(k){this.app.phoneShell?.showNotification?.('催眠',k+' 开发中...','🧠');}

// === 设置 ===
_renderSettings(){const wbEnabled=window.VirtualPhone?.worldbookManager?.getEnabled?.('erolinks')??true;const promptContent=this._getLinkPrompt('[世界书内容]','[最后一条聊天记录]');const presetHtml=window.VirtualPhone?.promptManager?.renderPromptPresetControls?.('erolinks','link')||'';return`<div class="erolinks-app"><div class="erolinks-bar"><div class="erolinks-bar-btn" onclick="window.VirtualPhone._erolinksView.goBack()" style="margin-right:auto;">← 返回</div></div><div class="erolinks-scroll"><div class="erolinks-s-body"><div class="erolinks-s-section"><div class="erolinks-s-section-title">🔗 LINK 提示词</div>${presetHtml}<textarea id="erolinks-s-prompt" class="erolinks-s-textarea">${this._esc(promptContent)}</textarea><div class="erolinks-s-btn-row"><button class="erolinks-s-btn erolinks-s-btn-warn" id="erolinks-s-prompt-reset">恢复默认</button><button class="erolinks-s-btn erolinks-s-btn-primary" id="erolinks-s-prompt-save">保存提示词</button></div></div><div class="erolinks-s-section"><div class="erolinks-s-row"><span>📚 注入世界书</span><label class="toggle-switch" style="flex:0 0 auto;"><input type="checkbox" id="erolinks-use-worldbook" ${wbEnabled?'checked':''}><span class="toggle-slider"></span></label></div><div class="phone-prompt-fold erolinks-worldbook-fold" data-default-open="false" style="margin-top:10px;"><div class="phone-prompt-fold-header"><div class="phone-prompt-fold-main"><div class="phone-prompt-fold-title">世界书选择</div><div class="phone-prompt-fold-desc">展开后勾选要注入的酒馆世界书</div></div><i class="fa-solid fa-chevron-right phone-prompt-fold-arrow"></i></div><div class="phone-prompt-fold-content"><div id="erolinks-worldbook-list"></div></div></div></div></div></div></div>`;}
_bindSettings(){const root=this.app.phoneShell.screen;if(!root)return;root.querySelector('#erolinks-s-prompt-save')?.addEventListener('click',()=>{const val=root.querySelector('#erolinks-s-prompt')?.value||'';try{window.VirtualPhone?.promptManager?.updateActivePromptUserPreset('erolinks','link',val);this.app.phoneShell?.showNotification?.('已保存','','✅');}catch(e){this.app.phoneShell?.showNotification?.('保存失败',e.message,'❌');}});root.querySelector('#erolinks-s-prompt-reset')?.addEventListener('click',()=>{if(!confirm('恢复默认提示词？'))return;const content=window.VirtualPhone?.promptManager?.resetPromptToDefault('erolinks','link');const ta=root.querySelector('#erolinks-s-prompt');if(ta&&content)ta.value=content;this.app.phoneShell?.showNotification?.('已恢复','','✅');});window.VirtualPhone?.promptManager?.bindPromptPresetControls?.(document.querySelector('.phone-view-current .erolinks-s-body')||document,'erolinks','link','#erolinks-s-prompt',{notify:(t,m,i)=>this.app.phoneShell?.showNotification?.(t,m,i)});const wbToggle=root.querySelector('#erolinks-use-worldbook');wbToggle?.addEventListener('change',()=>{window.VirtualPhone?.worldbookManager?.setEnabled('erolinks',wbToggle.checked);if(wbToggle.checked&&!this._wbRendered)this._renderWBList();});if(wbToggle?.checked)this._renderWBList();root.querySelectorAll('.phone-prompt-fold').forEach(fold=>{if(fold.dataset.foldInited!=='1'){fold.dataset.foldInited='1';fold.classList.toggle('is-open',String(fold.dataset.defaultOpen||'').toLowerCase()==='true');}});root.querySelectorAll('.phone-prompt-fold-header').forEach(header=>{if(header.dataset.foldBound==='1')return;header.dataset.foldBound='1';header.addEventListener('click',()=>{const fold=header.closest('.phone-prompt-fold');if(fold)fold.classList.toggle('is-open');});});}
async _renderWBList(){const container=document.getElementById('erolinks-worldbook-list');const mgr=window.VirtualPhone?.worldbookManager;if(!container||!mgr)return;this._wbRendered=true;try{const sources=await mgr.listAvailableWorldbooks({includeEntries:true,force:true});const sel=mgr.getSelectionState('erolinks');if(!sources?.length){container.innerHTML='<div style="font-size:11px;color:#888;padding:6px 0;">未读取到酒馆世界书列表</div>';return;}const sorted=[...sources].sort((a,b)=>{const aS=sel.initialized&&mgr.matchesSelection?.(a,sel.ids)?1:0;const bS=sel.initialized&&mgr.matchesSelection?.(b,sel.ids)?1:0;return bS-aS;});container.innerHTML=sorted.map(s=>{const checked=sel.initialized&&mgr.matchesSelection?.(s,sel.ids)?'checked':'';const active=Number(s.entries?.length||0);const total=Number(s.totalEntries??active);return`<label class="erolinks-wb-item"><input type="checkbox" class="erolinks-wb-cb" value="${this._esc(s.id)}" ${checked}><span class="erolinks-wb-name">${this._esc(s.name)}</span><span class="erolinks-wb-meta">${total>active?active+'/'+total+' 条':active+' 条'}</span></label>`;}).join('');container.querySelectorAll('.erolinks-wb-cb').forEach(cb=>{cb.addEventListener('change',()=>{const ids=[];container.querySelectorAll('.erolinks-wb-cb').forEach(c=>{if(c.checked)ids.push(c.value);});mgr.setSelection('erolinks',ids);});});}catch(e){container.innerHTML='<div style="font-size:11px;color:#d93025;padding:6px 0;">世界书读取失败</div>';}}}
