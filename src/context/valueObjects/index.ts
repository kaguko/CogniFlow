// Context Value Objects
export type DomainType = 'software' | 'system_architecture' | 'devops_cloud' | 'startup_product' | 'research';

export type EnergyLevel = 'high' | 'medium' | 'depleted';

export type ZoomLevel = 'macro_horizon' | 'meso_milestone' | 'micro_focus';

export function getDomainLabel(domain: DomainType): string {
  const labels: Record<DomainType, string> = {
    software: 'Phần mềm',
    system_architecture: 'Kiến trúc hệ thống',
    devops_cloud: 'DevOps & Cloud',
    startup_product: 'Sản phẩm Startup',
    research: 'Nghiên cứu',
  };
  return labels[domain];
}

export function getEnergyLevelLabel(energy: EnergyLevel): string {
  const labels: Record<EnergyLevel, string> = {
    high: 'Cao',
    medium: 'Trung bình',
    depleted: 'Cạn kiệt',
  };
  return labels[energy];
}
