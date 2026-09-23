// ProjectContext Value Objects
export type DomainType =
  | 'software'
  | 'system_architecture'
  | 'devops_cloud'
  | 'startup_product'
  | 'research';

export type EnergyLevel = 'high' | 'medium' | 'depleted';

export type ZoomLevel = 'macro_horizon' | 'meso_milestone' | 'micro_focus';

export function getDomainLabel(domain: DomainType): string {
  switch (domain) {
    case 'software':
      return 'Phần Mềm & Ứng Dụng';
    case 'system_architecture':
      return 'Kiến Trúc Hệ Thống';
    case 'devops_cloud':
      return 'DevOps, Cloud & SRE';
    case 'startup_product':
      return 'Sản Phẩm & MVP';
    case 'research':
      return 'Nghiên Cứu Kỹ Thuật';
  }
}

export function getEnergyLabel(level: EnergyLevel): string {
  switch (level) {
    case 'high':
      return 'Năng lượng dồi dào';
    case 'medium':
      return 'Năng lượng ổn định';
    case 'depleted':
      return 'Tải nhận thức cao / Mệt mỏi';
  }
}
