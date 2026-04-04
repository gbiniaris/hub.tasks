import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} />
      <TopBar sidebarWidth={sidebarWidth} />
      <main
        className="min-h-screen pt-14 transition-all duration-200"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}