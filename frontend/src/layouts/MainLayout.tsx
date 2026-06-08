import { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Space } from 'antd';
import { 
  DashboardOutlined, 
  ShoppingOutlined, 
  DollarOutlined,
  TruckOutlined,
  TeamOutlined,
  SettingOutlined,
  BellOutlined,
  LogoutOutlined,
  UserOutlined,
  FileTextOutlined,
  HistoryOutlined,
  QualityOutlined,
  StarOutlined,
  MobileOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '../App';
import { roleMap } from '../utils/format';
import { notificationApi } from '../services/api';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthContext();

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      setUnreadCount(data.total);
    } catch (e) {
      console.error(e);
    }
  };

  const getMenuItems = () => {
    const items: any[] = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: '工作台',
      }
    ];

    if (user?.role === 'demander' || user?.role === 'admin') {
      items.push({
        key: '/orders',
        icon: <ShoppingOutlined />,
        label: '订单管理',
        children: [
          { key: '/orders/processing', label: '加工订单' },
          { key: '/orders/material', label: '原料订单' }
        ]
      });
    } else if (user?.role === 'factory') {
      items.push({
        key: '/orders/processing',
        icon: <ShoppingOutlined />,
        label: '加工订单'
      });
    } else if (user?.role === 'supplier') {
      items.push({
        key: '/orders/material',
        icon: <ShoppingOutlined />,
        label: '原料订单'
      });
    }

    items.push({
      key: '/finance',
      icon: <DollarOutlined />,
      label: '财务管理',
      children: [
        { key: '/finance/payments', label: '账款管理' },
        { key: '/finance/invoices', label: '票据管理' }
      ]
    });

    items.push({
      key: '/logistics',
      icon: <TruckOutlined />,
      label: '物流管理'
    });

    if (user?.role === 'demander' || user?.role === 'admin') {
      items.push({
        key: 'suppliers-group',
        icon: <TeamOutlined />,
        label: '供应商管理',
        children: [
          { key: '/suppliers', label: '供应商列表' },
          { key: '/suppliers/price-compare', label: '智能比价' }
        ]
      });
    }

    if (user?.role === 'demander' || user?.role === 'admin') {
      items.push({
        key: 'quality-group',
        icon: <QualityOutlined />,
        label: '质量管理',
        children: [
          { key: '/quality/batches', label: '批次管理' },
          { key: '/quality/inspections', label: '质检记录' }
        ]
      });
    } else if (user?.role === 'factory' || user?.role === 'supplier') {
      items.push({
        key: '/quality/batches',
        icon: <QualityOutlined />,
        label: '质量追溯'
      });
    }

    if (user?.role === 'demander' || user?.role === 'admin') {
      items.push({
        key: 'rating-group',
        icon: <StarOutlined />,
        label: '绩效评级',
        children: [
          { key: '/rating', label: '评级列表' },
          { key: '/rating/rectifications', label: '整改通知' },
          { key: '/rating/config', label: '评级配置' }
        ]
      });
    } else if (user?.role === 'factory' || user?.role === 'supplier') {
      items.push({
        key: '/rating',
        icon: <StarOutlined />,
        label: '绩效评级'
      });
    }

    if (user?.role === 'factory') {
      items.push({
        key: 'workorder-group',
        icon: <MobileOutlined />,
        label: '工单中心',
        children: [
          { key: '/workorder/dashboard', label: '工单工作台' },
          { key: '/workorder', label: '工单列表' },
          { key: '/workorder/exceptions', label: '异常记录' }
        ]
      });
    } else if (user?.role === 'demander' || user?.role === 'admin') {
      items.push({
        key: 'workorder-group',
        icon: <MobileOutlined />,
        label: '外协工单',
        children: [
          { key: '/workorder', label: '工单列表' },
          { key: '/workorder/exceptions', label: '异常管理' }
        ]
      });
    }

    if (user?.role === 'admin') {
      items.push({
        key: '/system',
        icon: <SettingOutlined />,
        label: '系统管理',
        children: [
          { key: '/system/logs', label: '操作日志' },
          { key: '/system/notifications', label: '通知中心' }
        ]
      });
    } else {
      items.push({
        key: '/system/notifications',
        icon: <HistoryOutlined />,
        label: '通知中心'
      });
    }

    return items;
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/orders/processing')) return ['/orders/processing'];
    if (path.startsWith('/orders/material')) return ['/orders/material'];
    if (path.startsWith('/finance/payments')) return ['/finance/payments'];
    if (path.startsWith('/finance/invoices')) return ['/finance/invoices'];
    if (path.startsWith('/suppliers/price-compare')) return ['/suppliers/price-compare'];
    if (path.startsWith('/suppliers/')) return ['/suppliers'];
    if (path.startsWith('/system/logs')) return ['/system/logs'];
    if (path.startsWith('/system/notifications')) return ['/system/notifications'];
    if (path.startsWith('/logistics')) return ['/logistics'];
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    const keys: string[] = [];
    if (path.startsWith('/orders')) keys.push('/orders');
    if (path.startsWith('/finance')) keys.push('/finance');
    if (path.startsWith('/suppliers')) keys.push('suppliers-group');
    if (path.startsWith('/system')) keys.push('/system');
    return keys;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
      >
        <div className="sidebar-logo">
          {collapsed ? 'SCM' : '供应链协同平台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={getMenuItems()}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header 
          style={{ 
            background: '#fff', 
            padding: '0 24px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)'
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {user?.companyName} - {roleMap[user?.role || '']}
          </div>
          <Space size="large">
            <Badge count={unreadCount} size="small">
              <Button 
                type="text" 
                icon={<BellOutlined />} 
                onClick={() => navigate('/system/notifications')}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{user?.name}</span>
              </div>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 0, background: '#f0f2f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
