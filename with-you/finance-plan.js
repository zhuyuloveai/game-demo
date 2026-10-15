import {sectors} from './economy.js?v=month08';
export function operatingCost(e,level=e.company?.level){const c=e.company;return !c||c.strategy==='pause'?0:Math.round(sectors[c.sector].expense*3**(level-1)*(c.strategy==='growth'?1.7:1));}
export function investmentPlan(s,cost,nextCost=operatingCost(s.economy)){const after=s.cash-cost;return {cost,after,nextCost,affordable:after>=0,gap:Math.max(0,nextCost-Math.max(0,after))};}
