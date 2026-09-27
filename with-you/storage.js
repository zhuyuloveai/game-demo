// Normalise older demo saves without resetting their current week.
export function normaliseSave(v){
 if(!v||v.version!==1||!v.rel||!v.visits||!Array.isArray(v.logs))return null;
 if(!Number.isInteger(v.day)||v.day<1||(!v.career&&v.day>(v.campaignDays||7))||![0,1].includes(v.slot))return null;
 if(!Number.isFinite(v.cash)||v.cash<0||!Number.isFinite(v.energy)||v.energy<0||v.energy>100||!Number.isFinite(v.skill))return null;
 for(const id of ['lin','shen'])if(!Number.isFinite(v.rel[id])||!Number.isInteger(v.visits[id])||v.visits[id]<0)return null;
 v.campaignDays??=7;
 v.flags??={};v.gallery=Array.isArray(v.gallery)?v.gallery:[];
 v.workCount??=v.logs.filter(x=>x.includes('完成项目')).length;
 v.studyCount??=v.logs.filter(x=>x.includes('学会了一项')).length;
 v.restCount??=v.logs.filter(x=>x.includes('沿着河边')).length;
 return v;
}
