import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message, Row, Col, Statistic } from 'antd';
import { SearchOutlined, ReloadOutlined, ClockCircleOutlined, PlayCircleOutlined, CheckCircleOutlined, WarningOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { workorderApi } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { MobileWorkOrder, WorkOrderStats } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;

const workOrderStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'orange' },
  in_progress: { text: '进行中', color: 'blue' },
  completed: { text: '已完成', color: 'green' },
  quality_issue: { text: '质量问题', color: 'red' },
  rework: { text: '返工', color: 'purple' }
};

const WorkOrderList = () => {
  const [workOrders, setWorkOrders] = useState<MobileWorkOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [processingOrderNo, setProcessingOrderNo] = useState('');
  const [keyword, setKeyword] = useState('');
  const [stats, setStats] = useState<WorkOrderStats | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadWorkOrders();
  }, [page, pageSize, status, processingOrderNo, keyword]);

  const loadStats = async () => {
    try {
      const data = await workorderApi.getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (processingOrderNo) params.processingOrderNo = processingOrderNo;
      if (keyword) params.keyword = keyword;
      
      const data = await workorderApi.getWorkOrders(params);
      setWorkOrders(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载工单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadWorkOrders();
  };

  const handleReset = () => {
    setStatus('');
    setProcessingOrderNo('');
    setKeyword('');
    setPage(1);
  };

  const handleStart = async (id: string) => {
    try {
      await workorderApi.startWorkOrder(id);
      message.success('工单已开始');
      loadWorkOrders();
      loadStats();
    } catch (e: any) {
      message.error(e.message || '开始工单失败');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await workorderApi.completeWorkOrder(id, {});
      message.success('工单已完成');
      loadWorkOrders();
      loadStats();
    } catch (e: any) {
      message.error(e.message || '完成工单失败');
    }
  };

  const columns = [
    {
      title: '工单号',
      dataIndex: 'workOrderNo',
      key: 'workOrderNo',
      render: (text: string, record: MobileWorkOrder) => (
        <a onClick={() => navigate(`/workorder/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '加工单号',
      dataIndex: 'processingOrderNo',
      key: 'processingOrderNo'
    },
    {
      title: '零件名称',
      dataIndex: 'partName',
      key: 'partName'
    },
    {
      title: '工序名称',
      dataIndex: 'processName',
      key: 'processName'
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = workOrderStatusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '负责人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      render: (val: string) => val || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date)
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: MobileWorkOrder) => {
        const isFactory = user?.role === 'factory';
        return (
          <Space size="small">
            <Button type="link" size="small" onClick={() => navigate(`/workorder/${record.id}`)}>
              详情
            </Button>
            {isFactory && record.status === 'pending' && (
              <Button type="link" size="small" onClick={() => handleStart(record.id)}>
                开始
              </Button>
            )}
            {isFactory && record.status === 'in_progress' && (
              <Button type="link" size="small" onClick={() => handleComplete(record.id)}>
                完成
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  const statCards = stats ? [
    { title: '待处理', value: stats.pending, icon: <ClockCircleOutlined />, color: '#fa8c16', key: 'pending' },
    { title: '进行中', value: stats.inProgress, icon: <PlayCircleOutlined />, color: '#1677ff', key: 'in_progress' },
    { title: '已完成', value: stats.completed, icon: <CheckCircleOutlined />, color: '#52c41a', key: 'completed' },
    { title: '异常工单', value: stats.qualityIssue + stats.rework, icon: <WarningOutlined />, color: '#f5222d', key: 'abnormal' }
  ] : [];

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {statCards.map((card) => (
            <Col span={6} key={card.key}>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
                valueStyle={{ color: card.color }}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>工单管理</h2>
          </div>

          <Space wrap>
            <Select
              placeholder="工单状态"
              style={{ width: 150 }}
              value={status || undefined}
              onChange={setStatus}
              allowClear
            >
              <Option value="pending">待处理</Option>
              <Option value="in_progress">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="quality_issue">质量问题</Option>
              <Option value="rework">返工</Option>
            </Select>
            <Input
              placeholder="加工单号"
              style={{ width: 200 }}
              value={processingOrderNo}
              onChange={(e) => setProcessingOrderNo(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
            <Input
              placeholder="搜索关键词"
              style={{ width: 250 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              allowClear
            />
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>

          <Table
            columns={columns}
            dataSource={workOrders}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              }
            }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default WorkOrderList;
