import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Button, Space, message, Typography } from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  PlayCircleOutlined, 
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ArrowRightOutlined,
  ScanOutlined,
  PlusOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { workorderApi } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { WorkOrderStats, MobileWorkOrder, WorkOrderException } from '../../types';
import { useAuthContext } from '../../App';

const { Title, Text } = Typography;

const workOrderStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  in_progress: { text: '进行中', color: 'blue' },
  completed: { text: '已完成', color: 'green' },
  quality_issue: { text: '质量问题', color: 'red' },
  rework: { text: '返工', color: 'purple' }
};

const exceptionSeverityMap: Record<string, { text: string; color: string }> = {
  low: { text: '低', color: 'blue' },
  medium: { text: '中', color: 'orange' },
  high: { text: '高', color: 'red' }
};

const WorkOrderDashboard = () => {
  const [stats, setStats] = useState<WorkOrderStats | null>(null);
  const [pendingOrders, setPendingOrders] = useState<MobileWorkOrder[]>([]);
  const [recentExceptions, setRecentExceptions] = useState<WorkOrderException[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, ordersData, exceptionsData] = await Promise.all([
        workorderApi.getStats(),
        workorderApi.getWorkOrders({ status: 'pending', pageSize: 5 }),
        workorderApi.getExceptions({ pageSize: 5 })
      ]);
      setStats(statsData);
      setPendingOrders(ordersData.records);
      setRecentExceptions(exceptionsData.records);
    } catch (e) {
      console.error(e);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const statItems = stats ? [
    { title: '总工单', value: stats.total, icon: <FileTextOutlined />, color: '#1677ff' },
    { title: '待处理', value: stats.pending, icon: <ClockCircleOutlined />, color: '#fa8c16' },
    { title: '进行中', value: stats.inProgress, icon: <PlayCircleOutlined />, color: '#1677ff' },
    { title: '已完成', value: stats.completed, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: '质量问题', value: stats.qualityIssue, icon: <WarningOutlined />, color: '#f5222d' },
    { title: '待处理异常', value: stats.pendingExceptions, icon: <ExclamationCircleOutlined />, color: '#ff4d4f' }
  ] : [];

  const quickActions = [
    { title: '扫码开工', icon: <ScanOutlined />, color: '#1677ff', action: () => {} },
    { title: '上报异常', icon: <WarningOutlined />, color: '#fa8c16', action: () => {} },
    { title: '完成工单', icon: <CheckCircleOutlined />, color: '#52c41a', action: () => {} },
    { title: '新建工单', icon: <PlusOutlined />, color: '#722ed1', action: () => {} }
  ];

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>工单工作台</Title>
        <Button icon={<SyncOutlined />} onClick={handleRefresh}>刷新</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {statItems.map((item, index) => (
            <Col span={8} key={index}>
              <Statistic
                title={
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.title}</Text>
                }
                value={item.value}
                prefix={
                  <span style={{ color: item.color }}>{item.icon}</span>
                }
                valueStyle={{ color: item.color, fontSize: 20, fontWeight: 600 }}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text strong>快速操作</Text>
        </div>
        <Row gutter={[12, 12]}>
          {quickActions.map((action, index) => (
            <Col span={6} key={index}>
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  borderRadius: 8,
                  backgroundColor: `${action.color}10`,
                  cursor: 'pointer'
                }}
                onClick={action.action}
              >
                <div style={{ fontSize: 24, color: action.color, marginBottom: 4 }}>
                  {action.icon}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>{action.title}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      <Card
        title="待处理工单"
        extra={
          <a onClick={() => navigate('/workorder')}>
            查看全部 <ArrowRightOutlined />
          </a>
        }
        style={{ marginBottom: 16 }}
      >
        {pendingOrders.length > 0 ? (
          <List
            size="small"
            dataSource={pendingOrders}
            renderItem={(item: MobileWorkOrder) => {
              const statusInfo = workOrderStatusMap[item.status] || { text: item.status, color: 'default' };
              return (
                <List.Item
                  onClick={() => navigate(`/workorder/${item.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <List.Item.Meta
                    title={
                      <Space size="small">
                        <Text strong>{item.workOrderNo}</Text>
                        <Tag color={statusInfo.color} style={{ margin: 0 }}>
                          {statusInfo.text}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ color: '#666' }}>
                          {item.partName} · {item.processName}
                        </div>
                        <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                          数量: {item.quantity} · {formatDateTime(item.createdAt)}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
            暂无待处理工单
          </div>
        )}
      </Card>

      <Card
        title="最近异常"
        extra={
          <a onClick={() => navigate('/workorder/exceptions')}>
            查看全部 <ArrowRightOutlined />
          </a>
        }
      >
        {recentExceptions.length > 0 ? (
          <List
            size="small"
            dataSource={recentExceptions}
            renderItem={(item: WorkOrderException) => {
              const severityInfo = exceptionSeverityMap[item.severity] || { text: item.severity, color: 'default' };
              const statusInfo = item.status === 'pending' ? { text: '待处理', color: 'orange' } :
                                 item.status === 'processing' ? { text: '处理中', color: 'blue' } :
                                 item.status === 'resolved' ? { text: '已解决', color: 'green' } :
                                 { text: '已驳回', color: 'red' };
              return (
                <List.Item
                  onClick={() => navigate(`/workorder/exceptions/${item.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <List.Item.Meta
                    title={
                      <Space size="small">
                        <Text strong>{item.typeName}</Text>
                        <Tag color={severityInfo.color} style={{ margin: 0 }}>
                          {severityInfo.text}
                        </Tag>
                        <Tag color={statusInfo.color} style={{ margin: 0 }}>
                          {statusInfo.text}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        <div style={{ color: '#666' }}>{item.description}</div>
                        <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                          {item.reporterName} · {formatDateTime(item.createdAt)}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
            暂无异常记录
          </div>
        )}
      </Card>
    </div>
  );
};

export default WorkOrderDashboard;
