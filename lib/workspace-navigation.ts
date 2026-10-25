export const workspaceGroups = [
  {label:"Workspace",items:[{label:"Overview",href:"/workspace",icon:"overview"},{label:"Agents",href:"/agents",icon:"agents"},{label:"Workflows",href:"/workflows",icon:"workflow"},{label:"Tasks & outputs",href:"/tasks",icon:"tasks"}]},
  {label:"Business",items:[{label:"Customer pipeline",href:"/leads",icon:"leads"},{label:"Quotes & jobs",href:"/sales",icon:"sales"},{label:"Marketplace",href:"/marketplace",icon:"market"},{label:"Sponsorships",href:"/sponsorships",icon:"sponsor"}]},
  {label:"Manage",items:[{label:"Creator profile",href:"/profile",icon:"profile"},{label:"Connections",href:"/integrations",icon:"connections"},{label:"Activity",href:"/notifications",icon:"activity"},{label:"Company settings",href:"/company",icon:"settings"}]},
] as const;
export function isWorkspacePath(pathname:string){return pathname==="/dashboard"||pathname==="/connectors"||workspaceGroups.some(group=>group.items.some(item=>pathname===item.href));}
export function workspaceHref(path:string,companyId:string){if(!companyId)return path;const [base,hash]=path.split('#');return `${base}${base.includes('?')?'&':'?'}companyId=${encodeURIComponent(companyId)}${hash?'#'+hash:''}`;}
export function workspaceTitle(pathname:string){return pathname==="/dashboard"?"Overview":pathname==="/connectors"?"Source connections":workspaceGroups.flatMap(group=>[...group.items]).find(item=>item.href===pathname)?.label||"Workspace";}
export function selectWorkspaceCompany(companies:readonly {id:string}[],requested:unknown,remembered:unknown){return companies.find(company=>company.id===requested)?.id||companies.find(company=>company.id===remembered)?.id||companies[0]?.id||"";}
