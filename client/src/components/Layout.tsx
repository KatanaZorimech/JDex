import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  BookOpen,
  LayoutTemplate,
  GraduationCap,
  DollarSign,
  Handshake,
  Kanban,
  Briefcase,
  Building2,
  Calendar,
  FolderOpen,
  Users,
  FileCheck,
} from 'lucide-react';

type NavItem = {
  path?: string;
  label: string;
  icon?: React.ComponentType<{ size?: number }>;
  disabled?: boolean;
};

type NavSection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  items: NavItem[];
  disabled?: boolean;
};

const navSections: NavSection[] = [
  {
    id: 'recruitment',
    label: '招聘需求管理',
    icon: ClipboardList,
    items: [
      { path: '/board', label: '招聘看板', icon: Kanban },
      { path: '/offers', label: 'Offer情况', icon: Handshake },
      { path: '/referrals', label: '内推表', icon: Users },
    ],
  },
  {
    id: 'jd',
    label: 'JD管理',
    icon: FileText,
    items: [
      { path: '/jd', label: '岗位JD库', icon: Briefcase },
      { path: '/position-names', label: '职位名称表', icon: FileText },
    ],
  },
  {
    id: 'knowledge',
    label: '知识&模板库',
    icon: BookOpen,
    items: [
      { path: '/terms', label: '术语库', icon: BookOpen },
      { path: '/templates', label: 'JD模板库', icon: LayoutTemplate },
      { path: '/questions', label: '笔试题', icon: FileText },
      { path: '/offer-template', label: 'Offer模板', icon: FileCheck },
    ],
  },
  {
    id: 'campus',
    label: '校招信息库',
    icon: GraduationCap,
    items: [
      { path: '/campus/schools', label: '院校信息库', icon: Building2 },
      { path: '/campus/calendar', label: '双选会日历', icon: Calendar },
      { path: '/campus/resources', label: '其他资料', icon: FolderOpen },
    ],
  },
  {
    id: 'expense',
    label: '费用统计',
    icon: DollarSign,
    items: [
      { path: '/expenses', label: '招聘费用汇总表', icon: FileText },
    ],
  },
];

const Layout = () => {
  const location = useLocation();

  const getInitialExpanded = (): string => {
    const path = location.pathname;
    if (path.startsWith('/board') || path.startsWith('/offers') || path === '/') return 'recruitment';
    if (path.startsWith('/jd')) return 'jd';
    if (path.startsWith('/terms') || path.startsWith('/templates')) return 'knowledge';
    if (path.startsWith('/campus')) return 'campus';
    return 'recruitment';
  };

  const [expandedId, setExpandedId] = useState<string>(getInitialExpanded());

  const toggleSection = (id: string, disabled?: boolean) => {
    if (disabled) return;
    setExpandedId((prev) => (prev === id ? '' : id));
  };

  return (
    <div className="flex w-screen h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList size={18} className="text-primary" />
            </div>
            <h1 className="text-base font-bold text-gray-900">招聘信息平台</h1>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navSections.map((section) => {
            const isExpanded = expandedId === section.id;
            const SectionIcon = section.icon;
            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.id, section.disabled)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    section.disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  disabled={section.disabled}
                >
                  <SectionIcon size={18} />
                  <span className="flex-1 text-left">{section.label}</span>
                  {section.disabled ? (
                    <span className="text-xs text-gray-300 font-normal">待搭建</span>
                  ) : isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </button>
                {!section.disabled && isExpanded && section.items.length > 0 && (
                  <div className="mt-1 ml-4 space-y-0.5">
                    {section.items.map((item) => {
                      if (item.disabled) {
                        const ItemIcon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-gray-300 cursor-not-allowed"
                          >
                            {ItemIcon && <ItemIcon size={16} />}
                            <span>{item.label}</span>
                            <span className="ml-auto text-xs font-normal">待搭建</span>
                          </div>
                        );
                      }
                      const ItemIcon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path!}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          {ItemIcon && <ItemIcon size={16} />}
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
