import { useState, useEffect } from 'react';
import { Card, Button, List, Tag, Space, Badge, Empty, message, Tabs } from 'antd';
import { BellOutlined, CheckCircleOutlined, ReadOutlined, CalendarOutlined, WarningOutlined, TruckOutlined, DollarOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { Notification } from '../../types';
import { useAuthContext } from '../../App';

const { TabPane } = Tabs;

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();
  const { refreshUnread } = useAuthContext();

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [page, pageSize, activeTab]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (activeTab !== 'all') {
        params.type = activeTab;
      }
      if (activeTab === 'unread') {
        params.isRead = false;
      }
      
      const data = await notificationApi.getNotifications(params);
      setNotifications(data.records || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
      message.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await notificationApi.getUnreadCount();
      setUnreadCount(data.total);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      loadNotifications();
      loadUnreadCount();
      if (refreshUnread) refreshUnread();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      message.success('已全部标记为已读');
      loadNotifications();
      loadUnreadCount();
      if (refreshUnread) refreshUnread();
    } catch (e) {
      console.error(e);
      message.error('操作失败');
    }
  };

  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
    }
    
    if (notification.relatedId && notification.relatedType) {
      const pathMap: Record<string, string> = {
        processing_order: '/orders/processing/',
        material_order: '/orders/material/',
        payment: '/finance/payments/',
        invoice: '/finance/invoices/',
        logistics: '/logistics/',
        supplier: '/suppliers/'
      };
      const basePath = pathMap[notification.relatedType] || '';
      if (basePath) {
        navigate(basePath + notification.relatedId);
      }
    }
  };

  const getTypeIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      order: <FileTextOutlined style={{ color: '#1890ff' }} />,
      payment: <DollarOutlined style={{ color: '#fa8c16' }} />,
      logistics: <TruckOutlined style={{ color: '#13c2c2' }} />,
      warning: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      system: <BellOutlined style={{ color: '#722ed1' }} />
    };
    return iconMap[type] || <BellOutlined />;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      order: 'blue',
      payment: 'orange',
      logistics: 'cyan',
      warning: 'red',
      system: 'purple'
    };
    return colorMap[type] || 'default';
  };

  const getTypeLabel = (type: string) => {
    const labelMap: Record<string, string> = {
      order: '订单通知',
      payment: '财务通知',
      logistics: '物流通知',
      warning: '预警通知',
      system: '系统通知'
    };
    return labelMap[type] || type;
  };

  const tabOptions = [
    { key: 'all', label: '全部' },
    { key: 'unread', label: `未读 (${unreadCount})` },
    { key: 'order', label: '订单' },
    { key: 'payment', label: '财务' },
    { key: 'logistics', label: '物流' },
    { key: 'warning', label: '预警' },
    { key: 'system', label: '系统' }
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title">
            <Space>
              <BellOutlined />
              通知中心
              {unreadCount > 0 && (
                <Badge count={unreadCount} style={{ marginLeft: 8 }} />
              )}
            </Space>
          </h2>
          <Button icon={<ReadOutlined />} onClick={handleMarkAllRead}>
            全部已读
          </Button>
        </div>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={tabOptions.map(tab => ({ key: tab.key, label: tab.label }))}
          />
          
          <List
            loading={loading}
            dataSource={notifications}
            renderItem={(item: Notification) => (
              <List.Item
                onClick={() => handleClick(item)}
                style={{ 
                  cursor: 'pointer',
                  background: item.isRead ? '#fff' : '#f0f7ff',
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 4,
                  borderLeft: item.isRead ? '3px solid transparent' : '3px solid #1890ff'
                }}
              >
                <List.Item.Meta
                  avatar={getTypeIcon(item.type)}
                  title={
                    <Space>
                      <span style={{ fontWeight: item.isRead ? 'normal' : 'bold' }}>
                        {item.title}
                      </span>
                      <Tag color={getTypeColor(item.type)} style={{ marginLeft: 8 }}>
                        {getTypeLabel(item.type)}
                      </Tag>
                      {!item.isRead && (
                        <Badge dot color="#1890ff" />
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ marginBottom: 4 }}>{item.content}</div>
                      <div style={{ color: '#999', fontSize: 12 }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                  }
                />
                {!item.isRead && (
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(item.id);
                    }}
                  >
                    标为已读
                  </Button>
                )}
              </List.Item>
            )}
            locale={{ emptyText: <Empty description="暂无通知" /> }}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default Notifications;
